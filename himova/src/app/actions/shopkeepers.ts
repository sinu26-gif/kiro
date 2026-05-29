"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { normalisePhone, phoneToSyntheticEmail, toLocalDigits } from "@/lib/auth/phone";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type ShopkeeperActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"shopName" | "ownerName" | "phone" | "address" | "lat" | "lng", string>>;
};

const createShopkeeperSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is too short."),
  ownerName: z.string().trim().min(2, "Owner name is too short."),
  phone: z.string().trim().min(1, "Enter a phone number."),
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

  // 1. Auth user.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: phoneToSyntheticEmail(phone),
    password: localPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true, full_name: parsed.data.ownerName },
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
