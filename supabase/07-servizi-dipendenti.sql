-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Servizi e dipendenti aggiunti dal gestionale
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
-- (richiede prima 06-gestione-sito.sql)
-- =====================================================================

create table if not exists public.custom_services (
  id text primary key,
  name text not null check (char_length(name) between 2 and 160),
  category text not null check (category in ('laser', 'massaggi', 'sguardo', 'viso', 'mani-piedi')),
  price numeric(10,2) not null check (price >= 0),
  promo_price numeric(10,2) check (promo_price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  description text not null default '' check (char_length(description) <= 1000),
  only_women boolean not null default false,
  is_popular boolean not null default false,
  operator_ids text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_operators (
  id text primary key,
  name text not null check (char_length(name) between 2 and 60),
  role text not null default '' check (char_length(role) <= 120),
  specialization text not null default '' check (char_length(specialization) <= 200),
  service_ids text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.custom_services  enable row level security;
alter table public.custom_operators enable row level security;

drop policy if exists "custom_services: tutti leggono" on public.custom_services;
create policy "custom_services: tutti leggono" on public.custom_services
  for select to anon, authenticated using (true);
drop policy if exists "custom_services: titolare scrive" on public.custom_services;
create policy "custom_services: titolare scrive" on public.custom_services
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "custom_operators: tutti leggono" on public.custom_operators;
create policy "custom_operators: tutti leggono" on public.custom_operators
  for select to anon, authenticated using (true);
drop policy if exists "custom_operators: titolare scrive" on public.custom_operators;
create policy "custom_operators: titolare scrive" on public.custom_operators
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant select on public.custom_services, public.custom_operators to anon;
grant select, insert, update, delete on public.custom_services, public.custom_operators to authenticated;
grant all on public.custom_services, public.custom_operators to service_role;
