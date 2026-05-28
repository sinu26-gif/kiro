import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { requireRole } from "@/lib/auth/session";
import { loadLeaderboard, type LeaderboardSnapshot } from "@/lib/leaderboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Leaderboard" };

async function loadCurrentShopkeeperId(): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data } = await supabase
    .from("shopkeepers")
    .select("id")
    .eq("profile_id", userRes.user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export default async function ShopLeaderboardPage() {
  await requireRole(["shopkeeper"]);
  let snapshot: LeaderboardSnapshot = {
    totalNpr: [],
    totalSets: [],
    recentActivity: [],
  };
  let highlightId: string | null = null;
  try {
    [snapshot, highlightId] = await Promise.all([
      loadLeaderboard(50),
      loadCurrentShopkeeperId(),
    ]);
  } catch {
    /* show empty */
  }
  return <ShopLeaderboardView snapshot={snapshot} highlightId={highlightId} />;
}

function ShopLeaderboardView({
  snapshot,
  highlightId,
}: {
  snapshot: LeaderboardSnapshot;
  highlightId: string | null;
}) {
  const t = useTranslations("leaderboard");
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <LeaderboardView snapshot={snapshot} highlightShopkeeperId={highlightId} />
    </div>
  );
}
