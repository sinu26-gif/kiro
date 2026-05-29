'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ShopkeeperType } from '@/types/database';

export default function RegisterPage() {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [shopkeeperType, setShopkeeperType] = useState<ShopkeeperType>('shoes');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-gray-900">Registration Submitted!</h2>
            <p className="text-gray-500 text-sm">
              Your request has been sent to the admin for review. You will be contacted via WhatsApp
              once approved.
            </p>
            <a href="/login" className="text-blue-600 underline text-sm">
              Back to Login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-700">Himova</h1>
            <p className="text-gray-500 text-sm mt-1">Register as a new shopkeeper</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: submit to Supabase registration_requests table
              setSubmitted(true);
            }}
          >
            <div>
              <label className="text-sm font-medium text-gray-700">Shop Name</label>
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="My Shoe Shop"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Owner Name</label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ram Bahadur"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="mt-1"
                maxLength={10}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Kathmandu, Nepal"
                className="mt-1"
                required
              />
            </div>

            {/* Shopkeeper Type Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Shop Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShopkeeperType('shoes')}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                    shopkeeperType === 'shoes'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span className="text-2xl block mb-1">👟</span>
                  <span className="text-sm font-medium">Shoes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShopkeeperType('clothes')}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                    shopkeeperType === 'clothes'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span className="text-2xl block mb-1">👕</span>
                  <span className="text-sm font-medium">Clothes</span>
                </button>
              </div>
              <Badge variant="outline" className="mt-2 text-xs">
                You will only see {shopkeeperType === 'shoes' ? 'shoes' : 'clothing'} products
              </Badge>
            </div>

            <Button type="submit" className="w-full">
              Submit Registration Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
