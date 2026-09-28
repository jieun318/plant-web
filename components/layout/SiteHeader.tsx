"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";

// 관찰이 중심이다. 진단·가이드는 메뉴에 두지 않고 관찰일지 안의 보조 링크로 들어간다.
const NAV = [
  { href: "/", label: "오늘" },
  { href: "/plants", label: "관찰일지" },
  { href: "/plants/new", label: "식물 추가" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // /plants/new 는 "식물 추가"만 켠다. "관찰일지"까지 같이 켜지지 않게 한다.
  if (href === "/plants") {
    return pathname === "/plants" || (pathname.startsWith("/plants/") && !pathname.startsWith("/plants/new"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// 워드마크 텍스트만 둔다. 아이콘을 붙이지 않는다.
// 아래 먹색 1px 선, 고른 메뉴는 밑줄.
export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-6xl items-baseline gap-4 px-5 pt-[18px] pb-3.5 md:px-8">
        <Link href="/" className="shrink-0 text-[17px] font-bold tracking-[-0.02em] text-ink">
          식물집사
        </Link>

        <nav className="flex min-w-0 flex-1 items-baseline justify-center gap-4 sm:gap-7">
          {NAV.map(({ href, label }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 text-[13.5px] transition-colors ${
                  active
                    ? "font-semibold text-ink underline decoration-1 underline-offset-[6px]"
                    : "text-soft hover:text-ink"
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
