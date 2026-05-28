import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CreateProductForm, type CategoryOption } from "./create-form";

export const metadata = { title: "New product" };

async function loadCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as CategoryOption[];
}

export default async function NewProductPage() {
  await requireRole(["admin"]);
  const categories = await loadCategoryOptions().catch(() => [] as CategoryOption[]);
  return <NewProductView categories={categories} />;
}

function NewProductView({ categories }: { categories: CategoryOption[] }) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {tc("back")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("newTitle")}</CardTitle>
          <CardDescription>{t("newSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProductForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
