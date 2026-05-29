import Link from "next/link";
import { useTranslations } from "next-intl";
import { Boxes, ShoppingBag } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { loadShopStock, type ShopStockRow } from "@/lib/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Your shop stock" };

const LOW_PIECE_THRESHOLD = 2;

type Group = {
  key: string;
  productName: string;
  variantName: string;
  sizes: { size: string; quantity: number }[];
};

function groupRows(rows: ShopStockRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = `${r.productName}__${r.variantName}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        productName: r.productName,
        variantName: r.variantName,
        sizes: [],
      });
    }
    map.get(key)!.sizes.push({ size: r.size, quantity: r.quantity });
  }
  // Sort sizes within each group for stable display.
  const groups = Array.from(map.values());
  groups.forEach((g) => {
    g.sizes.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
  });
  return groups;
}

export default async function ShopStockPage() {
  await requireRole(["shopkeeper"]);
  let rows: ShopStockRow[] = [];
  try {
    const shopkeeperId = await getCurrentShopkeeperId();
    if (shopkeeperId) rows = await loadShopStock(shopkeeperId);
  } catch {
    rows = [];
  }
  return <View groups={groupRows(rows)} />;
}

function View({ groups }: { groups: Group[] }) {
  const t = useTranslations("shopStock");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/shop/catalog">
            <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
            {t("reorder")}
          </Link>
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <Boxes className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("empty")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/shop/catalog">{t("browseCatalog")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => {
            const anyLow = g.sizes.some((s) => s.quantity <= LOW_PIECE_THRESHOLD);
            return (
              <Card key={g.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="min-w-0">
                      <span className="line-clamp-1">{g.productName}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {g.variantName}
                      </span>
                    </span>
                    {anyLow ? <Badge variant="warning">{t("lowAlert")}</Badge> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {g.sizes.map((s) => {
                      const low = s.quantity <= LOW_PIECE_THRESHOLD;
                      return (
                        <div
                          key={s.size}
                          className={
                            "flex min-w-[3.25rem] flex-col items-center rounded-lg border px-2 py-1.5 " +
                            (s.quantity === 0
                              ? "border-dashed opacity-50"
                              : low
                                ? "border-warning/50 bg-warning/10"
                                : "bg-card")
                          }
                        >
                          <span className="text-[11px] uppercase text-muted-foreground">
                            {s.size}
                          </span>
                          <span className="text-base font-bold tabular-nums">{s.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
