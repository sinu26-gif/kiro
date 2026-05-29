import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Stock movement engine.
 *
 * Two transitions move stock:
 *  - Shipped:   warehouse_stock decreases by the ordered set quantity.
 *  - Delivered: each set explodes into individual size-pieces that are added
 *               to the shopkeeper's shop_stock.
 *
 * Every change is recorded in stock_movements for a full audit trail.
 * These run with the admin (service-role) client because they are triggered
 * from admin-only order actions and must write to a shopkeeper's shop_stock
 * rows (bypassing shopkeeper RLS).
 */

type OrderItemForStock = {
  set_quantity: number;
  set_type: {
    id: string;
    sizes: string[];
    variant_id: string;
    warehouse_stock: number;
  } | null;
};

async function loadOrderItemsForStock(orderId: string): Promise<OrderItemForStock[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("order_items")
    .select(
      `
      set_quantity,
      set_type:set_types ( id, sizes, variant_id, warehouse_stock )
    `
    )
    .eq("order_id", orderId);
  return (data as unknown as OrderItemForStock[]) ?? [];
}

/**
 * Decrement warehouse stock for every line in an order (on Shipped).
 * Clamps at zero and logs a 'order_shipped' movement per set type.
 */
export async function applyShipmentStockOut(
  orderId: string,
  actorProfileId: string | null
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const items = await loadOrderItemsForStock(orderId);

  for (const item of items) {
    const st = item.set_type;
    if (!st) continue;

    const newStock = Math.max(0, st.warehouse_stock - item.set_quantity);
    await admin.from("set_types").update({ warehouse_stock: newStock }).eq("id", st.id);

    await admin.from("stock_movements").insert({
      scope: "warehouse",
      set_type_id: st.id,
      delta: -item.set_quantity,
      reason: "order_shipped",
      reference_id: orderId,
      actor_profile_id: actorProfileId,
    });
  }
}

/**
 * Explode each set into per-size pieces and add them to the shopkeeper's
 * shop_stock (on Delivered). Logs a 'order_delivered' movement per size.
 */
export async function applyDeliveryStockIn(
  orderId: string,
  shopkeeperId: string,
  actorProfileId: string | null
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const items = await loadOrderItemsForStock(orderId);

  for (const item of items) {
    const st = item.set_type;
    if (!st) continue;

    for (const size of st.sizes ?? []) {
      const { data: existing } = await admin
        .from("shop_stock")
        .select("id, quantity")
        .eq("shopkeeper_id", shopkeeperId)
        .eq("variant_id", st.variant_id)
        .eq("size", size)
        .maybeSingle();

      if (existing) {
        await admin
          .from("shop_stock")
          .update({ quantity: existing.quantity + item.set_quantity })
          .eq("id", existing.id);
      } else {
        await admin.from("shop_stock").insert({
          shopkeeper_id: shopkeeperId,
          variant_id: st.variant_id,
          size,
          quantity: item.set_quantity,
        });
      }

      await admin.from("stock_movements").insert({
        scope: "shop",
        shopkeeper_id: shopkeeperId,
        variant_id: st.variant_id,
        size,
        delta: item.set_quantity,
        reason: "order_delivered",
        reference_id: orderId,
        actor_profile_id: actorProfileId,
      });
    }
  }
}

/**
 * Manual warehouse adjustment (admin restock or correction).
 * delta may be positive (restock) or negative (shrinkage). Clamps at zero.
 */
export async function adjustWarehouseStock(
  setTypeId: string,
  delta: number,
  actorProfileId: string | null,
  note: string | null
): Promise<{ ok: boolean; error?: string; newStock?: number }> {
  const admin = getSupabaseAdminClient();
  const { data: st } = await admin
    .from("set_types")
    .select("warehouse_stock")
    .eq("id", setTypeId)
    .maybeSingle();
  if (!st) return { ok: false, error: "Set type not found." };

  const newStock = Math.max(0, st.warehouse_stock + delta);
  const { error } = await admin
    .from("set_types")
    .update({ warehouse_stock: newStock })
    .eq("id", setTypeId);
  if (error) return { ok: false, error: error.message };

  await admin.from("stock_movements").insert({
    scope: "warehouse",
    set_type_id: setTypeId,
    delta,
    reason: "manual_adjust",
    actor_profile_id: actorProfileId,
    note,
  });

  return { ok: true, newStock };
}
