-- 관리 가이드 캐시 (2026-09-16)
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행한다.
-- 여러 번 실행해도 안전하다.
--
-- 가이드는 Gemini 가 만든다. 매번 부르면 느리고 비싸므로 식물마다 탭마다
-- 한 번만 만들어 두고 다시 쓴다.

create table if not exists guides (
  id         uuid primary key default gen_random_uuid(),
  plant_id   uuid not null references plants (id) on delete cascade,
  -- water | light | repot | fertilize
  topic      text not null,
  when_to    text not null,
  steps      jsonb not null default '[]'::jsonb,
  caution    text,
  created_at timestamptz not null default now(),

  -- 같은 식물의 같은 탭은 하나만 둔다. 캐시가 여기에 걸린다.
  unique (plant_id, topic)
);

create index if not exists guides_plant_idx on guides (plant_id);


-- ── 접근 정책 ──────────────────────────────────────────────────────
-- API 라우트는 서비스 롤로 접근하므로 이 정책이 없어도 앱은 돈다.
-- anon 키가 새더라도 남의 가이드를 못 보게 켜 둔다.
alter table guides enable row level security;

drop policy if exists "own guides" on guides;
create policy "own guides" on guides
  for all to authenticated
  using (exists (
    select 1 from plants p
    where p.id = guides.plant_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from plants p
    where p.id = guides.plant_id and p.user_id = auth.uid()
  ));
