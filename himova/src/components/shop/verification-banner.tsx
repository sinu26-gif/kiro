import { useTranslations } from "next-intl";
import { Check, Clock, ShieldCheck } from "lucide-react";

import type { ShopkeeperStatus } from "@/lib/shopkeeper";
import { cn } from "@/lib/utils";

/**
 * Daraz Seller Center-style verification status banner shown at the top of the
 * shopkeeper home while their account is pending (or suspended). Renders
 * nothing for active accounts.
 */
export function VerificationBanner({ status }: { status: ShopkeeperStatus }) {
  const t = useTranslations("verifyBanner");

  if (status === "active") return null;

  if (status === "suspended") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <p className="font-semibold text-destructive">{t("suspendedTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("suspendedBody")}</p>
      </div>
    );
  }

  // pending — show a 3-step progress tracker.
  const steps = [
    { label: t("step1"), done: true, current: false, icon: Check },
    { label: t("step2"), done: false, current: true, icon: Clock },
    { label: t("step3"), done: false, current: false, icon: ShieldCheck },
  ];

  return (
    <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
          <Clock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{t("pendingTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("pendingBody")}</p>
        </div>
      </div>

      {/* Step tracker */}
      <div className="mt-4 flex items-center">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : step.current
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="mt-1 max-w-[90px] text-[10px] leading-tight text-muted-foreground">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded",
                    step.done ? "bg-primary" : "bg-muted"
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
