alter table resumes add column if not exists source_type text not null default 'uploaded' check (source_type in ('uploaded', 'ai_cv_builder'));
alter table resumes add column if not exists builder_snapshot jsonb;
alter table resumes add column if not exists target_role text;
alter table resumes add column if not exists job_description text;
create index if not exists resumes_source_type_idx on resumes(user_id, source_type, created_at desc);
