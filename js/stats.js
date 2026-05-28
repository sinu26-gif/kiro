/* ============================================================
 * stats.js — statistics, distributions, PRNG (seedable), correlation
 * Pure functions. No DOM. Used by montecarlo.js and analysis modules.
 * ============================================================ */

const Stats = (function () {
  /* ---------- basic descriptive stats ---------- */
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const mean = (a) => (a.length === 0 ? NaN : sum(a) / a.length);
  const variance = (a, ddof = 1) => {
    if (a.length <= ddof) return NaN;
    const m = mean(a);
    return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - ddof);
  };
  const stdev = (a, ddof = 1) => Math.sqrt(variance(a, ddof));
  const min = (a) => a.reduce((m, x) => (x < m ? x : m), Infinity);
  const max = (a) => a.reduce((m, x) => (x > m ? x : m), -Infinity);
  const range = (a) => max(a) - min(a);

  /** sorted percentile (linear interpolation) */
  function percentile(arr, p) {
    if (!arr.length) return NaN;
    const sorted = [...arr].sort((x, y) => x - y);
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  const median = (a) => percentile(a, 0.5);

  /** quantile bands {p5,p25,p50,p75,p95} */
  function bands(arr) {
    return {
      p5: percentile(arr, 0.05),
      p25: percentile(arr, 0.25),
      p50: percentile(arr, 0.5),
      p75: percentile(arr, 0.75),
      p95: percentile(arr, 0.95),
      min: min(arr),
      max: max(arr),
      mean: mean(arr),
      std: stdev(arr),
    };
  }

  /** skewness, kurtosis (excess) */
  function skewness(a) {
    const m = mean(a);
    const s = stdev(a);
    if (s === 0 || !isFinite(s)) return NaN;
    return mean(a.map((x) => ((x - m) / s) ** 3));
  }
  function kurtosis(a) {
    const m = mean(a);
    const s = stdev(a);
    if (s === 0 || !isFinite(s)) return NaN;
    return mean(a.map((x) => ((x - m) / s) ** 4)) - 3;
  }

  /* ---------- log returns from price series ---------- */
  function logReturns(prices) {
    const r = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0 && prices[i] > 0)
        r.push(Math.log(prices[i] / prices[i - 1]));
    }
    return r;
  }
  function simpleReturns(prices) {
    const r = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) r.push(prices[i] / prices[i - 1] - 1);
    }
    return r;
  }

  /** annualized stats from daily log returns */
  function annualize(logRets, periodsPerYear = 252) {
    const m = mean(logRets);
    const s = stdev(logRets);
    return { mu: m * periodsPerYear, sigma: s * Math.sqrt(periodsPerYear) };
  }

  /* ---------- volatility models ---------- */
  /** EWMA (RiskMetrics) variance series; returns last sigma_daily */
  function ewmaSigma(logRets, lambda = 0.94) {
    if (!logRets.length) return NaN;
    let v = variance(logRets, 1);
    if (!isFinite(v)) v = 0;
    for (const r of logRets) v = lambda * v + (1 - lambda) * r * r;
    return Math.sqrt(v);
  }

  /** Lightweight GARCH(1,1) MLE-free estimation via simple grid + recursion.
   *  Returns { omega, alpha, beta, sigmaDaily }. Robust enough for browser use.
   */
  function garch11(logRets) {
    if (logRets.length < 30) {
      const s = stdev(logRets, 1);
      return { omega: NaN, alpha: NaN, beta: NaN, sigmaDaily: s };
    }
    const v0 = variance(logRets, 1);
    let best = { ll: -Infinity, params: null, sigmaDaily: Math.sqrt(v0) };
    const alphas = [0.05, 0.08, 0.1, 0.12, 0.15];
    const betas = [0.7, 0.78, 0.85, 0.9, 0.92];
    for (const a of alphas) {
      for (const b of betas) {
        if (a + b >= 0.999) continue;
        const omega = v0 * (1 - a - b);
        let v = v0;
        let ll = 0;
        for (const r of logRets) {
          v = omega + a * r * r + b * v;
          if (v <= 0) {
            ll = -Infinity;
            break;
          }
          ll += -0.5 * (Math.log(2 * Math.PI * v) + (r * r) / v);
        }
        if (ll > best.ll) {
          best = { ll, params: { omega, alpha: a, beta: b }, sigmaDaily: Math.sqrt(v) };
        }
      }
    }
    if (!best.params) return { omega: NaN, alpha: NaN, beta: NaN, sigmaDaily: Math.sqrt(v0) };
    return { ...best.params, sigmaDaily: best.sigmaDaily };
  }

  /* ---------- jump filter (for Merton parameter estimation) ---------- */
  function filterJumps(logRets, kSigma = 3) {
    const m = mean(logRets);
    const s = stdev(logRets);
    const jumps = [];
    const cont = [];
    for (const r of logRets) {
      if (Math.abs(r - m) > kSigma * s) jumps.push(r);
      else cont.push(r);
    }
    return { jumps, cont };
  }
  function estimateJumpParams(logRets, kSigma = 3, periodsPerYear = 252) {
    const { jumps, cont } = filterJumps(logRets, kSigma);
    if (jumps.length === 0) {
      return { lambda: 0, jumpMean: 0, jumpStd: 0, contSigma: stdev(cont, 1), contMean: mean(cont) };
    }
    return {
      lambda: (jumps.length / logRets.length) * periodsPerYear, // jumps per year
      jumpMean: mean(jumps),
      jumpStd: stdev(jumps, 1) || 1e-6,
      contSigma: stdev(cont, 1),
      contMean: mean(cont),
    };
  }

  /* ---------- correlation ---------- */
  function correlation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return NaN;
    const mx = mean(x.slice(-n));
    const my = mean(y.slice(-n));
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[x.length - n + i] - mx;
      const dy = y[y.length - n + i] - my;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    const denom = Math.sqrt(sxx * syy);
    return denom === 0 ? 0 : sxy / denom;
  }

  /** Correlation matrix from list of equal-length return series */
  function correlationMatrix(seriesList) {
    const n = seriesList.length;
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const c = i === j ? 1 : correlation(seriesList[i], seriesList[j]);
        M[i][j] = c;
        M[j][i] = c;
      }
    }
    return M;
  }

  /* ---------- Cholesky decomposition ---------- */
  /** Returns lower-triangular L such that L Lᵀ = A. Adds tiny ridge if needed. */
  function cholesky(A) {
    const n = A.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    const ridge = 1e-10;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = A[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          if (sum <= 0) sum = ridge;
          L[i][j] = Math.sqrt(sum);
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    return L;
  }
  function matVec(L, v) {
    const n = L.length;
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++) out[i] += L[i][j] * v[j];
    return out;
  }

  /* ---------- seedable PRNG (mulberry32) ---------- */
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Box–Muller standard normal generator. Returns {next:()->number} */
  function normalGenerator(seed = 42) {
    const u = mulberry32(seed);
    let cached = null;
    return {
      next() {
        if (cached !== null) {
          const v = cached;
          cached = null;
          return v;
        }
        let u1 = 0, u2 = 0;
        while (u1 < 1e-12) u1 = u();
        u2 = u();
        const mag = Math.sqrt(-2 * Math.log(u1));
        const z0 = mag * Math.cos(2 * Math.PI * u2);
        const z1 = mag * Math.sin(2 * Math.PI * u2);
        cached = z1;
        return z0;
      },
      nextVec(n) {
        const v = new Array(n);
        for (let i = 0; i < n; i++) v[i] = this.next();
        return v;
      },
      uniform: u,
      poisson(lam) {
        // Knuth
        const L = Math.exp(-lam);
        let k = 0, p = 1;
        do {
          k++;
          p *= u();
        } while (p > L);
        return k - 1;
      },
    };
  }

  /* ---------- normal CDF / inverse CDF (for VaR conversions) ---------- */
  function erf(x) {
    // Abramowitz & Stegun 7.1.26
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y =
      1 -
      (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
        0.254829592) *
        t *
        Math.exp(-ax * ax);
    return sign * y;
  }
  const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

  /* ---------- VaR / CVaR ---------- */
  function valueAtRisk(returns, alpha = 0.95) {
    return -percentile(returns, 1 - alpha);
  }
  function conditionalVaR(returns, alpha = 0.95) {
    const sorted = [...returns].sort((a, b) => a - b);
    const cutoff = Math.floor((1 - alpha) * sorted.length);
    if (cutoff === 0) return -sorted[0];
    const tail = sorted.slice(0, cutoff);
    return -mean(tail);
  }

  /* ---------- max drawdown of a path ---------- */
  function maxDrawdown(path) {
    let peak = path[0];
    let maxDD = 0;
    for (const x of path) {
      if (x > peak) peak = x;
      const dd = (peak - x) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }

  /* ---------- z-score ---------- */
  function zScore(arr) {
    const m = mean(arr);
    const s = stdev(arr);
    return arr.map((x) => (s === 0 ? 0 : (x - m) / s));
  }

  return {
    sum, mean, variance, stdev, min, max, range,
    percentile, median, bands, skewness, kurtosis,
    logReturns, simpleReturns, annualize,
    ewmaSigma, garch11,
    filterJumps, estimateJumpParams,
    correlation, correlationMatrix,
    cholesky, matVec,
    mulberry32, normalGenerator,
    normCdf, erf,
    valueAtRisk, conditionalVaR, maxDrawdown,
    zScore,
  };
})();
