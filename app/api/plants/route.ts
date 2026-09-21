import { NextRequest, NextResponse } from "next/server";
import { toPlantSpecies } from "@/lib/identification";
import { getUserId, supabaseServer, uploadPhoto } from "@/lib/supabase-server";
import type { Identification, IdentifyResult } from "@/types";

const UNAUTHORIZED = NextResponse.json(
  { error: "사용자를 확인하지 못했습니다." },
  { status: 401 }
);

/** 판별이 0 을 주면 물주기 계산이 깨지므로 무난한 값으로 막는다. */
function waterInterval(days: number | null | undefined): number {
  return days && days > 0 ? days : 7;
}

/** data URL 을 업로드 가능한 File 로 바꾼다. */
function dataUrlToFile(dataUrl: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1] ?? "jpg";
  return new File([Buffer.from(base64, "base64")], `photo.${ext}`, { type: mime });
}

/** GET /api/plants — 내 식물 목록 */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return UNAUTHORIZED;

  const { data, error } = await supabaseServer
    .from("plants")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[plants:GET]", error.code, error.message, error.details);
    return NextResponse.json(
      { error: "목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

type CreateBody = {
  /** 판별 기록 id. 사진과 종 정보를 서버가 그 기록에서 복사한다. */
  identificationId?: string;
  /** 기록을 남기지 못한 경우에만 쓴다 (세션 없이 판별) */
  result?: IdentifyResult;
  /** 판별에 쓴 사진 data URL */
  photo?: string;
};

/** plants 에 넣을 한 줄. 두 경로가 같은 모양을 만들어야 한다. */
type PlantInsert = {
  user_id: string;
  species: string;
  scientific_name: string | null;
  difficulty: string | null;
  origin: string | null;
  light: string | null;
  water: string | null;
  humidity: string | null;
  repot: string | null;
  photo_url: string | null;
  water_interval: number;
  identification_id: string | null;
};

/** 판별 기록을 그대로 복사해 등록한다. */
async function fromIdentification(
  userId: string,
  identificationId: string
): Promise<PlantInsert | null> {
  const { data: record } = await supabaseServer
    .from("identifications")
    .select("*")
    .eq("id", identificationId)
    .eq("user_id", userId)
    .maybeSingle<Identification>();

  if (!record) return null;

  return {
    user_id: userId,
    ...toPlantSpecies(record),
    // 판별할 때 올려둔 사진을 다시 쓴다. 같은 사진을 두 번 올리지 않는다.
    photo_url: record.photo_url,
    water_interval: waterInterval(record.water_interval_days),
    identification_id: record.id,
  };
}

/** 기록이 없을 때. 사진을 여기서 올리고 종 이름만 남긴다. */
async function fromResult(
  userId: string,
  result: IdentifyResult,
  photo?: string
): Promise<PlantInsert> {
  let photoUrl: string | null = null;

  if (photo) {
    try {
      photoUrl = await uploadPhoto(dataUrlToFile(photo), userId);
    } catch (e) {
      // 사진 저장에 실패해도 등록 자체는 막지 않는다
      console.warn("[plants:POST] 사진 저장 실패, 사진 없이 등록합니다.", e);
    }
  }

  return {
    user_id: userId,
    species: result.koreanName,
    scientific_name: result.scientificName,
    difficulty: result.difficulty,
    origin: result.origin,
    light: result.light,
    water: result.water,
    humidity: result.humidity,
    repot: result.repot,
    photo_url: photoUrl,
    water_interval: waterInterval(result.waterIntervalDays),
    identification_id: null,
  };
}

/** POST /api/plants — 판별 결과를 내 식물로 등록 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return UNAUTHORIZED;

    const { identificationId, result, photo }: CreateBody = await req.json();

    const row = identificationId
      ? await fromIdentification(userId, identificationId)
      : result
        ? await fromResult(userId, result, photo)
        : null;

    if (!row) {
      return NextResponse.json(
        { error: "등록에 필요한 정보가 없습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("plants")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("[plants:POST]", error.code, error.message, error.details);
      return NextResponse.json(
        { error: "등록하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[plants:POST]", e);
    return NextResponse.json({ error: "등록하지 못했습니다." }, { status: 500 });
  }
}
