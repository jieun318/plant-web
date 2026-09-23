// 식물 정보 수정에 쓰는 값. 화면과 API 가 같이 import 한다. 서버 전용 코드를 넣지 말 것.

/** 두는 곳 선택지. 가이드가 이 값을 보고 빛·습도를 판단한다. 이 밖의 곳은 "기타"로 직접 적는다. */
export const LOCATIONS = [
  "거실 창가",
  "거실 안쪽",
  "침실",
  "주방",
  "욕실",
  "베란다",
] as const;

/** 적정 범위로 받아들일 수 있는 한계. 이 밖의 값은 판별이 잘못 준 것으로 본다. */
const TEMP_LIMIT = { min: -10, max: 50 };
const HUMIDITY_LIMIT = { min: 0, max: 100 };

/**
 * 판별이 준 적정 범위를 다듬는다.
 * 정수가 아니거나 뒤집혀 있거나 터무니없으면 통째로 버린다.
 * 범위가 없으면 관찰 상태를 판정하지 않을 뿐, 등록은 그대로 된다.
 */
export function cleanRange(
  min: unknown,
  max: unknown,
  kind: "temp" | "humidity"
): { min: number; max: number } | null {
  if (typeof min !== "number" || typeof max !== "number") return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const lo = Math.round(min);
  const hi = Math.round(max);
  if (lo >= hi) return null;

  const limit = kind === "temp" ? TEMP_LIMIT : HUMIDITY_LIMIT;
  if (lo < limit.min || hi > limit.max) return null;

  return { min: lo, max: hi };
}

export const NICKNAME_MAX = 20;
export const LOCATION_MAX = 20;

/** 앞뒤 공백을 지우고, 비었으면 null. 너무 길면 자른다. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}
