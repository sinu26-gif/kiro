import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ImageIcon } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadCatalogProduct, youtubeEmbedUrl, type CatalogProductDetail } from "@/lib/catalog";
import { formatNpr } from "@/lib/format";

import { ProductOrderPanel } from "./order-panel";

export const metadata = { title: "Product" };

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["shopkeeper"]);
  const product = await loadCatalogProduct(params.id).catch(() => null);
  if (!product) notFound();
  return <ProductDetailView product={product} />;
}

function ProductDetailView({ product }: { product: CatalogProductDetail }) {
  const t = useTranslations("productDetail");
  const embed = youtubeEmbedUrl(product.videoUrl);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/shop/catalog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <Gallery photos={product.photos} name={product.name} />
          {embed ? (
            <div className="aspect-video overflow-hidden rounded-xl border">
              <iframe
                src={embed}
                title={product.name}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>

        {/* Info + order panel */}
        <div className="space-y-4">
          <div>
            {product.categoryName ? (
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {product.categoryName}
              </p>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            {product.suggestedRetailPaisa != null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("suggestedRetail")}: {formatNpr(product.suggestedRetailPaisa)}
              </p>
            ) : null}
          </div>

          {product.description ? (
            <p className="text-sm text-pretty text-muted-foreground">{product.description}</p>
          ) : null}

          <ProductOrderPanel variants={product.variants} />
        </div>
      </div>
    </div>
  );
}

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  if (photos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted text-muted-foreground">
        <ImageIcon className="h-10 w-10" aria-hidden />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        <Image
          src={photos[0]}
          alt={name}
          fill
          sizes="(min-width: 768px) 400px, 100vw"
          className="object-cover"
          unoptimized
          priority
        />
      </div>
      {photos.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {photos.slice(1, 5).map((url, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <Image
                src={url}
                alt={`${name} ${i + 2}`}
                fill
                sizes="100px"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
