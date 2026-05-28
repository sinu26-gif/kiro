import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatNpr } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

type DashboardStats = {
  ordersToday: number;
  revenueThisMonthPaisa: number;
  lowStockCount: number;
  shopkeepersCount: number;
};

async function loadStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServerClient();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [ordersTodayRes, revenueRes, lowStockRes, shopkeepersRes] = await Promise.all([
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
    supabase
      .from("shopkeepers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
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
    shopkeepersCount: shopkeepersRes.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const user = await requireRole(["admin"]);
  let stats: DashboardStats = {
    ordersToday: 0,
    revenueThisMonthPaisa: 0,
    lowStockCount: 0,
    shopkeepersCount: 0,
  };
  try {
    stats = await loadStats();
  } catch {
    // schema not applied yet; show zeros
  }
  return <AdminDashboardView stats={stats} fullName={user.fullName} />;
}

function AdminDashboardView({
  stats,
  fullName,
}: {
  stats: DashboardStats;
  fullName: string | null;
}) {
  const t = useTranslations("adminHome");
  const tNav = useTranslations("adminNav");

  const cards = [
    {
      label: t("ordersToday"),
      value: String(stats.ordersToday),
      icon: ClipboardList,
      tone: "text-emerald-600 bg-emerald-500/10",
      href: "/admin/orders",
    },
    {
      label: t("revenueThisMonth"),
      value: formatNpr(stats.revenueThisMonthPaisa),
      icon: Wallet,
      tone: "text-sky-600 bg-sky-500/10",
      href: "/admin/reports",
    },
    {
      label: t("lowStockCount"),
      value: String(stats.lowStockCount),
      icon: Package,
      tone: "text-amber-600 bg-amber-500/10",
      href: "/admin/stock",
    },
    {
      label: t("shopkeepersCount"),
      value: String(stats.shopkeepersCount),
      icon: Users,
      tone: "text-violet-600 bg-violet-500/10",
      href: "/admin/shopkeepers",
    },
  ];

  const quickActions = [
    { label: tNav("products"), href: "/admin/products", icon: Boxes },
    { label: tNav("shopkeepers"), href: "/admin/shopkeepers", icon: Users },
    { label: tNav("orders"), href: "/admin/orders", icon: ClipboardList },
    { label: tNav("leaderboard"), href: "/admin/leaderboard", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">
          {fullName ? t("greetingNamed", { name: fullName }) : t("greeting")}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="group focus-visible:outline-none"
            >
              <Card className="hover:shadow-lift hover:-translate-y-0.5 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                  <CardDescription className="pt-2">{c.label}</CardDescription>
                  <CardTitle className="text-3xl tabular">{c.value}</CardTitle>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("quickActionsTitle")}</CardTitle>
          <CardDescription>{t("quickActionsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Button
                  key={a.label}
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-auto justify-start py-4"
                >
                  <Link href={a.href} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex flex-1 items-center justify-between">
                      <span>{a.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                    </span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footnote */}
      <p className="text-xs text-muted-foreground">{t("emptyState")}</p>
    </div>
  );
}
