"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import PhotoUpload from "@/components/PhotoUpload";
import PlantCard from "@/components/PlantCard";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import { byUrgency, needsWaterToday } from "@/lib/water";
import type { Plant } from "@/types";

export default function PlantsPage() {
  // null = 아직 불러오는 중
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    </PageShell>
  );
}
