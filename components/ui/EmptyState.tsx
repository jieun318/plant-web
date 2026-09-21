import type { ReactNode } from "react";

// 목록이 비었을 때. 제목만 덩그러니 두지 않고 다음 행동까지 붙인다. 박스는 두르지 않는다.

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="py-10">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-soft">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
