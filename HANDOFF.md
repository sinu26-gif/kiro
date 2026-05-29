# Himova — Session Handoff / Context

Paste this into a new Kiro session to continue work with full context.

## What Himova is
A bilingual (English + Nepali) B2B wholesale **PWA for Nepal** with two sides:
- **Admin (Himova / wholesaler)** — desktop-first control panel
- **Shopkeeper portal** — mobile-first: order from Himova in **sets**, plus a free **POS** to sell single pieces to their own customers

Business model: shopkeepers use it free; Himova gains order volume, retention, and data. Single wholesaler in Phase 1 (no marketplace).

## Repo / branch / deployment
- **GitHub:** `sinu26-gif/kiro`  ·  **Branch:** `himova-wholesale-portal`  ·  app lives in `himova/`
- **Live URL (Vercel, production):** https://himova-sinu26-gifs-projects.vercel.app
- **Auto-deploy:** every push to `himova-wholesale-portal` redeploys (Vercel project `prj_a2bdygEdmLqjuffNCnKOXBWpVsDP`, production branch set to `himova-wholesale-portal`)
- Workspace path: `/projects/sandbox/kiro` (app: `/projects/sandbox/kiro/himova`)

## Tech stack
- Next.js 14 App Router + TypeScript, Tailwind, shadcn-style UI primitives
- Supabase (Postgres + Auth + Storage), all RLS-protected
- next-intl (cookie-based locale, no URL prefix), en + ne
- Hosting: Vercel free tier; PWA installable
- Money stored as integer **paisa**; helpers `formatNpr` / `parseNprToPaisa`
- Phone auth: shopkeeper logs in with **10-digit phone**; stored E.164 (`977…`), synthetic email `<e164>@phone.himova.local`. Initial password = phone (optional to change, never forced).

## Supabase project
- Project ref: `bezdcjjkobhykjqngegj` · URL `https://bezdcjjkobhykjqngegj.supabase.co`
- Schema applied via SQL migrations in `himova/supabase/migrations/` (00001–00012)
- Buckets: `product-photos` (public), `shopkeeper-docs` (private, signed-URL access)
- Admin user already created: **sinughimire@gmail.com** (role admin)
- Test shopkeeper: phone **9847465097**, password **9847465097** (status active)

## Build commands (run in himova/)
`npm run typecheck` · `npm run lint` · `npm run build` · `npm run dev`
Always keep all three (typecheck/lint/build) green before committing.

## What's BUILT and live (Phase 1 complete + Phase 2 started)
- **Auth:** shopkeeper phone login, admin email login, optional password change, role-gated middleware
- **Admin products:** list (search/category/status filter, thumbnails), create/edit/archive, **variants + set-type editor** (templates 39-43, 40-44, S-XXL…, custom sizes, price/stock/reorder), **multi-photo upload** (drag-drop, delete, primary)
- **Admin shopkeepers:** create manually; **profile page** with contact + Google Maps link, orders summary, recent orders; **custom per-shopkeeper pricing** (percent or fixed, with badge note)
- **Shopkeeper catalog:** grid (search/filter), product detail (gallery + YouTube embed), variant/set chooser, add-to-cart with effective per-shopkeeper pricing
- **Cart + ordering:** server cart, checkout (payment method + note), place order; order list + detail with status tracker
- **Admin orders:** list with status tabs, detail with manage panel (packed→shipped→delivered, paid toggle, free-delivery toggle, cancel); status changes notify shopkeeper
- **Stock:** on Shipped warehouse stock decrements; on Delivered sets explode into per-size shop stock; full `stock_movements` audit; admin warehouse dashboard (low-stock, inline restock); shopkeeper shop-stock page (per-size, reorder CTA)
- **POS:** product grid from shop stock + custom products; size pick, qty, editable price, discount, customer name/phone, **split payments**, complete sale (transactional, deducts stock); **printable receipt**; "today" summary; add custom products (manual)
- **Leaderboard:** public + shop + admin (3 tabs: NPR / sets / 30-day activity); **admin reward cycles** (pick winners, reward type, broadcast notification)
- **Notifications:** in-app bell + unread badge (admin & shop), notifications pages, mark-all-read; order/registration/reward events wired
- **Reports:** admin (revenue, orders-by-status, top products, top shopkeepers, outstanding payments) + shopkeeper (sales, pieces, stock value, bestsellers, top customers); **CSV + print-to-PDF export**
- **Settings:** admin & shop (account info, language toggle, change password)
- **Self-registration + verification (Daraz-style):** public `/register` with document upload → PENDING account; pending shopkeepers can log in + browse but ordering/POS gated; 3-step verification banner on shop home; admin **Verify / Reject / Delete** + **view document** (signed URL); All/Pending/Active filter tabs; admins notified of new registrations

## Known pending / next (Phase 2)
1. **WhatsApp + email delivery** of notifications and a "verify by code" (OTP) option. In-app works; external channels need credentials:
   - WhatsApp Cloud API: `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`
   - Email (Resend or Brevo): API key
   - **USER OFFERED TO PROVIDE THESE — ask for them to wire up actual sending.**
2. Multi-branch per shopkeeper (data model ready, UI not built)
3. POS custom-product **camera capture** (manual add works; camera/photo upload pending)
4. Geographic heatmap on admin reports
5. Real app icon/logo (currently a generated placeholder)

## SECURITY TODO (important)
These were shared in chat and should be **rotated**:
- Supabase access token `sbp_…` → https://supabase.com/dashboard/account/tokens
- Vercel token `vcp_…` → https://vercel.com/account/tokens
- Supabase **service-role key** → Settings → API → reset, then update the Vercel env var `SUPABASE_SERVICE_ROLE_KEY` and redeploy
- Admin password `sinu123@` → change it

## Env vars (Vercel + himova/.env.local)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (+ later WHATSAPP_*, RESEND_API_KEY)

## How to test the full loop
1. Admin login (sinughimire@gmail.com) → Products → add variant + set type with stock → upload photos
2. Shopkeeper login (9847465097 / 9847465097) → Catalog → add to cart → place order
3. Admin → Orders → mark Packed → Shipped (warehouse stock drops) → Delivered (shop stock appears)
4. Shopkeeper → POS → sell a pair → print receipt; check Reports + Leaderboard
5. Registration: open /register, sign up with a document → admin sees Pending → Verify

## Working style notes for the agent
- Commit in focused batches; keep typecheck+lint+build green; push to `himova-wholesale-portal` (auto-deploys); verify Vercel READY.
- Canonical tool names are `fs_write` (create/overwrite) and `execute_bash`.
- i18n: every user-facing string goes in both `messages/en.json` and `messages/ne.json` (patch via a tiny node script to avoid JSON breakage).
- Supabase nested-select types are permissive; cast via `as unknown as` when needed.
