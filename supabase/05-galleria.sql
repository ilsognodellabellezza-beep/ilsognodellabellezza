-- =====================================================================
-- IL SOGNO DELLA BELLEZZA — Galleria foto
-- Incolla tutto nel Supabase SQL Editor e premi "Run".
-- Si può rieseguire senza perdere dati.
-- Le foto sono visibili a tutti; le carica/elimina solo lo staff collegato.
-- =====================================================================

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  caption text check (char_length(caption) <= 160),
  created_at timestamptz not null default now()
);

alter table public.gallery_photos enable row level security;

drop policy if exists "galleria: tutti leggono" on public.gallery_photos;
create policy "galleria: tutti leggono" on public.gallery_photos
  for select to anon, authenticated using (true);
drop policy if exists "galleria: staff inserisce" on public.gallery_photos;
create policy "galleria: staff inserisce" on public.gallery_photos
  for insert to authenticated with check (public.is_staff());
drop policy if exists "galleria: staff modifica" on public.gallery_photos;
create policy "galleria: staff modifica" on public.gallery_photos
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "galleria: staff elimina" on public.gallery_photos;
create policy "galleria: staff elimina" on public.gallery_photos
  for delete to authenticated using (public.is_staff());

grant select on public.gallery_photos to anon;
grant select, insert, update, delete on public.gallery_photos to authenticated;
grant all on public.gallery_photos to service_role;

-- Archivio file (bucket pubblico in lettura)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galleria', 'galleria', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "galleria file: tutti leggono" on storage.objects;
create policy "galleria file: tutti leggono" on storage.objects
  for select to anon, authenticated using (bucket_id = 'galleria');
drop policy if exists "galleria file: staff carica" on storage.objects;
create policy "galleria file: staff carica" on storage.objects
  for insert to authenticated with check (bucket_id = 'galleria' and public.is_staff());
drop policy if exists "galleria file: staff elimina" on storage.objects;
create policy "galleria file: staff elimina" on storage.objects
  for delete to authenticated using (bucket_id = 'galleria' and public.is_staff());
