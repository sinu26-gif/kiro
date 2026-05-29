import { requireRole } from "@/lib/auth/session";
import { loadBestSellers } from "@/lib/discovery";
import { DiscoveryView } from "@/components/catalog/discovery-view";
import type { CatalogProductCard } from "@/lib/catalog";

export const metadata = { title: "Best sellers" };
export const dynamic = "force-dynamic";

export default async function BestSellersPage() {
  await requireRole(["shopkeeper"]);
  let cards: CatalogProductCard[] = [];
  try {
    cards = await loadBestSellers(40);
  } catch {
    cards = [];
  }
  return <DiscoveryView feed="bestSellers" cards={cards} />;
}
