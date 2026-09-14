import type { ReactNode } from "react";
import SectionTitle from "./SectionTitle";

// 목록이 비었을 때. 제목만 덩그러니 두지 않고 다음 행동까지 붙인다.

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-rule bg-sheet px-6 py-12 text-center">
      <SectionTitle as="h2">{title}</SectionTitle>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-70">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
