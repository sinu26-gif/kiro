"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, CheckCircle2 } from "lucide-react";

import { updateShopkeeperStatus } from "@/app/actions/shopkeepers";
import { Button } from "@/components/ui/button";

/**
 * Activate / suspend a shopkeeper from their profile page.
 */
export function ShopkeeperStatusToggle({
  shopkeeperId,
  status,
}: {
  shopkeeperId: string;
  status: "active" | "suspended";
}) {
  const t = useTranslations("shopkeeperDetail");
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "active" ? "suspended" : "active";

  function toggle() {
    start(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      fd.set("status", next);
      await updateShopkeeperStatus(null, fd);
      router.refresh();
    });
  }

  return (
    <Button
      variant={status === "active" ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={pending}
    >
      {status === "active" ? (
        <>
          <Ban className="mr-1.5 h-4 w-4" aria-hidden />
          {t("suspend")}
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
          {t("activate")}
        </>
      )}
    </Button>
  );
}
