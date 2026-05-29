import { useTranslations } from "next-intl";
import { PackageSearch } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadCatalogCards, type CatalogProductCard } from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { Card } from "@/components/ui/card";

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
  const tc = useTranslations("catalogExtra");

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
            <ProductCard
              key={card.id}
              card={card}
              perPieceLabel={tc("perPiece")}
              fromLabel={t("from")}
              outOfStockLabel={t("outOfStock")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
