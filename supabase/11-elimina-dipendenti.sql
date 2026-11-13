-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Eliminazione delle dipendenti storiche
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
-- (richiede prima 09-titoli-dipendenti-prezzo-da.sql)
-- =====================================================================

alter table public.operator_overrides add column if not exists deleted boolean not null default false;
