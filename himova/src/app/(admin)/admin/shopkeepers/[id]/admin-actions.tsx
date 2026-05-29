"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Check, CheckCircle2, FileText, Loader2, Trash2 } from "lucide-react";

import {
  deleteShopkeeper,
  getDocumentUrl,
  updateShopkeeperStatus,
  verifyShopkeeper,
} from "@/app/actions/shopkeepers";
import { Button } from "@/components/ui/button";

type Status = "pending" | "active" | "suspended";

/**
 * Admin actions on a shopkeeper profile: view verification document, verify a
 * pending registration, activate/suspend, and delete.
 */
export function ShopkeeperAdminActions({
  shopkeeperId,
  status,
  hasDocument,
}: {
  shopkeeperId: string;
  status: Status;
  hasDocument: boolean;
}) {
  const t = useTranslations("shopkeepers");
  const td = useTranslations("shopkeeperDetail");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [docPending, setDocPending] = useState(false);

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  async function viewDocument() {
    setDocPending(true);
    try {
      const url = await getDocumentUrl(shopkeeperId);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else alert(t("noDocument"));
    } finally {
      setDocPending(false);
    }
  }

  function verify() {
    run(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      await verifyShopkeeper(null, fd);
    });
  }

  function toggleStatus(next: "active" | "suspended") {
    run(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      fd.set("status", next);
      await updateShopkeeperStatus(null, fd);
    });
  }

  function remove() {
    if (!confirm(t("confirmDelete"))) return;
    start(async () => {
      const fd = new FormData();
      fd.set("shopkeeperId", shopkeeperId);
      await deleteShopkeeper(null, fd);
      router.push("/admin/shopkeepers");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasDocument ? (
        <Button variant="outline" size="sm" onClick={viewDocument} disabled={docPending}>
          {docPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileText className="mr-1.5 h-4 w-4" aria-hidden />
          )}
          {t("viewDocument")}
        </Button>
      ) : null}

      {status === "pending" ? (
        <Button size="sm" onClick={verify} disabled={pending}>
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
          {t("verify")}
        </Button>
      ) : null}

      {status === "active" ? (
        <Button variant="outline" size="sm" onClick={() => toggleStatus("suspended")} disabled={pending}>
          <Ban className="mr-1.5 h-4 w-4" aria-hidden />
          {td("suspend")}
        </Button>
      ) : null}

      {status === "suspended" ? (
        <Button size="sm" onClick={() => toggleStatus("active")} disabled={pending}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
          {td("activate")}
        </Button>
      ) : null}

      <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={pending}>
        <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
        {t("delete")}
      </Button>
    </div>
  );
}
