-- Himova combined schema. Apply by pasting into the Supabase SQL Editor.
-- Generated from migrations/*.sql in order. Idempotent and safe to re-run.


-- ============================================================
-- migrations/00001_init.sql
-- ============================================================
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
-- (current_shopkeeper_id is defined in 00003 after the shopkeepers table exists)
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

-- ============================================================
-- migrations/00002_catalog.sql
-- ============================================================
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

-- Per-variant photos: product_photos may optionally belong to a variant.
-- Added here (after product_variants exists) to keep the bundle runnable in order.
alter table public.product_photos
  add column if not exists variant_id uuid
  references public.product_variants(id) on delete set null;
create index if not exists product_photos_variant_idx on public.product_photos (variant_id);

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

-- ============================================================
-- migrations/00003_shopkeepers.sql
-- ============================================================
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
-- current_shopkeeper_id: helper used by RLS on every shopkeeper-scoped table.
-- Defined here (not in 00001) because it references the shopkeepers table.
-- ---------------------------------------------------------------------------
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

-- ============================================================
-- migrations/00004_orders.sql
-- ============================================================
-- Himova 00004: orders and order items (shopkeeper -> Himova)

create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  shopkeeper_id            uuid not null references public.shopkeepers(id) on delete restrict,
  status                   text not null default 'pending'
    check (status in ('pending', 'packed', 'shipped', 'delivered', 'cancelled')),
  subtotal_paisa           int not null default 0 check (subtotal_paisa >= 0),
  discount_paisa           int not null default 0 check (discount_paisa >= 0),
  total_paisa              int not null default 0 check (total_paisa >= 0),
  payment_method           text not null check (payment_method in ('cod', 'bank', 'esewa', 'khalti')),
  payment_status           text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  free_delivery            boolean not null default false,
  estimated_delivery_at    date,
  notes_to_admin           text,
  cancellation_reason      text,
  placed_at                timestamptz not null default now(),
  packed_at                timestamptz,
  shipped_at               timestamptz,
  delivered_at             timestamptz,
  cancelled_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists orders_shopkeeper_idx on public.orders (shopkeeper_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_placed_at_idx on public.orders (placed_at desc);

create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  set_type_id         uuid not null references public.set_types(id) on delete restrict,
  set_quantity        int not null check (set_quantity > 0),
  unit_price_paisa    int not null check (unit_price_paisa >= 0),
  line_total_paisa    int not null check (line_total_paisa >= 0),
  created_at          timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_set_type_idx on public.order_items (set_type_id);

-- ============================================================
-- migrations/00005_stock.sql
-- ============================================================
-- Himova 00005: shop stock and stock movements log

-- Per-shopkeeper inventory at the size-piece level.
create table if not exists public.shop_stock (
  id              uuid primary key default gen_random_uuid(),
  shopkeeper_id   uuid not null references public.shopkeepers(id) on delete cascade,
  variant_id      uuid not null references public.product_variants(id) on delete cascade,
  size            text not null,
  quantity        int not null default 0 check (quantity >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (shopkeeper_id, variant_id, size)
);

create index if not exists shop_stock_shopkeeper_idx on public.shop_stock (shopkeeper_id);
create index if not exists shop_stock_variant_idx on public.shop_stock (variant_id);

-- Append-only audit log of every stock change (warehouse and shop).
create table if not exists public.stock_movements (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null check (scope in ('warehouse', 'shop')),
  shopkeeper_id       uuid references public.shopkeepers(id) on delete set null,
  set_type_id         uuid references public.set_types(id) on delete set null,
  variant_id          uuid references public.product_variants(id) on delete set null,
  size                text,
  delta               int not null check (delta <> 0),
  reason              text not null check (reason in (
    'restock', 'order_shipped', 'order_delivered', 'retail_sale', 'manual_adjust', 'return_exchange'
  )),
  reference_id        uuid,
  actor_profile_id    uuid references public.profiles(id) on delete set null,
  note                text,
  created_at          timestamptz not null default now()
);

create index if not exists stock_movements_scope_idx on public.stock_movements (scope, created_at desc);
create index if not exists stock_movements_shopkeeper_idx on public.stock_movements (shopkeeper_id, created_at desc);
create index if not exists stock_movements_set_type_idx on public.stock_movements (set_type_id);

-- ============================================================
-- migrations/00006_pos.sql
-- ============================================================
-- Himova 00006: POS (shopkeeper -> retail customer)

-- ---------------------------------------------------------------------------
-- shop_customers: per-shopkeeper customer database
-- ---------------------------------------------------------------------------
create table if not exists public.shop_customers (
  id              uuid primary key default gen_random_uuid(),
  shopkeeper_id   uuid not null references public.shopkeepers(id) on delete cascade,
  name            text,
  phone           text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (shopkeeper_id, phone)
);

create index if not exists shop_customers_shopkeeper_idx on public.shop_customers (shopkeeper_id);

-- ---------------------------------------------------------------------------
-- custom_products: shopkeeper-added items not bought from Himova
-- ---------------------------------------------------------------------------
create table if not exists public.custom_products (
  id              uuid primary key default gen_random_uuid(),
  shopkeeper_id   uuid not null references public.shopkeepers(id) on delete cascade,
  name            text not null,
  photo_url       text,
  price_paisa     int not null check (price_paisa >= 0),
  stock_qty       int not null default 0 check (stock_qty >= 0),
  status          text not null default 'active' check (status in ('active', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists custom_products_shopkeeper_idx on public.custom_products (shopkeeper_id);

-- ---------------------------------------------------------------------------
-- pos_sales: one row per retail sale
-- ---------------------------------------------------------------------------
create table if not exists public.pos_sales (
  id                    uuid primary key default gen_random_uuid(),
  shopkeeper_id         uuid not null references public.shopkeepers(id) on delete restrict,
  customer_id           uuid references public.shop_customers(id) on delete set null,
  subtotal_paisa        int not null check (subtotal_paisa >= 0),
  discount_paisa        int not null default 0 check (discount_paisa >= 0),
  total_paisa           int not null check (total_paisa >= 0),
  return_policy_text    text not null default 'Exchange only — no money back.',
  created_at            timestamptz not null default now()
);

create index if not exists pos_sales_shopkeeper_idx on public.pos_sales (shopkeeper_id, created_at desc);

-- ---------------------------------------------------------------------------
-- pos_sale_items: lines on a sale (Himova product OR shopkeeper custom product)
-- ---------------------------------------------------------------------------
create table if not exists public.pos_sale_items (
  id                  uuid primary key default gen_random_uuid(),
  sale_id             uuid not null references public.pos_sales(id) on delete cascade,
  variant_id          uuid references public.product_variants(id) on delete set null,
  custom_product_id   uuid references public.custom_products(id) on delete set null,
  size                text,
  quantity            int not null check (quantity > 0),
  unit_price_paisa    int not null check (unit_price_paisa >= 0),
  line_total_paisa    int not null check (line_total_paisa >= 0),
  created_at          timestamptz not null default now(),
  -- Each line must reference exactly one of (Himova variant, custom product).
  check (
    (variant_id is not null and custom_product_id is null)
    or (variant_id is null and custom_product_id is not null)
  )
);

create index if not exists pos_sale_items_sale_idx on public.pos_sale_items (sale_id);

-- ---------------------------------------------------------------------------
-- pos_payments: split payments per sale
-- ---------------------------------------------------------------------------
create table if not exists public.pos_payments (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references public.pos_sales(id) on delete cascade,
  method          text not null check (method in ('cash', 'esewa', 'khalti', 'other')),
  amount_paisa    int not null check (amount_paisa > 0),
  created_at      timestamptz not null default now()
);

create index if not exists pos_payments_sale_idx on public.pos_payments (sale_id);

-- ============================================================
-- migrations/00007_engagement.sql
-- ============================================================
-- Himova 00007: notifications, rewards, app events

-- ---------------------------------------------------------------------------
-- notifications: per-recipient in-app messages
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id                      uuid primary key default gen_random_uuid(),
  recipient_profile_id    uuid not null references public.profiles(id) on delete cascade,
  category                text not null check (category in (
    'order', 'stock', 'leaderboard', 'reward', 'system', 'marketing'
  )),
  title                   text not null,
  body                    text,
  link                    text,
  read_at                 timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_profile_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_profile_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- rewards: leaderboard cycle winners and what they won
-- ---------------------------------------------------------------------------
create table if not exists public.rewards (
  id              uuid primary key default gen_random_uuid(),
  cycle_label     text not null,
  shopkeeper_id   uuid not null references public.shopkeepers(id) on delete cascade,
  rank            int not null check (rank > 0),
  reward_type     text not null check (reward_type in ('discount_percent', 'free_set', 'custom_item')),
  reward_value    text not null,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (cycle_label, shopkeeper_id)
);

create index if not exists rewards_cycle_idx on public.rewards (cycle_label);
create index if not exists rewards_shopkeeper_idx on public.rewards (shopkeeper_id);

-- ---------------------------------------------------------------------------
-- app_events: structured business event log for debugging and analytics
-- ---------------------------------------------------------------------------
create table if not exists public.app_events (
  id                  uuid primary key default gen_random_uuid(),
  event_type          text not null,
  actor_profile_id    uuid references public.profiles(id) on delete set null,
  shopkeeper_id       uuid references public.shopkeepers(id) on delete set null,
  payload             jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists app_events_type_idx on public.app_events (event_type, created_at desc);
create index if not exists app_events_shopkeeper_idx on public.app_events (shopkeeper_id, created_at desc);

-- ============================================================
-- migrations/00008_rls.sql
-- ============================================================
-- Himova 00008: Row Level Security policies
-- All shopkeeper-scoped tables: shopkeeper sees only own rows; admin sees all.
-- Catalog tables: any authenticated user can read; only admin can write.
-- Anonymous (anon) sees nothing direct — public leaderboard goes via SECURITY DEFINER functions.

-- Enable RLS on every table.
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_photos      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.set_types           enable row level security;
alter table public.shopkeepers         enable row level security;
alter table public.shopkeeper_pricing  enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.shop_stock          enable row level security;
alter table public.stock_movements     enable row level security;
alter table public.shop_customers      enable row level security;
alter table public.custom_products     enable row level security;
alter table public.pos_sales           enable row level security;
alter table public.pos_sale_items      enable row level security;
alter table public.pos_payments        enable row level security;
alter table public.notifications       enable row level security;
alter table public.rewards             enable row level security;
alter table public.app_events          enable row level security;

-- Drop existing policies (so this migration is idempotent on re-run).
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles self read"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles self update"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles admin write"
  on public.profiles for insert
  with check (public.is_admin());

create policy "profiles admin delete"
  on public.profiles for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- categories, products, product_photos, product_variants, set_types
-- Authenticated users read. Admin writes.
-- ---------------------------------------------------------------------------
create policy "categories read auth"
  on public.categories for select
  using (auth.role() = 'authenticated');

create policy "categories admin write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "products read auth"
  on public.products for select
  using (auth.role() = 'authenticated');

create policy "products admin write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_photos read auth"
  on public.product_photos for select
  using (auth.role() = 'authenticated');

create policy "product_photos admin write"
  on public.product_photos for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_variants read auth"
  on public.product_variants for select
  using (auth.role() = 'authenticated');

create policy "product_variants admin write"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "set_types read auth"
  on public.set_types for select
  using (auth.role() = 'authenticated');

create policy "set_types admin write"
  on public.set_types for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- shopkeepers
-- ---------------------------------------------------------------------------
create policy "shopkeepers self read"
  on public.shopkeepers for select
  using (profile_id = auth.uid() or public.is_admin());

create policy "shopkeepers self update"
  on public.shopkeepers for update
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "shopkeepers admin write"
  on public.shopkeepers for insert
  with check (public.is_admin());

create policy "shopkeepers admin delete"
  on public.shopkeepers for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- shopkeeper_pricing
-- ---------------------------------------------------------------------------
create policy "shopkeeper_pricing self read"
  on public.shopkeeper_pricing for select
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

create policy "shopkeeper_pricing admin write"
  on public.shopkeeper_pricing for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- orders / order_items
-- ---------------------------------------------------------------------------
create policy "orders self read"
  on public.orders for select
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

create policy "orders self insert"
  on public.orders for insert
  with check (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

create policy "orders admin update"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders admin delete"
  on public.orders for delete
  using (public.is_admin());

create policy "order_items follow order"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
    )
  );

create policy "order_items self insert"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
    )
  );

create policy "order_items admin write"
  on public.order_items for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items admin delete"
  on public.order_items for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- shop_stock and stock_movements
-- ---------------------------------------------------------------------------
create policy "shop_stock self read"
  on public.shop_stock for select
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

create policy "shop_stock self write"
  on public.shop_stock for all
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
  with check (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

-- stock_movements: shop scope -> own shopkeeper; warehouse scope -> admin only.
create policy "stock_movements scoped read"
  on public.stock_movements for select
  using (
    public.is_admin()
    or (scope = 'shop' and shopkeeper_id = public.current_shopkeeper_id())
  );

create policy "stock_movements scoped insert"
  on public.stock_movements for insert
  with check (
    public.is_admin()
    or (scope = 'shop' and shopkeeper_id = public.current_shopkeeper_id())
  );

-- ---------------------------------------------------------------------------
-- shop_customers and custom_products
-- ---------------------------------------------------------------------------
create policy "shop_customers self all"
  on public.shop_customers for all
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
  with check (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

create policy "custom_products self all"
  on public.custom_products for all
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
  with check (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- POS: sales, sale items, payments
-- ---------------------------------------------------------------------------
create policy "pos_sales self all"
  on public.pos_sales for all
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
  with check (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());

create policy "pos_sale_items follow sale"
  on public.pos_sale_items for all
  using (
    exists (
      select 1 from public.pos_sales s
      where s.id = pos_sale_items.sale_id
        and (s.shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.pos_sales s
      where s.id = pos_sale_items.sale_id
        and (s.shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
    )
  );

create policy "pos_payments follow sale"
  on public.pos_payments for all
  using (
    exists (
      select 1 from public.pos_sales s
      where s.id = pos_payments.sale_id
        and (s.shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.pos_sales s
      where s.id = pos_payments.sale_id
        and (s.shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- notifications, rewards, app_events
-- ---------------------------------------------------------------------------
create policy "notifications recipient read"
  on public.notifications for select
  using (recipient_profile_id = auth.uid() or public.is_admin());

create policy "notifications recipient update"
  on public.notifications for update
  using (recipient_profile_id = auth.uid() or public.is_admin())
  with check (recipient_profile_id = auth.uid() or public.is_admin());

create policy "notifications admin insert"
  on public.notifications for insert
  with check (public.is_admin());

create policy "rewards read auth"
  on public.rewards for select
  using (auth.role() = 'authenticated');

create policy "rewards admin write"
  on public.rewards for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "app_events admin only"
  on public.app_events for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- migrations/00009_triggers.sql
-- ============================================================
-- Himova 00009: triggers (updated_at maintenance, profile-on-signup)

-- ---------------------------------------------------------------------------
-- updated_at triggers on every table that has the column
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'products',
    'product_variants',
    'set_types',
    'shopkeepers',
    'shopkeeper_pricing',
    'orders',
    'shop_stock',
    'shop_customers',
    'custom_products'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- on auth.users insert: do NOTHING automatically.
-- Admin manually creates profile + shopkeeper rows after creating an auth user.
-- This keeps the flow explicit and matches our "admin creates accounts" model.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Public leaderboard: SECURITY DEFINER function returning safe aggregates only.
-- Anyone (anon or authenticated) can call this.
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_total_npr(limit_count int default 50)
returns table (
  rank          bigint,
  shopkeeper_id uuid,
  shop_name     text,
  address       text,
  total_paisa   bigint,
  total_orders  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      s.id as shopkeeper_id,
      s.shop_name,
      s.address,
      coalesce(sum(o.total_paisa), 0) as total_paisa,
      count(o.id) as total_orders
    from public.shopkeepers s
    left join public.orders o
      on o.shopkeeper_id = s.id
     and o.status in ('packed', 'shipped', 'delivered')
    where s.status = 'active'
    group by s.id
  )
  select
    row_number() over (order by total_paisa desc, total_orders desc) as rank,
    shopkeeper_id,
    shop_name,
    address,
    total_paisa,
    total_orders
  from totals
  order by rank
  limit limit_count;
$$;

create or replace function public.leaderboard_total_sets(limit_count int default 50)
returns table (
  rank          bigint,
  shopkeeper_id uuid,
  shop_name     text,
  total_sets    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      s.id as shopkeeper_id,
      s.shop_name,
      coalesce(sum(oi.set_quantity), 0) as total_sets
    from public.shopkeepers s
    left join public.orders o
      on o.shopkeeper_id = s.id
     and o.status in ('packed', 'shipped', 'delivered')
    left join public.order_items oi on oi.order_id = o.id
    where s.status = 'active'
    group by s.id
  )
  select
    row_number() over (order by total_sets desc) as rank,
    shopkeeper_id,
    shop_name,
    total_sets
  from totals
  order by rank
  limit limit_count;
$$;

create or replace function public.leaderboard_recent_activity(limit_count int default 50)
returns table (
  rank             bigint,
  shopkeeper_id    uuid,
  shop_name        text,
  recent_orders    bigint,
  recent_paisa     bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select
      s.id as shopkeeper_id,
      s.shop_name,
      count(o.id) as recent_orders,
      coalesce(sum(o.total_paisa), 0) as recent_paisa
    from public.shopkeepers s
    left join public.orders o
      on o.shopkeeper_id = s.id
     and o.placed_at >= (now() - interval '30 days')
     and o.status <> 'cancelled'
    where s.status = 'active'
    group by s.id
  )
  select
    row_number() over (order by recent_orders desc, recent_paisa desc) as rank,
    shopkeeper_id,
    shop_name,
    recent_orders,
    recent_paisa
  from recent
  order by rank
  limit limit_count;
$$;

-- Allow anon and authenticated to call the leaderboard functions.
grant execute on function public.leaderboard_total_npr(int) to anon, authenticated;
grant execute on function public.leaderboard_total_sets(int) to anon, authenticated;
grant execute on function public.leaderboard_recent_activity(int) to anon, authenticated;
