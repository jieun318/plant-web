-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행한다.
--
-- 먼저 대시보드 Authentication > Sign In / Providers 에서
-- "Anonymous sign-ins" 를 켜야 한다. 이건 SQL 로 못 바꾼다.

-- ── 1. 사진 저장용 버킷 ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read plant photos" on storage.objects;
create policy "public read plant photos" on storage.objects
  for select to public using (bucket_id = 'plant-photos');


-- ── 2. 테이블 접근 정책 ─────────────────────────────────────────────
-- 지금은 API 라우트가 서비스 롤 키로 접근하고, 사용자 ID 는 요청에 실린
-- 토큰을 검증해서 꺼낸다. 서비스 롤은 RLS 를 우회하므로 아래 정책이 없어도
-- 앱은 돌아간다. 그래도 켜 두면 anon 키가 새더라도 남의 데이터를 못 만진다.

alter table plants    enable row level security;
alter table care_logs enable row level security;
alter table diagnoses enable row level security;

drop policy if exists "own plants" on plants;
create policy "own plants" on plants
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own care_logs" on care_logs;
create policy "own care_logs" on care_logs
  for all to authenticated
  using (exists (
    select 1 from plants p
    where p.id = care_logs.plant_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from plants p
    where p.id = care_logs.plant_id and p.user_id = auth.uid()
  ));
