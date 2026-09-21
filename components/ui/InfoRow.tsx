import type { ReactNode } from "react";

// 라벨 / 값 한 줄. 위에 가는 선을 긋는다. 표본 라벨의 필드 행과 같은 모양이다.

type Props = {
  label: string;
  value: ReactNode;
  /** 날짜·범위·숫자 */
  mono?: boolean;
};

export default function InfoRow({ label, value, mono = false }: Props) {
  return (
    <div className="flex justify-between gap-3 border-t border-hair py-1.5 text-[12.5px]">
      <dt className="shrink-0 text-soft">{label}</dt>
      <dd className={["text-right text-ink", mono && "font-mono"].filter(Boolean).join(" ")}>
        {value}
      </dd>
    </div>
  );
}
