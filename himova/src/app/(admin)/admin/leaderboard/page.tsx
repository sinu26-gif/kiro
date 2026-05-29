import { Gift, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { requireRole } from "@/lib/auth/session";
import { loadLeaderboard, type LeaderboardSnapshot } from "@/lib/leaderboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { RewardForm, type RewardCandidate } from "./reward-form";

export const metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

type RecentReward = {
  id: string;
  cycleLabel: string;
  rank: number;
  rewardType: string;
  rewardValue: string;
  shopName: string;
  createdAt: string;
};

async function loadRecentRewards(): Promise<RecentReward[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("rewards")
    .select(
      "id, cycle_label, rank, reward_type, reward_value, created_at, shopkeeper:shopkeepers(shop_name)"
    )
    .order("created_at", { ascending: false })
    .limit(12);
  return (
    (data as unknown as Array<{
      id: string;
      cycle_label: string;
      rank: number;
      reward_type: string;
      reward_value: string;
      created_at: string;
      shopkeeper: { shop_name: string } | null;
    }>) ?? []
  ).map((r) => ({
    id: r.id,
    cycleLabel: r.cycle_label,
    rank: r.rank,
    rewardType: r.reward_type,
    rewardValue: r.reward_value,
    shopName: r.shopkeeper?.shop_name ?? "—",
    createdAt: r.created_at,
  }));
}

export default async function AdminLeaderboardPage() {
  await requireRole(["admin"]);
  let snapshot: LeaderboardSnapshot = { totalNpr: [], totalSets: [], recentActivity: [] };
  let recent: RecentReward[] = [];
  try {
    [snapshot, recent] = await Promise.all([loadLeaderboard(100), loadRecentRewards()]);
  } catch {
    /* empty */
  }

  const candidates: RewardCandidate[] = snapshot.totalNpr
    .slice(0, 10)
    .map((e) => ({ id: e.shopkeeperId, name: e.shopName }));

  return <AdminLeaderboardView snapshot={snapshot} candidates={candidates} recent={recent} />;
}

function AdminLeaderboardView({
  snapshot,
  candidates,
  recent,
}: {
  snapshot: LeaderboardSnapshot;
  candidates: RewardCandidate[];
  recent: RecentReward[];
}) {
  const t = useTranslations("leaderboard");
  const tr = useTranslations("rewards");

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

      <LeaderboardView snapshot={snapshot} />

      {/* Reward cycle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" aria-hidden />
            {tr("title")}
          </CardTitle>
          <CardDescription>{tr("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <RewardForm candidates={candidates} />
          )}
        </CardContent>
      </Card>

      {/* Recent rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("recentTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr("recentEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{r.cycleLabel}</Badge>
                    <span className="font-medium">
                      #{r.rank} {r.shopName}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="success">{r.rewardValue}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
