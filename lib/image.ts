// 업로드 전 클라이언트에서 사진을 줄인다.
// 원본을 그대로 보내면 API 비용과 응답 시간이 그만큼 늘어난다.

const MAX_EDGE = 1024;
const QUALITY = 0.85;

// 확장자로 판단할 때 쓰는 표. 아이폰 사진(HEIC/HEIF)은 일부 브라우저가 file.type 을 비워서 준다.
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * 이미지의 MIME 타입. 이미지가 아니면 null.
 *
 * 브라우저가 형식을 모르면 type 을 비우거나 octet-stream 으로 준다. 그때만 확장자를 본다.
 * 서버(판별 API)도 같이 쓴다. document 를 쓰는 함수와 달리 어디서 불러도 된다.
 */
export function imageMimeType(file: File): string | null {
  if (file.type.startsWith("image/")) return file.type;
  if (file.type && file.type !== "application/octet-stream") return null;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? null;
}

/** type 이 비어 있는 파일에 알아낸 MIME 을 붙인다. 업로드와 Gemini 가 이 값을 쓴다. */
export function withImageType(file: File, mime: string): File {
  return file.type === mime ? file : new File([file], file.name, { type: mime });
}

/**
 * 긴 변을 maxEdge 로 맞춰 JPEG 로 다시 인코딩한다.
 * 브라우저가 원본 포맷을 못 읽으면(예: 일부 HEIC) 원본을 그대로 돌려준다.
 */
export async function resizeImage(file: File, maxEdge = MAX_EDGE): Promise<File> {
  try {
    // from-image: 아이폰 세로 사진이 눕는 것을 막는다
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob) return file;

    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** 미리보기와 화면 간 전달에 쓸 data URL 로 바꾼다. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
