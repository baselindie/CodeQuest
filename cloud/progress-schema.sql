create table public.codequest_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.codequest_progress enable row level security;

grant select, insert, update, delete on public.codequest_progress to authenticated;

create policy "Students read their own progress"
on public.codequest_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Students create their own progress"
on public.codequest_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Students update their own progress"
on public.codequest_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Students delete their own progress"
on public.codequest_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

