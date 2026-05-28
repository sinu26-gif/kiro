/* ============================================================
 * fundamental.js — fundamental scoring, DCF/DDM, sector KPI rollup
 * Inputs are the per-ticker `fundamentals` and `sectorKpis` blobs.
 * ============================================================ */

const Fundamental = (function () {
  /* ---------- Sector medians (simple weighted-average KPI scoring) ----------
   * KPI score = clamp(-1, +1, (value - sectorMedian)/sectorMedian * sign)
   * sign = -1 if 'lowerBetter', else +1.
   * We don't ship a static peer database; we use a sensible median proxy.
   */
  const SECTOR_MEDIANS = {
    hydropower: { eps: 9, pe: 30, pb: 2.2, roe: 0.075, roa: 0.027, dividendYield: 0.012, netProfit3yCagr: 0.08 },
    "commercial-banks": { eps: 22, pe: 10, pb: 1.4, roe: 0.13, roa: 0.012, dividendYield: 0.04, netProfit3yCagr: 0.07 },
    "development-banks": { eps: 18, pe: 11, pb: 1.3, roe: 0.12, roa: 0.014, dividendYield: 0.035, netProfit3yCagr: 0.06 },
    microfinance: { eps: 35, pe: 14, pb: 2.6, roe: 0.18, roa: 0.025, dividendYield: 0.04, netProfit3yCagr: 0.10 },
    "life-insurance": { eps: 14, pe: 22, pb: 2.2, roe: 0.10, roa: 0.025, dividendYield: 0.02, netProfit3yCagr: 0.10 },
    "non-life-insurance": { eps: 18, pe: 18, pb: 2.0, roe: 0.11, roa: 0.04, dividendYield: 0.025, netProfit3yCagr: 0.08 },
    hotels: { eps: 12, pe: 24, pb: 2.0, roe: 0.08, roa: 0.04, dividendYield: 0.015, netProfit3yCagr: 0.10 },
    manufacturing: { eps: 25, pe: 18, pb: 2.0, roe: 0.13, roa: 0.06, dividendYield: 0.025, netProfit3yCagr: 0.08 },
    investment: { eps: 15, pe: 16, pb: 1.2, roe: 0.09, roa: 0.05, dividendYield: 0.03, netProfit3yCagr: 0.07 },
    others: { eps: 15, pe: 18, pb: 1.8, roe: 0.10, roa: 0.04, dividendYield: 0.02, netProfit3yCagr: 0.07 },
  };

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  /* ---------- DCF (FCFE-style, simplified) ----------
   * Inputs:
   *  - eps0: latest EPS (NPR)
   *  - growth: stage-1 growth rate (e.g. 0.10) for `years` years
   *  - terminalGrowth: long-term growth (e.g. 0.04)
   *  - discount: cost of equity (e.g. 0.13)
   *  - years: stage-1 horizon (e.g. 5)
   * Returns intrinsic value per share.
   */
  function dcf({ eps0, growth, terminalGrowth, discount, years = 5 }) {
    if (!isFinite(eps0) || eps0 <= 0) return null;
    if (discount <= terminalGrowth) discount = terminalGrowth + 0.005;
    let pv = 0;
    let cf = eps0;
    for (let t = 1; t <= years; t++) {
      cf *= 1 + growth;
      pv += cf / Math.pow(1 + discount, t);
    }
    const terminal = (cf * (1 + terminalGrowth)) / (discount - terminalGrowth);
    pv += terminal / Math.pow(1 + discount, years);
    return pv;
  }

  /* ---------- DDM (Gordon growth) ----------
   * V = D1 / (r - g)
   */
  function ddm({ dps, growth, discount }) {
    if (!isFinite(dps) || dps <= 0) return null;
    if (discount <= growth) return null;
    return (dps * (1 + growth)) / (discount - growth);
  }

  /* ---------- Bear / Base / Bull intrinsic value envelope ---------- */
  function intrinsicEnvelope(fund, opts = {}) {
    const eps0 = fund.eps;
    const dps = fund.eps && fund.dividendYield ? fund.eps * (fund.dividendYield * 30) : null;
    // dividendYield is yield-on-price; we approximate DPS as eps * payout, using payout default
    const payout = clamp(opts.payout ?? 0.4, 0.1, 0.95);
    const dpsApprox = eps0 ? eps0 * payout : null;

    const cases = {
      bear: { growth: opts.bearGrowth ?? 0.02, discount: opts.bearDiscount ?? 0.15, terminalGrowth: 0.03 },
      base: { growth: opts.baseGrowth ?? 0.07, discount: opts.baseDiscount ?? 0.13, terminalGrowth: 0.04 },
      bull: { growth: opts.bullGrowth ?? 0.12, discount: opts.bullDiscount ?? 0.115, terminalGrowth: 0.045 },
    };
    const out = {};
    for (const [k, p] of Object.entries(cases)) {
      const dcfV = dcf({ eps0, ...p, years: 5 });
      const ddmV = dpsApprox ? ddm({ dps: dpsApprox, growth: p.growth * 0.8, discount: p.discount }) : null;
      const intrinsic =
        dcfV !== null && ddmV !== null ? 0.6 * dcfV + 0.4 * ddmV : (dcfV ?? ddmV);
      out[k] = { dcf: dcfV, ddm: ddmV, intrinsic };
    }
    return out;
  }

  /* ---------- KPI score for sector-specific KPIs ---------- */
  function sectorKpiScore(sectorKey, sectorKpis) {
    const sector = Sectors.get(sectorKey);
    let score = 0, weightSum = 0, contribs = [];
    for (const kpi of sector.kpis) {
      const v = sectorKpis?.[kpi.key];
      if (v === undefined || v === null || v === "" || (typeof v === "number" && !isFinite(v))) continue;
      const w = kpi.weight ?? 1;
      let s = 0;
      if (typeof v !== "number") {
        // text KPIs (e.g. COD status) -> small bullish bump if "Operational"
        if (typeof v === "string" && /operat/i.test(v)) s = 0.5;
        else s = 0;
      } else {
        // simple sigmoid-ish around a sector-specific anchor
        const anchor = guessAnchor(kpi);
        const dir = kpi.lowerBetter ? -1 : 1;
        const norm = (v - anchor) / (Math.abs(anchor) || 1);
        s = clamp(dir * norm, -1, 1);
      }
      score += s * w;
      weightSum += w;
      contribs.push({ key: kpi.key, label: kpi.label, value: v, score: s, weight: w });
    }
    return {
      score: weightSum ? score / weightSum : 0, // -1..+1
      contribs,
    };
  }

  function guessAnchor(kpi) {
    const k = kpi.key;
    const m = {
      installedMW: 10, plf: 0.55, ppaTariff: 8.4, drySeasonShare: 0.33,
      annualGenGWh: 50, debtEquity: 1.5, interestCov: 1.8,
      carPercent: 12, nplPercent: 4, cdRatio: 80, nim: 4, costIncome: 55, casaShare: 38, provCoverage: 80,
      loanGrowth: 15, borrowerCount: 50000, yieldOnLoan: 14, operatingMargin: 25,
      solvencyMargin: 1.6, premiumGrowth: 12, investYield: 7, lapseRatio: 8, claimRatio: 50,
      combinedRatio: 95, lossRatio: 60,
      occupancy: 65, arr: 8000, revpar: 5500, grossMargin: 35,
      capacityUtil: 70, wcDays: 60, exportShare: 25,
      navPerShare: 200, discountToNav: 0, portfolioYield: 8,
      revenueGrowth: 10, ebitMargin: 15, roe: 12,
    };
    return m[k] ?? 1;
  }

  /* ---------- Common ratio score (vs sector median) ---------- */
  function commonRatioScore(sectorKey, fund) {
    const med = SECTOR_MEDIANS[sectorKey] || SECTOR_MEDIANS.others;
    const checks = [
      { key: "pe", weight: 1.0, lowerBetter: true },
      { key: "pb", weight: 1.0, lowerBetter: true },
      { key: "roe", weight: 1.3, lowerBetter: false },
      { key: "roa", weight: 1.0, lowerBetter: false },
      { key: "dividendYield", weight: 0.7, lowerBetter: false },
      { key: "netProfit3yCagr", weight: 1.2, lowerBetter: false },
    ];
    let score = 0, weightSum = 0, contribs = [];
    for (const c of checks) {
      const v = fund?.[c.key];
      if (v === undefined || v === null || !isFinite(v) || med[c.key] === undefined) continue;
      const dir = c.lowerBetter ? -1 : 1;
      const rel = (v - med[c.key]) / (Math.abs(med[c.key]) || 1);
      const s = clamp(dir * rel, -1, 1);
      score += s * c.weight;
      weightSum += c.weight;
      contribs.push({ key: c.key, value: v, sectorMedian: med[c.key], score: s });
    }
    return { score: weightSum ? score / weightSum : 0, contribs };
  }

  /* ---------- Quality score (ROE level) ---------- */
  function qualityScore(fund) {
    const r = fund?.roe;
    if (!isFinite(r)) return 0;
    if (r > 0.18) return 1;
    if (r > 0.13) return 0.6;
    if (r > 0.09) return 0.2;
    if (r > 0.05) return -0.2;
    return -0.7;
  }

  /* ---------- Master fundamental scorecard (-5 to +5) ---------- */
  function scorecard(sectorKey, ticker) {
    const fund = ticker.fundamentals || {};
    const skp = ticker.sectorKpis || {};
    const intrinsic = intrinsicEnvelope(fund);

    const ratio = commonRatioScore(sectorKey, fund);
    const sectorK = sectorKpiScore(sectorKey, skp);
    const quality = qualityScore(fund);

    // Valuation tilt: current price vs base intrinsic
    let valTilt = 0;
    if (intrinsic.base?.intrinsic && ticker.ltp) {
      const upside = (intrinsic.base.intrinsic - ticker.ltp) / ticker.ltp;
      valTilt = clamp(upside * 5, -1, 1);
    }

    // weighted blend → -5..+5
    const components = [
      { name: "Common ratio vs sector median", raw: ratio.score * 1.5, detail: `score ${ratio.score.toFixed(2)}` },
      { name: "Sector-specific KPIs", raw: sectorK.score * 1.5, detail: `score ${sectorK.score.toFixed(2)}` },
      { name: "Quality (ROE level)", raw: quality * 1.0, detail: `ROE ${(fund.roe ?? 0).toFixed(3)}` },
      {
        name: "Valuation vs base intrinsic",
        raw: valTilt * 1.5,
        detail: intrinsic.base?.intrinsic
          ? `LTP ${ticker.ltp} vs IV ${intrinsic.base.intrinsic.toFixed(2)}`
          : "n/a",
      },
    ];
    const sum = components.reduce((s, c) => s + c.raw, 0);
    const score = Math.max(-5, Math.min(5, sum));
    const label =
      score >= 3 ? "High quality, undervalued"
      : score >= 1.5 ? "Solid fundamentals"
      : score >= 0.5 ? "Mildly favorable"
      : score >= -0.5 ? "Neutral"
      : score >= -1.5 ? "Mildly weak"
      : score >= -3 ? "Weak"
      : "Severely weak / overvalued";
    return {
      score: Number(score.toFixed(2)),
      label,
      components,
      ratioContribs: ratio.contribs,
      sectorContribs: sectorK.contribs,
      intrinsic,
    };
  }

  return {
    dcf, ddm, intrinsicEnvelope,
    sectorKpiScore, commonRatioScore, qualityScore,
    scorecard,
    SECTOR_MEDIANS,
  };
})();
