# NEPSE Auction Share Analyzer

A complete, **100% browser-based** research and quantitative system for
**NEPSE auction shares** — from data ingest to event-window analysis,
technical and fundamental scoring, macro / budget overlays,
**Monte Carlo simulation with Jump-Diffusion**, mean-CVaR portfolio
optimization, and a printable decision-grade report.

> **Sector-agnostic.** Built first for hydropower (BNHC, Barun, Dordi,
> Joshi, RFPL) but designed to retarget any NEPSE sector (banking,
> microfinance, insurance, hotels, manufacturing, …) by changing one
> dropdown.

## ✨ Why this exists

NEPSE auction shares can clear at meaningful discounts to LTP, but the
outcome depends on a stack of variables: prior auction patterns,
technical/fundamental quality, sector-specific KPIs (PLF, CAR, NIM, …),
the upcoming budget, NRB liquidity stance, and per-ticker volatility &
jump risk.

Most of these get reasoned about informally on the morning of the bid.
This system formalizes the workflow so you can run it in **minutes**
for **any** future auction without rebuilding spreadsheets.

## 🚀 Quick start

1. Clone or download this repo.
2. **Double-click `index.html`** in your browser. That's it.
   - No install, no Python, no server, no build step.
   - Works offline once Chart.js (loaded via CDN) is cached.
   - All your data stays in your browser's `localStorage`.
3. Click **"Load BNHC + Hydro Sample"** on the dashboard to populate
   five hydropower tickers with three years of synthetic OHLCV — then
   walk through Steps 1 → 8.

## 🧭 Workflow

The system is organized as eight sequential modules. Each one is a
separate page; data flows automatically through `localStorage`.

| # | Module | What it does |
|---|---|---|
| 1 | **Data & Setup** | Pick sector, set auction window, add tickers, fundamentals, sector KPIs. Upload CSV OHLCV or auto-generate 3-year synthetic. |
| 2 | **Auction Timeline** | Event-window study (returns + volume z-score) around auction open & close. Historical cohort statistics. 3-tier bid recommender. |
| 3 | **Technical Analysis** | SMA/EMA stack, RSI, MACD, Bollinger, ADX, volume — combined into a -5 → +5 technical scorecard. |
| 4 | **Fundamental Analysis** | Common ratios vs sector median, sector-specific KPIs, DCF + DDM bear / base / bull intrinsic value envelope, -5 → +5 score. |
| 5 | **Macro & Budget** | Nepal macro inputs + 3-scenario budget overlay (bullish / neutral / bearish) with explicit probabilities and μ/σ shocks. |
| 6 | **Monte Carlo** | GBM + Merton Jump-Diffusion, EWMA / GARCH(1,1) volatility, regime-mixed across the 3 budget scenarios. P(price > floor) per horizon. |
| 7 | **Portfolio** | Equal / risk-parity / random-search mean-CVaR allocation across tickers. Outputs NPR amounts and bid quantities. |
| 8 | **Report** | Per-ticker decision cards, recommended bid, conviction tag, portfolio summary, risk register. **Print-friendly.** |

Plus a **Companion**: the original BNHC bid calculator at
`bnhc-calculator.html` (kept intact, with 15 historical hydro auctions).

## 📂 Repository layout

```
.
├── index.html                  # Dashboard / SPA entry
├── styles.css                  # Design system
├── script.js                   # Shared SPA glue
├── bnhc-calculator.html        # Companion historical calculator (preserved)
├── BNHC_Auction_Analysis.md    # Original BNHC analysis writeup
├── BNHC_Bid_Calculator.xlsx    # Original spreadsheet
├── auction share.xlsx          # 260-row historical auction dataset
│
├── pages/
│   ├── data.html               # Step 1 — Data & Setup
│   ├── timeline.html           # Step 2 — Auction Timeline
│   ├── technical.html          # Step 3 — Technical Analysis
│   ├── fundamental.html        # Step 4 — Fundamental Analysis
│   ├── macro.html              # Step 5 — Macro & Budget
│   ├── montecarlo.html         # Step 6 — Monte Carlo
│   ├── portfolio.html          # Step 7 — Portfolio Optimizer
│   └── report.html             # Step 8 — Decision Report
│
├── js/
│   ├── core.js                 # State, formatters, header, toast
│   ├── stats.js                # Descriptive stats, EWMA, GARCH, PRNG, VaR/CVaR
│   ├── sectors.js              # 10 NEPSE sector definitions + KPIs + budget levers
│   ├── data-io.js              # CSV parser, OHLCV normalizer, sample data
│   ├── technical.js            # SMA/EMA/RSI/MACD/Bollinger/ATR/OBV/ADX + scorecard
│   ├── fundamental.js          # DCF, DDM, intrinsic envelope, ratio + KPI scoring
│   ├── auction.js              # Event window, comparables, bid recommender
│   ├── montecarlo.js           # GBM + Merton Jump-Diffusion + budget regimes
│   ├── portfolio.js            # Equal / risk-parity / mean-CVaR optimizer
│   └── charts.js               # Chart.js wrappers + canvas score gauge
│
└── prompts/
    └── master-prompt.md        # Reusable LLM prompt for any sector / auction
```

## 🧮 What's actually computed

**Technical analysis** — 6 components combined to a -5 → +5 score:

- Trend score from SMA(20/50/200) stack
- RSI(14) regime classification
- MACD line/signal/histogram
- Bollinger position
- ADX trend strength
- Volume z-score (last 20 days vs prior 40)

**Fundamental analysis** — 4 components combined to a -5 → +5 score:

- Common ratios vs sector median (P/E, P/B, ROE, ROA, dividend yield, 3y CAGR)
- Sector-specific KPI rollup with editable weights (e.g. PLF, PPA tariff, NPL%, CAR%)
- ROE quality bucket
- Valuation tilt (LTP vs base-case intrinsic from DCF + DDM)

**Auction event study** — for each ticker:

- Cumulative returns over `[-30, -1]`, `[-5, -1]`, `[open, close]`,
  `[close+1, +5]`, `[close+1, +20]`, `[close+1, +60]`
- Volume z-score during the auction vs prior 60 sessions
- 3-tier bid strategy (P25 / P50 / P75 of historical discount cohort)
- Bid → empirical allotment-probability table

**Monte Carlo (the core engine):**

- Parameter estimation: μ from historical drift (optionally blended
  with intrinsic-implied), σ from EWMA(λ=0.94) or GARCH(1,1).
- Jump-Diffusion (Merton): Poisson jump intensity λ, log-normal jump
  size — estimated from the 3-σ outlier filter on log returns.
- **Budget regime mix:** simulate each scenario (bullish / neutral / bearish)
  with its own (μ × muMult, σ × sigmaMult) and weight the paths by
  scenario probability.
- Variance reduction: antithetic variates.
- Per-horizon metrics: median price, mean / median return,
  **P(price > floor bid)**, VaR(95%), CVaR(95%), 5–95 percentile band.
- Outputs: fan chart over time, terminal histogram (red bars =
  unprofitable scenarios at floor bid).

**Portfolio:**

- Equal-weight, risk-parity (1/σ), or random-search **mean-CVaR**
  optimizer using per-ticker MC distributions.
- Outputs portfolio mean / median / std / VaR(95) / CVaR(95) / P(positive),
  per-ticker NPR allocation and bid quantities.

## 🌐 Browser-only — no install

Everything runs client-side. The only network call is to a CDN for
`Chart.js`. After first load it's fully offline.

- **Data persistence:** browser `localStorage` — survives refresh and reboot.
- **Export / Import:** any state can be exported to a JSON file and
  imported on another device.
- **Reset:** one click on the dashboard wipes `localStorage`.
- **Privacy:** your OHLCV, fundamentals, bid prices and capital never
  leave your device.

## 🔁 Re-using for other sectors

The system was built to be **sector-agnostic**:

1. On the **Data** page, change the **Sector** dropdown.
2. The fundamental form auto-swaps to that sector's KPIs (defined in
   `js/sectors.js`).
3. The DCF / DDM uses sector-appropriate medians (in `js/fundamental.js`,
   `SECTOR_MEDIANS`).
4. The macro page shows that sector's likely budget levers.
5. The rest (Monte Carlo, portfolio, report) is sector-agnostic and
   needs no change.

To add a new sector, edit `js/sectors.js` and add a block:

```js
"my-new-sector": {
  label: "My New Sector",
  subIndex: "Sub-Index Name",
  kpis: [
    { key: "kpiA", label: "KPI A", unit: "%", weight: 1.2 },
    { key: "kpiB", label: "KPI B", unit: "x", weight: 1.0, lowerBetter: true },
  ],
  budgetLevers: ["Lever 1", "Lever 2"],
  defaultMacroSensitivity: { rates: 0.4, gdp: 0.6 },
}
```

…and (optionally) a sector-median row in `js/fundamental.js`.

## 📝 The master prompt

The system ships with a parameterized **master prompt**
at `prompts/master-prompt.md`. It's the long-form research-analyst
prompt used by an LLM to produce the same workflow as text-only
analysis when the browser app isn't available. Fill in 14 inputs
(sector, ticker list, dates, budget FY, capital, …) and paste into
any capable LLM.

## ⚖️ Disclaimer

Educational analysis only — **not financial advice**. Past auction
patterns and Monte Carlo distributions do not guarantee future
outcomes. NEPSE auctions are influenced by macro sentiment, sector
news, sudden LTP swings, and bidder behavior — none of which can
be perfectly predicted from history or models. Verify all numbers
against official sources (NEPSE / sharesansar.com / merolagani.com)
before submitting any bid, and consider consulting a SEBON-licensed
advisor for a final decision.

## 🛠️ Browser compatibility

- Chrome / Edge (latest) ✅
- Firefox (latest) ✅
- Safari (latest) ✅
- Mobile browsers ✅ (responsive layout)

## 📜 License

MIT — feel free to use, modify, and extend.
