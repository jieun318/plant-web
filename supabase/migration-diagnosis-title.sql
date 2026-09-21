-- 진단 조치 제목 보존 (2026-09-21)
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행한다.
-- 여러 번 실행해도 안전하다 (if not exists).
--
-- 코드를 배포하기 전에 먼저 실행할 것. 진단 저장이 title 을 함께 넣으므로
-- 이 컬럼이 없으면 "기록에 저장"이 실패한다.
--
-- 무엇이 바뀌나
-- diagnoses 에 조치 제목(예: "물을 잠시 멈춰주세요")을 담는 title 컬럼을 추가한다.
-- 지난 진단을 다시 볼 때 원인·근거·할 일과 함께 보여준다.
-- 이전에 저장한 진단은 title 이 비어 있고, 화면은 제목 없이 보여준다.

alter table diagnoses add column if not exists title text;
