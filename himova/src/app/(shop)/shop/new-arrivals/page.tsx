import { requireRole } from "@/lib/auth/session";
import { loadNewArrivals } from "@/lib/discovery";
import { DiscoveryView } from "@/components/catalog/discovery-view";
import type { CatalogProductCard } from "@/lib/catalog";

export const metadata = { title: "New arrivals" };
export const dynamic = "force-dynamic";

export default async function NewArrivalsPage() {
  await requireRole(["shopkeeper"]);
  let cards: CatalogProductCard[] = [];
  try {
    cards = await loadNewArrivals(40);
  } catch {
    cards = [];
  }
  return <DiscoveryView feed="newArrivals" cards={cards} />;
}
