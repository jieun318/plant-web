// 식물 판별 결과
export type IdentifyResult = {
  koreanName: string;        // 한글 이름
  scientificName: string;    // 학명
  confident: boolean;        // 판별 성공 여부
  difficulty: "쉬움" | "보통" | "어려움";
  origin: string;            // 원산지
  light: string;             // 빛 조건 한 줄
  water: string;             // 물주기 한 줄
  humidity: string;          // 습도 조건 한 줄
  repot: string;             // 분갈이 시기 한 줄
  waterIntervalDays: number; // 물주기 간격(일) — plants.water_interval 에 저장
  note: string;              // 특징 한 줄
};

// DB: plants 테이블
export type Plant = {
  id: string;
  user_id: string;
  species: string;
  nickname: string | null;
  location: string | null;
  photo_url: string | null;
  water_interval: number;
  last_watered: string | null;
  created_at: string;
};

// DB: care_logs 테이블
export type CareLog = {
  id: string;
  plant_id: string;
  type: "water" | "repot" | "fertilize" | "diagnose";
  memo: string | null;
  created_at: string;
};

// 진단 문답 (S-03)
export type DiagnosisQuestion = {
  question: string;   // 질문 한 줄
  why: string;        // 왜 묻는지 한 줄
  options: string[];  // 선택지 3~4개, 마지막은 "잘 기억나지 않아요" 계열
};

export type DiagnosisAnswer = {
  question: string;
  answer: string;
};

// 진단 결과 (S-04)
export type DiagnosisResult = {
  cause: string;             // 원인 배지 문구, 예: "과습으로 보여요"
  title: string;             // 조치 제목, 예: "물을 잠시 멈춰주세요"
  reasons: string[];         // 근거 3줄
  actions: string[];         // 지금 할 일 3개
  waterIntervalDays: number; // 진단에 맞춘 새 물주기 간격
};

// DB: diagnoses 테이블
// reasons / actions / answers 는 jsonb 다.
// 조치 제목(title)을 담을 칸이 없어 저장되지 않는다.
export type Diagnosis = {
  id: string;
  plant_id: string;
  cause: string;
  reasons: string[];
  actions: string[];
  answers: DiagnosisAnswer[];
  photo_url: string | null;
  created_at: string;
};
