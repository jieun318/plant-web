import { NextRequest, NextResponse } from "next/server";
import { dateKeyDaysAgo, pickDayPhoto, toDateKey } from "@/lib/observation";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type { DailyObservation, Device, PlantSnapshot, SensorReading } from "@/types";

// 기기가 이만큼 조용하면 연결이 끊긴 것으로 본다. 시각 비교는 서버에서 한다.
const OFFLINE_MS = 60 * 60 * 1000;

/**
 * GET /api/today — 첫 화면이 쓰는 것
 *
 * 식물마다 오늘 사진, 지금 온습도, 상태, AI 코멘트를 붙여서 준다.
 * 목록(GET /api/plants)과 달리 관찰 정보가 함께 온다.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { data: plants, error } = await supabaseServer
    .from("plants")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[today]", error.code, error.message, error.details);
    return NextResponse.json({ error: "불러오지 못했습니다." }, { status: 500 });
  }

  const today = toDateKey(new Date());

  if (!plants?.length) {
    return NextResponse.json({ today, plants: [] });
  }

  const ids = plants.map((p) => p.id);

  // 식물마다 따로 묻지 않고 한 번에 가져와 붙인다
  const [devices, observations, snapshots, readings] = await Promise.all([
    supabaseServer
      .from("devices")
      .select("id, user_id, plant_id, name, last_seen_at, created_at")
      .in("plant_id", ids)
      .returns<Device[]>(),
    supabaseServer
      .from("daily_observations")
      .select("*")
      .in("plant_id", ids)
      .gte("date", dateKeyDaysAgo(1))
      .returns<DailyObservation[]>(),
    supabaseServer
      .from("plant_snapshots")
      .select("*")
      .in("plant_id", ids)
      .gte("captured_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
      .order("captured_at")
      .returns<PlantSnapshot[]>(),
    supabaseServer
      .from("sensor_readings")
      .select("*")
      .in("plant_id", ids)
      .gte("measured_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("measured_at")
      .returns<SensorReading[]>(),
  ]);

  const now = Date.now();

  const rows = plants.map((plant) => {
    const mine = (snapshots.data ?? []).filter((s) => s.plant_id === plant.id);
    // 오늘 사진이 아직 없으면 어제 것이라도 보여준다
    const shot = pickDayPhoto(mine, today) ?? mine.at(-1) ?? null;
    const latest = (readings.data ?? []).filter((r) => r.plant_id === plant.id).at(-1) ?? null;

    const device = (devices.data ?? []).find((d) => d.plant_id === plant.id) ?? null;

    return {
      plant,
      device,
      offline: Boolean(
        device &&
          (!device.last_seen_at || now - new Date(device.last_seen_at).getTime() > OFFLINE_MS)
      ),
      observation:
        (observations.data ?? []).find((o) => o.plant_id === plant.id && o.date === today) ?? null,
      photoUrl: shot?.photo_url ?? plant.photo_url,
      capturedAt: shot?.captured_at ?? null,
      latest,
    };
  });

  return NextResponse.json({ today, plants: rows });
}
