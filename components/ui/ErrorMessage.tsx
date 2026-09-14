import type { ReactNode } from "react";

// 오류 안내. 빨강 대신 흙빛을 쓴다.

type Props = {
  className?: string;
  children: ReactNode;
};

export default function ErrorMessage({ className, children }: Props) {
  return (
    <p
      className={[
        "rounded-md bg-clay-50 px-4 py-3 text-sm leading-relaxed text-clay",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}
