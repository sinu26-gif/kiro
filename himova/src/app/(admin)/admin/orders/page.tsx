import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  await requireRole(["admin"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("ordersAdminTitle")}
      description={t("ordersAdminBody")}
      milestone={t("milestone")}
      backHref="/admin"
      backLabel={t("back")}
    />
  );
}
