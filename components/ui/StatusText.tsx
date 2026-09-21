import type { ReactNode } from "react";

// 상태 글자. 배지를 쓰지 않는다.
// 정상은 아무것도 그리지 않는다. 문제(주의·확인 필요·지난 물주기 …)만 alert 굵은 글자로 쓴다.
// 정상일 때는 부르는 쪽에서 렌더링하지 않으면 된다. children 이 비어도 아무것도 그리지 않는다.

type Props = {
  className?: string;
  children?: ReactNode;
};

export default function StatusText({ className, children }: Props) {
  if (!children) return null;

  return (
    <span
      className={["shrink-0 text-sm font-bold text-alert", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
