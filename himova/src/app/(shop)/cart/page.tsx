'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cart-store';
import { formatNpr } from '@/lib/format';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const t = useTranslations('cart');
  const tCommon = useTranslations('common');
  const { items, removeItem, updateQuantity, getSubtotalPaisa } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500 text-lg">{t('empty')}</p>
        <a href="/catalog" className="text-blue-600 underline text-sm">
          Browse catalog
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-2">{t('title')}</h1>

      {/* Cart Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">👟</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-gray-900 truncate">{item.product_name}</h3>
                  <p className="text-xs text-gray-500">
                    {item.variant_name} | {item.set_label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatNpr(item.display_price_paisa)} {tCommon('perPiece')}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.set_quantity - 1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">
                        {item.set_quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.set_quantity + 1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-gray-400">{tCommon('sets')}</span>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-900">
                    {formatNpr(item.line_total_paisa)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('subtotal')}</span>
            <span className="font-medium">{formatNpr(getSubtotalPaisa())}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base">
            <span className="font-bold">{t('total')}</span>
            <span className="font-bold text-blue-700">{formatNpr(getSubtotalPaisa())}</span>
          </div>
          <Button className="w-full mt-2" size="lg">
            {t('checkout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
