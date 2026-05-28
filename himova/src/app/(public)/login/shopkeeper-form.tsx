"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import { loginAsShopkeeper, type AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { ok: false };

function SubmitButton() {
  const t = useTranslations("auth");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="tap" disabled={pending} className="w-full">
      {pending ? t("loggingIn") : t("loginButton")}
    </Button>
  );
}

export function ShopkeeperLoginForm() {
  const t = useTranslations("auth");
  const [state, action] = useFormState(loginAsShopkeeper, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sk-phone">{t("phoneLabel")}</Label>
        <Input
          id="sk-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          required
        />
        <p className="text-xs text-muted-foreground">{t("phoneHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sk-password">{t("passwordLabel")}</Label>
        <Input
          id="sk-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />
    </form>
  );
}
