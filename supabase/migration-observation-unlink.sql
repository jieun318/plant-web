-- 기기 연결을 해제해도 기록은 남게 (2026-09-28)
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행한다.
-- 여러 번 실행해도 안전하다.
--
-- 무엇이 문제였나
-- migration-observation.sql 에서 sensor_readings.device_id 와
-- plant_snapshots.device_id 를 on delete cascade 로 걸었다.
-- 그러면 기기 연결을 해제할 때 지금까지 쌓인 온습도와 사진이 함께 사라진다.
-- 관찰일지는 기기를 떼어내도 남아야 하므로 on delete set null 로 바꾼다.
--
-- 이미 만들어 둔 표를 고치는 것이라, 새로 설치하는 경우에는
-- migration-observation.sql 만 실행하면 된다 (그 파일도 같이 고쳐 두었다).

alter table sensor_readings alter column device_id drop not null;
alter table sensor_readings drop constraint if exists sensor_readings_device_id_fkey;
alter table sensor_readings
  add constraint sensor_readings_device_id_fkey
  foreign key (device_id) references devices (id) on delete set null;

alter table plant_snapshots alter column device_id drop not null;
alter table plant_snapshots drop constraint if exists plant_snapshots_device_id_fkey;
alter table plant_snapshots
  add constraint plant_snapshots_device_id_fkey
  foreign key (device_id) references devices (id) on delete set null;
