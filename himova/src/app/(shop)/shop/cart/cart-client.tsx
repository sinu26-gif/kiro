"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { ImageIcon, Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { removeCartItem, updateCartItem } from "@/app/actions/cart";
import { placeOrder, type PlaceOrderState } from "@/app/actions/orders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNpr } from "@/lib/format";
import type { CartLine } from "@/lib/cart";

const initialOrderState: PlaceOrderState = { ok: false };

export function CartClient({
  lines,
  subtotalPaisa,
  totalSets,
}: {
  lines: CartLine[];
  subtotalPaisa: number;
  totalSets: number;
}) {
  const t = useTranslations("cart");

  if (lines.length === 0) {
    return (
      <Card className="border-dashed bg-card/60 p-10 text-center">
        <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{t("empty")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/shop/catalog">{t("browseCatalog")}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {lines.map((line) => (
          <CartRow key={line.cartItemId} line={line} />
        ))}
      </div>
      <CheckoutCard subtotalPaisa={subtotalPaisa} totalSets={totalSets} />
    </div>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const t = useTranslations("cart");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(line.quantity);

  function changeQty(next: number) {
    const clamped = Math.max(1, Math.min(next, Math.max(line.warehouseStock, 1)));
    setQty(clamped);
    start(async () => {
      const fd = new FormData();
      fd.set("cartItemId", line.cartItemId);
      fd.set("quantity", String(clamped));
      await updateCartItem(null, fd);
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const fd = new FormData();
      fd.set("cartItemId", line.cartItemId);
      await removeCartItem(null, fd);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex gap-3 p-3">
        <Link
          href={`/shop/catalog/${line.productId}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted"
        >
          {line.thumbnailUrl ? (
            <Image
              src={line.thumbnailUrl}
              alt={line.productName}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" aria-hidden />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/shop/catalog/${line.productId}`}
            className="line-clamp-1 font-medium hover:underline"
          >
            {line.productName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {line.variantName} · {line.label} ({line.sizes.join(", ")})
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-semibold">{formatNpr(line.unitPricePaisa)}</span>
            <span className="text-xs text-muted-foreground">{t("unitPrice")}</span>
            {line.priceNote ? (
              <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                {line.priceNote}
              </Badge>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => changeQty(qty - 1)}
                disabled={pending || qty <= 1}
                aria-label="Decrease"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => changeQty(qty + 1)}
                disabled={pending || qty >= line.warehouseStock}
                aria-label="Increase"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">{formatNpr(line.unitPricePaisa * qty)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={remove}
                disabled={pending}
                aria-label={t("remove")}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckoutButton() {
  const t = useTranslations("cart");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="tap" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />
      )}
      {pending ? t("placing") : t("placeOrder")}
    </Button>
  );
}

function CheckoutCard({
  subtotalPaisa,
  totalSets,
}: {
  subtotalPaisa: number;
  totalSets: number;
}) {
  const t = useTranslations("cart");
  const [state, action] = useFormState(placeOrder, initialOrderState);

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-base">{t("checkout")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("totalSets")}</span>
            <span className="font-medium tabular-nums">{totalSets}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-3 text-sm">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="text-lg font-bold text-primary">{formatNpr(subtotalPaisa)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
            <NativeSelect id="paymentMethod" name="paymentMethod" defaultValue="cod">
              <option value="cod">{t("cod")}</option>
              <option value="bank">{t("bank")}</option>
              <option value="esewa">{t("esewa")}</option>
              <option value="khalti">{t("khalti")}</option>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder={t("notesPlaceholder")} />
          </div>

          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <CheckoutButton />
        </form>
      </CardContent>
    </Card>
  );
}
