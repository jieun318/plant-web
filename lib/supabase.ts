import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Supabase 환경변수가 없습니다. .env.local 의 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요."
  );
}

export const supabase = createClient(url, anonKey);

/**
 * 사진을 Storage 에 올리고 공개 URL 을 돌려준다.
 * 파일명에 랜덤값을 붙여 URL 을 모르면 찾을 수 없게 한다.
 */
export async function uploadPhoto(file: File, folder = "temp") {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("plant-photos")
    .upload(path, file);

  if (error) throw error;

  const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
  return data.publicUrl;
}