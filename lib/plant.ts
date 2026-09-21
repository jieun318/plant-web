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

export const NICKNAME_MAX = 20;
export const LOCATION_MAX = 20;

/** 앞뒤 공백을 지우고, 비었으면 null. 너무 길면 자른다. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}
