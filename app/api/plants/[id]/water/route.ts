import { NextRequest, NextResponse } from "next/server";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import {
  EARLY_WARN_DAYS,
  daysUntilWater,
  earlyWaterMemo,
  todaysWaterLog,
} from "@/lib/water";
import type { CareLog, Plant } from "@/types";

const UNAUTHORIZED = NextResponse.json(
  { error: "사용자를 확인하지 못했습니다." },
  { status: 401 }
);

const NOT_FOUND = NextResponse.json(
  { error: "없는 식물입니다." },
  { status: 404 }
);

/** user_id 를 조건에 넣어야 남의 식물을 건드릴 수 없다. */
async function loadPlant(id: string, userId: string) {
  const { data } = await supabaseServer
    .from("plants")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<Plant>();

  return data;
}

/** 최근 물주기 기록부터. 오늘 줬는지 판단하고 취소할 때 되돌릴 날짜를 찾는다. */
async function waterLogs(plantId: string) {
  const { data } = await supabaseServer
    .from("care_logs")
    .select("*")
    .eq("plant_id", plantId)
    .eq("type", "water")
    .order("created_at", { ascending: false });

  return (data ?? []) as CareLog[];
}

/**
 * POST /api/plants/[id]/water — 물 줬어요
 *
 * 그냥 쌓지 않는다. 과습이 이 서비스가 막으려는 문제라서
 * (1) 같은 날 두 번은 기록하지 않고
 * (2) 예정일보다 한참 이르면 한 번 되묻는다.
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/plants/[id]/water">
) {
  const userId = await getUserId(req);
  if (!userId) return UNAUTHORIZED;

  const { id } = await ctx.params;

  // 본문이 비어 있을 수 있다. 확인 단계를 거친 요청만 force 를 달고 온다.
  const { force = false } = await req.json().catch(() => ({ force: false }));

  const plant = await loadPlant(id, userId);
  if (!plant) return NOT_FOUND;

  const logs = await waterLogs(id);

  // (1) 오늘 이미 줬다. 아무것도 쓰지 않고 지금 상태만 알려준다.
  const today = todaysWaterLog(logs);
  if (today) {
    return NextResponse.json({ plant, log: null, already: true });
  }

  // (2) 아직 줄 때가 아니다. 사용자가 확인하기 전에는 쓰지 않는다.
  const daysLeft = daysUntilWater(plant);
  if (daysLeft >= EARLY_WARN_DAYS && !force) {
    return NextResponse.json({ needsConfirm: true, daysLeft });
  }

  const now = new Date().toISOString();

  const { data: updated, error } = await supabaseServer
    .from("plants")
    .update({ last_watered: now })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle<Plant>();

  if (error || !updated) {
    console.error("[water]", error?.code, error?.message, error?.details);
    return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
  }

  const { data: log, error: logError } = await supabaseServer
    .from("care_logs")
    .insert({
      plant_id: id,
      type: "water",
      // 이른 물주기는 나중에 세어야 하므로 기록에 남긴다
      memo: daysLeft > 0 ? earlyWaterMemo(daysLeft) : null,
    })
    .select()
    .single();

  if (logError) {
    // 물주기 날짜는 이미 갱신됐다. 기록 한 줄 때문에 실패로 돌려보내지 않는다.
    console.error("[water:log]", logError.code, logError.message);
  }

  return NextResponse.json({ plant: updated, log: log ?? null });
}

/**
 * DELETE /api/plants/[id]/water — 오늘 기록 취소
 *
 * 실수로 눌렀을 때를 위한 것이다. 오늘 기록만 지우고
 * last_watered 는 그 전에 물 준 날로 되돌린다.
 */
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/plants/[id]/water">
) {
  const userId = await getUserId(req);
  if (!userId) return UNAUTHORIZED;

  const { id } = await ctx.params;

  const plant = await loadPlant(id, userId);
  if (!plant) return NOT_FOUND;

  const logs = await waterLogs(id);
  const today = todaysWaterLog(logs);

  if (!today) {
    return NextResponse.json({ error: "취소할 기록이 없습니다." }, { status: 400 });
  }

  const { error: deleteError } = await supabaseServer
    .from("care_logs")
    .delete()
    .eq("id", today.id);

  if (deleteError) {
    console.error("[water:cancel]", deleteError.code, deleteError.message);
    return NextResponse.json({ error: "취소하지 못했습니다." }, { status: 500 });
  }

  // 오늘 기록을 뺀 나머지 중 가장 최근 물주기. 한 번도 없으면 null 로 돌아간다.
  const previous = logs.find((log) => log.id !== today.id);

  const { data: updated, error } = await supabaseServer
    .from("plants")
    .update({ last_watered: previous?.created_at ?? null })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle<Plant>();

  if (error || !updated) {
    console.error("[water:cancel]", error?.code, error?.message);
    return NextResponse.json({ error: "취소하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ plant: updated, removedLogId: today.id });
}
