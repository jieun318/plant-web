import { NextRequest, NextResponse } from "next/server";
import {
  HUMIDITY_LIMIT,
  TEMP_LIMIT,
  authenticateDevice,
  cleanMeasuredAt,
  cleanMeasurement,
} from "@/lib/device";
import { supabaseServer } from "@/lib/supabase-server";

// 한 번에 받는 최대 개수. 기기가 네트워크 복구 후 밀린 것을 몰아 보낼 때 쓴다.
const MAX_BATCH = 300;

type Body = {
  temperature?: unknown;
  humidity?: unknown;
  measuredAt?: unknown;
  /** 밀린 측정을 몰아 보낼 때 */
  readings?: Body[];
};

type Row = {
  device_id: string;
  plant_id: string;
  temperature: number;
  humidity: number;
  measured_at: string;
};

/**
 * POST /api/device/readings — 기기가 보내는 온습도
 *
 * Authorization: Bearer <기기 토큰>
 * { "temperature": 24, "humidity": 31, "measuredAt": "2026-09-28T01:00:00Z" }
 * 또는 { "readings": [ … ] } 로 밀린 것을 몰아 보낸다.
 *
 * 같은 기기의 같은 시각은 한 줄만 남는다 (재전송해도 중복되지 않는다).
 */
export async function POST(req: NextRequest) {
  try {
    const device = await authenticateDevice(req);
    if (!device) {
      return NextResponse.json({ error: "기기를 확인하지 못했습니다." }, { status: 401 });
    }

    const body: Body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.readings) ? body.readings : [body];

    if (items.length === 0 || items.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `한 번에 1~${MAX_BATCH}건까지 보낼 수 있습니다.` },
        { status: 400 }
      );
    }

    const rows: Row[] = [];

    for (const item of items) {
      const temperature = cleanMeasurement(item?.temperature, TEMP_LIMIT);
      const humidity = cleanMeasurement(item?.humidity, HUMIDITY_LIMIT);
      const measuredAt = cleanMeasuredAt(item?.measuredAt);

      // 센서가 튀거나 시계가 어긋난 줄은 버리고 나머지는 받는다.
      // 한 줄 때문에 기기가 밀린 기록 전체를 다시 보내게 만들지 않는다.
      if (temperature === null || humidity === null || !measuredAt) continue;

      rows.push({
        device_id: device.id,
        plant_id: device.plant_id,
        temperature,
        humidity,
        measured_at: measuredAt,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "받을 수 있는 측정값이 없습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("sensor_readings")
      .upsert(rows, { onConflict: "device_id,measured_at", ignoreDuplicates: true });

    if (error) {
      console.error("[device:readings]", error.code, error.message, error.details);
      return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, accepted: rows.length, skipped: items.length - rows.length });
  } catch (e) {
    console.error("[device:readings]", e);
    return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
  }
}
