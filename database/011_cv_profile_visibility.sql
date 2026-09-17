alter table profiles add column if not exists cv_preferences_json jsonb not null default '{"location":true,"phone":true,"summary":true}'::jsonb;
