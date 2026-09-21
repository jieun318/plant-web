import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import PhotoFrame from "@/components/ui/PhotoFrame";
import StatusText from "@/components/ui/StatusText";
import { daysSinceRegistered, daysUntilWater, waterLabel } from "@/lib/water";
import type { Plant } from "@/types";

type Props = {
  plant: Plant;
  /** 누르면 갈 곳. 기본은 식물 상세. */
  href?: string;
  /** 이름 오른쪽 한 마디. 기본은 물주기 — 지났거나 오늘이면 alert, 여유 있으면 mono D-day. */
  aside?: ReactNode;
};

/** 기본 오른쪽 글자. 문제(물 줄 때가 됨)만 alert 로 쓴다. */
function WaterAside({ plant }: { plant: Plant }) {
  const days = daysUntilWater(plant);

  if (days <= 0) return <StatusText>{waterLabel(days)}</StatusText>;
  return <span className="shrink-0 font-mono text-xs text-soft">{waterLabel(days)}</span>;
}

export default function PlantCard({ plant, href, aside }: Props) {
  const subtitle = [plant.location, `등록 ${daysSinceRegistered(plant)}일째`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card href={href ?? `/plants/${plant.id}`}>
      <PhotoFrame src={plant.photo_url} ratio="photo" />

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-bold text-ink group-hover:underline">
          {plant.nickname || plant.species}
        </p>
        {aside ?? <WaterAside plant={plant} />}
      </div>
      <p className="mt-0.5 truncate text-xs text-soft">{subtitle}</p>
    </Card>
  );
}
