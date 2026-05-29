import Link from "next/link";
import { useTranslations } from "next-intl";
import { PackageX } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadWarehouseStock, type WarehouseRow } from "@/lib/warehouse";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { RestockControl } from "./restock-control";

export const metadata = { title: "Warehouse stock" };

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams?: { filter?: string };
}) {
  await requireRole(["admin"]);
  let rows: WarehouseRow[] = [];
  try {
    rows = await loadWarehouseStock();
  } catch {
    rows = [];
  }
  const lowOnly = searchParams?.filter === "low";
  const shown = lowOnly ? rows.filter((r) => r.isLow) : rows;
  return <View rows={shown} lowOnly={lowOnly} lowCount={rows.filter((r) => r.isLow).length} />;
}

function View({
  rows,
  lowOnly,
  lowCount,
}: {
  rows: WarehouseRow[];
  lowOnly: boolean;
  lowCount: number;
}) {
  const t = useTranslations("warehouseStock");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/stock"
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (!lowOnly ? "border-primary bg-primary/10" : "text-muted-foreground hover:bg-accent")
            }
          >
            {t("all")}
          </Link>
          <Link
            href="/admin/stock?filter=low"
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (lowOnly ? "border-primary bg-primary/10" : "text-muted-foreground hover:bg-accent")
            }
          >
            {t("lowOnly")} {lowCount > 0 ? `(${lowCount})` : ""}
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <PackageX className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("empty")}</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("product")}</th>
                  <th className="px-4 py-3 font-medium">{t("variant")}</th>
                  <th className="px-4 py-3 font-medium">{t("set")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("stock")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reorderAt")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("adjust")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.setTypeId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/products/${r.productId}`} className="hover:underline">
                        {r.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.variantName}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.sizes.join(", ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.warehouseStock}
                      {r.isLow ? (
                        <Badge variant="warning" className="ml-1.5 px-1.5 py-0 text-[10px]">
                          {t("low")}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {r.reorderThreshold}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <RestockControl setTypeId={r.setTypeId} />
                      </div>
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
