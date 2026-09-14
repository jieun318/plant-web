import type { ReactNode } from "react";
import SectionTitle from "./SectionTitle";

// 상세 페이지의 구획 박스. 제목을 붙일 수 있다.

type Props = {
  title?: string;
  /** 제목 오른쪽에 놓을 것 (배지 등) */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function Panel({ title, aside, className, children }: Props) {
  return (
    <section
      className={["rounded-lg border border-rule bg-sheet p-5", className]
        .filter(Boolean)
        .join(" ")}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionTitle as="h2">{title}</SectionTitle>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
