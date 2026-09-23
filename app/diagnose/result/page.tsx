"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import PageShell from "@/components/layout/PageShell";
import ReasonList from "@/components/ReasonList";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusText from "@/components/ui/StatusText";
import { apiFetch } from "@/lib/api";
import {
  getDiagnosisServerSnapshot,
  getDiagnosisSnapshot,
  markDiagnosisSaved,
  subscribeIdentify,
} from "@/lib/handoff";

export default function DiagnosisResultPage() {
  const router = useRouter();
  // undefined = 아직 안 읽음(서버/hydration), null = 넘어온 결과가 없음
  const handoff = useSyncExternalStore(
    subscribeIdentify,
    getDiagnosisSnapshot,
    getDiagnosisServerSnapshot
  );

  const [done, setDone] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!handoff || handoff.saved || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${handoff.plantId}/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: handoff.result,
          answers: handoff.answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장하지 못했습니다.");
        return;
      }

      markDiagnosisSaved();
      router.push(`/plants/${handoff.plantId}`);
    } catch {
      setError("저장에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (handoff === undefined) {
    return <PageShell />;
  }

  if (handoff === null) {
    return (
      <PageShell className="max-w-2xl">
        <SectionTitle as="h1">진단 결과가 없어요</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-soft">
          진단을 먼저 진행해주세요.
        </p>
        <Button href="/plants" className="mt-6">
          내 식물 보러 가기
        </Button>
      </PageShell>
    );
  }

  const { result } = handoff;

  return (
    <PageShell className="max-w-2xl">
      <SectionTitle as="h1">{result.title}</SectionTitle>
      <p className="mt-2">
        <StatusText>{result.cause}</StatusText>
      </p>

      <Panel title="이렇게 판단했어요" className="mt-9">
        <ReasonList reasons={result.reasons} />
      </Panel>

      <Panel title="지금 할 일" className="mt-9">
        <ul>
          {result.actions.map((action) => {
            const checked = done.includes(action);

            return (
              <li key={action} className="first:[&>label]:border-t-0 first:[&>label]:pt-0">
                <label className="flex cursor-pointer items-start gap-3 border-t border-hair py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setDone((prev) =>
                        checked ? prev.filter((a) => a !== action) : [...prev, action]
                      )
                    }
                    className="mt-0.5 size-4 shrink-0 accent-ink"
                  />
                  <span
                    className={`text-sm leading-relaxed ${
                      checked ? "text-faint line-through" : "text-ink"
                    }`}
                  >
                    {action}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Panel>

      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}

      {/* 저장하면 물주기 일정이 바뀐다. 모르고 누르면 달력이 갑자기 달라 보인다. */}
      {result.waterIntervalDays > 0 && (
        <p className="mt-8 text-sm leading-relaxed text-soft">
          저장하면 물주기 간격이{" "}
          <span className="font-medium text-ink">{result.waterIntervalDays}일</span>로
          바뀌어요.
        </p>
      )}

      {handoff.saved ? (
        <Button href={`/plants/${handoff.plantId}`} variant="link" className="mt-6">
          저장했어요 · 식물로 돌아가기
        </Button>
      ) : (
        <Button onClick={save} disabled={saving} full className="mt-4">
          {saving ? "저장 중..." : "기록에 저장"}
        </Button>
      )}

      <p className="mt-6 text-xs leading-relaxed text-soft">
        참고용 안내입니다. 상태가 심하면 가까운 화훼농원에 문의하세요.
      </p>
    </PageShell>
  );
}
