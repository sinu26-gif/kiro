"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Crown, Medal, Award } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNpr } from "@/lib/format";
import type { LeaderboardEntry, LeaderboardSnapshot } from "@/lib/leaderboard";

/**
 * Reusable leaderboard view used by /leaderboard, /shop/leaderboard, /admin/leaderboard.
 * Three tabs: Total NPR, Total Sets, Recent Activity (last 30 days).
 */
export function LeaderboardView({
  snapshot,
  highlightShopkeeperId,
}: {
  snapshot: LeaderboardSnapshot;
  highlightShopkeeperId?: string | null;
}) {
  const t = useTranslations("leaderboard");
  const [tab, setTab] = useState<"totalNpr" | "totalSets" | "recentActivity">(
    "totalNpr"
  );

  const tabsConfig = [
    { value: "totalNpr" as const, label: t("tabTotalNpr"), entries: snapshot.totalNpr },
    { value: "totalSets" as const, label: t("tabTotalSets"), entries: snapshot.totalSets },
    {
      value: "recentActivity" as const,
      label: t("tabRecent"),
      entries: snapshot.recentActivity,
    },
  ];

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
        {tabsConfig.map((c) => (
          <TabsTrigger key={c.value} value={c.value}>
            {c.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabsConfig.map((c) => (
        <TabsContent key={c.value} value={c.value} className="mt-4">
          <LeaderboardTable
            entries={c.entries}
            scope={c.value}
            highlightShopkeeperId={highlightShopkeeperId ?? null}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function LeaderboardTable({
  entries,
  scope,
  highlightShopkeeperId,
}: {
  entries: LeaderboardEntry[];
  scope: "totalNpr" | "totalSets" | "recentActivity";
  highlightShopkeeperId: string | null;
}) {
  const t = useTranslations("leaderboard");

  if (entries.length === 0) {
    return (
      <Card className="border-dashed bg-card/60 p-10 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{t("empty")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("emptyHint")}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-16 font-medium">{t("table.rank")}</th>
              <th className="px-4 py-3 font-medium">{t("table.shop")}</th>
              <th className="px-4 py-3 text-right font-medium">{primaryHeader(scope, t)}</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                {secondaryHeader(scope, t)}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isYou = entry.shopkeeperId === highlightShopkeeperId;
              return (
                <tr
                  key={entry.shopkeeperId}
                  className={
                    "border-b last:border-0 transition-colors " +
                    (isYou
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-muted/30")
                  }
                >
                  <td className="px-4 py-3 align-middle">
                    <RankCell rank={entry.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {entry.shopName}
                      {isYou ? (
                        <Badge variant="secondary" className="ml-2 align-middle">
                          {t("you")}
                        </Badge>
                      ) : null}
                    </div>
                    {entry.address ? (
                      <div className="text-xs text-muted-foreground">{entry.address}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {primaryValue(scope, entry)}
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {secondaryValue(scope, entry)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
        <Crown className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        <Medal className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
        <Award className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground tabular-nums">
      {rank}
    </span>
  );
}

function primaryHeader(scope: "totalNpr" | "totalSets" | "recentActivity", t: ReturnType<typeof useTranslations>) {
  if (scope === "totalNpr") return t("table.totalNpr");
  if (scope === "totalSets") return t("table.totalSets");
  return t("table.recentOrders");
}

function secondaryHeader(scope: "totalNpr" | "totalSets" | "recentActivity", t: ReturnType<typeof useTranslations>) {
  if (scope === "totalNpr") return t("table.orders");
  if (scope === "totalSets") return "";
  return t("table.recentNpr");
}

function primaryValue(scope: "totalNpr" | "totalSets" | "recentActivity", entry: LeaderboardEntry) {
  if (scope === "totalNpr") return formatNpr(entry.primary);
  if (scope === "totalSets") return entry.primary.toLocaleString();
  return entry.primary.toLocaleString();
}

function secondaryValue(
  scope: "totalNpr" | "totalSets" | "recentActivity",
  entry: LeaderboardEntry
) {
  if (scope === "totalNpr") return entry.secondary?.toLocaleString() ?? "—";
  if (scope === "totalSets") return "";
  return entry.secondary !== undefined ? formatNpr(entry.secondary) : "—";
}
