-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Novità sito e gestionale (PRD 5 nov 2026)
-- Incolla tutto nel Supabase SQL Editor e premi "Run". Si può rieseguire.
-- Richiede gli script 01–07 già eseguiti.
--
-- Cosa fa:
--  1. ACCOUNT UNICO: ogni account collegato ha tutti i permessi (is_owner = is_staff)
--     e le funzioni di gestione account dipendenti vengono rimosse.
--  2. Promozioni con scadenza automatica (tabella promotions)
--  3. Chiusure e aperture straordinarie (tabella closures)
--  4. Blocchi appuntamenti dal/al, per tutto il centro o una dipendente (tabella appointment_blocks)
--  5. Foto di trattamenti e dipendenti (service_photos, operator_photos + bucket "foto")
--  6. Nuove categorie del menu trattamenti
--  7. create_booking: rispetta chiusure, festivi, blocchi e giorni del laser
--  8. Contabilità: il database smette di aggiornare gli incassi (le colonne restano finché
--     non le elimini a mano: vedi in fondo, SOLO dopo aver esportato i dati)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ACCOUNT UNICO
-- ---------------------------------------------------------------------
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

drop function if exists public.owner_create_staff(text, text, text, text);
drop function if exists public.owner_set_staff_password(uuid, text);
drop function if exists public.owner_delete_staff(uuid);

-- ---------------------------------------------------------------------
-- 2. PROMOZIONI (scadenza automatica: il pubblico vede solo le promo nel periodo)
-- ---------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  photo_path text,
  promo_price numeric(10,2) not null check (promo_price >= 0),
  original_price numeric(10,2) check (original_price >= 0),
  service_id text,
  starts_on date not null,
  ends_on date not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.promotions enable row level security;

drop policy if exists "promotions: pubblico legge attive" on public.promotions;
create policy "promotions: pubblico legge attive" on public.promotions
  for select to anon, authenticated
  using (public.is_staff() or (not archived and current_date between starts_on and ends_on));
drop policy if exists "promotions: staff scrive" on public.promotions;
create policy "promotions: staff scrive" on public.promotions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.promotions to anon;
grant select, insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;

-- ---------------------------------------------------------------------
-- 3. CHIUSURE E APERTURE STRAORDINARIE
--    kind = 'chiusura'  : il centro è chiuso dal giorno al giorno
--    kind = 'apertura'  : apertura straordinaria (vince su chiusure, festivi e giorni chiusi);
--                         se from/to sono vuoti si usano gli orari di quel giorno della settimana
-- ---------------------------------------------------------------------
create table if not exists public.closures (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('chiusura', 'apertura')),
  start_date date not null,
  end_date date not null,
  from_time time,
  to_time time,
  note text not null default '' check (char_length(note) <= 160),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.closures enable row level security;
drop policy if exists "closures: tutti leggono" on public.closures;
create policy "closures: tutti leggono" on public.closures
  for select to anon, authenticated using (true);
drop policy if exists "closures: staff scrive" on public.closures;
create policy "closures: staff scrive" on public.closures
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.closures to anon;
grant select, insert, update, delete on public.closures to authenticated;
grant all on public.closures to service_role;

-- ---------------------------------------------------------------------
-- 4. BLOCCO APPUNTAMENTI (imprevisti, malattia…)
--    operator_id null = tutto il centro. La nota resta riservata allo staff.
-- ---------------------------------------------------------------------
create table if not exists public.appointment_blocks (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  from_time time,
  to_time time,
  operator_id text,
  note text not null default '' check (char_length(note) <= 160),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.appointment_blocks enable row level security;
drop policy if exists "blocks: staff legge e scrive" on public.appointment_blocks;
create policy "blocks: staff legge e scrive" on public.appointment_blocks
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.appointment_blocks to authenticated;
grant all on public.appointment_blocks to service_role;

-- Il pubblico vede i blocchi (senza la nota) tramite questa funzione
create or replace function public.get_blocks()
returns table (id uuid, start_date date, end_date date, from_time time, to_time time, operator_id text)
language sql stable security definer set search_path = public as $$
  select b.id, b.start_date, b.end_date, b.from_time, b.to_time, b.operator_id
  from public.appointment_blocks b
  where b.end_date >= current_date;
$$;
grant execute on function public.get_blocks to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. FOTO di trattamenti e dipendenti
-- ---------------------------------------------------------------------
create table if not exists public.service_photos (
  service_id text primary key,
  path text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.operator_photos (
  operator_id text primary key,
  path text not null,
  updated_at timestamptz not null default now()
);
alter table public.service_photos  enable row level security;
alter table public.operator_photos enable row level security;

drop policy if exists "service_photos: tutti leggono" on public.service_photos;
create policy "service_photos: tutti leggono" on public.service_photos for select to anon, authenticated using (true);
drop policy if exists "service_photos: staff scrive" on public.service_photos;
create policy "service_photos: staff scrive" on public.service_photos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "operator_photos: tutti leggono" on public.operator_photos;
create policy "operator_photos: tutti leggono" on public.operator_photos for select to anon, authenticated using (true);
drop policy if exists "operator_photos: staff scrive" on public.operator_photos;
create policy "operator_photos: staff scrive" on public.operator_photos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.service_photos, public.operator_photos to anon;
grant select, insert, update, delete on public.service_photos, public.operator_photos to authenticated;
grant all on public.service_photos, public.operator_photos to service_role;

-- Archivio file (bucket pubblico in lettura): foto trattamenti, team e promo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "foto file: tutti leggono" on storage.objects;
create policy "foto file: tutti leggono" on storage.objects
  for select to anon, authenticated using (bucket_id = 'foto');
drop policy if exists "foto file: staff carica" on storage.objects;
create policy "foto file: staff carica" on storage.objects
  for insert to authenticated with check (bucket_id = 'foto' and public.is_staff());
drop policy if exists "foto file: staff aggiorna" on storage.objects;
create policy "foto file: staff aggiorna" on storage.objects
  for update to authenticated using (bucket_id = 'foto' and public.is_staff());
drop policy if exists "foto file: staff elimina" on storage.objects;
create policy "foto file: staff elimina" on storage.objects
  for delete to authenticated using (bucket_id = 'foto' and public.is_staff());

-- ---------------------------------------------------------------------
-- 6. NUOVE CATEGORIE DEL MENU
--    viso = Trattamenti viso · corpo = Trattamento corpo (solo donna) · mani = Trattamento mani
--    pedicure = Trattamento pedicure · makeup = Make up (nuova)
-- ---------------------------------------------------------------------
alter table public.custom_services drop constraint if exists custom_services_category_check;
update public.custom_services set category = 'corpo' where category = 'massaggi';
update public.custom_services set category = 'mani'  where category = 'mani-piedi';
alter table public.custom_services add constraint custom_services_category_check
  check (category in ('laser', 'corpo', 'sguardo', 'viso', 'mani', 'pedicure', 'makeup'));

-- ---------------------------------------------------------------------
-- 7. GIORNI FESTIVI ITALIANI (i "giorni rossi" del calendario) e prenotazioni
-- ---------------------------------------------------------------------
create or replace function public.is_italian_holiday(p_date date) returns boolean
language plpgsql immutable as $$
declare
  y int := extract(year from p_date)::int;
  a int := y % 19;
  b int := y / 100;
  c int := y % 100;
  d int := b / 4;
  e int := b % 4;
  f int := (b + 8) / 25;
  g int := (b - f + 1) / 3;
  h int := (19 * a + b - d - g + 15) % 30;
  i int := c / 4;
  k int := c % 4;
  l int := (32 + 2 * e + 2 * i - h - k) % 7;
  m int := (a + 11 * h + 22 * l) / 451;
  easter date := make_date(y, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
begin
  return (extract(month from p_date)::int, extract(day from p_date)::int) in
    ((1,1),(1,6),(4,25),(5,1),(6,2),(8,15),(11,1),(12,8),(12,25),(12,26))
    or p_date = easter
    or p_date = easter + 1;
end;
$$;

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
    if p_date < current_date or p_date > current_date + v_max_days then
      raise exception 'Data non prenotabile';
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

    -- Blocco appuntamenti (tutto il centro o la singola dipendente)
    if exists (
      select 1 from public.appointment_blocks b
      where p_date between b.start_date and b.end_date
        and (b.operator_id is null or b.operator_id = p_operator_id)
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

-- ---------------------------------------------------------------------
-- 8. ACCOUNT UNICO: elimina gli altri account (FACOLTATIVO, DA FARE A MANO)
--    Controlla prima quali account esistono e tieni solo quello di Chiara & Melania:
--
--      select p.id, p.full_name, p.username, p.email, p.role from public.profiles p;
--
--    poi elimina gli altri (sostituisci l'id):
--
--      delete from auth.users where id = '<ID DELL''ACCOUNT DA RIMUOVERE>';
--
-- 9. RIMOZIONE DATI CONTABILI (FACOLTATIVO, SOLO DOPO AVER ESPORTATO IL CSV
--    dal gestionale → Gestione Sito → "Esporta archivio incassi"):
--
--      alter table public.appointments drop column if exists payment_method;
--      alter table public.clients drop column if exists total_spent;
--
--    (service_price resta: è il prezzo del trattamento prenotato, non un incasso.)
-- ---------------------------------------------------------------------
