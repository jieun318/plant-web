// 기록 타임라인. 좌측 세로선 위에 점을 찍고, 최신 항목만 진하게.

export type TimelineItem = {
  id: string;
  date: string;
  text: string;
};

type Props = {
  items: TimelineItem[];
};

export default function Timeline({ items }: Props) {
  return (
    <ol className="border-l border-rule pl-5">
      {items.map((item, i) => (
        <li key={item.id} className="relative pb-5 last:pb-0">
          <span
            className={`absolute -left-6 top-1.5 size-2 rounded-full ${
              i === 0 ? "bg-leaf" : "bg-rule"
            }`}
          />
          <p className="text-xs text-ink-45">{item.date}</p>
          <p className="mt-0.5 text-sm text-ink">{item.text}</p>
        </li>
      ))}
    </ol>
  );
}
