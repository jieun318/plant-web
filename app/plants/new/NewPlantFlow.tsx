"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import LocationPicker, { OTHER, toLocation } from "@/components/LocationPicker";
import PageShell from "@/components/layout/PageShell";
import PhotoUpload from "@/components/PhotoUpload";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import PhotoFrame from "@/components/ui/PhotoFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import SpecimenLabel, { type SpecimenField } from "@/components/ui/SpecimenLabel";
import StepList from "@/components/ui/StepList";
import { apiFetch } from "@/lib/api";
import { formatRange } from "@/lib/format";
import {
  getIdentifyServerSnapshot,
  getIdentifySnapshot,
  subscribeIdentify,
} from "@/lib/handoff";
import { toIdentifyResult } from "@/lib/identification";
import { NICKNAME_MAX } from "@/lib/plant";
import type { Device, Identification, IdentifyResult, Plant } from "@/types";

const STEPS = ["사진으로 알아보기", "등록", "기기 연결"];

// 첫 기록이 들어왔는지 이 간격으로 확인한다
const POLL_MS = 5000;

/**
 * S-03 식물 추가. 세 단계로 끝난다.
 *
 * 단계는 주소에 담는다.
 *   /plants/new                     1단계
 *   /plants/new?id=<판별 기록>       2단계 (새로고침해도 남는다)
 *   /plants/new?plant=<식물>&step=device  3단계 (관찰일지에서 바로 들어오기도 한다)
 */
export default function NewPlantFlow() {
  const params = useSearchParams();
  // 판별 기록을 남기지 못했을 때도 2단계로 오므로(?id= 가 빈 값) 값이 아니라 있는지로 본다
  const identificationId = params.get("id") || null;
  const plantId = params.get("plant");
  const step = plantId && params.get("step") === "device" ? 3 : params.has("id") ? 2 : 1;

  return (
    <PageShell className="max-w-3xl">
      <SectionTitle as="h1">식물 추가</SectionTitle>

      <ol className="mt-7 flex gap-6 border-b border-hair">
        {STEPS.map((label, i) => {
          const current = i + 1 === step;

          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className={`-mb-px border-b pb-2 text-sm ${
                current
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent text-faint"
              }`}
            >
              <span className="font-mono">{String(i + 1).padStart(2, "0")}</span> {label}
            </li>
          );
        })}
      </ol>

      {step === 1 && <StepPhoto />}
      {step === 2 && <StepRegister identificationId={identificationId} />}
      {step === 3 && <StepDevice plantId={plantId!} />}
    </PageShell>
  );
}

/** 1단계 — 사진으로 종을 알아본다. 적정 온습도 기준이 여기서 정해진다. */
function StepPhoto() {
  return (
    <div className="mt-8 grid items-start gap-7 md:grid-cols-2">
      <PhotoUpload to={(id) => (id ? `/plants/new?id=${id}` : "/plants/new?id=")} />

      <section>
        <SectionHeader title="왜 먼저 알아봐야 하나요" />
        <p className="mt-3.5 text-sm leading-relaxed text-soft">
          기기가 재는 온도와 습도가 좋은지 나쁜지는 식물마다 다릅니다. 종을 알아야 이
          식물에게 맞는 적정 범위가 정해지고, 그 기준으로 매일의 관찰을 판단할 수 있어요.
        </p>
      </section>
    </div>
  );
}

/** 2단계 — 별명과 두는 곳을 정해 등록한다. */
function StepRegister({ identificationId }: { identificationId: string | null }) {
  const router = useRouter();

  // 판별 기록이 남지 않았을 때만 쓰는 값 (세션이 없거나 판별에 실패한 경우)
  const handoff = useSyncExternalStore(
    subscribeIdentify,
    getIdentifySnapshot,
    getIdentifyServerSnapshot
  );

  const [record, setRecord] = useState<Identification | null | undefined>(
    identificationId ? undefined : null
  );
  const [nickname, setNickname] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identificationId) return;

    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/identifications/${identificationId}`);
        const data = await res.json();
        if (alive) setRecord(res.ok ? (data as Identification) : null);
      } catch {
        if (alive) setRecord(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [identificationId]);

  async function register(e: FormEvent, withDevice: boolean) {
    e.preventDefault();
    if (saving) return;

    if (choice === OTHER && !custom.trim()) {
      setError("두는 곳을 적어주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 기록이 있으면 id 만 보낸다. 사진과 종 정보는 서버가 그 기록에서 복사한다.
          ...(record
            ? { identificationId: record.id }
            : { result: handoff?.result, photo: handoff?.photo }),
          nickname,
          location: toLocation(choice, custom),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "등록하지 못했습니다.");
        return;
      }

      const plant = data as Plant;
      router.push(withDevice ? `/plants/new?plant=${plant.id}&step=device` : `/plants/${plant.id}`);
    } catch {
      setError("등록에 실패했습니다. 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (record === undefined || (!identificationId && handoff === undefined)) {
    return <Loading className="mt-8" label="판별 결과를 불러오는 중..." />;
  }

  const result = record ? toIdentifyResult(record) : handoff?.result;
  const photo = record ? record.photo_url : handoff?.photo;

  if (!result) {
    return (
      <div className="mt-8">
        <p className="text-sm leading-relaxed text-soft">
          판별 결과가 없어요. 사진을 먼저 올려주세요.
        </p>
        <Button href="/plants/new" className="mt-6">
          사진 올리러 가기
        </Button>
      </div>
    );
  }

  if (!result.confident) {
    return (
      <div className="mt-8">
        <SectionTitle as="h2">판별하지 못했어요</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-soft">
          잎과 줄기가 잘 보이게, 밝은 곳에서 다시 찍어주세요.
        </p>
        <Button href="/plants/new" className="mt-6">
          다시 올리기
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => register(e, true)} className="mt-8 grid items-start gap-7 md:grid-cols-2">
      <div className="min-w-0">
        <PhotoFrame src={photo} ratio="photo" alt="판별한 사진" />
        <SpecimenLabel
          className="mt-3.5"
          heading="판별 결과"
          name={result.koreanName}
          scientificName={result.scientificName}
          fields={rangeFields(result)}
        />
      </div>

      <div>
        <SectionHeader title="별명" />
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX}
          placeholder={result.koreanName}
          aria-label="별명"
          className="mt-3 w-full border-0 border-b border-ink bg-transparent px-0 py-2 text-sm text-ink placeholder:text-faint focus:outline-none"
        />
        <p className="mt-2 text-xs text-soft">비워두면 종 이름으로 보여요.</p>

        <SectionHeader title="두는 곳" className="mt-9" />
        <div className="mt-3.5">
          <LocationPicker
            choice={choice}
            custom={custom}
            onChoice={setChoice}
            onCustom={setCustom}
          />
        </div>

        <p className="mt-9 text-sm leading-relaxed text-soft">
          기기가 잰 값이 적정 범위를 벗어나면 관찰일지에 표시돼요.
        </p>

        {error && <ErrorMessage className="mt-4">{error}</ErrorMessage>}

        <Button type="submit" disabled={saving} full className="mt-4">
          {saving ? "등록 중..." : "등록하고 기기 연결하기"}
        </Button>
        <Button
          type="button"
          variant="link"
          className="mt-4"
          onClick={(e) => register(e, false)}
          disabled={saving}
        >
          기기 없이 등록만
        </Button>
      </div>
    </form>
  );
}

/** 판별이 정한 적정 범위. 못 받았으면 그 줄을 뺀다. */
function rangeFields(result: IdentifyResult): SpecimenField[] {
  const fields: (SpecimenField | null)[] = [
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
  ];

  return fields.filter((field): field is SpecimenField => Boolean(field?.value));
}

/** 3단계 — 기기 토큰을 한 번만 보여주고 첫 기록을 기다린다. */
function StepDevice({ plantId }: { plantId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [existing, setExisting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 발급은 토큰을 바꾼다. 실수로 두 번 부르면 이미 넣어둔 코드가 무효가 되므로
  // 한 번만 부르게 막는다 (개발 모드에서는 effect 가 두 번 실행된다).
  const issued = useRef(false);

  const issue = useCallback(async () => {
    issued.current = true;
    setError(null);

    try {
      const res = await apiFetch(`/api/plants/${plantId}/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "기기를 연결하지 못했습니다.");
        return;
      }

      setToken(data.token as string);
      setDevice(data.device as Device);
      setExisting(false);
      setConnected(false);
    } catch {
      setError("기기를 연결하지 못했습니다. 연결을 확인해 주세요.");
    }
  }, [plantId]);

  // 아직 기기가 없으면 코드를 만들어 보여준다.
  // 이미 있으면 발급하지 않는다. 쓰고 있는 코드를 말없이 무효로 만들지 않는다.
  useEffect(() => {
    if (issued.current) return;

    let alive = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/plants/${plantId}/journal`);
        const data = res.ok ? await res.json() : null;

        if (!alive || issued.current) return;

        if (data?.device) {
          setDevice(data.device as Device);
          setExisting(true);
          setConnected(Boolean(data.device.last_seen_at));
          issued.current = true;
          return;
        }

        await issue();
      } catch {
        if (alive) setError("기기를 연결하지 못했습니다. 연결을 확인해 주세요.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [plantId, issue]);

  // 첫 기록이 들어오면 화면이 바뀐다
  useEffect(() => {
    if (!token || connected) return;

    let alive = true;

    const timer = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/plants/${plantId}/journal`);
        if (!res.ok) return;

        const data = await res.json();
        if (alive && data.device?.last_seen_at) setConnected(true);
      } catch {
        // 다음 차례에 다시 확인한다
      }
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [plantId, token, connected]);

  return (
    <div className="mt-8 grid items-start gap-7 md:grid-cols-2">
      <section>
        <SectionHeader title="라즈베리파이에 이 코드를 넣어주세요" />

        {error && <ErrorMessage className="mt-3.5">{error}</ErrorMessage>}
        {!token && !existing && !error && <Loading className="mt-3.5" label="코드를 만드는 중..." />}

        {existing && (
          <>
            <p className="mt-3.5 text-sm leading-relaxed text-soft">
              이미 발급한 코드가 있어요. 코드는 발급할 때 한 번만 보여줘서 다시 볼 수 없습니다.
              잃어버렸다면 새로 발급하세요. 새로 발급하면 예전 코드는 쓸 수 없습니다.
            </p>
            <Button variant="link" className="mt-3" onClick={issue}>
              새 코드 발급
            </Button>
          </>
        )}

        {token && (
          <>
            <p className="mt-3.5 rounded-xs bg-ink px-4 py-3.5 font-mono text-[13px] break-all text-paper">
              {token}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-soft">
              이 화면을 벗어나면 다시 볼 수 없어요. 잃어버리면 식물 수정에서 새로 발급하면
              됩니다.
            </p>
          </>
        )}
      </section>

      <section>
        <SectionHeader title="연결 방법" aside={device ? <span className="font-mono">{device.name}</span> : undefined} />
        <div className="mt-3.5">
          <StepList
            steps={[
              "라즈베리파이의 pi/.env 를 엽니다",
              "왼쪽 코드를 PLANT_TOKEN 에 붙여넣고 저장합니다",
              "카메라가 식물을 향하게 고정합니다",
              "첫 기록이 들어오면 이 화면이 바뀝니다",
            ]}
          />
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-3 border-t border-hair pt-3">
          <span className="text-sm text-soft">
            {connected ? "첫 기록이 들어왔어요" : "첫 기록을 기다리는 중…"}
          </span>
          <span className="font-mono text-xs text-faint">{connected ? "연결됨" : "대기"}</span>
        </div>

        <Button
          href={`/plants/${plantId}`}
          variant={connected ? "primary" : "link"}
          full={connected}
          className="mt-6"
        >
          관찰일지 보기
        </Button>
      </section>
    </div>
  );
}
