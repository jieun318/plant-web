import type { CareLog, Plant } from "@/types";

// 식물 카드와 상세에 쓰는 날짜 계산을 모아둔다.

const DAY = 24 * 60 * 60 * 1000;

/** 예정일까지 이만큼 이상 남았는데 물을 주려 하면 한 번 되묻는다. */
export const EARLY_WARN_DAYS = 3;

/** 최근 EARLY_WINDOW_DAYS 안에 이른 물주기가 이만큼 쌓이면 상세 상단에 과습 안내를 띄운다. */
export const EARLY_WARN_COUNT = 3;

/** 이른 물주기를 세는 기간. 오래전 기록 때문에 안내가 영영 안 사라지는 것을 막는다. */
export const EARLY_WINDOW_DAYS = 30;

/**
 * 이른 물주기 기록에 남기는 문구.
 *
 * 세는 것도 이 문구로 한다. care_logs 에 따로 칸을 만들지 않았다.
 * 문구를 바꾸면 지난 기록이 집계에서 빠지므로 여기 한 곳에서만 만든다.
 */
const EARLY_PREFIX = "예정보다";

export function earlyWaterMemo(daysEarly: number): string {
  return `${EARLY_PREFIX} ${daysEarly}일 이른 물주기`;
}

export function isEarlyWater(log: CareLog): boolean {
  return log.type === "water" && Boolean(log.memo?.startsWith(EARLY_PREFIX));
}

/** 최근 EARLY_WINDOW_DAYS 안에 이른 물주기가 몇 번 있었는지. */
export function countEarlyWaterings(logs: CareLog[], now = new Date()): number {
  const since = now.getTime() - EARLY_WINDOW_DAYS * DAY;
  return logs.filter(
    (log) => isEarlyWater(log) && new Date(log.created_at).getTime() >= since
  ).length;
}

/** 같은 날인지. 시각은 보지 않는다. */
export function isSameDay(a: string | Date, b: string | Date): boolean {
  return atMidnight(a).getTime() === atMidnight(b).getTime();
}

/** 오늘 남긴 물주기 기록. 없으면 undefined. */
export function todaysWaterLog(logs: CareLog[]): CareLog | undefined {
  const today = new Date();
  return logs.find(
    (log) => log.type === "water" && isSameDay(log.created_at, today)
  );
}

// 날짜 경계는 한국 시간으로 고정한다.
// 서버(UTC)와 브라우저(KST)가 "오늘"을 다르게 보면 새벽에 물 준 기록이 어제로 잡힌다.
const KST_OFFSET = 9 * 60 * 60 * 1000;

/** 시각을 버리고 날짜(한국 시간 자정)만 남긴다. "몇 밀리초 뒤"가 아니라 "며칠 뒤"를 세기 위함. */
function atMidnight(value: string | Date): Date {
  const shifted = new Date(value).getTime() + KST_OFFSET;
  return new Date(shifted - (shifted % DAY) - KST_OFFSET);
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

/** 등록한 날을 1일째로 세어 오늘이 며칠째인지. */
export function daysSinceRegistered(plant: Plant): number {
  const today = atMidnight(new Date());
  const start = atMidnight(plant.created_at);
  return Math.round((today.getTime() - start.getTime()) / DAY) + 1;
}

/** 상세 화면에 크게 쓰는 문구. 배지보다 말투가 길다. */
export function waterPhrase(days: number): string {
  if (days === 0) return "오늘";
  if (days < 0) return `${-days}일 지남`;
  return `${days}일 뒤`;
}
