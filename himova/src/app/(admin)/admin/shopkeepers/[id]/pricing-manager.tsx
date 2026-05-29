"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  removeShopkeeperPricing,
  setShopkeeperPricing,
} from "@/app/actions/pricing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatNpr } from "@/lib/format";

export type PricingSetOption = {
  setTypeId: string;
  productName: string;
  variantName: string;
  label: string;
  basePricePaisa: number;
};

export type ExistingOverride = {
  id: string;
  setTypeId: string;
  productName: string;
  variantName: string;
  label: string;
  basePricePaisa: number;
  overridePaisa: number | null;
  discountPercent: number | null;
  note: string | null;
};

export function PricingManager({
  shopkeeperId,
  setOptions,
  existing,
}: {
  shopkeeperId: string;
  setOptions: PricingSetOption[];
  existing: ExistingOverride[];
}) {
  const t = useTranslations("pricing");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [setTypeId, setSetTypeId] = useState(setOptions[0]?.setTypeId ?? "");
  const [mode, setMode] = useState<"percent" | "absolute">("percent");
  const [percent, setPercent] = useState("");
  const [absolute, setAbsolute] = useState("");
  const [note, setNote] = useState("");

  const selected = useMemo(
    () => setOptions.find((s) => s.setTypeId === setTypeId) ?? null,
    [setOptions, setTypeId]
  );

  function add() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      fd.set("setTypeId", setTypeId);
      fd.set("mode", mode);
      fd.set("percent", percent);
      fd.set("absolute", absolute);
      fd.set("note", note);
      const res = await setShopkeeperPricing(null, fd);
      if (!res.ok) setError(res.error ?? "Could not save.");
      else {
        setPercent("");
        setAbsolute("");
        setNote("");
        router.refresh();
      }
    });
  }

  function remove(pricingId: string) {
    start(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      fd.set("pricingId", pricingId);
      await removeShopkeeperPricing(null, fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Existing overrides */}
      {existing.length > 0 ? (
        <div className="space-y-2">
          {existing.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 font-medium">
                  {o.productName}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {o.variantName} · {o.label}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("base")}: {formatNpr(o.basePricePaisa)}
                  {o.note ? ` · ${o.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  {o.discountPercent != null
                    ? `${o.discountPercent}% ${t("off")}`
                    : formatNpr(o.overridePaisa ?? 0)}
                </Badge>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  className="text-destructive"
                  aria-label={t("remove")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noOverrides")}</p>
      )}

      {/* Add override */}
      {setOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSets")}</p>
      ) : (
        <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("set")}</Label>
              <NativeSelect
                value={setTypeId}
                onChange={(e) => setSetTypeId(e.currentTarget.value)}
                className="h-9"
              >
                {setOptions.map((s) => (
                  <option key={s.setTypeId} value={s.setTypeId}>
                    {s.productName} · {s.variantName} · {s.label} ({formatNpr(s.basePricePaisa)})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("type")}</Label>
              <NativeSelect
                value={mode}
                onChange={(e) => setMode(e.currentTarget.value as "percent" | "absolute")}
                className="h-9"
              >
                <option value="percent">{t("percentOff")}</option>
                <option value="absolute">{t("fixedPrice")}</option>
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {mode === "percent" ? (
              <div className="space-y-1">
                <Label className="text-xs">{t("percentLabel")}</Label>
                <Input
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 10"
                  className="h-9"
                />
                {selected && percent ? (
                  <p className="text-[11px] text-muted-foreground">
                    {formatNpr(
                      Math.round(selected.basePricePaisa * (1 - Number(percent || 0) / 100))
                    )}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">{t("priceLabel")}</Label>
                <Input
                  value={absolute}
                  onChange={(e) => setAbsolute(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 4000"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">{t("noteLabel")}</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                className="h-9"
              />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button size="sm" onClick={add} disabled={pending || !setTypeId}>
            {pending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {t("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
