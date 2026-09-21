import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";

/** GET /api/plants/[id]/diagnoses/[diagnosisId] — 지난 진단 하나 */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/plants/[id]/diagnoses/[diagnosisId]">
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { id, diagnosisId } = await ctx.params;

  // diagnoses 에는 user_id 가 없다. 식물이 내 것인지 먼저 본다.
  const { data: plant } = await supabaseServer
    .from("plants")
    .select("id, species, nickname")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!plant) {
    return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
  }

  const { data: diagnosis, error } = await supabaseServer
    .from("diagnoses")
    .select("*")
    .eq("id", diagnosisId)
    .eq("plant_id", id)
    .maybeSingle();

  if (error) {
    console.error("[diagnosis:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "진단 기록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  if (!diagnosis) {
    return NextResponse.json({ error: "없는 진단 기록입니다." }, { status: 404 });
  }

  return NextResponse.json({ plant, diagnosis });
}
