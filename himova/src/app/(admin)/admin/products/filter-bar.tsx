"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterCategory = { id: string; name: string; slug: string };

const STATUS_OPTIONS = ["active", "archived", "all"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

const STATUS_LABEL_KEY: Record<StatusOption, "filterStatusActive" | "filterStatusArchived" | "filterStatusAll"> = {
  active: "filterStatusActive",
  archived: "filterStatusArchived",
  all: "filterStatusAll",
};

/**
 * Client-side filter bar that pushes its state into URL search params.
 * The server page re-reads the params and fetches the matching rows.
 */
export function ProductFilterBar({
  categories,
  initialQuery,
  initialCategory,
  initialStatus,
}: {
  categories: FilterCategory[];
  initialQuery: string;
  initialCategory: string;
  initialStatus: StatusOption;
}) {
  const t = useTranslations("products");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const queryRef = useRef<HTMLInputElement>(null);

  // Keep the input in sync if the URL changes externally.
  useEffect(() => {
    if (queryRef.current) queryRef.current.value = initialQuery;
  }, [initialQuery]);

  function pushParams(next: { q?: string; category?: string; status?: StatusOption }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.category !== undefined) {
      if (next.category) params.set("category", next.category);
      else params.delete("category");
    }
    if (next.status !== undefined) {
      if (next.status === "active") params.delete("status");
      else params.set("status", next.status);
    }

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?");
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushParams({ q: queryRef.current?.value.trim() ?? "" });
  }

  function clearAll() {
    if (queryRef.current) queryRef.current.value = "";
    startTransition(() => router.replace("?"));
  }

  const hasFilters =
    initialQuery !== "" || initialCategory !== "" || initialStatus !== "active";

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_auto_auto_auto]"
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={queryRef}
          name="q"
          defaultValue={initialQuery}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <NativeSelect
        defaultValue={initialCategory}
        onChange={(e) => pushParams({ category: e.currentTarget.value })}
        aria-label={t("table.category")}
        className="min-w-[160px]"
      >
        <option value="">{t("filterAll")}</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        defaultValue={initialStatus}
        onChange={(e) => pushParams({ status: e.currentTarget.value as StatusOption })}
        aria-label={t("table.status")}
        className="min-w-[140px]"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(STATUS_LABEL_KEY[opt])}
          </option>
        ))}
      </NativeSelect>

      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={isPending}>
          {t("table.name") /* "Name" — kept simple, button is mostly for keyboard users */}
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearAll}
            aria-label="Clear filters"
            className={cn(isPending && "opacity-50")}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
