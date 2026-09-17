alter table applications add column if not exists source text;
alter table applications add column if not exists recruiter text;
alter table applications add column if not exists follow_up_at date;
alter table applications add column if not exists notes text;

alter table applications drop constraint if exists applications_stage_check;
alter table applications add constraint applications_stage_check check (stage in (
  'Saved', 'Applied', 'Screening', 'Assessment', 'Interview', 'Final interview',
  'Offer', 'Rejected', 'Withdrawn'
));

create index if not exists applications_follow_up_idx
  on applications(user_id, follow_up_at) where follow_up_at is not null;
