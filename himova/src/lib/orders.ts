import "server-only";

import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/components/orders/status-badge";

export type OrderListRow = {
  id: string;
  status: OrderStatus;
  totalPaisa: number;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: "cod" | "bank" | "esewa" | "khalti";
  placedAt: string;
  itemCount: number;
  shopName?: string;
};

export type OrderItemLine = {
  id: string;
  label: string;
  sizes: string[];
  productName: string;
  variantName: string;
  setQuantity: number;
  unitPricePaisa: number;
  lineTotalPaisa: number;
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  subtotalPaisa: number;
  totalPaisa: number;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: "cod" | "bank" | "esewa" | "khalti";
  freeDelivery: boolean;
  estimatedDeliveryAt: string | null;
  notesToAdmin: string | null;
  placedAt: string;
  items: OrderItemLine[];
  shop: {
    id: string;
    shopName: string;
    ownerName: string;
    phone: string;
    address: string | null;
  } | null;
};

type RawItem = {
  id: string;
  set_quantity: number;
  unit_price_paisa: number;
  line_total_paisa: number;
  set_type: {
    label: string;
    sizes: string[];
    variant: {
      variant_name: string;
      product: { name: string } | null;
    } | null;
  } | null;
};

function mapItems(rows: RawItem[]): OrderItemLine[] {
  return rows.map((it) => ({
    id: it.id,
    label: it.set_type?.label ?? "—",
    sizes: it.set_type?.sizes ?? [],
    productName: it.set_type?.variant?.product?.name ?? "—",
    variantName: it.set_type?.variant?.variant_name ?? "—",
    setQuantity: it.set_quantity,
    unitPricePaisa: it.unit_price_paisa,
    lineTotalPaisa: it.line_total_paisa,
  }));
}

const ORDER_SELECT = `
  id, status, subtotal_paisa, total_paisa, payment_status, payment_method,
  free_delivery, estimated_delivery_at, notes_to_admin, placed_at,
  order_items:order_items (
    id, set_quantity, unit_price_paisa, line_total_paisa,
    set_type:set_types (
      label, sizes,
      variant:product_variants (
        variant_name,
        product:products ( name )
      )
    )
  )
`;

/** Orders for the current shopkeeper. */
export async function loadShopOrders(): Promise<OrderListRow[]> {
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, total_paisa, payment_status, payment_method, placed_at, order_items(id)"
    )
    .eq("shopkeeper_id", shopkeeperId)
    .order("placed_at", { ascending: false });
  if (error || !data) return [];
  return data.map((o) => ({
    id: o.id as string,
    status: o.status as OrderStatus,
    totalPaisa: o.total_paisa as number,
    paymentStatus: o.payment_status as "unpaid" | "paid",
    paymentMethod: o.payment_method as OrderListRow["paymentMethod"],
    placedAt: o.placed_at as string,
    itemCount: ((o.order_items as unknown as unknown[]) ?? []).length,
  }));
}

/** Single order for the current shopkeeper (RLS guards ownership). */
export async function loadShopOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    status: data.status as OrderStatus,
    subtotalPaisa: data.subtotal_paisa as number,
    totalPaisa: data.total_paisa as number,
    paymentStatus: data.payment_status as "unpaid" | "paid",
    paymentMethod: data.payment_method as OrderDetail["paymentMethod"],
    freeDelivery: data.free_delivery as boolean,
    estimatedDeliveryAt: (data.estimated_delivery_at as string | null) ?? null,
    notesToAdmin: (data.notes_to_admin as string | null) ?? null,
    placedAt: data.placed_at as string,
    items: mapItems((data.order_items as unknown as RawItem[]) ?? []),
    shop: null,
  };
}

/** All orders (admin), optionally filtered by status. */
export async function loadAdminOrders(status?: OrderStatus): Promise<OrderListRow[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select(
      "id, status, total_paisa, payment_status, payment_method, placed_at, shopkeeper:shopkeepers(shop_name), order_items(id)"
    )
    .order("placed_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((o) => {
    const shop = o.shopkeeper as unknown as { shop_name: string } | null;
    return {
      id: o.id as string,
      status: o.status as OrderStatus,
      totalPaisa: o.total_paisa as number,
      paymentStatus: o.payment_status as "unpaid" | "paid",
      paymentMethod: o.payment_method as OrderListRow["paymentMethod"],
      placedAt: o.placed_at as string,
      itemCount: ((o.order_items as unknown as unknown[]) ?? []).length,
      shopName: shop?.shop_name ?? "—",
    };
  });
}

/** Single order with shopkeeper details (admin). */
export async function loadAdminOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `${ORDER_SELECT}, shopkeeper:shopkeepers ( id, shop_name, owner_name, phone, address )`
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  const shop = data.shopkeeper as unknown as {
    id: string;
    shop_name: string;
    owner_name: string;
    phone: string;
    address: string | null;
  } | null;
  return {
    id: data.id as string,
    status: data.status as OrderStatus,
    subtotalPaisa: data.subtotal_paisa as number,
    totalPaisa: data.total_paisa as number,
    paymentStatus: data.payment_status as "unpaid" | "paid",
    paymentMethod: data.payment_method as OrderDetail["paymentMethod"],
    freeDelivery: data.free_delivery as boolean,
    estimatedDeliveryAt: (data.estimated_delivery_at as string | null) ?? null,
    notesToAdmin: (data.notes_to_admin as string | null) ?? null,
    placedAt: data.placed_at as string,
    items: mapItems((data.order_items as unknown as RawItem[]) ?? []),
    shop: shop
      ? {
          id: shop.id,
          shopName: shop.shop_name,
          ownerName: shop.owner_name,
          phone: shop.phone,
          address: shop.address,
        }
      : null,
  };
}
