-- Himova Phase 1 MVP Schema
-- All tables use UUID primary keys, timestamps, and RLS

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'shopkeeper')),
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'shopkeeper', COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SHOPKEEPERS
-- ============================================
CREATE TABLE shopkeepers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL DEFAULT '',
  location_lat NUMERIC,
  location_lng NUMERIC,
  logo_url TEXT,
  shopkeeper_type TEXT NOT NULL CHECK (shopkeeper_type IN ('shoes', 'clothes')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
);

-- Seed default categories
INSERT INTO categories (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Shoes', 'shoes'),
  ('a0000000-0000-0000-0000-000000000002', 'Clothing', 'clothing'),
  ('a0000000-0000-0000-0000-000000000003', 'Accessories', 'accessories');

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  suggested_retail_paisa INT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCT PHOTOS
-- ============================================
CREATE TABLE product_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- ============================================
-- PRODUCT VARIANTS
-- ============================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- ============================================
-- SET TYPES
-- ============================================
CREATE TABLE set_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sizes TEXT[] NOT NULL,
  price_paisa INT NOT NULL,
  warehouse_stock INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 5
);

-- ============================================
-- SHOPKEEPER PRICING (manual overrides)
-- ============================================
CREATE TABLE shopkeeper_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  set_type_id UUID NOT NULL REFERENCES set_types(id) ON DELETE CASCADE,
  override_paisa INT,
  discount_percent NUMERIC(5,2),
  note TEXT NOT NULL DEFAULT ''
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'packed', 'shipped', 'delivered', 'cancelled')),
  subtotal_paisa INT NOT NULL,
  discount_paisa INT NOT NULL DEFAULT 0,
  total_paisa INT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bank', 'esewa', 'khalti')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  free_delivery BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_delivery_at DATE,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  set_type_id UUID NOT NULL REFERENCES set_types(id) ON DELETE RESTRICT,
  set_quantity INT NOT NULL,
  unit_price_paisa INT NOT NULL,
  line_total_paisa INT NOT NULL
);

-- ============================================
-- SHOP STOCK (per-shopkeeper, per-size)
-- ============================================
CREATE TABLE shop_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  UNIQUE (shopkeeper_id, variant_id, size)
);

-- ============================================
-- STOCK MOVEMENTS (audit log)
-- ============================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL CHECK (scope IN ('warehouse', 'shop')),
  shopkeeper_id UUID REFERENCES shopkeepers(id) ON DELETE SET NULL,
  set_type_id UUID REFERENCES set_types(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  size TEXT,
  delta INT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('restock', 'order_shipped', 'order_delivered', 'retail_sale', 'manual_adjust')),
  reference_id UUID,
  actor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- POS SALES
-- ============================================
CREATE TABLE pos_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE RESTRICT,
  customer_id UUID,
  subtotal_paisa INT NOT NULL,
  discount_paisa INT NOT NULL DEFAULT 0,
  total_paisa INT NOT NULL,
  return_policy_text TEXT NOT NULL DEFAULT 'Exchange only — no refunds.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- POS SALE ITEMS
-- ============================================
CREATE TABLE pos_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  custom_product_id UUID,
  size TEXT,
  quantity INT NOT NULL,
  unit_price_paisa INT NOT NULL,
  line_total_paisa INT NOT NULL
);

-- ============================================
-- POS PAYMENTS (supports split payments)
-- ============================================
CREATE TABLE pos_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'esewa', 'khalti', 'other')),
  amount_paisa INT NOT NULL
);

-- ============================================
-- SHOP CUSTOMERS
-- ============================================
CREATE TABLE shop_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shopkeeper_id, phone)
);

-- Add FK from pos_sales to shop_customers
ALTER TABLE pos_sales ADD CONSTRAINT fk_pos_customer
  FOREIGN KEY (customer_id) REFERENCES shop_customers(id) ON DELETE SET NULL;

-- ============================================
-- CUSTOM PRODUCTS (shopkeeper's own products)
-- ============================================
CREATE TABLE custom_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  price_paisa INT NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0
);

-- Add FK from pos_sale_items to custom_products
ALTER TABLE pos_sale_items ADD CONSTRAINT fk_custom_product
  FOREIGN KEY (custom_product_id) REFERENCES custom_products(id) ON DELETE SET NULL;

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REWARDS
-- ============================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_label TEXT NOT NULL,
  shopkeeper_id UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percent', 'free_set', 'custom_item')),
  reward_value TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REGISTRATION REQUESTS
-- ============================================
CREATE TABLE registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  shopkeeper_type TEXT NOT NULL CHECK (shopkeeper_type IN ('shoes', 'clothes')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_shopkeeper_id UUID REFERENCES shopkeepers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- APP EVENTS (audit/observability)
-- ============================================
CREATE TABLE app_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Helper function: get current user's shopkeeper_id
CREATE OR REPLACE FUNCTION auth_shopkeeper_id()
RETURNS UUID AS $$
  SELECT id FROM shopkeepers WHERE profile_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Enable RLS on all shopkeeper-scoped tables
ALTER TABLE shopkeepers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Shopkeepers: see own row only
CREATE POLICY shopkeepers_own ON shopkeepers
  FOR ALL USING (profile_id = auth.uid() OR is_admin());

-- Orders: shopkeeper sees own, admin sees all
CREATE POLICY orders_own ON orders
  FOR ALL USING (shopkeeper_id = auth_shopkeeper_id() OR is_admin());

-- Order items: via order
CREATE POLICY order_items_own ON order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM orders WHERE shopkeeper_id = auth_shopkeeper_id())
    OR is_admin()
  );

-- Shop stock: own data
CREATE POLICY shop_stock_own ON shop_stock
  FOR ALL USING (shopkeeper_id = auth_shopkeeper_id() OR is_admin());

-- POS sales: own data
CREATE POLICY pos_sales_own ON pos_sales
  FOR ALL USING (shopkeeper_id = auth_shopkeeper_id() OR is_admin());

-- POS sale items: via sale
CREATE POLICY pos_sale_items_own ON pos_sale_items
  FOR ALL USING (
    sale_id IN (SELECT id FROM pos_sales WHERE shopkeeper_id = auth_shopkeeper_id())
    OR is_admin()
  );

-- POS payments: via sale
CREATE POLICY pos_payments_own ON pos_payments
  FOR ALL USING (
    sale_id IN (SELECT id FROM pos_sales WHERE shopkeeper_id = auth_shopkeeper_id())
    OR is_admin()
  );

-- Shop customers: own data
CREATE POLICY shop_customers_own ON shop_customers
  FOR ALL USING (shopkeeper_id = auth_shopkeeper_id() OR is_admin());

-- Custom products: own data
CREATE POLICY custom_products_own ON custom_products
  FOR ALL USING (shopkeeper_id = auth_shopkeeper_id() OR is_admin());

-- Notifications: own data
CREATE POLICY notifications_own ON notifications
  FOR ALL USING (recipient_profile_id = auth.uid() OR is_admin());

-- Stock movements: shopkeeper sees their own shop movements + admin sees all
CREATE POLICY stock_movements_own ON stock_movements
  FOR ALL USING (
    (scope = 'shop' AND shopkeeper_id = auth_shopkeeper_id())
    OR is_admin()
  );

-- Registration requests: public can insert, admin can view/update
CREATE POLICY reg_requests_insert ON registration_requests
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY reg_requests_admin ON registration_requests
  FOR SELECT USING (is_admin());
CREATE POLICY reg_requests_admin_update ON registration_requests
  FOR UPDATE USING (is_admin());

-- Products, categories, variants, set_types, photos: public read, admin write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_read ON products FOR SELECT USING (TRUE);
CREATE POLICY products_admin ON products FOR ALL USING (is_admin());
CREATE POLICY categories_read ON categories FOR SELECT USING (TRUE);
CREATE POLICY categories_admin ON categories FOR ALL USING (is_admin());
CREATE POLICY variants_read ON product_variants FOR SELECT USING (TRUE);
CREATE POLICY variants_admin ON product_variants FOR ALL USING (is_admin());
CREATE POLICY set_types_read ON set_types FOR SELECT USING (TRUE);
CREATE POLICY set_types_admin ON set_types FOR ALL USING (is_admin());
CREATE POLICY photos_read ON product_photos FOR SELECT USING (TRUE);
CREATE POLICY photos_admin ON product_photos FOR ALL USING (is_admin());
