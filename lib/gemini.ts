import { GoogleGenAI } from "@google/genai";
import {
  DIAGNOSE_QUESTION_PROMPT,
  DIAGNOSE_RESULT_PROMPT,
  GUIDE_PROMPT,
  IDENTIFY_PROMPT,
  OBSERVE_PROMPT,
} from "./prompts";
import type {
  DiagnosisAnswer,
  DiagnosisQuestion,
  DiagnosisResult,
  GuideContent,
  GuideTopic,
  IdentifyResult,
  ObservationComment,
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

/** 주소에 있는 사진을 Gemini 에 넣을 수 있는 형태로 가져온다. 실패하면 null. */
export async function loadPhoto(url: string | null): Promise<Photo | null> {
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      base64: buffer.toString("base64"),
      mimeType: res.headers.get("content-type") ?? "image/jpeg",
    };
  } catch {
    // 사진을 못 읽어도 나머지는 이어간다
    return null;
  }
}

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

const TOPIC_LABEL: Record<GuideTopic, string> = {
  water: "물주기",
  light: "빛",
  repot: "분갈이",
  fertilize: "비료",
};

export type GuideInput = {
  species: string;
  scientificName: string | null;
  /** 두는 자리. 없을 수 있다 */
  location: string | null;
  /** 등록 후 며칠째인지 */
  days: number;
  topic: GuideTopic;
};

/**
 * 한 탭의 관리법을 받는다.
 *
 * 종명만 주면 검색 결과와 같은 답이 온다.
 * 두는 자리와 키운 기간을 함께 줘야 이 사람의 식물에 맞는 답이 된다.
 */
export async function buildGuide(input: GuideInput): Promise<GuideContent> {
  const facts = [
    `식물: ${input.species}${input.scientificName ? ` (${input.scientificName})` : ""}`,
    `두는 자리: ${input.location || "알려주지 않음"}`,
    `키운 기간: 등록 후 ${input.days}일째`,
    `알고 싶은 것: ${TOPIC_LABEL[input.topic]}`,
  ].join("\n");

  return ask<GuideContent>([{ text: `${facts}\n\n${GUIDE_PROMPT}` }]);
}

export type ObserveInput = {
  species: string;
  /** 오늘 사진. 없으면 온습도만 보고 쓴다 */
  today: Photo | null;
  /** 어제(또는 그 전) 사진. 비교 대상이 없으면 null */
  previous: Photo | null;
  avgTemp: number | null;
  avgHumidity: number | null;
  tempRange: string | null;
  humidityRange: string | null;
};

/**
 * 하루 관찰 코멘트를 받는다.
 * 사진 두 장(어제 → 오늘)과 하루 평균 온습도만 주고, 거기서 보이는 것만 쓰게 한다.
 */
export async function buildObservation(input: ObserveInput): Promise<ObservationComment> {
  const lines = [
    `식물: ${input.species}`,
    input.avgTemp === null
      ? "하루 평균 온도: 기록 없음"
      : `하루 평균 온도: ${input.avgTemp}°C${input.tempRange ? ` (적정 ${input.tempRange})` : ""}`,
    input.avgHumidity === null
      ? "하루 평균 습도: 기록 없음"
      : `하루 평균 습도: ${input.avgHumidity}%${input.humidityRange ? ` (적정 ${input.humidityRange})` : ""}`,
    input.previous ? "사진은 두 장이다. 첫 장이 어제, 둘째 장이 오늘이다." : "사진은 오늘 한 장뿐이다.",
  ];

  const parts: Part[] = [];
  if (input.previous) {
    parts.push({ inlineData: { mimeType: input.previous.mimeType, data: input.previous.base64 } });
  }
  if (input.today) {
    parts.push({ inlineData: { mimeType: input.today.mimeType, data: input.today.base64 } });
  }
  parts.push({ text: `${lines.join("\n")}\n\n${OBSERVE_PROMPT}` });

  const result = await ask<ObservationComment>(parts);

  return {
    comment: String(result.comment ?? "").trim(),
    // 모델이 문자열로 줄 때가 있다
    visibleChange: result.visibleChange === true || String(result.visibleChange) === "true",
  };
}
