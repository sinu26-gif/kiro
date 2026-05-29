"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { changePassword, type AuthActionState } from "@/app/actions/auth";
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
      {pending ? t("loggingIn") : t("savePassword")}
    </Button>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action] = useFormState(changePassword, initialState);

  // After successful change, navigate to /shop home.
  useEffect(() => {
    if (state.ok) {
      router.replace("/shop");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form action={action} className="space-y-4">
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

      <div className="space-y-2">
        <SubmitButton />
        <Button asChild variant="ghost" size="tap" className="w-full">
          <Link href="/shop">{t("skipForNow")}</Link>
        </Button>
      </div>
    </form>
  );
}
