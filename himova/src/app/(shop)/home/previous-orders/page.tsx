import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/shared/ProductCard';

// TODO: Fetch from Supabase
// Query: order_items joined to orders WHERE orders.shopkeeper_id = current AND orders.status != 'cancelled'
// Grouped by product, sorted by most recently ordered
const MOCK_PREVIOUS_ORDERS = [
  {
    id: '1',
    name: 'Classic Runner Black',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 125000,
    set_price_paisa: 625000,
    sizes_count: 5,
    set_label: '39-43',
    variant_name: 'Black',
    last_ordered: '2026-05-15',
    last_quantity: 5,
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
    last_ordered: '2026-05-10',
    last_quantity: 3,
  },
];

export default async function PreviousOrdersPage() {
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link href="/home" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{t('previousOrders')}</h1>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {MOCK_PREVIOUS_ORDERS.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            photoUrl={product.photo_url}
            displayPricePaisa={product.display_price_paisa}
            setLabel={product.set_label}
            variantName={product.variant_name}
            addToCartLabel={tCommon('reorder')}
            perPieceLabel={tCommon('perPiece')}
            subtitle={`Last: ${product.last_quantity} sets on ${product.last_ordered}`}
          />
        ))}
      </div>

      {MOCK_PREVIOUS_ORDERS.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>You haven&apos;t ordered yet. Check out our Best Sellers!</p>
          <Link href="/home/best-sellers" className="text-blue-600 underline mt-2 block">
            {t('bestSellers')}
          </Link>
        </div>
      )}
    </div>
  );
}
