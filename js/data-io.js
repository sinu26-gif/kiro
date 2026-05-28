/* ============================================================
 * data-io.js — CSV parsing, sample data loader, ticker bootstrap
 * Uses FileReader (works on file:// protocol) — no fetch of local files.
 * ============================================================ */

const DataIO = (function () {
  /* ---------- CSV parser (handles quotes & commas) ---------- */
  function parseCSV(text) {
    const rows = [];
    let cur = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (field !== "" || cur.length > 0) { cur.push(field); rows.push(cur); }
          cur = []; field = "";
          if (c === "\r" && text[i + 1] === "\n") i++;
        } else field += c;
      }
    }
    if (field !== "" || cur.length > 0) { cur.push(field); rows.push(cur); }
    return rows.filter((r) => r.length && r.some((x) => x !== ""));
  }

  /** Convert a CSV with header row to array of objects. */
  function csvToObjects(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    return rows.slice(1).map((r) => {
      const o = {};
      headers.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
      return o;
    });
  }

  /** Normalize an OHLCV row: tries multiple header conventions. */
  function normalizeOhlcv(rows) {
    const synonyms = {
      date: ["date", "timestamp", "trade_date", "tradedate", "day"],
      open: ["open", "opening", "open_price"],
      high: ["high", "highest"],
      low: ["low", "lowest"],
      close: ["close", "closing", "ltp", "close_price", "last_price"],
      volume: ["volume", "vol", "qty", "quantity", "turnover_qty"],
    };
    function pick(o, keys) {
      for (const k of keys) if (o[k] !== undefined && o[k] !== "") return o[k];
      return undefined;
    }
    return rows
      .map((r) => {
        const date = pick(r, synonyms.date);
        const close = parseFloat(pick(r, synonyms.close));
        if (!date || !isFinite(close)) return null;
        const open = parseFloat(pick(r, synonyms.open));
        const high = parseFloat(pick(r, synonyms.high));
        const low = parseFloat(pick(r, synonyms.low));
        const volume = parseFloat(pick(r, synonyms.volume));
        return {
          date: date,
          open: isFinite(open) ? open : close,
          high: isFinite(high) ? high : close,
          low: isFinite(low) ? low : close,
          close,
          volume: isFinite(volume) ? volume : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  /** Read a File object as text via FileReader. Returns Promise<string>. */
  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => resolve(e.target.result);
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  /* ---------- Synthetic OHLCV generator (for demo / when no CSV) ---------- */
  /**
   * Builds a 3-year (≈756 daily bars) synthetic OHLCV path that ends at currentPrice
   * using GBM with reasonable hydropower-like vol. Deterministic per (symbol, currentPrice).
   */
  function syntheticOhlcv(symbol, currentPrice, days = 756, seed = null) {
    const s = seed ?? hashString(symbol + ":" + currentPrice);
    const u = Stats.mulberry32(s);
    const sigma = 0.012 + (u() - 0.5) * 0.004; // ~1.0–1.4% daily vol
    const muDaily = (u() - 0.5) * 0.0006; // small drift
    // Generate forward then rescale so last close == currentPrice
    const startSeed = 1000;
    let p = startSeed;
    const closes = [p];
    const N = Stats.normalGenerator(s);
    for (let i = 1; i < days; i++) {
      const z = N.next();
      // occasional jump
      let jump = 0;
      if (u() < 0.01) jump = (u() - 0.5) * 0.07; // ±3.5% jump
      p *= Math.exp(muDaily - 0.5 * sigma * sigma + sigma * z + jump);
      closes.push(p);
    }
    const scale = currentPrice / closes[closes.length - 1];
    const today = new Date();
    const ohlcv = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      // skip weekends
      const day = d.getDay();
      if (day === 5 || day === 6) continue;
      const close = closes[i] * scale;
      const open = close * (1 + (u() - 0.5) * 0.005);
      const high = Math.max(open, close) * (1 + u() * 0.008);
      const low = Math.min(open, close) * (1 - u() * 0.008);
      const volume = Math.round(20000 + u() * 80000);
      ohlcv.push({
        date: d.toISOString().slice(0, 10),
        open, high, low, close, volume,
      });
    }
    return ohlcv;
  }

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  /* ---------- Sample data: BNHC + 5 hydropower comparables ---------- */
  function buildHydropowerSample() {
    const seed = [
      { symbol: "BNHC",  name: "Buddhabhumi Nepal Hydropower",  ltp: 338.20, floorPrice: 285.00, qty: 1000,
        fundamentals: { eps: 7.8, bvps: 124, pe: 43.4, pb: 2.73, roe: 0.063, roa: 0.022, dividendYield: 0.005, paidUpCapital: 40, netProfit3yCagr: 0.05 },
        sectorKpis: { installedMW: 4.99, plf: 0.55, ppaTariff: 8.4, drySeasonShare: 0.32, annualGenGWh: 24, codStatus: "Operational", debtEquity: 1.6, interestCov: 1.4 } },
      { symbol: "BARUN", name: "Barun Hydropower",              ltp: 305.00, floorPrice: 260.00, qty: 500,
        fundamentals: { eps: 9.1, bvps: 138, pe: 33.5, pb: 2.21, roe: 0.066, roa: 0.025, dividendYield: 0.012, paidUpCapital: 90, netProfit3yCagr: 0.08 },
        sectorKpis: { installedMW: 5.0, plf: 0.58, ppaTariff: 8.4, drySeasonShare: 0.34, annualGenGWh: 26, codStatus: "Operational", debtEquity: 1.4, interestCov: 1.7 } },
      { symbol: "DORDI", name: "Dordi Khola Hydropower",        ltp: 312.50, floorPrice: 270.00, qty: 500,
        fundamentals: { eps: 11.2, bvps: 145, pe: 27.9, pb: 2.16, roe: 0.077, roa: 0.029, dividendYield: 0.018, paidUpCapital: 120, netProfit3yCagr: 0.12 },
        sectorKpis: { installedMW: 27.0, plf: 0.60, ppaTariff: 8.4, drySeasonShare: 0.36, annualGenGWh: 142, codStatus: "Operational", debtEquity: 1.2, interestCov: 2.1 } },
      { symbol: "RFPL",  name: "River Falls Power",              ltp: 348.00, floorPrice: 305.00, qty: 400,
        fundamentals: { eps: 14.5, bvps: 165, pe: 24.0, pb: 2.11, roe: 0.088, roa: 0.034, dividendYield: 0.022, paidUpCapital: 75, netProfit3yCagr: 0.14 },
        sectorKpis: { installedMW: 9.6, plf: 0.62, ppaTariff: 8.4, drySeasonShare: 0.35, annualGenGWh: 52, codStatus: "Operational", debtEquity: 1.0, interestCov: 2.4 } },
      { symbol: "JOSHI", name: "Joshi Hydropower",               ltp: 290.00, floorPrice: 240.00, qty: 600,
        fundamentals: { eps: 8.6, bvps: 130, pe: 33.7, pb: 2.23, roe: 0.066, roa: 0.024, dividendYield: 0.008, paidUpCapital: 65, netProfit3yCagr: 0.06 },
        sectorKpis: { installedMW: 7.6, plf: 0.56, ppaTariff: 8.4, drySeasonShare: 0.31, annualGenGWh: 37, codStatus: "Operational", debtEquity: 1.5, interestCov: 1.5 } },
    ];
    return seed.map((t) => ({
      ...t,
      ohlcv: syntheticOhlcv(t.symbol, t.ltp),
    }));
  }

  function loadHydropowerSampleIntoState() {
    const state = NEPSE.loadState();
    state.sector = "hydropower";
    state.tickers = buildHydropowerSample();
    state.auction.openDate = "2026-06-04";
    state.auction.closeDate = "2026-06-12";
    state.auction.budgetDate = "2026-05-29";
    state.auction.budgetFY = "FY 2083/84 BS (2026/27 AD)";
    state.auction.type = "Unsubscribed Rights";
    state.lastUpdated = new Date().toISOString();
    NEPSE.saveState(state);
    return state;
  }

  /* ---------- 15 historical hydropower comparable auctions (2024–25) ---------- */
  const hydroComparables = [
    { symbol: "RFPL",  ltp: 355.00, cutoff: 318.10, date: "2025-11-12" },
    { symbol: "KKHC",  ltp: 253.00, cutoff: 210.00, date: "2025-10-29" },
    { symbol: "JOSHI", ltp: 304.90, cutoff: 244.00, date: "2025-10-14" },
    { symbol: "BARUN", ltp: 337.00, cutoff: 284.60, date: "2025-09-14" },
    { symbol: "PPL",   ltp: 302.03, cutoff: 261.50, date: "2025-08-31" },
    { symbol: "TPC",   ltp: 367.77, cutoff: 325.00, date: "2025-08-12" },
    { symbol: "CHL",   ltp: 302.90, cutoff: 266.20, date: "2025-07-30" },
    { symbol: "RHGCL", ltp: 316.23, cutoff: 276.00, date: "2025-07-29" },
    { symbol: "DORDI", ltp: 337.15, cutoff: 283.00, date: "2025-07-08" },
    { symbol: "DORDI", ltp: 380.54, cutoff: 270.00, date: "2025-05-25" },
    { symbol: "NGPL",  ltp: 279.00, cutoff: 266.20, date: "2025-03-04" },
    { symbol: "BHL",   ltp: 369.10, cutoff: 226.00, date: "2025-02-17" },
    { symbol: "LEC",   ltp: 210.00, cutoff: 187.10, date: "2025-01-15" },
    { symbol: "AKJCL", ltp: 213.00, cutoff: 171.00, date: "2024-09-27" },
    { symbol: "HURJA", ltp: 202.20, cutoff: 171.00, date: "2024-09-23" },
  ].map((r) => ({ ...r, discount: (r.ltp - r.cutoff) / r.ltp }));

  function getHydroComparables() {
    return hydroComparables;
  }

  return {
    parseCSV,
    csvToObjects,
    normalizeOhlcv,
    readFileText,
    syntheticOhlcv,
    buildHydropowerSample,
    loadHydropowerSampleIntoState,
    getHydroComparables,
  };
})();
