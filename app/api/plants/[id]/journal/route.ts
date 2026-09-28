import { NextRequest, NextResponse } from "next/server";
import {
  averageByDay,
  dateKeyDaysAgo,
  dayBounds,
  pickDayPhoto,
  toDateKey,
} from "@/lib/observation";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type {
  DailyObservation,
  Device,
  PlantSnapshot,
  SensorReading,
} from "@/types";

// 관찰일지가 한 번에 쓰는 것들. 화면이 요청을 여러 번 보내지 않게 한 곳에서 모아준다.
const SHEET_DAYS = 14; // 밀착 인화지에 늘어놓는 날짜 수
const CHART_DAYS = 7; // 그래프

/**
 * GET /api/plants/[id]/journal
 *
 * 관찰일지 화면이 쓰는 것: 기기 상태, 지금 온습도, 날짜별 대표 사진,
 * 최근 7일 평균(그래프), 일지 목록.
 * 식물 자체와 관리 기록은 GET /api/plants/[id] 가 준다.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/plants/[id]/journal">) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;

  // user_id 를 조건에 넣어야 남의 일지를 id 만으로 열어볼 수 없다
  const { data: plant } = await supabaseServer
    .from("plants")
    .select("id, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!plant) {
    return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
  }

  // 표본 라벨에 적는 번호. 이 사용자가 몇 번째로 등록한 식물인지.
  const { count } = await supabaseServer
    .from("plants")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("created_at", plant.created_at);

  const since = dayBounds(dateKeyDaysAgo(SHEET_DAYS - 1)).from;

  const [device, observations, snapshots, readings, latest] = await Promise.all([
    supabaseServer
      .from("devices")
      .select("id, user_id, plant_id, name, last_seen_at, created_at")
      .eq("plant_id", id)
      .maybeSingle<Device>(),
    supabaseServer
      .from("daily_observations")
      .select("*")
      .eq("plant_id", id)
      .order("date", { ascending: false })
      .limit(SHEET_DAYS)
      .returns<DailyObservation[]>(),
    supabaseServer
      .from("plant_snapshots")
      .select("*")
      .eq("plant_id", id)
      .gte("captured_at", since)
      .order("captured_at")
      .returns<PlantSnapshot[]>(),
    supabaseServer
      .from("sensor_readings")
      .select("*")
      .eq("plant_id", id)
      .gte("measured_at", dayBounds(dateKeyDaysAgo(CHART_DAYS - 1)).from)
      .order("measured_at")
      .returns<SensorReading[]>(),
    supabaseServer
      .from("sensor_readings")
      .select("*")
      .eq("plant_id", id)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle<SensorReading>(),
  ]);

  // 날짜별 대표 사진 (그날 10시에 가장 가까운 것). 오래된 날부터.
  const photos = Array.from({ length: SHEET_DAYS }, (_, i) => {
    const date = dateKeyDaysAgo(SHEET_DAYS - 1 - i);
    const shot = pickDayPhoto(snapshots.data ?? [], date);

    return { date, photoUrl: shot?.photo_url ?? null, capturedAt: shot?.captured_at ?? null };
  }).filter((day) => day.photoUrl);

  return NextResponse.json({
    no: count ?? 1,
    device: device.data ?? null,
    // 지금 온습도. 기기가 조용하면 마지막으로 보낸 값이다
    latest: latest.data ?? null,
    today: toDateKey(new Date()),
    photos,
    chart: averageByDay(readings.data ?? []),
    observations: observations.data ?? [],
  });
}
