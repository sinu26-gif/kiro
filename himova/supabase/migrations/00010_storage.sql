-- Himova 00010: storage buckets and RLS policies for storage.objects
--
-- Run this AFTER creating the 'product-photos' bucket in the Supabase
-- Dashboard (Storage > New bucket > public). The bucket itself is not
-- created here because the storage.buckets table is owned by the
-- supabase_storage_admin role, which we don't expose to migrations.
--
-- Idempotent: drops then recreates the policies on each run.

-- Drop pre-existing Himova storage policies so this migration can be re-run.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'himova_%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Anyone (including anonymous visitors) may read photos in this bucket.
create policy "himova_product_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

-- Only admins may upload, update, or delete photos.
create policy "himova_product_photos_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'product-photos' and public.is_admin());

create policy "himova_product_photos_admin_update"
  on storage.objects for update
  using (bucket_id = 'product-photos' and public.is_admin())
  with check (bucket_id = 'product-photos' and public.is_admin());

create policy "himova_product_photos_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'product-photos' and public.is_admin());
