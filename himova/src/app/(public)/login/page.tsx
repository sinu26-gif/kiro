import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminLoginForm } from "./admin-form";
import { ShopkeeperLoginForm } from "./shopkeeper-form";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  const t = useTranslations("auth");

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shopkeeper" className="w-full">
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
        </CardContent>
      </Card>
    </div>
  );
}
