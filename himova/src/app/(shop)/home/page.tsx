import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock } from 'lucide-react';

export default async function ShopHomePage() {
  const t = await getTranslations('home');

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          Himova
        </Badge>
      </div>

      {/* Search Bar */}
      <Link
        href="/catalog"
        className="block w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-400 text-sm shadow-sm"
      >
        {t('searchPlaceholder')}
      </Link>

      {/* Navigation Cards */}
      <div className="space-y-4">
        {/* New Arrivals */}
        <Link href="/home/new-arrivals">
          <Card className="hover:shadow-md transition-shadow border-0 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{t('newArrivals')}</h3>
                <p className="text-sm text-gray-500">{t('newArrivalsDesc')}</p>
              </div>
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                12 {t('newItems')}
              </Badge>
            </CardContent>
          </Card>
        </Link>

        {/* Best Sellers */}
        <Link href="/home/best-sellers">
          <Card className="hover:shadow-md transition-shadow border-0 shadow-sm bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{t('bestSellers')}</h3>
                <p className="text-sm text-gray-500">{t('bestSellersDesc')}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Previous Orders */}
        <Link href="/home/previous-orders">
          <Card className="hover:shadow-md transition-shadow border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{t('previousOrders')}</h3>
                <p className="text-sm text-gray-500">{t('previousOrdersDesc')}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
