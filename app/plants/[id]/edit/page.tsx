"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, type FormEvent } from "react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import InfoRow from "@/components/ui/InfoRow";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { markPlantDeleted } from "@/lib/handoff";
import LocationPicker, { OTHER, splitLocation, toLocation } from "@/components/LocationPicker";
import { NICKNAME_MAX } from "@/lib/plant";
import type { Device, Plant } from "@/types";

export default function PlantEditPage({ params }: PageProps<"/plants/[id]/edit">) {
  const { id } = use(params);
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/plants/${id}`);
        const data = await res.json();

        if (!alive) return;

        if (!res.ok) {
          setLoadError(data.error ?? "불러오지 못했습니다.");
          return;
        }

        setDevice((data.device as Device) ?? null);

        const loaded = data.plant as Plant;
        const { choice, custom } = splitLocation(loaded.location);
        setPlant(loaded);
        setNickname(loaded.nickname ?? "");
        setChoice(choice);
        setCustom(custom);
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : "불러오지 못했습니다.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const location = toLocation(choice, custom);
  const locationChanged = plant !== null && (plant.location ?? null) !== (location || null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (choice === OTHER && !custom.trim()) {
      setError("두는 곳을 적어주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, location }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "저장하지 못했습니다.");
        return;
      }

      router.push(`/plants/${id}`);
    } catch {
      setError("저장에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell className="max-w-2xl">
      <Link href={`/plants/${id}`} className="text-sm text-soft transition-colors hover:text-ink">
        ← 돌아가기
      </Link>

      <SectionTitle as="h1" className="mt-6">
        식물 정보 수정
      </SectionTitle>

      {loadError && <ErrorMessage className="mt-6">{loadError}</ErrorMessage>}
      {!plant && !loadError && <Loading className="mt-8" />}

      {plant && (
        <>
          <form onSubmit={save} className="mt-8 flex flex-col gap-9">
            <Panel title="별명">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={NICKNAME_MAX}
                placeholder={plant.species}
                aria-label="별명"
                className="w-full border-0 border-b border-ink bg-transparent px-0 py-2 text-sm text-ink placeholder:text-faint focus:outline-none"
              />
              <p className="mt-2 text-xs text-soft">
                비워두면 종 이름({plant.species})으로 보여요.
              </p>
            </Panel>

            <Panel title="두는 곳">
              <LocationPicker
                choice={choice}
                custom={custom}
                onChoice={setChoice}
                onCustom={setCustom}
              />

              {locationChanged && (
                <p className="mt-3 text-xs leading-relaxed text-soft">
                  두는 곳이 바뀌면 관리 가이드를 새 자리에 맞춰 다시 만들어요.
                </p>
              )}
            </Panel>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Button type="submit" disabled={saving} full>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </form>

          <DeviceSection
            plantId={id}
            device={device}
            onUnlink={() => setDevice(null)}
          />

          <DeleteSection plantId={id} name={plant.nickname || plant.species} />
        </>
      )}
    </PageShell>
  );
}

/** 삭제는 한 번 더 묻는다. 기록과 사진이 모두 지워지고 되돌릴 수 없다. */
/** 연결된 기기. 해제해도 지금까지 쌓인 기록은 남는다. */
function DeviceSection({
  plantId,
  device,
  onUnlink,
}: {
  plantId: string;
  device: Device | null;
  onUnlink: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlink() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${plantId}/device`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "연결을 해제하지 못했습니다.");
        return;
      }

      setConfirming(false);
      onUnlink();
    } catch {
      setError("연결을 해제하지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="기기" className="mt-10">
      {device ? (
        <>
          <dl>
            <InfoRow label="이름" value={device.name} mono />
            <InfoRow
              label="마지막 기록"
              value={device.last_seen_at ? formatDateTime(device.last_seen_at) : "아직 없음"}
              mono
            />
          </dl>

          {error && <ErrorMessage className="mt-3">{error}</ErrorMessage>}

          {confirming ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-alert">
                연결을 해제하면 이 기기는 더 이상 기록을 보낼 수 없어요. 지금까지 쌓인
                온습도와 사진은 그대로 남습니다.
              </p>
              <div className="mt-4 flex items-center gap-6">
                <Button variant="danger" onClick={unlink} disabled={busy}>
                  {busy ? "해제 중..." : "연결 해제"}
                </Button>
                <Button variant="link" onClick={() => setConfirming(false)} disabled={busy}>
                  취소
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <Button
                variant="link"
                size="sm"
                href={`/plants/new?plant=${plantId}&step=device`}
              >
                새 코드 발급
              </Button>
              <Button variant="link" size="sm" onClick={() => setConfirming(true)}>
                연결 해제
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-soft">
            연결된 기기가 없어요. 기기를 연결하면 매일 사진과 온습도를 기록합니다.
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-3"
            href={`/plants/new?plant=${plantId}&step=device`}
          >
            기기 연결
          </Button>
        </>
      )}
    </Panel>
  );
}

function DeleteSection({ plantId, name }: { plantId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${plantId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "삭제하지 못했습니다.");
        return;
      }

      // 수정 화면 기록은 목록으로 바꿔 넘긴다. 그 앞의 상세는 지울 수 없으니
      // 표시해 두고, 뒤로 가서 상세가 열리면 거기서 다시 목록으로 보낸다.
      markPlantDeleted(plantId);
      router.replace("/plants");
    } catch {
      setError("삭제에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Panel title="식물 삭제" className="mt-10">
      {confirming ? (
        <>
          <p className="text-sm leading-relaxed text-alert">
            {name}을(를) 삭제할까요? 물주기·진단 기록과 사진이 모두 지워지고 되돌릴 수
            없어요.
          </p>
          {error && <ErrorMessage className="mt-3">{error}</ErrorMessage>}
          <div className="mt-4 flex items-center gap-6">
            <Button
              type="button"
              variant="danger"
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              취소
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-soft">
            기록과 사진까지 모두 지워집니다.
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setConfirming(true)}
            className="mt-3"
          >
            이 식물 삭제하기
          </Button>
        </>
      )}
    </Panel>
  );
}
