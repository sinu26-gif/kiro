import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { loadLeaderboard, type LeaderboardSnapshot } from "@/lib/leaderboard";

export const metadata = { title: "Leaderboard" };

export default async function PublicLeaderboardPage() {
  let snapshot: LeaderboardSnapshot = {
    totalNpr: [],
    totalSets: [],
    recentActivity: [],
  };
  try {
    snapshot = await loadLeaderboard(50);
  } catch {
    /* show empty leaderboard */
  }
  return <PublicLeaderboardView snapshot={snapshot} />;
}

function PublicLeaderboardView({ snapshot }: { snapshot: LeaderboardSnapshot }) {
  const t = useTranslations("leaderboard");
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <LeaderboardView snapshot={snapshot} />
      </div>
    </div>
  );
}
