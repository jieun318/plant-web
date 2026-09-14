import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";

// S-08 계정 설정 (예전 이름: 마이페이지)
// 아직 화면을 만들기 전이다. 들어가야 할 것을 글로 적어두었다.
// 따옴표나 태그 사이의 한글은 자유롭게 고쳐도 된다.

export default function AccountPage() {
  return (
    <PageShell className="max-w-3xl">
      <SectionTitle as="h1">계정 설정</SectionTitle>

      <Panel title="이 화면에 들어가야 할 것" className="mt-8">
        <ol className="space-y-5 text-sm leading-relaxed text-ink">
          <li>
            <p className="font-medium">1. 요약 카드 2개</p>
            <p className="text-ink-70">내 식물 수 / 진단 횟수</p>
          </li>
          <li>
            <p className="font-medium">2. 알림</p>
            <p className="text-ink-70">물주기 알림, 분갈이 시기 알림 (켜고 끄는 토글)</p>
          </li>
          <li>
            <p className="font-medium">3. 계정</p>
            <p className="text-ink-70">이용 상태 (게스트), 이메일 연결 (준비 중)</p>
            <p className="mt-1 text-xs text-clay">
              로그아웃 버튼은 넣지 않기. 로그인 없이 쓰는 구조라 로그아웃하면 등록한 식물을 전부 잃는다.
            </p>
          </li>
        </ol>
      </Panel>
    </PageShell>
  );
}
