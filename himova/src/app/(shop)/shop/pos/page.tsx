import { useTranslations } from "next-intl";
import { Receipt as ReceiptIcon } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadPosProducts, loadTodayClose, type PosProduct, type DailyClose } from "@/lib/pos";
import { formatNpr } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

import { PosTerminal } from "./pos-terminal";

export const metadata = { title: "POS" };

export default async function PosPage() {
  await requireRole(["shopkeeper"]);
  let products: PosProduct[] = [];
  let today: DailyClose = {
    date: new Date().toISOString().slice(0, 10),
    totalSalesPaisa: 0,
    saleCount: 0,
    piecesSold: 0,
    byMethodPaisa: {},
  };
  try {
    [products, today] = await Promise.all([loadPosProducts(), loadTodayClose()]);
  } catch {
    /* empty */
  }
  return <PosView products={products} today={today} />;
}

function PosView({ products, today }: { products: PosProduct[]; today: DailyClose }) {
  const t = useTranslations("pos");

  const stats = [
    { label: t("todaySales"), value: formatNpr(today.totalSalesPaisa) },
    { label: t("todayCount"), value: String(today.saleCount) },
    { label: t("todayPieces"), value: String(today.piecesSold) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Card className="w-full sm:w-auto">
          <CardContent className="flex items-center gap-4 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptIcon className="h-4 w-4" aria-hidden />
            </span>
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-sm font-bold tabular-nums">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <PosTerminal products={products} />
    </div>
  );
}
