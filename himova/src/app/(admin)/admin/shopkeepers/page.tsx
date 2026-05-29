import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function ShopkeepersPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shopkeepers</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Shopkeeper
        </Button>
      </div>

      {/* Pending Registration Requests */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">Pending Registration Requests</h2>
          <p className="text-gray-500 text-sm">No pending requests</p>
        </CardContent>
      </Card>

      {/* Shopkeeper List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Search shopkeepers..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <select className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Types</option>
              <option value="shoes">Shoes</option>
              <option value="clothes">Clothes</option>
            </select>
          </div>

          {/* Sample row - placeholder */}
          <div className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Sample Shop</p>
              <p className="text-sm text-gray-500">Owner: John Doe | Phone: 9800000000</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">shoes</Badge>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
