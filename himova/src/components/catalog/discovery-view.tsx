import Link from "next/link";
import { useTranslations } from "next-intl";
import { PackageSearch } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CatalogProductCard } from "@/lib/catalog";

export type DiscoveryFeed = "newArrivals" | "bestSellers" | "recommended" | "previousOrders";

/**
 * Full-page view for a single discovery feed (its own route).
 */
export function DiscoveryView({
  feed,
  cards,
}: {
  feed: DiscoveryFeed;
  cards: CatalogProductCard[];
}) {
  const t = useTranslations("discover");
  const tc = useTranslations("catalogExtra");
  const tcat = useTranslations("catalog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t(feed)}</h1>
        <p className="text-sm text-muted-foreground">{t(`${feed}Sub`)}</p>
      </div>

      {cards.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("empty")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/shop/catalog">{t("browseCatalog")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <ProductCard
              key={card.id}
              card={card}
              perPieceLabel={tc("perPiece")}
              fromLabel={tcat("from")}
              outOfStockLabel={tcat("outOfStock")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact horizontal preview row used on the shop home, with a "View all" link.
 */
export function DiscoveryRow({
  feed,
  href,
  cards,
}: {
  feed: DiscoveryFeed;
  href: string;
  cards: CatalogProductCard[];
}) {
  const t = useTranslations("discover");
  const tc = useTranslations("catalogExtra");
  const tcat = useTranslations("catalog");

  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t(feed)}</h2>
          <p className="text-xs text-muted-foreground">{t(`${feed}Sub`)}</p>
        </div>
        <Link href={href} className="text-sm font-medium text-primary hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.slice(0, 4).map((card) => (
          <ProductCard
            key={card.id}
            card={card}
            perPieceLabel={tc("perPiece")}
            fromLabel={tcat("from")}
            outOfStockLabel={tcat("outOfStock")}
          />
        ))}
      </div>
    </section>
  );
}
