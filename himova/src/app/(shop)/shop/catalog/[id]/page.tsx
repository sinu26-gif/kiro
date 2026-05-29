import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadCatalogProduct } from "@/lib/catalog";

import { ProductDetailClient } from "./product-detail-client";

export const metadata = { title: "Product" };

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["shopkeeper"]);
  const product = await loadCatalogProduct(params.id).catch(() => null);
  if (!product) notFound();
  return <ProductDetailClient product={product} />;
}
