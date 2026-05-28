import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingBag, Receipt, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  const t = useTranslations();

  const features = [
    {
      icon: ShoppingBag,
      title: t("landing.featureOrderTitle"),
      body: t("landing.featureOrderBody"),
    },
    {
      icon: Receipt,
      title: t("landing.featurePosTitle"),
      body: t("landing.featurePosBody"),
    },
    {
      icon: Trophy,
      title: t("landing.featureLeaderboardTitle"),
      body: t("landing.featureLeaderboardBody"),
    },
  ];

  return (
    <div className="container flex flex-col gap-16 py-12 sm:py-20">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          {t("common.tagline")}
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          {t("landing.heroSubtitle")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="tap">
            <Link href="/login">{t("landing.shopkeeperLogin")}</Link>
          </Button>
          <Button asChild size="tap" variant="outline">
            <Link href="/admin/login">{t("landing.adminLogin")}</Link>
          </Button>
          <Button asChild size="tap" variant="ghost">
            <Link href="/leaderboard">{t("landing.viewLeaderboard")}</Link>
          </Button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="border-2">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </div>
  );
}
