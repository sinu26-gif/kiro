"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";

import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Toggle between English and Nepali.
 * Uses a server action to persist the choice in a cookie.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const currentLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === currentLocale) return;
    startTransition(() => {
      void setLocale(next);
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border bg-background p-1",
        className,
      )}
      role="group"
      aria-label={t("language")}
    >
      <Languages className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden />
      {locales.map((locale) => (
        <Button
          key={locale}
          variant={locale === currentLocale ? "default" : "ghost"}
          size="sm"
          onClick={() => switchTo(locale)}
          disabled={isPending}
          aria-pressed={locale === currentLocale}
          className="px-3"
        >
          {locale === "en" ? t("english") : t("nepali")}
        </Button>
      ))}
    </div>
  );
}
