"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import PhotoUpload from "@/components/PhotoUpload";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import { byUrgency, needsWaterToday } from "@/lib/water";
import type { Plant } from "@/types";

export default function Home() {
  const [due, setDue] = useState<Plant[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch("/api/plants");
        if (!res.ok) return;

        const plants = (await res.json()) as Plant[];
        if (alive) setDue(plants.filter(needsWaterToday).sort(byUrgency));
      } catch {
        // 오늘 할 일은 보조 정보다. 못 불러오면 영역을 접는다.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <PageShell>
      <div className="grid items-start gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
        <div>
          <p className="text-xs tracking-wide text-ink-45">안녕하세요</p>

          <h1 className="mt-2 font-serif text-4xl leading-tight font-bold tracking-tight text-ink md:text-5xl">
            어떤 식물이
            <br />
            궁금하세요?
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-70">
            사진 한 장이면 어떤 식물인지 알려드립니다. 등록해두면 물 줄 날짜와
            관리법까지 이어서 챙겨드려요.
          </p>

          {due.length > 0 && <TodayCard plants={due} />}
        </div>

        <PhotoUpload />
      </div>
    </PageShell>
  );
}

function TodayCard({ plants }: { plants: Plant[] }) {
  const names = plants.map((p) => p.nickname || p.species).join(", ");
  const thumbnail = plants.find((p) => p.photo_url)?.photo_url;

  return (
    <Card href="/plants" hover className="mt-10 max-w-md">
      <div className="flex items-center gap-4">
        <PhotoFrame
          src={thumbnail}
          ratio="square"
          className="size-14 shrink-0 rounded-md"
        />

        <div className="min-w-0 flex-1">
          <SectionTitle as="h2">오늘 물 줄 식물 {plants.length}</SectionTitle>
          <p className="mt-0.5 truncate text-xs text-ink-45">{names}</p>
        </div>

        <Badge tone="clay">오늘</Badge>
      </div>
    </Card>
  );
}
