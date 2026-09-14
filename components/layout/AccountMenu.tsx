"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, User } from "lucide-react";

// 계정 버튼과 드롭다운. 바깥을 누르거나 Esc 를 누르면 닫힌다.

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
        className="flex items-center gap-1 rounded-md border border-rule bg-sheet px-2.5 py-2 text-sm text-ink-70 transition-colors hover:border-wood hover:text-ink"
      >
        <User aria-hidden className="size-4" />
        <span className="hidden sm:inline">계정</span>
        <ChevronDown aria-hidden className="size-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-rule bg-sheet py-1 shadow-sm"
        >
          <Link
            role="menuitem"
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink-70 transition-colors hover:bg-sheet-2 hover:text-ink"
          >
            계정 설정
          </Link>
        </div>
      )}
    </div>
  );
}
