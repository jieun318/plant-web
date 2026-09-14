import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";

/**
 * POST /api/plants/[id]/water — 물 줬어요
 * last_watered 갱신과 care_logs 추가가 함께 일어난다.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/plants/[id]/water">) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const now = new Date().toISOString();

  // user_id 조건이 곧 소유 확인이다. 남의 식물이면 갱신되는 행이 없다.
  const { data: plant, error } = await supabaseServer
    .from("plants")
    .update({ last_watered: now })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[water]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "기록하지 못했습니다." },
      { status: 500 }
    );
  }

  if (!plant) {
    return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
  }

  const { data: log, error: logError } = await supabaseServer
    .from("care_logs")
    .insert({ plant_id: id, type: "water" })
    .select()
    .single();

  if (logError) {
    // 물주기 날짜는 이미 갱신됐다. 기록 한 줄 때문에 실패로 돌려보내지 않는다.
    console.error("[water:log]", logError.code, logError.message);
  }

  return NextResponse.json({ plant, log: log ?? null });
}
