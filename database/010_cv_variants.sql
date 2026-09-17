alter table profiles add column if not exists cv_variants_json jsonb not null default '[]'::jsonb;
