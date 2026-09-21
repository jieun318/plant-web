import type { ReactNode } from "react";

// 옮기는 중인 컴포넌트. 관찰 기록장 디자인에는 배지가 없다.
// 상태는 StatusText, 그 밖의 정보는 그냥 글자로 쓴다. 화면을 다 옮기면 지운다.
// 그때까지는 배지 모양 없이 글자로만 그린다.

type Tone = "leaf" | "clay" | "neutral";

type Props = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

export default function Badge({ tone = "neutral", className, children }: Props) {
  return (
    <span
      className={[
        "shrink-0 text-xs",
        tone === "clay" ? "font-bold text-alert" : "text-soft",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
