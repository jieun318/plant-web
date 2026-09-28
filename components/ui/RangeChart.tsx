// 최근 며칠의 값과 적정 범위를 함께 보여주는 선 그래프.
// 차트 라이브러리를 쓰지 않고 SVG 를 직접 그린다.
//
// 적정 범위는 옅은 띠, 값은 먹색 선, 범위를 벗어난 날만 alert 점.

const WIDTH = 700;
const HEIGHT = 120;
const TOP = 8;
const BOTTOM = 8;

export type ChartPoint = {
  /** 09.21 — 가로축 라벨 */
  label: string;
  value: number | null;
};

type Props = {
  points: ChartPoint[];
  /** 적정 범위. 없으면 띠를 그리지 않는다 */
  min?: number | null;
  max?: number | null;
  unit: "°C" | "%";
};

export default function RangeChart({ points, min, max, unit }: Props) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);

  if (values.length === 0) return null;

  // 값과 적정 범위가 모두 들어가게 위아래를 잡는다. 너무 납작해지지 않게 여유를 둔다.
  const candidates = [...values, ...(min != null ? [min] : []), ...(max != null ? [max] : [])];
  const low = Math.min(...candidates) - 2;
  const high = Math.max(...candidates) + 2;
  const span = high - low || 1;

  const y = (value: number) => TOP + ((high - value) / span) * (HEIGHT - TOP - BOTTOM);
  const x = (i: number) => (points.length === 1 ? WIDTH / 2 : (i / (points.length - 1)) * WIDTH);

  const line = points
    .map((p, i) => (p.value === null ? null : `${x(i)},${y(p.value)}`))
    .filter(Boolean)
    .join(" ");

  const outside = (value: number) =>
    (min != null && value < min) || (max != null && value > max);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label={`최근 ${points.length}일 ${unit === "°C" ? "온도" : "습도"} 변화`}
      >
        {min != null && max != null && (
          <rect
            x="0"
            y={y(max)}
            width={WIDTH}
            height={Math.max(1, y(min) - y(max))}
            className="fill-hair/60"
          />
        )}

        <line
          x1="0"
          y1={HEIGHT - 1}
          x2={WIDTH}
          y2={HEIGHT - 1}
          className="stroke-ink"
          strokeWidth="1"
        />

        <polyline
          points={line}
          fill="none"
          className="stroke-ink"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />

        {points.map((p, i) =>
          p.value === null ? null : (
            <circle
              key={p.label}
              cx={x(i)}
              cy={y(p.value)}
              r="3.5"
              className={outside(p.value) ? "fill-alert" : "fill-ink"}
            />
          )
        )}
      </svg>

      <figcaption className="mt-1.5 flex justify-between font-mono text-[10.5px] text-soft">
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}
