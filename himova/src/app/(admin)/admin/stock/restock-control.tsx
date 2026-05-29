"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus } from "lucide-react";

import { restockSetType } from "@/app/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Inline "+ Restock" control for a set type row on the admin stock page.
 * Expands into an amount + note input; submits a signed delta.
 */
export function RestockControl({ setTypeId }: { setTypeId: string }) {
  const t = useTranslations("warehouseStock");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("setTypeId", setTypeId);
      fd.set("delta", amount);
      fd.set("note", note);
      const res = await restockSetType(null, fd);
      if (!res.ok) {
        setError(res.error ?? "Could not adjust.");
      } else {
        setAmount("");
        setNote("");
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
        {t("restock")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          inputMode="numeric"
          placeholder={t("amountPlaceholder")}
          className="h-8 w-28"
          autoFocus
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className="h-8 w-32"
        />
        <Button size="icon" className="h-8 w-8" onClick={submit} disabled={pending} aria-label={t("apply")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
    </div>
  );
}
