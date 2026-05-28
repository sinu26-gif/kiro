import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireRole(["admin"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("reportsAdminTitle")}
      description={t("reportsAdminBody")}
      milestone={t("milestone")}
      backHref="/admin"
      backLabel={t("back")}
    />
  );
}
