/* ============================================================
 * auction.js — auction-window event study, comparable analysis, bid recommender
 * ============================================================ */

const Auction = (function () {
  /* ---------- date helpers ---------- */
  function dateIndex(ohlcv, isoDate) {
    if (!isoDate) return -1;
    const target = new Date(isoDate).getTime();
    let bestIdx = -1, bestDiff = Infinity;
    for (let i = 0; i < ohlcv.length; i++) {
      const d = new Date(ohlcv[i].date).getTime();
      const diff = Math.abs(d - target);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }
    return bestIdx;
  }

  /* ---------- event window analysis ----------
   * Computes price + volume + return windows around auction open & close.
   */
  function eventWindow(ticker, openDate, closeDate) {
    const ohlcv = ticker.ohlcv || [];
    if (!ohlcv.length || !openDate) return null;

    const openIdx = dateIndex(ohlcv, openDate);
    const closeIdx = closeDate ? dateIndex(ohlcv, closeDate) : openIdx;

    function windowStats(centerIdx, leftDays, rightDays) {
      const lo = Math.max(0, centerIdx - leftDays);
      const hi = Math.min(ohlcv.length - 1, centerIdx + rightDays);
      const slice = ohlcv.slice(lo, hi + 1);
      if (slice.length === 0) return null;
      const closes = slice.map((b) => b.close);
      const vols = slice.map((b) => b.volume);
      return {
        center: ohlcv[centerIdx],
        bars: slice,
        ret: closes.length > 1 ? (closes[closes.length - 1] - closes[0]) / closes[0] : 0,
        avgVol: Stats.mean(vols),
        peakClose: Stats.max(closes),
        troughClose: Stats.min(closes),
      };
    }

    // event-window cumulative returns (CAR-style, not yet adjusted for sub-index)
    function cumRet(fromIdx, toIdx) {
      if (fromIdx < 0 || toIdx < 0 || toIdx >= ohlcv.length || fromIdx >= ohlcv.length) return null;
      const a = ohlcv[fromIdx].close, b = ohlcv[toIdx].close;
      return (b - a) / a;
    }
    const windows = {
      preWindow: windowStats(openIdx, 30, 0),
      auctionWindow: openIdx >= 0 && closeIdx >= 0 && closeIdx >= openIdx ? {
        bars: ohlcv.slice(openIdx, closeIdx + 1),
        days: closeIdx - openIdx + 1,
        ret: cumRet(openIdx, closeIdx),
        avgVol: Stats.mean(ohlcv.slice(openIdx, closeIdx + 1).map((b) => b.volume)),
      } : null,
      postWindow: windowStats(closeIdx, 0, 60),
    };

    const eventReturns = {
      "[-30, -1]": cumRet(Math.max(0, openIdx - 30), openIdx - 1),
      "[-5, -1]":  cumRet(Math.max(0, openIdx - 5), openIdx - 1),
      "[open, close]": cumRet(openIdx, closeIdx),
      "[close+1, +5]":  cumRet(closeIdx + 1, Math.min(ohlcv.length - 1, closeIdx + 5)),
      "[close+1, +20]": cumRet(closeIdx + 1, Math.min(ohlcv.length - 1, closeIdx + 20)),
      "[close+1, +60]": cumRet(closeIdx + 1, Math.min(ohlcv.length - 1, closeIdx + 60)),
    };

    // volume z-score during auction window vs prior 60d
    const baselineLo = Math.max(0, openIdx - 60);
    const baselineVols = ohlcv.slice(baselineLo, openIdx).map((b) => b.volume);
    const auctionVols = closeIdx > openIdx
      ? ohlcv.slice(openIdx, closeIdx + 1).map((b) => b.volume)
      : [ohlcv[openIdx]?.volume].filter((x) => x !== undefined);
    const baseMean = Stats.mean(baselineVols);
    const baseStd = Stats.stdev(baselineVols) || 1;
    const volZScore = auctionVols.length
      ? (Stats.mean(auctionVols) - baseMean) / baseStd
      : null;

    return { openIdx, closeIdx, windows, eventReturns, volZScore };
  }

  /* ---------- comparable auctions analysis ----------
   * Given a list of historical {ltp, cutoff, date, symbol} and a current LTP,
   * return median/mean/percentile discount + bid scenarios.
   */
  function summarizeComparables(history) {
    if (!history.length) return null;
    const discs = history.map((r) => (r.ltp - r.cutoff) / r.ltp);
    const summary = Stats.bands(discs);
    return {
      n: history.length,
      meanDiscount: Stats.mean(discs),
      medianDiscount: Stats.median(discs),
      stdDiscount: Stats.stdev(discs),
      bands: summary,
      raw: history,
    };
  }

  /** Build a probability table: for each candidate discount level, compute
   *  the empirical probability the historical cutoff was AT OR BELOW that bid.
   */
  function bidProbabilityTable(history, ltp, levels = [5, 8, 10, 12, 14, 16, 18, 20, 22]) {
    if (!history.length || !isFinite(ltp)) return [];
    return levels.map((d) => {
      const bid = ltp * (1 - d / 100);
      const winners = history.filter((r) => r.cutoff <= bid).length;
      return {
        discountPct: d,
        bid,
        prob: winners / history.length,
        winners,
        n: history.length,
      };
    });
  }

  /* ---------- 3-tier strategy generator (Conservative / Balanced / Aggressive) ---------- */
  function strategies(history, ltp) {
    const discs = history.map((r) => (r.ltp - r.cutoff) / r.ltp);
    if (!discs.length || !isFinite(ltp)) return [];
    const p25 = Stats.percentile(discs, 0.25);
    const p50 = Stats.percentile(discs, 0.50);
    const p75 = Stats.percentile(discs, 0.75);
    return [
      {
        key: "conservative",
        title: "Conservative",
        discount: p25,
        bid: ltp * (1 - p25),
        prob: 0.80,
        note: "Bid above-median to maximize allotment odds.",
      },
      {
        key: "balanced",
        title: "Balanced (recommended)",
        discount: p50,
        bid: ltp * (1 - p50),
        prob: 0.60,
        note: "Bid at sector median — balances discount and allotment.",
      },
      {
        key: "aggressive",
        title: "Aggressive",
        discount: p75,
        bid: ltp * (1 - p75),
        prob: 0.30,
        note: "Bid below-median to maximize potential margin if allotted.",
      },
    ];
  }

  /* ---------- combined recommendation per ticker ---------- */
  function recommendation(ticker, history, technicalScore, fundamentalScore) {
    const ltp = ticker.ltp;
    const strats = strategies(history, ltp);
    const recommendedStrat =
      technicalScore + fundamentalScore > 3 ? strats[0] // strong scores → bid higher (conservative) to ensure allotment
      : technicalScore + fundamentalScore < -2 ? strats[2] // weak scores → bid aggressively
      : strats[1];

    const probTable = bidProbabilityTable(history, ltp);
    return {
      ltp,
      strategies: strats,
      recommended: recommendedStrat,
      probTable,
      conviction:
        technicalScore + fundamentalScore > 4 ? "High"
        : technicalScore + fundamentalScore > 1 ? "Medium-High"
        : technicalScore + fundamentalScore > -1 ? "Medium"
        : "Low",
    };
  }

  return {
    dateIndex,
    eventWindow,
    summarizeComparables,
    bidProbabilityTable,
    strategies,
    recommendation,
  };
})();
