---
inclusion: always
---

# Himova — Tech Stack & Infrastructure

## Goals
- Zero or near-zero monthly cost on free tiers.
- Mobile-first PWA, installable on Android/iOS without an app store.
- No data corruption, transactional safety on every stock movement.
- Sub-2-second loads on 4G.
- Bilingual (English/Nepali) end-to-end.

## Stack

### Frontend
- **Next.js 14+** (App Router) with **TypeScript** — single codebase for admin and shopkeeper.
- **React Server Components** by default; client components only where interactivity needs it.
- **Tailwind CSS** + **shadcn/ui** for the design system.
- **next-pwa** or built-in App Router PWA support for offline shell and home-screen install.
- **next-intl** for English/Nepali localisation.
- **Zustand** for lightweight client state (cart, POS session, language).
- **TanStack Query** for server state caching.

### Backend
- **Next.js API routes / Route Handlers** + **Server Actions** — no separate backend server.
- **Zod** for input validation on every server action and route handler.

### Database & Auth
- **Supabase** (PostgreSQL) free tier:
  - Database, Auth, Storage, Realtime in one.
  - **Row Level Security (RLS)** policies enforce that shopkeepers only see their own data.
- **Auth:**
  - Shopkeeper: phone + password, with OTP verification at signup. Phone OTP via Supabase Auth (uses Twilio under the hood — confirm cost; if too expensive, fall back to admin manually verifying).
  - Admin: email + password.

### Storage
- **Supabase Storage** for product photos, shopkeeper documents, receipts (PDF), etc.

### Notifications
- **WhatsApp Cloud API** (Meta, free tier ~1000 conversations/month) for transactional and marketing messages.
- **Resend** or **Brevo** free tier for email.
- **Web Push** for in-app/PWA push notifications.

### Hosting & Deployment
- **Vercel** free tier — automatic deploys from `main` branch on GitHub.
- Preview deploys on every pull request.

### Reporting & Exports
- **xlsx** library for Excel export.
- **react-pdf** or **pdfmake** for PDF generation (receipts, reports).

## Project Structure

```
himova/
├── app/
│   ├── (admin)/              # admin routes, protected
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── shopkeepers/
│   │   ├── orders/
│   │   ├── leaderboard/
│   │   └── reports/
│   ├── (shop)/               # shopkeeper routes, protected
│   │   ├── home/
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── pos/
│   │   ├── stock/
│   │   ├── reports/
│   │   └── leaderboard/
│   ├── (public)/             # login, signup, public leaderboard
│   ├── api/
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn components
│   └── shared/
├── lib/
│   ├── supabase/
│   ├── whatsapp/
│   ├── email/
│   └── utils/
├── messages/                 # next-intl translations
│   ├── en.json
│   └── ne.json
├── types/
└── public/
```

## Database Conventions
- All tables use UUID primary keys.
- All tables have `created_at` and `updated_at` timestamps.
- Soft deletes via `deleted_at` column where data must be retained for audit.
- Money stored as integers (paisa) to avoid floating-point errors. Display layer converts to NPR.
- Sizes stored as strings (`"39"`, `"40"`, `"S"`, `"XL"`) to support both shoes and clothing in one column.
- Audit/history tables for stock movements and order status changes.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Things Deliberately Avoided
- Microservices, separate Express/Nest backends — adds cost and complexity for no benefit at this scale.
- ORMs other than Supabase client — keep dependencies lean.
- Tailwind UI / paid component kits — shadcn/ui is free and customizable.
- Native mobile apps — PWA covers Phase 1.
