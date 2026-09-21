import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";

/** GET /api/account — 계정 설정 요약 카드에 쓰는 숫자 */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { data: plants, error } = await supabaseServer
    .from("plants")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    console.error("[account:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const plantIds = (plants ?? []).map((p) => p.id);

  // diagnoses 에는 user_id 가 없다. 내 식물 id 로 센다.
  let diagnoses = 0;
  if (plantIds.length > 0) {
    const { count, error: countError } = await supabaseServer
      .from("diagnoses")
      .select("id", { count: "exact", head: true })
      .in("plant_id", plantIds);

    if (countError) {
      console.error("[account:GET diagnoses]", countError.code, countError.message);
    }
    diagnoses = count ?? 0;
  }

  return NextResponse.json({ plants: plantIds.length, diagnoses });
}
