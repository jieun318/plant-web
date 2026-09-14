import { supabase } from "./supabase";

// 로그인 화면 없이 사용자를 식별한다.
//
// plants.user_id 가 auth.users.id 를 참조하므로 임의의 UUID 는 쓸 수 없다.
// Supabase 익명 로그인으로 진짜 계정 행을 만들되 사용자에게는 아무것도 묻지 않는다.
// 나중에 supabase.auth.updateUser({ email }) 로 이 계정에 이메일을 붙이면
// 지금까지 등록한 식물을 그대로 들고 정식 계정이 된다.
//
// 브라우저에서만 부를 것.

let ensuring: Promise<void> | null = null;

async function createIfNeeded(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      "익명 로그인에 실패했습니다. Supabase 대시보드 > Authentication > Sign In / Providers 에서 Anonymous sign-ins 가 켜져 있는지 확인하세요."
    );
  }
}

/** 세션이 없으면 만든다. 동시에 여러 번 불러도 계정이 하나만 생기게 묶어둔다. */
export function ensureSession(): Promise<void> {
  if (!ensuring) {
    ensuring = createIfNeeded().catch((e) => {
      // 실패한 약속을 남겨두면 이후 호출이 영원히 같은 에러를 받는다
      ensuring = null;
      throw e;
    });
  }
  return ensuring;
}

/**
 * API 라우트에 보낼 토큰.
 *
 * 세션 객체를 캐시하면 안 된다. 액세스 토큰은 한 시간이면 만료되므로
 * 탭을 오래 열어두면 죽은 토큰을 계속 보내게 된다.
 * getSession() 은 만료가 가까우면 알아서 갱신해준다.
 */
export async function getAccessToken(): Promise<string> {
  await ensureSession();

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("세션을 확인하지 못했습니다. 새로고침해 주세요.");
  }

  return data.session.access_token;
}

/** 서버가 토큰을 거부했을 때 세션을 버리고 새로 만든다. */
export async function resetSession(): Promise<void> {
  ensuring = null;
  await supabase.auth.signOut({ scope: "local" });
  await ensureSession();
}
