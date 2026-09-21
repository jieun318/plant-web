import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type { Identification } from "@/types";

/**
 * GET /api/identifications — 아직 등록하지 않은 판별 기록
 *
 * "최근 본 식물"에 쓴다. 이미 내 식물이 된 것은 목록에 또 나올 필요가 없다.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "사용자를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseServer
    .from("identifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[identifications:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "최근 본 식물을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const { data: plants, error: plantError } = await supabaseServer
    .from("plants")
    .select("identification_id")
    .eq("user_id", userId)
    .not("identification_id", "is", null);

  if (plantError) {
    console.error("[identifications:GET plants]", plantError.code, plantError.message);
    return NextResponse.json(
      { error: "최근 본 식물을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const registered = new Set((plants ?? []).map((p) => p.identification_id));

  return NextResponse.json(
    ((data ?? []) as Identification[]).filter((row) => !registered.has(row.id))
  );
}
