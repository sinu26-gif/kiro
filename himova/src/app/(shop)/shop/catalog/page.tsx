import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageIcon, PackageSearch } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadCatalogCards, type CatalogProductCard } from "@/lib/catalog";
import { formatNpr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { CatalogSearchBar, type CatalogCategory } from "./search-bar";

export const metadata = { title: "Catalog" };

async function loadCategories(): Promise<CatalogCategory[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });
  return (data ?? []) as CatalogCategory[];
}

export default async function ShopCatalogPage({
  searchParams,
}: {
  searchParams?: { q?: string | string[]; category?: string | string[] };
}) {
  await requireRole(["shopkeeper"]);

  const query = typeof searchParams?.q === "string" ? searchParams.q : "";
  const categorySlug =
    typeof searchParams?.category === "string" ? searchParams.category : "";

  const [categories, cards] = await Promise.all([
    loadCategories().catch(() => [] as CatalogCategory[]),
    loadCatalogCards({ query, categorySlug }).catch(() => [] as CatalogProductCard[]),
  ]);

  return (
    <CatalogView
      categories={categories}
      cards={cards}
      query={query}
      categorySlug={categorySlug}
      filtered={Boolean(query) || Boolean(categorySlug)}
    />
  );
}

function CatalogView({
  categories,
  cards,
  query,
  categorySlug,
  filtered,
}: {
  categories: CatalogCategory[];
  cards: CatalogProductCard[];
  query: string;
  categorySlug: string;
  filtered: boolean;
}) {
  const t = useTranslations("catalog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <CatalogSearchBar
        categories={categories}
        initialQuery={query}
        initialCategory={categorySlug}
      />

      {cards.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{filtered ? t("noResults") : t("empty")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <CatalogCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogCard({ card }: { card: CatalogProductCard }) {
  const t = useTranslations("catalog");
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
            <Badge variant="muted">{t("outOfStock")}</Badge>
          </span>
        ) : null}
      </div>
      <CardContent className="space-y-1 p-3">
        {card.categoryName ? (
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {card.categoryName}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm font-medium leading-snug">{card.name}</p>
        {card.minEffectivePricePaisa !== null ? (
          <p className="pt-1 text-sm font-semibold text-primary">
            <span className="text-[11px] font-normal text-muted-foreground">{t("from")} </span>
            {formatNpr(card.minEffectivePricePaisa)}
          </p>
        ) : null}
      </CardContent>
    </Link>
  );
}
