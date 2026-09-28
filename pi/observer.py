"""식물집사 관찰 기기.

10분마다 온습도를 재고, 정해진 시각에 사진을 찍어 서버로 보낸다.
서버 주소와 토큰은 같은 폴더의 .env 에서 읽는다.

네트워크가 끊기면 보내지 못한 것을 pending/ 에 쌓아두고, 연결되면 다시 보낸다.
서버는 (기기, 시각)이 같은 기록을 한 줄로 합치므로 중복 전송은 문제가 되지 않는다.

    python3 observer.py

설치와 자동 실행은 README.md 를 볼 것.
"""

import json
import os
import shutil
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
PENDING = HERE / "pending"
PENDING_READINGS = PENDING / "readings.jsonl"
PENDING_PHOTOS = PENDING / "photos"

# 한 번에 보내는 측정 수. 서버가 받는 최대치와 맞춘다.
BATCH = 300

# 센서가 가끔 읽기에 실패한다. 이만큼 다시 해 본다.
SENSOR_TRIES = 5
SENSOR_WAIT = 2


def load_env() -> dict:
    """.env 를 읽는다. KEY=value 한 줄씩, # 로 시작하면 주석."""
    values = {}
    path = HERE / ".env"

    if not path.exists():
        sys.exit(".env 가 없습니다. .env.example 을 복사해 값을 채우세요.")

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    for key in ("SERVER_URL", "PLANT_TOKEN"):
        if not values.get(key):
            sys.exit(f".env 의 {key} 가 비어 있습니다.")

    return values


ENV = load_env()
SERVER = ENV["SERVER_URL"].rstrip("/")
TOKEN = ENV["PLANT_TOKEN"]
INTERVAL_MIN = int(ENV.get("READ_INTERVAL_MIN", "10"))
PHOTO_HOURS = [int(h) for h in ENV.get("PHOTO_HOURS", "10,12,14,16").split(",") if h.strip()]
SENSOR_PIN = ENV.get("SENSOR_PIN", "D4")

HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def log(*parts) -> None:
    """systemd 로그에 시각과 함께 남긴다."""
    print(datetime.now().strftime("%m-%d %H:%M:%S"), *parts, flush=True)


# ── 센서 ────────────────────────────────────────────────────────────
def read_sensor() -> tuple[int, int] | None:
    """DHT11 온습도. 정수로 들어온다. 실패하면 None."""
    import adafruit_dht
    import board

    sensor = adafruit_dht.DHT11(getattr(board, SENSOR_PIN))

    try:
        for _ in range(SENSOR_TRIES):
            try:
                temperature = sensor.temperature
                humidity = sensor.humidity
                if temperature is not None and humidity is not None:
                    return round(temperature), round(humidity)
            except RuntimeError as e:
                # DHT11 은 읽기 실패가 잦다. 잠시 뒤 다시 해 본다.
                log("센서 읽기 재시도:", e)
            time.sleep(SENSOR_WAIT)
    finally:
        sensor.exit()

    return None


def take_photo(path: Path) -> bool:
    """카메라로 한 장 찍어 path 에 저장한다."""
    from picamera2 import Picamera2

    camera = Picamera2()

    try:
        camera.configure(camera.create_still_configuration(main={"size": (1280, 960)}))
        camera.start()
        # 밝기와 초점이 잡힐 시간을 준다
        time.sleep(2)
        camera.capture_file(str(path))
        return True
    except Exception as e:
        log("사진 촬영 실패:", e)
        return False
    finally:
        camera.close()


# ── 보내기 ──────────────────────────────────────────────────────────
def send_readings(items: list[dict]) -> bool:
    try:
        res = requests.post(
            f"{SERVER}/api/device/readings",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"readings": items},
            timeout=20,
        )
    except requests.RequestException as e:
        log("전송 실패(네트워크):", e)
        return False

    if res.status_code == 401:
        # 토큰이 바뀌었거나 연결이 해제됐다. 쌓아둬도 소용없다.
        log("기기 인증 실패(401). .env 의 PLANT_TOKEN 을 확인하세요.")
        return False

    if not res.ok:
        log("전송 실패:", res.status_code, res.text[:200])
        return False

    return True


def send_photo(path: Path, captured_at: str) -> bool:
    try:
        with path.open("rb") as file:
            res = requests.post(
                f"{SERVER}/api/device/snapshots",
                headers=HEADERS,
                files={"photo": (path.name, file, "image/jpeg")},
                data={"capturedAt": captured_at},
                timeout=60,
            )
    except requests.RequestException as e:
        log("사진 전송 실패(네트워크):", e)
        return False

    if not res.ok:
        log("사진 전송 실패:", res.status_code, res.text[:200])
        return False

    return True


# ── 못 보낸 것 쌓아두기 ─────────────────────────────────────────────
def queue_reading(item: dict) -> None:
    PENDING.mkdir(exist_ok=True)
    with PENDING_READINGS.open("a", encoding="utf-8") as file:
        file.write(json.dumps(item) + "\n")


def queue_photo(path: Path, captured_at: str) -> None:
    PENDING_PHOTOS.mkdir(parents=True, exist_ok=True)
    # 파일 이름에 찍은 시각을 담아둔다. 보낼 때 그대로 쓴다.
    safe = captured_at.replace(":", "-")
    shutil.move(str(path), str(PENDING_PHOTOS / f"{safe}.jpg"))


def flush_pending() -> None:
    """연결이 돌아오면 쌓아둔 것을 보낸다. 성공한 만큼만 지운다."""
    if PENDING_READINGS.exists():
        lines = [l for l in PENDING_READINGS.read_text(encoding="utf-8").splitlines() if l.strip()]

        while lines:
            batch = [json.loads(l) for l in lines[:BATCH]]
            if not send_readings(batch):
                break

            lines = lines[BATCH:]
            log(f"쌓아둔 측정 {len(batch)}건 전송")

        if lines:
            PENDING_READINGS.write_text("\n".join(lines) + "\n", encoding="utf-8")
        else:
            PENDING_READINGS.unlink(missing_ok=True)

    if PENDING_PHOTOS.exists():
        for photo in sorted(PENDING_PHOTOS.glob("*.jpg")):
            captured_at = restore_time(photo.stem)
            if not send_photo(photo, captured_at):
                break

            photo.unlink(missing_ok=True)
            log("쌓아둔 사진 전송:", captured_at)


def restore_time(stem: str) -> str:
    """파일 이름으로 바꿔둔 시각을 원래대로 돌린다."""
    date, _, rest = stem.partition("T")
    return f"{date}T{rest.replace('-', ':')}"


# ── 본체 ────────────────────────────────────────────────────────────
def now_iso() -> str:
    """시간대를 붙인 ISO 시각. 파이 시계가 한국 시간이어야 한다."""
    return datetime.now().astimezone().isoformat()


def do_reading() -> None:
    measured = read_sensor()
    measured_at = now_iso()

    if measured is None:
        log("센서를 읽지 못했습니다. 이번 차례는 건너뜁니다.")
        return

    temperature, humidity = measured
    item = {"temperature": temperature, "humidity": humidity, "measuredAt": measured_at}

    if send_readings([item]):
        log(f"온습도 {temperature}°C {humidity}%")
    else:
        queue_reading(item)
        log(f"온습도 {temperature}°C {humidity}% — 보관함에 쌓아둠")


def do_photo() -> None:
    captured_at = now_iso()
    path = HERE / "latest.jpg"

    if not take_photo(path):
        return

    if send_photo(path, captured_at):
        log("사진 전송")
        path.unlink(missing_ok=True)
    else:
        queue_photo(path, captured_at)
        log("사진 — 보관함에 쌓아둠")


def main() -> None:
    log(f"관찰 시작 · 서버 {SERVER}")
    log(f"온습도 {INTERVAL_MIN}분 간격 · 사진 {PHOTO_HOURS} 시")

    last_reading_slot = None
    last_photo_hour = None

    while True:
        now = datetime.now()

        # 10분 간격의 경계마다 한 번씩 (같은 분에 두 번 재지 않는다)
        slot = now.replace(second=0, microsecond=0)
        slot = slot - timedelta(minutes=slot.minute % INTERVAL_MIN)

        if slot != last_reading_slot:
            last_reading_slot = slot
            do_reading()
            flush_pending()

        if now.hour in PHOTO_HOURS and last_photo_hour != (now.date(), now.hour):
            last_photo_hour = (now.date(), now.hour)
            do_photo()

        # 1분마다 깨어나 확인한다. 정확한 초는 중요하지 않다.
        time.sleep(30)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("종료")
