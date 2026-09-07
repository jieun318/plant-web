import type { Plant } from "@/types";

const DAY = 24 * 60 * 60 * 1000;

/** 시각을 버리고 날짜만 남긴다. "몇 밀리초 뒤"가 아니라 "며칠 뒤"를 세기 위함. */
function atMidnight(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 다음 물주기 예정일. 한 번도 안 줬으면 등록일을 기준으로 잡는다. */
export function nextWaterDate(plant: Plant): Date {
  const base = atMidnight(plant.last_watered ?? plant.created_at);
  return new Date(base.getTime() + plant.water_interval * DAY);
}

/** 오늘 기준 남은 일수. 0 이면 오늘, 음수면 이미 지났다. */
export function daysUntilWater(plant: Plant): number {
  const today = atMidnight(new Date());
  return Math.round((nextWaterDate(plant).getTime() - today.getTime()) / DAY);
}

/** 오늘 물을 줘야 하거나 이미 지난 식물인지. */
export function needsWaterToday(plant: Plant): boolean {
  return daysUntilWater(plant) <= 0;
}

/** 배지에 쓰는 짧은 라벨. */
export function waterLabel(days: number): string {
  if (days === 0) return "오늘";
  if (days < 0) return `${-days}일 지남`;
  return `D-${days}`;
}

/** 급한 순 정렬. 등록순이 아니다. */
export function byUrgency(a: Plant, b: Plant): number {
  return daysUntilWater(a) - daysUntilWater(b);
}
