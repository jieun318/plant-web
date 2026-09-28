import type { ObservationStatus, Plant, SensorReading } from "@/types";

// 하루 관찰을 만드는 규칙. 화면과 API 가 같이 쓰므로 서버 전용 코드를 넣지 말 것.
//
// 상태는 AI 가 정하지 않는다. 여기 규칙이 정한다.
// AI 는 사진에서 눈에 띄는 변화가 보이는지(visibleChange)만 알려주고,
// 그것도 "확인 필요"로 올리는 데만 쓴다.

const DAY = 24 * 60 * 60 * 1000;
const KST_OFFSET = 9 * 60 * 60 * 1000;

/** 3일 이상 연속으로 적정 범위를 벗어나면 확인이 필요하다. */
export const CHECK_STREAK = 3;

/** YYYY-MM-DD (한국 시간 기준 날짜) */
export function toDateKey(value: string | Date): string {
  return new Date(new Date(value).getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** 그 날짜(한국 시간)의 시작과 끝. DB 를 훑을 때 쓴다. */
export function dayBounds(dateKey: string): { from: string; to: string } {
  const start = new Date(`${dateKey}T00:00:00.000Z`).getTime() - KST_OFFSET;
  return {
    from: new Date(start).toISOString(),
    to: new Date(start + DAY).toISOString(),
  };
}

/** 오늘부터 며칠 전 날짜 키. */
export function dateKeyDaysAgo(daysAgo: number, now: Date = new Date()): string {
  return toDateKey(new Date(now.getTime() - daysAgo * DAY));
}

export type DayAverage = {
  date: string;
  temp: number | null;
  humidity: number | null;
  count: number;
};

/** 측정을 날짜별로 묶어 평균을 낸다. 소수 한 자리까지. */
export function averageByDay(readings: SensorReading[]): DayAverage[] {
  const groups = new Map<string, SensorReading[]>();

  for (const reading of readings) {
    const key = toDateKey(reading.measured_at);
    const list = groups.get(key);
    if (list) list.push(reading);
    else groups.set(key, [reading]);
  }

  return [...groups.entries()]
    .map(([date, list]) => ({
      date,
      temp: round1(list.reduce((sum, r) => sum + r.temperature, 0) / list.length),
      humidity: round1(list.reduce((sum, r) => sum + r.humidity, 0) / list.length),
      count: list.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 적정 범위를 아는 식물인지. 예전에 등록한 식물은 범위가 없어 상태를 판정하지 않는다. */
export function hasRange(plant: Plant): boolean {
  return (
    plant.temp_min !== null &&
    plant.temp_max !== null &&
    plant.humidity_min !== null &&
    plant.humidity_max !== null
  );
}

/** 하루 평균이 적정 범위를 벗어났는지. 범위를 모르면 벗어나지 않은 것으로 본다. */
export function isOutOfRange(plant: Plant, day: DayAverage): boolean {
  if (!hasRange(plant)) return false;

  const tempOut =
    day.temp !== null && (day.temp < plant.temp_min! || day.temp > plant.temp_max!);
  const humidityOut =
    day.humidity !== null &&
    (day.humidity < plant.humidity_min! || day.humidity > plant.humidity_max!);

  return tempOut || humidityOut;
}

/**
 * 그 날짜로 끝나는 연속 이탈 일수.
 * 예: 어제와 오늘이 벗어났으면 2. 오늘이 정상이면 0.
 */
export function outOfRangeStreak(
  plant: Plant,
  days: DayAverage[],
  dateKey: string
): number {
  const upto = days.filter((d) => d.date <= dateKey).sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  for (const day of upto) {
    if (!isOutOfRange(plant, day)) break;
    streak += 1;
  }

  return streak;
}

/**
 * 상태 판정.
 *   good    적정 범위 안
 *   caution 벗어난 날이 1~2일
 *   check   3일 이상 연속으로 벗어남, 또는 사진에서 눈에 띄는 변화
 */
export function decideStatus(streak: number, visibleChange: boolean): ObservationStatus {
  if (streak >= CHECK_STREAK || visibleChange) return "check";
  if (streak > 0) return "caution";
  return "good";
}

export const STATUS_LABEL: Record<ObservationStatus, string> = {
  good: "좋음",
  caution: "주의",
  check: "확인 필요",
};
