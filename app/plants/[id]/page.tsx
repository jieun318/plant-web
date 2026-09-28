"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import Caption from "@/components/ui/Caption";
import ContactSheet from "@/components/ui/ContactSheet";
import DataTable, { type DataRow } from "@/components/ui/DataTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import PhotoFrame from "@/components/ui/PhotoFrame";
import RangeChart from "@/components/ui/RangeChart";
import SectionHeader from "@/components/ui/SectionHeader";
import SpecimenLabel, { type SpecimenField } from "@/components/ui/SpecimenLabel";
import StatusText from "@/components/ui/StatusText";
import { apiFetch } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatHumidity,
  formatRange,
  formatShortDate,
  formatTemp,
} from "@/lib/format";
import { wasPlantDeleted } from "@/lib/handoff";
import { STATUS_LABEL, hasRange, type DayAverage } from "@/lib/observation";
import {
  EARLY_WARN_COUNT,
  EARLY_WINDOW_DAYS,
  countEarlyWaterings,
  daysSinceRegistered,
  daysUntilWater,
  todaysWaterLog,
  waterPhrase,
} from "@/lib/water";
import type { CareLog, DailyObservation, Device, Plant, SensorReading } from "@/types";

const LOG_TEXT: Record<CareLog["type"], string> = {
  water: "물을 줬어요",
  repot: "분갈이했어요",
  fertilize: "비료를 줬어요",
  diagnose: "증상을 진단했어요",
};

// 기기가 이만큼 조용하면 연결이 끊긴 것으로 본다
const OFFLINE_MS = 60 * 60 * 1000;

const VISIBLE_ROWS = 10;

type Journal = {
  no: number;
  device: Device | null;
  latest: SensorReading | null;
  today: string;
  photos: { date: string; photoUrl: string; capturedAt: string }[];
  chart: DayAverage[];
  observations: DailyObservation[];
};

/** S-02 관찰일지. 이 프로젝트의 중심 화면이다. */
export default function PlantJournalPage({ params }: PageProps<"/plants/[id]">) {
  const { id } = use(params);
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [journal, setJournal] = useState<Journal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watering, setWatering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // 예정일보다 이른 물주기라 되묻는 중. 숫자는 예정일까지 남은 일수.
  const [confirmDays, setConfirmDays] = useState<number | null>(null);

  const loadJournal = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/plants/${id}/journal`);
      if (res.ok) setJournal((await res.json()) as Journal);
    } catch {
      // 일지를 못 불러와도 식물 정보와 관리 기록은 보여준다
    }
  }, [id]);

  useEffect(() => {
    // 방금 지운 식물로 뒤로 가기를 한 경우. 없는 식물 안내 대신 목록으로 보낸다.
    if (wasPlantDeleted(id)) {
      router.replace("/plants");
      return;
    }

    let alive = true;

    (async () => {
      try {
        // 식물과 일지를 같이 부른다. 일지가 느려도 식물 정보는 먼저 나온다.
        const [res] = await Promise.all([apiFetch(`/api/plants/${id}`), loadJournal()]);
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
  }, [id, router, loadJournal]);

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

  const wateredToday = Boolean(todaysWaterLog(logs));
  const earlyCount = countEarlyWaterings(logs);
  // 이른 물주기가 쌓였다. 과습은 이 서비스가 막으려는 문제다.
  const tooOften = earlyCount >= EARLY_WARN_COUNT;

  const observations = journal?.observations ?? [];
  const todayObservation = observations.find((o) => o.date === journal?.today);
  const connected = Boolean(journal?.device);
  const rows = journalRows(id, observations, logs, plant, expanded);
  const lastPhoto = journal?.photos.at(-1);

  return (
    <PageShell>
      <Link href="/" className="text-sm text-soft transition-colors hover:text-ink">
        ← 오늘
      </Link>

      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}
      {!plant && !error && <Loading className="mt-10" />}

      {plant && (
        <>
          <div className="mt-6 grid items-start gap-7 md:grid-cols-[1.3fr_0.7fr]">
            <div className="min-w-0">
              <PhotoFrame
                src={lastPhoto?.photoUrl ?? plant.photo_url}
                ratio="photo"
                alt={`${plant.nickname || plant.species} 사진`}
              />
              <Caption
                left={
                  lastPhoto
                    ? `${formatDateTime(lastPhoto.capturedAt)} 촬영`
                    : `${formatDate(plant.created_at)} 등록`
                }
                right={currentReading(journal)}
              />
            </div>

            <SpecimenLabel
              heading="관찰 기록"
              no={journal ? `No. ${String(journal.no).padStart(3, "0")}` : undefined}
              name={plant.nickname || plant.species}
              scientificName={plant.scientific_name}
              fields={specimenFields(plant, journal)}
              status={statusText(todayObservation, tooOften)}
              note={statusNote(todayObservation, tooOften, earlyCount)}
              footer={
                <>
                  <Button variant="link" size="sm" href={`/plants/${plant.id}/edit`}>
                    수정
                  </Button>
                  {journal && !connected && (
                    <Button
                      variant="link"
                      size="sm"
                      href={`/plants/new?plant=${plant.id}&step=device`}
                    >
                      기기 연결
                    </Button>
                  )}
                </>
              }
            />
          </div>

          {journal && journal.photos.length > 0 && (
            <section className="mt-[34px]">
              <SectionHeader
                title="매일 10시 기록"
                aside={<span className="font-mono">{journal.photos.length}일</span>}
              />
              <ContactSheet
                className="mt-3.5"
                items={journal.photos.map((day) => ({
                  key: day.date,
                  src: day.photoUrl,
                  date: formatShortDate(day.date),
                  today: day.date === journal.today,
                }))}
              />
            </section>
          )}

          {journal && journal.chart.length > 0 && (
            <div className="mt-[34px] grid gap-7 md:grid-cols-2">
              <Chart
                title="습도"
                points={journal.chart.map((d) => ({
                  label: formatShortDate(d.date),
                  value: d.humidity,
                }))}
                min={plant.humidity_min}
                max={plant.humidity_max}
                unit="%"
                range={
                  hasRange(plant)
                    ? formatRange(plant.humidity_min!, plant.humidity_max!, "%")
                    : null
                }
              />
              <Chart
                title="온도"
                points={journal.chart.map((d) => ({
                  label: formatShortDate(d.date),
                  value: d.temp,
                }))}
                min={plant.temp_min}
                max={plant.temp_max}
                unit="°C"
                range={
                  hasRange(plant) ? formatRange(plant.temp_min!, plant.temp_max!, "°C") : null
                }
              />
            </div>
          )}

          <section className="mt-[34px]">
            <SectionHeader
              title="관찰 기록"
              aside={
                connected
                  ? "AI 가 매일 사진과 온습도를 보고 씁니다"
                  : "기기를 연결하면 매일 자동으로 관찰합니다"
              }
            />
            {rows.length === 0 ? (
              <p className="py-4 text-sm text-soft">
                {connected
                  ? "아직 일지가 없어요. 첫 관찰은 내일 오전 11시에 만들어집니다."
                  : "아직 기록이 없어요. 물을 주면 여기에 쌓입니다."}
              </p>
            ) : (
              <DataTable
                columns={[
                  { label: "날짜", nowrap: true },
                  { label: "온도", numeric: true },
                  { label: "습도", numeric: true },
                  { label: "관찰" },
                ]}
                rows={rows}
              />
            )}
            {!expanded && observations.length + logs.length > VISIBLE_ROWS && (
              <Button variant="link" size="sm" className="mt-4" onClick={() => setExpanded(true)}>
                지난 기록 더 보기
              </Button>
            )}
          </section>

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
                    아직 물 줄 때가 아니에요. 지금 주면 과습으로 뿌리가 상할 수 있습니다.
                    흙이 정말 말랐나요?
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

          {/* 배포에서는 Vercel Cron 이 매일 오전 11시에 만든다. 로컬에서 미리 보려고 둔 버튼 */}
          {process.env.NODE_ENV === "development" && (
            <ObserveNow plantId={plant.id} onDone={loadJournal} />
          )}

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

function Chart({
  title,
  points,
  min,
  max,
  unit,
  range,
}: {
  title: string;
  points: { label: string; value: number | null }[];
  min: number | null;
  max: number | null;
  unit: "°C" | "%";
  range: string | null;
}) {
  return (
    <section>
      <SectionHeader
        title={title}
        aside={range ? <span className="font-mono">적정 {range}</span> : undefined}
      />
      <div className="mt-3.5">
        <RangeChart points={points} min={min} max={max} unit={unit} />
      </div>
    </section>
  );
}

/** 사진 캡션 오른쪽 — 지금 온습도. 기기가 없으면 비운다. */
function currentReading(journal: Journal | null): string | undefined {
  if (!journal?.latest) return undefined;

  return `${formatTemp(journal.latest.temperature)} · ${formatHumidity(journal.latest.humidity)}`;
}

/** 표본 라벨의 상태. 문제가 있을 때만 글자가 나간다. */
function statusText(today: DailyObservation | undefined, tooOften: boolean) {
  if (today && today.status !== "good") return STATUS_LABEL[today.status];
  if (tooOften) return "물을 자주 주고 있어요";
  return undefined;
}

function statusNote(
  today: DailyObservation | undefined,
  tooOften: boolean,
  earlyCount: number
) {
  if (today && today.status !== "good") return today.ai_comment ?? undefined;
  if (tooOften) {
    return `최근 ${EARLY_WINDOW_DAYS}일 동안 예정보다 이른 물주기가 ${earlyCount}번 있었어요. 과습이 의심되면 진단해 보세요.`;
  }
  return undefined;
}

/** 표본 라벨의 필드. 값이 있는 줄만 남긴다. */
function specimenFields(plant: Plant, journal: Journal | null): SpecimenField[] {
  const days = daysUntilWater(plant);

  const fields: (SpecimenField | null)[] = [
    plant.location ? { label: "두는 곳", value: plant.location } : null,
    {
      label: "관찰 시작",
      value: `${formatDate(plant.created_at)} · ${daysSinceRegistered(plant)}일째`,
      mono: true,
    },
    { label: "기기", value: deviceValue(journal), mono: true },
    hasRange(plant)
      ? {
          label: "적정 온도",
          value: formatRange(plant.temp_min!, plant.temp_max!, "°C"),
          mono: true,
        }
      : null,
    hasRange(plant)
      ? {
          label: "적정 습도",
          value: formatRange(plant.humidity_min!, plant.humidity_max!, "%"),
          mono: true,
        }
      : null,
    {
      label: "다음 물주기",
      // 지났거나 오늘이면 문제다. 그때만 alert
      value:
        days <= 0 ? (
          <StatusText className="text-[12.5px]">{waterPhrase(days)}</StatusText>
        ) : (
          waterPhrase(days)
        ),
      mono: true,
    },
  ];

  return fields.filter((field): field is SpecimenField => field !== null);
}

/** 기기 칸 — 마지막 기록이 1시간 넘게 없으면 연결 끊김. */
function deviceValue(journal: Journal | null): ReactNode {
  if (!journal) return "…";
  if (!journal.device) return <span className="text-faint">미연결</span>;

  const seen = journal.device.last_seen_at;
  if (!seen) return `${journal.device.name} · 기다리는 중`;

  const ago = Date.now() - new Date(seen).getTime();
  if (ago > OFFLINE_MS) {
    return <span className="text-soft">{journal.device.name} · 연결 끊김</span>;
  }

  return `${journal.device.name} · ${Math.max(1, Math.round(ago / 60000))}분 전`;
}

/**
 * 관찰 기록 표의 줄. 날짜별 관찰과 물주기·진단 기록을 한 표에 섞는다.
 * 관찰에는 온습도가 있고, 관리 기록에는 없다.
 */
function journalRows(
  plantId: string,
  observations: DailyObservation[],
  logs: CareLog[],
  plant: Plant | null,
  expanded: boolean
): DataRow[] {
  const outside = (value: number | null, min: number | null, max: number | null) =>
    value !== null && min !== null && max !== null && (value < min || value > max);

  const fromObservations: (DataRow & { at: string })[] = observations.map((o) => ({
    key: `o-${o.id}`,
    // 같은 날 관리 기록보다 아래에 오도록 그날 끝으로 둔다
    at: `${o.date}T00:00`,
    cells: [
      formatShortDate(o.date),
      {
        value: o.avg_temp === null ? "-" : formatTemp(o.avg_temp),
        alert: outside(o.avg_temp, plant?.temp_min ?? null, plant?.temp_max ?? null),
      },
      {
        value: o.avg_humidity === null ? "-" : formatHumidity(o.avg_humidity),
        alert: outside(o.avg_humidity, plant?.humidity_min ?? null, plant?.humidity_max ?? null),
      },
      o.status === "good" ? (
        o.ai_comment
      ) : (
        <>
          <StatusText className="text-[13px]">{STATUS_LABEL[o.status]}</StatusText>{" "}
          {o.ai_comment}
        </>
      ),
    ],
  }));

  const fromLogs: (DataRow & { at: string })[] = logs.map((log) => ({
    key: `l-${log.id}`,
    at: log.created_at,
    cells: [
      formatShortDate(log.created_at),
      "",
      "",
      log.diagnosis_id ? (
        <Button variant="link" href={`/plants/${plantId}/diagnoses/${log.diagnosis_id}`}>
          {log.memo || LOG_TEXT[log.type]}
        </Button>
      ) : (
        log.memo || LOG_TEXT[log.type]
      ),
    ],
  }));

  const all = [...fromObservations, ...fromLogs].sort((a, b) => b.at.localeCompare(a.at));

  return (expanded ? all : all.slice(0, VISIBLE_ROWS)).map((row) => ({
    key: row.key,
    cells: row.cells,
  }));
}

/** 개발용. 관찰을 지금 만들어 본다. 배포에서는 Cron 이 한다. */
function ObserveNow({ plantId, onDone }: { plantId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(days: number) {
    if (busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const res = await apiFetch("/api/cron/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId, days }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "만들지 못했습니다.");
        return;
      }

      setMessage(`${data.made}건 만들었어요`);
      onDone();
    } catch {
      setMessage("만들지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-[34px]">
      <SectionHeader title="개발용" aside="로컬에서만 보입니다" />
      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <Button variant="link" size="sm" onClick={() => run(1)} disabled={busy}>
          지금 관찰 생성
        </Button>
        <Button variant="link" size="sm" onClick={() => run(14)} disabled={busy}>
          지난 14일 채우기
        </Button>
        {(busy || message) && (
          <span className="text-[13px] text-soft">{busy ? "만드는 중..." : message}</span>
        )}
      </div>
    </section>
  );
}
