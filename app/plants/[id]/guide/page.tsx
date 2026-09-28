"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import StepList from "@/components/ui/StepList";
import Tabs from "@/components/ui/Tabs";
import { apiFetch } from "@/lib/api";
import type { CareGuide, GuideTopic, Plant } from "@/types";

// 가이드 하나를 만드는 데 걸리는 시간의 한계. 넘으면 멈추고 다시 시도하게 한다.
const TIMEOUT_MS = 20_000;

const TABS: { id: GuideTopic; label: string }[] = [
  { id: "water", label: "물주기" },
  { id: "light", label: "빛" },
  { id: "repot", label: "분갈이" },
  { id: "fertilize", label: "비료" },
];

/** 가이드 하나를 받아온다. 없으면 서버가 만들어서 준다 (몇 초 걸린다). */
async function fetchGuide(
  plantId: string,
  topic: GuideTopic,
  signal?: AbortSignal
): Promise<CareGuide> {
  const res = await apiFetch(`/api/plants/${plantId}/guide?topic=${topic}`, { signal });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error ?? "가이드를 불러오지 못했습니다.");

  return data as CareGuide;
}

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

  // 화면이 아직 열려 있는지. 배경 생성은 탭을 옮겨도 끊기지 않고 끝까지 돌아야 한다.
  const open = useRef(true);
  useEffect(() => {
    open.current = true;
    return () => {
      open.current = false;
    };
  }, []);

  // 받아온 탭을 effect 바깥에서도 보려고 따로 들고 있는다 (배경 생성 루프에서 쓴다)
  const loaded = useRef<Partial<Record<GuideTopic, CareGuide>>>({});
  const save = useCallback((topic: GuideTopic, guide: CareGuide) => {
    loaded.current[topic] = guide;
    setGuides((prev) => ({ ...prev, [topic]: guide }));
  }, []);

  // 받아오는 중인 탭의 약속을 들고 있는다. 보고 있는 탭과 배경 생성이 같은 탭을
  // 두 번 부르지 않게 하고, 개발 모드에서 effect 가 두 번 실행돼도 한 번만 부르게 한다.
  const inFlight = useRef<Map<GuideTopic, Promise<CareGuide>>>(new Map());

  const load = useCallback(
    (topic: GuideTopic) => {
      const already = inFlight.current.get(topic);
      if (already) return already;

      // 만드는 데 오래 걸리면 멈춘다. 빈 화면으로 기다리게 두지 않는다.
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);

      const pending = fetchGuide(id, topic, stop.signal).finally(() => {
        clearTimeout(timer);
        inFlight.current.delete(topic);
      });

      inFlight.current.set(topic, pending);
      return pending;
    },
    [id]
  );

  useEffect(() => {
    // 이미 받았거나 이미 실패한 탭은 다시 부르지 않는다
    if (guides[topic] || errors[topic]) return;

    let alive = true;

    (async () => {
      try {
        const guide = await load(topic);
        if (alive) save(topic, guide);
      } catch (e) {
        if (!alive) return;

        setErrors((prev) => ({
          ...prev,
          [topic]:
            e instanceof Error && e.name === "AbortError"
              ? "만드는 데 너무 오래 걸려 멈췄어요."
              : e instanceof Error
                ? e.message
                : "가이드를 불러오지 못했습니다. 연결을 확인해 주세요.",
        }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [topic, guides, errors, load, save]);

  // 보고 있는 탭이 나오면 나머지 탭을 배경에서 미리 만들어 둔다.
  // 탭을 눌렀을 때 또 몇 초를 기다리지 않게 하려는 것이다.
  // 한 번에 하나씩 순서대로 부른다 (Gemini 분당 한도를 건드리지 않으려고).
  // 여기서 실패해도 화면에 알리지 않는다. 그 탭을 직접 열면 위 effect 가 다시 부른다.
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current || !guides[topic]) return;
    prefetched.current = true;

    // 이 루프는 effect 가 다시 실행돼도 끊지 않는다. 끊으면 다음 탭을 영영 만들지 않는다.
    // 화면을 떠나면 open 이 false 가 되어 멈춘다.
    (async () => {
      for (const tab of TABS) {
        if (!open.current) return;
        if (loaded.current[tab.id]) continue;

        try {
          const guide = await load(tab.id);
          if (open.current) save(tab.id, guide);
        } catch {
          // 조용히 넘어간다. 그 탭을 직접 열면 위 effect 가 다시 부른다.
        }
      }
    })();
  }, [topic, guides, load, save]);

  const guide = guides[topic];
  const error = errors[topic];
  // 결과도 오류도 아직 없으면 만드는 중이다
  const loading = !guide && !error;

  return (
    <PageShell className="max-w-3xl">
      <Link href={`/plants/${id}`} className="text-sm text-soft transition-colors hover:text-ink">
        ← 돌아가기
      </Link>

      <SectionTitle as="h1" className="mt-6">
        {plant ? `${plant.species} 관리법` : "관리법"}
      </SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-soft">
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

      {/* 만드는 데 몇 초 걸린다. 화면 전체를 가리지 않고 탭 아래에만 표시한다 */}
      {loading && (
        <div className="mt-6">
          <Loading label="관리법을 만드는 중입니다..." />
          <p className="mt-1.5 text-xs leading-relaxed text-soft">
            처음 여는 탭은 몇 초 걸려요. 한 번 만들어 두면 다음부터는 바로 열립니다.
          </p>
        </div>
      )}
      {error && (
        <>
          <ErrorMessage className="mt-6">{error}</ErrorMessage>
          {/* 실패를 지우면 위의 effect 가 이 탭을 다시 부른다 */}
          <Button
            variant="link"
            size="sm"
            className="mt-3"
            onClick={() =>
              setErrors((prev) => {
                const next = { ...prev };
                delete next[topic];
                return next;
              })
            }
          >
            다시 시도
          </Button>
        </>
      )}

      {guide && (
        <div className="mt-8 flex flex-col gap-9">
          <Panel title="언제 하나요">
            <p className="text-sm leading-relaxed text-ink">{guide.when_to}</p>
          </Panel>

          <Panel title="순서">
            <StepList steps={guide.steps} />
          </Panel>

          {guide.caution && (
            <p className="text-xs leading-relaxed text-soft">
              {guide.caution}
            </p>
          )}
        </div>
      )}
    </PageShell>
  );
}
