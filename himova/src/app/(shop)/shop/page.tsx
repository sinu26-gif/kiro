import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Package,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getShopkeeperContext, type ShopkeeperStatus } from "@/lib/shopkeeper";
import { VerificationBanner } from "@/components/shop/verification-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Home" };

export default async function ShopHomePage() {
  const user = await requireRole(["shopkeeper"]);
  const greetingName = user.fullName ?? "Shopkeeper";
  let status: ShopkeeperStatus = "active";
  try {
    const ctx = await getShopkeeperContext();
    if (ctx) status = ctx.status;
  } catch {
    status = "active";
  }
  return <ShopHomeView name={greetingName} status={status} />;
}

function ShopHomeView({ name, status }: { name: string; status: ShopkeeperStatus }) {
  const t = useTranslations("shopHome");
  const tNav = useTranslations("shopNav");

  const quick = [
    { label: tNav("catalog"), href: "/shop/catalog", icon: ShoppingBag, tone: "from-emerald-500/15 to-emerald-500/0" },
    { label: tNav("pos"), href: "/shop/pos", icon: Receipt, tone: "from-sky-500/15 to-sky-500/0" },
    { label: tNav("orders"), href: "/shop/orders", icon: Package, tone: "from-violet-500/15 to-violet-500/0" },
    { label: tNav("leaderboard"), href: "/shop/leaderboard", icon: TrendingUp, tone: "from-amber-500/15 to-amber-500/0" },
  ];

  const sections = [
    { key: "newArrivals", title: t("newArrivals") },
    { key: "bestSellers", title: t("bestSellers") },
    { key: "recommended", title: t("recommended") },
    { key: "previousOrders", title: t("previousOrders") },
  ];

  return (
    <div className="space-y-8">
      <VerificationBanner status={status} />

      {/* Greeting hero */}
      <Card className="overflow-hidden border-2 bg-card">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -z-10 bg-hero-glow" />
          <CardHeader className="pb-4">
            <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("welcomeKicker")}
            </CardDescription>
            <CardTitle className="text-2xl tracking-tight sm:text-3xl">
              {t("greeting", { name })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          </CardHeader>
        </div>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quick.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${q.tone}`}
                  />
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="relative mt-3 flex items-center justify-between">
                    <span className="font-medium">{q.label}</span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Curated sections (placeholders until catalog ships) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.key} className="border-dashed bg-card/60">
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
