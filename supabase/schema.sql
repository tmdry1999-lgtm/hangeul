-- 발음 지도 앱 데이터베이스 구조
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

-- gen_random_uuid() 함수(각 행의 id를 자동으로 무작위 uuid로 채워주는 기능)를 쓰기 위해 필요한 확장 기능
create extension if not exists pgcrypto;

-- 반
-- teacher_id는 Supabase Auth가 관리하는 auth.users 테이블(로그인 계정 목록)을 가리킨다.
-- "on delete cascade"는 그 선생님 계정이 삭제되면 이 반 데이터도 함께 자동 삭제된다는 뜻.
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 학생
-- class_id로 어느 반 소속인지 연결하고, teacher_id도 함께 저장해서(반을 거치지 않고도)
-- 아래 RLS 정책에서 "이 학생이 내 학생인지"를 바로 확인할 수 있게 한다.
-- multicultural(다문화 가정 학생 여부)/basic_support(기초학습지원대상 여부)는 검사지 리포트에
-- 함께 표시하기 위한 체크박스 항목이다 (2026-09-02 추가). 둘 다 기본값 false.
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  number int not null,
  name text not null default '',
  multicultural boolean not null default false,
  basic_support boolean not null default false,
  created_at timestamptz not null default now()
);

-- 검사 세션 (학생 한 명이 한 단계를 한 번 연습한 기록 = "시험 1회")
-- items는 그 세션에서 푼 문항들의 채점 결과 배열을 그대로 저장하는 jsonb(자유 형식 JSON) 컬럼이다.
-- 문항마다 표(컬럼)를 나누지 않고 jsonb 하나로 저장해서, 문항 구성이 바뀌어도 테이블 구조를
-- 다시 바꿀 필요가 없게 했다. total은 이 세션에서 풀어야 할 전체 문항 수.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  stage_name text not null,
  items jsonb not null default '[]',
  total int not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security(행 단위 보안, RLS)를 켠다. 이걸 켜지 않으면 아래 정책(policy)이 있어도
-- 적용되지 않고 기본적으로 모든 행이 막히거나 열리는 동작이 달라질 수 있으므로 반드시 필요하다.
alter table classes enable row level security;
alter table students enable row level security;
alter table sessions enable row level security;

-- 선생님은 본인이 만든 데이터만 보고 수정할 수 있음.
-- auth.uid()는 "지금 로그인해서 이 요청을 보낸 사람의 id"를 Supabase가 자동으로 넣어주는 값이다.
-- using(...)은 조회/수정/삭제 시 "어떤 행을 볼 수 있는지"를, with check(...)는 "새로 쓰거나 바꿀 때
-- 그 값이 이 조건을 만족해야 한다"를 검사한다 (즉 다른 선생님 명의로 데이터를 끼워넣는 것도 막는다).
create policy "teachers manage own classes" on classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teachers manage own students" on students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teachers manage own sessions" on sessions
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ===== 마이그레이션 (2026-09-02) =====
-- 위 "create table if not exists students"는 students 테이블이 아예 없을 때만 실행되기 때문에,
-- 이미 만들어서 쓰고 있던 사람은 이 부분을 따로 한 번 더 실행해야 새 컬럼 2개가 추가된다.
-- "add column if not exists"라서 여러 번 실행해도 안전하다 (이미 있으면 그냥 넘어감).
alter table students add column if not exists multicultural boolean not null default false;
alter table students add column if not exists basic_support boolean not null default false;
