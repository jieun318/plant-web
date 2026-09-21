import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type { DiagnosisAnswer, DiagnosisResult } from "@/types";

type Body = {
  result?: DiagnosisResult;
  answers?: DiagnosisAnswer[];
};

/**
 * POST /api/plants/[id]/diagnose — 진단 결과를 기록에 저장한다.
 * diagnoses 에 이력을 남기고, 진단에 맞춰 물주기 간격을 갱신한다.
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/plants/[id]/diagnose">
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "사용자를 확인하지 못했습니다." },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const { result, answers = [] }: Body = await req.json();

    if (!result) {
      return NextResponse.json(
        { error: "저장할 진단 결과가 없습니다." },
        { status: 400 }
      );
    }

    const { data: plant } = await supabaseServer
      .from("plants")
      .select("id, photo_url")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!plant) {
      return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
    }

    const { error } = await supabaseServer.from("diagnoses").insert({
      plant_id: id,
      cause: result.cause,
      title: result.title,
      reasons: result.reasons,
      actions: result.actions,
      answers,
      photo_url: plant.photo_url,
    });

    if (error) {
      console.error("[diagnose:save]", error.code, error.message, error.details);
      return NextResponse.json(
        { error: "저장하지 못했습니다." },
        { status: 500 }
      );
    }

    // 진단 결과에 맞게 물주기 간격을 바꾼다
    if (result.waterIntervalDays > 0) {
      const { error: updateError } = await supabaseServer
        .from("plants")
        .update({ water_interval: result.waterIntervalDays })
        .eq("id", id)
        .eq("user_id", userId);

      if (updateError) {
        console.error("[diagnose:interval]", updateError.code, updateError.message);
      }
    }

    // 상세 화면 타임라인에 남기려고 기록도 한 줄 추가한다
    const { error: logError } = await supabaseServer
      .from("care_logs")
      .insert({ plant_id: id, type: "diagnose", memo: result.cause });

    if (logError) {
      console.error("[diagnose:log]", logError.code, logError.message);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("[diagnose:save]", e);
    return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}
