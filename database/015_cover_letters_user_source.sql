alter table cover_letters add column if not exists user_id uuid references users(id) on delete cascade;

update cover_letters c
set user_id = r.user_id
from resumes r
where c.resume_id = r.id and c.user_id is null;

alter table cover_letters alter column resume_id drop not null;
alter table cover_letters alter column user_id set not null;

create index if not exists cover_letters_user_id_idx on cover_letters(user_id, created_at desc);
