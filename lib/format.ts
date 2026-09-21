// 화면에 쓰는 날짜·수치 형식. 화면마다 toLocaleString 을 따로 쓰지 않고 여기서만 만든다.
// 날짜는 한국 시간 기준이다 (lib/water.ts 와 같은 이유 — 서버와 브라우저가 같은 날을 보게).

const KST_OFFSET = 9 * 60 * 60 * 1000;

/** 한국 시간으로 옮긴 뒤 UTC 필드로 읽는다. 실행 환경의 시간대와 무관하다. */
function kst(value: string | Date): Date {
  return new Date(new Date(value).getTime() + KST_OFFSET);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 2026.09.21 */
export function formatDate(value: string | Date): string {
  const d = kst(value);
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

/** 09.21 */
export function formatShortDate(value: string | Date): string {
  const d = kst(value);
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

/** 2026.09.21 14:20 */
export function formatDateTime(value: string | Date): string {
  const d = kst(value);
  return `${formatDate(value)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 24°C — DHT11 이라 정수. 평균처럼 소수가 와도 반올림한다. */
export function formatTemp(value: number): string {
  return `${Math.round(value)}°C`;
}

/** 31% */
export function formatHumidity(value: number): string {
  return `${Math.round(value)}%`;
}

/** 18–27°C / 50–60% — 적정 범위 */
export function formatRange(min: number, max: number, unit: "°C" | "%"): string {
  return `${min}–${max}${unit}`;
}
