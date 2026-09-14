import type { ReactNode } from "react";

// 라벨 / 값 한 줄. 마지막 줄의 테두리는 부모에서 지운다.

type Props = {
  label: string;
  value: ReactNode;
};

export default function InfoRow({ label, value }: Props) {
  return (
    <div className="flex justify-between gap-6 border-b border-rule py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-ink-45">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
