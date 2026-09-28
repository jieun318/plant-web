-- 관찰 기기와 일일 관찰 (2026-09-23)
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행한다.
-- 여러 번 실행해도 안전하다 (if not exists / drop policy if exists).
--
-- 무엇이 바뀌나
-- 1. plants 에 적정 온습도 범위 — 판별에서 정해 관찰 기준으로 쓴다
-- 2. devices          — 식물에 붙은 라즈베리파이. 토큰은 해시만 저장한다
-- 3. sensor_readings  — 10분마다 오는 온습도 (DHT11 이라 정수)
-- 4. plant_snapshots  — 하루 몇 번 오는 사진
-- 5. daily_observations — 식물 × 날짜 한 줄. 대표 사진, 하루 평균, 상태, AI 코멘트
--
-- 식물을 지우면 아래 표의 줄도 함께 지워진다 (on delete cascade).
-- Storage 의 사진 파일은 따로 지워야 한다.


-- ── 1. plants — 적정 온습도 범위 ───────────────────────────────────
-- 판별할 때 종에 맞는 범위를 받아 저장한다. 이 범위를 벗어나면 관찰일지에 표시된다.
-- 예전에 등록한 식물은 비어 있고, 그때는 상태를 판정하지 않는다.
alter table plants add column if not exists temp_min     integer;
alter table plants add column if not exists temp_max     integer;
alter table plants add column if not exists humidity_min integer;
alter table plants add column if not exists humidity_max integer;


-- ── 2. devices ─────────────────────────────────────────────────────
-- 라즈베리파이에는 서비스 롤 키를 넣지 않는다. 기기마다 토큰을 발급하고
-- 여기에는 해시만 남긴다. 토큰 원문은 발급 화면에서 한 번만 보여준다.
create table if not exists devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- 한 식물에 기기 하나. 새 코드를 발급하면 이 줄의 token_hash 를 바꾼다.
  plant_id     uuid not null unique references plants (id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  -- 마지막으로 기록을 보낸 시각. 1시간 넘게 없으면 "연결 끊김"
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists devices_user_idx on devices (user_id);


-- ── 3. sensor_readings ─────────────────────────────────────────────
-- DHT11 은 정수 단위로 재고 오차가 있다. 그래서 한 점이 아니라
-- 하루 평균과 연속 일수로 상태를 판정한다.
-- plant_id 는 device 를 거치지 않고 바로 훑으려고 같이 둔다.
create table if not exists sensor_readings (
  id          uuid primary key default gen_random_uuid(),
  -- 기기 연결을 해제해도 기록은 남아야 한다. 그래서 cascade 가 아니라 set null
  device_id   uuid references devices (id) on delete set null,
  plant_id    uuid not null references plants (id) on delete cascade,
  temperature integer not null,
  humidity    integer not null,
  measured_at timestamptz not null,
  created_at  timestamptz not null default now(),

  -- 네트워크가 끊겼다 다시 보낼 때 같은 측정이 두 번 쌓이지 않게 한다
  unique (device_id, measured_at)
);

create index if not exists sensor_readings_plant_idx
  on sensor_readings (plant_id, measured_at desc);


-- ── 4. plant_snapshots ─────────────────────────────────────────────
-- 매일 정해진 시각에 찍은 사진. 그날 10시 사진이 관찰일지의 대표 사진이 된다.
create table if not exists plant_snapshots (
  id          uuid primary key default gen_random_uuid(),
  -- 위와 같은 이유로 set null
  device_id   uuid references devices (id) on delete set null,
  plant_id    uuid not null references plants (id) on delete cascade,
  photo_url   text not null,
  captured_at timestamptz not null,
  created_at  timestamptz not null default now(),

  unique (device_id, captured_at)
);

create index if not exists plant_snapshots_plant_idx
  on plant_snapshots (plant_id, captured_at desc);


-- ── 5. daily_observations ──────────────────────────────────────────
-- 하루 1회 만든다. 상태는 AI 가 아니라 규칙으로 정한다.
--   good   좋음        하루 평균이 적정 범위 안
--   caution 주의       벗어난 날이 최근 1~2일
--   check  확인 필요   3일 이상 연속으로 벗어남, 또는 AI 가 잎 변화를 봄
-- avg_temp / avg_humidity 는 평균이라 소수 한 자리까지 담는다.
create table if not exists daily_observations (
  id           uuid primary key default gen_random_uuid(),
  plant_id     uuid not null references plants (id) on delete cascade,
  date         date not null,
  photo_url    text,
  avg_temp     numeric(4,1),
  avg_humidity numeric(4,1),
  status       text not null check (status in ('good', 'caution', 'check')),
  ai_comment   text,
  created_at   timestamptz not null default now(),

  -- 식물마다 하루 한 줄. 다시 만들면 이 제약으로 덮어쓴다 (upsert)
  unique (plant_id, date)
);

create index if not exists daily_observations_plant_idx
  on daily_observations (plant_id, date desc);


-- ── 접근 정책 ──────────────────────────────────────────────────────
-- API 라우트는 서비스 롤로 접근하므로 이 정책이 없어도 앱은 돈다.
-- anon 키가 새더라도 남의 기기와 기록을 못 보게 켜 둔다.
-- 기기가 보내는 요청은 토큰을 서버가 검증하고 서비스 롤로 쓴다.
alter table devices            enable row level security;
alter table sensor_readings    enable row level security;
alter table plant_snapshots    enable row level security;
alter table daily_observations enable row level security;

drop policy if exists "own devices" on devices;
create policy "own devices" on devices
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own sensor_readings" on sensor_readings;
create policy "own sensor_readings" on sensor_readings
  for all to authenticated
  using (exists (
    select 1 from plants p
    where p.id = sensor_readings.plant_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from plants p
    where p.id = sensor_readings.plant_id and p.user_id = auth.uid()
  ));

drop policy if exists "own plant_snapshots" on plant_snapshots;
create policy "own plant_snapshots" on plant_snapshots
  for all to authenticated
  using (exists (
    select 1 from plants p
    where p.id = plant_snapshots.plant_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from plants p
    where p.id = plant_snapshots.plant_id and p.user_id = auth.uid()
  ));

drop policy if exists "own daily_observations" on daily_observations;
create policy "own daily_observations" on daily_observations
  for all to authenticated
  using (exists (
    select 1 from plants p
    where p.id = daily_observations.plant_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from plants p
    where p.id = daily_observations.plant_id and p.user_id = auth.uid()
  ));
