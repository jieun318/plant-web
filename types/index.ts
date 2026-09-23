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

// DB: identifications 테이블
// 판별 결과를 브라우저가 아니라 DB 에 남긴다. 사용자당 최근 10건만 유지한다.
export type Identification = {
  id: string;
  user_id: string;
  photo_url: string | null;
  korean_name: string;
  scientific_name: string | null;
  difficulty: string | null;
  origin: string | null;
  light: string | null;
  water: string | null;
  humidity: string | null;
  repot: string | null;
  water_interval_days: number | null;
  confident: boolean;
  created_at: string;
};

// DB: plants 테이블
// 종 정보는 등록할 때 판별 결과에서 복사한다.
// 참조가 아니라 값이라 판별 기록이 지워져도 상세 화면은 그대로 보인다.
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
  identification_id: string | null;
  scientific_name: string | null;
  difficulty: string | null;
  origin: string | null;
  light: string | null;
  water: string | null;
  humidity: string | null;
  repot: string | null;
  // 관찰 기준. 판별에서 정한 적정 범위 — 기기가 잰 값이 이 밖이면 상태에 반영한다.
  // 예전에 등록한 식물은 비어 있고, 그때는 상태를 판정하지 않는다.
  temp_min: number | null;
  temp_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
};

// DB: care_logs 테이블
export type CareLog = {
  id: string;
  plant_id: string;
  type: "water" | "repot" | "fertilize" | "diagnose";
  memo: string | null;
  created_at: string;
  /** 진단 기록일 때 그 진단의 id. DB 칸이 아니라 GET /api/plants/[id] 가 붙여준다. */
  diagnosis_id?: string | null;
};

// 관리 가이드 (S-07)
export type GuideTopic = "water" | "light" | "repot" | "fertilize";

// Gemini 가 만드는 부분
export type GuideContent = {
  when: string;    // 언제 하나요 — 시기 판단 기준
  steps: string[]; // 순서 3~5개
  caution: string; // 주의 문구 한 줄
};

// DB: guides 테이블
// 식물마다 탭마다 한 줄. 한 번 만들면 다시 쓴다.
export type CareGuide = {
  id: string;
  plant_id: string;
  topic: GuideTopic;
  when_to: string;
  steps: string[];
  caution: string | null;
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
// title 은 migration-diagnosis-title.sql 로 추가했다. 그 전에 저장한 진단은 null 이다.
export type Diagnosis = {
  id: string;
  plant_id: string;
  cause: string;
  title: string | null;
  reasons: string[];
  actions: string[];
  answers: DiagnosisAnswer[];
  photo_url: string | null;
  created_at: string;
};

// ── 관찰 기기 (migration-observation.sql) ──────────────────────────

// DB: devices 테이블
// 토큰 원문은 저장하지 않는다. 발급 화면에서 한 번만 보여주고 해시만 남긴다.
export type Device = {
  id: string;
  user_id: string;
  plant_id: string;
  name: string;
  /** 마지막으로 기록을 보낸 시각. 1시간 넘게 없으면 "연결 끊김" */
  last_seen_at: string | null;
  created_at: string;
};

// DB: sensor_readings 테이블
// DHT11 이라 정수로 들어온다.
export type SensorReading = {
  id: string;
  device_id: string;
  plant_id: string;
  temperature: number;
  humidity: number;
  measured_at: string;
  created_at: string;
};

// DB: plant_snapshots 테이블
export type PlantSnapshot = {
  id: string;
  device_id: string;
  plant_id: string;
  photo_url: string;
  captured_at: string;
  created_at: string;
};

/** 관찰 상태. 규칙으로 정한다. AI 는 visibleChange 만 알려준다. */
export type ObservationStatus = "good" | "caution" | "check";

// DB: daily_observations 테이블
// 식물 × 날짜 한 줄. date 는 YYYY-MM-DD (한국 시간 기준 날짜).
export type DailyObservation = {
  id: string;
  plant_id: string;
  date: string;
  photo_url: string | null;
  avg_temp: number | null;
  avg_humidity: number | null;
  status: ObservationStatus;
  ai_comment: string | null;
  created_at: string;
};

// Gemini 가 만드는 관찰 코멘트
export type ObservationComment = {
  /** 2문장 이내. 사진에서 확실히 보이는 것과 주어진 온습도만 말한다 */
  comment: string;
  /** 잎·줄기에 눈에 띄는 변화가 보이는지. 상태를 "확인 필요"로 올릴 때 쓴다 */
  visibleChange: boolean;
};
