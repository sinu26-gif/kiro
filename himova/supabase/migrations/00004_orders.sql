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
