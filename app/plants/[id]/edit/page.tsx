"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import Panel from "@/components/ui/Panel";
import SectionTitle from "@/components/ui/SectionTitle";
import { apiFetch } from "@/lib/api";
import { markPlantDeleted } from "@/lib/handoff";
import { LOCATIONS, LOCATION_MAX, NICKNAME_MAX } from "@/lib/plant";
import type { Plant } from "@/types";

const OTHER = "기타";

/** 저장된 두는 곳을 선택지와 직접 입력으로 나눈다. */
function splitLocation(location: string | null): { choice: string | null; custom: string } {
  if (!location) return { choice: null, custom: "" };
  if ((LOCATIONS as readonly string[]).includes(location)) return { choice: location, custom: "" };
  return { choice: OTHER, custom: location };
}

export default function PlantEditPage({ params }: PageProps<"/plants/[id]/edit">) {
  const { id } = use(params);
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
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

  const location = choice === OTHER ? custom.trim() : choice;
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
      <Link
        href={`/plants/${id}`}
        className="-ml-1 inline-flex items-center gap-0.5 text-sm text-ink-70 transition-colors hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        돌아가기
      </Link>

      <SectionTitle as="h1" className="mt-6">
        식물 정보 수정
      </SectionTitle>

      {loadError && <ErrorMessage className="mt-6">{loadError}</ErrorMessage>}
      {!plant && !loadError && <Loading className="mt-8" />}

      {plant && (
        <>
          <form onSubmit={save} className="mt-8 flex flex-col gap-5">
            <Panel title="별명">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={NICKNAME_MAX}
                placeholder={plant.species}
                aria-label="별명"
                className="w-full rounded-md border border-rule bg-sheet px-3.5 py-3 text-sm text-ink placeholder:text-ink-45 focus:border-leaf focus:outline-none"
              />
              <p className="mt-2 text-xs text-ink-45">
                비워두면 종 이름({plant.species})으로 보여요.
              </p>
            </Panel>

            <Panel title="두는 곳">
              <div role="radiogroup" aria-label="두는 곳" className="flex flex-wrap gap-2">
                {[...LOCATIONS, OTHER].map((option) => {
                  const selected = choice === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      // 고른 것을 다시 누르면 선택을 푼다. 두는 곳은 비워둘 수 있다.
                      onClick={() => setChoice(selected ? null : option)}
                      className={`rounded-md border px-3.5 py-2 text-sm transition-colors ${
                        selected
                          ? "border-leaf bg-leaf-50 font-medium text-leaf"
                          : "border-rule bg-sheet text-ink-70 hover:border-wood hover:text-ink"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {choice === OTHER && (
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  maxLength={LOCATION_MAX}
                  placeholder="예: 사무실 책상"
                  aria-label="두는 곳 직접 입력"
                  autoFocus
                  className="mt-3 w-full rounded-md border border-rule bg-sheet px-3.5 py-3 text-sm text-ink placeholder:text-ink-45 focus:border-leaf focus:outline-none"
                />
              )}

              {locationChanged && (
                <p className="mt-3 text-xs leading-relaxed text-ink-45">
                  두는 곳이 바뀌면 관리 가이드를 새 자리에 맞춰 다시 만들어요.
                </p>
              )}
            </Panel>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Button type="submit" disabled={saving} full>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </form>

          <DeleteSection plantId={id} name={plant.nickname || plant.species} />
        </>
      )}
    </PageShell>
  );
}

/** 삭제는 한 번 더 묻는다. 기록과 사진이 모두 지워지고 되돌릴 수 없다. */
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
          <p className="text-sm leading-relaxed text-clay">
            {name}을(를) 삭제할까요? 물주기·진단 기록과 사진이 모두 지워지고 되돌릴 수
            없어요.
          </p>
          {error && <ErrorMessage className="mt-3">{error}</ErrorMessage>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="danger"
              onClick={remove}
              disabled={deleting}
              className="sm:flex-1"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="sm:flex-1"
            >
              취소
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink-70">
            기록과 사진까지 모두 지워집니다.
          </p>
          <Button
            type="button"
            variant="ghost"
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
