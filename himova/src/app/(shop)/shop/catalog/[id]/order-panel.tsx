"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";

import { addToCart } from "@/app/actions/cart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNpr } from "@/lib/format";
import type { CatalogVariant } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Variant + set selector with quantity stepper and add-to-cart.
 * Lives on the product detail page.
 */
export function ProductOrderPanel({ variants }: { variants: CatalogVariant[] }) {
  const t = useTranslations("productDetail");
  const tc = useTranslations("catalogExtra");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [variantId, setVariantId] = useState<string | null>(
    variants.find((v) => v.setTypes.length > 0)?.id ?? variants[0]?.id ?? null
  );
  const activeVariant = variants.find((v) => v.id === variantId) ?? null;

  const [setTypeId, setSetTypeId] = useState<string | null>(
    activeVariant?.setTypes.find((s) => s.inStock)?.id ?? activeVariant?.setTypes[0]?.id ?? null
  );
  const activeSet = activeVariant?.setTypes.find((s) => s.id === setTypeId) ?? null;

  const [qty, setQty] = useState(1);

  const maxQty = activeSet ? Math.max(activeSet.warehouseStock, 0) : 0;

  const lineTotal = useMemo(
    () => (activeSet ? activeSet.effectivePricePaisa * qty : 0),
    [activeSet, qty]
  );

  if (variants.length === 0 || variants.every((v) => v.setTypes.length === 0)) {
    return (
      <Alert>
        <AlertDescription>{t("noVariants")}</AlertDescription>
      </Alert>
    );
  }

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

  function submit() {
    if (!activeSet) {
      setError(t("selectFirst"));
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("setTypeId", activeSet.id);
      fd.set("quantity", String(qty));
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
                      {t("pcsPerSet", { count: s.pieceCount })} · {formatNpr(s.effectivePricePaisa)}
                      {t("perSet")}
                    </span>
                    {s.priceNote ? (
                      <Badge variant="success" className="mt-0.5 px-1.5 py-0 text-[10px]">
                        {s.priceNote}
                      </Badge>
                    ) : !s.inStock ? (
                      <span className="text-[11px] text-muted-foreground">{t("outOfStock")}</span>
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
      ) : null}

      {/* Quantity stepper */}
      {activeSet && activeSet.inStock ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("qty")}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </Button>
            <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQty((q) => Math.min(maxQty || 999, q + 1))}
              disabled={maxQty > 0 && qty >= maxQty}
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Total + CTA */}
      {activeSet && activeSet.inStock ? (
        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("yourPrice")}</p>
            <p className="text-lg font-bold text-primary">{formatNpr(lineTotal)}</p>
            {activeSet ? (
              <p className="text-[11px] text-muted-foreground">
                {qty} {t("setUnit")} × {formatNpr(activeSet.effectivePricePaisa)}
              </p>
            ) : null}
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
      ) : (
        <Alert>
          <AlertDescription>{t("outOfStock")}</AlertDescription>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
