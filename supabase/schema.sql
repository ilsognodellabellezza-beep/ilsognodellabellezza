-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Schema database Supabase
-- Incolla tutto nel Supabase SQL Editor e premi "Run".
-- Lo script si può rieseguire senza perdere dati.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PROFILI STAFF (collegati agli utenti di Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('titolare', 'dipendente')),
  operator_id text,
  created_at timestamptz not null default now()
);

-- Funzioni di controllo ruolo (security definer: evitano ricorsione RLS)
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'titolare');
$$;

-- ---------------------------------------------------------------------
-- 2. CLIENTI (CRM)
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null default '',
  notes text,
  allergies text,
  total_visits integer not null default 0,
  total_spent numeric(10,2) not null default 0,
  last_visit_date date,
  preferred_operator_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_clients_phone on public.clients(phone);
create index if not exists idx_clients_email on public.clients(lower(email));

-- ---------------------------------------------------------------------
-- 3. APPUNTAMENTI
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  client_email text not null default '',
  service_id text not null,
  service_name text not null,
  service_price numeric(10,2) not null,
  operator_id text not null,
  operator_name text not null,
  date date not null,
  time time not null,
  duration_minutes integer not null,
  status text not null default 'confermato'
    check (status in ('confermato', 'in_corso', 'completato', 'annullato')),
  notes text,
  reminder_sent boolean not null default false,
  payment_method text not null default 'non_saldato'
    check (payment_method in ('contanti', 'pos', 'bonifico', 'non_saldato')),
  created_at timestamptz not null default now()
);
create index if not exists idx_appointments_date_status on public.appointments(date, status);
create index if not exists idx_appointments_reminder on public.appointments(reminder_sent, date);

-- ---------------------------------------------------------------------
-- 4. RECENSIONI (le nuove vanno approvate dal titolare)
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null check (char_length(author) between 2 and 60),
  rating integer not null check (rating between 1 and 5),
  treatment_name text not null check (char_length(treatment_name) <= 120),
  comment text not null check (char_length(comment) between 5 and 1500),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. LOG EMAIL PROMEMORIA (Resend)
-- ---------------------------------------------------------------------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  recipient_email text not null,
  recipient_name text not null,
  appointment_code text not null,
  appointment_date date not null,
  appointment_time time not null,
  service_name text,
  status text not null check (status in ('inviata', 'fallita')),
  trigger_type text not null default 'cron_job_24h',
  resend_id text,
  error text,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. SICUREZZA (Row Level Security)
--    - Pubblico: può solo leggere recensioni approvate, inviarne di nuove
--      e prenotare tramite le funzioni qui sotto. NON vede clienti né agenda.
--    - Dipendente: agenda + clienti.
--    - Titolare: tutto (incassi, email, recensioni, eliminazioni).
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.clients      enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews      enable row level security;
alter table public.email_logs   enable row level security;

drop policy if exists "profiles: leggi il proprio o titolare" on public.profiles;
create policy "profiles: leggi il proprio o titolare" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_owner());

drop policy if exists "clients: staff legge" on public.clients;
create policy "clients: staff legge" on public.clients
  for select to authenticated using (public.is_staff());
drop policy if exists "clients: staff inserisce" on public.clients;
create policy "clients: staff inserisce" on public.clients
  for insert to authenticated with check (public.is_staff());
drop policy if exists "clients: staff modifica" on public.clients;
create policy "clients: staff modifica" on public.clients
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "clients: titolare elimina" on public.clients;
create policy "clients: titolare elimina" on public.clients
  for delete to authenticated using (public.is_owner());

drop policy if exists "appointments: staff legge" on public.appointments;
create policy "appointments: staff legge" on public.appointments
  for select to authenticated using (public.is_staff());
drop policy if exists "appointments: staff modifica" on public.appointments;
create policy "appointments: staff modifica" on public.appointments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "appointments: titolare elimina" on public.appointments;
create policy "appointments: titolare elimina" on public.appointments
  for delete to authenticated using (public.is_owner());

drop policy if exists "reviews: pubblico legge approvate" on public.reviews;
create policy "reviews: pubblico legge approvate" on public.reviews
  for select to anon, authenticated using (approved or public.is_owner());
drop policy if exists "reviews: pubblico invia" on public.reviews;
create policy "reviews: pubblico invia" on public.reviews
  for insert to anon, authenticated with check (approved = false);
drop policy if exists "reviews: titolare modera" on public.reviews;
create policy "reviews: titolare modera" on public.reviews
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "reviews: titolare elimina" on public.reviews;
create policy "reviews: titolare elimina" on public.reviews
  for delete to authenticated using (public.is_owner());

drop policy if exists "email_logs: titolare legge" on public.email_logs;
create policy "email_logs: titolare legge" on public.email_logs
  for select to authenticated using (public.is_owner());

-- ---------------------------------------------------------------------
-- 7. FUNZIONI PUBBLICHE PER LA PRENOTAZIONE ONLINE
-- ---------------------------------------------------------------------

-- Orari occupati in una data (senza dati personali)
create or replace function public.get_booked_slots(p_date date)
returns table (operator_id text, start_time time, duration_minutes integer)
language sql stable security definer set search_path = public as $$
  select a.operator_id, a.time, a.duration_minutes
  from public.appointments a
  where a.date = p_date and a.status <> 'annullato';
$$;

-- Crea una prenotazione (usata dal sito pubblico e dal gestionale).
-- Controlla sovrapposizioni, genera il codice e aggiorna la scheda cliente.
create or replace function public.create_booking(
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_service_id text,
  p_service_name text,
  p_service_price numeric,
  p_operator_id text,
  p_operator_name text,
  p_date date,
  p_time time,
  p_duration_minutes integer,
  p_notes text default null
) returns table (id uuid, code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text;
  v_client_id uuid;
  v_id uuid;
  v_phone text := regexp_replace(coalesce(p_client_phone, ''), '\s+', '', 'g');
  v_email text := lower(trim(coalesce(p_client_email, '')));
begin
  if char_length(trim(coalesce(p_client_name, ''))) < 2 or char_length(v_phone) < 6 then
    raise exception 'Nome e telefono sono obbligatori';
  end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 or p_duration_minutes > 480 then
    raise exception 'Durata non valida';
  end if;
  -- Il pubblico non può prenotare nel passato né oltre 6 mesi
  if not public.is_staff() and (p_date < current_date or p_date > current_date + 180) then
    raise exception 'Data non prenotabile';
  end if;

  -- Blocco concorrenza per operatrice+giorno
  perform pg_advisory_xact_lock(hashtext(p_operator_id || p_date::text));

  if exists (
    select 1 from public.appointments a
    where a.date = p_date and a.operator_id = p_operator_id and a.status <> 'annullato'
      and a.time < p_time + make_interval(mins => p_duration_minutes)
      and p_time < a.time + make_interval(mins => a.duration_minutes)
  ) then
    raise exception 'SLOT_OCCUPATO';
  end if;

  -- Codice univoco SOGNO-XXXXXX
  loop
    v_code := 'SOGNO-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.appointments where appointments.code = v_code);
  end loop;

  -- Scheda cliente: cerca per telefono o email, altrimenti crea
  select c.id into v_client_id from public.clients c
  where regexp_replace(c.phone, '\s+', '', 'g') = v_phone
     or (v_email <> '' and lower(c.email) = v_email)
  order by c.created_at limit 1;

  if v_client_id is null then
    insert into public.clients (full_name, phone, email, notes, total_visits, total_spent, last_visit_date, preferred_operator_id)
    values (trim(p_client_name), trim(p_client_phone), v_email,
            case when public.is_staff() then null else 'Registrata da prenotazione online' end,
            1, p_service_price, p_date, p_operator_id)
    returning clients.id into v_client_id;
  else
    update public.clients c set
      total_visits = c.total_visits + 1,
      total_spent = c.total_spent + p_service_price,
      last_visit_date = greatest(coalesce(c.last_visit_date, p_date), p_date),
      preferred_operator_id = p_operator_id,
      email = case when c.email = '' then v_email else c.email end
    where c.id = v_client_id;
  end if;

  insert into public.appointments (
    code, client_id, client_name, client_phone, client_email,
    service_id, service_name, service_price, operator_id, operator_name,
    date, time, duration_minutes, notes
  ) values (
    v_code, v_client_id, trim(p_client_name), trim(p_client_phone), v_email,
    p_service_id, p_service_name, p_service_price, p_operator_id, p_operator_name,
    p_date, p_time, p_duration_minutes, nullif(trim(coalesce(p_notes, '')), '')
  ) returning appointments.id into v_id;

  return query select v_id, v_code;
end;
$$;

revoke all on function public.create_booking from public;
grant execute on function public.create_booking to anon, authenticated;
grant execute on function public.get_booked_slots to anon, authenticated;
grant execute on function public.is_staff to anon, authenticated;
grant execute on function public.is_owner to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. PERMESSI TABELLE (necessari nei progetti Supabase recenti)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on public.appointments, public.clients, public.reviews to authenticated;
grant select on public.profiles, public.email_logs to authenticated;
grant select, insert on public.reviews to anon;
