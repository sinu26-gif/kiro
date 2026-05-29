"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { adjustWarehouseStock } from "@/lib/stock";

export type StockActionState = {
  ok: boolean;
  error?: string;
};

const restockSchema = z.object({
  setTypeId: z.string().trim().uuid(),
  // Signed integer: positive to add stock, negative to remove.
  delta: z.coerce.number().int().refine((n) => n !== 0, "Enter a non-zero amount."),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v?.length ? v : null)),
});

/**
 * Admin manual warehouse adjustment. Positive delta = restock,
 * negative = remove/correct. Logged to stock_movements.
 */
export async function restockSetType(
  _prev: StockActionState | null,
  formData: FormData
): Promise<StockActionState> {
  const actor = await requireRole(["admin"]);

  const parsed = restockSchema.safeParse({
    setTypeId: formData.get("setTypeId"),
    delta: formData.get("delta"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const res = await adjustWarehouseStock(
    parsed.data.setTypeId,
    parsed.data.delta,
    actor.id,
    parsed.data.note
  );
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin/stock");
  return { ok: true };
}
