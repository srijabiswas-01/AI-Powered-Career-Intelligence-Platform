create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  headline text, location text, phone text, bio text, skills text,
  linkedin_url text, github_url text, portfolio_url text,
  updated_at timestamptz not null default now()
);
create table if not exists projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  title text not null, description text not null, technologies text, project_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on projects(user_id, created_at desc);
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  name text not null, issuer text not null, issued_at date, credential_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists certificates_user_id_idx on certificates(user_id, created_at desc);

