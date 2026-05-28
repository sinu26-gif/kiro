"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import { createShopkeeper, type ShopkeeperActionState } from "@/app/actions/shopkeepers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ShopkeeperActionState = { ok: false };

function SubmitButton() {
  const t = useTranslations("shopkeepers.form");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function CreateShopkeeperForm() {
  const t = useTranslations("shopkeepers.form");
  const [state, action] = useFormState(createShopkeeper, initialState);

  return (
    <form action={action} className="space-y-5">
      <Field
        label={t("shopName")}
        placeholder={t("shopNamePlaceholder")}
        name="shopName"
        error={state.fieldErrors?.shopName}
        required
      />
      <Field
        label={t("ownerName")}
        placeholder={t("ownerNamePlaceholder")}
        name="ownerName"
        error={state.fieldErrors?.ownerName}
        required
      />
      <Field
        label={t("phone")}
        placeholder={t("phonePlaceholder")}
        name="phone"
        type="tel"
        inputMode="tel"
        error={state.fieldErrors?.phone}
        required
      />
      <Field
        label={t("address")}
        placeholder={t("addressPlaceholder")}
        name="address"
        error={state.fieldErrors?.address}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label={t("lat")}
          name="lat"
          type="number"
          inputMode="decimal"
          error={state.fieldErrors?.lat}
        />
        <Field
          label={t("lng")}
          name="lng"
          type="number"
          inputMode="decimal"
          error={state.fieldErrors?.lng}
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
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
