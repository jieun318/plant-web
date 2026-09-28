import { NextRequest, NextResponse } from "next/server";

import { dateKeyDaysAgo, toDateKey } from "@/lib/observation";
import { MAX_DAYS, observePlant, type ObserveResult } from "@/lib/observe";
import { getUserId, supabaseServer } from "@/lib/supabase-server";

import type { Plant } from "@/types";

/**
 * Vercel Cron 이 보낸 요청인지. 배포에서는 CRON_SECRET 을 반드시 설정한다.
 * (Vercel 이 Authorization: Bearer <CRON_SECRET> 을 붙여 보낸다)
 */
function isCron(req: NextRequest): boolean {
  const header = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && header === `Bearer ${secret}`) return true;

  // 로컬 스크립트(npm run observe)용. 서비스 롤 키는 이미 그 PC 에 있는 값이고,
  // 배포에서는 이 길을 열지 않는다.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return (
    process.env.NODE_ENV !== "production" && Boolean(key) && header === `Bearer ${key}`
  );
}

/**
 * POST /api/cron/observe — 하루 1회 관찰 만들기
 *
 * 배포: Vercel Cron 이 매일 오전 11시(한국 시간)에 부른다. 모든 식물을 돈다.
 * 로컬: 관찰일지의 개발용 버튼이 { plantId } 로 부른다. 그 식물만 만든다.
 *
 * body: { plantId?, date?: "YYYY-MM-DD", days?: 1~14 }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plantId: string | undefined = body.plantId;
    const days = Math.min(Math.max(Number(body.days) || 1, 1), MAX_DAYS);
    const lastDate: string = body.date ?? toDateKey(new Date());

    // 크론이 아니면, 개발 중에 자기 식물 하나만 만드는 경우만 허용한다
    if (!isCron(req)) {
      const userId = await getUserId(req);
      const allowed = process.env.NODE_ENV !== "production" && userId && plantId;

      if (!allowed) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
      }

      const { data: mine } = await supabaseServer
        .from("plants")
        .select("id")
        .eq("id", plantId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!mine) {
        return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
      }
    }

    const query = supabaseServer.from("plants").select("*");
    const { data: plants } = plantId
      ? await query.eq("id", plantId).returns<Plant[]>()
      : await query.returns<Plant[]>();

    if (!plants?.length) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // 날짜는 오래된 것부터. 연속 이탈을 세려면 앞 날이 먼저 있어야 한다.
    const dates = Array.from({ length: days }, (_, i) =>
      dateKeyDaysAgo(days - 1 - i, new Date(`${lastDate}T00:00:00Z`))
    );

    const results: ObserveResult[] = [];

    for (const plant of plants) {
      for (const date of dates) {
        results.push(await observePlant(plant, date));
      }
    }

    const made = results.filter((r) => !r.skipped).length;
    console.log(`[observe] ${made}/${results.length}건 생성`);

    return NextResponse.json({ ok: true, made, results });
  } catch (e) {
    console.error("[observe]", e);
    return NextResponse.json({ error: "관찰을 만들지 못했습니다." }, { status: 500 });
  }
}
