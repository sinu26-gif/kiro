import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ImageIcon, Package } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { EditProductForm, type CategoryOption, type EditProductDefaults } from "./edit-form";
import { PhotosSection, type ProductPhoto } from "./photos-section";
import { StatusToggleButton } from "./status-toggle";
import { VariantsEditor, type EditorVariant } from "./variants-editor";

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

  // Map DB rows to the editor's prop shape.
  const editorVariants: EditorVariant[] = variants.map((v) => ({
    id: v.id,
    name: v.variant_name,
    setTypes: [...(v.set_types ?? [])]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((st) => ({
        id: st.id,
        label: st.label,
        sizes: st.sizes ?? [],
        pricePaisa: st.price_paisa,
        warehouseStock: st.warehouse_stock,
        reorderThreshold: st.reorder_threshold,
      })),
  }));

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

      {/* Variants + set types editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" aria-hidden />
            {t("variants.title")}
            <Badge variant="muted">{variants.length}</Badge>
          </CardTitle>
          <CardDescription>{t("variants.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <VariantsEditor productId={product.id} variants={editorVariants} />
        </CardContent>
      </Card>
    </div>
  );
}
