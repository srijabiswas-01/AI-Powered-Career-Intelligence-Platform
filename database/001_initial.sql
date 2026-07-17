create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on resumes(user_id, created_at desc);

create table if not exists resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  target_role text,
  job_description text,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  provider text not null default 'local',
  created_at timestamptz not null default now()
);

create index if not exists resume_analyses_resume_id_idx on resume_analyses(resume_id, created_at desc);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  company text not null,
  role text not null,
  stage text not null default 'Applied' check (stage in ('Applied', 'Interview', 'Offer', 'Rejected')),
  location text,
  job_url text,
  applied_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on applications(user_id, created_at desc);

