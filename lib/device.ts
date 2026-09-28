import { createHash, randomBytes } from "node:crypto";
import { supabaseServer } from "./supabase-server";
import type { Device } from "@/types";

// 기기 인증. 서버에서만 import 할 것.
//
// 라즈베리파이에는 서비스 롤 키를 넣지 않는다. 기기마다 토큰을 발급하고
// 기기는 그 토큰만 들고 온다. 토큰이 새면 그 식물의 기록만 영향을 받는다.
//
// 토큰 원문은 어디에도 남기지 않는다. 발급 화면에서 한 번만 보여주고,
// DB 에는 해시만 저장한다. 잃어버리면 새로 발급한다.

const PREFIX = "pw_";

/** 새 토큰. 앞의 pw_ 는 사람이 알아보기 위한 것이고 값은 뒤의 32자다. */
export function createDeviceToken(): string {
  return PREFIX + randomBytes(24).toString("base64url");
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Authorization: Bearer <토큰> 에서 토큰만 꺼낸다. */
function bearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;

  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

/**
 * 기기를 확인하고 마지막 기록 시각을 갱신한다.
 * 토큰이 없거나 맞지 않으면 null. 그때는 401 로 돌려보낸다.
 */
export async function authenticateDevice(req: Request): Promise<Device | null> {
  const token = bearer(req);
  if (!token) return null;

  // 해시가 정확히 같은 줄만 찾는다. 토큰 원문은 DB 어디에도 없다.
  const { data, error } = await supabaseServer
    .from("devices")
    .select("id, user_id, plant_id, name, last_seen_at, created_at")
    .eq("token_hash", hashDeviceToken(token))
    .maybeSingle<Device>();

  if (error) {
    console.error("[device:auth]", error.code, error.message);
    return null;
  }

  if (!data) return null;

  // 연결 끊김 판정에 쓴다. 실패해도 들어온 기록은 받는다.
  const { error: seenError } = await supabaseServer
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  if (seenError) console.warn("[device:last_seen]", seenError.message);

  return data;
}

/** 정수로 들어와야 하는 측정값. 범위 밖이면 센서가 튄 것으로 보고 받지 않는다. */
export function cleanMeasurement(
  value: unknown,
  limit: { min: number; max: number }
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  const n = Math.round(value);
  return n < limit.min || n > limit.max ? null : n;
}

// DHT11 의 측정 범위보다 조금 넓게 잡는다. 센서를 바꿔도 값이 버려지지 않게.
export const TEMP_LIMIT = { min: -20, max: 70 };
export const HUMIDITY_LIMIT = { min: 0, max: 100 };

/** 측정 시각. 미래이거나 너무 오래된 값은 받지 않는다. */
export function cleanMeasuredAt(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;

  const now = Date.now();
  // 기기 시계가 조금 어긋날 수 있어 앞뒤로 여유를 둔다.
  // 네트워크가 끊겼다 다시 보내는 경우가 있어 과거는 30일까지 받는다.
  if (at.getTime() > now + 10 * 60 * 1000) return null;
  if (at.getTime() < now - 30 * 24 * 60 * 60 * 1000) return null;

  return at.toISOString();
}
