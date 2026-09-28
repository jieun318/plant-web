import { buildObservation, loadPhoto } from "@/lib/gemini";
import {
  averageByDay,
  dateKeyDaysAgo,
  dayBounds,
  decideStatus,
  hasRange,
  outOfRangeStreak,
  pickDayPhoto,
} from "@/lib/observation";
import { supabaseServer } from "@/lib/supabase-server";
import type { DayAverage } from "@/lib/observation";
import type { ObservationStatus, Plant, PlantSnapshot, SensorReading } from "@/types";

// 하루 관찰을 만드는 일. API 라우트와 스크립트(npm run observe)가 같이 쓴다.
// 서버 전용 — 화면에서 import 하지 말 것.

/** 한 번에 채울 수 있는 날짜 수. 시드 데이터로 지난 일지를 만들 때 쓴다. */
export const MAX_DAYS = 14;

export type ObserveResult = {
  plantId: string;
  date: string;
  status?: ObservationStatus;
  comment?: string;
  skipped?: string;
};

// 연속 이탈을 세려면 오늘 앞의 며칠이 필요하다. 넉넉히 훑는다.
const STREAK_WINDOW = 7;

/**
 * 그 식물의 그날 관찰을 만든다.
 * 1) 그날 10시에 가장 가까운 사진을 대표 사진으로
 * 2) 하루 평균 온습도
 * 3) 상태는 규칙으로 판정 (AI 가 아니다)
 * 4) Gemini 에 오늘·전날 사진과 평균을 주고 코멘트를 받는다
 */
export async function observePlant(plant: Plant, dateKey: string): Promise<ObserveResult> {
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
  const todayPhoto = pickDayPhoto(snapshots ?? [], dateKey);

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
  const previousPhoto = previousDate ? pickDayPhoto(snapshots ?? [], previousDate) : null;

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

