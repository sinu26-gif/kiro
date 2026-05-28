# Himova — Implementation Plan (Phase 1 MVP)

Tasks are ordered for incremental delivery. Each task includes acceptance criteria and the requirements it covers. Mark tasks as completed as we ship them.

Legend: `[ ]` not started, `[~]` in progress, `[x]` done.

---

## Milestone 0 — Project Setup
- [ ] **0.1** Initialise Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui in this branch. _(Tech)_
- [ ] **0.2** Add `next-intl` with `en` and `ne` locales scaffolded. _(Req 12)_
- [ ] **0.3** Add `next-pwa` (or App Router PWA config), manifest, basic icons. _(Req 13)_
- [ ] **0.4** Create Supabase project, set env vars, install `@supabase/supabase-js`, configure server and browser clients. _(Tech)_
- [ ] **0.5** Add ESLint + Prettier + Husky pre-commit running typecheck + lint. _(Conventions)_
- [ ] **0.6** Vercel deploy from this branch — confirm preview works. _(Tech)_

## Milestone 1 — Authentication
- [ ] **1.1** Supabase Auth migration: `profiles` table + trigger to create profile on auth.users insert. _(Req 1.x)_
- [ ] **1.2** Admin email/password login screen at `/admin/login`. _(Req 1.2)_
- [ ] **1.3** Shopkeeper phone/password login at `/login`. _(Req 1.1)_
- [ ] **1.4** OTP verification flow on first login (use Supabase phone auth or admin-issued OTP). _(Req 1.1)_
- [ ] **1.5** Middleware to gate `(admin)` and `(shop)` route groups by role. _(Design 2)_
- [ ] **1.6** Settings -> change password screen for shopkeeper. _(Req 1.1)_
- [ ] **1.7** Seed: create one admin user (.env-driven). _(Req 1.2)_

## Milestone 2 — Schema & RLS
- [ ] **2.1** Migration: `categories`, `products`, `product_photos`, `product_variants`, `set_types`. _(Design 3.3-3.7)_
- [ ] **2.2** Migration: `shopkeepers`, `shopkeeper_pricing`. _(Design 3.2, 3.8)_
- [ ] **2.3** Migration: `orders`, `order_items`. _(Design 3.9-3.10)_
- [ ] **2.4** Migration: `shop_stock`, `stock_movements`. _(Design 3.11-3.12)_
- [ ] **2.5** Migration: `pos_sales`, `pos_sale_items`, `pos_payments`, `shop_customers`, `custom_products`. _(Design 3.13-3.17)_
- [ ] **2.6** Migration: `notifications`, `rewards`, `app_events`. _(Design 3.18-3.19)_
- [ ] **2.7** RLS policies on every shopkeeper-scoped table. _(Design 9)_
- [ ] **2.8** Seed script: 1 admin, 3 sample shopkeepers, 5 products with variants and set types. _(QA)_

## Milestone 3 — Admin: Products
- [ ] **3.1** Product list page with search and category filter. _(Req 2.2)_
- [ ] **3.2** Create product form (name, category, photos upload, video URL, description, suggested retail). _(Req 2.1)_
- [ ] **3.3** Variant manager (add/edit/sort colours). _(Req 2.1)_
- [ ] **3.4** Set type manager with templates (39-43, 40-44, S-M-L-XL-XXL, etc.) and validation rules. _(Req 2.1, 2.3)_
- [ ] **3.5** Archive/restore product. _(Req 2.2)_

## Milestone 4 — Admin: Shopkeepers
- [ ] **4.1** Shopkeeper list with search and filters. _(Req 1.3)_
- [ ] **4.2** Create shopkeeper form (shop name, owner name, phone, address, location pin via Google Maps embed, logo upload). _(Req 1.3)_
- [ ] **4.3** Shopkeeper profile page (their orders, stock, leaderboard rank, manual price overrides). _(Req 8.4)_
- [ ] **4.4** Trigger welcome WhatsApp on creation. _(Req 1.3)_

## Milestone 5 — Shopkeeper: Catalog & Cart
- [ ] **5.1** Home page with curated sections (New Arrivals, Best Sellers, Recommended, Previous Orders). _(Req 3.1)_
- [ ] **5.2** Product detail page (gallery, video embed, variants, set types). _(Req 3.2)_
- [ ] **5.3** Search and category/price filters. _(Req 3.3)_
- [ ] **5.4** Server-side cart (add, update qty, remove). _(Req 4.1)_
- [ ] **5.5** Apply `shopkeeper_pricing` overrides to cart with badge showing the discount reason. _(Req 4.1)_

## Milestone 6 — Ordering Flow
- [ ] **6.1** Checkout page with payment method selector. _(Req 4.2)_
- [ ] **6.2** Place-order server action (transactional). _(Design 4.1)_
- [ ] **6.3** Order list and detail for shopkeeper with status tracker. _(Req 4.3)_
- [ ] **6.4** Admin order list with filters. _(Req 5.1)_
- [ ] **6.5** Admin order detail: status updates, free-delivery toggle, payment confirmation. _(Req 5.2, Design 4.2-4.3)_
- [ ] **6.6** Order placed/shipped/delivered notifications (in-app + WhatsApp). _(Req 5.3, 9.1)_

## Milestone 7 — Stock
- [ ] **7.1** Admin warehouse stock dashboard, manual restock UI. _(Req 6.1)_
- [ ] **7.2** Low-stock alerts (admin in-app). _(Req 6.1)_
- [ ] **7.3** Auto stock-out on Shipped (already in 6.5; add tests). _(Design 4.2)_
- [ ] **7.4** Auto break-into-pieces and shop-stock-in on Delivered. _(Design 4.3)_
- [ ] **7.5** Shopkeeper stock screen showing per-size availability + low-stock badges + reorder CTA. _(Req 6.2)_
- [ ] **7.6** Stock movement log view (admin + shopkeeper). _(Req 6.3)_

## Milestone 8 — POS
- [ ] **8.1** POS landing: search bar + photo grid. _(Req 7.1)_
- [ ] **8.2** Size selector showing only in-stock sizes. _(Req 7.1)_
- [ ] **8.3** "Current sale" panel with per-line price override. _(Req 7.1)_
- [ ] **8.4** Multi-method payment input (cash + eSewa + Khalti split). _(Req 7.1)_
- [ ] **8.5** Customer info capture (optional name + phone). _(Req 7.1, 7.5)_
- [ ] **8.6** Complete sale (transactional) -> stock deducted, sale logged. _(Design 4.4)_
- [ ] **8.7** Receipt PDF generator. _(Req 7.2)_
- [ ] **8.8** Send receipt to customer via WhatsApp if phone provided. _(Req 7.2)_
- [ ] **8.9** Custom shopkeeper products: add via camera, name, price; appear in POS only. _(Req 7.3)_
- [ ] **8.10** End-of-day closing report. _(Req 7.4)_
- [ ] **8.11** Shopkeeper customer database list and detail. _(Req 7.5)_

## Milestone 9 — Leaderboard & Gamification
- [ ] **9.1** Public leaderboard page (no auth required). _(Req 8.1)_
- [ ] **9.2** Three tabs: total NPR, total sets, last 30 days activity. _(Req 8.1)_
- [ ] **9.3** Click row -> shopkeeper's most-ordered products (name + photo). _(Req 8.1)_
- [ ] **9.4** Badge calculation logic: Gold Shopkeeper, 100 Sets Club, Top Seller of the Month. _(Req 8.2)_
- [ ] **9.5** Admin "Run Reward Cycle" UI: pick winners, choose rewards. _(Req 8.3)_
- [ ] **9.6** Reward broadcast notification (in-app + WhatsApp) to all shopkeepers. _(Req 8.3, 9.1)_
- [ ] **9.7** Admin private leaderboard view with extra columns. _(Req 8.4)_

## Milestone 10 — Notifications & Messaging
- [ ] **10.1** In-app notifications bell + list + mark-as-read. _(Req 9.1)_
- [ ] **10.2** WhatsApp Cloud API integration; submit and store template approvals. _(Design 6)_
- [ ] **10.3** Email integration (Resend/Brevo) for receipts and weekly digests. _(Req 9.1)_
- [ ] **10.4** Trigger functions for each notification event in the requirements matrix. _(Req 9.1)_

## Milestone 11 — Reports
- [ ] **11.1** Admin sales reports (daily/weekly/monthly) with chart. _(Req 10.1)_
- [ ] **11.2** Top products, top shopkeepers, slow-moving stock, profit margins, outstanding payments. _(Req 10.1)_
- [ ] **11.3** Geographic heatmap using location pins. _(Req 10.1)_
- [ ] **11.4** Excel + PDF export utilities. _(Req 10.1, 10.2)_
- [ ] **11.5** Shopkeeper reports (sales, bestsellers, profit, stock value, top customer, highest-revenue day, focus suggestions). _(Req 10.2)_
- [ ] **11.6** Basic expense tracker (optional fields: rent, electricity, staff, custom). _(Req 10.2)_

## Milestone 12 — Polish & Launch
- [ ] **12.1** Bilingual review: every string translated to Nepali. _(Req 12)_
- [ ] **12.2** Responsive QA: 360px, 768px, 1024px, 1440px. _(Req 13)_
- [ ] **12.3** Lighthouse PWA audit, fix any failures. _(Req 13)_
- [ ] **12.4** Final security pass: RLS spot-checks, rate limiting on login/OTP. _(Design 9)_
- [ ] **12.5** Onboard 3 pilot shopkeepers in production. _(Success metric)_
- [ ] **12.6** Set up Vercel Analytics + uptime monitor. _(Design 10)_

---

## Out of Scope for Phase 1 (tracked here for planning)
- Multi-branch UI (data model is ready).
- Multi-wholesaler / sub-admin marketplace.
- Native iOS/Android apps.
- Refund flows.
- VAT calculations.
- SMS notifications.
- Offline POS mode.
- Loyalty / cashback programs.
