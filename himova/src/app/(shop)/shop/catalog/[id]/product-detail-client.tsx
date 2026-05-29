"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, ImageIcon, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";

import { addToCart } from "@/app/actions/cart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNpr } from "@/lib/format";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { CatalogProductDetail } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Full shopkeeper product detail: a gallery that swaps to the selected
 * variant's photos (falling back to general product photos) plus the
 * variant / set / quantity chooser and add-to-cart. Kept as a single client
 * component so selecting a colour updates both the photos and the order panel.
 */
export function ProductDetailClient({ product }: { product: CatalogProductDetail }) {
  const t = useTranslations("productDetail");
  const tc = useTranslations("catalogExtra");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embed = youtubeEmbedUrl(product.videoUrl);
  const variants = product.variants;
  const hasSets = variants.some((v) => v.setTypes.length > 0);

  const [variantId, setVariantId] = useState<string | null>(
    variants.find((v) => v.setTypes.length > 0)?.id ?? variants[0]?.id ?? null
  );
  const activeVariant = variants.find((v) => v.id === variantId) ?? null;

  const [setTypeId, setSetTypeId] = useState<string | null>(
    activeVariant?.setTypes.find((s) => s.inStock)?.id ?? activeVariant?.setTypes[0]?.id ?? null
  );
  const activeSet = activeVariant?.setTypes.find((s) => s.id === setTypeId) ?? null;

  const [qty, setQty] = useState(1);

  // Photos shown in the gallery: the selected variant's photos if it has any,
  // otherwise the product's general photos.
  const galleryPhotos = useMemo(() => {
    if (activeVariant && activeVariant.photos.length > 0) return activeVariant.photos;
    return product.photos;
  }, [activeVariant, product.photos]);

  const [photoIndex, setPhotoIndex] = useState(0);
  // Reset the highlighted photo whenever the visible set of photos changes.
  useEffect(() => {
    setPhotoIndex(0);
  }, [galleryPhotos]);

  const maxQty = activeSet ? Math.max(activeSet.warehouseStock, 0) : 0;
  const lineTotal = activeSet ? activeSet.effectivePricePaisa * qty : 0;

  function selectVariant(id: string) {
    setVariantId(id);
    const v = variants.find((x) => x.id === id);
    const firstSet = v?.setTypes.find((s) => s.inStock) ?? v?.setTypes[0] ?? null;
    setSetTypeId(firstSet?.id ?? null);
    setQty(1);
    setDone(false);
    setError(null);
  }

  function selectSet(id: string) {
    setSetTypeId(id);
    setQty(1);
    setDone(false);
    setError(null);
  }

  function clampQty(next: number): number {
    const ceiling = maxQty > 0 ? maxQty : 999;
    if (!Number.isFinite(next)) return 1;
    return Math.max(1, Math.min(Math.floor(next), ceiling));
  }

  function submit() {
    if (!activeSet || !activeSet.inStock) {
      setError(t("selectFirst"));
      return;
    }
    setError(null);
    const quantity = clampQty(qty);
    start(async () => {
      const fd = new FormData();
      fd.set("setTypeId", activeSet.id);
      fd.set("quantity", String(quantity));
      const res = await addToCart(null, fd);
      if (!res.ok) {
        setError(res.error ?? "Could not add to cart.");
      } else {
        setDone(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/shop/catalog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <Gallery
            photos={galleryPhotos}
            name={product.name}
            index={photoIndex}
            onSelect={setPhotoIndex}
          />
          {embed ? (
            <div className="aspect-video overflow-hidden rounded-xl border">
              <iframe
                src={embed}
                title={product.name}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>

        {/* Info + order panel */}
        <div className="space-y-4">
          <div>
            {product.categoryName ? (
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {product.categoryName}
              </p>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            {product.suggestedRetailPaisa != null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("suggestedRetail")}: {formatNpr(product.suggestedRetailPaisa)}
              </p>
            ) : null}
          </div>

          {product.description ? (
            <p className="text-sm text-pretty text-muted-foreground">{product.description}</p>
          ) : null}

          {variants.length === 0 || !hasSets ? (
            <Alert>
              <AlertDescription>{t("noVariants")}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 rounded-xl border bg-card p-4 shadow-soft">
              {/* Variant chooser */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("chooseVariant")}</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVariant(v.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        v.id === variantId
                          ? "border-primary bg-primary/10 text-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set chooser */}
              {activeVariant && activeVariant.setTypes.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("chooseSet")}</p>
                  <div className="space-y-2">
                    {activeVariant.setTypes.map((s) => {
                      const selected = s.id === setTypeId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!s.inStock}
                          onClick={() => selectSet(s.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                            selected ? "border-primary bg-primary/10" : "hover:bg-accent",
                            !s.inStock && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{s.label}</span>
                            <span className="block text-xs text-muted-foreground">
                              {t("sizes")}: {s.sizes.join(", ")}
                            </span>
                          </span>
                          <span className="ml-3 shrink-0 text-right">
                            <span className="block text-sm font-semibold">
                              {formatNpr(s.perPiecePricePaisa)}
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {" "}
                                {tc("perPiece")}
                              </span>
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {t("pcsPerSet", { count: s.pieceCount })} ·{" "}
                              {formatNpr(s.effectivePricePaisa)}
                              {t("perSet")}
                            </span>
                            {s.priceNote ? (
                              <Badge variant="success" className="mt-0.5 px-1.5 py-0 text-[10px]">
                                {s.priceNote}
                              </Badge>
                            ) : !s.inStock ? (
                              <span className="text-[11px] text-muted-foreground">
                                {t("outOfStock")}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {t("stockSets", { count: s.warehouseStock })}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>{t("noVariants")}</AlertDescription>
                </Alert>
              )}

              {/* Quantity stepper (typeable) — shown whenever an in-stock set is chosen */}
              {activeSet && activeSet.inStock ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("qty")}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQty((q) => clampQty(q - 1))}
                        disabled={qty <= 1}
                        aria-label="Decrease"
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={maxQty > 0 ? maxQty : undefined}
                        value={qty}
                        onChange={(e) => {
                          const v = e.target.value;
                          // Allow the field to be briefly empty while typing.
                          if (v === "") {
                            setQty(1);
                            return;
                          }
                          setQty(clampQty(Number(v)));
                        }}
                        className="h-10 w-16 text-center tabular-nums"
                        aria-label={t("qty")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQty((q) => clampQty(q + 1))}
                        disabled={maxQty > 0 && qty >= maxQty}
                        aria-label="Increase"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  {/* Total + CTA */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("yourPrice")}</p>
                      <p className="text-lg font-bold text-primary">{formatNpr(lineTotal)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {qty} {t("setUnit")} × {formatNpr(activeSet.effectivePricePaisa)}
                      </p>
                    </div>
                    <Button onClick={submit} disabled={pending} size="tap">
                      {pending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : done ? (
                        <Check className="mr-2 h-4 w-4" aria-hidden />
                      ) : (
                        <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />
                      )}
                      {pending ? t("adding") : done ? t("added") : t("addToCart")}
                    </Button>
                  </div>
                </>
              ) : activeVariant && activeVariant.setTypes.length > 0 ? (
                <Alert>
                  <AlertDescription>{t("outOfStock")}</AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Gallery({
  photos,
  name,
  index,
  onSelect,
}: {
  photos: string[];
  name: string;
  index: number;
  onSelect: (i: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted text-muted-foreground">
        <ImageIcon className="h-10 w-10" aria-hidden />
      </div>
    );
  }
  const safeIndex = Math.min(index, photos.length - 1);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        <Image
          src={photos[safeIndex]}
          alt={name}
          fill
          sizes="(min-width: 768px) 400px, 100vw"
          className="object-cover"
          unoptimized
          priority
        />
      </div>
      {photos.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {photos.slice(0, 8).map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all",
                i === safeIndex ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-90"
              )}
              aria-label={`${name} ${i + 1}`}
            >
              <Image
                src={url}
                alt={`${name} ${i + 1}`}
                fill
                sizes="100px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
