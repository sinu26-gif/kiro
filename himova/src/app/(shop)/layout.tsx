import { ShopNav } from '@/components/shared/ShopNav';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-20">{children}</main>
      <ShopNav />
    </div>
  );
}
