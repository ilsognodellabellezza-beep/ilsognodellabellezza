-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Gestione sito (orari, prezzi, prenotazioni a lungo termine)
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
--
-- Cosa fa:
--  * site_settings     : orari di apertura, pause, passo degli orari, giorni prenotabili in anticipo
--  * service_overrides : prezzo, promo, durata e visibilità dei servizi modificati dal titolare
--  * get_booked_slots_range : disponibilità di un intervallo di giorni (calendario mensile)
--  * create_booking    : ora rispetta orari di apertura e giorni di chiusura (solo per il pubblico)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. IMPOSTAZIONI DEL SITO
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.service_overrides (
  service_id text primary key,
  price numeric(10,2) check (price >= 0),
  promo_price numeric(10,2) check (promo_price >= 0),
  duration_minutes integer check (duration_minutes between 5 and 480),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.site_settings     enable row level security;
alter table public.service_overrides enable row level security;

drop policy if exists "site_settings: tutti leggono" on public.site_settings;
create policy "site_settings: tutti leggono" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "site_settings: titolare scrive" on public.site_settings;
create policy "site_settings: titolare scrive" on public.site_settings
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "service_overrides: tutti leggono" on public.service_overrides;
create policy "service_overrides: tutti leggono" on public.service_overrides
  for select to anon, authenticated using (true);
drop policy if exists "service_overrides: titolare scrive" on public.service_overrides;
create policy "service_overrides: titolare scrive" on public.service_overrides
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant select on public.site_settings, public.service_overrides to anon;
grant select, insert, update, delete on public.site_settings, public.service_overrides to authenticated;
grant all on public.site_settings, public.service_overrides to service_role;

-- Orari predefiniti (quelli attuali del salone): martedì–sabato 09:00–18:30, pausa 12:30–14:30
insert into public.site_settings (key, value) values (
  'booking',
  '{
    "slotStepMinutes": 30,
    "maxAdvanceDays": 180,
    "hours": {
      "0": {"open": false, "from": "09:00", "to": "18:30", "breakFrom": "", "breakTo": ""},
      "1": {"open": false, "from": "09:00", "to": "18:30", "breakFrom": "", "breakTo": ""},
      "2": {"open": true,  "from": "09:00", "to": "18:30", "breakFrom": "12:30", "breakTo": "14:30"},
      "3": {"open": true,  "from": "09:00", "to": "18:30", "breakFrom": "12:30", "breakTo": "14:30"},
      "4": {"open": true,  "from": "09:00", "to": "18:30", "breakFrom": "12:30", "breakTo": "14:30"},
      "5": {"open": true,  "from": "09:00", "to": "18:30", "breakFrom": "12:30", "breakTo": "14:30"},
      "6": {"open": true,  "from": "09:00", "to": "18:30", "breakFrom": "12:30", "breakTo": "14:30"}
    }
  }'::jsonb
) on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2. DISPONIBILITÀ SU PIÙ GIORNI (un solo viaggio per il calendario mensile)
-- ---------------------------------------------------------------------
create or replace function public.get_booked_slots_range(p_from date, p_to date)
returns table (slot_date date, operator_id text, start_time time, duration_minutes integer)
language sql stable security definer set search_path = public as $$
  select a.date, a.operator_id, a.time, a.duration_minutes
  from public.appointments a
  where a.date between p_from and least(p_to, p_from + 400) and a.status <> 'annullato';
$$;
grant execute on function public.get_booked_slots_range to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. create_booking: rispetta orari e anticipo massimo impostati dal titolare
--    (lo staff può sempre inserire manualmente fuori orario)
-- ---------------------------------------------------------------------
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
  v_cfg jsonb;
  v_max_days integer;
  v_day jsonb;
  v_from time;
  v_to time;
  v_end time;
begin
  if char_length(trim(coalesce(p_client_name, ''))) < 2 or char_length(v_phone) < 6 then
    raise exception 'Nome e telefono sono obbligatori';
  end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 or p_duration_minutes > 480 then
    raise exception 'Durata non valida';
  end if;

  select value into v_cfg from public.site_settings where key = 'booking';
  v_max_days := coalesce((v_cfg->>'maxAdvanceDays')::integer, 180);

  if not public.is_staff() then
    -- Il pubblico non può prenotare nel passato né oltre l'anticipo massimo
    if p_date < current_date or p_date > current_date + v_max_days then
      raise exception 'Data non prenotabile';
    end if;

    -- Giorno di chiusura / fuori orario di apertura
    if v_cfg is not null then
      v_day := v_cfg->'hours'->(extract(dow from p_date)::int)::text;
      if v_day is null or coalesce((v_day->>'open')::boolean, false) = false then
        raise exception 'Il salone è chiuso in questo giorno';
      end if;
      v_from := (v_day->>'from')::time;
      v_to   := (v_day->>'to')::time;
      v_end  := p_time + make_interval(mins => p_duration_minutes);
      if p_time < v_from or v_end > v_to or v_end <= p_time then
        raise exception 'Orario fuori dall''apertura del salone';
      end if;
      if coalesce(v_day->>'breakFrom', '') <> '' and coalesce(v_day->>'breakTo', '') <> ''
         and p_time < (v_day->>'breakTo')::time and (v_day->>'breakFrom')::time < v_end then
        raise exception 'Orario durante la pausa del salone';
      end if;
    end if;
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
