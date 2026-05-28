import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CreateShopkeeperForm } from "./create-form";

export const metadata = { title: "New shopkeeper" };

export default async function NewShopkeeperPage() {
  await requireRole(["admin"]);
  return <NewShopkeeperView />;
}

function NewShopkeeperView() {
  const t = useTranslations("shopkeepers");
  const tc = useTranslations("common");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/shopkeepers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {tc("back")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("newTitle")}</CardTitle>
          <CardDescription>{t("newSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateShopkeeperForm />
        </CardContent>
      </Card>
    </div>
  );
}
