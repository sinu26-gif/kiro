import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Receipt,
  ShoppingBag,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LandingPage() {
  let session: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    session = await getSessionUser();
  } catch {
    session = null;
  }

  return <LandingView session={session} />;
}

function LandingView({
  session,
}: {
  session: Awaited<ReturnType<typeof getSessionUser>> | null;
}) {
  const t = useTranslations();

  const features = [
    {
      icon: ShoppingBag,
      title: t("landing.featureOrderTitle"),
      body: t("landing.featureOrderBody"),
      tone: "from-emerald-500/15 to-emerald-500/0",
    },
    {
      icon: Receipt,
      title: t("landing.featurePosTitle"),
      body: t("landing.featurePosBody"),
      tone: "from-sky-500/15 to-sky-500/0",
    },
    {
      icon: Trophy,
      title: t("landing.featureLeaderboardTitle"),
      body: t("landing.featureLeaderboardBody"),
      tone: "from-amber-500/15 to-amber-500/0",
    },
  ];

  const stats = [
    {
      icon: Wallet,
      label: t("landing.statFreeLabel"),
      value: t("landing.statFreeValue"),
    },
    {
      icon: Zap,
      label: t("landing.statFastLabel"),
      value: t("landing.statFastValue"),
    },
    {
      icon: Sparkles,
      label: t("landing.statBilingualLabel"),
      value: t("landing.statBilingualValue"),
    },
  ];

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-hero-glow" />
        <div className="container flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-accent-foreground shadow-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {t("common.tagline")}
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            {t("landing.heroSubtitle")}
          </p>

          {session ? (
            <SignedInActions
              role={session.role}
              name={session.fullName ?? null}
            />
          ) : (
            <SignedOutActions />
          )}
        </div>
      </section>

      {/* Stats / trust strip */}
      <section className="container">
        <div className="grid gap-3 rounded-2xl border bg-card/60 p-4 shadow-soft sm:grid-cols-3 sm:p-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{value}</p>
                <p className="truncate text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="container py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("landing.featuresTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t("landing.featuresSubtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body, tone }) => (
            <Card
              key={title}
              className="group overflow-hidden border-2 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300"
            >
              <div
                aria-hidden
                className={`pointer-events-none h-1 bg-gradient-to-r ${tone}`}
              />
              <CardHeader>
                <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="text-pretty">{body}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      {!session ? (
        <section className="container pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-soft sm:p-12">
            <div aria-hidden className="absolute inset-0 -z-10 bg-hero-glow" />
            <h3 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.ctaTitle")}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
              {t("landing.ctaSubtitle")}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="tap">
                <Link href="/login?as=shopkeeper">
                  {t("landing.shopkeeperLogin")}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="tap" variant="outline">
                <Link href="/leaderboard">{t("landing.viewLeaderboard")}</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SignedOutActions() {
  const t = useTranslations("landing");
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild size="tap" className="shadow-soft">
        <Link href="/login?as=shopkeeper">
          {t("shopkeeperLogin")}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Link>
      </Button>
      <Button asChild size="tap" variant="outline">
        <Link href="/login?as=admin">{t("adminLogin")}</Link>
      </Button>
      <Button asChild size="tap" variant="ghost">
        <Link href="/leaderboard">{t("viewLeaderboard")}</Link>
      </Button>
    </div>
  );
}

function SignedInActions({ role, name }: { role: "admin" | "shopkeeper"; name: string | null }) {
  const t = useTranslations("landing");
  const homeHref = role === "admin" ? "/admin" : "/shop";
  const homeLabel =
    role === "admin" ? t("continueAsAdmin") : t("continueAsShopkeeper");
  const greeting = name ? t("greetingNamed", { name }) : t("greeting");

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="tap" className="shadow-soft">
          <Link href={homeHref}>
            {homeLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild size="tap" variant="ghost">
          <Link href="/leaderboard">{t("viewLeaderboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
