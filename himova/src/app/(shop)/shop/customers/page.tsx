import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { CustomersClient, type CustomerRow } from "./customers-client";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

async function loadCustomers(): Promise<CustomerRow[]> {
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return [];
  const supabase = getSupabaseServerClient();

  const { data: customers } = await supabase
    .from("shop_customers")
    .select("id, name, phone")
    .eq("shopkeeper_id", shopkeeperId);
  if (!customers || customers.length === 0) return [];

  // Aggregate POS spend / visits / last visit per customer.
  const { data: sales } = await supabase
    .from("pos_sales")
    .select("customer_id, total_paisa, created_at")
    .eq("shopkeeper_id", shopkeeperId)
    .not("customer_id", "is", null);

  const agg = new Map<string, { spentPaisa: number; visits: number; lastVisit: string | null }>();
  for (const s of sales ?? []) {
    const cid = s.customer_id as string;
    const cur = agg.get(cid) ?? { spentPaisa: 0, visits: 0, lastVisit: null };
    cur.spentPaisa += s.total_paisa as number;
    cur.visits += 1;
    const created = s.created_at as string;
    if (!cur.lastVisit || created > cur.lastVisit) cur.lastVisit = created;
    agg.set(cid, cur);
  }

  return (customers as Array<{ id: string; name: string | null; phone: string | null }>)
    .map((c) => {
      const a = agg.get(c.id);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        spentPaisa: a?.spentPaisa ?? 0,
        visits: a?.visits ?? 0,
        lastVisit: a?.lastVisit ?? null,
      };
    })
    .sort((a, b) => b.spentPaisa - a.spentPaisa);
}

export default async function ShopCustomersPage() {
  await requireRole(["shopkeeper"]);
  let rows: CustomerRow[] = [];
  try {
    rows = await loadCustomers();
  } catch {
    rows = [];
  }
  return <View rows={rows} />;
}

function View({ rows }: { rows: CustomerRow[] }) {
  const t = useTranslations("customers");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CustomersClient rows={rows} />
    </div>
  );
}
