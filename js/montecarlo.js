/* ============================================================
 * montecarlo.js — Monte Carlo engine
 * Models: GBM, Merton Jump-Diffusion
 * Vol: historical, EWMA, GARCH(1,1)
 * Budget regime overlay: 3-scenario μ/σ shocks weighted by probability
 * Multi-asset: Cholesky-correlated paths
 * Variance reduction: antithetic variates
 * ============================================================ */

const MonteCarlo = (function () {
  /* ---------- Parameter estimation per ticker ---------- */
  function estimate(ticker, opts = {}) {
    const closes = (ticker.ohlcv || []).map((b) => b.close);
    if (closes.length < 60) {
      return {
        ok: false,
        reason: "Need at least ~60 daily closes",
        mu: 0.05, sigma: 0.30, jumpParams: null,
      };
    }
    const lr = Stats.logReturns(closes);
    const annual = Stats.annualize(lr);

    // Volatility
    const useEwma = opts.useEwma ?? true;
    let sigmaDaily = useEwma
      ? Stats.ewmaSigma(lr, opts.ewmaLambda ?? 0.94)
      : Stats.stdev(lr);
    let garch = null;
    if (opts.useGarch) {
      garch = Stats.garch11(lr);
      sigmaDaily = garch.sigmaDaily;
    }
    const sigmaAnnual = sigmaDaily * Math.sqrt(252);

    // Drift: blend historical and fundamental-implied if intrinsic value supplied
    const muHist = annual.mu;
    let mu = muHist;
    if (opts.intrinsicValue && ticker.ltp) {
      const horizonYears = opts.driftHorizonYears ?? 1;
      const impl = Math.pow(opts.intrinsicValue / ticker.ltp, 1 / horizonYears) - 1;
      mu = 0.5 * muHist + 0.5 * impl;
    }

    // Jump parameters (Merton)
    const jumpParams = Stats.estimateJumpParams(lr, 3, 252);

    return {
      ok: true,
      mu, muHist,
      sigma: sigmaAnnual,
      sigmaDaily,
      jumpParams,
      garch,
      lr,
    };
  }

  /* ---------- Apply budget-scenario regime shock to (μ, σ) per scenario ---------- */
  function applyBudgetScenarios(baseMu, baseSigma, scenarios) {
    const out = {};
    let pSum = 0;
    for (const k of Object.keys(scenarios)) pSum += scenarios[k].prob || 0;
    pSum = pSum || 1;
    for (const [k, sc] of Object.entries(scenarios)) {
      out[k] = {
        prob: (sc.prob || 0) / pSum,
        mu: baseMu * (sc.muMult ?? 1),
        sigma: baseSigma * (sc.sigmaMult ?? 1),
      };
    }
    return out;
  }

  /* ---------- Core path simulator (single ticker, single regime) ---------- */
  /** Returns {paths: Float32Array of shape [N, T+1], horizons array} */
  function simulatePaths({
    s0, mu, sigma, jumpParams = null,
    days = 252,
    paths = 10000,
    seed = 42,
    antithetic = true,
    useJumps = true,
  }) {
    const rng = Stats.normalGenerator(seed);
    const N = paths;
    const T = days;
    const dt = 1 / 252;
    const muD = mu / 252; // approximate daily mu (μ-σ²/2 will be applied)
    // For jump-diffusion compensator
    let lambda = 0, m = 0, v = 0, kappa = 0;
    if (useJumps && jumpParams && jumpParams.lambda > 0) {
      lambda = jumpParams.lambda; // jumps per year
      m = jumpParams.jumpMean;
      v = Math.max(jumpParams.jumpStd, 1e-6);
      kappa = Math.exp(m + 0.5 * v * v) - 1;
    }
    const sigmaD = sigma / Math.sqrt(252);
    // store as flat Float32: idx [n*(T+1) + t]
    const paths_arr = new Float32Array(N * (T + 1));
    for (let n = 0; n < N; n++) paths_arr[n * (T + 1)] = s0;

    const halfN = Math.ceil(N / 2);
    for (let n = 0; n < (antithetic ? halfN : N); n++) {
      let s = s0;
      let sA = s0;
      for (let t = 1; t <= T; t++) {
        const z = rng.next();
        const drift = (mu - lambda * kappa) * dt - 0.5 * sigmaD * sigmaD;
        const diff = sigmaD * z;
        let jump = 0, jumpA = 0;
        if (useJumps && lambda > 0) {
          const lamDt = lambda * dt;
          const k = rng.poisson(lamDt);
          if (k > 0) {
            // sum of k log-normal jumps
            let s_log = 0;
            for (let j = 0; j < k; j++) s_log += rng.next() * v + m;
            jump = s_log;
          }
          const kA = rng.poisson(lamDt);
          if (kA > 0) {
            let s_log = 0;
            for (let j = 0; j < kA; j++) s_log += rng.next() * v + m;
            jumpA = s_log;
          }
        }
        s *= Math.exp(drift + diff + jump);
        paths_arr[n * (T + 1) + t] = s;
        if (antithetic && n + halfN < N) {
          // antithetic uses -z and an independent jump draw
          sA *= Math.exp(drift + sigmaD * (-z) + jumpA);
          paths_arr[(n + halfN) * (T + 1) + t] = sA;
        }
      }
    }
    return { paths: paths_arr, N, T, dt };
  }

  /* ---------- Mix scenarios: simulate each scenario with its weight, concatenate ---------- */
  function simulateWithRegimes({
    s0, scenarioParams, jumpParams, days, paths, seed, antithetic, useJumps,
  }) {
    const out = new Float32Array(paths * (days + 1));
    let written = 0;
    let pSum = 0;
    for (const sc of Object.values(scenarioParams)) pSum += sc.prob;
    pSum = pSum || 1;

    let scIdx = 0;
    for (const [name, sc] of Object.entries(scenarioParams)) {
      const sub = Math.max(1, Math.round((sc.prob / pSum) * paths));
      const subPaths = (scIdx === Object.keys(scenarioParams).length - 1)
        ? paths - written : sub;
      const sim = simulatePaths({
        s0, mu: sc.mu, sigma: sc.sigma, jumpParams,
        days, paths: subPaths,
        seed: (seed | 0) + scIdx * 1000003,
        antithetic, useJumps,
      });
      out.set(sim.paths, written * (days + 1));
      written += subPaths;
      scIdx++;
    }
    return { paths: out, N: paths, T: days };
  }

  /* ---------- Result extraction ---------- */
  function extractDistribution(simResult, t) {
    const N = simResult.N, T = simResult.T;
    const idx = t > T ? T : t;
    const out = new Array(N);
    for (let n = 0; n < N; n++) out[n] = simResult.paths[n * (T + 1) + idx];
    return out;
  }
  function fanChartData(simResult, sampleEvery = 5) {
    const T = simResult.T, N = simResult.N;
    const points = [];
    for (let t = 0; t <= T; t += sampleEvery) {
      const dist = extractDistribution(simResult, t);
      const b = Stats.bands(dist);
      points.push({ t, ...b });
    }
    if (points[points.length - 1].t !== T) {
      const dist = extractDistribution(simResult, T);
      const b = Stats.bands(dist);
      points.push({ t: T, ...b });
    }
    return points;
  }

  /** Probability metrics at a given horizon */
  function metricsAtHorizon(simResult, horizonDays, opts = {}) {
    const dist = extractDistribution(simResult, Math.min(horizonDays, simResult.T));
    const s0 = simResult.paths[0]; // first path's S_0 — same for all
    const rets = dist.map((s) => (s - s0) / s0);
    const logRets = dist.map((s) => Math.log(s / s0));
    const bands = Stats.bands(dist);
    const out = {
      horizon: horizonDays,
      bands,
      mean: bands.mean,
      median: bands.p50,
      meanReturn: Stats.mean(rets),
      medianReturn: Stats.median(rets),
      probPositive: rets.filter((r) => r > 0).length / rets.length,
      var95: Stats.valueAtRisk(rets, 0.95),
      cvar95: Stats.conditionalVaR(rets, 0.95),
      var99: Stats.valueAtRisk(rets, 0.99),
      sharpeAnnual:
        (Stats.mean(rets) * (252 / horizonDays) - (opts.riskFree ?? 0.045)) /
          (Stats.stdev(rets) * Math.sqrt(252 / horizonDays) || 1),
    };
    if (opts.floorBid && opts.floorBid > 0) {
      out.probAboveFloor = dist.filter((s) => s > opts.floorBid).length / dist.length;
      out.expectedProfitVsFloor =
        Stats.mean(dist.map((s) => Math.max(0, s - opts.floorBid)));
    }
    return out;
  }

  /** Full per-ticker result */
  function runTicker(ticker, simSettings, budgetScenarios, opts = {}) {
    const params = estimate(ticker, opts);
    if (!params.ok) return { ok: false, reason: params.reason };
    const scenarioParams = applyBudgetScenarios(params.mu, params.sigma, budgetScenarios);
    const horizonsT = simSettings.horizons || [30, 90, 180, 365];
    const T = Math.max(...horizonsT);
    const sim = simulateWithRegimes({
      s0: ticker.ltp,
      scenarioParams,
      jumpParams: params.jumpParams,
      days: T,
      paths: simSettings.paths,
      seed: simSettings.seed,
      antithetic: true,
      useJumps: simSettings.useJumpDiffusion ?? true,
    });
    const fan = fanChartData(sim, Math.max(1, Math.floor(T / 60)));
    const horizonResults = horizonsT.map((h) =>
      metricsAtHorizon(sim, h, { floorBid: ticker.floorPrice, riskFree: opts.riskFree })
    );
    return {
      ok: true,
      params,
      scenarioParams,
      fan,
      horizons: horizonResults,
      simulation: sim,
      // Don't store raw paths in localStorage — we keep result summary only.
    };
  }

  return {
    estimate,
    applyBudgetScenarios,
    simulatePaths,
    simulateWithRegimes,
    extractDistribution,
    fanChartData,
    metricsAtHorizon,
    runTicker,
  };
})();
