import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Catalog read helpers shared by the shopkeeper catalog and product detail pages.
 *
 * Pricing: each set type has a base price. A shopkeeper may have an override
 * in shopkeeper_pricing (either an absolute paisa amount or a percent discount).
 * The effective price for a shopkeeper is computed here so the UI never has to.
 */

export type CatalogSetType = {
  id: string;
  label: string;
  sizes: string[];
  basePricePaisa: number;
  /** Effective price for the current shopkeeper after any override. */
  effectivePricePaisa: number;
  /** Human note when a discount/override applies (e.g. "10% off"), else null. */
  priceNote: string | null;
  warehouseStock: number;
  inStock: boolean;
};

export type CatalogVariant = {
  id: string;
  name: string;
  setTypes: CatalogSetType[];
};

export type CatalogProductCard = {
  id: string;
  name: string;
  categoryName: string | null;
  thumbnailUrl: string | null;
  minEffectivePricePaisa: number | null;
  totalStock: number;
  variantCount: number;
};

export type CatalogProductDetail = {
  id: string;
  name: string;
  description: string | null;
  videoUrl: string | null;
  categoryName: string | null;
  suggestedRetailPaisa: number | null;
  photos: string[];
  variants: CatalogVariant[];
};

type PricingRow = {
  set_type_id: string;
  override_paisa: number | null;
  discount_percent: number | null;
  note: string | null;
};

/**
 * Resolve the shopkeeper.id for the current authenticated user.
 */
export async function getCurrentShopkeeperId(): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("shopkeepers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Build a map of set_type_id -> effective price + note for a shopkeeper.
 */
async function loadPricingMap(
  shopkeeperId: string | null
): Promise<Map<string, { override_paisa: number | null; discount_percent: number | null; note: string | null }>> {
  const map = new Map<
    string,
    { override_paisa: number | null; discount_percent: number | null; note: string | null }
  >();
  if (!shopkeeperId) return map;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("shopkeeper_pricing")
    .select("set_type_id, override_paisa, discount_percent, note")
    .eq("shopkeeper_id", shopkeeperId);

  for (const row of (data ?? []) as PricingRow[]) {
    map.set(row.set_type_id, {
      override_paisa: row.override_paisa,
      discount_percent: row.discount_percent,
      note: row.note,
    });
  }
  return map;
}

function computeEffectivePrice(
  basePaisa: number,
  override: { override_paisa: number | null; discount_percent: number | null; note: string | null } | undefined
): { effectivePricePaisa: number; priceNote: string | null } {
  if (!override) return { effectivePricePaisa: basePaisa, priceNote: null };

  if (override.override_paisa !== null && override.override_paisa !== undefined) {
    return {
      effectivePricePaisa: override.override_paisa,
      priceNote: override.note ?? "Your price",
    };
  }
  if (override.discount_percent !== null && override.discount_percent !== undefined) {
    const discounted = Math.round(basePaisa * (1 - override.discount_percent / 100));
    return {
      effectivePricePaisa: discounted,
      priceNote: override.note ?? `${override.discount_percent}% off`,
    };
  }
  return { effectivePricePaisa: basePaisa, priceNote: null };
}

type RawCard = {
  id: string;
  name: string;
  category: { name: string } | null;
  product_variants: Array<{
    id: string;
    set_types: Array<{ id: string; price_paisa: number; warehouse_stock: number }> | null;
  }> | null;
  product_photos: Array<{ url: string; sort_order: number }> | null;
};

/**
 * Load active products as catalog cards, with the shopkeeper's effective min price.
 * Optional name search and category-slug filter.
 */
export async function loadCatalogCards(opts: {
  query?: string;
  categorySlug?: string;
}): Promise<CatalogProductCard[]> {
  const supabase = getSupabaseServerClient();
  const shopkeeperId = await getCurrentShopkeeperId();
  const pricing = await loadPricingMap(shopkeeperId);

  let categoryId: string | null = null;
  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    categoryId = cat.id;
  }

  let query = supabase
    .from("products")
    .select(
      `
      id, name,
      category:categories ( name ),
      product_variants:product_variants (
        id,
        set_types:set_types ( id, price_paisa, warehouse_stock )
      ),
      product_photos:product_photos ( url, sort_order )
    `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (opts.query?.trim()) {
    query = query.ilike("name", `%${opts.query.trim()}%`);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as RawCard[]).map((p) => {
    const variants = p.product_variants ?? [];
    const allSets = variants.flatMap((v) => v.set_types ?? []);
    const effectivePrices = allSets.map((s) => {
      const { effectivePricePaisa } = computeEffectivePrice(s.price_paisa, pricing.get(s.id));
      return effectivePricePaisa;
    });
    const totalStock = allSets.reduce((sum, s) => sum + (s.warehouse_stock ?? 0), 0);
    const photos = [...(p.product_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);

    return {
      id: p.id,
      name: p.name,
      categoryName: p.category?.name ?? null,
      thumbnailUrl: photos[0]?.url ?? null,
      minEffectivePricePaisa: effectivePrices.length > 0 ? Math.min(...effectivePrices) : null,
      totalStock,
      variantCount: variants.length,
    };
  });
}

type RawDetail = {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  suggested_retail_paisa: number | null;
  status: string;
  category: { name: string } | null;
  product_variants: Array<{
    id: string;
    variant_name: string;
    sort_order: number;
    set_types: Array<{
      id: string;
      label: string;
      sizes: string[];
      price_paisa: number;
      warehouse_stock: number;
    }> | null;
  }> | null;
  product_photos: Array<{ url: string; sort_order: number }> | null;
};

/**
 * Load a single active product with variants, set types, photos, and the
 * shopkeeper's effective pricing. Returns null if not found or archived.
 */
export async function loadCatalogProduct(productId: string): Promise<CatalogProductDetail | null> {
  const supabase = getSupabaseServerClient();
  const shopkeeperId = await getCurrentShopkeeperId();
  const pricing = await loadPricingMap(shopkeeperId);

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, video_url, suggested_retail_paisa, status,
      category:categories ( name ),
      product_variants:product_variants (
        id, variant_name, sort_order,
        set_types:set_types ( id, label, sizes, price_paisa, warehouse_stock )
      ),
      product_photos:product_photos ( url, sort_order )
    `
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;
  const raw = data as unknown as RawDetail;
  if (raw.status !== "active") return null;

  const photos = [...(raw.product_photos ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.url);

  const variants: CatalogVariant[] = [...(raw.product_variants ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      id: v.id,
      name: v.variant_name,
      setTypes: [...(v.set_types ?? [])]
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((st) => {
          const { effectivePricePaisa, priceNote } = computeEffectivePrice(
            st.price_paisa,
            pricing.get(st.id)
          );
          return {
            id: st.id,
            label: st.label,
            sizes: st.sizes ?? [],
            basePricePaisa: st.price_paisa,
            effectivePricePaisa,
            priceNote,
            warehouseStock: st.warehouse_stock,
            inStock: st.warehouse_stock > 0,
          };
        }),
    }));

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    videoUrl: raw.video_url,
    categoryName: raw.category?.name ?? null,
    suggestedRetailPaisa: raw.suggested_retail_paisa,
    photos,
    variants,
  };
}

/**
 * Convert a YouTube watch/share URL into an embeddable URL, or null.
 */
export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/) ?? null;
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
}
