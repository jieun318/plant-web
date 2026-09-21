"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// 계정 버튼과 드롭다운. 바깥을 누르거나 Esc 를 누르면 닫힌다.
// 버튼은 테두리 없는 글자. 드롭다운은 먹색 1px 선만 두르고 그림자를 쓰지 않는다.

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-[12.5px] text-soft transition-colors hover:text-ink"
      >
        계정
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-40 border border-ink bg-paper py-1"
        >
          <Link
            role="menuitem"
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink hover:underline"
          >
            계정
          </Link>
        </div>
      )}
    </div>
  );
}
