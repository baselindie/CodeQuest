create table if not exists public.codequest_mission_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_index smallint not null check (mission_index between 0 and 130),
  language text not null check (language in ('html', 'css', 'js')),
  verification_method text not null default 'server' check (verification_method in ('server', 'legacy_migration')),
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_index)
);

alter table public.codequest_mission_completions enable row level security;
revoke all on public.codequest_mission_completions from anon, authenticated;
create index if not exists codequest_mission_completions_user_id_idx
on public.codequest_mission_completions(user_id);
create policy "Mission proofs stay behind the validation gateway"
on public.codequest_mission_completions for select
to anon, authenticated
using (false);

-- One-time compatibility import for progress earned before server verification existed.
insert into public.codequest_mission_completions (user_id, mission_index, language, verification_method)
select distinct p.user_id, d.value::smallint,
  case when d.value::int < 4 then 'html'
       when d.value::int < 8 then 'css'
       when d.value::int < 12 then 'js'
       when (case when d.value::int < 36 then d.value::int when d.value::int < 76 then d.value::int-36 when d.value::int < 106 then d.value::int-76 else d.value::int-106 end) % 3 = 0 then 'html'
       when (case when d.value::int < 36 then d.value::int when d.value::int < 76 then d.value::int-36 when d.value::int < 106 then d.value::int-76 else d.value::int-106 end) % 3 = 1 then 'css' else 'js' end,
  'legacy_migration'
from public.codequest_progress p
cross join lateral jsonb_array_elements_text(coalesce(p.progress->'done','[]'::jsonb)) d(value)
where d.value ~ '^\d{1,3}$' and d.value::int between 0 and 130
on conflict (user_id, mission_index) do nothing;
