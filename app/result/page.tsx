"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import {
  getIdentifyServerSnapshot,
  getIdentifySnapshot,
  subscribeIdentify,
} from "@/lib/handoff";
import type { Plant } from "@/types";

export default function ResultPage() {
  const router = useRouter();
  // undefined = 아직 안 읽음(서버/hydration), null = 넘어온 결과가 없음
  const handoff = useSyncExternalStore(
    subscribeIdentify,
    getIdentifySnapshot,
    getIdentifyServerSnapshot
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(destination: (id: string) => string) {
    if (!handoff || saving) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getAccessToken();

      const res = await fetch("/api/plants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ result: handoff.result, photo: handoff.photo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "등록하지 못했습니다.");
        return;
      }

      router.push(destination((data as Plant).id));
    } catch (e) {
      // 익명 로그인이 꺼져 있는 경우 등, 원인을 그대로 보여주는 편이 낫다
      setError(
        e instanceof Error ? e.message : "등록에 실패했습니다. 연결을 확인해 주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  if (handoff === undefined) {
    return <main className="py-6" />;
  }

  // 판별을 거치지 않고 주소로 바로 들어온 경우
  if (handoff === null) {
    return (
      <main className="py-6">
        <BackLink />
        <p className="mt-10 text-sm leading-relaxed text-neutral-500">
          보여드릴 판별 결과가 없습니다. 사진을 먼저 찍어주세요.
        </p>
        <Link
          href="/"
          className="mt-5 block rounded-lg bg-emerald-700 py-3.5 text-center text-sm font-semibold text-white"
        >
          사진 찍으러 가기
        </Link>
      </main>
    );
  }

  const { result, photo } = handoff;

  return (
    <main className="py-6">
      <BackLink />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt="판별한 사진"
        className="mt-4 aspect-[4/3] w-full rounded-lg object-cover"
      />

      {result.confident ? (
        <>
          <p className="mt-6 text-xs text-neutral-400">이 사진과 가장 비슷해요</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {result.koreanName}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {result.scientificName}
          </p>

          <span className="mt-3 inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            난이도 {result.difficulty}
          </span>

          <dl className="mt-6">
            <InfoRow label="원산지" value={result.origin} />
            <InfoRow label="빛" value={result.light} />
            <InfoRow label="물" value={result.water} />
            <InfoRow label="습도" value={result.humidity} />
            <InfoRow label="분갈이" value={result.repot} />
          </dl>

          {error && (
            <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {error}
            </p>
          )}

          <div className="sticky bottom-16 mt-8 bg-white pt-3">
            <button
              type="button"
              onClick={() => register((id) => `/plants/${id}`)}
              disabled={saving}
              className="w-full rounded-lg bg-emerald-700 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "등록 중..." : "내 식물로 등록"}
            </button>
            <button
              type="button"
              onClick={() => register((id) => `/plants/${id}/guide`)}
              disabled={saving}
              className="mt-2 w-full rounded-lg border border-neutral-200 py-3.5 text-sm font-semibold text-neutral-600 disabled:opacity-60"
            >
              관리법 먼저 보기
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-neutral-400">
            다른 식물인가요? 사진을 다시 찍으면 더 정확해집니다.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            판별하지 못했어요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            잎과 줄기가 잘 보이게, 밝은 곳에서 다시 찍어주세요.
          </p>

          <div className="sticky bottom-16 mt-8 bg-white pt-3">
            <Link
              href="/"
              className="block rounded-lg bg-emerald-700 py-3.5 text-center text-sm font-semibold text-white"
            >
              다시 찍기
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="-ml-1 inline-flex items-center gap-0.5 text-sm text-neutral-500"
    >
      <ChevronLeft aria-hidden className="size-4" />
      다시 찍기
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-neutral-100 py-3">
      <dt className="shrink-0 text-sm text-neutral-400">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
