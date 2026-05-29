import { useTranslations } from "next-intl";

import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { RegisterForm } from "./register-form";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return <RegisterView />;
}

function RegisterView() {
  const t = useTranslations("register");
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[50vh] bg-hero-glow" />
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center sm:hidden">
            <Logo size="md" />
          </div>
          <Card className="border shadow-lift">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl tracking-tight">{t("title")}</CardTitle>
              <CardDescription>{t("subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
