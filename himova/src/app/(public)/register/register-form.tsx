"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";

import { registerShopkeeper, type RegisterState } from "@/app/actions/register";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: RegisterState = { ok: false };

function SubmitButton() {
  const t = useTranslations("register");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="tap" className="w-full" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function RegisterForm() {
  const t = useTranslations("register");
  const [state, action] = useFormState(registerShopkeeper, initial);

  if (state.ok) {
    return (
      <Alert variant="success" className="text-left">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        <AlertDescription>
          <p className="font-semibold">{t("successTitle")}</p>
          <p className="mt-1">{t("successBody")}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/login?as=shopkeeper">{t("goToLogin")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label={t("shopName")} name="shopName" placeholder={t("shopNamePlaceholder")} error={state.fieldErrors?.shopName} required />
      <Field label={t("ownerName")} name="ownerName" placeholder={t("ownerNamePlaceholder")} error={state.fieldErrors?.ownerName} required />
      <Field label={t("phone")} name="phone" type="tel" inputMode="tel" placeholder={t("phonePlaceholder")} error={state.fieldErrors?.phone} required />
      <Field label={t("password")} name="password" type="password" placeholder={t("passwordPlaceholder")} error={state.fieldErrors?.password} required />

      <div className="space-y-2">
        <Label htmlFor="address">{t("address")}</Label>
        <Textarea id="address" name="address" rows={2} placeholder={t("addressPlaceholder")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">{t("document")}</Label>
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-card p-3">
          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            id="document"
            name="document"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            className="border-0 p-0 file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:text-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("documentHint")}</p>
        {state.fieldErrors?.document ? (
          <p className="text-xs text-destructive">{state.fieldErrors.document}</p>
        ) : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login?as=shopkeeper" className="text-primary hover:underline">
          {t("login")}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={!!error} {...rest} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
