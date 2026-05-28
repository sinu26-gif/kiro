import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Customers" };

export default async function ShopCustomersPage() {
  await requireRole(["shopkeeper"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("customersShopTitle")}
      description={t("customersShopBody")}
      milestone={t("milestone")}
      backHref="/shop"
      backLabel={t("back")}
    />
  );
}
