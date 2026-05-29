"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { normalisePhone } from "@/lib/auth/phone";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PosSaleResult = {
  ok: boolean;
  error?: string;
  saleId?: string;
};

const lineSchema = z.object({
  kind: z.enum(["himova", "custom"]),
  variantId: z.string().uuid().nullable().optional(),
  customProductId: z.string().uuid().nullable().optional(),
  size: z.string().nullable().optional(),
  quantity: z.number().int().min(1).max(9999),
  unitPricePaisa: z.number().int().min(0),
});

const paymentSchema = z.object({
  method: z.enum(["cash", "esewa", "khalti", "other"]),
  amountPaisa: z.number().int().min(1),
});

const saleSchema = z.object({
  lines: z.array(lineSchema).min(1, "Add at least one item to the sale."),
  payments: z.array(paymentSchema).min(1, "Add at least one payment."),
  customerName: z.string().trim().max(120).optional().nullable(),
  customerPhone: z.string().trim().max(20).optional().nullable(),
  discountPaisa: z.number().int().min(0).default(0),
});

const RETURN_POLICY = "Exchange only — no money back.";

/**
 * Record a POS sale (shopkeeper -> retail customer).
 *
 * Steps:
 *  1. Validate the payload and that every Himova line has enough shop stock.
 *  2. Upsert the customer (if a phone is given).
 *  3. Create pos_sales + pos_sale_items + pos_payments.
 *  4. Decrement shop_stock for Himova lines, custom_products.stock_qty for
 *     custom lines, logging a 'retail_sale' stock movement per Himova line.
 *
 * The payload arrives as a JSON string in the 'payload' form field so the
 * client can send a structured sale in one request.
 */
export async function recordPosSale(payloadJson: string): Promise<PosSaleResult> {
  await requireRole(["shopkeeper"]);

  let raw: unknown;
  try {
    raw = JSON.parse(payloadJson);
  } catch {
    return { ok: false, error: "Malformed sale data." };
  }

  const parsed = saleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sale." };
  }

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return { ok: false, error: "Shopkeeper account not found." };

  const supabase = getSupabaseServerClient();
  const { lines, payments } = parsed.data;

  // 1. Validate stock for every Himova line.
  for (const line of lines) {
    if (line.kind === "himova") {
      if (!line.variantId || !line.size) {
        return { ok: false, error: "A Himova line is missing its size." };
      }
      const { data: stock } = await supabase
        .from("shop_stock")
        .select("quantity")
        .eq("shopkeeper_id", shopkeeperId)
        .eq("variant_id", line.variantId)
        .eq("size", line.size)
        .maybeSingle();
      if (!stock || stock.quantity < line.quantity) {
        return {
          ok: false,
          error: `Not enough stock for size ${line.size} (have ${stock?.quantity ?? 0}).`,
        };
      }
    } else {
      if (!line.customProductId) {
        return { ok: false, error: "A custom line is missing its product." };
      }
      const { data: cp } = await supabase
        .from("custom_products")
        .select("stock_qty")
        .eq("id", line.customProductId)
        .maybeSingle();
      if (!cp || cp.stock_qty < line.quantity) {
        return { ok: false, error: "Not enough stock for a custom product." };
      }
    }
  }

  // 2. Upsert customer if a phone is provided.
  let customerId: string | null = null;
  const phone = parsed.data.customerPhone ? normalisePhone(parsed.data.customerPhone) : null;
  const rawPhone = parsed.data.customerPhone?.trim() || null;
  if (rawPhone) {
    const phoneToStore = phone ?? rawPhone;
    const { data: existing } = await supabase
      .from("shop_customers")
      .select("id")
      .eq("shopkeeper_id", shopkeeperId)
      .eq("phone", phoneToStore)
      .maybeSingle();
    if (existing) {
      customerId = existing.id;
      if (parsed.data.customerName) {
        await supabase
          .from("shop_customers")
          .update({ name: parsed.data.customerName })
          .eq("id", existing.id);
      }
    } else {
      const { data: created } = await supabase
        .from("shop_customers")
        .insert({
          shopkeeper_id: shopkeeperId,
          name: parsed.data.customerName ?? null,
          phone: phoneToStore,
        })
        .select("id")
        .single();
      customerId = created?.id ?? null;
    }
  }

  // Totals.
  const subtotalPaisa = lines.reduce((sum, l) => sum + l.unitPricePaisa * l.quantity, 0);
  const discountPaisa = Math.min(parsed.data.discountPaisa, subtotalPaisa);
  const totalPaisa = subtotalPaisa - discountPaisa;

  // 3. Create the sale.
  const { data: sale, error: saleErr } = await supabase
    .from("pos_sales")
    .insert({
      shopkeeper_id: shopkeeperId,
      customer_id: customerId,
      subtotal_paisa: subtotalPaisa,
      discount_paisa: discountPaisa,
      total_paisa: totalPaisa,
      return_policy_text: RETURN_POLICY,
    })
    .select("id")
    .single();
  if (saleErr || !sale) {
    return { ok: false, error: saleErr?.message ?? "Could not record the sale." };
  }

  // Sale items.
  const itemRows = lines.map((l) => ({
    sale_id: sale.id,
    variant_id: l.kind === "himova" ? l.variantId! : null,
    custom_product_id: l.kind === "custom" ? l.customProductId! : null,
    size: l.kind === "himova" ? l.size! : null,
    quantity: l.quantity,
    unit_price_paisa: l.unitPricePaisa,
    line_total_paisa: l.unitPricePaisa * l.quantity,
  }));
  const { error: itemsErr } = await supabase.from("pos_sale_items").insert(itemRows);
  if (itemsErr) {
    await supabase.from("pos_sales").delete().eq("id", sale.id);
    return { ok: false, error: itemsErr.message };
  }

  // Payments.
  const paymentRows = payments.map((p) => ({
    sale_id: sale.id,
    method: p.method,
    amount_paisa: p.amountPaisa,
  }));
  const { error: payErr } = await supabase.from("pos_payments").insert(paymentRows);
  if (payErr) {
    await supabase.from("pos_sale_items").delete().eq("sale_id", sale.id);
    await supabase.from("pos_sales").delete().eq("id", sale.id);
    return { ok: false, error: payErr.message };
  }

  // 4. Deduct stock + log movements.
  for (const line of lines) {
    if (line.kind === "himova" && line.variantId && line.size) {
      const { data: stock } = await supabase
        .from("shop_stock")
        .select("id, quantity")
        .eq("shopkeeper_id", shopkeeperId)
        .eq("variant_id", line.variantId)
        .eq("size", line.size)
        .maybeSingle();
      if (stock) {
        await supabase
          .from("shop_stock")
          .update({ quantity: Math.max(0, stock.quantity - line.quantity) })
          .eq("id", stock.id);
        await supabase.from("stock_movements").insert({
          scope: "shop",
          shopkeeper_id: shopkeeperId,
          variant_id: line.variantId,
          size: line.size,
          delta: -line.quantity,
          reason: "retail_sale",
          reference_id: sale.id,
        });
      }
    } else if (line.kind === "custom" && line.customProductId) {
      const { data: cp } = await supabase
        .from("custom_products")
        .select("stock_qty")
        .eq("id", line.customProductId)
        .maybeSingle();
      if (cp) {
        await supabase
          .from("custom_products")
          .update({ stock_qty: Math.max(0, cp.stock_qty - line.quantity) })
          .eq("id", line.customProductId);
      }
    }
  }

  revalidatePath("/shop/pos");
  revalidatePath("/shop/stock");
  return { ok: true, saleId: sale.id };
}

// ---------------------------------------------------------------------------
// Custom products (shopkeeper-added items not bought from Himova)
// ---------------------------------------------------------------------------
const customProductSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  price: z.string().trim().min(1, "Enter a price."),
  stock: z.string().trim().optional(),
});

export type CustomProductState = { ok: boolean; error?: string };

export async function addCustomProduct(
  _prev: CustomProductState | null,
  formData: FormData
): Promise<CustomProductState> {
  await requireRole(["shopkeeper"]);
  const parsed = customProductSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return { ok: false, error: "Shopkeeper account not found." };

  const pricePaisa = Math.round(Number(parsed.data.price.replace(/[^0-9.]/g, "")) * 100);
  if (!Number.isFinite(pricePaisa) || pricePaisa < 0) {
    return { ok: false, error: "Price is not valid." };
  }
  const stockQty = parsed.data.stock ? Math.max(0, Math.floor(Number(parsed.data.stock))) : 0;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("custom_products").insert({
    shopkeeper_id: shopkeeperId,
    name: parsed.data.name,
    price_paisa: pricePaisa,
    stock_qty: Number.isFinite(stockQty) ? stockQty : 0,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/shop/pos");
  return { ok: true };
}
