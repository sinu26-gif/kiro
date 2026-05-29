"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Gift, Loader2, Plus, X } from "lucide-react";

import { createRewardCycle } from "@/app/actions/rewards";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";

export type RewardCandidate = { id: string; name: string };

type WinnerRow = {
  shopkeeperId: string;
  rewardType: "discount_percent" | "free_set" | "custom_item";
  rewardValue: string;
};

function defaultCycleLabel(): string {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function RewardForm({ candidates }: { candidates: RewardCandidate[] }) {
  const t = useTranslations("rewards");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cycleLabel, setCycleLabel] = useState(defaultCycleLabel());
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-seed up to 3 winners from the top candidates.
  const [winners, setWinners] = useState<WinnerRow[]>(() =>
    candidates.slice(0, 3).map((c) => ({
      shopkeeperId: c.id,
      rewardType: "discount_percent" as const,
      rewardValue: "",
    }))
  );

  function update(i: number, patch: Partial<WinnerRow>) {
    setWinners((prev) => prev.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }
  function addRow() {
    const used = new Set(winners.map((w) => w.shopkeeperId));
    const next = candidates.find((c) => !used.has(c.id));
    setWinners((prev) => [
      ...prev,
      { shopkeeperId: next?.id ?? candidates[0]?.id ?? "", rewardType: "discount_percent", rewardValue: "" },
    ]);
  }
  function removeRow(i: number) {
    setWinners((prev) => prev.filter((_, j) => j !== i));
  }

  function submit() {
    setError(null);
    const valid = winners.filter((w) => w.shopkeeperId && w.rewardValue.trim());
    if (valid.length === 0) {
      setError(t("rewardValuePlaceholder"));
      return;
    }
    const payload = valid.map((w, i) => ({
      shopkeeperId: w.shopkeeperId,
      rank: i + 1,
      rewardType: w.rewardType,
      rewardValue: w.rewardValue.trim(),
    }));
    start(async () => {
      const fd = new FormData();
      fd.set("cycleLabel", cycleLabel);
      fd.set("winners", JSON.stringify(payload));
      const res = await createRewardCycle(null, fd);
      if (!res.ok) setError(res.error ?? "Could not announce rewards.");
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (candidates.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="cycleLabel">{t("cycleLabel")}</Label>
        <Input
          id="cycleLabel"
          value={cycleLabel}
          onChange={(e) => setCycleLabel(e.target.value)}
          placeholder={t("cycleLabelPlaceholder")}
        />
      </div>

      <div className="space-y-3">
        {winners.map((w, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_140px_1fr_auto] sm:items-end">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {i + 1}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("pickShopkeeper")}</Label>
              <NativeSelect
                value={w.shopkeeperId}
                onChange={(e) => update(i, { shopkeeperId: e.currentTarget.value })}
                className="h-9"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("rewardType")}</Label>
              <NativeSelect
                value={w.rewardType}
                onChange={(e) =>
                  update(i, { rewardType: e.currentTarget.value as WinnerRow["rewardType"] })
                }
                className="h-9"
              >
                <option value="discount_percent">{t("discountPercent")}</option>
                <option value="free_set">{t("freeSet")}</option>
                <option value="custom_item">{t("customItem")}</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("rewardValue")}</Label>
              <Input
                value={w.rewardValue}
                onChange={(e) => update(i, { rewardValue: e.target.value })}
                placeholder={t("rewardValuePlaceholder")}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(i)}
              aria-label="Remove"
              className="text-destructive"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {winners.length < candidates.length ? (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {t("addWinner")}
          </Button>
        ) : null}
        <Button onClick={submit} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : done ? (
            <Check className="mr-2 h-4 w-4" aria-hidden />
          ) : (
            <Gift className="mr-2 h-4 w-4" aria-hidden />
          )}
          {pending ? t("announcing") : t("announce")}
        </Button>
      </div>

      {done ? (
        <Alert variant="success">
          <Check className="h-4 w-4" aria-hidden />
          <AlertDescription>{t("announced")}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
