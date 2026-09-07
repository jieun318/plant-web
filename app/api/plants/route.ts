import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer, uploadPhoto } from "@/lib/supabase-server";
import type { IdentifyResult } from "@/types";

const UNAUTHORIZED = NextResponse.json(
  { error: "사용자를 확인하지 못했습니다." },
  { status: 401 }
);

/** data URL 을 업로드 가능한 File 로 바꾼다. */
function dataUrlToFile(dataUrl: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1] ?? "jpg";
  return new File([Buffer.from(base64, "base64")], `photo.${ext}`, { type: mime });
}

/** GET /api/plants — 내 식물 목록 */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return UNAUTHORIZED;

  const { data, error } = await supabaseServer
    .from("plants")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[plants:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

type CreateBody = {
  result?: IdentifyResult;
  /** 판별에 쓴 사진 data URL */
  photo?: string;
};

/** POST /api/plants — 판별 결과를 내 식물로 등록 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return UNAUTHORIZED;

    const { result, photo }: CreateBody = await req.json();

    if (!result) {
      return NextResponse.json(
        { error: "등록에 필요한 정보가 없습니다." },
        { status: 400 }
      );
    }

    let photoUrl: string | null = null;
    if (photo) {
      try {
        photoUrl = await uploadPhoto(dataUrlToFile(photo), userId);
      } catch (e) {
        // 사진 저장에 실패해도 등록 자체는 막지 않는다
        console.warn("[plants:POST] 사진 저장 실패, 사진 없이 등록합니다.", e);
      }
    }

    const { data, error } = await supabaseServer
      .from("plants")
      .insert({
        user_id: userId,
        species: result.koreanName,
        photo_url: photoUrl,
        // 판별이 0 을 주면 물주기 계산이 깨지므로 무난한 값으로 막는다
        water_interval: result.waterIntervalDays > 0 ? result.waterIntervalDays : 7,
      })
      .select()
      .single();

    if (error) {
      console.error("[plants:POST]", error.code, error.message, error.details);
      return NextResponse.json(
        { error: "등록하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[plants:POST]", e);
    return NextResponse.json({ error: "등록하지 못했습니다." }, { status: 500 });
  }
}
