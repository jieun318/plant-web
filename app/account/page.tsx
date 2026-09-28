"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageShell from "@/components/layout/PageShell";
import InfoRow from "@/components/ui/InfoRow";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";

// S-08 계정 설정 (예전 이름: 마이페이지)
// 로그아웃 버튼은 넣지 않는다. 로그인 없이 쓰는 구조라 로그아웃하면 등록한 식물을 전부 잃는다.
// 알림과 이메일 연결은 아직 기능이 없어 "준비 중"으로만 보여준다.

type Summary = { plants: number; devices: number; diagnoses: number };

/** 개발용. 브라우저마다 익명 계정이 달라서, 어느 계정으로 보고 있는지 확인할 때 쓴다. */
function AccountId() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setId(data.session?.user.id ?? null));
  }, []);

  if (!id) return null;

  return (
    <Panel title="개발용" aside="로컬에서만 보입니다" className="mt-9">
      <dl>
        <InfoRow label="이 브라우저의 계정 id" value={id} mono />
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-soft">
        브라우저나 프로필이 다르면 계정도 다릅니다. 다른 계정의 식물은 보이지 않아요.
      </p>
    </Panel>
  );
}

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

      <Panel title="요약" className="mt-8">
        <dl>
          <InfoRow label="등록 식물" value={count(summary?.plants, "개")} mono />
          <InfoRow label="연결 기기" value={count(summary?.devices, "대")} mono />
          <InfoRow label="진단 횟수" value={count(summary?.diagnoses, "회")} mono />
        </dl>
      </Panel>

      <Panel title="알림" className="mt-9">
        <ComingSoonRow label="물주기 알림" description="물 줄 날 아침에 알려드려요" />
        <ComingSoonRow label="분갈이 시기 알림" description="분갈이할 때가 되면 알려드려요" />
      </Panel>

      <Panel title="계정" className="mt-9">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <p className="text-sm text-ink">이용 상태</p>
          <span className="text-sm text-soft">게스트</span>
        </div>
        <ComingSoonRow
          label="이메일 연결"
          description="연결하면 다른 기기에서도 내 식물을 볼 수 있어요"
        />

        <p className="mt-4 text-xs leading-relaxed text-soft">
          지금은 이 브라우저에 계정이 저장되어 있어요. 브라우저 기록을 지우거나 다른
          기기에서 열면 등록한 식물이 보이지 않을 수 있습니다.
        </p>
      </Panel>

      {process.env.NODE_ENV === "development" && <AccountId />}
    </PageShell>
  );
}

/** 불러오기 전이나 실패했을 때는 "-" */
function count(value: number | undefined, unit: string) {
  return value === undefined ? "-" : `${value}${unit}`;
}

function ComingSoonRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-hair py-3 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-soft">{description}</p>
      </div>
      <span className="shrink-0 font-mono text-xs text-faint">준비 중</span>
    </div>
  );
}
