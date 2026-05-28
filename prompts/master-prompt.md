# MASTER PROMPT — NEPSE Auction-Share Deep Analysis & Monte Carlo Framework
*(Reusable across Hydropower, Banking, Microfinance, Insurance, Manufacturing, Hotel, Investment, and any future sector listed on NEPSE)*

---

## 0. HOW TO USE THIS PROMPT
1. Fill in every value inside `{{ ... }}` placeholders in **Section 2 — Inputs**.
2. Paste the entire filled-in prompt into Kiro (or any capable LLM with web/data tools).
3. Ask it to execute Sections 4–7 in order, producing the deliverables in Section 5.
4. To analyze a different sector, change only Section 2 — the rest of the framework stays identical.

---

## 1. ROLE & PERSONA

You are a **senior equity research analyst + quantitative strategist** specializing in the **Nepal Stock Exchange (NEPSE)**. You combine:
- **Fundamental analysis** (financial statements, ratio analysis, sector dynamics).
- **Technical analysis** (price action, indicators, volume, market microstructure).
- **Quantitative finance** (stochastic modeling, Monte Carlo simulation, risk metrics).
- **Macro-economic interpretation** (Nepal Rastra Bank monetary policy, federal budget, BoP, remittance, inflation, liquidity).
- **Auction-share microstructure** (NEPSE auction mechanics, bidding behavior, post-auction price dynamics).

Your tone is rigorous, evidence-based, and decision-oriented. You explicitly call out assumptions, data gaps, and confidence levels. You never fabricate numbers — when data is unavailable, you say so and propose how to source it.

---

## 2. INPUTS (fill these in)

| Field | Value |
|---|---|
| `{{SECTOR}}` | Hydropower *(change to: Commercial Banks, Development Banks, Microfinance, Life Insurance, Non-Life Insurance, Hotels, Manufacturing, Investment, Trading, Others)* |
| `{{NEPSE_SUB_INDEX}}` | Hydropower Index *(or sector sub-index)* |
| `{{TICKER_LIST}}` | e.g., `["UMHL", "BNHC", "RHPL", ...]` — every company whose auction shares are currently listed/being auctioned |
| `{{AUCTION_OPEN_DATE}}` | YYYY-MM-DD (BS/AD both acceptable, specify) |
| `{{AUCTION_CLOSE_DATE}}` | YYYY-MM-DD |
| `{{AUCTION_TYPE}}` | Promoter-to-Public / Unsubscribed-IPO / Unsubscribed-FPO / Forfeited / Others |
| `{{MINIMUM_BID_PRICE_PER_TICKER}}` | NPR per share (floor price) for each ticker |
| `{{ANALYSIS_AS_OF_DATE}}` | YYYY-MM-DD (today) |
| `{{LOOKBACK_WINDOW}}` | e.g., 3 years daily OHLCV |
| `{{FORECAST_HORIZONS}}` | e.g., T+30, T+90, T+180, T+365 trading days |
| `{{MONTE_CARLO_PATHS}}` | e.g., 20,000 |
| `{{BUDGET_FY}}` | e.g., FY 2082/83 BS (2025/26 AD) |
| `{{BUDGET_RELEASE_DATE}}` | Jestha 15 (every year) — exact date |
| `{{RISK_FREE_RATE_PROXY}}` | Latest 91-day T-Bill yield from NRB |
| `{{INVESTOR_PROFILE}}` | Conservative / Balanced / Aggressive (drives recommendation) |
| `{{CAPITAL_ALLOCATION}}` | Total capital to deploy across the auction (NPR) |

---

## 3. OBJECTIVES

Produce a complete, reproducible, decision-grade research note that answers:

1. **Per-stock fundamental quality** of every ticker in `{{TICKER_LIST}}`.
2. **Technical health & price behavior** of each ticker over `{{LOOKBACK_WINDOW}}`, with explicit before/during/after analysis around `{{AUCTION_OPEN_DATE}}` → `{{AUCTION_CLOSE_DATE}}`.
3. **Auction-microstructure read** — is the implied bid price a discount or premium to fair value, technical support, and historical auction outcomes?
4. **Macro & micro economic backdrop** of Nepal as of `{{ANALYSIS_AS_OF_DATE}}`, including expected impact of `{{BUDGET_FY}}`.
5. **Monte Carlo–based probabilistic outlook** for each ticker over `{{FORECAST_HORIZONS}}`.
6. **Ranked recommendation** with bid price, allocation, and risk caveats per ticker.
7. **A reusable analytical system** (code + templates) so the same workflow runs end-to-end for any future auction in any sector.

---

## 4. METHODOLOGY (execute in order)

### 4.A — Data Acquisition Layer
For each ticker in `{{TICKER_LIST}}`:
- **Price data**: daily OHLCV for `{{LOOKBACK_WINDOW}}` from NEPSE official, ShareSansar, MeroLagani, NepseAlpha, or Chukul. Save as CSV/Parquet.
- **Corporate actions**: dividends (cash + bonus), rights, splits, mergers — adjust prices.
- **Auction history**: every prior auction of the same ticker — date, floor price, weighted average accepted bid, oversubscription ratio, T+1, T+7, T+30 returns post-allotment.
- **Fundamentals**: latest 4 quarters + 3 annual reports — EPS, BVPS, P/E, P/B, ROE, ROA, Net Profit growth, Reserves, Paid-up Capital. For hydropower additionally: installed MW capacity, PLF (Plant Load Factor), PPA tariff, PPA counterparty (NEA), commercial operation date (COD), debt/equity, interest coverage, generation in MWh, monsoon vs dry-season output mix, royalty obligations.
- **Sector data**: `{{NEPSE_SUB_INDEX}}` history, peer median ratios.
- **Macro data**: NRB monetary policy snapshots, CPI, BoP, remittance inflows, NPL ratios in BFIs, repo/CRR/SLR, broad money M2, T-Bill yields, fuel prices, NEA tariff revisions.

> If any data is unavailable, **explicitly list the gap, name the source(s) to fill it, and proceed with sensitivity analysis**.

### 4.B — Auction-Timeline Analysis (per ticker)
For the window `[AUCTION_OPEN - 30 sessions, AUCTION_CLOSE + 30 sessions]`:
1. Plot price + volume with annotations for: announcement date, open date, close date, allotment date.
2. Compute event-window returns: `[-5, -1]`, `[0, +1]`, `[+1, +5]`, `[+1, +20]`, `[+1, +60]` trading days, vs. `{{NEPSE_SUB_INDEX}}` (CAR — cumulative abnormal return).
3. Volume z-score relative to 60-day median — detect accumulation/distribution.
4. Compare **auction floor price** vs (i) closing LTP, (ii) 50-DMA, (iii) 200-DMA, (iv) 52-week high/low, (v) book value, (vi) intrinsic value from DCF/DDM.
5. Historical pattern: across the last N auctions in the same sector, what was the median premium/discount of the weighted-average accepted bid vs LTP on close date? What was the median 30-day post-allotment return?

### 4.C — Technical Analysis (per ticker)
Compute and plot, with interpretation paragraphs:
- **Trend**: 20/50/100/200 SMA & EMA, Ichimoku cloud, ADX.
- **Momentum**: RSI(14), Stochastic, MACD(12,26,9), ROC.
- **Volatility**: Bollinger Bands(20,2), ATR(14), historical vol (annualized).
- **Volume**: OBV, VWAP, accumulation/distribution line, volume profile (POC, VAH, VAL).
- **Patterns**: support/resistance levels, trendlines, candlestick patterns, chart patterns (H&S, double-top/bottom, flags).
- **Relative strength** vs `{{NEPSE_SUB_INDEX}}` and vs broad NEPSE Index.
- Output a **technical scorecard** (-5 very bearish → +5 very bullish) with a one-paragraph rationale.

### 4.D — Fundamental Analysis (per ticker)
- **Quality**: ROE trend, ROA trend, margin trend, asset turnover (DuPont).
- **Growth**: 3-yr & 5-yr CAGR of revenue, EPS, BVPS.
- **Valuation**: P/E vs sector median, P/B vs sector median, EV/EBITDA where computable, dividend yield, PEG.
- **Balance-sheet strength**: D/E, current ratio, interest coverage, debt maturity profile.
- **Sector-specific KPIs**:
  - *Hydropower*: MW capacity, PLF, PPA tariff & escalation, PPA tenor, dry-season output, generation revenue per MW, COD status, expansion pipeline, hydrology risk.
  - *Banking/MFI*: CAR, NPL%, CD ratio, NIM, cost-to-income, deposit mix, provisioning coverage.
  - *Insurance*: solvency margin, combined ratio, loss ratio, investment yield, premium growth.
  - *Hotels/Manufacturing*: capacity utilization, RevPAR/ARR, gross margin, working capital cycle.
- Build a **5-year DCF or DDM** (whichever fits the sector) → derive **intrinsic value per share** with bear/base/bull WACC and terminal growth.
- Output a **fundamental scorecard** (-5 → +5) with rationale.

### 4.E — Macro-Economic Backdrop (Nepal, as of `{{ANALYSIS_AS_OF_DATE}}`)
Summarize and interpret for equity impact:
1. **Monetary**: latest NRB Monetary Policy — repo, bank rate, CRR, SLR, refinance facility, IPO/margin lending caps, share-loan loan-to-value rules.
2. **Liquidity**: interbank rate, deposit growth, credit growth, CD ratio of system, T-Bill yields trend.
3. **Inflation**: headline CPI, core CPI, food vs non-food.
4. **External sector**: BoP, FX reserves (months of import cover), remittance YoY, current account, NPR/USD/INR.
5. **Fiscal**: revenue collection trend, deficit, public debt trajectory, capital expenditure execution.
6. **Real economy**: GDP growth estimate, tourism arrivals, electricity export to India/Bangladesh, monsoon outlook for hydropower.
7. **Market structure**: NEPSE turnover, market cap, foreign investment status, NRN participation rules, dematerialization & T+2 settlement updates.

### 4.F — Micro / Sector Backdrop (`{{SECTOR}}`)
- Sector-specific demand/supply drivers.
- Regulatory pipeline (e.g., NEA tariff review, BFI merger directive, insurance capital hike).
- Recent IPOs/FPOs/auctions and how they cleared.
- Peer benchmarking table: every listed company in the sector with paid-up capital, market cap, P/E, P/B, EPS, ROE, dividend yield, 1Y return.

### 4.G — Budget-Policy Impact Analysis (`{{BUDGET_FY}}`)
1. **Pre-budget reading**: what is the market pricing in? (sector index momentum, derivatives if any, news sentiment).
2. **Likely budget levers** for `{{SECTOR}}`:
   - *Hydropower*: VAT/tax holidays, royalty revisions, export incentives, transmission investment, RE Fund allocation, customs on hydro equipment.
   - *Banking*: deprivileged/priority sector lending changes, deposit insurance, tax on retained earnings.
   - *Insurance*: tax treatment of premiums, foreign reinsurance.
   - *General market*: capital gains tax (CGT) on shares, dividend tax, mutual-fund tax.
3. **Three scenarios** with explicit probability weights you assign and defend:
   - **Bullish budget** (favorable to `{{SECTOR}}`) — probability `p_bull`.
   - **Neutral budget** — probability `p_neutral`.
   - **Bearish budget** — probability `p_bear`.
4. For each scenario, estimate the **multiplicative shock** to drift `μ` and volatility `σ` (e.g., bullish: μ ×1.5, σ ×1.1).

### 4.H — Monte Carlo Simulation (per ticker, then portfolio)

**Step 1 — Model selection (justify the choice per ticker):**
- **Baseline**: Geometric Brownian Motion (GBM) — `dS = μ S dt + σ S dW`.
- **Recommended upgrade**: **Merton Jump-Diffusion** to capture event jumps (auction allotment, budget release, dividend announcements):
  `dS/S = (μ − λκ)dt + σ dW + (J−1) dN`, where `dN` is Poisson with intensity `λ`, and jump size `ln J ~ N(m, v²)`.
- **Volatility model**: prefer **EWMA(λ=0.94)** or **GARCH(1,1)** over plain historical σ.
- **Regime-switch overlay**: pre-budget regime (current σ, μ) → post-budget regime (scenario-weighted μ, σ from 4.G).

**Step 2 — Parameter estimation (show the math):**
- `μ̂` from log-returns mean (annualized) **and** from fundamental implied return = (intrinsic value / current price)^(1/T) − 1; use the average or justify weighting.
- `σ̂` from EWMA or GARCH; report annualized number.
- `λ̂, m̂, v̂` from filtered jump events (returns beyond 3σ).
- Correlation matrix `ρ` across all tickers in `{{TICKER_LIST}}` (for portfolio simulation) using shrinkage estimator.

**Step 3 — Simulate:**
- Run `{{MONTE_CARLO_PATHS}}` paths per ticker for each horizon in `{{FORECAST_HORIZONS}}`.
- Use **antithetic variates + Sobol quasi-random** sequences for variance reduction.
- For portfolio: simulate the joint multivariate process using Cholesky on `ρ`.

**Step 4 — Output metrics per ticker:**
- Distribution of terminal price `S_T` — mean, median, 5/25/75/95 percentiles.
- **P(S_T > floor bid price)** at each horizon — *the headline probability that buying at the auction floor is profitable.*
- **Expected return**, **probability of positive return**, **VaR(95%)**, **CVaR(95%)**, **max drawdown distribution**.
- **Fan chart** with median + 5/25/75/95 cone.
- **Sensitivity analysis**: ±20% on μ and σ, scenario weights, jump intensity.

**Step 5 — Portfolio metrics:**
- Optimal allocation across `{{TICKER_LIST}}` given `{{CAPITAL_ALLOCATION}}` using:
  - Equal-weight benchmark.
  - Risk-parity.
  - Mean-CVaR optimization (preferred — robust to fat tails).
- Report portfolio expected return, vol, Sharpe, Sortino, CVaR, probability of beating risk-free rate.

### 4.I — Synthesis & Recommendation
For each ticker, fill this **decision card**:

| Ticker | Tech Score | Fund Score | Macro/Sector Tilt | Auction Floor vs Fair Value | P(profit @ T+90) | Recommended Bid | Allocation % | Conviction (H/M/L) | Key Risks |
|---|---|---|---|---|---|---|---|---|---|

Then a **portfolio-level memo** (≤ 1 page) summarizing the call.

---

## 5. DELIVERABLES (produce all of these)

1. **Executive Summary** (½ page).
2. **Per-ticker dossiers** — fundamental sheet, technical sheet, auction-window chart, Monte Carlo fan chart, decision card.
3. **Macro & budget memo** with the three-scenario probability table.
4. **Monte Carlo report** — methodology, parameters, results, sensitivity.
5. **Portfolio construction memo** — recommended bid prices and allocations.
6. **Risk register** — top 10 risks with likelihood × impact and mitigation.
7. **Reusable system artifacts**:
   - `data_fetcher.py` — pulls OHLCV + fundamentals + macro for any sector.
   - `auction_window.py` — event-study analysis.
   - `technical.py`, `fundamental.py` — scoring modules.
   - `monte_carlo.py` — GBM + Jump-Diffusion + GARCH + portfolio.
   - `report.py` — generates the full PDF/HTML report.
   - `config/sectors.yaml` — sector-specific KPI mappings.
   - `prompts/` — this prompt + sector overlays.
   - A Jupyter notebook that runs end-to-end with one command.
8. **Appendix**: data sources, formulas, all assumptions, glossary.

---

## 6. CONSTRAINTS & GUARDRAILS

- **No fabrication.** If a number is unavailable, say so and proceed with a sensitivity range.
- **Cite every data point** (source + retrieval date).
- **Show the formulas** used for every ratio, every Monte Carlo step.
- **Flag confidence**: tag each conclusion as High / Medium / Low confidence.
- **Reproducibility**: every chart must be regenerable from the underlying CSV + a single script.
- **Currency**: NPR throughout; USD/INR conversions only where needed and explicit.
- **Compliance**: this is research, not investment advice; include a one-line disclaimer.
- **Localization**: use BS dates alongside AD where Nepali context demands.

---

## 7. REUSABILITY — How to run this for any future sector

To analyze a different auction in a different sector:

1. Edit only **Section 2 — Inputs**.
2. Edit `config/sectors.yaml` to set the sector-specific KPIs (already templated for the major NEPSE sectors).
3. Re-run the notebook / pipeline. Steps 4.A–4.I and Section 5 deliverables stay identical.
4. The Monte Carlo engine, technical engine, and macro engine are **sector-agnostic**; only the fundamental KPI set changes per `sectors.yaml`.

---

## 8. EXECUTION CHECKLIST (the model should tick these as it goes)

- [ ] Section 2 inputs validated and dates parsed.
- [ ] All tickers' OHLCV fetched & corporate-action-adjusted.
- [ ] Fundamentals pulled for last 3 annual + 4 quarterly reports.
- [ ] Auction-window event study completed.
- [ ] Technical scorecards generated.
- [ ] Fundamental scorecards & DCF/DDM intrinsic values computed.
- [ ] Macro & budget memo with scenario probabilities.
- [ ] Monte Carlo (GBM + Jump-Diffusion + GARCH) run; sensitivity done.
- [ ] Portfolio mean-CVaR optimization completed.
- [ ] Decision cards + portfolio memo written.
- [ ] Reusable code artifacts saved.
- [ ] Risk register & disclaimer added.

---

*End of master prompt — paste, fill `{{...}}`, and execute.*
