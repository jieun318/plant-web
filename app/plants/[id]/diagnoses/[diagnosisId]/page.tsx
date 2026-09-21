"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Badge from "@/components/ui/Badge";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import StepList from "@/components/ui/StepList";
import { apiFetch } from "@/lib/api";
import type { Diagnosis, Plant } from "@/types";

type Loaded = {
  plant: Pick<Plant, "id" | "species" | "nickname">;
  diagnosis: Diagnosis;
};

/** 지난 진단 다시 보기. 저장할 때의 원인·근거·할 일을 그대로 보여준다. */
export default function PastDiagnosisPage({
  params,
}: PageProps<"/plants/[id]/diagnoses/[diagnosisId]">) {
  const { id, diagnosisId } = use(params);

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/plants/${id}/diagnoses/${diagnosisId}`);
        const body = await res.json();

        if (!alive) return;

        if (!res.ok) {
          setError(body.error ?? "진단 기록을 불러오지 못했습니다.");
          return;
        }

        setData(body as Loaded);
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : "진단 기록을 불러오지 못했습니다.");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, diagnosisId]);

  const diagnosis = data?.diagnosis;

  return (
    <PageShell className="max-w-2xl">
      <Link
        href={`/plants/${id}`}
        className="-ml-1 inline-flex items-center gap-0.5 text-sm text-ink-70 transition-colors hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {data ? data.plant.nickname || data.plant.species : "돌아가기"}
      </Link>

      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}
      {!data && !error && <Loading className="mt-10" />}

      {diagnosis && (
        <>
          <p className="mt-6 text-xs text-ink-45">{formatDate(diagnosis.created_at)} 진단</p>

          <Badge tone="clay" className="mt-2">
            {diagnosis.cause}
          </Badge>

          {/* 제목은 migration-diagnosis-title.sql 이후에 저장한 진단에만 있다 */}
          <SectionTitle as="h1" className="mt-3">
            {diagnosis.title || "지난 진단 결과"}
          </SectionTitle>

          <Panel title="이렇게 판단했어요" className="mt-9">
            <ul className="flex flex-col gap-2">
              {diagnosis.reasons.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2 text-sm leading-relaxed text-ink-70"
                >
                  <span aria-hidden className="text-ink-45">
                    ·
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="그때 권한 할 일" className="mt-5">
            <StepList steps={diagnosis.actions} />
          </Panel>

          <p className="mt-6 border-l-2 border-rule pl-3 text-xs leading-relaxed text-ink-45">
            참고용 안내입니다. 지금 상태가 달라졌다면 다시 진단해 보세요.
          </p>
        </>
      )}
    </PageShell>
  );
}

/** 2026년 9월 21일 — 지난 기록이라 연도까지 적는다. */
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
