-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Permessi di accesso alle tabelle
-- Nei progetti Supabase recenti le tabelle create via SQL non sono
-- accessibili finché non si danno i permessi. Chi vede cosa resta
-- deciso dalle regole RLS di schema.sql.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Server (script account, promemoria email)
grant all on all tables in schema public to service_role;

-- Staff collegato: le regole RLS limitano dipendente/titolare
grant select, insert, update, delete on public.appointments, public.clients, public.reviews to authenticated;
grant select on public.profiles, public.email_logs to authenticated;

-- Pubblico: solo leggere recensioni approvate e inviarne di nuove
grant select, insert on public.reviews to anon;
