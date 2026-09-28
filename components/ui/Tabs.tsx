"use client";

// 텍스트 탭. 아래 가는 선 위에 나란히 두고, 고른 탭만 먹색 밑줄.
//
// overflow 를 걸지 않는다. overflow-x 를 auto 로 두면 overflow-y 도 auto 가 되어
// 활성 탭의 밑줄(-mb-px) 1px 때문에 오른쪽에 세로 스크롤바가 생긴다.
// 탭은 짧아서 좁은 화면에서도 줄바꿈으로 충분하다.

type Item = { id: string; label: string };

type Props = {
  items: Item[];
  value: string;
  onChange: (id: string) => void;
};

export default function Tabs({ items, value, onChange }: Props) {
  return (
    <div role="tablist" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-hair">
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
