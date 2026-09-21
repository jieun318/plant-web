import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// 액션 컨트롤. href 를 주면 링크로, 없으면 버튼으로 그린다.
// 겉모습이 같은 것을 두 가지로 나누면 스타일이 갈라지기 때문이다.

type Variant = "primary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "bg-leaf text-sheet hover:bg-leaf/90",
  // 되돌릴 수 없는 동작(삭제)의 마지막 확인에만 쓴다
  danger: "bg-clay text-sheet hover:bg-clay/90",
  ghost: "border border-rule bg-sheet text-ink-70 hover:border-wood hover:text-ink",
  quiet: "text-ink-70 hover:bg-sheet-2 hover:text-ink",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-3 text-sm",
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  full = false,
  className = ""
) {
  return [BASE, VARIANT[variant], SIZE[size], full && "w-full", className]
    .filter(Boolean)
    .join(" ");
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: Variant;
  size?: Size;
  /** 가로를 꽉 채운다 */
  full?: boolean;
  href?: string;
  className?: string;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  size = "md",
  full = false,
  href,
  className,
  children,
  ...rest
}: Props) {
  const cls = buttonClass(variant, size, full, className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
