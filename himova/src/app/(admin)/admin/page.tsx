import { Card, CardContent } from '@/components/ui/card';

export default function AdminDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Orders Today</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Revenue This Month</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">Rs 0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Low Stock Items</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Active Shopkeepers</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for charts */}
      <Card>
        <CardContent className="p-6 text-center text-gray-400 py-24">
          Charts and detailed reports will appear here once data is available.
        </CardContent>
      </Card>
    </div>
  );
}
