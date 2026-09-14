import { getAccessToken, resetSession } from "./auth";

// 화면에서 API 라우트를 부를 때는 항상 이걸 쓴다.
// 토큰을 붙이는 일과, 토큰이 죽었을 때 되살리는 일을 한군데서 처리한다.

async function send(path: string, init: RequestInit): Promise<Response> {
  const token = await getAccessToken();

  return fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}

/**
 * 토큰을 붙여 호출한다.
 * 401 이 오면 세션이 죽은 것이므로 한 번만 새로 만들어 다시 시도한다.
 * (계정이 지워졌거나, 탭을 오래 열어둬 갱신에 실패한 경우)
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await send(path, init);
  if (res.status !== 401) return res;

  await resetSession();
  return send(path, init);
}
