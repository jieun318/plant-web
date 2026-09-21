import { NextRequest, NextResponse } from "next/server";
import { buildGuide } from "@/lib/gemini";
import { getUserId, supabaseServer } from "@/lib/supabase-server";
import { daysSinceRegistered } from "@/lib/water";
import type { CareGuide, GuideTopic, Plant } from "@/types";

const TOPICS: GuideTopic[] = ["water", "light", "repot", "fertilize"];

function isTopic(value: string | null): value is GuideTopic {
  return TOPICS.includes(value as GuideTopic);
}

/**
 * GET /api/plants/[id]/guide?topic=water
 *
 * 만들어 둔 가이드가 있으면 그것을 주고, 없을 때만 Gemini 를 부른다.
 * 가이드는 잘 바뀌지 않으므로 식물마다 탭마다 한 번만 만든다.
 */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/plants/[id]/guide">
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "사용자를 확인하지 못했습니다." },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const topic = req.nextUrl.searchParams.get("topic");

    if (!isTopic(topic)) {
      return NextResponse.json(
        { error: "어떤 관리법인지 알 수 없습니다." },
        { status: 400 }
      );
    }

    // user_id 를 조건에 넣어야 남의 식물 가이드를 만들 수 없다
    const { data: plant } = await supabaseServer
      .from("plants")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle<Plant>();

    if (!plant) {
      return NextResponse.json({ error: "없는 식물입니다." }, { status: 404 });
    }

    const { data: cached } = await supabaseServer
      .from("guides")
      .select("*")
      .eq("plant_id", id)
      .eq("topic", topic)
      .maybeSingle<CareGuide>();

    if (cached) return NextResponse.json(cached);

    const content = await buildGuide({
      species: plant.species,
      scientificName: plant.scientific_name,
      location: plant.location,
      days: daysSinceRegistered(plant),
      topic,
    });

    const { data, error } = await supabaseServer
      .from("guides")
      .upsert(
        {
          plant_id: id,
          topic,
          when_to: content.when,
          steps: content.steps,
          caution: content.caution,
        },
        { onConflict: "plant_id,topic" }
      )
      .select()
      .single();

    if (error) {
      console.error("[guide:GET]", error.code, error.message, error.details);
      // 저장에 실패해도 방금 만든 내용은 보여준다
      return NextResponse.json({
        plant_id: id,
        topic,
        when_to: content.when,
        steps: content.steps,
        caution: content.caution,
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[guide:GET]", e);
    return NextResponse.json(
      { error: "가이드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
