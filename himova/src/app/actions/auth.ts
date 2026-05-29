"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { normalisePhone, phoneToSyntheticEmail } from "@/lib/auth/phone";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  ok: boolean;
  error?: string;
};

// ---------------------------------------------------------------------------
// Shopkeeper login (phone + password)
// ---------------------------------------------------------------------------
const shopkeeperLoginSchema = z.object({
  phone: z.string().trim().min(1, "Enter your phone number."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAsShopkeeper(
  _prev: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = shopkeeperLoginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const phone = normalisePhone(parsed.data.phone);
  if (!phone) {
    return { ok: false, error: "Please enter a valid 10-digit Nepali mobile number." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToSyntheticEmail(phone),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Wrong phone or password. Please try again." };
  }

  // Confirm role is shopkeeper. Refuse if it isn't.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== "shopkeeper") {
    await supabase.auth.signOut();
    return { ok: false, error: "This account is not a shopkeeper account." };
  }

  revalidatePath("/", "layout");
  redirect("/shop");
}

// ---------------------------------------------------------------------------
// Admin login (email + password)
// ---------------------------------------------------------------------------
const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAsAdmin(
  _prev: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Wrong email or password. Please try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, error: "This account is not an admin account." };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export async function logout(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------------------------------------------------------------------------
// Change password (used by the welcome screen and from settings)
// ---------------------------------------------------------------------------
const changePasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = getSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
    data: { must_change_password: false },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
