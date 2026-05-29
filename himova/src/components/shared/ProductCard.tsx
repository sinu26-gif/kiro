'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { formatNpr } from '@/lib/format';

type Props = {
  id: string;
  name: string;
  photoUrl: string;
  displayPricePaisa: number;
  setLabel: string;
  variantName: string;
  addToCartLabel: string;
  perPieceLabel: string;
  badge?: string;
  subtitle?: string;
};

export function ProductCard({
  name,
  photoUrl,
  displayPricePaisa,
  setLabel,
  variantName,
  addToCartLabel,
  perPieceLabel,
  badge,
  subtitle,
}: Props) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-gray-100">
        {photoUrl.startsWith('/') ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-4xl">👟</span>
          </div>
        ) : (
          <Image
            src={photoUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px"
          />
        )}
        {badge && (
          <Badge className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-1.5 py-0.5">
            🔥 {badge}
          </Badge>
        )}
      </div>
      <CardContent className="p-3 space-y-1.5">
        <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{name}</h3>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">
            {variantName}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">
            {setLabel}
          </Badge>
        </div>
        <div>
          <span className="font-bold text-blue-700 text-base">
            {formatNpr(displayPricePaisa)}
          </span>
          <span className="text-[10px] text-gray-400 ml-1">{perPieceLabel}</span>
        </div>
        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
        <Button size="sm" className="w-full text-xs h-8 mt-1" variant="default">
          <ShoppingCart className="w-3 h-3 mr-1" />
          {addToCartLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
