"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Check,
  ImageIcon,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { recordPosSale } from "@/app/actions/pos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatNpr, parseNprToPaisa } from "@/lib/format";
import type { PosProduct } from "@/lib/pos";

type SaleLine = {
  uid: string;
  kind: "himova" | "custom";
  variantId: string | null;
  customProductId: string | null;
  size: string | null;
  title: string;
  subtitle: string;
  quantity: number;
  unitPricePaisa: number;
  maxStock: number;
};

type Payment = { method: "cash" | "esewa" | "khalti" | "other"; amount: string };

let uidCounter = 0;
const nextUid = () => `line-${Date.now()}-${uidCounter++}`;

export function PosTerminal({ products }: { products: PosProduct[] }) {
  const t = useTranslations("pos");
  const router = useRouter();
  const [pending, start] = useTransition();

  const [search, setSearch] = useState("");
  const [sizePickerFor, setSizePickerFor] = useState<string | null>(null);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payments, setPayments] = useState<Payment[]>([{ method: "cash", amount: "" }]);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.productName.toLowerCase().includes(q));
  }, [products, search]);

  const subtotalPaisa = lines.reduce((s, l) => s + l.unitPricePaisa * l.quantity, 0);
  const discountPaisa = Math.min(parseNprToPaisa(discount) ?? 0, subtotalPaisa);
  const totalPaisa = subtotalPaisa - discountPaisa;
  const paidPaisa = payments.reduce((s, p) => s + (parseNprToPaisa(p.amount) ?? 0), 0);
  const duePaisa = Math.max(0, totalPaisa - paidPaisa);
  const changePaisa = Math.max(0, paidPaisa - totalPaisa);

  function addLine(line: Omit<SaleLine, "uid" | "quantity">) {
    setError(null);
    setLines((prev) => {
      // Merge with an existing identical line.
      const existing = prev.find(
        (l) =>
          l.kind === line.kind &&
          l.variantId === line.variantId &&
          l.customProductId === line.customProductId &&
          l.size === line.size
      );
      if (existing) {
        return prev.map((l) =>
          l.uid === existing.uid
            ? { ...l, quantity: Math.min(l.maxStock, l.quantity + 1) }
            : l
        );
      }
      return [...prev, { ...line, uid: nextUid(), quantity: 1 }];
    });
  }

  function onProductTap(p: PosProduct) {
    if (p.kind === "custom") {
      addLine({
        kind: "custom",
        variantId: null,
        customProductId: p.customProductId ?? null,
        size: null,
        title: p.productName,
        subtitle: "",
        unitPricePaisa: p.suggestedPricePaisa,
        maxStock: p.customStock ?? 9999,
      });
    } else {
      setSizePickerFor((cur) => (cur === p.key ? null : p.key));
    }
  }

  function onSizeTap(p: PosProduct, size: string, stock: number) {
    addLine({
      kind: "himova",
      variantId: p.key,
      customProductId: null,
      size,
      title: p.productName,
      subtitle: `${p.variantName ?? ""} · ${size}`.trim(),
      unitPricePaisa: p.suggestedPricePaisa,
      maxStock: stock,
    });
    setSizePickerFor(null);
  }

  function updateLine(uid: string, patch: Partial<SaleLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function removeLine(uid: string) {
    setLines((prev) => prev.filter((l) => l.uid !== uid));
  }

  function resetSale() {
    setLines([]);
    setDiscount("");
    setCustomerName("");
    setCustomerPhone("");
    setPayments([{ method: "cash", amount: "" }]);
    setError(null);
  }

  function complete() {
    setError(null);
    if (lines.length === 0) {
      setError(t("saleEmpty"));
      return;
    }
    if (paidPaisa < totalPaisa) {
      setError(t("mustCoverTotal"));
      return;
    }

    const payload = {
      lines: lines.map((l) => ({
        kind: l.kind,
        variantId: l.variantId,
        customProductId: l.customProductId,
        size: l.size,
        quantity: l.quantity,
        unitPricePaisa: l.unitPricePaisa,
      })),
      payments: payments
        .filter((p) => (parseNprToPaisa(p.amount) ?? 0) > 0)
        .map((p) => ({ method: p.method, amountPaisa: parseNprToPaisa(p.amount) ?? 0 })),
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      discountPaisa,
    };

    start(async () => {
      const res = await recordPosSale(JSON.stringify(payload));
      if (!res.ok || !res.saleId) {
        setError(res.error ?? "Could not complete the sale.");
      } else {
        router.push(`/shop/pos/receipt/${res.saleId}`);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Product grid */}
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="border-dashed bg-card/60 p-10 text-center">
            <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">
              {products.length === 0 ? t("empty") : t("noResults")}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => (
              <div key={p.key}>
                <button
                  type="button"
                  onClick={() => onProductTap(p)}
                  className="group w-full overflow-hidden rounded-xl border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative aspect-square bg-muted">
                    {p.thumbnailUrl ? (
                      <Image
                        src={p.thumbnailUrl}
                        alt={p.productName}
                        fill
                        sizes="160px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-7 w-7" aria-hidden />
                      </span>
                    )}
                    {p.kind === "custom" ? (
                      <span className="absolute left-1.5 top-1.5">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          custom
                        </Badge>
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-1 text-xs font-medium">{p.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.variantName ?? ""}
                    </p>
                    <p className="text-xs font-semibold text-primary">
                      {formatNpr(p.suggestedPricePaisa)}
                    </p>
                  </div>
                </button>

                {/* Size picker */}
                {sizePickerFor === p.key && p.kind === "himova" ? (
                  <div className="mt-2 rounded-lg border bg-card p-2">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      {t("pickSize")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.sizes.map((s) => (
                        <button
                          key={s.size}
                          type="button"
                          onClick={() => onSizeTap(p, s.size, s.quantity)}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        >
                          <span className="font-medium">{s.size}</span>
                          <span className="ml-1 text-muted-foreground">({s.quantity})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sale panel */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            {t("sale")}
            {lines.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={resetSale}>
                <X className="mr-1 h-4 w-4" aria-hidden />
                {t("cancel")}
              </Button>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("saleEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.uid} className="rounded-lg border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">{l.title}</p>
                      {l.subtitle ? (
                        <p className="text-[11px] text-muted-foreground">{l.subtitle}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.uid)}
                      className="text-destructive"
                      aria-label={t("remove")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateLine(l.uid, { quantity: Math.max(1, l.quantity - 1) })}
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" aria-hidden />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {l.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateLine(l.uid, { quantity: Math.min(l.maxStock, l.quantity + 1) })
                        }
                        disabled={l.quantity >= l.maxStock}
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" aria-hidden />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">Rs</span>
                      <Input
                        value={String(l.unitPricePaisa / 100)}
                        onChange={(e) =>
                          updateLine(l.uid, {
                            unitPricePaisa: parseNprToPaisa(e.target.value) ?? 0,
                          })
                        }
                        type="number"
                        inputMode="decimal"
                        className="h-7 w-20 text-right"
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-semibold tabular-nums">
                      {formatNpr(l.unitPricePaisa * l.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          {lines.length > 0 ? (
            <>
              <div className="space-y-1 border-t pt-3 text-sm">
                <Row label={t("subtotal")} value={formatNpr(subtotalPaisa)} />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("discount")}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">Rs</span>
                    <Input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-7 w-20 text-right"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-1.5">
                  <span className="font-medium">{t("total")}</span>
                  <span className="text-lg font-bold text-primary">{formatNpr(totalPaisa)}</span>
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("customerName")}
                  className="h-9"
                />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={t("customerPhone")}
                  type="tel"
                  inputMode="tel"
                  className="h-9"
                />
              </div>

              {/* Payments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("payments")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPayments((p) => [...p, { method: "cash", amount: "" }])}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("addPayment")}
                  </Button>
                </div>
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <NativeSelect
                      value={p.method}
                      onChange={(e) =>
                        setPayments((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, method: e.currentTarget.value as Payment["method"] } : x
                          )
                        )
                      }
                      className="h-9 w-28"
                    >
                      <option value="cash">{t("cash")}</option>
                      <option value="esewa">{t("esewa")}</option>
                      <option value="khalti">{t("khalti")}</option>
                      <option value="other">{t("other")}</option>
                    </NativeSelect>
                    <Input
                      value={p.amount}
                      onChange={(e) =>
                        setPayments((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x))
                        )
                      }
                      type="number"
                      inputMode="decimal"
                      placeholder={t("amount")}
                      className="h-9 flex-1 text-right"
                    />
                    {payments.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setPayments((prev) => prev.filter((_, j) => j !== i))}
                        className="text-destructive"
                        aria-label={t("remove")}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("paid")}</span>
                  <span className="font-medium tabular-nums">{formatNpr(paidPaisa)}</span>
                </div>
                {duePaisa > 0 ? (
                  <div className="flex items-center justify-between text-xs text-warning-foreground">
                    <span>{t("due")}</span>
                    <span className="font-medium tabular-nums">{formatNpr(duePaisa)}</span>
                  </div>
                ) : changePaisa > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("change")}</span>
                    <span className="font-medium tabular-nums">{formatNpr(changePaisa)}</span>
                  </div>
                ) : null}
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button onClick={complete} disabled={pending} size="tap" className="w-full">
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                )}
                {pending ? t("completing") : t("complete")}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
