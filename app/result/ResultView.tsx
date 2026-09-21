"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import InfoRow from "@/components/ui/InfoRow";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import {
  getIdentifyServerSnapshot,
  getIdentifySnapshot,
  subscribeIdentify,
} from "@/lib/handoff";
import { toIdentifyResult } from "@/lib/identification";
import type { Identification, Plant } from "@/types";

/**
 * S-02 판별 결과.
 *
 * 결과는 주소(/result?id=xxx)로 찾는다. 다른 화면에 갔다 와도, 새로고침해도 남는다.
 * id 가 없을 때만 예전처럼 브라우저에 담아둔 값을 쓴다.
 * (판별에 실패했거나 세션이 없어 기록을 남기지 못한 경우)
 */
export default function ResultView() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const handoff = useSyncExternalStore(
    subscribeIdentify,
    getIdentifySnapshot,
    getIdentifyServerSnapshot
  );

  // undefined = 아직 불러오는 중, null = 기록이 없음
  const [record, setRecord] = useState<Identification | null | undefined>(
    id ? undefined : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/identifications/${id}`);
        const data = await res.json();

        if (!alive) return;

        // 없는 기록이면 "결과가 없어요" 화면으로 떨어진다
        setRecord(res.ok ? (data as Identification) : null);
      } catch {
        if (alive) setRecord(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  async function register(destination: (plantId: string) => string) {
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      // 기록이 있으면 id 만 보낸다. 사진과 종 정보는 서버가 그 기록에서 복사한다.
      const body = record
        ? { identificationId: record.id }
        : { result: handoff?.result, photo: handoff?.photo };

      const res = await apiFetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  // 서버/hydration 중이거나 기록을 불러오는 중
  if (record === undefined || (!id && handoff === undefined)) {
    return (
      <PageShell>
        <Loading label="판별 결과를 불러오는 중..." />
      </PageShell>
    );
  }

  const result = record ? toIdentifyResult(record) : handoff?.result;
  const photo = record ? record.photo_url : handoff?.photo;

  // 판별을 거치지 않고 주소로 바로 들어왔거나, 기록이 지워진 경우
  if (!result) {
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
                  onClick={() => register((plantId) => `/plants/${plantId}`)}
                  disabled={saving}
                  className="sm:flex-1"
                >
                  {saving ? "등록 중..." : "내 식물로 등록"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => register((plantId) => `/plants/${plantId}/guide`)}
                  disabled={saving}
                  className="sm:flex-1"
                >
                  등록하고 관리법 보기
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
