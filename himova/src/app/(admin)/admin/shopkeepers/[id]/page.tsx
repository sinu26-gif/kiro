import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, MapPin } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatPhoneForDisplay } from "@/lib/auth/phone";
import { formatNpr, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge, type OrderStatus } from "@/components/orders/status-badge";

import {
  PricingManager,
  type ExistingOverride,
  type PricingSetOption,
} from "./pricing-manager";
import { ShopkeeperAdminActions } from "./admin-actions";

export const metadata = { title: "Shopkeeper" };
export const dynamic = "force-dynamic";

type ShopkeeperRow = {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: "pending" | "active" | "suspended";
  document_path: string | null;
  self_registered: boolean;
};

type OrderRow = {
  id: string;
  status: OrderStatus;
  total_paisa: number;
  placed_at: string;
};

async function loadData(id: string) {
  const supabase = getSupabaseServerClient();

  const { data: shop } = await supabase
    .from("shopkeepers")
    .select(
      "id, shop_name, owner_name, phone, address, location_lat, location_lng, status, document_path, self_registered"
    )
    .eq("id", id)
    .maybeSingle();
  if (!shop) return null;

  const [ordersRes, setsRes, overridesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total_paisa, placed_at")
      .eq("shopkeeper_id", id)
      .order("placed_at", { ascending: false }),
    supabase
      .from("set_types")
      .select(
        "id, label, price_paisa, variant:product_variants ( variant_name, product:products ( name, status ) )"
      ),
    supabase
      .from("shopkeeper_pricing")
      .select(
        "id, set_type_id, override_paisa, discount_percent, note, set_type:set_types ( label, price_paisa, variant:product_variants ( variant_name, product:products ( name ) ) )"
      )
      .eq("shopkeeper_id", id),
  ]);

  return {
    shop: shop as ShopkeeperRow,
    orders: (ordersRes.data as unknown as OrderRow[]) ?? [],
    sets: setsRes.data ?? [],
    overrides: overridesRes.data ?? [],
  };
}

export default async function ShopkeeperDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["admin"]);
  const data = await loadData(params.id).catch(() => null);
  if (!data) notFound();

  const setOptions: PricingSetOption[] = (
    data.sets as unknown as Array<{
      id: string;
      label: string;
      price_paisa: number;
      variant: { variant_name: string; product: { name: string; status: string } | null } | null;
    }>
  )
    .filter((s) => s.variant?.product?.status === "active")
    .map((s) => ({
      setTypeId: s.id,
      productName: s.variant?.product?.name ?? "—",
      variantName: s.variant?.variant_name ?? "—",
      label: s.label,
      basePricePaisa: s.price_paisa,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const existing: ExistingOverride[] = (
    data.overrides as unknown as Array<{
      id: string;
      set_type_id: string;
      override_paisa: number | null;
      discount_percent: number | null;
      note: string | null;
      set_type: {
        label: string;
        price_paisa: number;
        variant: { variant_name: string; product: { name: string } | null } | null;
      } | null;
    }>
  ).map((o) => ({
    id: o.id,
    setTypeId: o.set_type_id,
    productName: o.set_type?.variant?.product?.name ?? "—",
    variantName: o.set_type?.variant?.variant_name ?? "—",
    label: o.set_type?.label ?? "—",
    basePricePaisa: o.set_type?.price_paisa ?? 0,
    overridePaisa: o.override_paisa,
    discountPercent: o.discount_percent,
    note: o.note,
  }));

  const counted = data.orders.filter((o) => o.status !== "cancelled");
  const totalSpend = counted.reduce((s, o) => s + o.total_paisa, 0);

  return (
    <DetailView
      shop={data.shop}
      orders={data.orders}
      totalSpend={totalSpend}
      orderCount={counted.length}
      setOptions={setOptions}
      existing={existing}
    />
  );
}

function DetailView({
  shop,
  orders,
  totalSpend,
  orderCount,
  setOptions,
  existing,
}: {
  shop: ShopkeeperRow;
  orders: OrderRow[];
  totalSpend: number;
  orderCount: number;
  setOptions: PricingSetOption[];
  existing: ExistingOverride[];
}) {
  const t = useTranslations("shopkeeperDetail");
  const tp = useTranslations("pricing");
  const lastOrder = orders[0];

  const mapHref =
    shop.location_lat != null && shop.location_lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${shop.location_lat},${shop.location_lng}`
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/shopkeepers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{shop.shop_name}</h1>
            <StatusBadge status={shop.status} />
          </div>
          <p className="text-sm text-muted-foreground">{shop.owner_name}</p>
        </div>
        <ShopkeeperAdminActions
          shopkeeperId={shop.id}
          status={shop.status}
          hasDocument={Boolean(shop.document_path)}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("contact")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label={t("phone")} value={formatPhoneForDisplay(shop.phone)} />
            {shop.address ? <Row label={t("address")} value={shop.address} /> : null}
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {t("viewOnMap")}
              </a>
            ) : null}
          </CardContent>
        </Card>

        {/* Orders summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("ordersSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label={t("totalOrders")} value={String(orderCount)} />
            <Row label={t("totalSpend")} value={formatNpr(totalSpend)} />
            {lastOrder ? (
              <Row label={t("lastOrder")} value={formatDate(lastOrder.placed_at)} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Custom pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tp("title")}</CardTitle>
          <CardDescription>{tp("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PricingManager shopkeeperId={shop.id} setOptions={setOptions} existing={existing} />
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("recentOrders")}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 8).map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">#{o.id.slice(0, 8)}</span>
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDate(o.placed_at)}</span>
                    <span className="font-semibold tabular-nums">{formatNpr(o.total_paisa)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "active" | "suspended" }) {
  const t = useTranslations("shopkeepers.status");
  if (status === "active") return <Badge variant="success">{t("active")}</Badge>;
  if (status === "pending") return <Badge variant="warning">{t("pending")}</Badge>;
  return <Badge variant="muted">{t("suspended")}</Badge>;
}
