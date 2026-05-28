import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Settings" };

export default async function ShopSettingsPage() {
  await requireRole(["shopkeeper"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("settingsShopTitle")}
      description={t("settingsShopBody")}
      milestone={t("milestone")}
      backHref="/shop"
      backLabel={t("back")}
    />
  );
}
