import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { requireRole } from "@/lib/auth/session";
import { loadLeaderboard, type LeaderboardSnapshot } from "@/lib/leaderboard";

export const metadata = { title: "Leaderboard" };

export default async function AdminLeaderboardPage() {
  await requireRole(["admin"]);
  let snapshot: LeaderboardSnapshot = {
    totalNpr: [],
    totalSets: [],
    recentActivity: [],
  };
  try {
    snapshot = await loadLeaderboard(100);
  } catch {
    /* show empty */
  }
  return <AdminLeaderboardView snapshot={snapshot} />;
}

function AdminLeaderboardView({ snapshot }: { snapshot: LeaderboardSnapshot }) {
  const t = useTranslations("leaderboard");
  const tc = useTranslations("comingSoon");
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
      <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {tc("leaderboardAdminBody")}
      </p>
    </div>
  );
}
