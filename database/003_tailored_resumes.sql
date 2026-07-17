create table if not exists tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  job_title text not null,
  company text not null,
  job_url text,
  content text not null,
  provider text not null,
  created_at timestamptz not null default now()
);
create index if not exists tailored_resumes_resume_id_idx on tailored_resumes(resume_id, created_at desc);

