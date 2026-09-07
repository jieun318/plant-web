import { NextRequest, NextResponse } from "next/server";
import { identifyPlant } from "@/lib/gemini";

// 업로드 허용 용량 (10MB)
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "사진이 없습니다." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 올릴 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "10MB 이하 사진만 올릴 수 있습니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const result = await identifyPlant(base64, file.type);

    return NextResponse.json(result);
  } catch (e) {
    // 개발 중에는 터미널에서 원인을 봐야 하므로 그대로 찍는다
    console.error("[identify]", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "판별에 실패했습니다." },
      { status: 500 }
    );
  }
}