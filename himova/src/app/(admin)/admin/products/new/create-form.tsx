"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import { createProduct, type ProductActionState } from "@/app/actions/products";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type CategoryOption = { id: string; name: string };

const initialState: ProductActionState = { ok: false };

function SubmitButton() {
  const t = useTranslations("products.form");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function CreateProductForm({ categories }: { categories: CategoryOption[] }) {
  const t = useTranslations("products.form");
  const [state, action] = useFormState(createProduct, initialState);

  return (
    <form action={action} className="space-y-5">
      <Field label={t("name")} htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          placeholder={t("namePlaceholder")}
          required
          autoFocus
          aria-invalid={!!state.fieldErrors?.name}
        />
      </Field>

      <Field
        label={t("category")}
        htmlFor="categoryId"
        error={state.fieldErrors?.categoryId}
      >
        <NativeSelect id="categoryId" name="categoryId" defaultValue="">
          <option value="">{t("categoryPlaceholder")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label={t("description")}
        htmlFor="description"
        error={state.fieldErrors?.description}
      >
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder={t("descriptionPlaceholder")}
        />
      </Field>

      <Field label={t("videoUrl")} htmlFor="videoUrl" error={state.fieldErrors?.videoUrl}>
        <Input
          id="videoUrl"
          name="videoUrl"
          type="url"
          inputMode="url"
          placeholder={t("videoUrlPlaceholder")}
          aria-invalid={!!state.fieldErrors?.videoUrl}
        />
      </Field>

      <Field
        label={t("suggestedRetail")}
        htmlFor="suggestedRetail"
        hint={t("suggestedRetailHint")}
        error={state.fieldErrors?.suggestedRetail}
      >
        <Input
          id="suggestedRetail"
          name="suggestedRetail"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder={t("suggestedRetailPlaceholder")}
          aria-invalid={!!state.fieldErrors?.suggestedRetail}
        />
      </Field>

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
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
