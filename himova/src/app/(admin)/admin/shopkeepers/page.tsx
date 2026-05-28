import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/auth/phone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Shopkeepers" };

type ShopkeeperRow = {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string | null;
  status: "active" | "suspended";
  created_at: string;
};

async function loadShopkeepers(): Promise<ShopkeeperRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("shopkeepers")
    .select("id, shop_name, owner_name, phone, address, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ShopkeeperRow[];
}

export default async function ShopkeepersPage() {
  await requireRole(["admin"]);
  let rows: ShopkeeperRow[] = [];
  try {
    rows = await loadShopkeepers();
  } catch {
    rows = [];
  }
  return <ShopkeepersView rows={rows} />;
}

function ShopkeepersView({ rows }: { rows: ShopkeeperRow[] }) {
  const t = useTranslations("shopkeepers");

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
                  <th className="px-4 py-3 font-medium">{t("table.address")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.createdAt")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{s.shop_name}</td>
                    <td className="px-4 py-3">{s.owner_name}</td>
                    <td className="px-4 py-3 tabular-nums">{formatPhoneForDisplay(s.phone)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.address ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.created_at)}</td>
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

function StatusBadge({ status }: { status: "active" | "suspended" }) {
  const t = useTranslations("shopkeepers.status");
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
        {t("active")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
      {t("suspended")}
    </span>
  );
}
