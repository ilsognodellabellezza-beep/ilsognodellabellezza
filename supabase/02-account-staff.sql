-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Gestione account staff
-- Da eseguire nel Supabase SQL Editor DOPO schema.sql (si può rieseguire).
--
-- - Titolari: accedono con NOME UTENTE + password (l'email si aggiunge in futuro).
--   Al primo accesso usano un codice di attivazione e scelgono la propria password.
-- - Dipendenti: creati dalla titolare dal pannello, con email + password.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Correzione: pgcrypto su Supabase sta nello schema "extensions"
alter function public.create_booking(text, text, text, text, text, numeric, text, text, date, time, integer, text)
  set search_path = public, extensions;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;
create unique index if not exists idx_profiles_username on public.profiles(lower(username)) where username is not null;

-- Ogni utente può aggiornare SOLO il flag "password da cambiare" del proprio profilo
create or replace function public.mark_password_changed() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;
grant execute on function public.mark_password_changed to authenticated;

-- ---------------------------------------------------------------------
-- Crea un account dipendente (solo titolare)
-- ---------------------------------------------------------------------
create or replace function public.owner_create_staff(
  p_email text,
  p_password text,
  p_full_name text,
  p_operator_id text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.is_owner() then
    raise exception 'Solo le titolari possono creare account';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email non valida';
  end if;
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'La password deve avere almeno 8 caratteri';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'Inserisci il nome della dipendente';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Esiste già un account con questa email';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name)),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, full_name, role, operator_id, email, must_change_password)
  values (v_id, trim(p_full_name), 'dipendente', nullif(p_operator_id, ''), v_email, false);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Cambia la password di una dipendente (solo titolare)
-- ---------------------------------------------------------------------
create or replace function public.owner_set_staff_password(p_user_id uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_owner() then
    raise exception 'Solo le titolari possono modificare gli account';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'dipendente') then
    raise exception 'Account dipendente non trovato';
  end if;
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'La password deve avere almeno 8 caratteri';
  end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Elimina un account dipendente (solo titolare)
-- ---------------------------------------------------------------------
create or replace function public.owner_delete_staff(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Solo le titolari possono eliminare account';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'dipendente') then
    raise exception 'Si possono eliminare solo account dipendente';
  end if;
  delete from auth.users where id = p_user_id; -- il profilo si cancella a cascata
end;
$$;

revoke all on function public.owner_create_staff from public, anon;
revoke all on function public.owner_set_staff_password from public, anon;
revoke all on function public.owner_delete_staff from public, anon;
grant execute on function public.owner_create_staff to authenticated;
grant execute on function public.owner_set_staff_password to authenticated;
grant execute on function public.owner_delete_staff to authenticated;
