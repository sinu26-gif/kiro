import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Home" };

export default async function ShopHomePage() {
  const user = await requireRole(["shopkeeper"]);
  const greetingName = user.fullName ?? "Shopkeeper";

  return <ShopHomeView name={greetingName} />;
}

function ShopHomeView({ name }: { name: string }) {
  const t = useTranslations("shopHome");

  const sections = [
    { key: "newArrivals", title: t("newArrivals") },
    { key: "bestSellers", title: t("bestSellers") },
    { key: "recommended", title: t("recommended") },
    { key: "previousOrders", title: t("previousOrders") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("greeting", { name })}</h1>
        <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.key} className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
              <CardDescription>{t("emptyState")}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
