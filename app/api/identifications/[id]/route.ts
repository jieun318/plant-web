import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";

/** GET /api/identifications/[id] — 판별 기록 하나 */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/identifications/[id]">
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;

  // user_id 를 조건에 넣어야 남의 기록을 id 만으로 열어볼 수 없다
  const { data, error } = await supabaseServer
    .from("identifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[identification:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "판별 결과를 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  if (!data) {
    // 최근 10건을 넘겨 지워졌을 수도 있다
    return NextResponse.json(
      { error: "판별 기록이 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
