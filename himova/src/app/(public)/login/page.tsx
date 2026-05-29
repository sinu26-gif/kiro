'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function ShopkeeperLoginPage() {
  const t = useTranslations('auth');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-700">Himova</h1>
            <p className="text-gray-500 text-sm mt-1">{t('loginSubtitle')}</p>
          </div>

          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('phone')}</label>
              <Input
                type="tel"
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                maxLength={10}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('password')}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full">
              {t('login')}
            </Button>
          </form>

          <div className="text-center">
            <a href="/register" className="text-sm text-blue-600 underline">
              New shopkeeper? Register here
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
