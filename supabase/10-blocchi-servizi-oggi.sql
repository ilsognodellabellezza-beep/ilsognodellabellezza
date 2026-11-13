-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Blocchi per servizio e prenotazione di oggi
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
-- (richiede prima 08-novita-sito-gestionale.sql)
--
--  1. appointment_blocks.service_ids : un blocco può valere solo per certi servizi
--                                      (vuoto = tutti i servizi)
--  2. get_blocks                     : il pubblico vede anche i servizi bloccati
--  3. create_booking                 : rispetta i blocchi per servizio e consente
--                                      di prenotare oggi (non negli orari passati,
--                                      calcolati sull'ora italiana)
-- =====================================================================

alter table public.appointment_blocks add column if not exists service_ids text[] not null default '{}';

drop function if exists public.get_blocks();
create function public.get_blocks()
returns table (id uuid, start_date date, end_date date, from_time time, to_time time, operator_id text, service_ids text[])
language sql stable security definer set search_path = public as $$
  select b.id, b.start_date, b.end_date, b.from_time, b.to_time, b.operator_id, b.service_ids
  from public.appointment_blocks b
  where b.end_date >= (now() at time zone 'Europe/Rome')::date;
$$;
grant execute on function public.get_blocks to anon, authenticated;

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
  v_end time := p_time + make_interval(mins => p_duration_minutes);
  v_open_exc public.closures%rowtype;
  v_is_laser boolean;
  v_laser jsonb;
  v_laser_day jsonb;
  v_laser_exc jsonb;
  v_laser_ok boolean;
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_now time := (now() at time zone 'Europe/Rome')::time;
begin
  if char_length(trim(coalesce(p_client_name, ''))) < 2 or char_length(v_phone) < 6 then
    raise exception 'Nome e telefono sono obbligatori';
  end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 or p_duration_minutes > 480 then
    raise exception 'Durata non valida';
  end if;
  v_end := p_time + make_interval(mins => p_duration_minutes);

  select value into v_cfg from public.site_settings where key = 'booking';
  v_max_days := coalesce((v_cfg->>'maxAdvanceDays')::integer, 180);

  if not public.is_staff() then
    if p_date < v_today or p_date > v_today + v_max_days then
      raise exception 'Data non prenotabile';
    end if;
    -- Oggi si può prenotare, ma non negli orari già passati
    if p_date = v_today and p_time <= v_now then
      raise exception 'Orario già passato';
    end if;

    -- Apertura straordinaria (vince su chiusure, festivi e giorni chiusi)
    select * into v_open_exc from public.closures
      where kind = 'apertura' and p_date between start_date and end_date
      order by created_at desc limit 1;

    if v_open_exc.id is null then
      if exists (select 1 from public.closures where kind = 'chiusura' and p_date between start_date and end_date) then
        raise exception 'Il salone è chiuso in questo giorno';
      end if;
      if public.is_italian_holiday(p_date) then
        raise exception 'Il salone è chiuso nei giorni festivi';
      end if;
    end if;

    if v_cfg is not null then
      v_day := v_cfg->'hours'->(extract(dow from p_date)::int)::text;
      if v_open_exc.id is null and (v_day is null or coalesce((v_day->>'open')::boolean, false) = false) then
        raise exception 'Il salone è chiuso in questo giorno';
      end if;
      if v_day is not null then
        v_from := coalesce(v_open_exc.from_time, (v_day->>'from')::time);
        v_to   := coalesce(v_open_exc.to_time,   (v_day->>'to')::time);
        if p_time < v_from or v_end > v_to or v_end <= p_time then
          raise exception 'Orario fuori dall''apertura del salone';
        end if;
        if coalesce(v_day->>'breakFrom', '') <> '' and coalesce(v_day->>'breakTo', '') <> ''
           and v_open_exc.from_time is null
           and p_time < (v_day->>'breakTo')::time and (v_day->>'breakFrom')::time < v_end then
          raise exception 'Orario durante la pausa del salone';
        end if;
      end if;
    end if;

    -- Blocco appuntamenti (tutto il centro o la singola dipendente; tutti i servizi o solo alcuni)
    if exists (
      select 1 from public.appointment_blocks b
      where p_date between b.start_date and b.end_date
        and (b.operator_id is null or b.operator_id = p_operator_id)
        and (coalesce(cardinality(b.service_ids), 0) = 0 or p_service_id = any (b.service_ids))
        and (b.from_time is null or b.to_time is null or (p_time < b.to_time and b.from_time < v_end))
    ) then
      raise exception 'Questo orario non è prenotabile';
    end if;

    -- Laser in affitto: prenotabile solo nei giorni/orari impostati
    v_is_laser := p_service_id like 'laser-%'
      or exists (select 1 from public.custom_services s where s.id = p_service_id and s.category = 'laser');
    if v_is_laser then
      select value into v_laser from public.site_settings where key = 'laser';
      if v_laser is null then
        v_laser_ok := true; -- non ancora configurato: nessuna restrizione
      else
        v_laser_exc := (select e from jsonb_array_elements(coalesce(v_laser->'exceptions', '[]'::jsonb)) e
                        where e->>'date' = p_date::text limit 1);
        v_laser_day := coalesce(v_laser_exc, v_laser->'weekly'->(extract(dow from p_date)::int)::text);
        v_laser_ok := v_laser_day is not null
          and coalesce((v_laser_day->>'open')::boolean, false)
          and p_time >= (v_laser_day->>'from')::time
          and v_end <= (v_laser_day->>'to')::time;
      end if;
      if not v_laser_ok then
        raise exception 'Il laser non è prenotabile in questo giorno o orario';
      end if;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_operator_id || p_date::text));

  if exists (
    select 1 from public.appointments a
    where a.date = p_date and a.operator_id = p_operator_id and a.status <> 'annullato'
      and a.time < p_time + make_interval(mins => p_duration_minutes)
      and p_time < a.time + make_interval(mins => a.duration_minutes)
  ) then
    raise exception 'SLOT_OCCUPATO';
  end if;

  loop
    v_code := 'SOGNO-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.appointments where appointments.code = v_code);
  end loop;

  select c.id into v_client_id from public.clients c
  where regexp_replace(c.phone, '\s+', '', 'g') = v_phone
     or (v_email <> '' and lower(c.email) = v_email)
  order by c.created_at limit 1;

  -- Nessun calcolo di incassi: si aggiornano solo visite e ultima visita
  if v_client_id is null then
    insert into public.clients (full_name, phone, email, notes, total_visits, total_spent, last_visit_date, preferred_operator_id)
    values (trim(p_client_name), trim(p_client_phone), v_email,
            case when public.is_staff() then null else 'Registrata da prenotazione online' end,
            1, 0, p_date, p_operator_id)
    returning clients.id into v_client_id;
  else
    update public.clients c set
      total_visits = c.total_visits + 1,
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
