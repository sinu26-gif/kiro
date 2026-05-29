import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function PosPage() {
  const t = await getTranslations('pos');

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        <Button size="sm">{t('closeDay')}</Button>
      </div>

      {/* Search */}
      <Input placeholder="Search products by name..." />

      {/* Product Grid for POS */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <div className="aspect-square bg-gray-100 rounded-lg mb-1 flex items-center justify-center">
                <span className="text-2xl">👟</span>
              </div>
              <p className="text-[10px] text-gray-700 truncate">Product {i + 1}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Sale Panel */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center text-gray-400 text-sm">
          Tap products above to start a sale
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" disabled>
        {t('completeSale')}
      </Button>
    </div>
  );
}
