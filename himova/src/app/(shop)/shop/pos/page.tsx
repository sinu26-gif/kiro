import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "POS" };

export default async function ShopPosPage() {
  await requireRole(["shopkeeper"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("posShopTitle")}
      description={t("posShopBody")}
      milestone={t("milestone")}
      backHref="/shop"
      backLabel={t("back")}
    />
  );
}
