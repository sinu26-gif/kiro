"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { changePassword, type AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionState = { ok: false };

function SubmitButton() {
  const t = useTranslations("auth");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("loggingIn") : t("savePassword")}
    </Button>
  );
}

/**
 * Change-password card for the settings pages. Stays on the page and shows a
 * success message (unlike the first-login welcome flow which redirects).
 */
export function ChangePasswordCard() {
  const t = useTranslations("auth");
  const [state, action] = useFormState(changePassword, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" aria-hidden />
          {t("changePasswordTitle")}
        </CardTitle>
        <CardDescription>{t("changePasswordBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          {state.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.ok ? (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <AlertDescription>{t("passwordChanged")}</AlertDescription>
            </Alert>
          ) : null}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
