"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionTitle from "@/components/ui/SectionTitle";
import SpecimenLabel, { type SpecimenField } from "@/components/ui/SpecimenLabel";
import { apiFetch } from "@/lib/api";
import {
  getIdentifyServerSnapshot,
  getIdentifySnapshot,
  subscribeIdentify,
} from "@/lib/handoff";
import { formatRange } from "@/lib/format";
import { toIdentifyResult } from "@/lib/identification";
import type { Identification, IdentifyResult, Plant } from "@/types";

/**
 * S-02 판별 결과.
 *
 * 결과는 주소(/result?id=xxx)로 찾는다. 다른 화면에 갔다 와도, 새로고침해도 남는다.
 * id 가 없을 때만 예전처럼 브라우저에 담아둔 값을 쓴다.
 * (판별에 실패했거나 세션이 없어 기록을 남기지 못한 경우)
 */
export default function ResultView() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const handoff = useSyncExternalStore(
    subscribeIdentify,
    getIdentifySnapshot,
    getIdentifyServerSnapshot
  );

  // undefined = 아직 불러오는 중, null = 기록이 없음
  const [record, setRecord] = useState<Identification | null | undefined>(
    id ? undefined : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/identifications/${id}`);
        const data = await res.json();

        if (!alive) return;

        // 없는 기록이면 "결과가 없어요" 화면으로 떨어진다
        setRecord(res.ok ? (data as Identification) : null);
      } catch {
        if (alive) setRecord(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  async function register(destination: (plantId: string) => string) {
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      // 기록이 있으면 id 만 보낸다. 사진과 종 정보는 서버가 그 기록에서 복사한다.
      const body = record
        ? { identificationId: record.id }
        : { result: handoff?.result, photo: handoff?.photo };

      const res = await apiFetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "등록하지 못했습니다.");
        return;
      }

      router.push(destination((data as Plant).id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "등록에 실패했습니다. 연결을 확인해 주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  // 서버/hydration 중이거나 기록을 불러오는 중
  if (record === undefined || (!id && handoff === undefined)) {
    return (
      <PageShell>
        <Loading label="판별 결과를 불러오는 중..." />
      </PageShell>
    );
  }

  const result = record ? toIdentifyResult(record) : handoff?.result;
  const photo = record ? record.photo_url : handoff?.photo;

  // 판별을 거치지 않고 주소로 바로 들어왔거나, 기록이 지워진 경우
  if (!result) {
    return (
      <PageShell>
        <SectionTitle as="h1">판별 결과가 없어요</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-soft">
          사진을 먼저 올려주세요.
        </p>
        <Button href="/" className="mt-6">
          사진 올리러 가기
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <BackLink />

      <div className="mt-6 grid items-start gap-7 md:grid-cols-[1.3fr_0.7fr] md:gap-7">
        <PhotoFrame src={photo} alt="판별한 사진" ratio="photo" />

        <div>
          {result.confident ? (
            <>
              <SpecimenLabel
                heading="판별 결과"
                no="가장 비슷한 종"
                name={result.koreanName}
                scientificName={result.scientificName}
                fields={specimenFields(result)}
              />

              {error && <ErrorMessage className="mt-6">{error}</ErrorMessage>}

              <Button
                onClick={() => register((plantId) => `/plants/${plantId}`)}
                disabled={saving}
                full
                className="mt-6"
              >
                {saving ? "등록 중..." : "내 식물로 등록"}
              </Button>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <Button
                  variant="link"
                  onClick={() => register((plantId) => `/plants/${plantId}/guide`)}
                  disabled={saving}
                >
                  등록하고 관리법 보기
                </Button>
                <span className="text-xs text-soft">
                  다른 식물인가요? 사진을 다시 올리면 더 정확해집니다.
                </span>
              </div>
            </>
          ) : (
            <>
              <SectionTitle as="h1">판별하지 못했어요</SectionTitle>
              <p className="mt-3 text-sm leading-relaxed text-soft">
                잎과 줄기가 잘 보이게, 밝은 곳에서 다시 찍어주세요.
              </p>
              <Button href="/" className="mt-7">
                다시 올리기
              </Button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/**
 * 표본 라벨의 필드.
 * 적정 온습도는 기기가 잰 값을 판단하는 기준이 되므로 맨 위에 둔다.
 * 범위를 못 받았으면(예전 기록이거나 판별이 이상한 값을 줬을 때) 그 줄만 뺀다.
 */
function specimenFields(result: IdentifyResult): SpecimenField[] {
  const rows: (SpecimenField | null)[] = [
    result.tempMin < result.tempMax
      ? {
          label: "적정 온도",
          value: formatRange(result.tempMin, result.tempMax, "°C"),
          mono: true,
        }
      : null,
    result.humidityMin < result.humidityMax
      ? {
          label: "적정 습도",
          value: formatRange(result.humidityMin, result.humidityMax, "%"),
          mono: true,
        }
      : null,
    { label: "난이도", value: result.difficulty },
    { label: "원산지", value: result.origin },
    { label: "빛", value: result.light },
    { label: "물", value: result.water },
    { label: "습도", value: result.humidity },
    { label: "분갈이", value: result.repot },
  ];

  return rows.filter((row): row is SpecimenField => Boolean(row?.value));
}

function BackLink() {
  return (
    <Link href="/" className="text-sm text-soft transition-colors hover:text-ink">
      ← 다시 올리기
    </Link>
  );
}
