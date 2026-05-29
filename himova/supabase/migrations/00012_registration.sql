-- Himova 00012: shopkeeper self-registration + verification
alter table public.shopkeepers drop constraint if exists shopkeepers_status_check;
alter table public.shopkeepers
  add constraint shopkeepers_status_check
  check (status in ('pending', 'active', 'suspended'));

alter table public.shopkeepers add column if not exists document_path text;
alter table public.shopkeepers add column if not exists document_type text;
alter table public.shopkeepers add column if not exists self_registered boolean not null default false;
