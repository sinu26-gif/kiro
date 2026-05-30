"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { notifyProfiles } from "@/lib/messaging/notify";

export type RewardActionState = { ok: boolean; error?: string };

const winnerSchema = z.object({
  shopkeeperId: z.string().uuid(),
  rank: z.coerce.number().int().min(1),
  rewardType: z.enum(["discount_percent", "free_set", "custom_item"]),
  rewardValue: z.string().trim().min(1).max(200),
});

/**
 * Create a reward cycle: store one reward row per winner and broadcast an
 * in-app notification to every active shopkeeper announcing the winners.
 *
 * The form sends winners as a JSON string in the 'winners' field plus a
 * 'cycleLabel' (e.g. "May 2026").
 */
export async function createRewardCycle(
  _prev: RewardActionState | null,
  formData: FormData
): Promise<RewardActionState> {
  const actor = await requireRole(["admin"]);

  const cycleLabel = String(formData.get("cycleLabel") ?? "").trim();
  if (!cycleLabel) return { ok: false, error: "Enter a cycle label (e.g. May 2026)." };

  let parsedWinners: unknown;
  try {
    parsedWinners = JSON.parse(String(formData.get("winners") ?? "[]"));
  } catch {
    return { ok: false, error: "Malformed winners data." };
  }

  const winners = z.array(winnerSchema).min(1, "Pick at least one winner.").safeParse(parsedWinners);
  if (!winners.success) {
    return { ok: false, error: winners.error.issues[0]?.message ?? "Invalid winners." };
  }

  const admin = getSupabaseAdminClient();

  // Resolve shop names for the broadcast message.
  const ids = winners.data.map((w) => w.shopkeeperId);
  const { data: shops } = await admin
    .from("shopkeepers")
    .select("id, shop_name")
    .in("id", ids);
  const nameById = new Map((shops ?? []).map((s) => [s.id as string, s.shop_name as string]));

  // Insert reward rows (idempotent per cycle+shopkeeper via unique constraint).
  const rewardRows = winners.data.map((w) => ({
    cycle_label: cycleLabel,
    shopkeeper_id: w.shopkeeperId,
    rank: w.rank,
    reward_type: w.rewardType,
    reward_value: w.rewardValue,
    created_by: actor.id,
  }));

  const { error: insErr } = await admin
    .from("rewards")
    .upsert(rewardRows, { onConflict: "cycle_label,shopkeeper_id" });
  if (insErr) return { ok: false, error: insErr.message };

  // Broadcast to all active shopkeepers.
  try {
    const { data: allShops } = await admin
      .from("shopkeepers")
      .select("profile_id")
      .eq("status", "active");

    const winnerLine = winners.data
      .sort((a, b) => a.rank - b.rank)
      .map((w) => `${w.rank}. ${nameById.get(w.shopkeeperId) ?? "—"}`)
      .join("  ·  ");

    const rows = (allShops ?? [])
      .filter((s) => s.profile_id)
      .map((s) => s.profile_id as string);
    if (rows.length > 0) {
      await notifyProfiles({
        recipientProfileIds: rows,
        category: "reward",
        title: `🏆 ${cycleLabel} rewards announced`,
        body: `Congratulations to our winners! ${winnerLine}`,
        link: "/shop/leaderboard",
      });
    }

    await admin.from("app_events").insert({
      event_type: "reward_cycle_created",
      actor_profile_id: actor.id,
      payload: { cycle_label: cycleLabel, winners: winners.data.length },
    });
  } catch {
    // Broadcast failure must not undo the reward records.
  }

  revalidatePath("/admin/leaderboard");
  revalidatePath("/shop/leaderboard");
  return { ok: true };
}
