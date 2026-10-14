create table if not exists public.daily_steps (
  day date not null,
  member text not null check (member in ('Mini','Bunny','Honey','Chinnu')),
  steps integer not null check (steps >= 0 and steps <= 100000),
  created_at timestamptz not null default now(),
  primary key (day, member)
);

alter table public.daily_steps enable row level security;

create policy "public can read step squad"
on public.daily_steps for select
to anon
using (true);

create policy "public can add or update step squad"
on public.daily_steps for insert
to anon
with check (true);

create policy "public can update step squad"
on public.daily_steps for update
to anon
using (true)
with check (true);
