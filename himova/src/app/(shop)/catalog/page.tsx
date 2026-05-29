import { getTranslations } from 'next-intl/server';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/shared/ProductCard';

// TODO: Fetch from Supabase, filtered by shopkeeper_type
const MOCK_CATALOG = [
  {
    id: '1',
    name: 'Classic Runner Black',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 125000,
    set_label: '39-43',
    variant_name: 'Black',
  },
  {
    id: '2',
    name: 'Sport Comfort White',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 150000,
    set_label: '40-44',
    variant_name: 'White',
  },
  {
    id: '3',
    name: 'Casual Slip-On Brown',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 100000,
    set_label: '39-43',
    variant_name: 'Brown',
  },
  {
    id: '4',
    name: 'Formal Classic Black',
    photo_url: '/placeholder-shoe.jpg',
    display_price_paisa: 175000,
    set_label: '39-43',
    variant_name: 'Black',
  },
];

export default async function CatalogPage() {
  const t = await getTranslations('catalog');
  const tCommon = await getTranslations('common');

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 pt-2">{t('title')}</h1>

      {/* Search */}
      <Input placeholder={tCommon('search')} className="w-full" />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium whitespace-nowrap">
          All
        </button>
        <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">
          {t('inStock')}
        </button>
        <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">
          Price: Low-High
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {MOCK_CATALOG.map((product) => (
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
    </div>
  );
}
