"use client";

import { useState } from "react";
import type { IdentifyResult } from "@/types";

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append("photo", file);

      const res = await fetch("/api/identify", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "판별에 실패했습니다.");
      } else {
        setResult(data);
      }
    } catch {
      setError("요청에 실패했습니다. 터미널 로그를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <h1 className="text-xl font-semibold">판별 테스트</h1>
      <p className="mt-1 text-sm text-neutral-500">
        식물 사진을 넣고 이름이 맞게 나오는지 확인합니다.
      </p>

      <label className="mt-6 block cursor-pointer rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-600 hover:border-neutral-500">
        사진 고르기
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="선택한 사진"
          className="mt-5 w-full rounded-lg border border-neutral-200"
        />
      )}

      {loading && <p className="mt-5 text-sm text-neutral-500">판별 중...</p>}

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">
            {result.confident ? "이 사진과 가장 비슷해요" : "판별하지 못했어요"}
          </p>
          <p className="mt-1 text-lg font-semibold">{result.koreanName}</p>
          <p className="text-sm text-neutral-500">{result.scientificName}</p>

          <dl className="mt-4 space-y-2 text-sm">
            <Row label="난이도" value={result.difficulty} />
            <Row label="빛" value={result.light} />
            <Row label="물" value={result.water} />
            <Row label="물주기 간격" value={`${result.waterIntervalDays}일`} />
          </dl>

          <p className="mt-4 text-sm text-neutral-600">{result.note}</p>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
      <dt className="shrink-0 text-neutral-400">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}