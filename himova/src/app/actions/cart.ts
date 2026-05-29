"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CartActionState = {
  ok: boolean;
  error?: string;
  cartCount?: number;
};

const addSchema = z.object({
  setTypeId: z.string().trim().uuid(),
  quantity: z.coerce.number().int().min(1).max(999),
});

/**
 * Add a quantity of a set type to the current shopkeeper's cart.
 * If the row exists, the quantity is incremented (capped at warehouse stock).
 */
export async function addToCart(
  _prev: CartActionState | null,
  formData: FormData
): Promise<CartActionState> {
  await requireRole(["shopkeeper"]);

  const parsed = addSchema.safeParse({
    setTypeId: formData.get("setTypeId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Pick a set and a quantity first." };
  }

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return { ok: false, error: "Shopkeeper account not found." };

  const supabase = getSupabaseServerClient();

  // Confirm the set type exists and has stock headroom.
  const { data: setType } = await supabase
    .from("set_types")
    .select("warehouse_stock")
    .eq("id", parsed.data.setTypeId)
    .maybeSingle();
  if (!setType) return { ok: false, error: "That set is no longer available." };

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("set_type_id", parsed.data.setTypeId)
    .maybeSingle();

  const desired = (existing?.quantity ?? 0) + parsed.data.quantity;
  const capped = Math.min(desired, Math.max(setType.warehouse_stock, 1));

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: capped })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("cart_items").insert({
      shopkeeper_id: shopkeeperId,
      set_type_id: parsed.data.setTypeId,
      quantity: capped,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/shop/cart");
  revalidatePath("/shop/catalog");
  const count = await cartCount(shopkeeperId);
  return { ok: true, cartCount: count };
}

const updateSchema = z.object({
  cartItemId: z.string().trim().uuid(),
  quantity: z.coerce.number().int().min(0).max(999),
});

/**
 * Set the quantity of a cart line. Quantity 0 removes the line.
 */
export async function updateCartItem(
  _prev: CartActionState | null,
  formData: FormData
): Promise<CartActionState> {
  await requireRole(["shopkeeper"]);

  const parsed = updateSchema.safeParse({
    cartItemId: formData.get("cartItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return { ok: false, error: "Shopkeeper account not found." };

  const supabase = getSupabaseServerClient();

  if (parsed.data.quantity === 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", parsed.data.cartItemId)
      .eq("shopkeeper_id", shopkeeperId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: parsed.data.quantity })
      .eq("id", parsed.data.cartItemId)
      .eq("shopkeeper_id", shopkeeperId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/shop/cart");
  return { ok: true, cartCount: await cartCount(shopkeeperId) };
}

const removeSchema = z.object({ cartItemId: z.string().trim().uuid() });

export async function removeCartItem(
  _prev: CartActionState | null,
  formData: FormData
): Promise<CartActionState> {
  await requireRole(["shopkeeper"]);
  const parsed = removeSchema.safeParse({ cartItemId: formData.get("cartItemId") });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return { ok: false, error: "Shopkeeper account not found." };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", parsed.data.cartItemId)
    .eq("shopkeeper_id", shopkeeperId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/shop/cart");
  return { ok: true, cartCount: await cartCount(shopkeeperId) };
}

async function cartCount(shopkeeperId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("shopkeeper_id", shopkeeperId);
  return (data ?? []).reduce((sum, r) => sum + (r.quantity as number), 0);
}
