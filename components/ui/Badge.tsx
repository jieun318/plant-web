import type { ReactNode } from "react";

// 짧은 상태 표시. 초록은 정상, 흙빛은 주의.

type Tone = "leaf" | "clay" | "neutral";

const TONE: Record<Tone, string> = {
  leaf: "bg-leaf-50 text-leaf",
  clay: "bg-clay-50 text-clay",
  neutral: "bg-sheet-2 text-ink-70",
};

type Props = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

export default function Badge({ tone = "neutral", className, children }: Props) {
  return (
    <span
      className={[
        "inline-block shrink-0 rounded px-2 py-1 text-xs font-medium",
        TONE[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
