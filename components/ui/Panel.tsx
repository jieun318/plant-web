import type { ReactNode } from "react";
import SectionHeader from "./SectionHeader";

// 구획. 테두리·배경 없이 SectionHeader(제목 + 아래 먹색 선)와 여백으로 나눈다.

type Props = {
  title?: string;
  /** SectionHeader 오른쪽 보조 텍스트 */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function Panel({ title, aside, className, children }: Props) {
  return (
    <section className={className}>
      {title && <SectionHeader title={title} aside={aside} className="mb-4" />}
      {children}
    </section>
  );
}
