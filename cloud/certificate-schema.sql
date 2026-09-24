create table if not exists public.codequest_certificates (
  certificate_code text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 48),
  completed_missions smallint not null default 131 check (completed_missions = 131),
  issued_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'revoked'))
);

alter table public.codequest_certificates enable row level security;
revoke all on public.codequest_certificates from anon, authenticated;
create index if not exists codequest_certificates_user_id_idx on public.codequest_certificates(user_id);

create policy "Certificates are private behind the verification gateway"
on public.codequest_certificates for select
to anon, authenticated
using (false);
