import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ShopkeeperStatus = "pending" | "active" | "suspended";

export type ShopkeeperContext = {
  id: string;
  shopName: string;
  ownerName: string;
  status: ShopkeeperStatus;
  selfRegistered: boolean;
  hasDocument: boolean;
};

/**
 * Resolve the current authenticated user's shopkeeper context (id + status).
 * Returns null if not a shopkeeper.
 */
export async function getShopkeeperContext(): Promise<ShopkeeperContext | null> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("shopkeepers")
    .select("id, shop_name, owner_name, status, self_registered, document_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as string,
    shopName: data.shop_name as string,
    ownerName: data.owner_name as string,
    status: data.status as ShopkeeperStatus,
    selfRegistered: Boolean(data.self_registered),
    hasDocument: Boolean(data.document_path),
  };
}

/**
 * True when the current shopkeeper is verified (active) and may transact
 * (place orders, run POS sales).
 */
export async function isCurrentShopkeeperActive(): Promise<boolean> {
  const ctx = await getShopkeeperContext();
  return ctx?.status === "active";
}
