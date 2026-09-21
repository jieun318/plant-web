"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import PhotoUpload from "@/components/PhotoUpload";
import PlantCard from "@/components/PlantCard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import { byUrgency, needsWaterToday } from "@/lib/water";
import type { Identification, Plant } from "@/types";

export default function PlantsPage() {
  // null = 아직 불러오는 중
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 아직 등록하지 않은 판별 기록. 보조 정보라 실패하면 그냥 접는다.
  const [recent, setRecent] = useState<Identification[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch("/api/plants");
        const data = await res.json();

        if (!alive) return;

        if (!res.ok) {
          setError(data.error ?? "목록을 불러오지 못했습니다.");
          return;
        }

        // 등록순이 아니라 급한 순으로 보여준다
        setPlants((data as Plant[]).sort(byUrgency));
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch("/api/identifications");
        if (!res.ok) return;

        const data = (await res.json()) as Identification[];
        if (alive) setRecent(data);
      } catch {
        // 최근 본 식물은 없어도 목록을 보는 데 지장이 없다
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const dueCount = plants?.filter(needsWaterToday).length ?? 0;

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionTitle as="h1">내 식물</SectionTitle>
          {plants && plants.length > 0 && (
            <p className="mt-1 text-xs text-ink-45">
              {plants.length}개 · 오늘 물 줄 식물 {dueCount}
            </p>
          )}
        </div>

        {plants && plants.length > 0 && (
          <Button href="/" variant="ghost" size="sm">
            새 식물 추가
          </Button>
        )}
      </div>

      {/* 불러오는 동안 화면 전체를 가리지 않고 이 자리에만 표시한다 */}
      {!plants && !error && <Loading className="mt-10" />}
      {error && <ErrorMessage className="mt-10">{error}</ErrorMessage>}

      {plants && plants.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title="아직 등록한 식물이 없어요"
            description="사진을 올리면 어떤 식물인지 알려드리고, 여기에 모아 물 줄 날짜를 챙겨드립니다."
            action={<PhotoUpload variant="button" />}
          />
        </div>
      )}

      {plants && plants.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}

      {recent.length > 0 && <RecentSection records={recent} />}
    </PageShell>
  );
}

/** 판별만 하고 등록하지 않은 것들. 등록한 식물과 섞이지 않게 선을 긋는다. */
function RecentSection({ records }: { records: Identification[] }) {
  return (
    <section className="mt-14 border-t border-rule pt-8">
      <SectionTitle as="h2">최근 본 식물</SectionTitle>
      <p className="mt-1 text-xs text-ink-45">
        아직 등록하지 않은 판별이에요. 누르면 다시 등록할 수 있어요.
      </p>

      <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
        {records.map((record) => (
          <Card
            key={record.id}
            href={`/result?id=${record.id}`}
            hover
            className="w-40 shrink-0"
          >
            <PhotoFrame src={record.photo_url} ratio="square" />
            <p className="mt-3 truncate font-serif text-sm font-bold text-ink">
              {record.korean_name}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
