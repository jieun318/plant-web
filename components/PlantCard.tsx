import type { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PhotoFrame from "@/components/ui/PhotoFrame";
import { daysSinceRegistered, daysUntilWater, waterLabel } from "@/lib/water";
import type { Plant } from "@/types";

type Props = {
  plant: Plant;
  /** 누르면 갈 곳. 기본은 식물 상세. */
  href?: string;
  /** 오른쪽 배지. 기본은 물주기 D-day. */
  badge?: ReactNode;
};

export default function PlantCard({ plant, href, badge }: Props) {
  const days = daysUntilWater(plant);
  // 오늘이거나 이미 지났으면 주의색, 여유가 있으면 정상색
  const urgent = days <= 0;

  const subtitle = [plant.location, `등록 ${daysSinceRegistered(plant)}일째`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card href={href ?? `/plants/${plant.id}`} hover>
      <PhotoFrame src={plant.photo_url} ratio="photo" />

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-base font-bold text-ink">
            {plant.nickname || plant.species}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-45">{subtitle}</p>
        </div>

        {badge ?? <Badge tone={urgent ? "clay" : "leaf"}>{waterLabel(days)}</Badge>}
      </div>
    </Card>
  );
}
