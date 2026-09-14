import PageShell from "@/components/layout/PageShell";
import SectionTitle from "@/components/ui/SectionTitle";

// TODO: S-07 관리 가이드. 탭 4개와 생성·캐싱은 아직 만들지 않았다.
export default function GuidePage() {
  return (
    <PageShell className="max-w-3xl">
      <SectionTitle as="h1">관리 가이드</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        준비 중인 화면입니다.
      </p>
    </PageShell>
  );
}
