"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import PageShell from "@/components/layout/PageShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import {
  getDiagnosisServerSnapshot,
  getDiagnosisSnapshot,
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
    if (!handoff || saving) return;

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
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
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
      <Badge tone="clay">{result.cause}</Badge>

      <SectionTitle as="h1" className="mt-3">
        {result.title}
      </SectionTitle>

      <Panel title="이렇게 판단했어요" className="mt-9">
        <ul className="flex flex-col gap-2">
          {result.reasons.map((reason) => (
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

      <Panel title="지금 할 일" className="mt-5">
        <ul className="flex flex-col gap-2">
          {result.actions.map((action) => {
            const checked = done.includes(action);

            return (
              <li key={action}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-rule bg-sheet px-4 py-3.5 transition-colors hover:border-wood">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setDone((prev) =>
                        checked ? prev.filter((a) => a !== action) : [...prev, action]
                      )
                    }
                    className="mt-0.5 size-4 shrink-0 accent-leaf"
                  />
                  <span
                    className={`text-sm leading-relaxed ${
                      checked ? "text-ink-45 line-through" : "text-ink"
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

      <Button onClick={save} disabled={saving} full className="mt-8">
        {saving ? "저장 중..." : "기록에 저장"}
      </Button>

      <p className="mt-6 border-l-2 border-rule pl-3 text-xs leading-relaxed text-ink-45">
        참고용 안내입니다. 상태가 심하면 가까운 화훼농원에 문의하세요.
      </p>
    </PageShell>
  );
}
