import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatNpr } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

type DashboardStats = {
  ordersToday: number;
  revenueThisMonthPaisa: number;
  lowStockCount: number;
};

async function loadStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServerClient();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [ordersTodayRes, revenueRes, lowStockRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("placed_at", startOfDay),
    supabase
      .from("orders")
      .select("total_paisa")
      .gte("placed_at", startOfMonth)
      .neq("status", "cancelled"),
    supabase
      .from("set_types")
      .select("id, warehouse_stock, reorder_threshold")
      .order("warehouse_stock", { ascending: true }),
  ]);

  const revenueThisMonthPaisa = (revenueRes.data ?? []).reduce(
    (sum, row) => sum + ((row.total_paisa as number | null) ?? 0),
    0
  );

  const lowStockCount = (lowStockRes.data ?? []).filter(
    (row) => (row.warehouse_stock as number) <= (row.reorder_threshold as number)
  ).length;

  return {
    ordersToday: ordersTodayRes.count ?? 0,
    revenueThisMonthPaisa,
    lowStockCount,
  };
}

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  // Stats may fail before the schema is applied; guard with try/catch so the
  // page still renders an empty dashboard for first-run admins.
  let stats: DashboardStats = {
    ordersToday: 0,
    revenueThisMonthPaisa: 0,
    lowStockCount: 0,
  };
  try {
    stats = await loadStats();
  } catch {
    // schema not applied yet; show zeros
  }

  return <AdminDashboardView stats={stats} />;
}

function AdminDashboardView({ stats }: { stats: DashboardStats }) {
  const t = useTranslations("adminHome");

  const cards = [
    { label: t("ordersToday"), value: String(stats.ordersToday) },
    { label: t("revenueThisMonth"), value: formatNpr(stats.revenueThisMonthPaisa) },
    { label: t("lowStockCount"), value: String(stats.lowStockCount) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-3xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
    </div>
  );
}
