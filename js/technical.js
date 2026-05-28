/* ============================================================
 * technical.js — technical analysis indicators + scoring
 * Indicators: SMA, EMA, RSI, MACD, Bollinger, ATR, OBV, ADX, Stochastic, ROC
 * All take an array of {close, high, low, volume} or just closes.
 * ============================================================ */

const Technical = (function () {
  /* ---------- Moving averages ---------- */
  function sma(arr, period) {
    const out = new Array(arr.length).fill(null);
    if (period <= 0) return out;
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      s += arr[i];
      if (i >= period) s -= arr[i - period];
      if (i >= period - 1) out[i] = s / period;
    }
    return out;
  }

  function ema(arr, period) {
    const out = new Array(arr.length).fill(null);
    if (period <= 0 || arr.length === 0) return out;
    const k = 2 / (period + 1);
    // seed with SMA of first 'period' values
    let seed = 0, count = 0;
    for (let i = 0; i < arr.length; i++) {
      if (i < period) {
        seed += arr[i];
        count++;
        if (i === period - 1) out[i] = seed / period;
      } else {
        out[i] = arr[i] * k + out[i - 1] * (1 - k);
      }
    }
    return out;
  }

  /* ---------- RSI (Wilder) ---------- */
  function rsi(closes, period = 14) {
    const out = new Array(closes.length).fill(null);
    if (closes.length < period + 1) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const ch = closes[i] - closes[i - 1];
      if (ch >= 0) gain += ch;
      else loss -= ch;
    }
    let avgG = gain / period, avgL = loss / period;
    out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
    for (let i = period + 1; i < closes.length; i++) {
      const ch = closes[i] - closes[i - 1];
      const g = ch > 0 ? ch : 0;
      const l = ch < 0 ? -ch : 0;
      avgG = (avgG * (period - 1) + g) / period;
      avgL = (avgL * (period - 1) + l) / period;
      out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
    }
    return out;
  }

  /* ---------- MACD ---------- */
  function macd(closes, fast = 12, slow = 26, signal = 9) {
    const ef = ema(closes, fast);
    const es = ema(closes, slow);
    const line = closes.map((_, i) =>
      ef[i] !== null && es[i] !== null ? ef[i] - es[i] : null
    );
    // signal = EMA of line where defined
    const validIdx = line.findIndex((x) => x !== null);
    const subset = validIdx >= 0 ? line.slice(validIdx).map((x) => x ?? 0) : [];
    const signalSub = ema(subset, signal);
    const sig = new Array(closes.length).fill(null);
    if (validIdx >= 0)
      for (let i = 0; i < signalSub.length; i++)
        sig[validIdx + i] = signalSub[i];
    const hist = line.map((x, i) =>
      x !== null && sig[i] !== null ? x - sig[i] : null
    );
    return { line, signal: sig, histogram: hist };
  }

  /* ---------- Bollinger Bands ---------- */
  function bollinger(closes, period = 20, k = 2) {
    const mid = sma(closes, period);
    const upper = new Array(closes.length).fill(null);
    const lower = new Array(closes.length).fill(null);
    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const m = mid[i];
      let v = 0;
      for (const x of slice) v += (x - m) ** 2;
      const sd = Math.sqrt(v / period);
      upper[i] = m + k * sd;
      lower[i] = m - k * sd;
    }
    return { mid, upper, lower };
  }

  /* ---------- ATR (Wilder) ---------- */
  function trueRange(bar, prevClose) {
    const a = bar.high - bar.low;
    const b = Math.abs(bar.high - prevClose);
    const c = Math.abs(bar.low - prevClose);
    return Math.max(a, b, c);
  }
  function atr(bars, period = 14) {
    const out = new Array(bars.length).fill(null);
    if (bars.length < period + 1) return out;
    const trs = [];
    for (let i = 1; i < bars.length; i++) trs.push(trueRange(bars[i], bars[i - 1].close));
    let prev = trs.slice(0, period).reduce((s, x) => s + x, 0) / period;
    out[period] = prev;
    for (let i = period + 1; i < bars.length; i++) {
      prev = (prev * (period - 1) + trs[i - 1]) / period;
      out[i] = prev;
    }
    return out;
  }

  /* ---------- OBV ---------- */
  function obv(closes, volumes) {
    const out = new Array(closes.length).fill(0);
    for (let i = 1; i < closes.length; i++) {
      out[i] =
        out[i - 1] +
        (closes[i] > closes[i - 1] ? volumes[i]
         : closes[i] < closes[i - 1] ? -volumes[i]
         : 0);
    }
    return out;
  }

  /* ---------- Stochastic (%K, %D) ---------- */
  function stochastic(bars, kPeriod = 14, dPeriod = 3) {
    const k = new Array(bars.length).fill(null);
    for (let i = kPeriod - 1; i < bars.length; i++) {
      let hh = -Infinity, ll = Infinity;
      for (let j = i - kPeriod + 1; j <= i; j++) {
        if (bars[j].high > hh) hh = bars[j].high;
        if (bars[j].low < ll) ll = bars[j].low;
      }
      k[i] = hh === ll ? 50 : ((bars[i].close - ll) / (hh - ll)) * 100;
    }
    const d = sma(k.map((x) => x ?? 0), dPeriod).map((x, i) =>
      i >= kPeriod + dPeriod - 2 ? x : null
    );
    return { k, d };
  }

  /* ---------- ROC ---------- */
  function roc(closes, period = 12) {
    return closes.map((c, i) =>
      i >= period && closes[i - period] ? ((c - closes[i - period]) / closes[i - period]) * 100 : null
    );
  }

  /* ---------- ADX (Wilder, simplified) ---------- */
  function adx(bars, period = 14) {
    if (bars.length < period * 2) return new Array(bars.length).fill(null);
    const plusDM = [], minusDM = [], tr = [];
    for (let i = 1; i < bars.length; i++) {
      const up = bars[i].high - bars[i - 1].high;
      const dn = bars[i - 1].low - bars[i].low;
      plusDM.push(up > dn && up > 0 ? up : 0);
      minusDM.push(dn > up && dn > 0 ? dn : 0);
      tr.push(trueRange(bars[i], bars[i - 1].close));
    }
    function wilderSmooth(arr, p) {
      const o = new Array(arr.length).fill(null);
      let sum = 0;
      for (let i = 0; i < p; i++) sum += arr[i];
      o[p - 1] = sum;
      for (let i = p; i < arr.length; i++) o[i] = o[i - 1] - o[i - 1] / p + arr[i];
      return o;
    }
    const sp = wilderSmooth(plusDM, period);
    const sm = wilderSmooth(minusDM, period);
    const st = wilderSmooth(tr, period);
    const out = new Array(bars.length).fill(null);
    const dxs = [];
    for (let i = period - 1; i < sp.length; i++) {
      if (st[i] && st[i] > 0) {
        const pdi = (sp[i] / st[i]) * 100;
        const mdi = (sm[i] / st[i]) * 100;
        const dx = Math.abs(pdi - mdi) / (pdi + mdi || 1) * 100;
        dxs.push(dx);
        if (dxs.length >= period) {
          const slice = dxs.slice(-period);
          const adxVal = slice.reduce((s, x) => s + x, 0) / period;
          out[i + 1] = adxVal;
        }
      }
    }
    return out;
  }

  /* ---------- VWAP (rolling, optional period) ---------- */
  function vwap(bars, period = null) {
    const out = new Array(bars.length).fill(null);
    let pv = 0, vv = 0;
    if (period === null) {
      for (let i = 0; i < bars.length; i++) {
        const tp = (bars[i].high + bars[i].low + bars[i].close) / 3;
        pv += tp * bars[i].volume;
        vv += bars[i].volume;
        out[i] = vv > 0 ? pv / vv : null;
      }
    } else {
      for (let i = 0; i < bars.length; i++) {
        if (i >= period) {
          const old = bars[i - period];
          pv -= ((old.high + old.low + old.close) / 3) * old.volume;
          vv -= old.volume;
        }
        const tp = (bars[i].high + bars[i].low + bars[i].close) / 3;
        pv += tp * bars[i].volume;
        vv += bars[i].volume;
        if (i >= period - 1) out[i] = vv > 0 ? pv / vv : null;
      }
    }
    return out;
  }

  /* ---------- support / resistance (swing highs/lows) ---------- */
  function pivots(bars, leftRight = 5) {
    const highs = [], lows = [];
    for (let i = leftRight; i < bars.length - leftRight; i++) {
      let isHigh = true, isLow = true;
      for (let k = 1; k <= leftRight; k++) {
        if (bars[i].high <= bars[i - k].high || bars[i].high <= bars[i + k].high) isHigh = false;
        if (bars[i].low >= bars[i - k].low || bars[i].low >= bars[i + k].low) isLow = false;
      }
      if (isHigh) highs.push({ idx: i, price: bars[i].high, date: bars[i].date });
      if (isLow) lows.push({ idx: i, price: bars[i].low, date: bars[i].date });
    }
    return { highs, lows };
  }

  /* ---------- 52-week stats ---------- */
  function fiftyTwoWeek(closes) {
    const window = closes.slice(-252);
    if (!window.length) return null;
    return {
      high: Math.max(...window),
      low: Math.min(...window),
      pctOfRange:
        (window[window.length - 1] - Math.min(...window)) /
        ((Math.max(...window) - Math.min(...window)) || 1),
    };
  }

  /* ---------- Master scorecard (-5 to +5) ---------- */
  function scorecard(bars) {
    if (!bars || bars.length < 60) {
      return {
        score: 0, label: "Insufficient data", components: [], details: { warning: "Need ≥ 60 bars" },
      };
    }
    const closes = bars.map((b) => b.close);
    const last = closes[closes.length - 1];

    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);
    const rsiArr = rsi(closes, 14);
    const m = macd(closes);
    const bb = bollinger(closes, 20, 2);
    const adxArr = adx(bars, 14);
    const ftw = fiftyTwoWeek(closes);
    const last20 = closes.slice(-20);
    const last20Vol = bars.slice(-20).map((b) => b.volume);
    const baselineVol = bars.slice(-60, -20).map((b) => b.volume);
    const volZ = baselineVol.length
      ? (Stats.mean(last20Vol) - Stats.mean(baselineVol)) / (Stats.stdev(baselineVol) || 1)
      : 0;

    const components = [];

    // 1. Trend (SMA stack)
    let trendScore = 0;
    const s20 = sma20[sma20.length - 1];
    const s50 = sma50[sma50.length - 1];
    const s200 = sma200[sma200.length - 1] ?? sma50[sma50.length - 1];
    if (last > s20) trendScore += 1;
    if (s20 > s50) trendScore += 1;
    if (s50 > s200) trendScore += 1;
    if (last < s20) trendScore -= 1;
    if (s20 < s50) trendScore -= 1;
    if (s50 < s200) trendScore -= 1;
    components.push({
      name: "Trend (SMA stack)",
      raw: trendScore,
      detail: `Px ${last.toFixed(2)} | SMA20 ${(s20 ?? 0).toFixed(2)} | SMA50 ${(s50 ?? 0).toFixed(2)} | SMA200 ${(s200 ?? 0).toFixed(2)}`,
    });

    // 2. Momentum (RSI)
    const rsiLast = rsiArr[rsiArr.length - 1] ?? 50;
    let rsiScore = 0;
    if (rsiLast > 70) rsiScore = -1; // overbought
    else if (rsiLast < 30) rsiScore = 1; // oversold rebound potential
    else if (rsiLast > 55) rsiScore = 1;
    else if (rsiLast < 45) rsiScore = -1;
    components.push({ name: "RSI(14)", raw: rsiScore, detail: rsiLast.toFixed(1) });

    // 3. MACD
    const macdLast = m.line[m.line.length - 1];
    const sigLast = m.signal[m.signal.length - 1];
    const histLast = m.histogram[m.histogram.length - 1] ?? 0;
    let macdScore = 0;
    if (macdLast !== null && sigLast !== null) {
      if (macdLast > sigLast && histLast > 0) macdScore = 1;
      else if (macdLast < sigLast && histLast < 0) macdScore = -1;
    }
    components.push({
      name: "MACD",
      raw: macdScore,
      detail: `line ${(macdLast ?? 0).toFixed(2)} | signal ${(sigLast ?? 0).toFixed(2)} | hist ${(histLast ?? 0).toFixed(2)}`,
    });

    // 4. Bollinger position
    const bbU = bb.upper[bb.upper.length - 1];
    const bbL = bb.lower[bb.lower.length - 1];
    const bbM = bb.mid[bb.mid.length - 1];
    let bbScore = 0;
    if (bbU !== null && bbL !== null) {
      if (last > bbU) bbScore = -1; // stretched above upper
      else if (last < bbL) bbScore = 1; // stretched below lower
      else if (last > bbM) bbScore = 0.5;
      else bbScore = -0.5;
    }
    components.push({
      name: "Bollinger position",
      raw: bbScore,
      detail: `mid ${(bbM ?? 0).toFixed(2)} | px ${last.toFixed(2)}`,
    });

    // 5. ADX (trend strength)
    const adxLast = adxArr[adxArr.length - 1] ?? 0;
    let adxScore = 0;
    if (adxLast > 25 && trendScore > 0) adxScore = 1;
    else if (adxLast > 25 && trendScore < 0) adxScore = -1;
    components.push({ name: "ADX strength", raw: adxScore, detail: adxLast.toFixed(1) });

    // 6. Volume z-score (last 20 vs prior 40)
    let volScore = 0;
    if (volZ > 1) volScore = trendScore >= 0 ? 1 : -0.5;
    else if (volZ < -1) volScore = -0.5;
    components.push({ name: "Volume z-score", raw: volScore, detail: volZ.toFixed(2) });

    // sum and clamp to -5..+5
    const raw = components.reduce((s, c) => s + c.raw, 0);
    const score = Math.max(-5, Math.min(5, raw));
    const label =
      score >= 3 ? "Strongly bullish"
      : score >= 1.5 ? "Bullish"
      : score >= 0.5 ? "Mildly bullish"
      : score >= -0.5 ? "Neutral"
      : score >= -1.5 ? "Mildly bearish"
      : score >= -3 ? "Bearish"
      : "Strongly bearish";

    return {
      score: Number(score.toFixed(2)),
      label,
      components,
      details: {
        last,
        sma20: s20, sma50: s50, sma200: s200,
        rsi: rsiLast,
        macd: { line: macdLast, signal: sigLast, hist: histLast },
        bollinger: { upper: bbU, mid: bbM, lower: bbL },
        adx: adxLast,
        volZ,
        fiftyTwoWeek: ftw,
      },
    };
  }

  return {
    sma, ema, rsi, macd, bollinger, atr, obv,
    stochastic, roc, adx, vwap, pivots,
    fiftyTwoWeek, scorecard,
  };
})();
