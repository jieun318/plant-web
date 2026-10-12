# 관찰 기기 (라즈베리파이)

식물 옆에 두고 10분마다 온습도를, 정해진 시각에 사진을 찍어 서버로 보낸다.
서버가 그걸 모아 하루 1회 관찰일지를 쓴다.

**서비스 롤 키를 넣지 않는다.** 기기에는 식물마다 발급한 코드(토큰) 하나만 들어간다.
코드가 새더라도 그 식물의 기록에만 영향이 있고, 웹에서 새로 발급하면 예전 코드는 못 쓴다.

---

## 1. 준비물

| 항목 | 메모 |
|---|---|
| 라즈베리파이 | 상시 전원. Raspberry Pi OS (Bookworm) 기준 |
| 카메라 모듈 | 보드에 맞는 리본 케이블. 매일 같은 각도로 찍어야 사진 비교가 된다 |
| DHT11 온습도 센서 | 정수 단위(±2°C, ±5%). 데이터 핀은 GPIO4 |
| 카메라 거치대 | 화분과 카메라를 고정 |

### 배선 (DHT11)

| 센서 | 파이 |
|---|---|
| VCC | 3.3V (1번 핀) |
| DATA | GPIO4 (7번 핀) |
| GND | GND (6번 핀) |

모듈형 DHT11 은 대개 풀업 저항이 붙어 있다. 없으면 VCC–DATA 사이에 10kΩ 을 넣는다.

---

## 2. 설치

```bash
# 카메라와 시간대 확인
sudo raspi-config     # Interface Options → Camera 켜기
sudo timedatectl set-timezone Asia/Seoul   # 시각이 기록의 기준이 된다

# 코드 받기
git clone <이 저장소 주소> ~/plant-web
cd ~/plant-web/pi

# 파이썬 준비 (picamera2 는 시스템에 이미 깔려 있어 --system-site-packages 를 쓴다)
python3 -m venv .venv --system-site-packages
.venv/bin/pip install -r requirements.txt

# 설정
cp .env.example .env
nano .env     # SERVER_URL 과 PLANT_TOKEN 을 채운다
```

`PLANT_TOKEN` 은 웹의 **식물 추가 → 3단계 기기 연결**에서 받은 코드다.
한 번만 보여주므로 그 화면에서 바로 붙여넣는다. 잃어버렸으면 **식물 수정 → 기기 → 새 코드 발급**.

---

## 3. 먼저 손으로 실행해 보기

```bash
cd ~/plant-web/pi
.venv/bin/python3 observer.py
```

```
09-28 14:20:01 관찰 시작 · 서버 https://plant-web-alpha.vercel.app
09-28 14:20:01 온습도 10분 간격 · 사진 [10, 12, 14, 16] 시
09-28 14:20:04 온습도 23°C 52%
```

웹의 관찰일지를 열면 기기 칸이 `기기 이름 · 1분 전` 으로 바뀐다.
확인했으면 `Ctrl+C` 로 멈춘다.

---

## 4. 부팅할 때 자동 실행 (systemd)

```bash
sudo cp ~/plant-web/pi/plant-observer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now plant-observer

systemctl status plant-observer     # 잘 돌고 있는지
journalctl -u plant-observer -f     # 기록 보기
```

파일 경로가 다르면 `plant-observer.service` 의 `User`, `WorkingDirectory`, `ExecStart` 를 고친다.

---

## 5. 네트워크가 끊기면

보내지 못한 것은 `pending/` 에 쌓인다.

- 온습도 → `pending/readings.jsonl` (한 줄에 하나)
- 사진 → `pending/photos/*.jpg` (파일 이름이 찍은 시각)

연결이 돌아오면 다음 차례에 쌓인 것부터 보낸다. 서버는 같은 기기의 같은 시각을
한 줄로 합치므로 두 번 보내도 기록이 중복되지 않는다.

---

## 6. 안 될 때

| 증상 | 확인할 것 |
|---|---|
| `기기 인증 실패(401)` | `.env` 의 `PLANT_TOKEN`. 웹에서 새 코드를 발급했다면 예전 코드는 못 쓴다 |
| `센서를 읽지 못했습니다` 가 반복 | 배선과 `SENSOR_PIN`. DHT11 은 원래 실패가 잦아 몇 번은 정상이다 |
| 사진만 안 올라감 | `sudo raspi-config` 에서 카메라, `libcamera-hello` 로 카메라 자체 확인 |
| 기록 시각이 어긋남 | `timedatectl` — 시간대가 `Asia/Seoul` 인지 |
| 관찰일지에 `연결 끊김` | 기기 기록이 1시간 넘게 없을 때 뜬다. `systemctl status plant-observer` |

---

## 7. 서버가 하는 일

| 보내는 것 | 받는 곳 |
|---|---|
| 온습도 | `POST /api/device/readings` — `{ temperature, humidity, measuredAt }` 또는 `{ readings: [...] }` |
| 사진 | `POST /api/device/snapshots` — multipart `photo`, `capturedAt` |

둘 다 `Authorization: Bearer <코드>` 를 붙인다.
매일 오전 11시에 서버가 그날 10시 사진과 하루 평균 온습도로 관찰일지를 쓴다.
