-- Himova 00001: extensions, helper functions, profiles
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, mirrors auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('admin', 'shopkeeper')),
  full_name     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- helper functions used by RLS policies
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- Returns the shopkeeper.id for the current authenticated user, or null.
create or replace function public.current_shopkeeper_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.shopkeepers s
  where s.profile_id = auth.uid()
$$;

-- Note: shopkeepers table is created in migration 00003.
-- The function compiles lazily on first call, so the forward reference is fine.

-- ---------------------------------------------------------------------------
-- generic updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
