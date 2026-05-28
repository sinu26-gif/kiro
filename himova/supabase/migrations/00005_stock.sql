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
