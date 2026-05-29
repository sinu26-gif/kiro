"use server";

import { z } from "zod";

import { normalisePhone, phoneToSyntheticEmail, toLocalDigits } from "@/lib/auth/phone";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type RegisterState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"shopName" | "ownerName" | "phone" | "password" | "document", string>>;
};

const DOCS_BUCKET = "shopkeeper-docs";
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const schema = z.object({
  shopName: z.string().trim().min(2, "Shop name is too short.").max(120),
  ownerName: z.string().trim().min(2, "Owner name is too short.").max(120),
  phone: z.string().trim().min(1, "Enter your phone number."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v?.length ? v : null)),
});

/**
 * Public self-registration for shopkeepers.
 *
 * Creates a PENDING shopkeeper account (auth user + profile + shopkeeper row)
 * and stores the uploaded verification document privately. The shopkeeper can
 * log in and browse immediately, but cannot order until an admin verifies them.
 *
 * Runs with the service-role client (server-only) so an unauthenticated
 * visitor can provision their own pending account.
 */
export async function registerShopkeeper(
  _prev: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    shopName: formData.get("shopName"),
    ownerName: formData.get("ownerName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    address: formData.get("address"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<RegisterState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<RegisterState["fieldErrors"]>;
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

  // Document is required for verification.
  const document = formData.get("document");
  if (!(document instanceof File) || document.size === 0) {
    return {
      ok: false,
      error: "Please upload a document for verification.",
      fieldErrors: { document: "A photo of your ID, PAN, or shop licence is required." },
    };
  }
  if (document.size > MAX_DOC_BYTES) {
    return { ok: false, error: "Document too large (max 5MB).", fieldErrors: { document: "Max 5MB." } };
  }
  if (!ACCEPTED_DOC_TYPES.includes(document.type)) {
    return {
      ok: false,
      error: "Unsupported document type.",
      fieldErrors: { document: "Use JPG, PNG, WEBP, or PDF." },
    };
  }

  const admin = getSupabaseAdminClient();

  // 1. Create the auth user with the chosen password.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: phoneToSyntheticEmail(phone),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.ownerName, self_registered: true },
  });

  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes("already")) {
      return {
        ok: false,
        error: "An account with this phone already exists. Try logging in.",
        fieldErrors: { phone: "This phone is already registered." },
      };
    }
    return { ok: false, error: createErr?.message ?? "Could not create your account." };
  }
  const authId = created.user.id;

  // 2. Upload the verification document privately.
  const ext = document.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const docPath = `${authId}/${Date.now()}.${ext}`;
  const buf = await document.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from(DOCS_BUCKET)
    .upload(docPath, new Blob([buf], { type: document.type }), {
      contentType: document.type,
      upsert: false,
    });
  if (upErr) {
    await admin.auth.admin.deleteUser(authId);
    return { ok: false, error: `Could not upload document: ${upErr.message}` };
  }

  // 3. Profile row.
  const { error: profileErr } = await admin.from("profiles").insert({
    id: authId,
    role: "shopkeeper",
    full_name: parsed.data.ownerName,
  });
  if (profileErr) {
    await admin.storage.from(DOCS_BUCKET).remove([docPath]);
    await admin.auth.admin.deleteUser(authId);
    return { ok: false, error: `Failed to create profile: ${profileErr.message}` };
  }

  // 4. Shopkeeper row — PENDING, self-registered.
  const { error: shopErr } = await admin.from("shopkeepers").insert({
    profile_id: authId,
    shop_name: parsed.data.shopName,
    owner_name: parsed.data.ownerName,
    phone,
    address: parsed.data.address,
    status: "pending",
    self_registered: true,
    document_path: docPath,
    document_type: document.type,
  });
  if (shopErr) {
    await admin.storage.from(DOCS_BUCKET).remove([docPath]);
    await admin.from("profiles").delete().eq("id", authId);
    await admin.auth.admin.deleteUser(authId);
    return { ok: false, error: `Failed to register: ${shopErr.message}` };
  }

  // 5. Notify admins of the new pending registration.
  try {
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
    if (admins && admins.length > 0) {
      await admin.from("notifications").insert(
        admins.map((a) => ({
          recipient_profile_id: a.id as string,
          category: "system" as const,
          title: "New shopkeeper registration",
          body: `${parsed.data.shopName} (${toLocalDigits(phone)}) is awaiting verification.`,
          link: "/admin/shopkeepers?filter=pending",
        }))
      );
    }
  } catch {
    /* notification failure must not block registration */
  }

  return { ok: true };
}
