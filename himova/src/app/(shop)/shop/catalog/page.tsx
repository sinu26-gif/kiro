import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Catalog" };

export default async function ShopCatalogPage() {
  await requireRole(["shopkeeper"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("catalogShopTitle")}
      description={t("catalogShopBody")}
      milestone={t("milestone")}
      backHref="/shop"
      backLabel={t("back")}
    />
  );
}
