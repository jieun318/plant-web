"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import PhotoUpload from "@/components/PhotoUpload";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusText from "@/components/ui/StatusText";
import { apiFetch } from "@/lib/api";
import { byUrgency, daysUntilWater, needsWaterToday, waterLabel } from "@/lib/water";
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
        {/* min-w-0: 한 줄짜리 식물 이름이 칸을 화면 밖으로 밀어내지 않게 한다 */}
        <div className="min-w-0">
          <SectionTitle as="h1">
            어떤 식물이
            <br />
            궁금하세요?
          </SectionTitle>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-soft">
            사진 한 장이면 어떤 식물인지 알려드립니다. 등록해두면 물 줄 날짜와
            관리법까지 이어서 챙겨드려요.
          </p>

          {due.length > 0 && <DueList plants={due} />}
        </div>

        <PhotoUpload />
      </div>
    </PageShell>
  );
}

/** 오늘 물 줄 식물. 카드 대신 구획 머리와 가는 선으로 나눈 줄 목록. */
function DueList({ plants }: { plants: Plant[] }) {
  return (
    <section className="mt-12 max-w-md">
      <SectionHeader
        title="오늘 물 줄 식물"
        aside={<span className="font-mono">{plants.length}</span>}
      />
      <ul>
        {plants.map((plant) => (
          <li key={plant.id} className="border-b border-hair">
            <Link href={`/plants/${plant.id}`} className="group flex items-center gap-4 py-3">
              <PhotoFrame src={plant.photo_url} size="thumb" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink group-hover:underline">
                {plant.nickname || plant.species}
              </span>
              <StatusText>{waterLabel(daysUntilWater(plant))}</StatusText>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
