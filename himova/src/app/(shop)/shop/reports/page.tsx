import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { loadShopReport, type ShopReport } from "@/lib/reports-shop";
import { formatNpr } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/auth/phone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButtons, type CsvSection } from "@/components/shared/export-buttons";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ShopReportsPage() {
  await requireRole(["shopkeeper"]);
  let report: ShopReport | null = null;
  try {
    report = await loadShopReport();
  } catch {
    report = null;
  }
  return <View report={report} />;
}

function View({ report }: { report: ShopReport | null }) {
  const t = useTranslations("reports");
  const r = report ?? {
    salesTodayPaisa: 0,
    salesMonthPaisa: 0,
    salesAllPaisa: 0,
    piecesMonth: 0,
    saleCountMonth: 0,
    stockValuePaisa: 0,
    bestProducts: [],
    topCustomers: [],
  };

  const kpis = [
    { label: t("salesToday"), value: formatNpr(r.salesTodayPaisa) },
    { label: t("salesMonth"), value: formatNpr(r.salesMonthPaisa) },
    { label: t("saleCount"), value: String(r.saleCountMonth) },
    { label: t("piecesMonth"), value: String(r.piecesMonth) },
    { label: t("salesAll"), value: formatNpr(r.salesAllPaisa) },
    { label: t("stockValue"), value: formatNpr(r.stockValuePaisa) },
  ];

  const maxPieces = Math.max(1, ...r.bestProducts.map((p) => p.pieces));

  const npr = (p: number) => (p / 100).toFixed(2);
  const exportSections: CsvSection[] = [
    {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Sales today (NPR)", npr(r.salesTodayPaisa)],
        ["Sales this month (NPR)", npr(r.salesMonthPaisa)],
        ["Sales all time (NPR)", npr(r.salesAllPaisa)],
        ["Sales count (month)", r.saleCountMonth],
        ["Pieces sold (month)", r.piecesMonth],
        ["Stock value (NPR)", npr(r.stockValuePaisa)],
      ],
    },
    {
      title: "Bestsellers (month)",
      headers: ["Product", "Pieces", "Revenue (NPR)"],
      rows: r.bestProducts.map((p) => [p.name, p.pieces, npr(p.revenuePaisa)]),
    },
    {
      title: "Top customers (month)",
      headers: ["Customer", "Phone", "Spent (NPR)", "Visits"],
      rows: r.topCustomers.map((c) => [
        c.name,
        c.phone ? formatPhoneForDisplay(c.phone) : "",
        npr(c.spentPaisa),
        c.visits,
      ]),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("shopTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("shopSubtitle")}</p>
        </div>
        <ExportButtons filename="himova-shop-report" sections={exportSections} />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{k.label}</CardDescription>
              <CardTitle className="text-xl tabular">{k.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bestsellers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("bestProducts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.bestProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              r.bestProducts.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {p.pieces} {t("pieces")} · {formatNpr(p.revenuePaisa)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, Math.round((p.pieces / maxPieces) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top customers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("topCustomers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              r.topCustomers.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{c.name}</span>
                    {c.phone ? (
                      <span className="block text-xs text-muted-foreground">
                        {formatPhoneForDisplay(c.phone)}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">
                      {formatNpr(c.spentPaisa)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {c.visits} {t("visits")}
                    </span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
