-- Himova seed data (development only).
-- Note: this seed does NOT create auth users. Create those in the Supabase
-- Auth dashboard first, then UPDATE the placeholder profile_id below.

-- Categories
insert into public.categories (id, name, slug, sort_order) values
  ('11111111-1111-1111-1111-111111111101', 'Shoes',       'shoes',       1),
  ('11111111-1111-1111-1111-111111111102', 'Sneakers',    'sneakers',    2),
  ('11111111-1111-1111-1111-111111111103', 'Boots',       'boots',       3),
  ('11111111-1111-1111-1111-111111111104', 'Sports',      'sports',      4),
  ('11111111-1111-1111-1111-111111111105', 'Clothing',    'clothing',    5),
  ('11111111-1111-1111-1111-111111111106', 'Accessories', 'accessories', 6)
on conflict (slug) do nothing;

-- Sub-category: Sneakers under Shoes
update public.categories set parent_id = '11111111-1111-1111-1111-111111111101'
  where slug in ('sneakers', 'boots', 'sports');

-- Sample products
insert into public.products (id, name, category_id, description, suggested_retail_paisa) values
  ('22222222-2222-2222-2222-222222222201', 'Urban Runner Sneaker',
    '11111111-1111-1111-1111-111111111102',
    'Lightweight everyday sneaker.',
    120000),
  ('22222222-2222-2222-2222-222222222202', 'Trail Trekker Boot',
    '11111111-1111-1111-1111-111111111103',
    'Durable mid-cut boot for outdoor use.',
    180000),
  ('22222222-2222-2222-2222-222222222203', 'Court Pro Sports Shoe',
    '11111111-1111-1111-1111-111111111104',
    'Indoor court shoe with grippy sole.',
    150000),
  ('22222222-2222-2222-2222-222222222204', 'Classic Crew T-Shirt',
    '11111111-1111-1111-1111-111111111105',
    'Plain cotton crew-neck.',
    60000),
  ('22222222-2222-2222-2222-222222222205', 'Canvas Sling Bag',
    '11111111-1111-1111-1111-111111111106',
    'Compact canvas bag.',
    80000)
on conflict (id) do nothing;

-- Variants (one colour each for the seed)
insert into public.product_variants (id, product_id, variant_name, sort_order) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Black',     1),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'White',     2),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222202', 'Brown',     1),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222203', 'Navy Blue', 1),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222204', 'Black',     1),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222205', 'Olive',     1)
on conflict (id) do nothing;

-- Set types (sizes per variant)
insert into public.set_types (id, variant_id, label, sizes, price_paisa, warehouse_stock) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '39-43',
    array['39','40','41','42','43']::text[], 425000, 50),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', '40-44',
    array['40','41','42','43','44']::text[], 425000, 30),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333302', '39-43',
    array['39','40','41','42','43']::text[], 425000, 25),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333303', '40-44',
    array['40','41','42','43','44']::text[], 825000, 20),
  ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333304', '40-44',
    array['40','41','42','43','44']::text[], 700000, 40),
  ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333305', 'S-XXL',
    array['S','M','L','XL','XXL']::text[], 250000, 100),
  ('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333305', 'M-XXL',
    array['M','L','XL','XXL']::text[], 200000, 60)
on conflict (id) do nothing;

-- Shopkeepers (placeholder profile_ids; replace with real auth.users.id values).
-- After creating shopkeeper auth users in the dashboard, run:
--   update public.shopkeepers set profile_id = '<real-user-id>' where phone = '...';
-- Skipped here because profile_id requires a matching auth.users row.
