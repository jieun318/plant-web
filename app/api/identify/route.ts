import { NextRequest, NextResponse } from "next/server";
import { identifyPlant } from "@/lib/gemini";
import { toIdentificationRow } from "@/lib/identification";
import { getUserId, supabaseServer, uploadPhoto } from "@/lib/supabase-server";
import type { IdentifyResult } from "@/types";

// 업로드 허용 용량 (10MB)
const MAX_SIZE = 10 * 1024 * 1024;

// 사용자당 남겨두는 판별 기록 수
const KEEP = 10;

/**
 * 판별 결과를 남기고 id 를 돌려준다.
 * 저장에 실패해도 판별 자체는 성공이므로 null 을 주고 넘어간다.
 */
async function save(
  userId: string,
  result: IdentifyResult,
  file: File
): Promise<{ id: string; photoUrl: string | null } | null> {
  let photoUrl: string | null = null;

  try {
    photoUrl = await uploadPhoto(file, userId);
  } catch (e) {
    // 사진을 못 올려도 판별 내용은 남긴다
    console.warn("[identify] 사진 저장 실패", e);
  }

  const { data, error } = await supabaseServer
    .from("identifications")
    .insert(toIdentificationRow(result, userId, photoUrl))
    .select("id")
    .single();

  if (error || !data) {
    console.error("[identify:save]", error?.code, error?.message, error?.details);
    return null;
  }

  await trim(userId);

  return { id: data.id, photoUrl };
}

/** 최근 KEEP 건만 남기고 오래된 것부터 지운다. */
async function trim(userId: string) {
  const { data, error } = await supabaseServer
    .from("identifications")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(KEEP, KEEP + 50);

  if (error || !data?.length) return;

  // 사진은 지우지 않는다. 이 판별로 등록한 식물이 같은 사진을 보고 있다.
  const { error: deleteError } = await supabaseServer
    .from("identifications")
    .delete()
    .in("id", data.map((row) => row.id));

  if (deleteError) {
    console.warn("[identify:trim]", deleteError.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "사진이 없습니다." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 올릴 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "10MB 이하 사진만 올릴 수 있습니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const result = await identifyPlant(base64, file.type);

    // 토큰 없이도 판별은 된다. 그때는 남기지 못하니 id 가 없다.
    // 판별 실패는 다시 찍으라고 안내하고 끝이므로 남기지 않는다.
    const userId = await getUserId(req);
    const saved = userId && result.confident ? await save(userId, result, file) : null;

    return NextResponse.json({
      ...result,
      id: saved?.id ?? null,
      photoUrl: saved?.photoUrl ?? null,
    });
  } catch (e) {
    // 개발 중에는 터미널에서 원인을 봐야 하므로 그대로 찍는다
    console.error("[identify]", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "판별에 실패했습니다." },
      { status: 500 }
    );
  }
}
