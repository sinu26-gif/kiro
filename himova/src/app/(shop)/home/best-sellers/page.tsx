import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/shared/ProductCard';

// TODO: Fetch real data from Supabase
// Query: SUM(order_items.set_quantity) grouped by product, filtered by shopkeeper_type category
// Only includes orders with status = 'delivered'
const MOCK_BEST_SELLERS = [
  {
    id: '1',
    name: 'Classic Runner Black',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 125000,
    set_price_paisa: 625000,
    sizes_count: 5,
    set_label: '39-43',
    variant_name: 'Black',
    total_sets_sold: 250,
  },
  {
    id: '2',
    name: 'Urban Street Navy',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 140000,
    set_price_paisa: 700000,
    sizes_count: 5,
    set_label: '39-43',
    variant_name: 'Navy',
    total_sets_sold: 180,
  },
  {
    id: '3',
    name: 'Sport Comfort White',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 150000,
    set_price_paisa: 750000,
    sizes_count: 5,
    set_label: '40-44',
    variant_name: 'White',
    total_sets_sold: 145,
  },
  {
    id: '4',
    name: 'Formal Classic Black',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 175000,
    set_price_paisa: 875000,
    sizes_count: 5,
    set_label: '39-43',
    variant_name: 'Black',
    total_sets_sold: 120,
  },
];

export default async function BestSellersPage() {
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link href="/home" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{t('bestSellers')}</h1>
      </div>

      <p className="text-sm text-gray-500">{t('bestSellersDesc')}</p>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {MOCK_BEST_SELLERS.map((product) => (
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
            badge={`${product.total_sets_sold} ${t('setsSold')}`}
          />
        ))}
      </div>
    </div>
  );
}
