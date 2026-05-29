"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { loadCart } from "@/lib/cart";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";

export type PlaceOrderState = {
  ok: boolean;
  error?: string;
};

const placeOrderSchema = z.object({
  paymentMethod: z.enum(["cod", "bank", "esewa", "khalti"]),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v?.length ? v : null)),
});

const DEFAULT_DELIVERY_DAYS = 3;

/**
 * Place an order from the current shopkeeper's cart.
 *
 * Steps (best-effort transactional via cleanup):
 *  1. Read the cart with effective pricing.
 *  2. Create the order header + items (price snapshot).
 *  3. Clear the cart.
 *  4. Notify admins (in-app notification rows).
 *
 * Stock is NOT decremented here — that happens when the admin marks the
 * order Shipped (see updateOrderStatus).
 */
export async function placeOrder(
  _prev: PlaceOrderState | null,
  formData: FormData
): Promise<PlaceOrderState> {
  await requireRole(["shopkeeper"]);

  const parsed = placeOrderSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Choose a payment method." };
  }

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return { ok: false, error: "Shopkeeper account not found." };

  const cart = await loadCart();
  if (cart.lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const supabase = getSupabaseServerClient();

  const eta = new Date();
  eta.setDate(eta.getDate() + DEFAULT_DELIVERY_DAYS);
  const etaDate = eta.toISOString().slice(0, 10);

  // 1. Order header.
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      shopkeeper_id: shopkeeperId,
      status: "pending",
      subtotal_paisa: cart.subtotalPaisa,
      discount_paisa: 0,
      total_paisa: cart.subtotalPaisa,
      payment_method: parsed.data.paymentMethod,
      payment_status: "unpaid",
      estimated_delivery_at: etaDate,
      notes_to_admin: parsed.data.notes,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message ?? "Could not create the order." };
  }

  // 2. Order items (price snapshot).
  const items = cart.lines.map((l) => ({
    order_id: order.id,
    set_type_id: l.setTypeId,
    set_quantity: l.quantity,
    unit_price_paisa: l.unitPricePaisa,
    line_total_paisa: l.lineTotalPaisa,
  }));
  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) {
    // Roll back the header so we don't leave an empty order.
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: itemsErr.message };
  }

  // 3. Clear the cart.
  await supabase.from("cart_items").delete().eq("shopkeeper_id", shopkeeperId);

  // 4. Notify admins (best-effort; uses admin client to write notification rows).
  try {
    const admin = getSupabaseAdminClient();
    const { data: shop } = await admin
      .from("shopkeepers")
      .select("shop_name")
      .eq("id", shopkeeperId)
      .maybeSingle();
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
    if (admins && admins.length > 0) {
      const rows = admins.map((a) => ({
        recipient_profile_id: a.id as string,
        category: "order" as const,
        title: "New order placed",
        body: `${shop?.shop_name ?? "A shopkeeper"} placed an order for ${formatPaisa(cart.subtotalPaisa)}.`,
        link: `/admin/orders/${order.id}`,
      }));
      await admin.from("notifications").insert(rows);
    }
    await admin.from("app_events").insert({
      event_type: "order_placed",
      shopkeeper_id: shopkeeperId,
      payload: { order_id: order.id, total_paisa: cart.subtotalPaisa },
    });
  } catch {
    // Notification failures must not block the order.
  }

  revalidatePath("/shop/cart");
  revalidatePath("/shop/orders");
  revalidatePath("/admin/orders");
  redirect(`/shop/orders/${order.id}?placed=1`);
}

function formatPaisa(paisa: number): string {
  return `Rs ${(paisa / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Admin: update order status (pending -> packed -> shipped -> delivered)
// ---------------------------------------------------------------------------
const updateStatusSchema = z.object({
  orderId: z.string().trim().uuid(),
  status: z.enum(["pending", "packed", "shipped", "delivered", "cancelled"]),
});

export async function updateOrderStatus(
  _prev: PlaceOrderState | null,
  formData: FormData
): Promise<PlaceOrderState> {
  await requireRole(["admin"]);

  const parsed = updateStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const admin = getSupabaseAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, shopkeeper_id, status")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  const stamp: Record<string, string> = {};
  const now = new Date().toISOString();
  if (parsed.data.status === "packed") stamp.packed_at = now;
  if (parsed.data.status === "shipped") stamp.shipped_at = now;
  if (parsed.data.status === "delivered") stamp.delivered_at = now;
  if (parsed.data.status === "cancelled") stamp.cancelled_at = now;

  const { error } = await admin
    .from("orders")
    .update({ status: parsed.data.status, ...stamp })
    .eq("id", parsed.data.orderId);
  if (error) return { ok: false, error: error.message };

  // Notify the shopkeeper of the status change.
  try {
    const { data: shop } = await admin
      .from("shopkeepers")
      .select("profile_id")
      .eq("id", order.shopkeeper_id)
      .maybeSingle();
    if (shop?.profile_id) {
      await admin.from("notifications").insert({
        recipient_profile_id: shop.profile_id,
        category: "order",
        title: `Order ${parsed.data.status}`,
        body: `Your order is now ${parsed.data.status}.`,
        link: `/shop/orders/${order.id}`,
      });
    }
  } catch {
    /* ignore */
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/shop/orders");
  return { ok: true };
}

const togglePaymentSchema = z.object({
  orderId: z.string().trim().uuid(),
  paymentStatus: z.enum(["unpaid", "paid"]),
});

export async function setOrderPayment(
  _prev: PlaceOrderState | null,
  formData: FormData
): Promise<PlaceOrderState> {
  await requireRole(["admin"]);
  const parsed = togglePaymentSchema.safeParse({
    orderId: formData.get("orderId"),
    paymentStatus: formData.get("paymentStatus"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("orders")
    .update({ payment_status: parsed.data.paymentStatus })
    .eq("id", parsed.data.orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}

const toggleDeliverySchema = z.object({
  orderId: z.string().trim().uuid(),
  freeDelivery: z.enum(["true", "false"]),
});

export async function setFreeDelivery(
  _prev: PlaceOrderState | null,
  formData: FormData
): Promise<PlaceOrderState> {
  await requireRole(["admin"]);
  const parsed = toggleDeliverySchema.safeParse({
    orderId: formData.get("orderId"),
    freeDelivery: formData.get("freeDelivery"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("orders")
    .update({ free_delivery: parsed.data.freeDelivery === "true" })
    .eq("id", parsed.data.orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}
