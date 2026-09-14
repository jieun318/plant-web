import type { ReactNode } from "react";

// 섹션 제목. 제목은 명조로 쓴다.

type Props = {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
};

export default function SectionTitle({ as: Tag = "h2", className, children }: Props) {
  const size = Tag === "h1" ? "text-3xl" : "text-lg";

  return (
    <Tag
      className={["font-serif font-bold tracking-tight text-ink", size, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
