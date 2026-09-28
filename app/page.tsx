"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import Caption from "@/components/ui/Caption";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusText from "@/components/ui/StatusText";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatHumidity, formatTemp } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/observation";
import type { DailyObservation, Device, Plant, SensorReading } from "@/types";

type Row = {
  plant: Plant;
  device: Device | null;
  /** 기기가 1시간 넘게 조용한지. 서버가 판단해서 준다 */
  offline: boolean;
  observation: DailyObservation | null;
  photoUrl: string | null;
  capturedAt: string | null;
  latest: SensorReading | null;
};

/** S-01 오늘. 내 식물들의 오늘 상태를 한눈에 보는 첫 화면. */
export default function TodayPage() {
  // null = 아직 불러오는 중
  const [rows, setRows] = useState<Row[] | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch("/api/today");
        const data = await res.json();

        if (!alive) return;

        if (!res.ok) {
          setError(data.error ?? "불러오지 못했습니다.");
          return;
        }

        setRows(data.plants as Row[]);
        setToday(data.today as string);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const watching = rows?.filter((r) => r.device).length ?? 0;
  const needCheck = rows?.filter((r) => r.observation?.status === "check").length ?? 0;
  const noDevice = rows?.filter((r) => !r.device).length ?? 0;

  return (
    <PageShell>
      <SectionTitle as="h1">오늘의 식물</SectionTitle>

      <SectionHeader
        className="mt-6"
        title={
          rows && rows.length > 0 ? (
            <span className="font-normal">
              관찰 중 <span className="font-mono font-bold">{watching}</span> · 확인 필요{" "}
              <span className={`font-mono font-bold ${needCheck > 0 ? "text-alert" : ""}`}>
                {needCheck}
              </span>{" "}
              · 기기 미연결 <span className="font-mono font-bold">{noDevice}</span>
            </span>
          ) : (
            "내 식물"
          )
        }
        aside={today && <span className="font-mono">{today.replaceAll("-", ".")} 기준</span>}
      />

      {!rows && !error && <Loading className="mt-6" />}
      {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}

      {rows && rows.length === 0 && (
        <EmptyState
          title="아직 관찰하는 식물이 없어요"
          description="사진 한 장으로 종을 알아보고, 기기를 연결하면 매일 사진과 온습도를 기록해 관찰일지를 써드립니다."
          action={<Button href="/plants/new">식물 추가</Button>}
        />
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <PlantToday key={row.plant.id} row={row} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function PlantToday({ row }: { row: Row }) {
  const { plant, device, observation, latest, offline } = row;
  const name = plant.nickname || plant.species;
  const journal = `/plants/${plant.id}`;

  // 기기가 있으면 칸 전체가 일지로 가는 링크다.
  // 없을 때는 "기기 연결" 링크를 따로 두어야 해서 칸 전체를 링크로 만들지 않는다.
  return (
    <Card href={device ? journal : undefined}>
      {/* 기기가 없으면 등록 사진뿐이다. 오늘 기록이 아니라는 뜻으로 흐리게 둔다 */}
      <PhotoFrame
        src={row.photoUrl}
        ratio="photo"
        alt={`${name} 사진`}
        className={device ? undefined : "opacity-50"}
      />
      <Caption
        left={row.capturedAt ? `${formatDateTime(row.capturedAt)} 촬영` : "등록 사진"}
        right={
          latest ? `${formatTemp(latest.temperature)} · ${formatHumidity(latest.humidity)}` : undefined
        }
      />

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-bold text-ink group-hover:underline">
          {device ? name : <Link href={journal} className="hover:underline">{name}</Link>}
        </p>
        {observation && observation.status !== "good" ? (
          <StatusText>{STATUS_LABEL[observation.status]}</StatusText>
        ) : !device ? (
          <span className="shrink-0 text-xs text-faint">기기 미연결</span>
        ) : offline ? (
          <span className="shrink-0 text-xs text-soft">연결 끊김</span>
        ) : null}
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-soft">
        {observation?.ai_comment ??
          (device
            ? "아직 오늘 관찰이 없어요. 오전 11시에 만들어집니다."
            : "기기를 연결하면 매일 자동으로 관찰합니다.")}
      </p>

      {!device && (
        <Button
          variant="link"
          size="sm"
          href={`/plants/new?plant=${plant.id}&step=device`}
          className="mt-2"
        >
          기기 연결
        </Button>
      )}
    </Card>
  );
}
