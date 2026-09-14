"use client";

// 한 줄에 나눠 담는 세그먼트 탭. 관리 가이드의 4탭 같은 곳에 쓴다.

type Item = { id: string; label: string };

type Props = {
  items: Item[];
  value: string;
  onChange: (id: string) => void;
};

export default function Tabs({ items, value, onChange }: Props) {
  return (
    <div
      role="tablist"
      className="grid gap-1 rounded-md border border-rule bg-sheet-2 p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = item.id === value;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-wood text-sheet" : "text-ink-70 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
