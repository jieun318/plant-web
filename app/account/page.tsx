"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Badge from "@/components/ui/Badge";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";

// S-08 계정 설정 (예전 이름: 마이페이지)
// 로그아웃 버튼은 넣지 않는다. 로그인 없이 쓰는 구조라 로그아웃하면 등록한 식물을 전부 잃는다.
// 알림과 이메일 연결은 아직 기능이 없어 "준비 중"으로만 보여준다.

type Summary = { plants: number; diagnoses: number };

export default function AccountPage() {
  // null = 불러오는 중이거나 실패. 숫자 자리에 "-" 를 둔다.
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch("/api/account");
        if (!res.ok) return;

        const data = (await res.json()) as Summary;
        if (alive) setSummary(data);
      } catch {
        // 요약은 보조 정보다. 못 불러오면 "-" 로 둔다.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <PageShell className="max-w-3xl">
      <SectionTitle as="h1">계정 설정</SectionTitle>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <StatCard label="내 식물" value={summary?.plants} unit="개" />
        <StatCard label="진단 횟수" value={summary?.diagnoses} unit="회" />
      </div>

      <Panel title="알림" className="mt-5">
        <div>
          <ComingSoonRow label="물주기 알림" description="물 줄 날 아침에 알려드려요" />
          <ComingSoonRow label="분갈이 시기 알림" description="분갈이할 때가 되면 알려드려요" />
        </div>
      </Panel>

      <Panel title="계정" className="mt-5">
        <div>
          <div className="flex items-center justify-between gap-4 border-b border-rule py-4">
            <p className="text-sm text-ink">이용 상태</p>
            <Badge>게스트</Badge>
          </div>
          <ComingSoonRow
            label="이메일 연결"
            description="연결하면 다른 기기에서도 내 식물을 볼 수 있어요"
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-45">
          지금은 이 브라우저에 계정이 저장되어 있어요. 브라우저 기록을 지우거나 다른
          기기에서 열면 등록한 식물이 보이지 않을 수 있습니다.
        </p>
      </Panel>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | undefined;
  unit: string;
}) {
  return (
    <Panel className="text-center">
      <p className="text-xs text-ink-45">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">
        {value ?? "-"}
        {value !== undefined && <span className="ml-0.5 text-base">{unit}</span>}
      </p>
    </Panel>
  );
}

function ComingSoonRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-45">{description}</p>
      </div>
      <span className="shrink-0 text-xs text-ink-45">준비 중</span>
    </div>
  );
}
