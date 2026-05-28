-- Himova 00002: catalog (categories, products, variants, set types)

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  parent_id   uuid references public.categories(id) on delete set null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  category_id              uuid references public.categories(id) on delete restrict,
  description              text,
  video_url                text,
  suggested_retail_paisa   int check (suggested_retail_paisa is null or suggested_retail_paisa >= 0),
  status                   text not null default 'active' check (status in ('active', 'archived')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_category_idx on public.products (category_id);

-- ---------------------------------------------------------------------------
-- product photos (1..N per product)
-- ---------------------------------------------------------------------------
create table if not exists public.product_photos (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_photos_product_idx on public.product_photos (product_id);

-- ---------------------------------------------------------------------------
-- product variants (one per colour / style)
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  variant_name  text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- set_types: a fixed size pack with its own price and warehouse stock
-- ---------------------------------------------------------------------------
create table if not exists public.set_types (
  id                  uuid primary key default gen_random_uuid(),
  variant_id          uuid not null references public.product_variants(id) on delete cascade,
  label               text not null,                    -- e.g. "39-43" or "S-M-L-XL-XXL"
  sizes               text[] not null,                  -- ordered list of size labels
  price_paisa         int not null check (price_paisa >= 0),
  warehouse_stock     int not null default 0 check (warehouse_stock >= 0),
  reorder_threshold   int not null default 5 check (reorder_threshold >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists set_types_variant_idx on public.set_types (variant_id);

-- A variant cannot have two set types with the same size combination.
create unique index if not exists set_types_unique_combo on public.set_types (variant_id, sizes);

-- Sizes inside a single set must be unique (no duplicates) and non-empty.
create or replace function public.validate_set_sizes()
returns trigger
language plpgsql
as $$
begin
  if array_length(new.sizes, 1) is null or array_length(new.sizes, 1) = 0 then
    raise exception 'set_types.sizes must contain at least one size';
  end if;

  if (
    select count(distinct s) from unnest(new.sizes) as s
  ) <> array_length(new.sizes, 1) then
    raise exception 'set_types.sizes must not contain duplicates';
  end if;

  return new;
end;
$$;

drop trigger if exists set_types_validate_sizes on public.set_types;
create trigger set_types_validate_sizes
  before insert or update on public.set_types
  for each row execute function public.validate_set_sizes();
