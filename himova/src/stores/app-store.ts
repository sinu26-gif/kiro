'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Locale = 'en' | 'ne';

interface AppState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => {
        set({ locale });
        // Also set cookie so server components can access it
        document.cookie = `locale=${locale};path=/;max-age=31536000`;
      },
    }),
    {
      name: 'himova-app',
    },
  ),
);
