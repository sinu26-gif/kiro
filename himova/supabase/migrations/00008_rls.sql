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
