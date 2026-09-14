import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";

/** GET /api/plants/[id] — 식물 하나와 그 기록 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/plants/[id]">) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;

  // user_id 를 조건에 넣어야 남의 식물을 id 만으로 열어볼 수 없다
  const { data: plant, error } = await supabaseServer
    .from("plants")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[plant:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "식물을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  if (!plant) {
    return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
  }

  const { data: logs, error: logError } = await supabaseServer
    .from("care_logs")
    .select("*")
    .eq("plant_id", id)
    .order("created_at", { ascending: false });

  if (logError) {
    console.error("[plant:GET logs]", logError.code, logError.message);
  }

  return NextResponse.json({ plant, logs: logs ?? [] });
}
