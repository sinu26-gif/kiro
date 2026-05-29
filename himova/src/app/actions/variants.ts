"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { parseNprToPaisa } from "@/lib/format";
import { parseSizesInput, validateSizes, defaultLabelForSizes } from "@/lib/set-templates";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type VariantActionState = {
  ok: boolean;
  error?: string;
  productId?: string;
};

function revalidateProduct(productId: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------
const createVariantSchema = z.object({
  productId: z.string().trim().uuid(),
  variantName: z.string().trim().min(1, "Enter a colour or style name.").max(100),
});

export async function createVariant(
  _prev: VariantActionState | null,
  formData: FormData
): Promise<VariantActionState> {
  await requireRole(["admin"]);

  const parsed = createVariantSchema.safeParse({
    productId: formData.get("productId"),
    variantName: formData.get("variantName"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = getSupabaseServerClient();

  // Next sort_order for this product.
  const { data: existing } = await supabase
    .from("product_variants")
    .select("sort_order")
    .eq("product_id", parsed.data.productId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((existing ?? [])[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("product_variants").insert({
    product_id: parsed.data.productId,
    variant_name: parsed.data.variantName,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };

  revalidateProduct(parsed.data.productId);
  return { ok: true, productId: parsed.data.productId };
}

const renameVariantSchema = z.object({
  productId: z.string().trim().uuid(),
  variantId: z.string().trim().uuid(),
  variantName: z.string().trim().min(1, "Enter a name.").max(100),
});

export async function renameVariant(
  _prev: VariantActionState | null,
  formData: FormData
): Promise<VariantActionState> {
  await requireRole(["admin"]);

  const parsed = renameVariantSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
    variantName: formData.get("variantName"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .update({ variant_name: parsed.data.variantName })
    .eq("id", parsed.data.variantId);

  if (error) return { ok: false, error: error.message };

  revalidateProduct(parsed.data.productId);
  return { ok: true, productId: parsed.data.productId };
}

const deleteVariantSchema = z.object({
  productId: z.string().trim().uuid(),
  variantId: z.string().trim().uuid(),
});

export async function deleteVariant(
  _prev: VariantActionState | null,
  formData: FormData
): Promise<VariantActionState> {
  await requireRole(["admin"]);

  const parsed = deleteVariantSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const supabase = getSupabaseServerClient();
  // Deleting a variant cascades to its set_types (FK on delete cascade).
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", parsed.data.variantId);

  if (error) return { ok: false, error: error.message };

  revalidateProduct(parsed.data.productId);
  return { ok: true, productId: parsed.data.productId };
}

// ---------------------------------------------------------------------------
// Set types
// ---------------------------------------------------------------------------
const createSetTypeSchema = z.object({
  productId: z.string().trim().uuid(),
  variantId: z.string().trim().uuid(),
  label: z.string().trim().max(50).optional(),
  sizes: z.string().trim().min(1, "Add the sizes for this set."),
  price: z.string().trim().min(1, "Enter a price."),
  warehouseStock: z.string().trim().optional(),
  reorderThreshold: z.string().trim().optional(),
});

function toIntOrDefault(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function createSetType(
  _prev: VariantActionState | null,
  formData: FormData
): Promise<VariantActionState> {
  await requireRole(["admin"]);

  const parsed = createSetTypeSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
    label: formData.get("label"),
    sizes: formData.get("sizes"),
    price: formData.get("price"),
    warehouseStock: formData.get("warehouseStock"),
    reorderThreshold: formData.get("reorderThreshold"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const sizes = parseSizesInput(parsed.data.sizes);
  const sizeCheck = validateSizes(sizes);
  if (!sizeCheck.ok) {
    return { ok: false, error: sizeCheck.error };
  }

  const pricePaisa = parseNprToPaisa(parsed.data.price);
  if (pricePaisa === null) {
    return { ok: false, error: "Price is not a valid number." };
  }

  const label = parsed.data.label?.trim() || defaultLabelForSizes(sizeCheck.sizes);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("set_types").insert({
    variant_id: parsed.data.variantId,
    label,
    sizes: sizeCheck.sizes,
    price_paisa: pricePaisa,
    warehouse_stock: toIntOrDefault(parsed.data.warehouseStock, 0),
    reorder_threshold: toIntOrDefault(parsed.data.reorderThreshold, 5),
  });

  if (error) {
    // Unique-combo violation gives a clearer message.
    if (error.message.toLowerCase().includes("set_types_unique_combo")) {
      return { ok: false, error: "This variant already has a set with those exact sizes." };
    }
    return { ok: false, error: error.message };
  }

  revalidateProduct(parsed.data.productId);
  return { ok: true, productId: parsed.data.productId };
}

const updateSetTypeSchema = z.object({
  productId: z.string().trim().uuid(),
  setTypeId: z.string().trim().uuid(),
  price: z.string().trim().min(1, "Enter a price."),
  warehouseStock: z.string().trim().optional(),
  reorderThreshold: z.string().trim().optional(),
});

export async function updateSetType(
  _prev: VariantActionState | null,
  formData: FormData
): Promise<VariantActionState> {
  await requireRole(["admin"]);

  const parsed = updateSetTypeSchema.safeParse({
    productId: formData.get("productId"),
    setTypeId: formData.get("setTypeId"),
    price: formData.get("price"),
    warehouseStock: formData.get("warehouseStock"),
    reorderThreshold: formData.get("reorderThreshold"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const pricePaisa = parseNprToPaisa(parsed.data.price);
  if (pricePaisa === null) {
    return { ok: false, error: "Price is not a valid number." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("set_types")
    .update({
      price_paisa: pricePaisa,
      warehouse_stock: toIntOrDefault(parsed.data.warehouseStock, 0),
      reorder_threshold: toIntOrDefault(parsed.data.reorderThreshold, 5),
    })
    .eq("id", parsed.data.setTypeId);

  if (error) return { ok: false, error: error.message };

  revalidateProduct(parsed.data.productId);
  return { ok: true, productId: parsed.data.productId };
}

const deleteSetTypeSchema = z.object({
  productId: z.string().trim().uuid(),
  setTypeId: z.string().trim().uuid(),
});

export async function deleteSetType(
  _prev: VariantActionState | null,
  formData: FormData
): Promise<VariantActionState> {
  await requireRole(["admin"]);

  const parsed = deleteSetTypeSchema.safeParse({
    productId: formData.get("productId"),
    setTypeId: formData.get("setTypeId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("set_types").delete().eq("id", parsed.data.setTypeId);

  if (error) return { ok: false, error: error.message };

  revalidateProduct(parsed.data.productId);
  return { ok: true, productId: parsed.data.productId };
}
