import type { ReactNode } from "react";

// 구획 머리. 제목 + 오른쪽 보조 텍스트 + 아래 먹색 1px 선.
// 화면은 카드가 아니라 이 선과 여백으로 나눈다.

type Props = {
  title: ReactNode;
  /** 오른쪽 보조 텍스트. 날짜·개수 같은 것은 mono 로 넘긴다 */
  aside?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
};

export default function SectionHeader({ title, aside, as: Tag = "h2", className }: Props) {
  return (
    <div
      className={[
        "flex items-baseline justify-between gap-3 border-b border-ink pb-[7px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Tag className="text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</Tag>
      {aside && <div className="shrink-0 text-[11px] text-soft">{aside}</div>}
    </div>
  );
}
