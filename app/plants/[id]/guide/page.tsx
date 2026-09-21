"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import StepList from "@/components/ui/StepList";
import Tabs from "@/components/ui/Tabs";
import { apiFetch } from "@/lib/api";
import type { CareGuide, GuideTopic, Plant } from "@/types";

const TABS: { id: GuideTopic; label: string }[] = [
  { id: "water", label: "물주기" },
  { id: "light", label: "빛" },
  { id: "repot", label: "분갈이" },
  { id: "fertilize", label: "비료" },
];

export default function PlantGuidePage({
  params,
}: PageProps<"/plants/[id]/guide">) {
  const { id } = use(params);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [topic, setTopic] = useState<GuideTopic>("water");
  // 한 번 받아온 탭은 다시 부르지 않는다. 만드는 데 몇 초가 걸린다.
  const [guides, setGuides] = useState<Partial<Record<GuideTopic, CareGuide>>>({});
  // 실패도 탭별로 기억한다. 탭을 옮겼다 오면 다른 탭의 오류가 남지 않는다.
  const [errors, setErrors] = useState<Partial<Record<GuideTopic, string>>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/plants/${id}`);
        const data = await res.json();
        if (alive && res.ok) setPlant(data.plant as Plant);
      } catch {
        // 제목에 쓸 이름일 뿐이다. 없으면 가이드만 보여준다.
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    // 이미 받았거나 이미 실패한 탭은 다시 부르지 않는다
    if (guides[topic] || errors[topic]) return;

    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/plants/${id}/guide?topic=${topic}`);
        const data = await res.json();

        if (!alive) return;

        if (!res.ok) {
          setErrors((prev) => ({
            ...prev,
            [topic]: data.error ?? "가이드를 불러오지 못했습니다.",
          }));
          return;
        }

        setGuides((prev) => ({ ...prev, [topic]: data as CareGuide }));
      } catch {
        if (!alive) return;

        setErrors((prev) => ({
          ...prev,
          [topic]: "가이드를 불러오지 못했습니다. 연결을 확인해 주세요.",
        }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, topic, guides, errors]);

  const guide = guides[topic];
  const error = errors[topic];
  // 결과도 오류도 아직 없으면 만드는 중이다
  const loading = !guide && !error;

  return (
    <PageShell className="max-w-3xl">
      <Link
        href={`/plants/${id}`}
        className="-ml-1 inline-flex items-center gap-0.5 text-sm text-ink-70 transition-colors hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        돌아가기
      </Link>

      <SectionTitle as="h1" className="mt-6">
        {plant ? `${plant.species} 관리법` : "관리법"}
      </SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        {[plant?.location, plant?.nickname]
          .filter(Boolean)
          .join(" · ") || "두는 자리와 키운 기간에 맞춰 만든 안내입니다."}
      </p>

      <div className="mt-7">
        <Tabs
          items={TABS}
          value={topic}
          onChange={(next) => setTopic(next as GuideTopic)}
        />
      </div>

      {/* 만드는 데 몇 초 걸린다. 화면 전체를 가리지 않고 이 자리에만 표시한다 */}
      {loading && <Loading className="mt-10" />}
      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}

      {guide && (
        <div className="mt-6 flex flex-col gap-5">
          <Panel title="언제 하나요">
            <p className="text-sm leading-relaxed text-ink">{guide.when_to}</p>
          </Panel>

          <Panel title="순서">
            <StepList steps={guide.steps} />
          </Panel>

          {guide.caution && (
            <p className="border-l-2 border-rule pl-4 text-xs leading-relaxed text-ink-45">
              {guide.caution}
            </p>
          )}
        </div>
      )}
    </PageShell>
  );
}
