import { createClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트. app/api/ 안에서만 import 할 것.
//
// SUPABASE_SERVICE_ROLE_KEY 가 있으면 그것을 쓴다. 이 키는 RLS 를 우회하므로
// 절대 NEXT_PUBLIC_ 접두사를 붙이면 안 된다. 없으면 anon 키로 떨어지는데,
// 그때는 테이블에 쓰기 정책이 있어야 등록이 된다.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// ?? 가 아니라 || 를 쓴다. 키를 비워둔 채 줄만 넣어두면 빈 문자열이 들어와
// ?? 는 그걸 "값이 있다"고 보고 통과시켜 버린다.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase 환경변수가 없습니다. .env.local 의 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요."
  );
}

export const supabaseServer = createClient(url, key, {
  auth: { persistSession: false },
});

/** 사진을 Storage 에 올리고 공개 URL 을 돌려준다. */
export async function uploadPhoto(file: File, folder = "temp") {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseServer.storage
    .from("plant-photos")
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabaseServer.storage
    .from("plant-photos")
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Authorization 헤더의 토큰을 검증해 사용자 ID 를 돌려준다.
 * 클라이언트가 보낸 ID 를 그대로 믿으면 남의 데이터를 읽고 쓸 수 있으므로
 * 반드시 토큰에서 꺼낸다.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}
