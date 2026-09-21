import type { Identification, IdentifyResult } from "@/types";

// DB 행과 화면이 쓰는 형태를 오간다.
// 서버 전용 코드를 넣지 말 것. 화면(클라이언트 컴포넌트)에서도 import 한다.

/** 판별 기록 한 줄을 화면이 쓰는 판별 결과로 바꾼다. */
export function toIdentifyResult(row: Identification): IdentifyResult {
  return {
    koreanName: row.korean_name,
    scientificName: row.scientific_name ?? "",
    confident: row.confident,
    difficulty: (row.difficulty as IdentifyResult["difficulty"]) ?? "보통",
    origin: row.origin ?? "",
    light: row.light ?? "",
    water: row.water ?? "",
    humidity: row.humidity ?? "",
    repot: row.repot ?? "",
    waterIntervalDays: row.water_interval_days ?? 7,
    // note 는 저장하지 않는다. 화면에서 쓰지 않아 컬럼을 두지 않았다.
    note: "",
  };
}

/** 판별 결과를 identifications 에 넣을 형태로 바꾼다. */
export function toIdentificationRow(result: IdentifyResult, userId: string, photoUrl: string | null) {
  return {
    user_id: userId,
    photo_url: photoUrl,
    korean_name: result.koreanName,
    scientific_name: result.scientificName,
    difficulty: result.difficulty,
    origin: result.origin,
    light: result.light,
    water: result.water,
    humidity: result.humidity,
    repot: result.repot,
    water_interval_days: result.waterIntervalDays,
    confident: result.confident,
  };
}

/** 등록할 때 plants 로 복사하는 종 정보. */
export function toPlantSpecies(row: Identification) {
  return {
    species: row.korean_name,
    scientific_name: row.scientific_name,
    difficulty: row.difficulty,
    origin: row.origin,
    light: row.light,
    water: row.water,
    humidity: row.humidity,
    repot: row.repot,
  };
}
