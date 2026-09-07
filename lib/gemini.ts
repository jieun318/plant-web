import { GoogleGenAI } from "@google/genai";
import { IDENTIFY_PROMPT } from "./prompts";
import type { IdentifyResult } from "@/types";

// 이 파일은 서버에서만 import 할 것.
// 클라이언트 컴포넌트에서 부르면 API 키가 브라우저에 노출된다.

// AI Studio 에서 쓸 수 있는 모델명이 바뀌면 여기만 고치면 된다.
const MODEL = "gemini-3.8-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 가 없습니다. .env.local 을 확인하세요.");
  }
  return new GoogleGenAI({ apiKey });
}

// 모델이 ```json 으로 감싸서 보내는 경우가 있어 벗겨낸다
function parseJson<T>(raw: string): T {
  let text = raw.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`JSON 파싱 실패: ${text.slice(0, 200)}`);
  }
}

/**
 * 사진으로 식물 종을 판별한다.
 * @param base64 이미지 base64 (data URL 접두사 없이)
 * @param mimeType image/jpeg 등
 */
export async function identifyPlant(
  base64: string,
  mimeType: string
): Promise<IdentifyResult> {
  const ai = getClient();

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { inlineData: { mimeType, data: base64 } },
      { text: IDENTIFY_PROMPT },
    ],
  });

  const text = res.text;
  if (!text) throw new Error("응답이 비어 있습니다.");

  return parseJson<IdentifyResult>(text);
}