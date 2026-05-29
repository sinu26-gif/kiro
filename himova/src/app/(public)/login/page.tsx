import { useTranslations } from "next-intl";

import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminLoginForm } from "./admin-form";
import { ShopkeeperLoginForm } from "./shopkeeper-form";

export const metadata = {
  title: "Log in",
};

type LoginSearchParams = {
  as?: string | string[];
  next?: string | string[];
};

function resolveDefaultTab(asParam: LoginSearchParams["as"]): "shopkeeper" | "admin" {
  const value = Array.isArray(asParam) ? asParam[0] : asParam;
  return value === "admin" ? "admin" : "shopkeeper";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: LoginSearchParams;
}) {
  const defaultTab = resolveDefaultTab(searchParams?.as);
  return <LoginPageView defaultTab={defaultTab} />;
}

function LoginPageView({ defaultTab }: { defaultTab: "shopkeeper" | "admin" }) {
  const t = useTranslations("auth");
  const tx = useTranslations("loginExtra");

  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[60vh] bg-hero-glow" />
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center sm:hidden">
            <Logo size="md" />
          </div>
          <Card className="border shadow-lift">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl tracking-tight sm:text-3xl">
                {t("loginTitle")}
              </CardTitle>
              <CardDescription>{t("loginSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="shopkeeper">{t("shopkeeperTab")}</TabsTrigger>
                  <TabsTrigger value="admin">{t("adminTab")}</TabsTrigger>
                </TabsList>
                <TabsContent value="shopkeeper">
                  <ShopkeeperLoginForm />
                </TabsContent>
                <TabsContent value="admin">
                  <AdminLoginForm />
                </TabsContent>
              </Tabs>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                {t("needHelp")}
              </p>
              <div className="mt-4 rounded-lg border bg-accent/40 p-3 text-center">
                <p className="text-sm text-muted-foreground">{tx("newHere")}</p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/register">{tx("registerCta")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
