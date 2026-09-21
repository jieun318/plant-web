"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { apiFetch } from "@/lib/api";
import { saveIdentify } from "@/lib/handoff";
import { fileToDataUrl, imageMimeType, resizeImage, withImageType } from "@/lib/image";
import type { IdentifyResult } from "@/types";

type Props = {
  /** dropzone: 홈의 큰 영역 / button: 빈 목록처럼 자리가 좁을 때 */
  variant?: "dropzone" | "button";
};

/**
 * 판별을 요청한다.
 *
 * 토큰을 붙여 보내야 결과가 DB 에 남는다.
 * 세션을 못 만들었더라도 판별 자체는 막지 않는다. 그때는 기록이 남지 않는다.
 */
async function identify(form: FormData): Promise<Response> {
  const init: RequestInit = { method: "POST", body: form };

  try {
    return await apiFetch("/api/identify", init);
  } catch {
    return fetch("/api/identify", init);
  }
}

export default function PhotoUpload({ variant = "dropzone" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file || loading) return;

    const mime = imageMimeType(file);
    if (!mime) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 브라우저가 못 읽는 형식(HEIC 등)은 줄이지 못하고 원본이 돌아온다. 그때 type 을 채워 보낸다.
      const resized = withImageType(await resizeImage(file), mime);
      const photo = await fileToDataUrl(resized);

      const form = new FormData();
      form.append("photo", resized);

      const res = await identify(form);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "판별에 실패했습니다.");
        return;
      }

      const { id } = data as { id: string | null };

      // 기록이 남았으면 주소로 넘긴다. 새로고침해도 결과가 그대로 있다.
      if (id) {
        router.push(`/result?id=${id}`);
        return;
      }

      // 판별에 실패했거나 세션이 없어 남기지 못한 경우. 브라우저에 담아 넘긴다.
      saveIdentify({ result: data as IdentifyResult, photo });
      router.push("/result");
    } catch {
      setError("사진을 보내지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  // 사진 고르기와 카메라 촬영이 함께 쓴다
  function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 사진을 다시 골라도 change 가 걸리도록 비워둔다
    e.target.value = "";
    handle(file);
  }

  const picker = (
    <label className={buttonClass("primary", "md", false, "cursor-pointer")}>
      {loading ? "판별 중..." : "사진 고르기"}
      <input
        type="file"
        accept="image/*,.heic,.heif"
        disabled={loading}
        onChange={pick}
        className="sr-only"
      />
    </label>
  );

  // capture="environment" 는 모바일에서 후면 카메라를 바로 연다.
  // 데스크톱은 이 속성을 무시하고 파일 선택 창을 연다. 그래서 숨기지 않고 늘 보여준다.
  const shooter = (
    <label className={buttonClass("quiet", "md", false, "cursor-pointer")}>
      <Camera aria-hidden className="size-4" />
      카메라로 찍기
      <input
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        disabled={loading}
        onChange={pick}
        className="sr-only"
      />
    </label>
  );

  if (variant === "button") {
    return (
      <div>
        {picker}
        {error && <ErrorMessage className="mt-4">{error}</ErrorMessage>}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging ? "border-leaf bg-leaf-50" : "border-rule bg-sheet"
        }`}
      >
        <ImagePlus aria-hidden className="size-8 text-ink-45" strokeWidth={1.5} />

        <p className="mt-4 text-sm font-medium text-ink">
          {loading ? "사진을 살펴보는 중입니다" : "사진을 여기에 끌어다 놓으세요"}
        </p>
        <p className="mt-1 text-xs text-ink-45">JPG, PNG, HEIC · 한 장이면 충분합니다</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {picker}
          {shooter}
        </div>
      </div>

      {error && <ErrorMessage className="mt-4">{error}</ErrorMessage>}
    </div>
  );
}
