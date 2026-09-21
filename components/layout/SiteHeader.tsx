"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";
import AccountMenu from "./AccountMenu";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/plants", label: "내 식물" },
  { href: "/diagnose", label: "진단" },
  { href: "/guide", label: "가이드" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-wood/25 bg-oat/90 backdrop-blur">
      {/* 좁은 화면에서는 로고를 아이콘만 남기고 메뉴 간격을 줄여 한 줄에 넣는다 (360px 까지 확인) */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-5 sm:gap-4 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Leaf aria-hidden className="size-5 text-leaf" />
          <span className="sr-only font-serif text-lg font-bold tracking-tight text-ink sm:not-sr-only">
            식물집사
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1">
          {NAV.map(({ href, label }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-md px-2 py-2 text-sm transition-colors sm:px-3 ${
                  active
                    ? "bg-sheet font-medium text-ink"
                    : "text-ink-70 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
