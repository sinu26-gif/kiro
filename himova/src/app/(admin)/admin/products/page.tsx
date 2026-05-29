import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Boxes, ImageIcon } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatNpr, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ProductFilterBar, type FilterCategory } from "./filter-bar";
import { StatusToggleButton } from "./[id]/status-toggle";

export const metadata = { title: "Products" };

type StatusFilter = "active" | "archived" | "all";

type ProductRow = {
  id: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
  variants: number;
  sets: number;
  minPricePaisa: number | null;
  totalStock: number;
  thumbnailUrl: string | null;
};

type RawProduct = {
  id: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
  category_id: string | null;
  product_variants:
    | Array<{
        id: string;
        set_types: Array<{
          id: string;
          price_paisa: number;
          warehouse_stock: number;
        }> | null;
      }>
    | null;
  product_photos:
    | Array<{
        url: string;
        sort_order: number;
        variant_id: string | null;
      }>
    | null;
};

async function loadCategories(): Promise<FilterCategory[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });
  return (data ?? []) as FilterCategory[];
}

async function loadProducts(filters: {
  query: string;
  categorySlug: string;
  status: StatusFilter;
}): Promise<{ rows: ProductRow[]; categoryNotFound: boolean }> {
  const supabase = getSupabaseServerClient();

  // Resolve category slug -> id (if a slug filter is active).
  let categoryId: string | null = null;
  let categoryNotFound = false;
  if (filters.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();
    if (cat) categoryId = cat.id;
    else categoryNotFound = true;
  }
  if (categoryNotFound) return { rows: [], categoryNotFound };

  let query = supabase
    .from("products")
    .select(
      `
      id, name, status, created_at, category_id,
      product_variants:product_variants (
        id,
        set_types:set_types ( id, price_paisa, warehouse_stock )
      ),
      product_photos:product_photos ( url, sort_order, variant_id )
    `
    )
    .order("created_at", { ascending: false });

  if (filters.query.trim()) {
    query = query.ilike("name", `%${filters.query.trim()}%`);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return { rows: [], categoryNotFound: false };

  // Resolve category names (one extra query, joined client-side; lighter on RLS).
  const { data: cats } = await supabase.from("categories").select("id, name, slug");
  const catById = new Map<string, { id: string; name: string; slug: string }>(
    (cats ?? []).map((c) => [c.id as string, c as { id: string; name: string; slug: string }])
  );

  const rows: ProductRow[] = (data as unknown as RawProduct[]).map((p) => {
    const variants = p.product_variants ?? [];
    const allSets = variants.flatMap((v) => v.set_types ?? []);
    const prices = allSets.map((s) => s.price_paisa).filter((n) => Number.isFinite(n));
    const stock = allSets.reduce((sum, s) => sum + (s.warehouse_stock ?? 0), 0);
    const photos = [...(p.product_photos ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      created_at: p.created_at,
      category: p.category_id ? catById.get(p.category_id) ?? null : null,
      variants: variants.length,
      sets: allSets.length,
      minPricePaisa: prices.length > 0 ? Math.min(...prices) : null,
      totalStock: stock,
      thumbnailUrl:
        photos.find((ph) => !ph.variant_id)?.url ?? photos[0]?.url ?? null,
    };
  });

  return { rows, categoryNotFound: false };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["admin"]);

  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const categorySlug =
    typeof searchParams.category === "string" ? searchParams.category : "";
  const rawStatus = typeof searchParams.status === "string" ? searchParams.status : "active";
  const status: StatusFilter =
    rawStatus === "archived" || rawStatus === "all" ? rawStatus : "active";

  const [categories, productsResult] = await Promise.all([
    loadCategories().catch(() => [] as FilterCategory[]),
    loadProducts({ query, categorySlug, status }).catch(() => ({
      rows: [] as ProductRow[],
      categoryNotFound: false,
    })),
  ]);

  return (
    <ProductsView
      categories={categories}
      rows={productsResult.rows}
      query={query}
      categorySlug={categorySlug}
      status={status}
      hasActiveFilters={Boolean(query) || Boolean(categorySlug) || status !== "active"}
    />
  );
}

function ProductsView({
  categories,
  rows,
  query,
  categorySlug,
  status,
  hasActiveFilters,
}: {
  categories: FilterCategory[];
  rows: ProductRow[];
  query: string;
  categorySlug: string;
  status: StatusFilter;
  hasActiveFilters: boolean;
}) {
  const t = useTranslations("products");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addNew")}
          </Link>
        </Button>
      </div>

      <ProductFilterBar
        categories={categories}
        initialQuery={query}
        initialCategory={categorySlug}
        initialStatus={status}
      />

      {rows.length === 0 ? (
        <EmptyState filtered={hasActiveFilters} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("table.name")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.category")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.variants")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.sets")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.price")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.stock")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.createdAt")}</th>
                  <th className="px-4 py-3 font-medium" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="flex items-center gap-3 hover:underline underline-offset-4"
                      >
                        <ProductThumb url={p.thumbnailUrl} alt={p.name} />
                        <span className="line-clamp-1">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.variants}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.sets}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.minPricePaisa !== null ? formatNpr(p.minPricePaisa) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.totalStock}</td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/products/${p.id}`}>
                            <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                            {t("actions.edit")}
                          </Link>
                        </Button>
                        <StatusToggleButton
                          productId={p.id}
                          currentStatus={p.status}
                          variant="ghost"
                          size="sm"
                        />
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

function ProductStatusBadge({ status }: { status: "active" | "archived" }) {
  const t = useTranslations("products.status");
  if (status === "active") return <Badge variant="success">{t("active")}</Badge>;
  return <Badge variant="muted">{t("archived")}</Badge>;
}

function ProductThumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ImageIcon className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
      <Image
        src={url}
        alt={alt}
        fill
        sizes="40px"
        className="object-cover"
        unoptimized
      />
    </span>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const t = useTranslations("products");
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Boxes className="h-5 w-5" aria-hidden />
        </div>
        <CardTitle className="text-base">
          {filtered ? t("noResults") : t("empty")}
        </CardTitle>
        {!filtered ? (
          <CardDescription>
            <Link
              href="/admin/products/new"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("addNew")}
            </Link>
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent />
    </Card>
  );
}
