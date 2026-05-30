"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { normalisePhone, phoneToSyntheticEmail, toLocalDigits } from "@/lib/auth/phone";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { notifyProfiles } from "@/lib/messaging/notify";

export type ShopkeeperActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"shopName" | "ownerName" | "phone" | "address" | "lat" | "lng", string>>;
};

const createShopkeeperSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is too short."),
  ownerName: z.string().trim().min(2, "Owner name is too short."),
  phone: z.string().trim().min(1, "Enter a phone number."),
  shopCategory: z.enum(["shoes", "clothing", "both"]).default("both"),
  address: z
    .string()
    .trim()
    .max(500, "Address is too long.")
    .optional()
    .transform((v) => (v?.length ? v : null)),
  lat: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((v) => v === null || (typeof v === "number" && !Number.isNaN(v)), "Invalid latitude."),
  lng: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((v) => v === null || (typeof v === "number" && !Number.isNaN(v)), "Invalid longitude."),
});

/**
 * Admin-only: create a brand new shopkeeper account.
 *
 * Flow:
 *   1. Create auth user via service role (synthetic email, password = phone, must_change_password=true)
 *   2. Insert profile row (role = 'shopkeeper')
 *   3. Insert shopkeepers row
 *   4. On any failure after step 1, delete the auth user to avoid orphans
 */
export async function createShopkeeper(
  _prev: ShopkeeperActionState | null,
  formData: FormData
): Promise<ShopkeeperActionState> {
  await requireRole(["admin"]);

  const parsed = createShopkeeperSchema.safeParse({
    shopName: formData.get("shopName"),
    ownerName: formData.get("ownerName"),
    phone: formData.get("phone"),
    shopCategory: formData.get("shopCategory") ?? "both",
    address: formData.get("address"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<ShopkeeperActionState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<ShopkeeperActionState["fieldErrors"]>;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const phone = normalisePhone(parsed.data.phone);
  if (!phone) {
    return {
      ok: false,
      error: "Invalid phone number.",
      fieldErrors: { phone: "Enter a 10-digit Nepali mobile number." },
    };
  }

  // The shopkeeper sees and types the plain 10-digit number. The synthetic
  // email is built from the E.164 form for stable uniqueness, but the initial
  // password matches what they read on screen (e.g. 9847465097).
  const localPassword = toLocalDigits(phone);

  const admin = getSupabaseAdminClient();

  // 1. Auth user — initial password matches the phone number. We do NOT
  // set must_change_password; changing the password is the shopkeeper's
  // choice (they can do it from /shop/welcome or settings later).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: phoneToSyntheticEmail(phone),
    password: localPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.ownerName },
  });

  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes("already registered")) {
      return {
        ok: false,
        error: "A shopkeeper with this phone already exists.",
        fieldErrors: { phone: "This phone is already taken." },
      };
    }
    return { ok: false, error: createErr?.message ?? "Could not create the auth user." };
  }

  const authId = created.user.id;

  // 2. Profile row.
  const { error: profileErr } = await admin.from("profiles").insert({
    id: authId,
    role: "shopkeeper",
    full_name: parsed.data.ownerName,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(authId);
    return { ok: false, error: `Failed to create profile: ${profileErr.message}` };
  }

  // 3. Shopkeeper row.
  const { error: shopErr } = await admin.from("shopkeepers").insert({
    profile_id: authId,
    shop_name: parsed.data.shopName,
    owner_name: parsed.data.ownerName,
    phone,
    shop_category: parsed.data.shopCategory,
    address: parsed.data.address,
    location_lat: parsed.data.lat,
    location_lng: parsed.data.lng,
  });

  if (shopErr) {
    await admin.from("profiles").delete().eq("id", authId);
    await admin.auth.admin.deleteUser(authId);
    return { ok: false, error: `Failed to create shopkeeper: ${shopErr.message}` };
  }

  revalidatePath("/admin/shopkeepers");
  redirect("/admin/shopkeepers");
}

const updateStatusSchema = z.object({
  shopkeeperId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});

export async function updateShopkeeperStatus(
  _prev: ShopkeeperActionState | null,
  formData: FormData
): Promise<ShopkeeperActionState> {
  await requireRole(["admin"]);

  const parsed = updateStatusSchema.safeParse({
    shopkeeperId: formData.get("shopkeeperId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("shopkeepers")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.shopkeeperId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/shopkeepers");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Verify a pending (self-registered) shopkeeper -> active + notify them.
// ---------------------------------------------------------------------------
const verifySchema = z.object({ shopkeeperId: z.string().uuid() });

export async function verifyShopkeeper(
  _prev: ShopkeeperActionState | null,
  formData: FormData
): Promise<ShopkeeperActionState> {
  await requireRole(["admin"]);
  const parsed = verifySchema.safeParse({ shopkeeperId: formData.get("shopkeeperId") });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const admin = getSupabaseAdminClient();
  const { data: shop } = await admin
    .from("shopkeepers")
    .select("profile_id, shop_name")
    .eq("id", parsed.data.shopkeeperId)
    .maybeSingle();

  const { error } = await admin
    .from("shopkeepers")
    .update({ status: "active" })
    .eq("id", parsed.data.shopkeeperId);
  if (error) return { ok: false, error: error.message };

  // Notify the shopkeeper they're verified.
  try {
    if (shop?.profile_id) {
      await notifyProfiles({
        recipientProfileIds: [shop.profile_id as string],
        category: "system",
        title: "✅ Your shop is verified",
        body: "You can now place orders and use the POS. Welcome to Himova!",
        link: "/shop",
      });
    }
  } catch {
    /* ignore */
  }

  revalidatePath("/admin/shopkeepers");
  revalidatePath(`/admin/shopkeepers/${parsed.data.shopkeeperId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete a shopkeeper entirely (reject registration or remove an account).
// Cleans up: document, shopkeeper row (cascades pricing/cart/etc), profile,
// and the auth user.
// ---------------------------------------------------------------------------
const deleteSchema = z.object({ shopkeeperId: z.string().uuid() });

export async function deleteShopkeeper(
  _prev: ShopkeeperActionState | null,
  formData: FormData
): Promise<ShopkeeperActionState> {
  await requireRole(["admin"]);
  const parsed = deleteSchema.safeParse({ shopkeeperId: formData.get("shopkeeperId") });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const admin = getSupabaseAdminClient();
  const { data: shop } = await admin
    .from("shopkeepers")
    .select("profile_id, document_path")
    .eq("id", parsed.data.shopkeeperId)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Shopkeeper not found." };

  // Remove the verification document if present.
  if (shop.document_path) {
    await admin.storage.from("shopkeeper-docs").remove([shop.document_path as string]);
  }

  // Deleting the auth user cascades to profiles (FK on delete cascade) and
  // then to shopkeepers (FK on delete cascade), taking orders/cart/etc with it.
  if (shop.profile_id) {
    const { error } = await admin.auth.admin.deleteUser(shop.profile_id as string);
    if (error) {
      // Fall back to deleting the shopkeeper row directly.
      await admin.from("shopkeepers").delete().eq("id", parsed.data.shopkeeperId);
    }
  } else {
    await admin.from("shopkeepers").delete().eq("id", parsed.data.shopkeeperId);
  }

  revalidatePath("/admin/shopkeepers");
  return { ok: true };
}

/**
 * Generate a short-lived signed URL to view a shopkeeper's verification
 * document. Admin only.
 */
export async function getDocumentUrl(shopkeeperId: string): Promise<string | null> {
  await requireRole(["admin"]);
  const admin = getSupabaseAdminClient();
  const { data: shop } = await admin
    .from("shopkeepers")
    .select("document_path")
    .eq("id", shopkeeperId)
    .maybeSingle();
  if (!shop?.document_path) return null;

  const { data } = await admin.storage
    .from("shopkeeper-docs")
    .createSignedUrl(shop.document_path as string, 60 * 10);
  return data?.signedUrl ?? null;
}
