-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Account clienti
-- Da eseguire nel Supabase SQL Editor (si può rieseguire).
-- I clienti registrati vedono e possono annullare SOLO le proprie prenotazioni.
-- =====================================================================

alter table public.appointments
  add column if not exists client_user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_appointments_client_user on public.appointments(client_user_id);

-- Quando un cliente registrato prenota, la prenotazione viene collegata al suo account
create or replace function public.link_appointment_to_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.client_user_id is null and auth.uid() is not null and not public.is_staff() then
    new.client_user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_link_appointment_customer on public.appointments;
create trigger trg_link_appointment_customer
  before insert on public.appointments
  for each row execute function public.link_appointment_to_customer();

-- Il cliente legge solo le proprie prenotazioni
drop policy if exists "appointments: cliente vede le proprie" on public.appointments;
create policy "appointments: cliente vede le proprie" on public.appointments
  for select to authenticated using (client_user_id = auth.uid());

-- Il cliente può annullare una sua prenotazione confermata, fino al giorno prima
create or replace function public.cancel_my_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.appointments
     set status = 'annullato'
   where id = p_id
     and client_user_id = auth.uid()
     and status = 'confermato'
     and date > current_date;
  if not found then
    raise exception 'Questa prenotazione non può essere annullata online. Chiamaci al 345 393 8087.';
  end if;
end;
$$;

revoke all on function public.cancel_my_booking from public, anon;
grant execute on function public.cancel_my_booking to authenticated;
