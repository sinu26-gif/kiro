/* ============================================================
 * charts.js — Chart.js wrappers for the system
 * Loaded after Chart.js is loaded via CDN in each page.
 * Provides: priceChart, indicatorChart, eventWindowChart,
 *           fanChart, histogramChart, allocationDonut.
 * All charts use a consistent palette + dark-on-white theme.
 * ============================================================ */

const Charts = (function () {
  const palette = {
    primary: "#1e3c72",
    primarySoft: "rgba(30,60,114,0.10)",
    secondary: "#2a5298",
    accent: "#f7971e",
    bull: "#11998e",
    bear: "#eb3349",
    grid: "rgba(0,0,0,0.06)",
    p5_95: "rgba(30,60,114,0.10)",
    p25_75: "rgba(30,60,114,0.22)",
    p50: "#1e3c72",
  };

  function ensureChartJs() {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js not loaded; charts disabled.");
      return false;
    }
    return true;
  }

  function clearCanvas(canvas) {
    const old = Chart.getChart(canvas);
    if (old) old.destroy();
  }

  /* ---------- Price chart with optional overlays ---------- */
  function priceChart(canvas, ohlcv, overlays = {}, opts = {}) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    const labels = ohlcv.map((b) => b.date);
    const closes = ohlcv.map((b) => b.close);
    const datasets = [
      {
        label: "Close",
        data: closes,
        borderColor: palette.primary,
        backgroundColor: palette.primarySoft,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.05,
        fill: false,
      },
    ];
    if (overlays.sma20) datasets.push({ label: "SMA20", data: overlays.sma20, borderColor: palette.accent, borderWidth: 1, pointRadius: 0, fill: false });
    if (overlays.sma50) datasets.push({ label: "SMA50", data: overlays.sma50, borderColor: palette.secondary, borderWidth: 1, pointRadius: 0, fill: false });
    if (overlays.sma200) datasets.push({ label: "SMA200", data: overlays.sma200, borderColor: palette.bear, borderWidth: 1, pointRadius: 0, fill: false });
    if (overlays.bb) {
      datasets.push({ label: "BB upper", data: overlays.bb.upper, borderColor: "rgba(30,60,114,0.5)", borderWidth: 1, pointRadius: 0, borderDash: [3,3], fill: false });
      datasets.push({ label: "BB lower", data: overlays.bb.lower, borderColor: "rgba(30,60,114,0.5)", borderWidth: 1, pointRadius: 0, borderDash: [3,3], fill: false });
    }
    return new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } }, title: opts.title ? { display: true, text: opts.title } : undefined },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  /* ---------- Indicator chart (RSI / MACD) ---------- */
  function rsiChart(canvas, ohlcv, rsi) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    return new Chart(canvas, {
      type: "line",
      data: {
        labels: ohlcv.map((b) => b.date),
        datasets: [
          { label: "RSI(14)", data: rsi, borderColor: palette.secondary, borderWidth: 1.5, pointRadius: 0, fill: false },
          { label: "70", data: rsi.map(() => 70), borderColor: "rgba(235,51,73,0.5)", borderWidth: 1, pointRadius: 0, borderDash: [4,4], fill: false },
          { label: "30", data: rsi.map(() => 30), borderColor: "rgba(17,153,142,0.5)", borderWidth: 1, pointRadius: 0, borderDash: [4,4], fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { min: 0, max: 100, ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  function macdChart(canvas, ohlcv, macd) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    const labels = ohlcv.map((b) => b.date);
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Histogram",
            data: macd.histogram,
            backgroundColor: macd.histogram.map((h) =>
              h > 0 ? "rgba(17,153,142,0.6)" : "rgba(235,51,73,0.6)"
            ),
            borderWidth: 0,
          },
          { type: "line", label: "MACD", data: macd.line, borderColor: palette.primary, borderWidth: 1.5, pointRadius: 0, fill: false },
          { type: "line", label: "Signal", data: macd.signal, borderColor: palette.accent, borderWidth: 1.5, pointRadius: 0, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  /* ---------- Volume chart ---------- */
  function volumeChart(canvas, ohlcv) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: ohlcv.map((b) => b.date),
        datasets: [{
          label: "Volume",
          data: ohlcv.map((b) => b.volume),
          backgroundColor: ohlcv.map((b, i) => {
            const prev = i > 0 ? ohlcv[i-1].close : b.close;
            return b.close >= prev ? "rgba(17,153,142,0.4)" : "rgba(235,51,73,0.4)";
          }),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  /* ---------- Event window chart (price with shaded auction window) ---------- */
  function eventWindowChart(canvas, ohlcv, openIdx, closeIdx) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    const labels = ohlcv.map((b) => b.date);
    const closes = ohlcv.map((b) => b.close);
    const inWin = ohlcv.map((b, i) => (i >= openIdx && i <= closeIdx ? b.close : null));
    return new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Close", data: closes, borderColor: palette.primary, borderWidth: 1.5, pointRadius: 0, fill: false },
          { label: "Auction window", data: inWin, borderColor: palette.accent, backgroundColor: "rgba(247,151,30,0.18)", borderWidth: 2, pointRadius: 0, fill: true },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  /* ---------- Monte Carlo fan chart ---------- */
  function fanChart(canvas, fan, opts = {}) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    const labels = fan.map((p) => `T+${p.t}`);
    const datasets = [
      { label: "p95", data: fan.map((p) => p.p95), borderColor: "rgba(30,60,114,0.5)", borderWidth: 0.5, pointRadius: 0, fill: false },
      { label: "75–95%", data: fan.map((p) => p.p75), borderColor: "transparent", backgroundColor: palette.p5_95, borderWidth: 0, pointRadius: 0, fill: "-1" },
      { label: "25–75%", data: fan.map((p) => p.p25), borderColor: "transparent", backgroundColor: palette.p25_75, borderWidth: 0, pointRadius: 0, fill: "-1" },
      { label: "5–25%", data: fan.map((p) => p.p5), borderColor: "transparent", backgroundColor: palette.p5_95, borderWidth: 0, pointRadius: 0, fill: "-1" },
      { label: "Median", data: fan.map((p) => p.p50), borderColor: palette.p50, borderWidth: 2, pointRadius: 0, fill: false },
    ];
    if (opts.floor) {
      datasets.push({
        label: "Floor bid",
        data: fan.map(() => opts.floor),
        borderColor: palette.bear,
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      });
    }
    return new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } }, title: opts.title ? { display: true, text: opts.title } : undefined },
        scales: {
          x: { ticks: { maxTicksLimit: 10, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  /* ---------- Histogram (Monte Carlo terminal distribution) ---------- */
  function histogramChart(canvas, values, opts = {}) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    const bins = opts.bins ?? 40;
    const lo = Stats.min(values), hi = Stats.max(values);
    const w = (hi - lo) / bins || 1;
    const counts = new Array(bins).fill(0);
    const labels = new Array(bins);
    for (let i = 0; i < bins; i++) labels[i] = (lo + (i + 0.5) * w).toFixed(0);
    for (const v of values) {
      const i = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)));
      counts[i]++;
    }
    const datasets = [{
      type: "bar",
      label: "Frequency",
      data: counts,
      backgroundColor: counts.map((_, i) =>
        opts.floor && parseFloat(labels[i]) < opts.floor
          ? "rgba(235,51,73,0.55)"
          : "rgba(30,60,114,0.55)"
      ),
      borderWidth: 0,
    }];
    return new Chart(canvas, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: opts.title ? { display: true, text: opts.title } : undefined },
        scales: {
          x: { ticks: { maxTicksLimit: 10, color: "#7f8c8d" }, grid: { color: palette.grid } },
          y: { ticks: { color: "#7f8c8d" }, grid: { color: palette.grid } },
        },
      },
    });
  }

  /* ---------- Allocation donut ---------- */
  function allocationDonut(canvas, items, opts = {}) {
    if (!ensureChartJs()) return null;
    clearCanvas(canvas);
    const colors = ["#1e3c72", "#2a5298", "#f7971e", "#11998e", "#eb3349", "#9b59b6", "#16a085", "#e67e22"];
    return new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: items.map((x) => x.symbol),
        datasets: [{
          data: items.map((x) => x.weight),
          backgroundColor: items.map((_, i) => colors[i % colors.length]),
          borderWidth: 1,
          borderColor: "#fff",
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: "55%",
        plugins: {
          legend: { position: "right", labels: { boxWidth: 12 } },
          title: opts.title ? { display: true, text: opts.title } : undefined,
          tooltip: {
            callbacks: {
              label(ctx) {
                const w = ctx.parsed;
                return `${ctx.label}: ${(w * 100).toFixed(1)}%`;
              },
            },
          },
        },
      },
    });
  }

  /* ---------- Scorecard "gauge" (semi-circle) drawn on canvas (no Chart.js) ---------- */
  function scoreGauge(canvas, score, label) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.85, r = Math.min(w, h * 1.7) * 0.42;
    // background arc
    ctx.lineWidth = r * 0.18;
    ctx.lineCap = "round";
    const grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    grad.addColorStop(0, "#eb3349");
    grad.addColorStop(0.5, "#f7971e");
    grad.addColorStop(1, "#11998e");
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.stroke();
    // pointer
    const norm = Math.max(-5, Math.min(5, score)) / 5; // -1..+1
    const angle = Math.PI + (norm + 1) * Math.PI / 2;
    ctx.strokeStyle = "#1e3c72";
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r * 0.95, cy + Math.sin(angle) * r * 0.95);
    ctx.stroke();
    // dot
    ctx.fillStyle = "#1e3c72";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.08, 0, 2 * Math.PI);
    ctx.fill();
    // text
    ctx.fillStyle = "#1e3c72";
    ctx.textAlign = "center";
    ctx.font = `${Math.round(r * 0.32)}px Segoe UI, sans-serif`;
    ctx.fillText(score.toFixed(2), cx, cy - r * 0.32);
    ctx.fillStyle = "#7f8c8d";
    ctx.font = `${Math.round(r * 0.16)}px Segoe UI, sans-serif`;
    ctx.fillText(label || "", cx, cy + r * 0.18);
  }

  return {
    priceChart,
    rsiChart,
    macdChart,
    volumeChart,
    eventWindowChart,
    fanChart,
    histogramChart,
    allocationDonut,
    scoreGauge,
    palette,
  };
})();
