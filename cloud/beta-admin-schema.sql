create table if not exists public.codequest_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.codequest_admins enable row level security;
revoke all on public.codequest_admins from anon, authenticated;
grant select on public.codequest_admins to authenticated;
create policy "admins read own membership" on public.codequest_admins
for select to authenticated using ((select auth.uid()) = user_id);

alter table public.codequest_beta_feedback
  add column if not exists updated_at timestamptz not null default now();
grant select, update on public.codequest_beta_feedback to authenticated;
create index if not exists codequest_beta_feedback_user_id_idx
on public.codequest_beta_feedback (user_id);
drop policy if exists "beta feedback read own" on public.codequest_beta_feedback;
drop policy if exists "beta feedback admin read all" on public.codequest_beta_feedback;
create policy "beta feedback read own or admin" on public.codequest_beta_feedback
for select to authenticated using (
  (select auth.uid()) = user_id or exists (
    select 1 from public.codequest_admins a where a.user_id = (select auth.uid())
  )
);
create policy "beta feedback admin update" on public.codequest_beta_feedback
for update to authenticated
using (exists (select 1 from public.codequest_admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.codequest_admins a where a.user_id = (select auth.uid())));
