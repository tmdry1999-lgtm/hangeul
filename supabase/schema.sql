-- 발음 지도 앱 데이터베이스 구조
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

create extension if not exists pgcrypto;

-- 반
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 학생
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  number int not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

-- 검사 세션 (학생 한 명이 한 단계를 한 번 연습한 기록)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  stage_name text not null,
  items jsonb not null default '[]',
  total int not null default 0,
  created_at timestamptz not null default now()
);

alter table classes enable row level security;
alter table students enable row level security;
alter table sessions enable row level security;

-- 선생님은 본인이 만든 데이터만 보고 수정할 수 있음
create policy "teachers manage own classes" on classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teachers manage own students" on students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teachers manage own sessions" on sessions
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
