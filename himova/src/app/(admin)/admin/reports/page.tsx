import Link from "next/link";
import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { loadAdminReport, type AdminReport } from "@/lib/reports-admin";
import { formatNpr } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButtons, type CsvSection } from "@/components/shared/export-buttons";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRole(["admin"]);
  let report: AdminReport | null = null;
  try {
    report = await loadAdminReport();
  } catch {
    report = null;
  }
  return <View report={report} />;
}

function View({ report }: { report: AdminReport | null }) {
  const t = useTranslations("reports");
  const r = report ?? {
    revenueTodayPaisa: 0,
    revenueMonthPaisa: 0,
    revenueAllPaisa: 0,
    ordersThisMonth: 0,
    ordersByStatus: {},
    topProducts: [],
    topShopkeepers: [],
    outstanding: [],
    outstandingTotalPaisa: 0,
  };

  const kpis = [
    { label: t("revenueToday"), value: formatNpr(r.revenueTodayPaisa) },
    { label: t("revenueMonth"), value: formatNpr(r.revenueMonthPaisa) },
    { label: t("revenueAll"), value: formatNpr(r.revenueAllPaisa) },
    { label: t("ordersMonth"), value: String(r.ordersThisMonth) },
  ];

  const maxProductSets = Math.max(1, ...r.topProducts.map((p) => p.sets));
  const maxShopRev = Math.max(1, ...r.topShopkeepers.map((s) => s.revenuePaisa));

  const npr = (p: number) => (p / 100).toFixed(2);
  const exportSections: CsvSection[] = [
    {
      title: "Summary",
      headers: ["Metric", "Value (NPR)"],
      rows: [
        ["Revenue today", npr(r.revenueTodayPaisa)],
        ["Revenue this month", npr(r.revenueMonthPaisa)],
        ["Revenue all time", npr(r.revenueAllPaisa)],
        ["Orders this month", r.ordersThisMonth],
      ],
    },
    {
      title: "Top products",
      headers: ["Product", "Sets", "Revenue (NPR)"],
      rows: r.topProducts.map((p) => [p.name, p.sets, npr(p.revenuePaisa)]),
    },
    {
      title: "Top shopkeepers",
      headers: ["Shop", "Revenue (NPR)", "Orders"],
      rows: r.topShopkeepers.map((s) => [s.name, npr(s.revenuePaisa), s.orders]),
    },
    {
      title: "Outstanding payments",
      headers: ["Order", "Shop", "Status", "Total (NPR)"],
      rows: r.outstanding.map((o) => [o.id.slice(0, 8), o.shopName, o.status, npr(o.totalPaisa)]),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("adminTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminSubtitle")}</p>
        </div>
        <ExportButtons filename="himova-admin-report" sections={exportSections} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular">{k.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      {/* Orders by status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("ordersByStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(r.ordersByStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              Object.entries(r.ordersByStatus).map(([status, count]) => (
                <Badge key={status} variant="muted" className="text-sm">
                  {status}: {count}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              r.topProducts.map((p) => (
                <BarRow
                  key={p.name}
                  label={p.name}
                  valueText={`${p.sets} ${t("sets")} · ${formatNpr(p.revenuePaisa)}`}
                  ratio={p.sets / maxProductSets}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Top shopkeepers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("topShopkeepers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.topShopkeepers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              r.topShopkeepers.map((s) => (
                <BarRow
                  key={s.name}
                  label={s.name}
                  valueText={`${formatNpr(s.revenuePaisa)} · ${s.orders} ${t("orders")}`}
                  ratio={s.revenuePaisa / maxShopRev}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            {t("outstanding")}
            {r.outstandingTotalPaisa > 0 ? (
              <span className="text-sm font-normal text-muted-foreground">
                {t("outstandingTotal")}: {formatNpr(r.outstandingTotalPaisa)}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {r.outstanding.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("none")}</p>
          ) : (
            <div className="space-y-2">
              {r.outstanding.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-muted/40"
                >
                  <span>
                    <span className="font-medium">#{o.id.slice(0, 8)}</span>{" "}
                    <span className="text-muted-foreground">· {o.shopName}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="warning">{o.status}</Badge>
                    <span className="font-semibold tabular-nums">{formatNpr(o.totalPaisa)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BarRow({
  label,
  valueText,
  ratio,
}: {
  label: string;
  valueText: string;
  ratio: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="line-clamp-1 font-medium">{label}</span>
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">{valueText}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(4, Math.round(ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}
