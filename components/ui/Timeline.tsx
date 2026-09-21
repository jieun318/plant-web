import Link from "next/link";

// 옮기는 중인 컴포넌트. 기록은 DataTable 로 보여준다. 화면을 다 옮기면 지운다.
// 그때까지는 가는 선으로 나눈 행으로 그린다.

export type TimelineItem = {
  id: string;
  date: string;
  text: string;
  href?: string;
};

type Props = {
  items: TimelineItem[];
};

export default function Timeline({ items }: Props) {
  return (
    <ol>
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 border-b border-hair py-2.5 text-[13px]">
          <span className="w-32 shrink-0 font-mono text-soft">{item.date}</span>
          {item.href ? (
            <Link
              href={item.href}
              className="text-ink underline decoration-faint underline-offset-4 hover:decoration-ink"
            >
              {item.text}
            </Link>
          ) : (
            <span className="text-ink">{item.text}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
