"use client";

// 텍스트 탭. 아래 가는 선 위에 나란히 두고, 고른 탭만 먹색 밑줄.

type Item = { id: string; label: string };

type Props = {
  items: Item[];
  value: string;
  onChange: (id: string) => void;
};

export default function Tabs({ items, value, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-hair">
      {items.map((item) => {
        const active = item.id === value;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`-mb-px shrink-0 border-b pb-2 text-sm transition-colors ${
              active
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-soft hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
