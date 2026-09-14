import { GoogleGenAI } from "@google/genai";
import {
  DIAGNOSE_QUESTION_PROMPT,
  DIAGNOSE_RESULT_PROMPT,
  IDENTIFY_PROMPT,
} from "./prompts";
import type {
  DiagnosisAnswer,
  DiagnosisQuestion,
  DiagnosisResult,
  IdentifyResult,
} from "@/types";

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

type Part =
  | { inlineData: { mimeType: string; data: string } }
  | { text: string };

export type Photo = { base64: string; mimeType: string };

/** 사진이 없을 수도 있으므로 파트를 조립해서 보낸다. */
async function ask<T>(parts: Part[]): Promise<T> {
  const ai = getClient();
  const res = await ai.models.generateContent({ model: MODEL, contents: parts });

  const text = res.text;
  if (!text) throw new Error("응답이 비어 있습니다.");

  return parseJson<T>(text);
}

/** 식물 정보와 지금까지의 답변을 사람이 읽는 형태로 만든다. */
function context(species: string, answers: DiagnosisAnswer[]): string {
  const history = answers.length
    ? answers.map((a, i) => `${i + 1}. ${a.question} → ${a.answer}`).join("\n")
    : "(아직 없음)";

  return `식물: ${species}\n\n지금까지의 문답:\n${history}`;
}

function buildParts(prompt: string, species: string, answers: DiagnosisAnswer[], photo: Photo | null): Part[] {
  const parts: Part[] = [];
  if (photo) {
    parts.push({ inlineData: { mimeType: photo.mimeType, data: photo.base64 } });
  }
  parts.push({ text: `${context(species, answers)}\n\n${prompt}` });
  return parts;
}

/** 원인을 좁히기 위한 다음 질문 하나를 받는다. */
export async function askDiagnosisQuestion(
  species: string,
  answers: DiagnosisAnswer[],
  photo: Photo | null
): Promise<DiagnosisQuestion> {
  return ask<DiagnosisQuestion>(
    buildParts(DIAGNOSE_QUESTION_PROMPT, species, answers, photo)
  );
}

/** 답변을 종합해 결론을 받는다. */
export async function concludeDiagnosis(
  species: string,
  answers: DiagnosisAnswer[],
  photo: Photo | null
): Promise<DiagnosisResult> {
  return ask<DiagnosisResult>(
    buildParts(DIAGNOSE_RESULT_PROMPT, species, answers, photo)
  );
}
