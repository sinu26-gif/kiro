import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ImageIcon, Layers, Package } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatNpr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { EditProductForm, type CategoryOption, type EditProductDefaults } from "./edit-form";
import { PhotosSection, type ProductPhoto } from "./photos-section";
import { StatusToggleButton } from "./status-toggle";

export const metadata = { title: "Edit product" };

type VariantWithSets = {
  id: string;
  variant_name: string;
  sort_order: number;
  set_types: Array<{
    id: string;
    label: string;
    sizes: string[];
    price_paisa: number;
    warehouse_stock: number;
    reorder_threshold: number;
  }>;
};

type ProductFull = {
  id: string;
  name: string;
  status: "active" | "archived";
  category_id: string | null;
  description: string | null;
  video_url: string | null;
  suggested_retail_paisa: number | null;
  product_variants: VariantWithSets[];
  product_photos: Array<{
    id: string;
    url: string;
    sort_order: number;
  }>;
};

async function loadCategories(): Promise<CategoryOption[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order", { ascending: true });
  return (data ?? []) as CategoryOption[];
}

async function loadProduct(id: string): Promise<ProductFull | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, status, category_id, description, video_url, suggested_retail_paisa,
      product_variants:product_variants (
        id, variant_name, sort_order,
        set_types:set_types (
          id, label, sizes, price_paisa, warehouse_stock, reorder_threshold
        )
      ),
      product_photos:product_photos (
        id, url, sort_order
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ProductFull;
}

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["admin"]);

  const [product, categories] = await Promise.all([
    loadProduct(params.id),
    loadCategories().catch(() => [] as CategoryOption[]),
  ]);

  if (!product) notFound();

  const defaults: EditProductDefaults = {
    productId: product.id,
    name: product.name,
    categoryId: product.category_id,
    description: product.description,
    videoUrl: product.video_url,
    suggestedRetailPaisa: product.suggested_retail_paisa,
  };

  // Sort variants for stable display.
  const variants = [...(product.product_variants ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  // Sort photos by sort_order so the "primary" badge is on the first one.
  const photos: ProductPhoto[] = [...(product.product_photos ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({ id: p.id, url: p.url, sortOrder: p.sort_order }));

  return (
    <EditProductView
      product={product}
      defaults={defaults}
      categories={categories}
      variants={variants}
      photos={photos}
    />
  );
}

function EditProductView({
  product,
  defaults,
  categories,
  variants,
  photos,
}: {
  product: ProductFull;
  defaults: EditProductDefaults;
  categories: CategoryOption[];
  variants: VariantWithSets[];
  photos: ProductPhoto[];
}) {
  const t = useTranslations("products");
  const tp = useTranslations("photos");
  const tc = useTranslations("common");

  const totalSets = variants.reduce((s, v) => s + (v.set_types?.length ?? 0), 0);
  const totalStock = variants.reduce(
    (s, v) =>
      s + (v.set_types ?? []).reduce((sum, st) => sum + (st.warehouse_stock ?? 0), 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {tc("back")}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            {product.status === "archived" ? (
              <Badge variant="muted">{t("status.archived")}</Badge>
            ) : (
              <Badge variant="success">{t("status.active")}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("editSubtitle")}</p>
        </div>
        <StatusToggleButton productId={product.id} currentStatus={product.status} />
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProductForm defaults={defaults} categories={categories} />
        </CardContent>
      </Card>

      {/* Photos section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" aria-hidden />
            {tp("title")}
            <Badge variant="muted">{photos.length}</Badge>
          </CardTitle>
          <CardDescription>{tp("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotosSection productId={product.id} photos={photos} />
        </CardContent>
      </Card>

      {/* Variants section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" aria-hidden />
            {t("variants.title")}
            <Badge variant="muted">{variants.length}</Badge>
          </CardTitle>
          <CardDescription>{t("variants.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("variants.empty")}</p>
          ) : (
            variants.map((v) => (
              <VariantRow key={v.id} variant={v} />
            ))
          )}
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {t("variants.comingSoon")}
          </p>
        </CardContent>
      </Card>

      {/* Set-types summary at the bottom */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" aria-hidden />
            {t("setTypes.title")}
            <Badge variant="muted">{totalSets}</Badge>
          </CardTitle>
          <CardDescription>
            {t("setTypes.subtitle")} &nbsp;·&nbsp; {t("setTypes.warehouseStock")}: {totalStock}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {t("setTypes.comingSoon")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function VariantRow({ variant }: { variant: VariantWithSets }) {
  const t = useTranslations("products.setTypes");
  const sets = (variant.set_types ?? []).slice().sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 font-medium">{variant.variant_name}</div>
      {sets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No set types yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Set</th>
                <th className="py-1 text-left font-medium">Sizes</th>
                <th className="py-1 text-right font-medium">Price</th>
                <th className="py-1 text-right font-medium">{t("warehouseStock")}</th>
                <th className="py-1 text-right font-medium">{t("reorderAt")}</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-1.5 font-medium">{s.label}</td>
                  <td className="py-1.5 tabular-nums text-muted-foreground">
                    {(s.sizes ?? []).join(", ")}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatNpr(s.price_paisa)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.warehouse_stock}
                    {s.warehouse_stock <= s.reorder_threshold ? (
                      <span className="ml-1 text-warning-foreground" aria-label="low stock">
                        ⚠
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {s.reorder_threshold}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
