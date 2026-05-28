-- Himova 00003: shopkeepers and pricing overrides

-- ---------------------------------------------------------------------------
-- shopkeepers
-- ---------------------------------------------------------------------------
create table if not exists public.shopkeepers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null unique references public.profiles(id) on delete cascade,
  shop_name     text not null,
  owner_name    text not null,
  phone         text not null unique,
  address       text,
  location_lat  numeric(9, 6),
  location_lng  numeric(9, 6),
  logo_url      text,
  status        text not null default 'active' check (status in ('active', 'suspended')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists shopkeepers_status_idx on public.shopkeepers (status);

-- ---------------------------------------------------------------------------
-- shopkeeper_pricing: per-shopkeeper override on a specific set_type
-- Either an absolute override (override_paisa) or a percent (discount_percent)
-- ---------------------------------------------------------------------------
create table if not exists public.shopkeeper_pricing (
  id                  uuid primary key default gen_random_uuid(),
  shopkeeper_id       uuid not null references public.shopkeepers(id) on delete cascade,
  set_type_id         uuid not null references public.set_types(id) on delete cascade,
  override_paisa      int check (override_paisa is null or override_paisa >= 0),
  discount_percent    numeric(5, 2) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (shopkeeper_id, set_type_id),
  check (override_paisa is not null or discount_percent is not null)
);

create index if not exists shopkeeper_pricing_shopkeeper_idx on public.shopkeeper_pricing (shopkeeper_id);
