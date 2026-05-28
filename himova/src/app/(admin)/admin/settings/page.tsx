import { useTranslations } from "next-intl";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  return <View />;
}

function View() {
  const t = useTranslations("comingSoon");
  return (
    <ComingSoon
      title={t("settingsAdminTitle")}
      description={t("settingsAdminBody")}
      milestone={t("milestone")}
      backHref="/admin"
      backLabel={t("back")}
    />
  );
}
