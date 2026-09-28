import Link from "next/link";
import PhotoFrame from "./PhotoFrame";

// 밀착 인화지. 날짜별 정사각 사진을 격자로 늘어놓고 아래에 mono 날짜를 적는다.
// 오늘(또는 지금 보는 날)만 외곽선을 두른다.

export type ContactItem = {
  key: string;
  src?: string | null;
  /** 09.21 */
  date: string;
  /** 날짜 아래 한 줄 — 종명 등 */
  caption?: string;
  href?: string;
  today?: boolean;
};

type Props = {
  items: ContactItem[];
  className?: string;
};

export default function ContactSheet({ items, className }: Props) {
  return (
    <ul
      className={["grid grid-cols-4 gap-2.5 md:grid-cols-7", className]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => {
        const body = (
          <>
            <PhotoFrame
              src={item.src}
              ratio="square"
              className={item.today ? "outline outline-1 outline-offset-2 outline-ink" : undefined}
            />
            {/* 좁은 칸이라 "오늘"은 줄을 나눈다. 한 줄에 붙이면 잘린다 */}
            <p
              className={`mt-[5px] font-mono text-[10.5px] ${
                item.today ? "font-medium text-ink" : "text-soft"
              }`}
            >
              {item.date}
            </p>
            {item.today && <p className="font-mono text-[10.5px] text-ink">오늘</p>}
            {item.caption && (
              <p className="truncate text-xs text-ink group-hover:underline">{item.caption}</p>
            )}
          </>
        );

        return (
          <li key={item.key} className="min-w-0">
            {item.href ? (
              <Link href={item.href} className="group block">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
