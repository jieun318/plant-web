-- 판별 기록 보존 (2026-09-16)
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행한다.
-- 이미 실행한 뒤 다시 실행해도 안전하다 (if not exists / drop policy if exists).
--
-- 무엇이 바뀌나
-- 1. identifications 테이블 신설 — 판별 결과를 브라우저가 아니라 DB 에 남긴다
-- 2. plants 에 종 정보 컬럼 추가 — 등록 시 판별 결과를 복사해 둔다
--    (identifications 를 지워도 식물 상세는 그대로 보인다)


-- ── 1. identifications ─────────────────────────────────────────────
create table if not exists identifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  photo_url           text,
  korean_name         text not null,
  scientific_name     text,
  difficulty          text,
  origin              text,
  light               text,
  water               text,
  humidity            text,
  repot               text,
  water_interval_days integer,
  confident           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- 최근 10건만 남기므로 (user_id, created_at) 로 자주 훑는다
create index if not exists identifications_user_created_idx
  on identifications (user_id, created_at desc);


-- ── 2. plants 에 종 정보 ───────────────────────────────────────────
-- 등록 시 판별 결과를 복사한다. 판별 기록이 지워져도 남아 있어야 해서
-- 참조가 아니라 값으로 복사한다.
alter table plants
  add column if not exists scientific_name   text,
  add column if not exists difficulty        text,
  add column if not exists origin            text,
  add column if not exists light             text,
  add column if not exists water             text,
  add column if not exists humidity          text,
  add column if not exists repot             text,
  -- "최근 본 식물"에서 이미 등록한 판별을 빼려면 어느 판별로 등록했는지 알아야 한다.
  -- 판별 기록이 지워지면 null 이 되고, 식물 자체는 남는다.
  add column if not exists identification_id uuid
    references identifications (id) on delete set null;

create index if not exists plants_identification_idx
  on plants (identification_id);


-- ── 3. 접근 정책 ───────────────────────────────────────────────────
-- API 라우트는 서비스 롤로 접근하므로 이 정책이 없어도 앱은 돈다.
-- anon 키가 새더라도 남의 판별 기록을 못 보게 켜 둔다.
alter table identifications enable row level security;

drop policy if exists "own identifications" on identifications;
create policy "own identifications" on identifications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
