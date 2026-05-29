import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatNpr } from "@/lib/format";
import type { CatalogProductCard } from "@/lib/catalog";

/**
 * Shared product card for the catalog and discovery pages.
 * Shows the per-piece price (e.g. "from Rs 850 / pair"); the set total is
 * computed at checkout (per-piece x pieces x sets).
 */
export function ProductCard({
  card,
  perPieceLabel,
  fromLabel,
  outOfStockLabel,
}: {
  card: CatalogProductCard;
  perPieceLabel: string;
  fromLabel: string;
  outOfStockLabel: string;
}) {
  const outOfStock = card.totalStock <= 0;
  return (
    <Link
      href={`/shop/catalog/${card.id}`}
      className="group rounded-xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
        {card.thumbnailUrl ? (
          <Image
            src={card.thumbnailUrl}
            alt={card.name}
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" aria-hidden />
          </div>
        )}
        {outOfStock ? (
          <span className="absolute left-2 top-2">
            <Badge variant="muted">{outOfStockLabel}</Badge>
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        {card.categoryName ? (
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {card.categoryName}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm font-medium leading-snug">{card.name}</p>
        {card.minPerPiecePaisa !== null ? (
          <p className="pt-1 text-sm font-semibold text-primary">
            <span className="text-[11px] font-normal text-muted-foreground">{fromLabel} </span>
            {formatNpr(card.minPerPiecePaisa)}
            <span className="text-[11px] font-normal text-muted-foreground"> {perPieceLabel}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
