"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

export type CatalogCategory = { id: string; name: string; slug: string };

/**
 * Catalog search + category filter. Pushes state into URL search params so the
 * server page re-fetches matching products.
 */
export function CatalogSearchBar({
  categories,
  initialQuery,
  initialCategory,
}: {
  categories: CatalogCategory[];
  initialQuery: string;
  initialCategory: string;
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const queryRef = useRef<HTMLInputElement>(null);

  function pushParams(next: { q?: string; category?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.category !== undefined) {
      if (next.category) params.set("category", next.category);
      else params.delete("category");
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `?${qs}` : "?"));
  }

  const hasFilters = initialQuery !== "" || initialCategory !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        pushParams({ q: queryRef.current?.value.trim() ?? "" });
      }}
      className="grid gap-3 rounded-xl border bg-card p-3 shadow-soft sm:grid-cols-[1fr_auto_auto]"
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
        aria-label={t("allCategories")}
        className="min-w-[160px]"
      >
        <option value="">{t("allCategories")}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </NativeSelect>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          <Search className="mr-1.5 h-4 w-4" aria-hidden />
          {t("search")}
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (queryRef.current) queryRef.current.value = "";
              startTransition(() => router.replace("?"));
            }}
            aria-label="Clear"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
