"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Printer, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { formatNpr, formatDate } from "@/lib/format";

export type ReceiptData = {
  id: string;
  createdAt: string;
  shopName: string;
  shopAddress: string | null;
  shopPhone: string | null;
  subtotalPaisa: number;
  discountPaisa: number;
  totalPaisa: number;
  returnPolicy: string;
  customerName: string | null;
  customerPhone: string | null;
  items: {
    name: string;
    detail: string;
    quantity: number;
    unitPricePaisa: number;
    lineTotalPaisa: number;
  }[];
  payments: { method: string; amountPaisa: number }[];
};

export function ReceiptView({ data }: { data: ReceiptData }) {
  const t = useTranslations("receipt");

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Actions (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/shop/pos">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {t("backToPos")}
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" aria-hidden />
          {t("print")}
        </Button>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="space-y-4 p-6">
          {/* Shop header */}
          <div className="text-center">
            <h2 className="text-xl font-bold">{data.shopName}</h2>
            {data.shopAddress ? (
              <p className="text-xs text-muted-foreground">{data.shopAddress}</p>
            ) : null}
            {data.shopPhone ? (
              <p className="text-xs text-muted-foreground">{data.shopPhone}</p>
            ) : null}
          </div>

          <div className="flex justify-between border-y py-2 text-xs text-muted-foreground">
            <span>
              {t("sale")} #{data.id.slice(0, 8)}
            </span>
            <span>{formatDate(data.createdAt)}</span>
          </div>

          {/* Customer */}
          {data.customerName || data.customerPhone ? (
            <p className="text-xs">
              {t("customer")}: {data.customerName ?? ""} {data.customerPhone ?? ""}
            </p>
          ) : null}

          {/* Items */}
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{t("item")}</th>
                <th className="py-1 text-center font-medium">{t("qty")}</th>
                <th className="py-1 text-right font-medium">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">
                    <span className="block font-medium leading-tight">{it.name}</span>
                    {it.detail ? (
                      <span className="block text-[11px] text-muted-foreground">{it.detail}</span>
                    ) : null}
                    <span className="block text-[11px] text-muted-foreground">
                      {formatNpr(it.unitPricePaisa)} × {it.quantity}
                    </span>
                  </td>
                  <td className="py-1.5 text-center tabular-nums">{it.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatNpr(it.lineTotalPaisa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1 border-t pt-2 text-sm">
            <Row label={t("subtotal")} value={formatNpr(data.subtotalPaisa)} />
            {data.discountPaisa > 0 ? (
              <Row label={t("discount")} value={`- ${formatNpr(data.discountPaisa)}`} />
            ) : null}
            <div className="flex items-center justify-between border-t pt-1.5">
              <span className="font-bold">{t("grandTotal")}</span>
              <span className="text-lg font-bold">{formatNpr(data.totalPaisa)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="space-y-1 border-t pt-2 text-xs">
            {data.payments.map((p, i) => (
              <Row
                key={i}
                label={`${t("payment")} · ${p.method.toUpperCase()}`}
                value={formatNpr(p.amountPaisa)}
              />
            ))}
          </div>

          {/* Policy + thanks */}
          <div className="border-t pt-3 text-center">
            <p className="text-[11px] font-medium text-muted-foreground">{data.returnPolicy}</p>
            <p className="mt-1 text-xs font-medium">{t("thankYou")}</p>
            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Logo size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
