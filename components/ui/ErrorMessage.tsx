import type { ReactNode } from "react";

// 오류 안내. 박스 없이 alert 글자로만. alert 는 문제가 있을 때만 쓰는 유일한 색이다.

type Props = {
  className?: string;
  children: ReactNode;
};

export default function ErrorMessage({ className, children }: Props) {
  return (
    <p
      role="alert"
      className={["text-sm leading-relaxed text-alert", className].filter(Boolean).join(" ")}
    >
      {children}
    </p>
  );
}
