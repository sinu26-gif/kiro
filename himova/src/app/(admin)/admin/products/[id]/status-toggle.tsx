"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore } from "lucide-react";

import { setProductStatus } from "@/app/actions/products";
import { Button } from "@/components/ui/button";

/**
 * Toggle a product between 'active' and 'archived'.
 * Used on the edit page header and in the list-page action menu.
 */
export function StatusToggleButton({
  productId,
  currentStatus,
  variant = "outline",
  size = "default",
}: {
  productId: string;
  currentStatus: "active" | "archived";
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "tap" | "icon";
}) {
  const t = useTranslations("products.actions");
  const [pending, start] = useTransition();
  const nextStatus = currentStatus === "active" ? "archived" : "active";
  const Icon = currentStatus === "active" ? Archive : ArchiveRestore;
  const label = currentStatus === "active" ? t("archive") : t("restore");

  return (
    <form
      action={() => {
        start(() => {
          const fd = new FormData();
          fd.set("productId", productId);
          fd.set("status", nextStatus);
          void setProductStatus(null, fd);
        });
      }}
    >
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        <Icon className="mr-2 h-4 w-4" aria-hidden />
        {label}
      </Button>
    </form>
  );
}
