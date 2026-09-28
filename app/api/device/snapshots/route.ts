import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, cleanMeasuredAt } from "@/lib/device";
import { imageMimeType, withImageType } from "@/lib/image";
import { supabaseServer, uploadPhoto } from "@/lib/supabase-server";

// 기기가 올리는 사진 크기 (5MB). 파이 카메라 사진은 보통 이보다 작다.
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/device/snapshots — 기기가 보내는 사진
 *
 * Authorization: Bearer <기기 토큰>
 * multipart/form-data: photo=<파일>, capturedAt=2026-09-28T01:00:00Z
 *
 * 같은 기기의 같은 시각은 한 줄만 남는다. 재전송하면 사진만 새로 올라가고
 * 기록은 처음 것이 유지된다.
 */
export async function POST(req: NextRequest) {
  try {
    const device = await authenticateDevice(req);
    if (!device) {
      return NextResponse.json({ error: "기기를 확인하지 못했습니다." }, { status: 401 });
    }

    const form = await req.formData();
    const raw = form.get("photo");
    const capturedAt = cleanMeasuredAt(form.get("capturedAt"));

    if (!(raw instanceof File)) {
      return NextResponse.json({ error: "사진이 없습니다." }, { status: 400 });
    }

    if (!capturedAt) {
      return NextResponse.json({ error: "촬영 시각이 올바르지 않습니다." }, { status: 400 });
    }

    const mime = imageMimeType(raw);
    if (!mime) {
      return NextResponse.json({ error: "이미지 파일만 올릴 수 있습니다." }, { status: 400 });
    }

    if (raw.size > MAX_SIZE) {
      return NextResponse.json({ error: "5MB 이하 사진만 올릴 수 있습니다." }, { status: 400 });
    }

    // 식물 사진과 섞이지 않게 기기별 폴더에 둔다
    const photoUrl = await uploadPhoto(withImageType(raw, mime), `${device.user_id}/${device.id}`);

    const { error } = await supabaseServer
      .from("plant_snapshots")
      .upsert(
        {
          device_id: device.id,
          plant_id: device.plant_id,
          photo_url: photoUrl,
          captured_at: capturedAt,
        },
        { onConflict: "device_id,captured_at", ignoreDuplicates: true }
      );

    if (error) {
      console.error("[device:snapshots]", error.code, error.message, error.details);
      return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, photoUrl }, { status: 201 });
  } catch (e) {
    console.error("[device:snapshots]", e);
    return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
  }
}
