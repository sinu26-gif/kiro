import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/shared/ProductCard';

// TODO: Fetch real data from Supabase filtered by shopkeeper_type and last 30 days
const MOCK_NEW_ARRIVALS = [
  {
    id: '1',
    name: 'Classic Runner Black',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 125000,
    set_price_paisa: 625000,
    sizes_count: 5,
    set_label: '39-43',
    variant_name: 'Black',
  },
  {
    id: '2',
    name: 'Sport Comfort White',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 150000,
    set_price_paisa: 750000,
    sizes_count: 5,
    set_label: '40-44',
    variant_name: 'White',
  },
  {
    id: '3',
    name: 'Casual Slip-On Brown',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 100000,
    set_price_paisa: 500000,
    sizes_count: 5,
    set_label: '39-43',
    variant_name: 'Brown',
  },
];

export default async function NewArrivalsPage() {
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link href="/home" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{t('newArrivals')}</h1>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {MOCK_NEW_ARRIVALS.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            photoUrl={product.photo_url}
            displayPricePaisa={product.display_price_paisa}
            setLabel={product.set_label}
            variantName={product.variant_name}
            addToCartLabel={tCommon('addToCart')}
            perPieceLabel={tCommon('perPiece')}
          />
        ))}
      </div>

      {MOCK_NEW_ARRIVALS.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>{tCommon('noResults')}</p>
        </div>
      )}
    </div>
  );
}
