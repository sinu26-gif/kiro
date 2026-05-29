# Himova — Design (Phase 1 MVP)

## 1. High-Level Architecture

```
                                 +------------------+
                                 |   Admin (Web)    |
                                 +--------+---------+
                                          |
   +-------------------+                  |
   | Shopkeepers (PWA) +------------------+
   +--------+----------+                  |
            |                             |
            v                             v
        +----------------------------------+
        |        Next.js App (Vercel)      |
        |  - App Router (RSC + actions)    |
        |  - PWA shell + offline cache     |
        |  - next-intl (en, ne)            |
        +----------------+-----------------+
                         |
            +------------+------------+----------------+
            v                         v                v
     +-------------+         +----------------+  +-------------+
     |  Supabase   |         | WhatsApp Cloud |  |   Resend    |
     |  Postgres,  |         |     API        |  |   (email)   |
     |  Auth,      |         +----------------+  +-------------+
     |  Storage,   |
     |  Realtime   |
     +-------------+
```

- One Next.js codebase, two route groups: `(admin)` and `(shop)`.
- Authentication and authorization handled at the middleware layer; RLS enforces row-level data scope in Postgres as a second layer.

---

## 2. Roles and Permissions

| Role | Auth | Scope |
|---|---|---|
| `admin` | email + password | Full read/write on every row |
| `shopkeeper` | phone + password (+ OTP at signup) | Read/write only their own rows |
| `anon` | none | Public leaderboard view only |

Middleware at `/middleware.ts` checks the JWT and redirects:
- Anon hitting `(admin)/*` -> `/login`.
- Anon hitting `(shop)/*` -> `/login`.
- Shopkeeper hitting `(admin)/*` -> `403`.
- Admin hitting `(shop)/*` -> allowed (admin can preview shopkeeper UX in read-only mode) — Phase 2.

---

## 3. Database Schema

All tables use UUID primary keys, `created_at`, `updated_at`. RLS is enabled on every table that holds user-scoped data.

### 3.1 `profiles`
Mirrors `auth.users`. One row per authenticated user.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | = auth.users.id |
| role | text | `'admin' | 'shopkeeper'` |
| full_name | text | |
| created_at, updated_at | timestamptz | |

### 3.2 `shopkeepers`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| profile_id | uuid (FK -> profiles) | |
| shop_name | text | |
| owner_name | text | |
| phone | text (unique) | E.164 |
| address | text | |
| location_lat | numeric | |
| location_lng | numeric | |
| logo_url | text | |
| shopkeeper_type | text | `'shoes' | 'clothes'` — determines which product category is visible |
| status | text | `active | suspended` |
| created_at | timestamptz | |

### 3.3 `categories`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | e.g., Shoes, Clothing, Accessories |
| slug | text (unique) | |
| parent_id | uuid (nullable, FK -> categories) | for sub-categories |

### 3.4 `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| category_id | uuid (FK) | |
| description | text | |
| video_url | text (nullable) | YouTube |
| suggested_retail_paisa | int (nullable) | |
| status | text | `active | archived` |
| created_at | timestamptz | |

### 3.5 `product_photos`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK) | |
| url | text | Supabase Storage path |
| sort_order | int | |

### 3.6 `product_variants`
A variant = one colour/style of a product.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK) | |
| variant_name | text | e.g., "Black", "Navy Blue" |
| sort_order | int | |

### 3.7 `set_types`
A set_type defines the size combination + price + stock for a variant.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| variant_id | uuid (FK) | |
| label | text | e.g., "39-43", "S-M-L-XL-XXL" |
| sizes | text[] | array of size labels in pack order |
| price_paisa | int | **full set price** (used for checkout calculation) |
| warehouse_stock | int | sets currently in warehouse |
| reorder_threshold | int | low-stock alert level |

**Pricing display logic (computed, not stored):**
- `display_price_paisa = price_paisa / array_length(sizes)` → price per single shoe/piece shown to shopkeeper on product cards and detail page.
- At checkout: `line_total = price_paisa × set_quantity` (full set price × number of sets).
- The per-piece price is for **display only** — the actual billing is always at the set level.

Constraint: `array_length(sizes, 1) = 5` for shoes; for clothing the array length matches the label.
Constraint: `unique(sizes per variant_id)` — no two set_types in the same variant share the same size combo.

### 3.8 `shopkeeper_pricing`
Manual price overrides per shopkeeper.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shopkeeper_id | uuid (FK) | |
| set_type_id | uuid (FK) | |
| override_paisa | int (nullable) | absolute price |
| discount_percent | numeric(5,2) (nullable) | alternative form |
| note | text | shown to shopkeeper as the reason/badge |

### 3.9 `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shopkeeper_id | uuid (FK) | |
| status | text | `pending | packed | shipped | delivered | cancelled` |
| subtotal_paisa | int | |
| discount_paisa | int | |
| total_paisa | int | |
| payment_method | text | `cod | bank | esewa | khalti` |
| payment_status | text | `unpaid | paid` |
| free_delivery | bool | |
| estimated_delivery_at | date | |
| placed_at | timestamptz | |
| shipped_at | timestamptz (nullable) | |
| delivered_at | timestamptz (nullable) | |

### 3.10 `order_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK) | |
| set_type_id | uuid (FK) | |
| set_quantity | int | |
| unit_price_paisa | int | snapshot |
| line_total_paisa | int | snapshot |

### 3.11 `shop_stock`
Per-shopkeeper inventory at the size-piece level.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shopkeeper_id | uuid (FK) | |
| variant_id | uuid (FK) | |
| size | text | e.g., "39", "M" |
| quantity | int | |

Unique on `(shopkeeper_id, variant_id, size)`.

### 3.12 `stock_movements`
Single source of truth for all stock changes.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| scope | text | `warehouse | shop` |
| shopkeeper_id | uuid (nullable) | when scope=shop |
| set_type_id | uuid (nullable) | when scope=warehouse |
| variant_id | uuid (nullable) | when scope=shop |
| size | text (nullable) | when scope=shop |
| delta | int | positive = in, negative = out |
| reason | text | `restock | order_shipped | order_delivered | retail_sale | manual_adjust` |
| reference_id | uuid (nullable) | order_id, sale_id, etc. |
| actor_profile_id | uuid | who performed the action |
| created_at | timestamptz | |

### 3.13 `pos_sales`
Each retail sale a shopkeeper makes.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shopkeeper_id | uuid (FK) | |
| customer_id | uuid (nullable, FK -> shop_customers) | |
| subtotal_paisa | int | |
| discount_paisa | int | |
| total_paisa | int | |
| return_policy_text | text | snapshot at sale time |
| created_at | timestamptz | |

### 3.14 `pos_sale_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| sale_id | uuid (FK) | |
| variant_id | uuid (nullable, FK) | NULL when it's a custom shopkeeper product |
| custom_product_id | uuid (nullable, FK -> custom_products) | |
| size | text (nullable) | |
| quantity | int | |
| unit_price_paisa | int | |
| line_total_paisa | int | |

### 3.15 `pos_payments`
Supports split payments per sale.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| sale_id | uuid (FK) | |
| method | text | `cash | esewa | khalti | other` |
| amount_paisa | int | |

### 3.16 `shop_customers`
Per-shopkeeper customer DB.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shopkeeper_id | uuid (FK) | |
| name | text | |
| phone | text | |
| created_at | timestamptz | |

Unique on `(shopkeeper_id, phone)`.

### 3.17 `custom_products`
Products a shopkeeper added themselves (not bought from Himova).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shopkeeper_id | uuid (FK) | |
| name | text | |
| photo_url | text | |
| price_paisa | int | |
| stock_qty | int | manual |

### 3.18 `notifications`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| recipient_profile_id | uuid (FK) | |
| title | text | |
| body | text | |
| link | text | in-app deep link |
| read_at | timestamptz (nullable) | |
| created_at | timestamptz | |

### 3.19 `rewards`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| cycle_label | text | e.g., "May 2026" |
| shopkeeper_id | uuid (FK) | |
| rank | int | 1, 2, 3 ... |
| reward_type | text | `discount_percent | free_set | custom_item` |
| reward_value | text | description / value |
| created_by | uuid (FK -> profiles) | |
| created_at | timestamptz | |

### 3.20 `registration_requests`
Pending shopkeeper sign-up requests submitted via the public form. Admin reviews and approves/rejects.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| shop_name | text | |
| owner_name | text | |
| phone | text | |
| address | text | |
| shopkeeper_type | text | `'shoes' | 'clothes'` |
| status | text | `'pending' | 'approved' | 'rejected'` |
| reviewed_by | uuid (nullable, FK -> profiles) | admin who reviewed |
| reviewed_at | timestamptz (nullable) | |
| rejection_reason | text (nullable) | |
| created_shopkeeper_id | uuid (nullable, FK -> shopkeepers) | set on approval |
| created_at | timestamptz | |

---

## 4. Key Server Operations (Transactions)

### 4.1 Place order (shopkeeper)
1. Validate cart against current `set_types.warehouse_stock`.
2. Apply `shopkeeper_pricing` overrides per item.
3. **Calculate totals:**
   - For each item: `line_total = set_types.price_paisa × set_quantity`.
   - (Note: the display_price shown to the shopkeeper is `price_paisa / array_length(sizes)` i.e., per piece, but billing uses the full set price.)
4. Create `orders` + `order_items` rows with `unit_price_paisa = set_types.price_paisa` (full set price snapshot).
5. (No stock change yet — happens on Shipped.)
6. Insert in-app notification + queue WhatsApp message to admin.

### 4.2 Mark order Shipped (admin)
1. Update `orders.status = 'shipped'`, `shipped_at = now()`.
2. For each order_item, decrement `set_types.warehouse_stock`. Insert `stock_movements` with `reason='order_shipped'`.
3. Notify shopkeeper.

### 4.3 Mark order Delivered (admin)
1. Update `orders.status = 'delivered'`, `delivered_at = now()`.
2. For each order_item, increment `shop_stock` per size:
   - For each size in the set_type's `sizes` array, increment by `set_quantity`.
   - Insert `stock_movements` per size with `reason='order_delivered'`.
3. Notify shopkeeper.

### 4.4 Record POS sale (shopkeeper)
1. Validate each line against `shop_stock`.
2. Create `pos_sales` + `pos_sale_items` + `pos_payments`.
3. Decrement `shop_stock` for each line. Insert `stock_movements` with `reason='retail_sale'`.
4. Upsert `shop_customers` if customer phone provided.
5. If customer phone given, queue WhatsApp receipt.

All four operations run in a Postgres transaction (Supabase RPC) to guarantee atomicity.

---

## 5. UI / Screens

### 5.1 Shopkeeper (mobile-first)
- **Login** — phone + password.
- **OTP verify** (first login only).
- **Home** — hub page with navigation to sub-pages:
  - **New Arrivals** (sub-page) — latest products in shopkeeper's category.
  - **Best Sellers** (sub-page) — products most sold across ALL shopkeepers (aggregate, not individual). No "Recommended for You" section here.
  - **Your Previous Orders** (sub-page) — products this individual shopkeeper ordered before (for easy reorder).
- **Catalog** — grid + search + filters (auto-filtered by shopkeeper_type category).
- **Product detail** — single product photo prominently displayed, price shown per single shoe/piece, variants, set types, add-to-cart with set quantity (checkout multiplies price × sets).
- **Cart** — items, qty (sets), total (price × sets), checkout.
- **Checkout** — payment method, place order. Total = per-shoe/piece price × number of sets.
- **Orders** — list + detail with status tracker.
- **Stock** — sizes per product, low-stock badges, reorder CTA.
- **POS** — search/grid -> selector -> sale -> payment -> receipt.
- **Customers** — list, detail, history.
- **Reports** — sales, profit, stock value, top customer, highest-revenue day, focus suggestions, expense (basic).
- **Leaderboard** — public ranking, badges.
- **Settings** — language toggle, change password, logout.

### 5.2 Admin (desktop-first)
- **Dashboard** — KPIs, charts: orders today, revenue this month, low-stock count, top shopkeepers.
- **Products** — list, create, edit, archive.
- **Shopkeepers** — list, create, edit, view profile (with their order history + stock + ranking). Create/edit includes **shopkeeper_type** selector (`shoes` | `clothes`).
- **Orders** — list with filters, detail with status update + free-delivery toggle + payment confirm.
- **Stock** — warehouse view, low-stock alerts, manual restock.
- **Leaderboard** — admin private view + reward cycle UI.
- **Reports** — all admin reports + Excel/PDF export.
- **Notifications** — bell icon, history.
- **Settings** — user management (Phase 2: sub-admins).

---

## 5a. Shopkeeper Home — Sub-Page Architecture

The shopkeeper Home page is a **hub** with distinct sub-pages, each accessible via navigation cards/tabs on the home landing. All sub-pages are nested routes under `(shop)/home/`.

### Route structure:
```
app/(shop)/home/
├── page.tsx             # Hub: shows navigation cards to each sub-page
├── new-arrivals/
│   └── page.tsx         # New Arrivals sub-page
├── best-sellers/
│   └── page.tsx         # Best Sellers sub-page
└── previous-orders/
    └── page.tsx         # Your Previous Orders sub-page
```

### 5a.1 Home Hub (`/home`)
- Displays 3 navigation cards (large, tappable, with icons/illustrations):
  1. **New Arrivals** — "See what's new" with a preview count (e.g., "12 new items")
  2. **Best Sellers** — "Most popular across all shops" with a preview of top 3 product thumbnails
  3. **Your Previous Orders** — "Reorder quickly" with count of unique products ordered before
- Each card navigates to the corresponding sub-page.
- Below the cards: a quick-access search bar that links to the full catalog.

### 5a.2 New Arrivals (`/home/new-arrivals`)
- Shows products added in the last 30 days (configurable by admin).
- **Filtered by shopkeeper_type:** shoes shopkeeper sees only new shoes, clothes shopkeeper sees only new clothes.
- Sorted by `created_at` descending (newest first).
- Each card: product photo, name, per-piece display price, "Add to cart" button.
- Pagination or infinite scroll for large lists.

### 5a.3 Best Sellers (`/home/best-sellers`)
- Shows products ranked by **total sets sold across ALL shopkeepers** (aggregate sales data).
- **NOT** "Recommended for You" — there is no personalized recommendation here.
- **Filtered by shopkeeper_type:** shoes shopkeeper sees best-selling shoes only; clothes shopkeeper sees best-selling clothes only.
- Data source: `SUM(order_items.set_quantity)` grouped by product, joined through `set_types → product_variants → products`, filtered by category matching shopkeeper_type.
- Only includes orders with status `delivered` (confirmed sales, not pending/cancelled).
- Each card: product photo, name, per-piece display price, total sets sold badge (e.g., "🔥 250 sets sold"), "Add to cart" button.
- Top 20 products shown by default; "See more" loads additional.

### 5a.4 Your Previous Orders (`/home/previous-orders`)
- Shows products that **this individual shopkeeper** has ordered before.
- Sorted by most recently ordered first.
- **Only shows products in the shopkeeper's assigned category** (shoes or clothes).
- Data source: `order_items` joined to `orders` where `orders.shopkeeper_id = current_shopkeeper` and `orders.status != 'cancelled'`.
- Each card: product photo, name, per-piece display price, last ordered date, quantity last ordered, "Reorder" button (pre-fills cart with same variant/set type/quantity).
- If the shopkeeper has never ordered anything, shows an empty state: "You haven't ordered yet. Check out our Best Sellers!"

---

## 6. WhatsApp Templates

Pre-approved templates submitted to Meta:
1. **shopkeeper_welcome** — "Welcome to Himova, {{shop_name}}. Your login is your phone {{phone}}. Open: {{link}}"
2. **order_placed_admin** — "{{shop_name}} placed order #{{id}} for Rs {{total}}. Open admin: {{link}}"
3. **order_status_update** — "Hi {{shop_name}}, your order #{{id}} is now {{status}}. Estimated: {{eta}}."
4. **payment_due_reminder** — "Reminder: Order #{{id}} payment of Rs {{amount}} is pending."
5. **new_product** — "New arrival on Himova: {{product_name}}. View: {{link}}"
6. **leaderboard_weekly** — "This week on Himova: 1. {{first}} 2. {{second}} 3. {{third}}"
7. **reward_announcement** — "Congrats {{winner}}! You won {{reward}} in {{cycle}}."
8. **pos_receipt_to_customer** — "Thank you for shopping at {{shop_name}}. Receipt: {{link}}"

---

## 7. Localisation

- `messages/en.json` and `messages/ne.json`.
- Top-level keys: `auth`, `home`, `catalog`, `product`, `cart`, `checkout`, `orders`, `stock`, `pos`, `customers`, `reports`, `leaderboard`, `settings`, `common`.
- Currency formatting always in NPR with `Rs ` prefix.
- Numbers in Western Arabic numerals (matches Nepali shop convention).

---

## 8. PWA Specifics
- `manifest.json` with Himova brand colours, icons (192/512 px).
- Service worker caches the app shell, product images, and the most recent catalog page.
- Offline POS mode is **not** in Phase 1 (introduces sync conflicts). Shop must have internet for POS.

---

## 9. Security
- HTTPS enforced (Vercel default).
- All API routes/actions validate JWT.
- Row Level Security on every table:
  - Shopkeeper rows: `shopkeeper_id = auth.uid_to_shopkeeper()`.
  - Admin rows: `is_admin()`.
- Service role key only used in server-side admin actions; never shipped to the client.
- Rate limit on login (5 attempts / 5 minutes) and OTP requests.

---

## 10. Observability
- Vercel analytics (free tier) for traffic and Web Vitals.
- Supabase logs for database errors.
- Custom `app_events` table to log critical business events (order placed, sale completed) for debugging.
