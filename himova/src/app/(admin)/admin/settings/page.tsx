import { useTranslations } from "next-intl";

import { getSessionUser, requireRole } from "@/lib/auth/session";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const user = await getSessionUser();
  return <View email={user?.email ?? "—"} name={user?.fullName ?? "—"} />;
}

function View({ email, name }: { email: string; name: string }) {
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
          <Row label={t("ownerName")} value={name} />
          <Row label={t("email")} value={email} />
          <Row label={t("role")} value="Admin" />
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
