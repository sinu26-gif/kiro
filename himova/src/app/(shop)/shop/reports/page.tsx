import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Reports" };

export default async function ShopReportsPage() {
  await requireRole(["shopkeeper"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("reportsShopTitle")}
      description={t("reportsShopBody")}
      milestone={t("milestone")}
      backHref="/shop"
      backLabel={t("back")}
    />
  );
}
