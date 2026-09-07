import type { IdentifyResult } from "@/types";

// 홈에서 판별한 결과를 /result 로 넘긴다.
// 상태 라이브러리를 쓰지 않기로 했고 URL 에 담기에는 큰 값이라 sessionStorage 를 쓴다.
// 탭을 닫으면 같이 사라지는 편이 이 데이터 성격에 맞다.

const KEY = "plantweb:identify";

export type IdentifyHandoff = {
  result: IdentifyResult;
  /** 업로드에 쓴 사진(리사이즈 후) data URL */
  photo: string;
};

export function saveIdentify(handoff: IdentifyHandoff) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // 저장이 막혀 있어도 판별 자체는 끝났으므로 이동은 막지 않는다
  }
}

// useSyncExternalStore 는 값이 안 바뀌면 같은 참조를 돌려받아야 한다.
// 매번 JSON.parse 하면 새 객체가 나와 무한 렌더가 된다.
let cachedRaw: string | null = null;
let cached: IdentifyHandoff | null = null;

/** 브라우저 스냅샷. 넘어온 결과가 없으면 null. */
export function getIdentifySnapshot(): IdentifyHandoff | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as IdentifyHandoff) : null;
    } catch {
      cached = null;
    }
  }

  return cached;
}

/**
 * 서버 렌더와 hydration 때 쓰는 스냅샷.
 * null(결과 없음) 과 구분하려고 undefined(아직 모름) 를 돌려준다.
 * 그래야 첫 프레임에 "결과가 없습니다" 가 잠깐 스쳤다 사라지지 않는다.
 */
export function getIdentifyServerSnapshot(): IdentifyHandoff | null | undefined {
  return undefined;
}

/** 같은 탭에서는 우리가 직접 쓰고 바로 이동하므로 구독할 것이 없다. */
export function subscribeIdentify(): () => void {
  return () => {};
}
