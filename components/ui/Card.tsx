import Link from "next/link";
import type { ReactNode } from "react";

// 목록의 한 칸. 종이 위에 얹힌 카드.

type Props = {
  /** 주면 카드 전체가 링크가 된다 */
  href?: string;
  /** 마우스를 올렸을 때 테두리를 진하게 */
  hover?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Card({ href, hover = false, className, children }: Props) {
  const cls = [
    "block rounded-lg border border-rule bg-sheet p-4",
    hover && "transition-colors hover:border-wood",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return <div className={cls}>{children}</div>;
}
