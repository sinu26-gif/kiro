export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - placeholder for now */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-white">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-700">Himova Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/admin" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Dashboard
          </a>
          <a href="/admin/products" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Products
          </a>
          <a href="/admin/shopkeepers" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Shopkeepers
          </a>
          <a href="/admin/orders" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Orders
          </a>
          <a href="/admin/stock" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Stock
          </a>
          <a href="/admin/leaderboard" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Leaderboard
          </a>
          <a href="/admin/reports" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Reports
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
