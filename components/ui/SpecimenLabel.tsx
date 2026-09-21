import type { ReactNode } from "react";
import InfoRow from "./InfoRow";
import StatusText from "./StatusText";

// 표본 라벨. 식물 표본에 붙는 라벨처럼 머리·이름·학명·필드·상태를 한 칸에 적는다.
// 화면에 허용되는 유일한 테두리 박스다. 다른 곳에 테두리 박스를 만들지 않는다.

export type SpecimenField = {
  label: string;
  value: ReactNode;
  /** 날짜·범위·기기 ID 처럼 숫자 위주 값 */
  mono?: boolean;
};

type Props = {
  /** 머리 왼쪽 — "관찰 기록", "판별 결과" */
  heading: string;
  /** 머리 오른쪽 — "No. 002" */
  no?: string;
  name: ReactNode;
  /** 학명. 표본 라벨의 관례대로 이탤릭 */
  scientificName?: string | null;
  fields?: SpecimenField[];
  /** 문제가 있을 때만 준다 (주의·확인 필요). 정상이면 비운다 */
  status?: ReactNode;
  /** 상태 아래 한두 줄 설명 */
  note?: ReactNode;
  /** 라벨 맨 아래 링크 줄 (수정 등) */
  footer?: ReactNode;
  className?: string;
};

export default function SpecimenLabel({
  heading,
  no,
  name,
  scientificName,
  fields = [],
  status,
  note,
  footer,
  className,
}: Props) {
  return (
    <section
      className={["border border-ink px-[18px] pt-4 pb-3.5", className]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="mb-3 flex justify-between gap-3 border-b border-ink pb-2 font-mono text-[10.5px] tracking-[0.06em] text-soft">
        <span>{heading}</span>
        {no && <span>{no}</span>}
      </p>

      <h1 className="text-[27px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
        {name}
      </h1>
      {scientificName && (
        <p className="mt-0.5 font-latin text-[17px] text-soft italic">{scientificName}</p>
      )}

      {fields.length > 0 && (
        <dl className="mt-3.5">
          {fields.map((field) => (
            <InfoRow
              key={field.label}
              label={field.label}
              value={field.value}
              mono={field.mono}
            />
          ))}
        </dl>
      )}

      {(status || note) && (
        <div className="mt-3.5 border-t border-ink pt-[11px]">
          <StatusText>{status}</StatusText>
          {note && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink">{note}</p>
          )}
        </div>
      )}

      {footer && (
        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 border-t border-hair pt-2.5">
          {footer}
        </div>
      )}
    </section>
  );
}
