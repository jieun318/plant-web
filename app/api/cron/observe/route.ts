import { NextRequest, NextResponse } from "next/server";
import { buildObservation, loadPhoto } from "@/lib/gemini";
import {
  averageByDay,
  dateKeyDaysAgo,
  dayBounds,
  decideStatus,
  hasRange,
  outOfRangeStreak,
  toDateKey,
} from "@/lib/observation";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type { DayAverage } from "@/lib/observation";
import type { ObservationStatus, Plant, PlantSnapshot, SensorReading } from "@/types";

// 대표 사진을 고르는 시각 (한국 시간). 이 시각에 가장 가까운 사진을 그날 사진으로 쓴다.
const PHOTO_HOUR = 10;

// 연속 이탈을 세려면 오늘 앞의 며칠이 필요하다. 넉넉히 훑는다.
const STREAK_WINDOW = 7;

// 한 번에 채울 수 있는 날짜 수. 시드 데이터로 지난 일지를 만들 때 쓴다.
const MAX_DAYS = 14;

type Result = {
  plantId: string;
  date: string;
  status?: ObservationStatus;
  comment?: string;
  skipped?: string;
};

/**
 * 그 식물의 그날 관찰을 만든다.
 * 1) 그날 10시에 가장 가까운 사진을 대표 사진으로
 * 2) 하루 평균 온습도
 * 3) 상태는 규칙으로 판정 (AI 가 아니다)
 * 4) Gemini 에 오늘·전날 사진과 평균을 주고 코멘트를 받는다
 */
async function observe(plant: Plant, dateKey: string): Promise<Result> {
  const from = dayBounds(dateKeyDaysAgo(STREAK_WINDOW - 1, new Date(`${dateKey}T00:00:00Z`))).from;
  const to = dayBounds(dateKey).to;

  const { data: readings } = await supabaseServer
    .from("sensor_readings")
    .select("*")
    .eq("plant_id", plant.id)
    .gte("measured_at", from)
    .lt("measured_at", to)
    .order("measured_at")
    .returns<SensorReading[]>();

  const { data: snapshots } = await supabaseServer
    .from("plant_snapshots")
    .select("*")
    .eq("plant_id", plant.id)
    .lt("captured_at", to)
    .order("captured_at", { ascending: false })
    .limit(60)
    .returns<PlantSnapshot[]>();

  const days: DayAverage[] = averageByDay(readings ?? []);
  const today = days.find((d) => d.date === dateKey);
  const todayPhoto = pickPhoto(snapshots ?? [], dateKey);

  // 그날 기록이 아무것도 없으면 일지를 만들지 않는다. 빈 줄을 쌓아두지 않는다.
  if (!today && !todayPhoto) {
    return { plantId: plant.id, date: dateKey, skipped: "그날 기록이 없습니다" };
  }

  const streak = today ? outOfRangeStreak(plant, days, dateKey) : 0;

  // 비교할 전날 사진. 없으면 오늘 사진만 보고 쓴다.
  const previousDate = days
    .map((d) => d.date)
    .filter((d) => d < dateKey)
    .pop();
  const previousPhoto = previousDate ? pickPhoto(snapshots ?? [], previousDate) : null;

  let comment = "";
  let visibleChange = false;

  try {
    const result = await buildObservation({
      species: plant.species,
      today: await loadPhoto(todayPhoto?.photo_url ?? null),
      previous: await loadPhoto(previousPhoto?.photo_url ?? null),
      avgTemp: today?.temp ?? null,
      avgHumidity: today?.humidity ?? null,
      tempRange: hasRange(plant) ? `${plant.temp_min}–${plant.temp_max}°C` : null,
      humidityRange: hasRange(plant) ? `${plant.humidity_min}–${plant.humidity_max}%` : null,
    });

    comment = result.comment;
    visibleChange = result.visibleChange;
  } catch (e) {
    // 코멘트를 못 받아도 상태와 평균은 남긴다. 일지가 비는 것보다 낫다.
    console.warn("[observe] 코멘트 생성 실패", plant.id, dateKey, e);
  }

  const status = decideStatus(streak, visibleChange);

  const { error } = await supabaseServer.from("daily_observations").upsert(
    {
      plant_id: plant.id,
      date: dateKey,
      photo_url: todayPhoto?.photo_url ?? null,
      avg_temp: today?.temp ?? null,
      avg_humidity: today?.humidity ?? null,
      status,
      ai_comment: comment || null,
    },
    { onConflict: "plant_id,date" }
  );

  if (error) {
    console.error("[observe]", error.code, error.message, error.details);
    return { plantId: plant.id, date: dateKey, skipped: "저장하지 못했습니다" };
  }

  return { plantId: plant.id, date: dateKey, status, comment };
}

/** 그날 사진 중 10시에 가장 가까운 것. */
function pickPhoto(snapshots: PlantSnapshot[], dateKey: string): PlantSnapshot | null {
  const sameDay = snapshots.filter((s) => toDateKey(s.captured_at) === dateKey);
  if (sameDay.length === 0) return null;

  const target = new Date(`${dateKey}T00:00:00.000Z`).getTime() + PHOTO_HOUR * 3_600_000;

  return sameDay.reduce((best, s) => {
    const hour = new Date(s.captured_at).getTime() + 9 * 3_600_000;
    const bestHour = new Date(best.captured_at).getTime() + 9 * 3_600_000;
    return Math.abs(hour - target) < Math.abs(bestHour - target) ? s : best;
  });
}

/**
 * Vercel Cron 이 보낸 요청인지. 배포에서는 CRON_SECRET 을 반드시 설정한다.
 * (Vercel 이 Authorization: Bearer <CRON_SECRET> 을 붙여 보낸다)
 */
function isCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * POST /api/cron/observe — 하루 1회 관찰 만들기
 *
 * 배포: Vercel Cron 이 매일 오전 11시(한국 시간)에 부른다. 모든 식물을 돈다.
 * 로컬: 관찰일지의 개발용 버튼이 { plantId } 로 부른다. 그 식물만 만든다.
 *
 * body: { plantId?, date?: "YYYY-MM-DD", days?: 1~14 }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plantId: string | undefined = body.plantId;
    const days = Math.min(Math.max(Number(body.days) || 1, 1), MAX_DAYS);
    const lastDate: string = body.date ?? toDateKey(new Date());

    // 크론이 아니면, 개발 중에 자기 식물 하나만 만드는 경우만 허용한다
    if (!isCron(req)) {
      const userId = await getUserId(req);
      const allowed = process.env.NODE_ENV !== "production" && userId && plantId;

      if (!allowed) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
      }

      const { data: mine } = await supabaseServer
        .from("plants")
        .select("id")
        .eq("id", plantId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!mine) {
        return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
      }
    }

    const query = supabaseServer.from("plants").select("*");
    const { data: plants } = plantId
      ? await query.eq("id", plantId).returns<Plant[]>()
      : await query.returns<Plant[]>();

    if (!plants?.length) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // 날짜는 오래된 것부터. 연속 이탈을 세려면 앞 날이 먼저 있어야 한다.
    const dates = Array.from({ length: days }, (_, i) =>
      dateKeyDaysAgo(days - 1 - i, new Date(`${lastDate}T00:00:00Z`))
    );

    const results: Result[] = [];

    for (const plant of plants) {
      for (const date of dates) {
        results.push(await observe(plant, date));
      }
    }

    const made = results.filter((r) => !r.skipped).length;
    console.log(`[observe] ${made}/${results.length}건 생성`);

    return NextResponse.json({ ok: true, made, results });
  } catch (e) {
    console.error("[observe]", e);
    return NextResponse.json({ error: "관찰을 만들지 못했습니다." }, { status: 500 });
  }
}
