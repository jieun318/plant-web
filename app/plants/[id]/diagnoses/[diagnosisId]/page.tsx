"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import ReasonList from "@/components/ReasonList";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusText from "@/components/ui/StatusText";
import StepList from "@/components/ui/StepList";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
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
      <Link href={`/plants/${id}`} className="text-sm text-soft transition-colors hover:text-ink">
        ← {data ? data.plant.nickname || data.plant.species : "돌아가기"}
      </Link>

      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}
      {!data && !error && <Loading className="mt-10" />}

      {diagnosis && (
        <>
          {/* 제목은 migration-diagnosis-title.sql 이후에 저장한 진단에만 있다 */}
          <SectionTitle as="h1" className="mt-6">
            {diagnosis.title || "지난 진단 결과"}
          </SectionTitle>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <StatusText>{diagnosis.cause}</StatusText>
            <span className="font-mono text-xs text-soft">{formatDate(diagnosis.created_at)} 진단</span>
          </p>

          <Panel title="이렇게 판단했어요" className="mt-9">
            <ReasonList reasons={diagnosis.reasons} />
          </Panel>

          <Panel title="그때 권한 할 일" className="mt-9">
            <StepList steps={diagnosis.actions} />
          </Panel>

          <p className="mt-9 text-xs leading-relaxed text-soft">
            참고용 안내입니다. 지금 상태가 달라졌다면 다시 진단해 보세요.
          </p>
        </>
      )}
    </PageShell>
  );
}
