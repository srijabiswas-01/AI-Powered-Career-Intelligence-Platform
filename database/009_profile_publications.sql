alter table profiles add column if not exists publications_json jsonb not null default '[]'::jsonb;
