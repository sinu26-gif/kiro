import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  await requireRole(["shopkeeper"]);
  return <WelcomeView />;
}

function WelcomeView() {
  const t = useTranslations("auth");
  return (
    <div className="mx-auto max-w-md py-6">
      <Card className="border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("welcomeTitle")}</CardTitle>
          <CardDescription>{t("welcomeBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
