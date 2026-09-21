"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import Caption from "@/components/ui/Caption";
import DataTable, { type DataRow } from "@/components/ui/DataTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import SpecimenLabel, { type SpecimenField } from "@/components/ui/SpecimenLabel";
import StatusText from "@/components/ui/StatusText";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { wasPlantDeleted } from "@/lib/handoff";
import {
  EARLY_WARN_COUNT,
  EARLY_WINDOW_DAYS,
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

  // 같은 날 여러 건이 쌓이므로 시각까지 적는다. 진단 기록은 눌러서 그때 결과를 다시 본다.
  const rows: DataRow[] = visible.map((log) => {
    const text = log.memo || LOG_TEXT[log.type];

    return {
      key: log.id,
      cells: [
        formatDateTime(log.created_at),
        log.diagnosis_id ? (
          <Button variant="link" href={`/plants/${id}/diagnoses/${log.diagnosis_id}`}>
            {text}
          </Button>
        ) : (
          text
        ),
      ],
    };
  });

  const wateredToday = Boolean(todaysWaterLog(logs));
  const earlyCount = countEarlyWaterings(logs);
  // 이른 물주기가 쌓였다. 과습은 이 서비스가 막으려는 문제다.
  const tooOften = earlyCount >= EARLY_WARN_COUNT;

  return (
    <PageShell>
      <Link href="/plants" className="text-sm text-soft transition-colors hover:text-ink">
        ← 내 식물
      </Link>

      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}
      {!plant && !error && <Loading className="mt-10" />}

      {plant && (
        <>
          <div className="mt-6 grid items-start gap-7 md:grid-cols-[1.3fr_0.7fr]">
            <div className="min-w-0">
              <PhotoFrame src={plant.photo_url} ratio="photo" />
              <Caption
                left={`${formatDate(plant.created_at)} 등록`}
                right={`물주기 ${plant.water_interval}일 간격`}
              />
            </div>

            <SpecimenLabel
              heading="관찰 기록"
              name={plant.nickname || plant.species}
              scientificName={plant.scientific_name}
              fields={specimenFields(plant)}
              status={tooOften ? "물을 자주 주고 있어요" : undefined}
              note={
                tooOften
                  ? `최근 ${EARLY_WINDOW_DAYS}일 동안 예정보다 이른 물주기가 ${earlyCount}번 있었어요. 과습이 의심되면 진단해 보세요.`
                  : undefined
              }
              footer={
                <Button variant="link" size="sm" href={`/plants/${plant.id}/edit`}>
                  수정
                </Button>
              }
            />
          </div>

          <section className="mt-[34px] max-w-md">
            <SectionHeader
              title="물주기"
              aside={<span className="font-mono">다음 {waterPhrase(daysUntilWater(plant))}</span>}
            />
            <div className="mt-4 flex flex-col gap-3">
              {wateredToday ? (
                <>
                  <Button disabled full>
                    오늘 물 줬어요
                  </Button>
                  <p className="text-xs text-soft">
                    다음 물주기는 {waterPhrase(daysUntilWater(plant))}예요 ·{" "}
                    <Button variant="link" size="sm" onClick={cancelWater} disabled={watering}>
                      기록 취소
                    </Button>
                  </p>
                </>
              ) : confirmDays !== null ? (
                <>
                  <p className="text-sm leading-relaxed text-alert">
                    아직 물 줄 때가 아니에요. 지금 주면 과습으로 뿌리가 상할 수
                    있습니다. 흙이 정말 말랐나요?
                  </p>
                  <Button onClick={() => water(true)} disabled={watering} full>
                    {watering ? "기록 중..." : "흙이 말랐어요, 기록할게요"}
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => setConfirmDays(null)}
                    disabled={watering}
                    className="self-start"
                  >
                    취소
                  </Button>
                </>
              ) : (
                <Button onClick={() => water()} disabled={watering} full>
                  {watering ? "기록 중..." : "물 줬어요"}
                </Button>
              )}
            </div>
          </section>

          <section className="mt-[34px]">
            <SectionHeader
              title="기록"
              aside={<span className="font-mono">{logs.length}건</span>}
            />
            {logs.length === 0 ? (
              <p className="py-4 text-sm text-soft">
                아직 기록이 없어요. 물을 주면 여기에 쌓입니다.
              </p>
            ) : (
              <DataTable
                columns={[{ label: "날짜", nowrap: true }, { label: "기록" }]}
                rows={rows}
              />
            )}
            {hidden > 0 && (
              <Button variant="link" size="sm" className="mt-4" onClick={() => setExpanded(true)}>
                기록 {hidden}건 더 보기
              </Button>
            )}
          </section>

          <div className="mt-[26px] flex flex-wrap items-baseline gap-x-[26px] gap-y-2 text-[13px]">
            <span className="text-soft">필요할 때만</span>
            <Button variant="link" href={`/diagnose?plantId=${plant.id}`}>
              직접 사진 찍어 진단하기
            </Button>
            <Button variant="link" href={`/plants/${plant.id}/guide`}>
              관리 가이드
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}

/** 표본 라벨의 필드. 등록할 때 복사해 둔 종 정보 중 값이 있는 것만. */
function specimenFields(plant: Plant): SpecimenField[] {
  const days = daysUntilWater(plant);

  const fields: (SpecimenField | null)[] = [
    plant.location ? { label: "두는 곳", value: plant.location } : null,
    {
      label: "관찰 시작",
      value: `${formatDate(plant.created_at)} · ${daysSinceRegistered(plant)}일째`,
      mono: true,
    },
    {
      label: "다음 물주기",
      // 지났거나 오늘이면 문제다. 그때만 alert
      value: days <= 0 ? <StatusText className="text-[12.5px]">{waterPhrase(days)}</StatusText> : waterPhrase(days),
      mono: true,
    },
    plant.difficulty ? { label: "난이도", value: plant.difficulty } : null,
    plant.light ? { label: "빛", value: plant.light } : null,
    plant.water ? { label: "물", value: plant.water } : null,
    plant.humidity ? { label: "습도", value: plant.humidity } : null,
    plant.repot ? { label: "분갈이", value: plant.repot } : null,
  ];

  return fields.filter((field): field is SpecimenField => field !== null);
}
