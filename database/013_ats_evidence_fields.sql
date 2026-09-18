alter table projects add column if not exists role text;
alter table projects add column if not exists start_date date;
alter table projects add column if not exists end_date date;
alter table projects add column if not exists outcomes text;
alter table projects add column if not exists include_in_cv boolean not null default true;

alter table certificates add column if not exists credential_id text;
alter table certificates add column if not exists expires_at date;
alter table certificates add column if not exists skills text;
alter table certificates add column if not exists include_in_cv boolean not null default true;
