"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import InfoRow from "@/components/ui/InfoRow";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import Timeline, { type TimelineItem } from "@/components/ui/Timeline";
import { apiFetch } from "@/lib/api";
import { wasPlantDeleted } from "@/lib/handoff";
import {
  EARLY_WARN_COUNT,
  countEarlyWaterings,
  daysSinceRegistered,
  daysUntilWater,
  todaysWaterLog,
  waterPhrase,
} from "@/lib/water";
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
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watering, setWatering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // 예정일보다 이른 물주기라 되묻는 중. 숫자는 예정일까지 남은 일수.
  const [confirmDays, setConfirmDays] = useState<number | null>(null);

  useEffect(() => {
    // 방금 지운 식물로 뒤로 가기를 한 경우. 없는 식물 안내 대신 목록으로 보낸다.
    if (wasPlantDeleted(id)) {
      router.replace("/plants");
      return;
    }

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
  }, [id, router]);

  /** force 는 "그래도 주겠다"는 확인을 거쳤다는 뜻이다. */
  async function water(force = false) {
    if (watering) return;

    setWatering(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${id}/water`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "기록하지 못했습니다.");
        return;
      }

      // 아직 줄 때가 아니다. 아무것도 기록되지 않았고, 한 번 더 묻는다.
      if (data.needsConfirm) {
        setConfirmDays(data.daysLeft as number);
        return;
      }

      setConfirmDays(null);
      setPlant(data.plant);
      const log = data.log as CareLog | null;
      if (log) {
        setLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [log, ...prev]));
      }
    } catch {
      setError("기록에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setWatering(false);
    }
  }

  /** 실수로 눌렀을 때. 오늘 기록만 지우고 물주기 날짜를 되돌린다. */
  async function cancelWater() {
    if (watering) return;

    setWatering(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${id}/water`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "취소하지 못했습니다.");
        return;
      }

      setPlant(data.plant);
      setLogs((prev) => prev.filter((log) => log.id !== data.removedLogId));
    } catch {
      setError("취소에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setWatering(false);
    }
  }

  const visible = expanded ? logs : logs.slice(0, VISIBLE_LOGS);
  const hidden = logs.length - visible.length;

  // 같은 날 여러 건이 쌓이므로 시각까지 적는다
  const items: TimelineItem[] = visible.map((log) => ({
    id: log.id,
    date: formatDateTime(log.created_at),
    text: log.memo || LOG_TEXT[log.type],
    // 진단 기록은 눌러서 그때 결과를 다시 본다
    href: log.diagnosis_id ? `/plants/${id}/diagnoses/${log.diagnosis_id}` : undefined,
  }));

  const wateredToday = Boolean(todaysWaterLog(logs));
  const tooOften = countEarlyWaterings(logs) >= EARLY_WARN_COUNT;

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

      {/* 이른 물주기가 쌓였다. 과습은 이 서비스가 막으려는 문제다. */}
      {plant && tooOften && (
        <Panel className="mt-6">
          <p className="text-sm leading-relaxed text-clay">
            최근 물을 자주 주고 있어요. 과습이 의심되면 진단해 보세요.
          </p>
          <Button
            href={`/diagnose?plantId=${plant.id}`}
            variant="ghost"
            size="sm"
            className="mt-3"
          >
            진단해 보기
          </Button>
        </Panel>
      )}

      {plant && (
        <div className="mt-6 grid items-start gap-8 md:grid-cols-2 md:gap-12">
          {/* 왼쪽: 지금 이 식물이 어떤 상태인지 */}
          <div className="flex flex-col gap-6">
            <PhotoFrame src={plant.photo_url} ratio="video" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionTitle as="h1">
                  {plant.nickname || plant.species}
                </SectionTitle>
                <p className="mt-1 text-xs text-ink-45">
                  {[plant.location, `${daysSinceRegistered(plant)}일째 함께`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Button
                href={`/plants/${plant.id}/edit`}
                variant="ghost"
                size="sm"
                className="shrink-0"
              >
                수정
              </Button>
            </div>

            <Panel className="text-center">
              <p className="text-xs text-ink-45">다음 물주기</p>
              <p className="mt-1 font-serif text-3xl font-bold tracking-tight text-leaf">
                {waterPhrase(daysUntilWater(plant))}
              </p>
            </Panel>

            {/* 등록할 때 복사해 둔 종 정보. 판별 기록이 지워져도 남는다. */}
            <SpeciesPanel plant={plant} />
          </div>

          {/* 오른쪽: 무엇을 할 수 있는지와 지금까지의 기록 */}
          <div className="flex flex-col gap-6">
            <Panel title="관리">
              <div className="flex flex-col gap-2">
                {wateredToday ? (
                  <>
                    <Button disabled full>
                      오늘 물 줬어요 ✓
                    </Button>
                    <p className="text-center text-xs text-ink-45">
                      다음 물주기는 {waterPhrase(daysUntilWater(plant))}예요
                    </p>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={cancelWater}
                      disabled={watering}
                    >
                      기록 취소
                    </Button>
                  </>
                ) : confirmDays !== null ? (
                  <>
                    <p className="text-sm leading-relaxed text-clay">
                      아직 물 줄 때가 아니에요. 지금 주면 과습으로 뿌리가 상할 수
                      있습니다. 흙이 정말 말랐나요?
                    </p>
                    <Button onClick={() => water(true)} disabled={watering} full>
                      {watering ? "기록 중..." : "흙이 말랐어요, 기록할게요"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDays(null)}
                      disabled={watering}
                      full
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => water()} disabled={watering} full>
                    {watering ? "기록 중..." : "물 줬어요"}
                  </Button>
                )}
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

function SpeciesPanel({ plant }: { plant: Plant }) {
  // 예전에 등록한 식물에는 종 정보가 없다. 있는 줄만 보여준다.
  const rows = (
    [
      ["학명", plant.scientific_name],
      ["난이도", plant.difficulty],
      ["원산지", plant.origin],
      ["빛", plant.light],
      ["물", plant.water],
      ["습도", plant.humidity],
      ["분갈이", plant.repot],
    ] as const
  ).filter(([, value]) => Boolean(value));

  if (rows.length === 0) return null;

  return (
    <Panel title={plant.species}>
      <dl>
        {rows.map(([label, value]) => (
          <InfoRow
            key={label}
            label={label}
            value={label === "학명" ? <span className="italic">{value}</span> : value}
          />
        ))}
      </dl>
    </Panel>
  );
}

/** 9월 16일 14:20 — 같은 날 여러 건을 구분해야 해서 시각까지 적는다. */
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
