import Link from "next/link";
import type { ReactNode } from "react";

// 목록의 한 칸. 테두리·배경·둥근 모서리를 두지 않는다. 칸 사이는 여백으로 나눈다.
// 링크면 group 을 걸어 안쪽 제목이 hover 에 밑줄을 긋게 한다 (group-hover:underline).

type Props = {
  /** 주면 칸 전체가 링크가 된다 */
  href?: string;
  className?: string;
  children: ReactNode;
};

export default function Card({ href, className, children }: Props) {
  const cls = ["group block", className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return <div className={cls}>{children}</div>;
}
