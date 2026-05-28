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
