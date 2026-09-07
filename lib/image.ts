// 업로드 전 클라이언트에서 사진을 줄인다.
// 원본을 그대로 보내면 API 비용과 응답 시간이 그만큼 늘어난다.

const MAX_EDGE = 1024;
const QUALITY = 0.85;

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
