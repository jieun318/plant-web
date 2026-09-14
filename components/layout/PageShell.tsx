import type { ReactNode } from "react";

// 모든 페이지의 공통 여백과 최대 너비.
// 데스크톱에서 가로를 쓰기 때문에 max-w-md 로 묶지 않는다.

type Props = {
  className?: string;
  /** 첫 프레임처럼 아직 그릴 것이 없을 수도 있다 */
  children?: ReactNode;
};

export default function PageShell({ className, children }: Props) {
  return (
    <main
      className={[
        "mx-auto w-full max-w-6xl grow px-5 py-10 md:px-8 md:py-14",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </main>
  );
}
