-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Titoli servizi modificabili, dipendenti
-- modificabili, "a partire da" sui prezzi, promemoria WhatsApp.
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
-- (richiede prima 06 e 07)
-- =====================================================================

-- Titolo personalizzato e "a partire da" per i servizi storici
alter table public.service_overrides add column if not exists name text check (name is null or char_length(name) between 2 and 160);
alter table public.service_overrides add column if not exists price_from boolean not null default false;

-- "a partire da" per i servizi creati dal titolare
alter table public.custom_services add column if not exists price_from boolean not null default false;

-- Modifiche ai dipendenti storici (nome, ruolo, specializzazione, attivo)
create table if not exists public.operator_overrides (
  operator_id text primary key,
  name text check (name is null or char_length(name) between 2 and 60),
  role text check (role is null or char_length(role) <= 120),
  specialization text check (specialization is null or char_length(specialization) <= 200),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.operator_overrides enable row level security;

drop policy if exists "operator_overrides: tutti leggono" on public.operator_overrides;
create policy "operator_overrides: tutti leggono" on public.operator_overrides
  for select to anon, authenticated using (true);
drop policy if exists "operator_overrides: titolare scrive" on public.operator_overrides;
create policy "operator_overrides: titolare scrive" on public.operator_overrides
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant select on public.operator_overrides to anon;
grant select, insert, update, delete on public.operator_overrides to authenticated;
grant all on public.operator_overrides to service_role;

-- Promemoria WhatsApp già inviato (segnato dal gestionale)
alter table public.appointments add column if not exists whatsapp_reminder_sent boolean not null default false;
