-- Himova 00011: server-side shopping cart for shopkeepers
--
-- One row per (shopkeeper, set_type). Quantity is the number of whole sets.
-- The cart is cleared when an order is placed from it.

create table if not exists public.cart_items (
  id              uuid primary key default gen_random_uuid(),
  shopkeeper_id   uuid not null references public.shopkeepers(id) on delete cascade,
  set_type_id     uuid not null references public.set_types(id) on delete cascade,
  quantity        int not null check (quantity > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (shopkeeper_id, set_type_id)
);

create index if not exists cart_items_shopkeeper_idx on public.cart_items (shopkeeper_id);

-- updated_at trigger
drop trigger if exists cart_items_touch on public.cart_items;
create trigger cart_items_touch
  before update on public.cart_items
  for each row execute function public.touch_updated_at();

-- RLS: a shopkeeper sees and manages only their own cart; admin can read all.
alter table public.cart_items enable row level security;

drop policy if exists "cart_items self all" on public.cart_items;
create policy "cart_items self all"
  on public.cart_items for all
  using (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin())
  with check (shopkeeper_id = public.current_shopkeeper_id() or public.is_admin());
