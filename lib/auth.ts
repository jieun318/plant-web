import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// 로그인 화면 없이 사용자를 식별한다.
//
// plants.user_id 가 auth.users.id 를 참조하므로 임의의 UUID 는 쓸 수 없다.
// Supabase 익명 로그인으로 진짜 계정 행을 만들되 사용자에게는 아무것도 묻지 않는다.
// 나중에 supabase.auth.updateUser({ email }) 로 이 계정에 이메일을 붙이면
// 지금까지 등록한 식물을 그대로 들고 정식 계정이 된다.
//
// 브라우저에서만 부를 것.

let pending: Promise<Session> | null = null;

async function createSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  const { data: signed, error } = await supabase.auth.signInAnonymously();

  if (error || !signed.session) {
    throw new Error(
      "익명 로그인에 실패했습니다. Supabase 대시보드 > Authentication > Sign In / Providers 에서 Anonymous sign-ins 가 켜져 있는지 확인하세요."
    );
  }

  return signed.session;
}

/** 세션을 가져오거나 없으면 만든다. 동시에 여러 번 불러도 계정이 하나만 생기게 묶어둔다. */
export function getSession(): Promise<Session> {
  if (!pending) {
    pending = createSession().catch((e) => {
      // 실패한 약속을 남겨두면 이후 호출이 영원히 같은 에러를 받는다
      pending = null;
      throw e;
    });
  }
  return pending;
}

/** API 라우트에 보낼 토큰. 서버가 이걸 검증해 사용자를 식별한다. */
export async function getAccessToken(): Promise<string> {
  return (await getSession()).access_token;
}
