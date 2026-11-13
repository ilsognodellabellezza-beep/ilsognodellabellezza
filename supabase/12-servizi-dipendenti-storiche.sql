-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Servizi eseguiti dalle dipendenti storiche
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
-- (richiede prima 09-titoli-dipendenti-prezzo-da.sql)
-- =====================================================================

-- null = servizi di default; un elenco = solo quei servizi
alter table public.operator_overrides add column if not exists service_ids text[];
