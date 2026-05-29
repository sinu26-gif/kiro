import "server-only";

import { allowedDepartments, type ShopCategory } from "@/lib/shopkeeper";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Catalog read helpers shared by the shopkeeper catalog, product detail, and
 * discovery (new arrivals / best sellers / recommended / previous orders) pages.
 *
 * Pricing: each set type has a base SET price. A shopkeeper may have an override
 * in shopkeeper_pricing (absolute paisa or percent discount). The UI shows the
 * PER-PIECE price (set price / number of sizes in the set); the cart and order
 * totals still use the set price (per-piece x pieces) since orders are by set.
 *
 * Department filtering: a shopkeeper of category 'shoes' or 'clothing' only
 * sees products in their department (plus 'other'); 'both' sees everything.
 */

export type CatalogSetType = {
  id: string;
  label: string;
  sizes: string[];
  /** Number of pieces in the set (= sizes.length). */
  pieceCount: number;
  basePricePaisa: number;
  /** Effective SET price for the current shopkeeper after any override. */
  effectivePricePaisa: number;
  /** Effective PER-PIECE price (set price / pieceCount), rounded. */
  perPiecePricePaisa: number;
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
  /** Lowest per-piece price across this product's sets (for "from Rs X / pc"). */
  minPerPiecePaisa: number | null;
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

type PricingOverride = {
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
 * Resolve the current shopkeeper's id + shop_category in one query.
 */
async function getCurrentShopkeeperScope(): Promise<{
  id: string | null;
  category: ShopCategory;
}> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: null, category: "both" };
  const { data } = await supabase
    .from("shopkeepers")
    .select("id, shop_category")
    .eq("profile_id", user.id)
    .maybeSingle();
  return {
    id: data?.id ?? null,
    category: ((data?.shop_category as ShopCategory) ?? "both") as ShopCategory,
  };
}

/**
 * Category ids the given shop category is allowed to see, plus a flag for
 * whether null-category products should show (they always do).
 * Returns null when no filtering is needed ('both').
 */
async function allowedCategoryIds(category: ShopCategory): Promise<Set<string> | null> {
  if (category === "both") return null;
  const supabase = getSupabaseServerClient();
  const depts = allowedDepartments(category);
  const { data } = await supabase.from("categories").select("id, department");
  const ids = new Set<string>();
  for (const c of data ?? []) {
    if (depts.includes(c.department as "shoes" | "clothing" | "other")) {
      ids.add(c.id as string);
    }
  }
  return ids;
}

async function loadPricingMap(
  shopkeeperId: string | null
): Promise<Map<string, PricingOverride>> {
  const map = new Map<string, PricingOverride>();
  if (!shopkeeperId) return map;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("shopkeeper_pricing")
    .select("set_type_id, override_paisa, discount_percent, note")
    .eq("shopkeeper_id", shopkeeperId);
  for (const row of (data ?? []) as Array<PricingOverride & { set_type_id: string }>) {
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
  override: PricingOverride | undefined
): { effectivePricePaisa: number; priceNote: string | null } {
  if (!override) return { effectivePricePaisa: basePaisa, priceNote: null };
  if (override.override_paisa != null) {
    return { effectivePricePaisa: override.override_paisa, priceNote: override.note ?? "Your price" };
  }
  if (override.discount_percent != null) {
    return {
      effectivePricePaisa: Math.round(basePaisa * (1 - override.discount_percent / 100)),
      priceNote: override.note ?? `${override.discount_percent}% off`,
    };
  }
  return { effectivePricePaisa: basePaisa, priceNote: null };
}

function perPiece(setPaisa: number, pieceCount: number): number {
  return pieceCount > 0 ? Math.round(setPaisa / pieceCount) : setPaisa;
}

type RawCard = {
  id: string;
  name: string;
  category_id: string | null;
  category: { name: string } | null;
  product_variants: Array<{
    id: string;
    set_types: Array<{ id: string; sizes: string[]; price_paisa: number; warehouse_stock: number }> | null;
  }> | null;
  product_photos: Array<{ url: string; sort_order: number }> | null;
};

function mapCard(p: RawCard, pricing: Map<string, PricingOverride>): CatalogProductCard {
  const variants = p.product_variants ?? [];
  const allSets = variants.flatMap((v) => v.set_types ?? []);
  const perPiecePrices = allSets.map((s) => {
    const { effectivePricePaisa } = computeEffectivePrice(s.price_paisa, pricing.get(s.id));
    return perPiece(effectivePricePaisa, (s.sizes ?? []).length);
  });
  const totalStock = allSets.reduce((sum, s) => sum + (s.warehouse_stock ?? 0), 0);
  const photos = [...(p.product_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: p.id,
    name: p.name,
    categoryName: p.category?.name ?? null,
    thumbnailUrl: photos[0]?.url ?? null,
    minPerPiecePaisa: perPiecePrices.length > 0 ? Math.min(...perPiecePrices) : null,
    totalStock,
    variantCount: variants.length,
  };
}

const CARD_SELECT = `
  id, name, category_id,
  category:categories ( name ),
  product_variants:product_variants (
    id,
    set_types:set_types ( id, sizes, price_paisa, warehouse_stock )
  ),
  product_photos:product_photos ( url, sort_order )
`;

/**
 * Load active products as catalog cards (per-piece pricing), filtered by the
 * shopkeeper's department, optional name search, and optional category slug.
 */
export async function loadCatalogCards(opts: {
  query?: string;
  categorySlug?: string;
}): Promise<CatalogProductCard[]> {
  const supabase = getSupabaseServerClient();
  const scope = await getCurrentShopkeeperScope();
  const pricing = await loadPricingMap(scope.id);
  const allowed = await allowedCategoryIds(scope.category);

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
    .select(CARD_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (opts.query?.trim()) query = query.ilike("name", `%${opts.query.trim()}%`);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as RawCard[])
    .filter((p) => !allowed || p.category_id === null || allowed.has(p.category_id))
    .map((p) => mapCard(p, pricing));
}

/**
 * Load specific products (by id) as cards, preserving the given id order and
 * applying department filtering + per-piece pricing. Used by discovery pages.
 */
export async function loadCardsByIds(ids: string[]): Promise<CatalogProductCard[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const scope = await getCurrentShopkeeperScope();
  const pricing = await loadPricingMap(scope.id);
  const allowed = await allowedCategoryIds(scope.category);

  const { data, error } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .in("id", ids);
  if (error || !data) return [];

  const byId = new Map<string, CatalogProductCard>();
  for (const p of data as unknown as RawCard[]) {
    if (allowed && p.category_id !== null && !allowed.has(p.category_id)) continue;
    byId.set(p.id, mapCard(p, pricing));
  }
  // Preserve the caller's order.
  return ids.map((id) => byId.get(id)).filter((c): c is CatalogProductCard => Boolean(c));
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
 * shopkeeper's effective + per-piece pricing. Returns null if not found/archived.
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
          const pieceCount = (st.sizes ?? []).length;
          const { effectivePricePaisa, priceNote } = computeEffectivePrice(
            st.price_paisa,
            pricing.get(st.id)
          );
          return {
            id: st.id,
            label: st.label,
            sizes: st.sizes ?? [],
            pieceCount,
            basePricePaisa: st.price_paisa,
            effectivePricePaisa,
            perPiecePricePaisa: perPiece(effectivePricePaisa, pieceCount),
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
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/) ?? null;
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
}
