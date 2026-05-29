import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function OrdersPage() {
  const t = await getTranslations('orders');

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-2">{t('title')}</h1>

      {/* Placeholder orders */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center text-gray-400 py-12">
          No orders yet. Start ordering from the catalog!
        </CardContent>
      </Card>

      {/* Sample order card structure */}
      <Card className="border-0 shadow-sm opacity-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Order #1234</p>
              <p className="text-xs text-gray-500">May 28, 2026</p>
            </div>
            <Badge className="bg-yellow-100 text-yellow-700">
              {t('status.pending')}
            </Badge>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">5 items | 12 sets</span>
            <span className="font-bold">Rs 45,000</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
