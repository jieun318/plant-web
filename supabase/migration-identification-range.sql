-- 판별 기록에 적정 온습도 범위 (2026-09-23)
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행한다.
-- 여러 번 실행해도 안전하다.
--
-- 왜 필요한가
-- 등록은 판별 기록(identifications)의 값을 plants 로 복사한다.
-- 판별이 정한 적정 범위를 여기에 담아두지 않으면 등록할 때 범위가 사라진다.
-- migration-observation.sql 의 plants 쪽 컬럼과 짝이다.
--
-- 이 컬럼이 생기기 전에 판별한 기록은 비어 있다. 그 기록으로 등록하면
-- 범위 없이 등록되고, 관찰 상태는 판정하지 않는다.

alter table identifications add column if not exists temp_min     integer;
alter table identifications add column if not exists temp_max     integer;
alter table identifications add column if not exists humidity_min integer;
alter table identifications add column if not exists humidity_max integer;
