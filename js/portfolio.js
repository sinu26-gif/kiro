/* ============================================================
 * portfolio.js — portfolio construction and optimization
 * Methods: equal-weight, risk-parity (1/sigma), mean-CVaR (random search)
 * Multi-asset Monte Carlo via Cholesky-correlated paths.
 * ============================================================ */

const Portfolio = (function () {
  /** Pull aligned log-return matrix across tickers (last K bars common). */
  function alignedReturnsMatrix(tickers) {
    const seriesByTicker = tickers.map((t) =>
      Stats.logReturns((t.ohlcv || []).map((b) => b.close))
    );
    const minLen = Math.min(...seriesByTicker.map((s) => s.length));
    return seriesByTicker.map((s) => s.slice(-minLen));
  }

  /* ---------- weight schemes ---------- */
  function equalWeight(n) {
    return new Array(n).fill(1 / n);
  }

  function riskParity(tickers) {
    const sigmas = tickers.map((t) => {
      const lr = Stats.logReturns((t.ohlcv || []).map((b) => b.close));
      return Stats.stdev(lr) * Math.sqrt(252) || 1;
    });
    const inv = sigmas.map((s) => 1 / s);
    const sum = inv.reduce((a, b) => a + b, 0);
    return inv.map((x) => x / sum);
  }

  /* ---------- Random-search mean-CVaR optimizer ----------
   * Generate Dirichlet-like simplex weights, simulate portfolio P&L using
   * each ticker's pre-run MC distribution at chosen horizon, compute
   * mean, CVaR, score = mean - lambda * CVaR.
   */
  function randomSimplex(n, rng) {
    // sample exponentials → normalize
    const x = new Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const u = Math.max(1e-9, rng());
      x[i] = -Math.log(u);
      sum += x[i];
    }
    return x.map((v) => v / sum);
  }

  /**
   * Optimize using each ticker's terminal-price distribution at given horizon.
   * portfolioReturn_t = Σ w_i * (S_T,i - S_0,i)/S_0,i
   * CVaR computed over the empirical portfolio-return distribution.
   *
   * @param tickers  array of tickers (must already have mcDistAtHorizon array of S_T values)
   * @param settings { trials, lambda, alpha, seed }
   */
  function optimizeMeanCVaR(tickers, settings = {}) {
    const trials = settings.trials ?? 4000;
    const lambda = settings.lambda ?? 1.0;
    const alpha = settings.alpha ?? 0.95;
    const rng = Stats.mulberry32(settings.seed ?? 12345);

    const n = tickers.length;
    const distMatrix = tickers.map((t) => t.mcDistAtHorizon);
    const s0 = tickers.map((t) => t.ltp);
    const M = distMatrix[0]?.length || 0;
    if (n === 0 || M === 0) {
      return { ok: false, reason: "Missing distributions. Run Monte Carlo first." };
    }
    if (!distMatrix.every((d) => d.length === M))
      // truncate to common length
      distMatrix.forEach((d, i) => (distMatrix[i] = d.slice(0, Math.min(M, d.length))));

    // pre-compute returns per asset per draw
    const retMatrix = distMatrix.map((d, i) => d.map((s) => (s - s0[i]) / s0[i]));

    let best = { score: -Infinity, weights: null, mean: 0, cvar: 0 };
    const equal = equalWeight(n);
    // include equal-weight as a candidate
    const candidates = [equal];
    for (let k = 0; k < trials; k++) candidates.push(randomSimplex(n, rng));

    for (const w of candidates) {
      // portfolio returns over draws
      const draws = M;
      const portRets = new Array(draws);
      for (let m = 0; m < draws; m++) {
        let r = 0;
        for (let i = 0; i < n; i++) r += w[i] * retMatrix[i][m];
        portRets[m] = r;
      }
      const mu = Stats.mean(portRets);
      const cvar = Stats.conditionalVaR(portRets, alpha);
      const score = mu - lambda * cvar;
      if (score > best.score) best = { score, weights: w.slice(), mean: mu, cvar };
    }
    return { ok: true, ...best, lambda, alpha, trials };
  }

  /* ---------- Capital allocation (NPR amounts and share quantities) ---------- */
  function allocate(tickers, weights, capital) {
    const out = [];
    weights.forEach((w, i) => {
      const t = tickers[i];
      const npr = capital * w;
      const bid = t.floorPrice ?? t.ltp;
      const qty = bid > 0 ? Math.floor(npr / bid) : 0;
      out.push({
        symbol: t.symbol,
        weight: w,
        npr,
        bid,
        qty,
        cost: qty * bid,
      });
    });
    return out;
  }

  /* ---------- Portfolio summary metrics from per-asset distributions ---------- */
  function portfolioMetrics(tickers, weights) {
    const distMatrix = tickers.map((t) => t.mcDistAtHorizon);
    const s0 = tickers.map((t) => t.ltp);
    const draws = Math.min(...distMatrix.map((d) => d.length));
    if (draws === 0) return null;
    const portRets = new Array(draws);
    for (let m = 0; m < draws; m++) {
      let r = 0;
      for (let i = 0; i < tickers.length; i++) {
        r += weights[i] * (distMatrix[i][m] - s0[i]) / s0[i];
      }
      portRets[m] = r;
    }
    return {
      mean: Stats.mean(portRets),
      median: Stats.median(portRets),
      std: Stats.stdev(portRets),
      var95: Stats.valueAtRisk(portRets, 0.95),
      cvar95: Stats.conditionalVaR(portRets, 0.95),
      probPositive: portRets.filter((r) => r > 0).length / draws,
      bands: Stats.bands(portRets),
    };
  }

  /* ---------- Public API ---------- */
  return {
    alignedReturnsMatrix,
    equalWeight,
    riskParity,
    optimizeMeanCVaR,
    allocate,
    portfolioMetrics,
  };
})();
