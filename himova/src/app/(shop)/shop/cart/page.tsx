import { useTranslations } from "next-intl";

import { requireRole } from "@/lib/auth/session";
import { loadCart, type CartSummary } from "@/lib/cart";

import { CartClient } from "./cart-client";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  await requireRole(["shopkeeper"]);
  let cart: CartSummary = { lines: [], totalSets: 0, subtotalPaisa: 0 };
  try {
    cart = await loadCart();
  } catch {
    /* empty cart on error */
  }
  return <CartView cart={cart} />;
}

function CartView({ cart }: { cart: CartSummary }) {
  const t = useTranslations("cart");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CartClient
        lines={cart.lines}
        subtotalPaisa={cart.subtotalPaisa}
        totalSets={cart.totalSets}
      />
    </div>
  );
}
