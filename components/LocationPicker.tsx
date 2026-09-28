"use client";

import { LOCATIONS, LOCATION_MAX } from "@/lib/plant";

// 두는 곳 고르기. 식물 추가 2단계와 식물 수정이 같이 쓴다.
// 선택지는 텍스트다. 고른 것만 굵게 + 밑줄.

export const OTHER = "기타";

/** 저장된 값을 선택지와 직접 입력으로 나눈다. */
export function splitLocation(location: string | null): {
  choice: string | null;
  custom: string;
} {
  if (!location) return { choice: null, custom: "" };
  if ((LOCATIONS as readonly string[]).includes(location)) {
    return { choice: location, custom: "" };
  }
  return { choice: OTHER, custom: location };
}

/** 고른 값에서 저장할 문자열을 만든다. 기타인데 비어 있으면 null. */
export function toLocation(choice: string | null, custom: string): string | null {
  if (choice === OTHER) return custom.trim() || null;
  return choice;
}

type Props = {
  choice: string | null;
  custom: string;
  onChoice: (choice: string | null) => void;
  onCustom: (custom: string) => void;
};

export default function LocationPicker({ choice, custom, onChoice, onCustom }: Props) {
  return (
    <>
      <div role="radiogroup" aria-label="두는 곳" className="flex flex-wrap gap-x-5 gap-y-2.5">
        {[...LOCATIONS, OTHER].map((option) => {
          const selected = choice === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              // 고른 것을 다시 누르면 선택을 푼다. 두는 곳은 비워둘 수 있다.
              onClick={() => onChoice(selected ? null : option)}
              className={`text-sm transition-colors ${
                selected
                  ? "font-semibold text-ink underline decoration-1 underline-offset-[6px]"
                  : "text-soft hover:text-ink"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {choice === OTHER && (
        <input
          value={custom}
          onChange={(e) => onCustom(e.target.value)}
          maxLength={LOCATION_MAX}
          placeholder="예: 사무실 책상"
          aria-label="두는 곳 직접 입력"
          autoFocus
          className="mt-3 w-full border-0 border-b border-ink bg-transparent px-0 py-2 text-sm text-ink placeholder:text-faint focus:outline-none"
        />
      )}
    </>
  );
}
