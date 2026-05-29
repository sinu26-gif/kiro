import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatPhoneForDisplay } from "@/lib/auth/phone";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

type ShopInfo = { shop_name: string; owner_name: string; phone: string };

export default async function ShopSettingsPage() {
  await requireRole(["shopkeeper"]);
  let info: ShopInfo | null = null;
  try {
    const id = await getCurrentShopkeeperId();
    if (id) {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("shopkeepers")
        .select("shop_name, owner_name, phone")
        .eq("id", id)
        .maybeSingle();
      info = (data as ShopInfo) ?? null;
    }
  } catch {
    info = null;
  }
  return <View info={info} />;
}

function View({ info }: { info: ShopInfo | null }) {
  const t = useTranslations("settings");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row label={t("shopName")} value={info?.shop_name ?? "—"} />
          <Row label={t("ownerName")} value={info?.owner_name ?? "—"} />
          <Row label={t("phone")} value={info ? formatPhoneForDisplay(info.phone) : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("language")}</CardTitle>
          <CardDescription>{t("languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageToggle />
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
