import { NextRequest, NextResponse } from "next/server";
import { createDeviceToken, hashDeviceToken } from "@/lib/device";
import { cleanText } from "@/lib/plant";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import type { Device } from "@/types";

const NAME_MAX = 20;

const UNAUTHORIZED = NextResponse.json(
  { error: "사용자를 확인하지 못했습니다." },
  { status: 401 }
);

/** 식물이 내 것인지 확인한다. 남의 식물에 기기를 붙일 수 없다. */
async function ownsPlant(id: string, userId: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from("plants")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

/** 기기 이름. 안 주면 식물마다 구분되게 만들어 준다. */
function deviceName(value: unknown, plantId: string): string {
  return cleanText(value, NAME_MAX) ?? `plant-${plantId.slice(0, 4)}`;
}

/**
 * POST /api/plants/[id]/device — 기기 연결 (토큰 발급)
 *
 * 이미 연결돼 있으면 새 토큰으로 바꾼다 (새 코드 발급).
 * 토큰 원문은 이 응답에서 한 번만 준다. 서버에는 해시만 남는다.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/plants/[id]/device">) {
  try {
    const userId = await getUserId(req);
    if (!userId) return UNAUTHORIZED;

    const { id } = await ctx.params;
    if (!(await ownsPlant(id, userId))) {
      return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const token = createDeviceToken();

    const { data, error } = await supabaseServer
      .from("devices")
      .upsert(
        {
          user_id: userId,
          plant_id: id,
          name: deviceName(body.name, id),
          token_hash: hashDeviceToken(token),
          // 새 코드를 발급하면 아직 이 토큰으로 온 기록이 없다
          last_seen_at: null,
        },
        { onConflict: "plant_id" }
      )
      // 토큰 해시는 돌려주지 않는다. 화면에 나가는 것은 아래 token 하나뿐이다.
      .select("id, user_id, plant_id, name, last_seen_at, created_at")
      .single<Device>();

    if (error) {
      console.error("[device:issue]", error.code, error.message, error.details);
      return NextResponse.json({ error: "기기를 연결하지 못했습니다." }, { status: 500 });
    }

    // token 은 여기서만 나간다. 화면은 이 값을 한 번 보여주고 버린다.
    return NextResponse.json({ device: data, token }, { status: 201 });
  } catch (e) {
    console.error("[device:issue]", e);
    return NextResponse.json({ error: "기기를 연결하지 못했습니다." }, { status: 500 });
  }
}

/**
 * DELETE /api/plants/[id]/device — 기기 연결 해제
 *
 * 지금까지 쌓인 온습도와 사진은 그대로 둔다 (기록의 device_id 만 비워진다).
 * 관찰일지는 남아야 한다. 토큰이 무효가 되므로 기기는 더 이상 기록을 보낼 수 없다.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/plants/[id]/device">) {
  const userId = await getUserId(req);
  if (!userId) return UNAUTHORIZED;

  const { id } = await ctx.params;

  const { error } = await supabaseServer
    .from("devices")
    .delete()
    .eq("plant_id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[device:unlink]", error.code, error.message);
    return NextResponse.json({ error: "연결을 해제하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
