import type { ReactNode } from "react";

// 사진 아래 한 줄. 왼쪽은 촬영 시각, 오른쪽은 그때 온습도. mono.

type Props = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export default function Caption({ left, right, className }: Props) {
  if (!left && !right) return null;

  return (
    <p
      className={[
        "mt-2 flex justify-between gap-2.5 font-mono text-[11px] text-soft",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="min-w-0 truncate">{left}</span>
      {right && <span className="shrink-0">{right}</span>}
    </p>
  );
}
