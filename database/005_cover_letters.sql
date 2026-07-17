create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  job_title text not null,
  company text not null,
  hr_name text,
  hr_email text,
  cover_letter text not null,
  email_subject text not null,
  email_body text not null,
  provider text not null,
  created_at timestamptz not null default now()
);
create index if not exists cover_letters_resume_id_idx on cover_letters(resume_id, created_at desc);

