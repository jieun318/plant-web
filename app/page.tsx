"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";
import { getAccessToken } from "@/lib/auth";
import { byUrgency, needsWaterToday } from "@/lib/water";
import type { Plant } from "@/types";

export default function Home() {
  const [due, setDue] = useState<Plant[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/plants", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    <main className="py-10">
      <p className="text-xs text-neutral-400">안녕하세요</p>
      <h1 className="mt-1 text-2xl leading-snug font-semibold tracking-tight">
        어떤 식물이
        <br />
        궁금하세요?
      </h1>

      <div className="mt-10">
        <PhotoUpload />
      </div>

      {due.length > 0 && <TodoCard plants={due} />}
    </main>
  );
}

function TodoCard({ plants }: { plants: Plant[] }) {
  const names = plants.map((p) => p.nickname || p.species).join(", ");
  const thumbnail = plants.find((p) => p.photo_url)?.photo_url;

  return (
    <Link
      href="/plants"
      className="mt-10 flex items-center gap-3 rounded-xl border border-neutral-200 p-4"
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          className="size-13 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="size-13 shrink-0 rounded-lg bg-neutral-100" />
      )}

      <div className="min-w-0">
        <p className="text-base font-semibold">
          오늘 물 줄 식물 {plants.length}
        </p>
        <p className="truncate text-xs text-neutral-500">{names}</p>
      </div>
    </Link>
  );
}
