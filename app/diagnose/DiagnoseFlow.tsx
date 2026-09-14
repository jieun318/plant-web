"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import { saveDiagnosis } from "@/lib/handoff";
import type {
  DiagnosisAnswer,
  DiagnosisQuestion,
  DiagnosisResult,
} from "@/types";

const TOTAL = 3;

type StepResponse = {
  done: boolean;
  question?: DiagnosisQuestion;
  result?: DiagnosisResult;
  photoUrl?: string | null;
};

/**
 * 지금까지의 답변을 통째로 보내고 다음 질문이나 결론을 받는다.
 * 상태는 건드리지 않는다. 부르는 쪽에서 처리한다.
 */
async function postDiagnose(
  plantId: string,
  answers: DiagnosisAnswer[]
): Promise<StepResponse> {
  const res = await apiFetch("/api/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plantId, answers }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "진단에 실패했습니다.");

  return data as StepResponse;
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "진단에 실패했습니다.";
}

export default function DiagnoseFlow() {
  const router = useRouter();
  const plantId = useSearchParams().get("plantId");

  const [answers, setAnswers] = useState<DiagnosisAnswer[]>([]);
  const [question, setQuestion] = useState<DiagnosisQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 첫 질문. 답변이 0개라 결론이 나올 일은 없다.
  useEffect(() => {
    if (!plantId) return;

    let alive = true;

    (async () => {
      try {
        const data = await postDiagnose(plantId, []);
        if (alive && data.question) setQuestion(data.question);
      } catch (e) {
        if (alive) setError(message(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [plantId]);

  // 선택 즉시 다음으로 넘어간다. 확인 버튼을 두지 않는다.
  async function choose(option: string) {
    if (!plantId || !question || loading) return;

    const next = [...answers, { question: question.question, answer: option }];
    setAnswers(next);
    setQuestion(null);
    setLoading(true);
    setError(null);

    try {
      const data = await postDiagnose(plantId, next);

      if (data.done && data.result) {
        saveDiagnosis({
          plantId,
          result: data.result,
          answers: next,
          photoUrl: data.photoUrl ?? null,
        });
        router.push("/diagnose/result");
        return;
      }

      if (data.question) setQuestion(data.question);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }

  if (!plantId) {
    return (
      <PageShell className="max-w-2xl">
        <BackLink href="/plants" label="내 식물" />
        <SectionTitle as="h1" className="mt-6">
          어떤 식물을 진단할까요?
        </SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          진단할 식물을 먼저 골라주세요.
        </p>
        <Button href="/plants" className="mt-6">
          내 식물 보러 가기
        </Button>
      </PageShell>
    );
  }

  const current = Math.min(answers.length + 1, TOTAL);
  const concluding = answers.length >= TOTAL;

  return (
    <PageShell className="max-w-2xl">
      <BackLink href={`/plants/${plantId}`} label="나가기" />

      <div className="mt-6 h-1 w-full rounded-full bg-rule">
        <div
          className="h-1 rounded-full bg-leaf transition-[width] duration-300"
          style={{ width: `${(current / TOTAL) * 100}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-ink-45">
        질문 {current} / {TOTAL}
      </p>

      {error && (
        <ErrorMessage className="mt-8">{error}</ErrorMessage>
      )}

      {loading && !error && (
        <Loading
          className="mt-8"
          label={concluding ? "원인을 정리하는 중..." : "질문을 고르는 중..."}
        />
      )}

      {question && !loading && (
        <>
          <SectionTitle as="h1" className="mt-8">
            {question.question}
          </SectionTitle>
          <p className="mt-2 text-sm text-ink-70">{question.why}</p>

          <div className="mt-7 flex flex-col gap-2.5">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => choose(option)}
                className="w-full rounded-md border border-rule bg-sheet px-4 py-3.5 text-left text-sm text-ink transition-colors hover:border-leaf hover:bg-leaf-50"
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex items-center gap-0.5 text-sm text-ink-70 transition-colors hover:text-ink"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
