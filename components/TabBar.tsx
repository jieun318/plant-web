"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Leaf, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/", label: "홈", icon: Camera },
  { href: "/plants", label: "내 식물", icon: Leaf },
  { href: "/mypage", label: "마이", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <nav className="mx-auto flex h-16 max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${
                active ? "text-emerald-700" : "text-neutral-400"
              }`}
            >
              <Icon
                aria-hidden
                strokeWidth={active ? 2.25 : 1.75}
                className="size-6"
              />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
