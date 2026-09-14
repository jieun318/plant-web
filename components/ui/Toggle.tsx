"use client";

// 켬/끔 스위치. 라벨 전체가 누를 수 있는 영역이다.

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export default function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-ink-45">{description}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-leaf" : "bg-rule"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-sheet transition-[left] ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
