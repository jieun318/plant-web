"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import InfoRow from "@/components/ui/InfoRow";
import Panel from "@/components/ui/Panel";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
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
      const res = await apiFetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: handoff.result, photo: handoff.photo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "등록하지 못했습니다.");
        return;
      }

      router.push(destination((data as Plant).id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "등록에 실패했습니다. 연결을 확인해 주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  if (handoff === undefined) {
    return <PageShell />;
  }

  // 판별을 거치지 않고 주소로 바로 들어온 경우
  if (handoff === null) {
    return (
      <PageShell>
        <SectionTitle as="h1">판별 결과가 없어요</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          사진을 먼저 올려주세요.
        </p>
        <Button href="/" className="mt-6">
          사진 올리러 가기
        </Button>
      </PageShell>
    );
  }

  const { result, photo } = handoff;

  return (
    <PageShell>
      <BackLink />

      <div className="mt-6 grid items-start gap-10 md:grid-cols-2 md:gap-14">
        <PhotoFrame src={photo} alt="판별한 사진" ratio="photo" />

        <div>
          {result.confident ? (
            <>
              <p className="text-xs text-ink-45">이 사진과 가장 비슷해요</p>
              <SectionTitle as="h1" className="mt-1">
                {result.koreanName}
              </SectionTitle>
              <p className="mt-1 text-sm text-ink-70 italic">
                {result.scientificName}
              </p>

              <Badge tone="leaf" className="mt-4">
                난이도 {result.difficulty}
              </Badge>

              <Panel className="mt-7">
                <dl>
                  <InfoRow label="원산지" value={result.origin} />
                  <InfoRow label="빛" value={result.light} />
                  <InfoRow label="물" value={result.water} />
                  <InfoRow label="습도" value={result.humidity} />
                  <InfoRow label="분갈이" value={result.repot} />
                </dl>
              </Panel>

              {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => register((id) => `/plants/${id}`)}
                  disabled={saving}
                  className="sm:flex-1"
                >
                  {saving ? "등록 중..." : "내 식물로 등록"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => register((id) => `/plants/${id}/guide`)}
                  disabled={saving}
                  className="sm:flex-1"
                >
                  관리법 먼저 보기
                </Button>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-ink-45">
                다른 식물인가요? 사진을 다시 올리면 더 정확해집니다.
              </p>
            </>
          ) : (
            <>
              <SectionTitle as="h1">판별하지 못했어요</SectionTitle>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                잎과 줄기가 잘 보이게, 밝은 곳에서 다시 찍어주세요.
              </p>
              <Button href="/" className="mt-7">
                다시 올리기
              </Button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="-ml-1 inline-flex items-center gap-0.5 text-sm text-ink-70 transition-colors hover:text-ink"
    >
      <ChevronLeft aria-hidden className="size-4" />
      다시 올리기
    </Link>
  );
}
