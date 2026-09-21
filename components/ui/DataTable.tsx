import { isValidElement, type ReactNode } from "react";

// 기록 표. 가는 가로선으로 행을 나누고, 숫자 열은 mono 로 오른쪽에 줄 맞춘다.
// 범위를 벗어난 값만 alert 로 칠한다. 나머지는 모두 먹색.

export type DataColumn = {
  label: string;
  /** 숫자 열 — mono, 오른쪽 정렬 */
  numeric?: boolean;
  /** 날짜처럼 줄바꿈 없이 좁게 */
  nowrap?: boolean;
};

/** 범위를 벗어난 값처럼 표시를 달리할 칸 */
export type DataCell = { value: ReactNode; alert?: boolean };

export type DataRow = {
  key: string;
  /** 다른 곳에서 이 행으로 스크롤할 때 쓰는 id */
  anchor?: string;
  cells: (ReactNode | DataCell)[];
};

function isCell(cell: ReactNode | DataCell): cell is DataCell {
  return (
    typeof cell === "object" && cell !== null && !isValidElement(cell) && "value" in cell
  );
}

/**
 * 열 종류별 여백과 정렬. 한 칸에 pr-2.5 와 pr-6 이 같이 붙으면 CSS 순서에 따라
 * 결과가 달라지므로 여기서 하나만 고른다.
 */
function cellLayout(col: DataColumn | undefined): string {
  if (col?.numeric) return "pr-2.5 text-right whitespace-nowrap md:pr-[22px]";
  // 날짜 열은 내용만큼만 차지한다
  if (col?.nowrap) return "w-px pr-6 whitespace-nowrap";
  return "pr-2.5";
}

type Props = {
  columns: DataColumn[];
  rows: DataRow[];
  className?: string;
};

export default function DataTable({ columns, rows, className }: Props) {
  return (
    <div className={["overflow-x-auto", className].filter(Boolean).join(" ")}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={[
                  "border-b border-hair pt-2.5 pb-2 text-[10.5px] font-medium tracking-[0.04em] text-soft",
                  cellLayout(col),
                  !col.numeric && "text-left",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} id={row.anchor} className="scroll-mt-24">
              {row.cells.map((cell, i) => {
                const col = columns[i];
                const { value, alert } = isCell(cell) ? cell : { value: cell, alert: false };

                return (
                  <td
                    key={col?.label ?? i}
                    className={[
                      "border-b border-hair py-[13px] align-top text-[13px] leading-[1.7]",
                      cellLayout(col),
                      (col?.numeric || col?.nowrap) && "font-mono",
                      alert ? "text-alert" : "text-ink",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
