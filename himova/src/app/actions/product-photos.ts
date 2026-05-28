"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import {
  ACCEPTED_PHOTO_MIME_TYPES,
  MAX_PHOTO_BYTES,
  PRODUCT_PHOTOS_BUCKET,
  buildProductPhotoKey,
  publicProductPhotoUrl,
} from "@/lib/storage";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

export type PhotoActionState = {
  ok: boolean;
  error?: string;
  uploaded?: number;
};

const productIdSchema = z.string().trim().uuid();

/**
 * Upload one or more photos for a product.
 * Form fields: productId (uuid), files (one or more File entries named 'files').
 *
 * Uses the service-role client for storage writes so the upload can't be
 * blocked by edge-case auth refresh issues, but still gates by requireRole.
 */
export async function uploadProductPhotos(
  _prev: PhotoActionState | null,
  formData: FormData
): Promise<PhotoActionState> {
  await requireRole(["admin"]);

  const productId = formData.get("productId");
  const idCheck = productIdSchema.safeParse(productId);
  if (!idCheck.success) {
    return { ok: false, error: "Bad product id." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { ok: false, error: "Pick at least one image to upload." };
  }

  const admin = getSupabaseAdminClient();

  // Discover the next sort_order so new photos append to the gallery.
  const { data: existing } = await admin
    .from("product_photos")
    .select("sort_order")
    .eq("product_id", idCheck.data)
    .order("sort_order", { ascending: false })
    .limit(1);
  let nextOrder = ((existing ?? [])[0]?.sort_order ?? -1) + 1;

  let uploaded = 0;
  const errors: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_PHOTO_BYTES) {
      errors.push(`${file.name}: too large (max 5MB).`);
      continue;
    }
    if (!(ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      errors.push(`${file.name}: unsupported type (${file.type || "unknown"}).`);
      continue;
    }

    const key = buildProductPhotoKey(idCheck.data, file.name);
    const arrayBuf = await file.arrayBuffer();
    const blob = new Blob([arrayBuf], { type: file.type });

    const { error: uploadErr } = await admin.storage
      .from(PRODUCT_PHOTOS_BUCKET)
      .upload(key, blob, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadErr) {
      errors.push(`${file.name}: ${uploadErr.message}`);
      continue;
    }

    const { error: dbErr } = await admin.from("product_photos").insert({
      product_id: idCheck.data,
      url: publicProductPhotoUrl(key),
      sort_order: nextOrder,
    });

    if (dbErr) {
      // Roll back the storage object so we don't leak.
      await admin.storage.from(PRODUCT_PHOTOS_BUCKET).remove([key]);
      errors.push(`${file.name}: ${dbErr.message}`);
      continue;
    }

    nextOrder += 1;
    uploaded += 1;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${idCheck.data}`);

  if (uploaded === 0) {
    return { ok: false, error: errors.join(" · ") || "No photos were uploaded.", uploaded: 0 };
  }
  if (errors.length > 0) {
    return {
      ok: true,
      uploaded,
      error: `Some photos failed: ${errors.join(" · ")}`,
    };
  }
  return { ok: true, uploaded };
}

const deletePhotoSchema = z.object({
  photoId: z.string().trim().uuid(),
  productId: z.string().trim().uuid(),
});

export async function deleteProductPhoto(
  _prev: PhotoActionState | null,
  formData: FormData
): Promise<PhotoActionState> {
  await requireRole(["admin"]);

  const parsed = deletePhotoSchema.safeParse({
    photoId: formData.get("photoId"),
    productId: formData.get("productId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Bad request." };
  }

  const admin = getSupabaseAdminClient();

  // Look up the row first so we can derive the storage object key.
  const { data: row } = await admin
    .from("product_photos")
    .select("url")
    .eq("id", parsed.data.photoId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Photo not found." };

  // Extract the key from the public URL (everything after the bucket name).
  const marker = `/object/public/${PRODUCT_PHOTOS_BUCKET}/`;
  const idx = row.url.indexOf(marker);
  const key = idx >= 0 ? row.url.slice(idx + marker.length) : null;

  // Delete the DB row first (RLS guards admin), then best-effort the storage object.
  const { error: dbErr } = await admin
    .from("product_photos")
    .delete()
    .eq("id", parsed.data.photoId);

  if (dbErr) return { ok: false, error: dbErr.message };

  if (key) {
    await admin.storage.from(PRODUCT_PHOTOS_BUCKET).remove([key]);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { ok: true };
}

const reorderSchema = z.object({
  productId: z.string().trim().uuid(),
  // Comma-separated photo ids in the desired display order.
  photoIds: z.string().trim().min(1),
});

export async function reorderProductPhotos(
  _prev: PhotoActionState | null,
  formData: FormData
): Promise<PhotoActionState> {
  await requireRole(["admin"]);

  const parsed = reorderSchema.safeParse({
    productId: formData.get("productId"),
    photoIds: formData.get("photoIds"),
  });
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const ids = parsed.data.photoIds.split(",").map((s) => s.trim()).filter(Boolean);
  const supabase = getSupabaseServerClient();

  // Update each row's sort_order to its index in the array.
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("product_photos")
      .update({ sort_order: i })
      .eq("id", ids[i])
      .eq("product_id", parsed.data.productId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { ok: true };
}
