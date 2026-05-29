import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/auth/phone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PendingActions } from "./pending-actions";

export const metadata = { title: "Shopkeepers" };
export const dynamic = "force-dynamic";

type Status = "pending" | "active" | "suspended";

type ShopkeeperRow = {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string | null;
  status: Status;
  self_registered: boolean;
  created_at: string;
};

async function loadShopkeepers(): Promise<ShopkeeperRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("shopkeepers")
    .select("id, shop_name, owner_name, phone, address, status, self_registered, created_at")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ShopkeeperRow[];
}

export default async function ShopkeepersPage({
  searchParams,
}: {
  searchParams?: { filter?: string };
}) {
  await requireRole(["admin"]);
  let rows: ShopkeeperRow[] = [];
  try {
    rows = await loadShopkeepers();
  } catch {
    rows = [];
  }
  const filter = (searchParams?.filter as Status | "all") ?? "all";
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  return <ShopkeepersView rows={shown} filter={filter} pendingCount={pendingCount} />;
}

function ShopkeepersView({
  rows,
  filter,
  pendingCount,
}: {
  rows: ShopkeeperRow[];
  filter: Status | "all";
  pendingCount: number;
}) {
  const t = useTranslations("shopkeepers");

  const tabs: { key: Status | "all"; label: string; href: string }[] = [
    { key: "all", label: t("filterAll"), href: "/admin/shopkeepers" },
    { key: "pending", label: t("filterPending"), href: "/admin/shopkeepers?filter=pending" },
    { key: "active", label: t("filterActive"), href: "/admin/shopkeepers?filter=active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/shopkeepers/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addNew")}
          </Link>
        </Button>
      </div>

      {pendingCount > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
          {t("pendingCount", { count: pendingCount })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (filter === tab.key
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-accent")
            }
          >
            {tab.label}
            {tab.key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{t("empty")}</CardTitle>
            <CardDescription>
              <Link href="/admin/shopkeepers/new" className="text-primary underline-offset-4 hover:underline">
                {t("addNew")}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("table.shopName")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.ownerName")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.phone")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.createdAt")}</th>
                  <th className="px-4 py-3 font-medium" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 align-middle">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/shopkeepers/${s.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {s.shop_name}
                      </Link>
                      {s.self_registered ? (
                        <span className="ml-2 align-middle text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t("selfRegistered")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{s.owner_name}</td>
                    <td className="px-4 py-3 tabular-nums">{formatPhoneForDisplay(s.phone)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3">
                      {s.status === "pending" ? (
                        <PendingActions shopkeeperId={s.id} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("shopkeepers.status");
  if (status === "active") return <Badge variant="success">{t("active")}</Badge>;
  if (status === "pending") return <Badge variant="warning">{t("pending")}</Badge>;
  return <Badge variant="muted">{t("suspended")}</Badge>;
}
