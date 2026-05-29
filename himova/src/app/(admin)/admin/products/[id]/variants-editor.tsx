"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  createSetType,
  createVariant,
  deleteSetType,
  deleteVariant,
  renameVariant,
  updateSetType,
} from "@/app/actions/variants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { SET_TEMPLATES } from "@/lib/set-templates";
import { formatNpr } from "@/lib/format";

export type EditorSetType = {
  id: string;
  label: string;
  sizes: string[];
  pricePaisa: number;
  warehouseStock: number;
  reorderThreshold: number;
};

export type EditorVariant = {
  id: string;
  name: string;
  setTypes: EditorSetType[];
};

/**
 * Full variant + set-type management for the product edit page.
 * Each mutation calls a server action then refreshes the route so the
 * server component re-reads the updated rows.
 */
export function VariantsEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: EditorVariant[];
}) {
  const t = useTranslations("products.variants");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addVariant() {
    if (!newName.trim()) return;
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("variantName", newName.trim());
      const res = await createVariant(null, fd);
      if (!res.ok) setError(res.error ?? "Could not add variant.");
      else {
        setNewName("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-4">
          {variants.map((v) => (
            <VariantBlock key={v.id} productId={productId} variant={v} />
          ))}
        </div>
      )}

      {/* Add variant */}
      <div className="rounded-lg border border-dashed bg-muted/20 p-4">
        <Label htmlFor="new-variant" className="mb-2 block">
          {t("addTitle")}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="new-variant"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("namePlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVariant();
              }
            }}
          />
          <Button onClick={addVariant} disabled={pending || !newName.trim()}>
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="mr-2 h-4 w-4" aria-hidden />
            )}
            {pending ? t("adding") : t("add")}
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function VariantBlock({
  productId,
  variant,
}: {
  productId: string;
  variant: EditorVariant;
}) {
  const t = useTranslations("products.variants");
  const ts = useTranslations("products.setTypes");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(variant.name);
  const [error, setError] = useState<string | null>(null);

  function saveName() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("variantId", variant.id);
      fd.set("variantName", name.trim());
      const res = await renameVariant(null, fd);
      if (!res.ok) setError(res.error ?? "Could not rename.");
      else {
        setEditingName(false);
        router.refresh();
      }
    });
  }

  function removeVariant() {
    if (!confirm(t("confirmDelete"))) return;
    start(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("variantId", variant.id);
      const res = await deleteVariant(null, fd);
      if (!res.ok) setError(res.error ?? "Could not delete.");
      else router.refresh();
    });
  }

  return (
    <Card className="border">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        {editingName ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 max-w-xs"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={saveName} disabled={pending} aria-label={t("save")}>
              <Check className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setName(variant.name);
                setEditingName(false);
              }}
              aria-label={t("cancel")}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <CardTitle className="flex items-center gap-2 text-base">
            {variant.name}
            <Badge variant="muted">
              {t("setsCount", { count: variant.setTypes.length })}
            </Badge>
          </CardTitle>
        )}

        {!editingName ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
              {t("rename")}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={removeVariant}
              disabled={pending}
              aria-label={t("delete")}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {/* Existing set types */}
        {variant.setTypes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{ts("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Set</th>
                  <th className="px-3 py-2 font-medium">{ts("sizesColumn")}</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">{ts("warehouseStock")}</th>
                  <th className="px-3 py-2 text-right font-medium">{ts("reorderAt")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {variant.setTypes.map((st) => (
                  <SetTypeRow key={st.id} productId={productId} setType={st} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add set type */}
        <AddSetTypeForm productId={productId} variantId={variant.id} />
      </CardContent>
    </Card>
  );
}

function SetTypeRow({
  productId,
  setType,
}: {
  productId: string;
  setType: EditorSetType;
}) {
  const ts = useTranslations("products.setTypes");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(setType.pricePaisa / 100));
  const [stock, setStock] = useState(String(setType.warehouseStock));
  const [reorder, setReorder] = useState(String(setType.reorderThreshold));

  const isLow = setType.warehouseStock <= setType.reorderThreshold;

  function save() {
    start(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("setTypeId", setType.id);
      fd.set("price", price);
      fd.set("warehouseStock", stock);
      fd.set("reorderThreshold", reorder);
      const res = await updateSetType(null, fd);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm(ts("confirmDelete"))) return;
    start(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("setTypeId", setType.id);
      const res = await deleteSetType(null, fd);
      if (res.ok) router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-t bg-muted/20">
        <td className="px-3 py-2 font-medium">{setType.label}</td>
        <td className="px-3 py-2 text-muted-foreground">{setType.sizes.join(", ")}</td>
        <td className="px-3 py-2">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            inputMode="decimal"
            className="h-8 w-24 text-right"
          />
        </td>
        <td className="px-3 py-2">
          <Input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            type="number"
            inputMode="numeric"
            className="h-8 w-20 text-right"
          />
        </td>
        <td className="px-3 py-2">
          <Input
            value={reorder}
            onChange={(e) => setReorder(e.target.value)}
            type="number"
            inputMode="numeric"
            className="h-8 w-20 text-right"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={save} disabled={pending} aria-label={ts("save")}>
              <Check className="h-4 w-4" aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2 font-medium">{setType.label}</td>
      <td className="px-3 py-2 text-muted-foreground">{setType.sizes.join(", ")}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatNpr(setType.pricePaisa)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {setType.warehouseStock}
        {isLow ? (
          <Badge variant="warning" className="ml-1.5 px-1.5 py-0 text-[10px]">
            {ts("lowStock")}
          </Badge>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {setType.reorderThreshold}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label={ts("save")}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={remove}
            disabled={pending}
            aria-label={ts("delete")}
            className="text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddSetTypeForm({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const ts = useTranslations("products.setTypes");
  const tv = useTranslations("products.variants");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [sizes, setSizes] = useState("");
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [reorder, setReorder] = useState("");
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(templateId: string) {
    const tpl = SET_TEMPLATES.find((x) => x.id === templateId);
    if (!tpl) {
      setSizes("");
      setLabel("");
      return;
    }
    setSizes(tpl.sizes.join(", "));
    setLabel(tpl.label);
  }

  function reset() {
    setSizes("");
    setLabel("");
    setPrice("");
    setStock("");
    setReorder("");
    setError(null);
  }

  function submit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("variantId", variantId);
      fd.set("sizes", sizes);
      fd.set("label", label);
      fd.set("price", price);
      fd.set("warehouseStock", stock);
      fd.set("reorderThreshold", reorder);
      const res = await createSetType(null, fd);
      if (!res.ok) {
        setError(res.error ?? "Could not add set type.");
      } else {
        reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {ts("addTitle")}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{ts("templateLabel")}</Label>
          <NativeSelect defaultValue="" onChange={(e) => applyTemplate(e.currentTarget.value)}>
            <option value="">{ts("templateNone")}</option>
            {SET_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.label} ({tpl.sizes.join(", ")})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`label-${variantId}`}>
            {ts("labelLabel")}
          </Label>
          <Input
            id={`label-${variantId}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={ts("labelPlaceholder")}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs" htmlFor={`sizes-${variantId}`}>
          {ts("sizesLabel")}
        </Label>
        <Input
          id={`sizes-${variantId}`}
          value={sizes}
          onChange={(e) => setSizes(e.target.value)}
          placeholder={ts("sizesPlaceholder")}
          className="h-9"
        />
        <p className="text-[11px] text-muted-foreground">{ts("sizesHint")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`price-${variantId}`}>
            {ts("priceLabel")}
          </Label>
          <Input
            id={`price-${variantId}`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            inputMode="decimal"
            placeholder={ts("pricePlaceholder")}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`stock-${variantId}`}>
            {ts("stockLabel")}
          </Label>
          <Input
            id={`stock-${variantId}`}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`reorder-${variantId}`}>
            {ts("reorderLabel")}
          </Label>
          <Input
            id={`reorder-${variantId}`}
            value={reorder}
            onChange={(e) => setReorder(e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="5"
            className="h-9"
          />
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          {pending ? ts("adding") : ts("add")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          {tv("cancel")}
        </Button>
      </div>
    </div>
  );
}
