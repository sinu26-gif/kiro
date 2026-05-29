---
inclusion: always
---

# Himova — Product Context

## What This Project Is
Himova is a Progressive Web App (PWA) that serves two audiences from one codebase:

1. **Himova Admin** (desktop-first) — the wholesaler's control panel.
2. **Shopkeeper Portal** (mobile-first) — for retail shopkeepers in Nepal who buy from Himova.

The shopkeeper side has two halves: an **e-commerce-style ordering interface** to buy from Himova, and a **POS system** for the shopkeeper's own daily retail sales.

## Single Wholesaler Model
Phase 1 has exactly **one wholesaler**: Himova. Do NOT build multi-tenant marketplace logic. The data model can leave room for a future `wholesaler_id`, but every current product, order, and report assumes a single wholesaler.

## Key Domain Rules

### Products and Sets
- A **Product** has a name, category (Shoes/Clothing/etc.), photos, optional YouTube video link, and a description.
- Products have **Variants** by colour (or other distinguishing attribute).
- Each variant has one or more **Set Types** that define the size combination sold as one unit.
  - Shoes example: `39-43`, `40-44`, `35-39` (always 5 pairs, whole sizes only — no half sizes).
  - Clothing example: `S, M, L, XL, XXL` or `M, L, XL, XXL` (each size appears only once per set, no duplicates).
- Stock is held at the **set level** in the warehouse, but **broken into individual pairs/pieces** the moment it reaches a shopkeeper's stock.
- Shopkeepers must order in whole sets — they cannot order single pairs from Himova.
- Customers walking into a shopkeeper's shop can buy **single pieces**.

### Shopkeeper Types
- Every shopkeeper is assigned a **type**: `shoes` or `clothes`.
- This type is set by the admin when creating the shopkeeper account (or from the registration form request).
- A `shoes` shopkeeper only sees products in the Shoes category.
- A `clothes` shopkeeper only sees products in the Clothing category.
- This filtering is enforced server-side — not just hidden in the UI.
- Admin can change a shopkeeper's type at any time from their profile.

### Pricing
- Each set type has a fixed price set by the admin.
- **Display price:** Product cards and detail pages show the price of **one single shoe/piece** with a product photo — NOT the full set price.
- **Checkout price:** At checkout, the displayed per-piece price is multiplied by the number of sets being ordered. The shopkeeper selects how many sets to order; the total = per-piece price × number of sets.
- Admin can manually override the price for a specific shopkeeper (shown transparently with badge/discount label).
- Admin can suggest an MRP/retail price; shopkeeper can override in their own POS.
- **VAT is excluded** from all pricing and bills.
- No bulk discount on single orders.

### Stock
- Two separate stocks: **Warehouse Stock** (Himova) and **Shop Stock** (each shopkeeper).
- Auto-deduction: warehouse decreases on shipment, shop increases on delivery, shop decreases on retail sale.
- Low stock alerts trigger for both admin and shopkeeper, with a "Reorder from Himova" CTA on the shopkeeper side.
- Full audit log of every stock movement, visible to both admin and the affected shopkeeper.

### Orders (Shopkeeper -> Himova)
- Shopkeepers order whole sets only.
- Order status flow: `Pending -> Packed -> Shipped -> Delivered`.
- Admin can mark each order as **Free Delivery** manually.
- Payment options: **Cash on Delivery, Bank Transfer, eSewa, Khalti**. No credit, no instalments — full payment only.

### Shopkeeper Home Page (Hub with Sub-Pages)
The shopkeeper home page is NOT a single scrollable page with all sections. It is a **hub** with navigation cards that lead to separate sub-pages:

1. **New Arrivals** — Products added in the last 30 days, filtered by shopkeeper's assigned category.
2. **Best Sellers** — Products with the highest total sets sold across **ALL shopkeepers combined** (not just the current one). This is an aggregate ranking. There is NO "Recommended for You" section — best sellers are purely data-driven from total sales volume.
3. **Your Previous Orders** — Products that **this specific shopkeeper** has ordered before. Sorted by most recently ordered. Includes a "Reorder" button for quick repeat ordering.

**Key distinctions:**
- "Best Sellers" = most sold across all shopkeepers (aggregate). If a shoe has 500 sets sold total across 50 shopkeepers, it's a best seller.
- "Previous Orders" = only what this individual shopkeeper has ordered (personal history).
- There is NO "Recommended for You" anywhere. The algorithm is simple: best sellers = highest total sales volume.

### POS (Shopkeeper -> Customer)
- Search products by name OR tap a photo.
- Sell single pieces from shop stock.
- Split payments allowed (e.g., Rs 500 cash + Rs 500 eSewa).
- Receipt sent via WhatsApp to customer if their number is provided.
- Return policy is **exchange only — no refunds**. The receipt template states this.
- End-of-day closing report: total sales, cash in hand, digital received, items sold, profit.
- Each shopkeeper builds their own customer database.
- Shopkeepers can also add their own products (bought from other wholesalers) to their POS — captured by phone camera, named, priced manually.

### Branches
- One shopkeeper account can have multiple branches in different locations.
- Each branch has its own stock and POS but shares the same login/account.

### Leaderboard and Gamification
- Public leaderboard ranking shopkeepers by **total Rs ordered** from Himova.
- Additional sections (separate views): **most sets ordered**, **most active in last 30 days**.
- Each shopkeeper's leaderboard card also shows their top-ordered products with name and photo (helps others learn what sells).
- Badges: **Gold Shopkeeper, 100 Sets Club, Top Seller of the Month**.
- Rewards: admin manually picks top 3 (or more) winners; reward is a manual choice (discount, free set, item). All shopkeepers are notified when rewards are given out.
- Admin sees a private admin leaderboard view with full data; shopkeepers see the public version.

### Notifications
- **Channels:** in-app, WhatsApp, email (Viber explored later as a free marketing channel).
- **No SMS** in Phase 1 (cost reasons).
- Trigger matrix: orders placed, shipped, delivered; low stock; new product launch; leaderboard updates; payment received; payment due reminders.

### Authentication
- **Shopkeepers:** phone-number login. First-time signup uses OTP verification. Initial password = the shopkeeper's own phone number (they can change it later). Shopkeeper accounts are created manually by the admin only.
- **Admin:** email + password (more secure). Admin can have sub-admins later but not in Phase 1.

### Reports
- Admin reports: daily/weekly/monthly sales, top products, top shopkeepers, slow-moving stock, profit margins, outstanding payments, geographic heatmap.
- Shopkeeper reports: daily sales, bestsellers in their shop, profit, stock value, top customers, highest-revenue day, low-sales-products focus suggestions.
- All reports exportable to Excel/PDF on both mobile (shopkeeper) and desktop (admin).

## UI Tone
- Admin: professional, structured, dense, desktop-optimized.
- Shopkeeper: simple, mobile-optimized, large tap targets, minimal text, generous use of product photos.
- Both: bilingual (English/Nepali) with a one-tap language toggle in the header.

## What NOT to Build (Phase 1)
- Multi-wholesaler marketplace.
- Native mobile apps.
- Credit / loan / pay-later flows.
- Half-size shoes (39.5, 40.5).
- Refunds (exchange only).
- Custom mixed-size sets when ordering from Himova (each size appears once per set).
- VAT calculations.
- SMS-based OTP (use WhatsApp/email instead where possible).
