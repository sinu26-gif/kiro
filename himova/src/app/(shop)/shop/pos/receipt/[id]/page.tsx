import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { ReceiptView, type ReceiptData } from "./receipt-view";

export const metadata = { title: "Receipt" };

type RawSaleItem = {
  size: string | null;
  quantity: number;
  unit_price_paisa: number;
  line_total_paisa: number;
  variant: { variant_name: string; product: { name: string } | null } | null;
  custom_product: { name: string } | null;
};

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  await requireRole(["shopkeeper"]);
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) notFound();

  const supabase = getSupabaseServerClient();

  const { data: sale } = await supabase
    .from("pos_sales")
    .select(
      `
      id, subtotal_paisa, discount_paisa, total_paisa, return_policy_text, created_at,
      customer:shop_customers ( name, phone ),
      items:pos_sale_items (
        size, quantity, unit_price_paisa, line_total_paisa,
        variant:product_variants ( variant_name, product:products ( name ) ),
        custom_product:custom_products ( name )
      ),
      payments:pos_payments ( method, amount_paisa )
    `
    )
    .eq("id", params.id)
    .eq("shopkeeper_id", shopkeeperId)
    .maybeSingle();

  if (!sale) notFound();

  const { data: shop } = await supabase
    .from("shopkeepers")
    .select("shop_name, address, phone")
    .eq("id", shopkeeperId)
    .maybeSingle();

  const customer = sale.customer as unknown as { name: string | null; phone: string | null } | null;

  const data: ReceiptData = {
    id: sale.id as string,
    createdAt: sale.created_at as string,
    shopName: shop?.shop_name ?? "Shop",
    shopAddress: shop?.address ?? null,
    shopPhone: shop?.phone ?? null,
    subtotalPaisa: sale.subtotal_paisa as number,
    discountPaisa: sale.discount_paisa as number,
    totalPaisa: sale.total_paisa as number,
    returnPolicy: sale.return_policy_text as string,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    items: ((sale.items as unknown as RawSaleItem[]) ?? []).map((it) => ({
      name: it.variant?.product?.name ?? it.custom_product?.name ?? "Item",
      detail: it.variant
        ? `${it.variant.variant_name}${it.size ? ` · ${it.size}` : ""}`
        : "",
      quantity: it.quantity,
      unitPricePaisa: it.unit_price_paisa,
      lineTotalPaisa: it.line_total_paisa,
    })),
    payments: ((sale.payments as unknown as { method: string; amount_paisa: number }[]) ?? []).map(
      (p) => ({ method: p.method, amountPaisa: p.amount_paisa })
    ),
  };

  return <ReceiptView data={data} />;
}
