import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// 액션 컨트롤. href 를 주면 링크로, 없으면 버튼으로 그린다.
// 겉모습이 같은 것을 두 가지로 나누면 스타일이 갈라지기 때문이다.
//
// 주 버튼은 먹색 판에 종이색 글자, 화면에 하나. 보조 액션은 밑줄 텍스트 링크다.
// 테두리 있는 보조 버튼은 만들지 않는다.

type Variant = "primary" | "link" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "rounded-xs bg-ink text-paper hover:bg-ink/85",
  link: "text-ink underline decoration-faint underline-offset-4 hover:decoration-ink",
  // 되돌릴 수 없는 동작(삭제)의 마지막 확인에만 쓴다
  danger: "rounded-xs bg-alert text-paper hover:bg-alert/85",
};

// 링크는 글자만 있으므로 안쪽 여백을 두지 않는다
const SIZE: Record<Size, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-3 text-sm",
};

const LINK_SIZE: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  full = false,
  className = ""
) {
  return [
    BASE,
    VARIANT[variant],
    variant === "link" ? LINK_SIZE[size] : SIZE[size],
    full && "w-full",
    className,
  ]
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
