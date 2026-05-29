"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { parseNprToPaisa } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PricingActionState = { ok: boolean; error?: string };

const setSchema = z.object({
  shopkeeperId: z.string().uuid(),
  setTypeId: z.string().uuid(),
  mode: z.enum(["percent", "absolute"]),
  percent: z.string().trim().optional(),
  absolute: z.string().trim().optional(),
  note: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v?.length ? v : null)),
});

/**
 * Admin: set (or update) a per-shopkeeper price override for one set type.
 * Either a percent discount or an absolute price, plus an optional note shown
 * to the shopkeeper as a badge in the catalog/cart.
 */
export async function setShopkeeperPricing(
  _prev: PricingActionState | null,
  formData: FormData
): Promise<PricingActionState> {
  await requireRole(["admin"]);

  const parsed = setSchema.safeParse({
    shopkeeperId: formData.get("shopkeeperId"),
    setTypeId: formData.get("setTypeId"),
    mode: formData.get("mode"),
    percent: formData.get("percent"),
    absolute: formData.get("absolute"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let overridePaisa: number | null = null;
  let discountPercent: number | null = null;

  if (parsed.data.mode === "percent") {
    const pct = Number(parsed.data.percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return { ok: false, error: "Enter a discount between 1 and 100." };
    }
    discountPercent = pct;
  } else {
    const paisa = parseNprToPaisa(parsed.data.absolute ?? "");
    if (paisa === null || paisa < 0) {
      return { ok: false, error: "Enter a valid price." };
    }
    overridePaisa = paisa;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("shopkeeper_pricing").upsert(
    {
      shopkeeper_id: parsed.data.shopkeeperId,
      set_type_id: parsed.data.setTypeId,
      override_paisa: overridePaisa,
      discount_percent: discountPercent,
      note: parsed.data.note,
    },
    { onConflict: "shopkeeper_id,set_type_id" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/shopkeepers/${parsed.data.shopkeeperId}`);
  return { ok: true };
}

const removeSchema = z.object({
  shopkeeperId: z.string().uuid(),
  pricingId: z.string().uuid(),
});

export async function removeShopkeeperPricing(
  _prev: PricingActionState | null,
  formData: FormData
): Promise<PricingActionState> {
  await requireRole(["admin"]);
  const parsed = removeSchema.safeParse({
    shopkeeperId: formData.get("shopkeeperId"),
    pricingId: formData.get("pricingId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("shopkeeper_pricing")
    .delete()
    .eq("id", parsed.data.pricingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/shopkeepers/${parsed.data.shopkeeperId}`);
  return { ok: true };
}
