// 관찰 기기와 14일치 데이터를 만든다. 기기 없이 화면을 만들고 보기 위한 것이다.
//
//   npm run seed -- <식물 id> [--photo <파일 경로 또는 주소>]
//   npm run seed                      → 내 식물 목록을 보여주고 끝난다
//
// 다시 실행하면 그 식물의 시드 데이터를 지우고 새로 만든다. 여러 번 돌려도 쌓이지 않는다.
// 서비스 롤 키를 쓰므로 로컬에서만 실행할 것.

import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Plant } from "../types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "환경변수가 없습니다. npm run seed 로 실행하세요 (.env.local 을 읽습니다)."
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// ── 만들 데이터의 모양 ──────────────────────────────────────────────
const DAYS = 14;
const INTERVAL_MIN = 10; // 온습도 간격
const PHOTO_HOURS = [10, 12, 14, 16]; // 사진 찍는 시각 (한국 시간)

// 며칠은 습도가 적정 범위 아래로 떨어지게 한다. 화면에서 "주의 → 확인 필요"를 보려면 필요하다.
// 오늘로부터 며칠 전인지 (3일 연속이라 "확인 필요"까지 간다)
const DRY_DAYS_AGO = [2, 1, 0];

const KST_OFFSET = 9 * 60 * 60 * 1000;

/** 한국 시간 기준 그날 0시의 UTC 시각 */
function kstMidnight(daysAgo: number): number {
  const now = Date.now() + KST_OFFSET;
  const midnight = now - (now % 86_400_000);
  return midnight - daysAgo * 86_400_000 - KST_OFFSET;
}

/** 0~1 을 오가는 하루 주기. 낮에 덥고 밤에 선선하게 만든다. */
function daily(hour: number): number {
  return (Math.sin(((hour - 9) / 24) * 2 * Math.PI) + 1) / 2;
}

function jitter(range: number): number {
  return Math.round((Math.random() - 0.5) * 2 * range);
}

type Reading = {
  device_id: string;
  plant_id: string;
  temperature: number;
  humidity: number;
  measured_at: string;
};

/**
 * 14일치 온습도. DHT11 이라 정수다.
 * 온도는 적정 범위 안에서 하루 주기로 오르내리고,
 * 습도는 보통 적정 범위 안이지만 지정한 며칠은 그 아래로 내려간다.
 */
function makeReadings(plant: Plant, deviceId: string): Reading[] {
  const tempMid = (plant.temp_min ?? 20) + ((plant.temp_max ?? 26) - (plant.temp_min ?? 20)) / 2;
  const humidityMid =
    (plant.humidity_min ?? 45) + ((plant.humidity_max ?? 65) - (plant.humidity_min ?? 45)) / 2;
  const dryTarget = Math.max(15, (plant.humidity_min ?? 45) - 12);

  const rows: Reading[] = [];
  const now = Date.now();

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const midnight = kstMidnight(daysAgo);
    const dry = DRY_DAYS_AGO.includes(daysAgo);

    for (let min = 0; min < 24 * 60; min += INTERVAL_MIN) {
      const at = midnight + min * 60_000;
      if (at > now) break; // 오늘은 지금까지만

      const hour = min / 60;
      const temperature = Math.round(tempMid - 2 + daily(hour) * 4) + jitter(1);
      // 건조한 날은 하루에 걸쳐 서서히 떨어진다
      const base = dry ? dryTarget + (1 - hour / 24) * 6 : humidityMid;
      const humidity = Math.round(base - daily(hour) * 6) + jitter(2);

      rows.push({
        device_id: deviceId,
        plant_id: plant.id,
        temperature,
        humidity: Math.min(100, Math.max(0, humidity)),
        measured_at: new Date(at).toISOString(),
      });
    }
  }

  return rows;
}

/** 사진은 한 장을 올려 모든 날짜가 같이 쓴다. 시드의 목적은 화면 확인이다. */
async function samplePhotoUrl(plant: Plant, source: string | undefined): Promise<string | null> {
  if (!source) {
    if (plant.photo_url) {
      console.log("사진: 등록 사진을 모든 날짜에 재사용합니다");
      return plant.photo_url;
    }
    console.log("사진: 쓸 사진이 없어 건너뜁니다 (--photo 로 지정할 수 있습니다)");
    return null;
  }

  const bytes = source.startsWith("http")
    ? Buffer.from(await (await fetch(source)).arrayBuffer())
    : await readFile(source);

  const path = `seed/${plant.id}/${randomBytes(8).toString("hex")}.jpg`;
  const { error } = await db.storage
    .from("plant-photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);

  console.log(`사진: ${source} 를 올려 모든 날짜에 재사용합니다`);
  return db.storage.from("plant-photos").getPublicUrl(path).data.publicUrl;
}

async function main() {
  const args = process.argv.slice(2);
  const plantId = args.find((a) => !a.startsWith("--"));
  const photoArg = args.includes("--photo") ? args[args.indexOf("--photo") + 1] : undefined;

  if (!plantId) {
    const { data } = await db
      .from("plants")
      .select("id, species, nickname, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    console.log("식물 id 를 주세요:  npm run seed -- <식물 id>\n");
    for (const p of data ?? []) {
      console.log(`  ${p.id}  ${p.nickname || p.species}`);
    }
    return;
  }

  const { data: plant } = await db
    .from("plants")
    .select("*")
    .eq("id", plantId)
    .maybeSingle<Plant>();

  if (!plant) {
    console.error("그런 식물이 없습니다:", plantId);
    process.exit(1);
  }

  console.log(`식물: ${plant.nickname || plant.species} (${plant.id})`);
  console.log(
    `적정 범위: ${plant.temp_min ?? "-"}~${plant.temp_max ?? "-"}°C · ` +
      `${plant.humidity_min ?? "-"}~${plant.humidity_max ?? "-"}%`
  );

  // ── 1. 지난 시드 지우기 ──
  // 기기를 지우면 측정·사진의 device_id 만 비워지므로 (set null) 따로 지운다.
  await db.from("sensor_readings").delete().eq("plant_id", plant.id);
  await db.from("plant_snapshots").delete().eq("plant_id", plant.id);
  await db.from("daily_observations").delete().eq("plant_id", plant.id);
  await db.from("devices").delete().eq("plant_id", plant.id);
  await db.storage.from("plant-photos").remove(
    ((await db.storage.from("plant-photos").list(`seed/${plant.id}`)).data ?? []).map(
      (f) => `seed/${plant.id}/${f.name}`
    )
  );
  console.log("지난 시드 데이터를 지웠습니다");

  // ── 2. 기기 연결 ──
  const token = "pw_" + randomBytes(24).toString("base64url");
  const { data: device, error: deviceError } = await db
    .from("devices")
    .insert({
      user_id: plant.user_id,
      plant_id: plant.id,
      name: `seed-${plant.id.slice(0, 4)}`,
      token_hash: createHash("sha256").update(token).digest("hex"),
      last_seen_at: new Date().toISOString(),
    })
    .select("id, name")
    .single();

  if (deviceError || !device) {
    console.error("기기를 만들지 못했습니다:", deviceError?.message);
    process.exit(1);
  }

  // ── 3. 온습도 ──
  const readings = makeReadings(plant, device.id);
  for (let i = 0; i < readings.length; i += 500) {
    const { error } = await db.from("sensor_readings").insert(readings.slice(i, i + 500));
    if (error) {
      console.error("온습도를 넣지 못했습니다:", error.message);
      process.exit(1);
    }
  }

  // ── 4. 사진 ──
  const photoUrl = await samplePhotoUrl(plant, photoArg);
  let photoCount = 0;

  if (photoUrl) {
    const snapshots = [];
    const now = Date.now();

    for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
      for (const hour of PHOTO_HOURS) {
        const at = kstMidnight(daysAgo) + hour * 3_600_000;
        if (at > now) continue;

        snapshots.push({
          device_id: device.id,
          plant_id: plant.id,
          photo_url: photoUrl,
          captured_at: new Date(at).toISOString(),
        });
      }
    }

    const { error } = await db.from("plant_snapshots").insert(snapshots);
    if (error) {
      console.error("사진 기록을 넣지 못했습니다:", error.message);
      process.exit(1);
    }
    photoCount = snapshots.length;
  }

  const dry = DRY_DAYS_AGO.map((d) => (d === 0 ? "오늘" : `${d}일 전`)).join(", ");
  console.log(`\n기기 ${device.name} 연결`);
  console.log(`온습도 ${readings.length}건 (${DAYS}일 × ${INTERVAL_MIN}분 간격)`);
  console.log(`사진 ${photoCount}건 (하루 ${PHOTO_HOURS.join("·")}시)`);
  console.log(`습도가 적정 범위 아래인 날: ${dry}`);
  console.log(`\n기기 토큰 (라즈베리파이 pi/.env 에 넣어 쓸 수 있습니다)\n  ${token}`);
  console.log(
    `
다음: 관찰일지를 채우려면
  npm run observe -- ${plant.id} --days 14
` +
      "  (또는 관찰일지 화면의 개발용 [지난 14일 채우기] 버튼)"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
