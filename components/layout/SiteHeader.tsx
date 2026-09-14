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
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Leaf aria-hidden className="size-5 text-leaf" />
          <span className="font-serif text-lg font-bold tracking-tight text-ink">
            식물집사
          </span>
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          {NAV.map(({ href, label }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-2 text-sm transition-colors ${
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
