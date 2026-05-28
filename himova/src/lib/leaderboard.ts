import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type LeaderboardScope = "totalNpr" | "totalSets" | "recentActivity";

export type LeaderboardEntry = {
  rank: number;
  shopkeeperId: string;
  shopName: string;
  /** Primary numeric value (paisa for totalNpr/recentActivity, count for totalSets/recentActivity orders). */
  primary: number;
  /** Optional secondary stat shown beside the primary value. */
  secondary?: number;
  /** Optional location text from the shopkeeper row (only present for totalNpr). */
  address?: string | null;
};

export type LeaderboardSnapshot = {
  totalNpr: LeaderboardEntry[];
  totalSets: LeaderboardEntry[];
  recentActivity: LeaderboardEntry[];
};

/**
 * Fetch all three leaderboard tabs in one round-trip.
 * Calls the public SECURITY DEFINER functions; safe to call as anon.
 */
export async function loadLeaderboard(limit: number = 50): Promise<LeaderboardSnapshot> {
  const supabase = getSupabaseServerClient();

  const [totalNpr, totalSets, recent] = await Promise.all([
    supabase.rpc("leaderboard_total_npr", { limit_count: limit }),
    supabase.rpc("leaderboard_total_sets", { limit_count: limit }),
    supabase.rpc("leaderboard_recent_activity", { limit_count: limit }),
  ]);

  type NprRow = {
    rank: number;
    shopkeeper_id: string;
    shop_name: string;
    address: string | null;
    total_paisa: number;
    total_orders: number;
  };
  type SetsRow = {
    rank: number;
    shopkeeper_id: string;
    shop_name: string;
    total_sets: number;
  };
  type RecentRow = {
    rank: number;
    shopkeeper_id: string;
    shop_name: string;
    recent_orders: number;
    recent_paisa: number;
  };

  const totalNprEntries: LeaderboardEntry[] = (
    (totalNpr.data ?? []) as NprRow[]
  ).map((r) => ({
    rank: Number(r.rank),
    shopkeeperId: r.shopkeeper_id,
    shopName: r.shop_name,
    address: r.address,
    primary: Number(r.total_paisa),
    secondary: Number(r.total_orders),
  }));

  const totalSetsEntries: LeaderboardEntry[] = (
    (totalSets.data ?? []) as SetsRow[]
  ).map((r) => ({
    rank: Number(r.rank),
    shopkeeperId: r.shopkeeper_id,
    shopName: r.shop_name,
    primary: Number(r.total_sets),
  }));

  const recentEntries: LeaderboardEntry[] = (
    (recent.data ?? []) as RecentRow[]
  ).map((r) => ({
    rank: Number(r.rank),
    shopkeeperId: r.shopkeeper_id,
    shopName: r.shop_name,
    primary: Number(r.recent_orders),
    secondary: Number(r.recent_paisa),
  }));

  return {
    totalNpr: totalNprEntries,
    totalSets: totalSetsEntries,
    recentActivity: recentEntries,
  };
}
