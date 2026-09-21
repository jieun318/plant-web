import { NextRequest, NextResponse } from "next/server";
import { askDiagnosisQuestion, concludeDiagnosis, type Photo } from "@/lib/gemini";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type { DiagnosisAnswer } from "@/types";

// 명세: 질문은 최대 3개. 그 이상 묻지 않는다.
const MAX_QUESTIONS = 3;

/** 등록 사진을 받아 Gemini 에 넘길 수 있는 형태로 바꾼다. */
async function loadPhoto(url: string | null): Promise<Photo | null> {
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      base64: buffer.toString("base64"),
      mimeType: res.headers.get("content-type") ?? "image/jpeg",
    };
  } catch {
    // 사진을 못 읽어도 문답은 이어갈 수 있다
    return null;
  }
}

type Body = {
  plantId?: string;
  answers?: DiagnosisAnswer[];
};

/**
 * POST /api/diagnose
 * 답변이 3개 미만이면 다음 질문을, 다 모이면 결론을 돌려준다.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "사용자를 확인하지 못했습니다." },
        { status: 401 }
      );
    }

    const { plantId, answers = [] }: Body = await req.json();

    if (!plantId) {
      return NextResponse.json(
        { error: "어떤 식물인지 알 수 없습니다." },
        { status: 400 }
      );
    }

    const { data: plant } = await supabaseServer
      .from("plants")
      .select("species, photo_url")
      .eq("id", plantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!plant) {
      return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
    }

    const photo = await loadPhoto(plant.photo_url);

    if (answers.length < MAX_QUESTIONS) {
      const question = await askDiagnosisQuestion(plant.species, answers, photo);
      return NextResponse.json({ done: false, question });
    }

    const result = await concludeDiagnosis(plant.species, answers, photo);
    return NextResponse.json({ done: true, result, photoUrl: plant.photo_url });
  } catch (e) {
    console.error("[diagnose]", e);
    return NextResponse.json(
      { error: "진단하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
