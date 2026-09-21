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
                  col.numeric ? "pr-2.5 text-right whitespace-nowrap md:pr-[22px]" : "pr-2.5 text-left",
                ].join(" ")}
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
                      col?.numeric
                        ? "pr-2.5 text-right font-mono whitespace-nowrap md:pr-[22px]"
                        : "pr-2.5",
                      col?.nowrap && "font-mono whitespace-nowrap",
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
