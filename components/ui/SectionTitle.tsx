import type { ReactNode } from "react";

// 화면 제목. 본문과 같은 산세리프를 굵게 쓴다. 제목 위에 작은 라벨(kicker)을 얹지 않는다.
// 구획 제목은 SectionHeader 를 쓴다.

type Props = {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
};

const SIZE = {
  h1: "text-[27px] leading-tight tracking-[-0.03em]",
  h2: "text-[15px] tracking-[-0.01em]",
  h3: "text-sm",
};

export default function SectionTitle({ as: Tag = "h2", className, children }: Props) {
  return (
    <Tag className={["font-bold text-ink", SIZE[Tag], className].filter(Boolean).join(" ")}>
      {children}
    </Tag>
  );
}
