"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import Timeline, { type TimelineItem } from "@/components/ui/Timeline";
import { apiFetch } from "@/lib/api";
import { daysSinceRegistered, daysUntilWater, waterPhrase } from "@/lib/water";
import type { CareLog, Plant } from "@/types";

const LOG_TEXT: Record<CareLog["type"], string> = {
  water: "물을 줬어요",
  repot: "분갈이했어요",
  fertilize: "비료를 줬어요",
  diagnose: "증상을 진단했어요",
};

const VISIBLE_LOGS = 5;

export default function PlantDetailPage({ params }: PageProps<"/plants/[id]">) {
  const { id } = use(params);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watering, setWatering] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/plants/${id}`);
        const data = await res.json();

        if (!alive) return;

        if (!res.ok) {
          setError(data.error ?? "불러오지 못했습니다.");
          return;
        }

        setPlant(data.plant);
        setLogs(data.logs);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  async function water() {
    if (watering) return;

    setWatering(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${id}/water`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "기록하지 못했습니다.");
        return;
      }

      setPlant(data.plant);
      if (data.log) setLogs((prev) => [data.log, ...prev]);
    } catch {
      setError("기록에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setWatering(false);
    }
  }

  const visible = expanded ? logs : logs.slice(0, VISIBLE_LOGS);
  const hidden = logs.length - visible.length;

  const items: TimelineItem[] = visible.map((log) => ({
    id: log.id,
    date: formatDate(log.created_at),
    text: log.memo || LOG_TEXT[log.type],
  }));

  return (
    <PageShell>
      <Link
        href="/plants"
        className="-ml-1 inline-flex items-center gap-0.5 text-sm text-ink-70 transition-colors hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        내 식물
      </Link>

      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}
      {!plant && !error && <Loading className="mt-10" />}

      {plant && (
        <div className="mt-6 grid items-start gap-8 md:grid-cols-2 md:gap-12">
          {/* 왼쪽: 지금 이 식물이 어떤 상태인지 */}
          <div className="flex flex-col gap-6">
            <PhotoFrame src={plant.photo_url} ratio="video" />

            <div>
              <SectionTitle as="h1">
                {plant.nickname || plant.species}
              </SectionTitle>
              <p className="mt-1 text-xs text-ink-45">
                {[plant.location, `${daysSinceRegistered(plant)}일째 함께`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <Panel className="text-center">
              <p className="text-xs text-ink-45">다음 물주기</p>
              <p className="mt-1 font-serif text-3xl font-bold tracking-tight text-leaf">
                {waterPhrase(daysUntilWater(plant))}
              </p>
            </Panel>
          </div>

          {/* 오른쪽: 무엇을 할 수 있는지와 지금까지의 기록 */}
          <div className="flex flex-col gap-6">
            <Panel title="관리">
              <div className="flex flex-col gap-2">
                <Button onClick={water} disabled={watering} full>
                  {watering ? "기록 중..." : "물 줬어요"}
                </Button>
                <Button href={`/diagnose?plantId=${plant.id}`} variant="ghost" full>
                  잎이 이상해요 · 진단하기
                </Button>
                <Button href={`/plants/${plant.id}/guide`} variant="quiet" full>
                  관리 가이드 보기
                </Button>
              </div>
            </Panel>

            <Panel title="기록">
              {logs.length === 0 ? (
                <p className="text-sm text-ink-45">
                  아직 기록이 없어요. 물을 주면 여기에 쌓입니다.
                </p>
              ) : (
                <>
                  <Timeline items={items} />
                  {hidden > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      full
                      className="mt-4"
                      onClick={() => setExpanded(true)}
                    >
                      기록 {hidden}건 더 보기
                    </Button>
                  )}
                </>
              )}
            </Panel>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}
