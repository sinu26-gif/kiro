import { requireRole } from "@/lib/auth/session";
import { loadPreviousOrderProducts } from "@/lib/discovery";
import { DiscoveryView } from "@/components/catalog/discovery-view";
import type { CatalogProductCard } from "@/lib/catalog";

export const metadata = { title: "Your previous orders" };
export const dynamic = "force-dynamic";

export default async function PreviousOrdersPage() {
  await requireRole(["shopkeeper"]);
  let cards: CatalogProductCard[] = [];
  try {
    cards = await loadPreviousOrderProducts(40);
  } catch {
    cards = [];
  }
  return <DiscoveryView feed="previousOrders" cards={cards} />;
}
