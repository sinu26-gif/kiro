/* ============================================================
 * core.js — shared utilities, formatting, persistent state
 * Used by every page. Loads first.
 * ============================================================ */

const NEPSE = (function () {
  const STORAGE_KEY = "nepse_auction_analyzer_v1";

  /* ---------- formatters ---------- */
  const fmt2 = (n) =>
    n === null || n === undefined || Number.isNaN(n)
      ? "—"
      : Number(n).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const fmt0 = (n) =>
    n === null || n === undefined || Number.isNaN(n)
      ? "—"
      : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const fmtPct = (n, d = 2) =>
    n === null || n === undefined || Number.isNaN(n)
      ? "—"
      : (Number(n) * 100).toFixed(d) + "%";
  const fmtNpr = (n) => "NPR " + fmt2(n);
  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toISOString().slice(0, 10);
  };

  /* ---------- escape & dom ---------- */
  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[c]);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- persistent state ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      console.warn("Failed to load state, using defaults", e);
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state", e);
      alert(
        "Could not save your data — localStorage may be full. Export and clear some data."
      );
    }
  }

  function defaultState() {
    return {
      version: 1,
      sector: "hydropower",
      auction: {
        type: "Unsubscribed Rights",
        openDate: "",
        closeDate: "",
        budgetDate: "",
        budgetFY: "",
      },
      tickers: [], // [{symbol, name, floorPrice, ltp, qty, ohlcv:[{date,open,high,low,close,volume}], fundamentals:{...}, sectorKpis:{...}}]
      macro: {
        riskFree: 0.045, // 91-day T-Bill proxy
        repo: 0.05,
        crr: 0.04,
        slr: 0.12,
        cpi: 0.055,
        gdpGrowth: 0.045,
        remittanceYoY: 0.18,
        nrnLiquidity: "neutral", // tight | neutral | loose
        notes: "",
      },
      budgetScenarios: {
        bullish: { prob: 0.3, muMult: 1.5, sigmaMult: 1.1, note: "" },
        neutral: { prob: 0.4, muMult: 1.0, sigmaMult: 1.0, note: "" },
        bearish: { prob: 0.3, muMult: 0.6, sigmaMult: 1.3, note: "" },
      },
      simulation: {
        paths: 10000,
        horizons: [30, 90, 180, 365], // trading days
        useJumpDiffusion: true,
        useEwma: true,
        ewmaLambda: 0.94,
        seed: 42,
      },
      portfolio: {
        capital: 1000000,
        method: "mean-cvar", // 'equal' | 'risk-parity' | 'mean-cvar'
        cvarAlpha: 0.95,
      },
      results: {}, // populated by analysis modules { ticker: { technical, fundamental, mc, ... } }
      lastUpdated: null,
    };
  }

  function resetState() {
    if (confirm("Reset ALL data, tickers, settings, and results? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }

  /* ---------- ticker helpers ---------- */
  function findTicker(state, symbol) {
    return state.tickers.find((t) => t.symbol === symbol);
  }
  function upsertTicker(state, ticker) {
    const i = state.tickers.findIndex((t) => t.symbol === ticker.symbol);
    if (i >= 0) state.tickers[i] = { ...state.tickers[i], ...ticker };
    else state.tickers.push(ticker);
    state.lastUpdated = new Date().toISOString();
    saveState(state);
  }
  function removeTicker(state, symbol) {
    state.tickers = state.tickers.filter((t) => t.symbol !== symbol);
    if (state.results && state.results[symbol]) delete state.results[symbol];
    saveState(state);
  }

  /* ---------- export / import ---------- */
  function exportState() {
    const state = loadState();
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nepse-auction-state-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importState(file, onDone) {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        saveState(obj);
        onDone && onDone(null, obj);
      } catch (err) {
        onDone && onDone(err);
      }
    };
    r.readAsText(file);
  }

  /* ---------- shared header / nav ---------- */
  function renderHeader(activePage) {
    const pages = [
      { id: "index", href: "../index.html", label: "Dashboard" },
      { id: "data", href: "data.html", label: "Data" },
      { id: "timeline", href: "timeline.html", label: "Timeline" },
      { id: "technical", href: "technical.html", label: "Technical" },
      { id: "fundamental", href: "fundamental.html", label: "Fundamental" },
      { id: "macro", href: "macro.html", label: "Macro & Budget" },
      { id: "montecarlo", href: "montecarlo.html", label: "Monte Carlo" },
      { id: "portfolio", href: "portfolio.html", label: "Portfolio" },
      { id: "report", href: "report.html", label: "Report" },
    ];
    // adjust href when called from index.html (root)
    const isRoot = activePage === "index";
    const links = pages
      .map((p) => {
        let href = p.href;
        if (isRoot && p.id !== "index") href = "pages/" + p.href;
        if (isRoot && p.id === "index") href = "index.html";
        const cls = p.id === activePage ? "nav-link active" : "nav-link";
        return `<a class="${cls}" href="${href}">${p.label}</a>`;
      })
      .join("");

    return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">N<span>·</span>A</div>
        <div>
          <div class="brand-title">NEPSE Auction Analyzer</div>
          <div class="brand-sub">Sector-agnostic research &amp; Monte Carlo system</div>
        </div>
      </div>
      <nav class="topnav">${links}</nav>
    </header>`;
  }

  function mountHeader(activePage) {
    const slot = document.getElementById("header-slot");
    if (slot) slot.innerHTML = renderHeader(activePage);
  }

  /* ---------- toast ---------- */
  function toast(msg, type = "info") {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }

  /* ---------- public ---------- */
  return {
    fmt2,
    fmt0,
    fmtPct,
    fmtNpr,
    fmtDate,
    escapeHtml,
    $,
    $$,
    loadState,
    saveState,
    resetState,
    defaultState,
    findTicker,
    upsertTicker,
    removeTicker,
    exportState,
    importState,
    renderHeader,
    mountHeader,
    toast,
  };
})();
