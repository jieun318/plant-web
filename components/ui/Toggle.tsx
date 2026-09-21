"use client";

// 켬/끔 스위치. 라벨 전체가 누를 수 있는 영역이다. 모서리 2px, 먹색 한 가지.

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export default function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-hair py-3">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-soft">{description}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-xs border border-ink transition-colors ${
          checked ? "bg-ink" : "bg-transparent"
        }`}
      >
        <span
          className={`absolute top-0.5 size-3.5 rounded-xs transition-[left] ${
            checked ? "left-[18px] bg-paper" : "left-0.5 bg-ink"
          }`}
        />
      </button>
    </div>
  );
}
