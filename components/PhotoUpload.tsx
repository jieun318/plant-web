"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { saveIdentify } from "@/lib/handoff";
import { fileToDataUrl, resizeImage } from "@/lib/image";
import type { IdentifyResult } from "@/types";

type Props = {
  /** dropzone: 홈의 큰 영역 / button: 빈 목록처럼 자리가 좁을 때 */
  variant?: "dropzone" | "button";
};

export default function PhotoUpload({ variant = "dropzone" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file || loading) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const resized = await resizeImage(file);
      const photo = await fileToDataUrl(resized);

      const form = new FormData();
      form.append("photo", resized);

      const res = await fetch("/api/identify", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "판별에 실패했습니다.");
        return;
      }

      saveIdentify({ result: data as IdentifyResult, photo });
      router.push("/result");
    } catch {
      setError("사진을 보내지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const picker = (
    <label className={buttonClass("primary", "md", false, "cursor-pointer")}>
      {loading ? "판별 중..." : "사진 고르기"}
      <input
        type="file"
        accept="image/*"
        disabled={loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // 같은 사진을 다시 골라도 change 가 걸리도록 비워둔다
          e.target.value = "";
          handle(file);
        }}
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
        <p className="mt-1 text-xs text-ink-45">JPG, PNG · 한 장이면 충분합니다</p>

        <div className="mt-6">{picker}</div>
      </div>

      {error && <ErrorMessage className="mt-4">{error}</ErrorMessage>}
    </div>
  );
}
