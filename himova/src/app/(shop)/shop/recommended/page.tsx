import { requireRole } from "@/lib/auth/session";
import { loadRecommended } from "@/lib/discovery";
import { DiscoveryView } from "@/components/catalog/discovery-view";
import type { CatalogProductCard } from "@/lib/catalog";

export const metadata = { title: "Recommended" };
export const dynamic = "force-dynamic";

export default async function RecommendedPage() {
  await requireRole(["shopkeeper"]);
  let cards: CatalogProductCard[] = [];
  try {
    cards = await loadRecommended(40);
  } catch {
    cards = [];
  }
  return <DiscoveryView feed="recommended" cards={cards} />;
}
