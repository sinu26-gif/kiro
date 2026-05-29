"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";

import { deleteShopkeeper, verifyShopkeeper } from "@/app/actions/shopkeepers";
import { Button } from "@/components/ui/button";

/**
 * Inline verify / reject buttons for a pending shopkeeper row.
 */
export function PendingActions({ shopkeeperId }: { shopkeeperId: string }) {
  const t = useTranslations("shopkeepers");
  const router = useRouter();
  const [pending, start] = useTransition();

  function verify() {
    start(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      await verifyShopkeeper(null, fd);
      router.refresh();
    });
  }

  function reject() {
    if (!confirm(t("confirmReject"))) return;
    start(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      await deleteShopkeeper(null, fd);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" onClick={verify} disabled={pending}>
        {pending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
        )}
        {t("verify")}
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={reject} disabled={pending}>
        <X className="mr-1 h-3.5 w-3.5" aria-hidden />
        {t("reject")}
      </Button>
    </div>
  );
}
