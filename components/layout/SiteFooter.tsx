import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-wood/25">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-ink-45 md:flex-row md:items-center md:justify-between md:px-8">
        <p>식물집사 · 사진 한 장으로 시작하는 식물 관리</p>
        <p>
          안내는 참고용입니다. 상태가 심하면{" "}
          <Link href="/guide" className="underline underline-offset-2">
            가이드
          </Link>
          를 확인하거나 가까운 화훼농원에 문의하세요.
        </p>
      </div>
    </footer>
  );
}
