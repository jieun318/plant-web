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