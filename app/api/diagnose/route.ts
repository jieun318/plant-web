import { NextResponse } from "next/server";

// TODO: S-03 증상 진단 문답에서 구현한다.
export async function POST() {
  return NextResponse.json(
    { error: "아직 준비 중인 기능입니다." },
    { status: 501 }
  );
}
