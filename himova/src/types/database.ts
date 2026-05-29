/**
 * Himova Database Types
 * Matches the Supabase schema defined in design.md
 * Money is stored in paisa (integer). 1 NPR = 100 paisa.
 */

export type ShopkeeperType = 'shoes' | 'clothes';
export type ShopkeeperStatus = 'active' | 'suspended';
export type OrderStatus = 'pending' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'bank' | 'esewa' | 'khalti';
export type PaymentStatus = 'unpaid' | 'paid';
export type StockScope = 'warehouse' | 'shop';
export type StockReason =
  | 'restock'
  | 'order_shipped'
  | 'order_delivered'
  | 'retail_sale'
  | 'manual_adjust';
export type PosPaymentMethod = 'cash' | 'esewa' | 'khalti' | 'other';
export type RewardType = 'discount_percent' | 'free_set' | 'custom_item';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'shopkeeper';
export type ProductStatus = 'active' | 'archived';

// --- Core Tables ---

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Shopkeeper {
  id: string;
  profile_id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  location_lat: number | null;
  location_lng: number | null;
  logo_url: string | null;
  shopkeeper_type: ShopkeeperType;
  status: ShopkeeperStatus;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  description: string;
  video_url: string | null;
  suggested_retail_paisa: number | null;
  status: ProductStatus;
  created_at: string;
}

export interface ProductPhoto {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sort_order: number;
}

export interface SetType {
  id: string;
  variant_id: string;
  label: string;
  sizes: string[];
  price_paisa: number;
  warehouse_stock: number;
  reorder_threshold: number;
}

export interface ShopkeeperPricing {
  id: string;
  shopkeeper_id: string;
  set_type_id: string;
  override_paisa: number | null;
  discount_percent: number | null;
  note: string;
}

// --- Orders ---

export interface Order {
  id: string;
  shopkeeper_id: string;
  status: OrderStatus;
  subtotal_paisa: number;
  discount_paisa: number;
  total_paisa: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  free_delivery: boolean;
  estimated_delivery_at: string | null;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  set_type_id: string;
  set_quantity: number;
  unit_price_paisa: number;
  line_total_paisa: number;
}

// --- Stock ---

export interface ShopStock {
  id: string;
  shopkeeper_id: string;
  variant_id: string;
  size: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  scope: StockScope;
  shopkeeper_id: string | null;
  set_type_id: string | null;
  variant_id: string | null;
  size: string | null;
  delta: number;
  reason: StockReason;
  reference_id: string | null;
  actor_profile_id: string;
  created_at: string;
}

// --- POS ---

export interface PosSale {
  id: string;
  shopkeeper_id: string;
  customer_id: string | null;
  subtotal_paisa: number;
  discount_paisa: number;
  total_paisa: number;
  return_policy_text: string;
  created_at: string;
}

export interface PosSaleItem {
  id: string;
  sale_id: string;
  variant_id: string | null;
  custom_product_id: string | null;
  size: string | null;
  quantity: number;
  unit_price_paisa: number;
  line_total_paisa: number;
}

export interface PosPayment {
  id: string;
  sale_id: string;
  method: PosPaymentMethod;
  amount_paisa: number;
}

export interface ShopCustomer {
  id: string;
  shopkeeper_id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface CustomProduct {
  id: string;
  shopkeeper_id: string;
  name: string;
  photo_url: string;
  price_paisa: number;
  stock_qty: number;
}

// --- Notifications & Rewards ---

export interface Notification {
  id: string;
  recipient_profile_id: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  cycle_label: string;
  shopkeeper_id: string;
  rank: number;
  reward_type: RewardType;
  reward_value: string;
  created_by: string;
  created_at: string;
}

// --- Registration Requests ---

export interface RegistrationRequest {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  shopkeeper_type: ShopkeeperType;
  status: RegistrationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_shopkeeper_id: string | null;
  created_at: string;
}

// --- Computed/Display types ---

/** Per-piece display price computed from set price */
export interface ProductDisplayInfo {
  product: Product;
  photo_url: string;
  variant: ProductVariant;
  set_type: SetType;
  /** price_paisa / sizes.length — for display only */
  display_price_paisa: number;
  /** Full set price */
  set_price_paisa: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  set_type_id: string;
  product_name: string;
  variant_name: string;
  set_label: string;
  photo_url: string;
  set_quantity: number;
  /** Full set price (may include shopkeeper_pricing override) */
  unit_price_paisa: number;
  /** unit_price_paisa * set_quantity */
  line_total_paisa: number;
  /** For display: unit_price_paisa / sizes.length */
  display_price_paisa: number;
  sizes_count: number;
}
