/* ============================================================
 * script.js — shared SPA glue used across all pages.
 * Loaded after core libs. Adds tiny common helpers and ensures
 * a default state exists on first visit.
 * ============================================================ */

(function () {
  // Ensure default state exists on first visit
  if (typeof NEPSE !== "undefined") {
    const s = NEPSE.loadState();
    if (!s.lastUpdated) NEPSE.saveState(s);
  }

  // Add a global helper for ticker dropdowns
  window.tickerOptions = function (selectedSymbol) {
    const s = NEPSE.loadState();
    if (!s.tickers.length) return '<option value="">— no tickers loaded —</option>';
    return s.tickers
      .map((t) => `<option value="${NEPSE.escapeHtml(t.symbol)}" ${t.symbol === selectedSymbol ? "selected" : ""}>${NEPSE.escapeHtml(t.symbol)} — ${NEPSE.escapeHtml(t.name || "")}</option>`)
      .join("");
  };

  // Friendly empty-state HTML
  window.emptyState = function (title, msg, ctaHref, ctaLabel) {
    return `<div class="empty">
      <h3>${NEPSE.escapeHtml(title)}</h3>
      <p>${NEPSE.escapeHtml(msg)}</p>
      ${ctaHref ? `<a class="btn btn-accent" href="${ctaHref}">${NEPSE.escapeHtml(ctaLabel || "Get started")}</a>` : ""}
    </div>`;
  };

  // Save scroll position across navigation (small UX touch)
  window.addEventListener("beforeunload", () => {
    sessionStorage.setItem("nepse_scroll_" + location.pathname, String(window.scrollY));
  });
  window.addEventListener("load", () => {
    const y = sessionStorage.getItem("nepse_scroll_" + location.pathname);
    if (y) window.scrollTo(0, parseInt(y, 10));
  });
})();
