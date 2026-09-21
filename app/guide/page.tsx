"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import PhotoUpload from "@/components/PhotoUpload";
import PlantCard from "@/components/PlantCard";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import type { Plant } from "@/types";

// 관리 가이드는 식물마다 다르다. 어떤 식물의 가이드를 볼지 먼저 고르게 한다.
export default function GuideIndexPage() {
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

        setPlants(data as Plant[]);
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

  return (
    <PageShell>
      <SectionTitle as="h1">관리 가이드</SectionTitle>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-70">
        같은 종이라도 두는 자리와 키운 기간에 따라 답이 달라집니다. 등록한 식물을
        고르면 그 환경에 맞춘 가이드를 보여드립니다.
      </p>

      {!plants && !error && <Loading className="mt-10" />}
      {error && <ErrorMessage className="mt-10">{error}</ErrorMessage>}

      {plants && plants.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title="가이드를 만들 식물이 없어요"
            description="식물을 먼저 등록하면 그 식물에 맞는 관리법을 만들어 드립니다."
            action={<PhotoUpload variant="button" />}
          />
        </div>
      )}

      {plants && plants.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              href={`/plants/${plant.id}/guide`}
              badge={<Badge tone="leaf">가이드 보기</Badge>}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
