# Himova — Requirements (Phase 1 MVP)

This document defines the user stories and acceptance criteria for Phase 1. Anything marked **[P2]** or **[P3]** is out of scope for the MVP and is recorded for later phases.

---

## 1. Authentication

### 1.1 Shopkeeper login
**As a** shopkeeper, **I want** to log in with my phone number, **so that** I can access my dashboard quickly.

**Acceptance:**
- Login screen accepts a Nepali phone number (10 digits, starting with `9`).
- Default password equals the shopkeeper's own phone number on first login.
- Shopkeeper is forced to verify the phone via OTP on **first** login.
- After verification, shopkeeper can change the password from settings.
- Session persists across visits (stay logged in).
- Previous data (orders, stock, customers, POS sales) is intact on every login.

### 1.2 Admin login
**As an** admin, **I want** to log in with email and password, **so that** my account is protected.

**Acceptance:**
- Email + password login form.
- Failed login attempts are rate-limited.
- Sessions expire after 30 days of inactivity.

### 1.3 Account creation
**As an** admin, **I want** to create shopkeeper accounts manually, **so that** only verified buyers can use the platform.

**Acceptance:**
- Shopkeepers cannot self-register.
- Admin enters: shop name, owner name, phone, address, location pin (Google Maps), optional logo, **shopkeeper type** (`shoes` | `clothes`).
- **Shopkeeper type** determines which product category the shopkeeper can browse and order:
  - `shoes` → only sees products in the Shoes category.
  - `clothes` → only sees products in the Clothing category.
- Admin can change the shopkeeper type later from the shopkeeper profile.
- Shopkeeper receives a WhatsApp message with login instructions.

### 1.4 Shopkeeper self-registration form
**As a** potential shopkeeper, **I want** to submit a registration request, **so that** the admin can review and approve my account.

**Acceptance:**
- A public registration form is accessible (no login required).
- Form fields: shop name, owner name, phone, address, **shopkeeper type** (`shoes` | `clothes`).
- Submitting the form does NOT create an active account — it creates a pending request visible to the admin.
- Admin reviews the request and either approves (creating the account with the selected type) or rejects it.
- The shopkeeper type selected in the form pre-fills the admin's creation form but admin can override it.

---

## 2. Product Catalog (Admin)

### 2.1 Create a product
**As an** admin, **I want** to add a product with variants and set types, **so that** shopkeepers can order it.

**Acceptance:**
- Fields: name, category (Shoes / Clothing / Accessories / Other), description, suggested retail price (optional), photos (multiple), YouTube video URL (optional).
- At least one variant per product (e.g., Black, White).
- Each variant has at least one set type (e.g., `39-43`, `S-M-L-XL-XXL`).
- Each set type has: size list, set price, current warehouse stock, optional reorder threshold.
- Validation: clothing set has unique sizes (no duplicates); shoe set has only whole sizes.

### 2.2 Edit and archive products
- Admin can edit any product/variant/set type.
- Admin can archive a product (hidden from shopkeepers but kept for historical orders).

### 2.3 Set type templates
- System provides templates for common sets: `39-43`, `40-44`, `35-39`, `S-M-L-XL-XXL`, `M-L-XL-XXL`. Admin can pick a template or define custom.

---

## 3. Catalog Browsing (Shopkeeper)

### 3.0 Category-filtered catalog
**As a** shopkeeper, **I want** to only see products in my assigned category, **so that** I don't get confused by irrelevant products.

**Acceptance:**
- If shopkeeper type is `shoes`, the catalog, home page, search, and filters only show Shoes category products.
- If shopkeeper type is `clothes`, only Clothing category products are shown.
- This filter is enforced server-side (RLS or query-level) — not just a UI filter.
- Admin can view all products regardless.

### 3.1 Home page
**As a** shopkeeper, **I want** a curated home page, **so that** I can quickly find what to order.

**Acceptance:**
- Home page acts as a hub with navigation to separate sub-pages (all within the home route).
- Sub-pages accessible from home:
  - **New Arrivals** — latest products added in the shopkeeper's assigned category.
  - **Best Sellers** — products with the highest total sets sold across ALL shopkeepers (not just the current one). Does NOT include "Recommended for You" — this is purely based on aggregate sales data.
  - **Your Previous Orders** — items that this individual shopkeeper has ordered before (for easy reordering).
- Each card shows: one product photo, product name, price per single shoe/piece, and an "Add to cart" button.
- All sub-pages only show products matching the shopkeeper's assigned category (shoes or clothes).

### 3.2 Product detail
- Shows **one primary product photo** prominently (hero image).
- Additional photos in a swipeable gallery below.
- Embedded YouTube video if URL provided.
- Variant selector (colour swatches).
- Set type selector.
- **Price displayed = price per single shoe/piece** (not the full set price).
  - Example: If a set of 5 shoes (39-43) costs Rs 5,000, display shows "Rs 1,000" (per shoe).
  - A subtle label below the price says "per piece" or "प्रति जोडी".
- "Add to cart" with quantity selector (number of **sets**).
- When adding to cart, the UI shows: "X sets × Rs Y per piece = Rs Z total" as a confirmation.

### 3.3 Search and filter
- Search by product name.
- Filter by category, price range, availability.

---

## 4. Cart and Ordering (Shopkeeper)

### 4.1 Cart
**Acceptance:**
- View, edit quantities (number of sets), remove items.
- Each line item shows: product photo, name, variant, set type, **per-piece price**, number of sets, **line total** (per-piece price × number of sets).
- Cart shows subtotal (sum of all line totals), applicable discount (if any manual override exists), total.
- Persists across sessions (server-side cart per shopkeeper).

### 4.2 Place order
- Select branch (if shopkeeper has multiple) — **[P2]**, Phase 1 has single-branch only.
- Select payment method: COD, Bank Transfer, eSewa, Khalti.
- **Order total calculation:** For each item: per-piece price × number of sets = line total. Sum of all line totals = order total.
- Order placed with status `Pending`.
- Shopkeeper sees an estimated delivery date (admin-configurable, default 3 days).
- Admin receives in-app + WhatsApp notification immediately.

### 4.3 Order tracking
- Shopkeeper sees status flow: Pending -> Packed -> Shipped -> Delivered.
- Status changes pushed via in-app and WhatsApp.

---

## 5. Order Management (Admin)

### 5.1 Order list
- Filterable by status, shopkeeper, date.
- Click into any order to see full details.

### 5.2 Update order
- Update status: Pending -> Packed -> Shipped -> Delivered.
- Toggle "Free Delivery" for this order.
- Mark payment as received (with method confirmation).
- Cancel order with reason.

### 5.3 Notifications
- Each status change auto-notifies the shopkeeper via in-app + WhatsApp.

---

## 6. Stock Management

### 6.1 Warehouse stock (Admin)
- Each set type has a current stock level visible on the product page and stock dashboard.
- Adjustments happen automatically:
  - Stock in: when admin manually adds restock (with quantity and source note).
  - Stock out: when an order is marked Shipped, the corresponding sets are deducted.
- Low-stock alerts when stock < reorder threshold.

### 6.2 Shop stock (Shopkeeper)
- When an order is marked Delivered, the sets are auto-broken into individual pieces and added to the shopkeeper's stock.
  - Example: 10 sets of `39-43` = 10 of size 39, 10 of size 40, 10 of size 41, 10 of size 42, 10 of size 43.
- Shop stock UI shows availability per size (some may be 0).
- Low-stock alerts when any size drops below 2 pieces (configurable later).
- "Reorder from Himova" button on the shop stock screen.

### 6.3 Stock movement log
- Every increase or decrease is logged: timestamp, who, what, quantity, reason.
- Both admin and the affected shopkeeper can view the log.

---

## 7. POS (Shopkeeper)

### 7.1 Make a sale
**Acceptance:**
- Search bar (by product name) and a grid of photos to tap.
- Tapping a product opens a size selector showing only sizes with stock.
- Selected items go into a "current sale" panel.
- Apply per-item price override (manual discount).
- Choose payment method(s): supports split payments (e.g., Rs 500 cash + Rs 500 eSewa).
- Optional customer info: name, phone (used for WhatsApp receipt and customer DB).
- Complete sale -> stock auto-deducted, sale logged, receipt generated.

### 7.2 Receipt
- Receipt shows: shop name, address, sale ID, date/time, items (name, size, qty, price), totals, payment method(s), exchange-only return policy notice, thank-you message.
- VAT is **not** included.
- Receipt sent to customer via WhatsApp if phone provided.
- Receipt downloadable as PDF.

### 7.3 Custom shopkeeper products
- Shopkeeper can add a product NOT bought from Himova.
- Take photo with phone camera, name it, set price.
- These appear in POS but NOT in Himova ordering.
- Stock managed manually by the shopkeeper.

### 7.4 End-of-day closing
- One-tap "Close day" button.
- Report: total sales, cash collected, digital received per method, items sold, profit (sale price - suggested cost), top-selling item of the day.
- Stored for the daily/weekly/monthly reports.

### 7.5 Customer database
- Each sale with a customer phone adds/updates a record in the shopkeeper's customer list.
- View customer history per customer.
- Used later for marketing — **[P2]**.

---

## 8. Leaderboard

### 8.1 Public leaderboard (all users)
- **Default view:** Top shopkeepers by total NPR ordered (all time).
- **Tabs:** Total NPR | Total Sets | Most Active in Last 30 Days.
- Each row: rank, shop name, location, total amount/sets, badges.
- Click a row to see that shopkeeper's most-ordered products (name + photo) — helps others learn what sells.
- Shopkeepers' personal data (customers, individual sales) is NEVER on the public leaderboard.

### 8.2 Badges
- **Gold Shopkeeper** (top 3 of all time).
- **100 Sets Club** (cumulative 100+ sets ordered).
- **Top Seller of the Month** (current month leader).
- Badges appear next to shop name on leaderboard and in their profile.

### 8.3 Rewards (Admin)
- Admin opens "Run Reward Cycle" UI.
- Selects N winners (default 3), picks reward per winner from: Discount %, Free Set, Custom Item.
- On confirm: every shopkeeper is notified in-app and via WhatsApp who won and what they won.
- Reward record stored for audit.

### 8.4 Admin private leaderboard
- Same data but with extra columns: contact details, last-order date, average days between orders, drop-off risk flag.

---

## 9. Notifications

### 9.1 Channels
| Trigger | Recipient | Channels |
|---|---|---|
| New order placed | Admin | In-app + WhatsApp |
| Order status changed | Shopkeeper | In-app + WhatsApp |
| Payment received | Admin | In-app |
| Payment due reminder | Shopkeeper | In-app + WhatsApp + Email |
| Low stock (warehouse) | Admin | In-app |
| Low stock (shop) | Shopkeeper | In-app |
| New product launched | All shopkeepers | In-app + WhatsApp |
| Leaderboard update | All shopkeepers | In-app (weekly digest via WhatsApp) |
| Reward given | All shopkeepers | In-app + WhatsApp |

### 9.2 Channel rules
- WhatsApp uses Cloud API templates; never includes private/PII data without consent.
- Email used for receipts/exports and weekly digests.
- No SMS in Phase 1.

---

## 10. Reports

### 10.1 Admin reports
- **Sales:** daily / weekly / monthly with chart and table.
- **Top products:** by quantity and by revenue.
- **Top shopkeepers:** with breakdown.
- **Slow-moving stock:** sets with no orders in 30+ days.
- **Profit margins:** per product and per shopkeeper.
- **Outstanding payments:** orders shipped but not yet paid.
- **Geographic heatmap:** orders by location pin (Google Maps embed).
- **Export:** every report exportable to Excel and PDF.

### 10.2 Shopkeeper reports
- Daily / weekly / monthly sales summary.
- Bestselling products (their shop).
- Profit calculation.
- Stock value (money sitting in inventory).
- Top customers.
- Highest-revenue day of the month.
- "Focus suggestions" — slow-moving stock with hint to discount.
- **Optional expense tracking** (toggle on/off): rent, electricity, staff salary, custom — **[P2 starts here, basic tracker in P1]**.
- **Export:** every report exportable to Excel and PDF from mobile.

---

## 11. Branches **[P2]**
- One shopkeeper account, multiple branches.
- Each branch has its own stock and POS.
- Reports filterable by branch.
- Phase 1 MVP supports a single branch per shopkeeper. Data model supports branches; UI delivered in Phase 2.

---

## 12. Internationalisation
- All UI strings available in English and Nepali.
- Language toggle in header, persisted per user.
- Receipts and emails localised based on user language preference.

---

## 13. Non-functional Requirements
- PWA installable on Android and iOS.
- First contentful paint under 2 seconds on 4G in Kathmandu.
- Works on screens from 360px wide (mobile) to 1920px (desktop).
- Zero data corruption: all stock movements and sales are transactional.
- Daily automated backup of database (Supabase handles this on the free tier).
- All shopkeeper-scoped data protected by RLS — a shopkeeper can never see another shopkeeper's data.
- Admin actions are audit-logged (who did what, when).

---

## 14. Out of Scope (Phase 1)
- Multi-wholesaler / sub-admin marketplace.
- Native iOS/Android apps.
- Credit / pay-later.
- VAT calculation.
- Half sizes.
- Custom mixed-size set ordering.
- Refunds (exchange-only policy).
- SMS notifications.
- Loyalty / cashback programs.
