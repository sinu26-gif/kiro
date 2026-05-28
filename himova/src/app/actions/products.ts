"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { parseNprToPaisa } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProductActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<"name" | "categoryId" | "description" | "videoUrl" | "suggestedRetail", string>
  >;
  productId?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const youtubeUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .refine(
    (v) =>
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\b/i.test(v),
    "Only YouTube links are supported."
  );

const optionalYoutube = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    youtubeUrlSchema.optional()
  );

const optionalString = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(2000).optional()
  );

// ---------------------------------------------------------------------------
// Create product
// ---------------------------------------------------------------------------
const createProductSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(200),
  categoryId: z
    .string()
    .trim()
    .uuid("Pick a category.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: optionalString,
  videoUrl: optionalYoutube,
  suggestedRetail: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().optional()
    ),
});

function fieldErrorsFromZod(
  err: z.ZodError
): NonNullable<ProductActionState["fieldErrors"]> {
  const out: NonNullable<ProductActionState["fieldErrors"]> = {};
  for (const issue of err.issues) {
    const k = issue.path[0] as keyof NonNullable<ProductActionState["fieldErrors"]>;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export async function createProduct(
  _prev: ProductActionState | null,
  formData: FormData
): Promise<ProductActionState> {
  await requireRole(["admin"]);

  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    videoUrl: formData.get("videoUrl"),
    suggestedRetail: formData.get("suggestedRetail"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  // Convert NPR string to paisa integer.
  let suggestedRetailPaisa: number | null = null;
  if (parsed.data.suggestedRetail) {
    const paisa = parseNprToPaisa(parsed.data.suggestedRetail);
    if (paisa === null) {
      return {
        ok: false,
        error: "Suggested retail price is not a valid number.",
        fieldErrors: { suggestedRetail: "Enter a number like 1200." },
      };
    }
    suggestedRetailPaisa = paisa;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      category_id: parsed.data.categoryId ?? null,
      description: parsed.data.description ?? null,
      video_url: parsed.data.videoUrl ?? null,
      suggested_retail_paisa: suggestedRetailPaisa,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create the product." };
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}`);
}

// ---------------------------------------------------------------------------
// Update product
// ---------------------------------------------------------------------------
const updateProductSchema = createProductSchema.extend({
  productId: z.string().trim().uuid(),
});

export async function updateProduct(
  _prev: ProductActionState | null,
  formData: FormData
): Promise<ProductActionState> {
  await requireRole(["admin"]);

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    videoUrl: formData.get("videoUrl"),
    suggestedRetail: formData.get("suggestedRetail"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  let suggestedRetailPaisa: number | null = null;
  if (parsed.data.suggestedRetail) {
    const paisa = parseNprToPaisa(parsed.data.suggestedRetail);
    if (paisa === null) {
      return {
        ok: false,
        error: "Suggested retail price is not a valid number.",
        fieldErrors: { suggestedRetail: "Enter a number like 1200." },
      };
    }
    suggestedRetailPaisa = paisa;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.categoryId ?? null,
      description: parsed.data.description ?? null,
      video_url: parsed.data.videoUrl ?? null,
      suggested_retail_paisa: suggestedRetailPaisa,
    })
    .eq("id", parsed.data.productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { ok: true, productId: parsed.data.productId };
}

// ---------------------------------------------------------------------------
// Archive / restore (status toggle)
// ---------------------------------------------------------------------------
const statusToggleSchema = z.object({
  productId: z.string().trim().uuid(),
  status: z.enum(["active", "archived"]),
});

export async function setProductStatus(
  _prev: ProductActionState | null,
  formData: FormData
): Promise<ProductActionState> {
  await requireRole(["admin"]);

  const parsed = statusToggleSchema.safeParse({
    productId: formData.get("productId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.productId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { ok: true, productId: parsed.data.productId };
}
