"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera } from "lucide-react";
import { fileToDataUrl, resizeImage } from "@/lib/image";
import { saveIdentify } from "@/lib/handoff";
import type { IdentifyResult } from "@/types";

type Props = {
  /** 원형 큰 버튼 대신 한 줄짜리 주 버튼으로 그린다 (빈 목록 화면용) */
  compact?: boolean;
};

export default function PhotoUpload({ compact = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 사진을 다시 골라도 change 가 걸리도록 비워둔다
    e.target.value = "";
    if (!file) return;

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

  const input = (capture: boolean) => (
    <input
      type="file"
      accept="image/*"
      {...(capture ? { capture: "environment" as const } : {})}
      onChange={handleFile}
      disabled={loading}
      className="sr-only"
    />
  );

  return (
    <div>
      {compact ? (
        <label
          className={`block rounded-lg bg-emerald-700 py-3.5 text-center text-sm font-semibold text-white ${
            loading ? "opacity-60" : "cursor-pointer"
          }`}
        >
          {loading ? "판별 중..." : "식물 사진 찍기"}
          {input(true)}
        </label>
      ) : (
        <>
          <div className="flex justify-center">
            <label
              className={`flex size-[150px] flex-col items-center justify-center gap-2 rounded-full border-2 border-emerald-700 bg-emerald-50 text-emerald-700 ${
                loading ? "opacity-60" : "cursor-pointer"
              }`}
            >
              <Camera aria-hidden strokeWidth={1.75} className="size-8" />
              <span className="text-sm font-semibold">
                {loading ? "판별 중..." : "식물 사진 찍기"}
              </span>
              {input(true)}
            </label>
          </div>

          <label
            className={`mt-5 block rounded-lg border border-neutral-200 py-3.5 text-center text-sm font-semibold text-neutral-600 ${
              loading ? "opacity-60" : "cursor-pointer"
            }`}
          >
            앨범에서 고르기
            {input(false)}
          </label>
        </>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error}
        </p>
      )}
    </div>
  );
}
