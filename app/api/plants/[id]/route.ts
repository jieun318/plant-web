import { NextRequest, NextResponse } from "next/server";
import { LOCATION_MAX, NICKNAME_MAX, cleanText } from "@/lib/plant";
import { getUserId, removePhotos, supabaseServer } from "@/lib/supabase-server";

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

/**
 * PATCH /api/plants/[id] — 별명과 두는 곳 수정
 *
 * 두는 곳이 바뀌면 만들어 둔 가이드를 지운다. 가이드는 두는 곳을 보고 만든 것이라
 * 그대로 두면 창가에서 욕실로 옮겨도 창가 기준 안내가 계속 나온다.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/plants/[id]">) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "사용자를 확인하지 못했습니다." },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const { data: before } = await supabaseServer
      .from("plants")
      .select("location")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!before) {
      return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
    }

    const nickname = cleanText(body.nickname, NICKNAME_MAX);
    const location = cleanText(body.location, LOCATION_MAX);

    const { data: plant, error } = await supabaseServer
      .from("plants")
      .update({ nickname, location })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[plant:PATCH]", error.code, error.message, error.details);
      return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
    }

    if (before.location !== location) {
      const { error: guideError } = await supabaseServer
        .from("guides")
        .delete()
        .eq("plant_id", id);

      if (guideError) {
        console.error("[plant:PATCH guides]", guideError.code, guideError.message);
      }
    }

    return NextResponse.json(plant);
  } catch (e) {
    console.error("[plant:PATCH]", e);
    return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}

/**
 * DELETE /api/plants/[id] — 식물과 그 기록, 사진을 모두 지운다
 *
 * 외래키 cascade 에 기대지 않고 하나씩 지운다. 테이블이 대시보드에서 만들어져
 * cascade 가 걸려 있는지 코드만 봐서는 알 수 없다.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/plants/[id]">) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "사용자를 확인하지 못했습니다." },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;

    const { data: plant } = await supabaseServer
      .from("plants")
      .select("id, photo_url, identification_id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!plant) {
      return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
    }

    // 예전에 같은 판별로 두 번 등록한 식물은 사진과 판별 기록을 같이 쓴다. 그때는 남긴다.
    const { count: sharing } = plant.photo_url
      ? await supabaseServer
          .from("plants")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("photo_url", plant.photo_url)
          .neq("id", id)
      : { count: 0 };
    const shared = (sharing ?? 0) > 0;

    for (const table of ["guides", "diagnoses", "care_logs"] as const) {
      const { error } = await supabaseServer.from(table).delete().eq("plant_id", id);
      if (error) {
        console.error(`[plant:DELETE ${table}]`, error.code, error.message);
        return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
      }
    }

    const { error } = await supabaseServer
      .from("plants")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[plant:DELETE]", error.code, error.message, error.details);
      return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
    }

    if (!shared) {
      // 등록할 때 쓴 판별 기록. 사진이 곧 지워지므로 남겨두면 "최근 본 식물"에 빈 사진으로 뜬다.
      if (plant.identification_id) {
        const { error: idError } = await supabaseServer
          .from("identifications")
          .delete()
          .eq("id", plant.identification_id)
          .eq("user_id", userId);

        if (idError) console.warn("[plant:DELETE identification]", idError.message);
      }

      if (plant.photo_url) await removePhotos([plant.photo_url]);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plant:DELETE]", e);
    return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  }
}
