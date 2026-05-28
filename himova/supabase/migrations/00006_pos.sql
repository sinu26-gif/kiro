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
