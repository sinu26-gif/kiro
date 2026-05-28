import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Warehouse stock" };

export default async function AdminStockPage() {
  await requireRole(["admin"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("stockAdminTitle")}
      description={t("stockAdminBody")}
      milestone={t("milestone")}
      backHref="/admin"
      backLabel={t("back")}
    />
  );
}
