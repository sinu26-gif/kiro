import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, KeyRound } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Change password" };

export default async function WelcomePage() {
  await requireRole(["shopkeeper"]);
  return <WelcomeView />;
}

function WelcomeView() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  return (
    <div className="mx-auto max-w-md space-y-4 py-2">
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {tc("back")}
      </Link>
      <Card className="border-2">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-2xl">{t("changePasswordTitle")}</CardTitle>
          <CardDescription>{t("changePasswordBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
