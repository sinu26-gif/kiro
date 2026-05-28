import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingBag, Receipt, Trophy, ArrowRight } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LandingPage() {
  // Session-aware: if logged in, surface a "continue" CTA instead of login buttons.
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
      <section className="relative flex flex-col items-center gap-6 text-center">
        {/* Subtle gradient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl"
        />
        <span className="rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          {t("common.tagline")}
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          {t("landing.heroSubtitle")}
        </p>

        {/* Action area — different CTAs depending on session state */}
        {session ? (
          <SignedInActions
            role={session.role}
            name={session.fullName ?? null}
          />
        ) : (
          <SignedOutActions />
        )}
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <Card
            key={title}
            className="border-2 transition-shadow hover:shadow-md"
          >
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

function SignedOutActions() {
  const t = useTranslations("landing");
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild size="tap">
        <Link href="/login?as=shopkeeper">{t("shopkeeperLogin")}</Link>
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
        <Button asChild size="tap">
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
