<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Gradient Descent Visualizer</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --base: #232136; --surface: #2a273f; --overlay: #393552;
    --muted: #6e6a86; --subtle: #908caa; --text: #e0def4;
    --love: #eb6f92; --gold: #f6c177; --rose: #ea9a97;
    --pine: #3e8fb0; --foam: #9ccfd8; --iris: #c4a7e7;
    --highlight: #2a283e; --fill-opacity: 0.2;
  }

  .dawn {
    --base: #faf4ed; --surface: #fffaf3; --overlay: #f2e9e1;
    --muted: #9893a5; --subtle: #797593; --text: #575279;
    --love: #b4637a; --gold: #ea9d34; --rose: #d7827e;
    --pine: #286983; --foam: #56949f; --iris: #907aa9;
    --highlight: #dfdad9; --fill-opacity: 0.25;
  }

  body {
    font-family: 'Berkeley Mono', 'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', monospace;
    background: var(--base); color: var(--text);
    min-height: 100vh; padding: 24px 20px;
    transition: background 0.4s ease, color 0.4s ease;
  }

  .top-bar {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; flex-wrap: wrap; gap: 10px;
  }
  .equation { font-size: 14px; color: var(--subtle); font-weight: 500; }
  .equation .wl { color: var(--love); }
  .equation .wg { color: var(--gold); }
  .equation .wi { color: var(--iris); }
  .top-right { display: flex; align-items: center; gap: 14px; }
  .loss-readout {
    font-size: 13px; font-variant-numeric: tabular-nums; font-weight: 600;
    transition: color 0.3s;
  }
  .theme-toggle {
    width: 34px; height: 18px; border-radius: 9px;
    border: 1px solid var(--overlay); background: var(--overlay);
    cursor: pointer; position: relative; padding: 0;
    transition: background 0.35s;
  }
  .dawn .theme-toggle { background: var(--highlight); }
  .theme-toggle .knob {
    width: 12px; height: 12px; border-radius: 6px;
    background: var(--foam); position: absolute; top: 2px; left: 18px;
    transition: left 0.3s ease, background 0.35s;
  }
  .dawn .theme-toggle .knob { background: var(--iris); left: 2px; }

  /* Hero landscape */
  .landscape-wrap {
    background: var(--surface); border: 1px solid var(--overlay);
    border-radius: 12px; padding: 16px 16px 12px; margin-bottom: 16px;
    transition: background 0.4s, border-color 0.4s;
  }
  .landscape-header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 10px;
  }
  .landscape-title {
    font-size: 11px; color: var(--muted); font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.2px;
  }
  .landscape-sum {
    font-size: 12px; color: var(--subtle); font-variant-numeric: tabular-nums;
  }
  .landscape-sum span { font-weight: 700; }
  #landscape-svg { width: 100%; height: auto; display: block; }

  /* Weight panels */
  .panels { display: flex; gap: 14px; flex-wrap: wrap; }
  .panel {
    flex: 1 1 280px; min-width: 250;
    background: var(--surface); border-radius: 10px;
    border: 1px solid var(--overlay);
    padding: 14px 14px 10px;
    transition: background 0.4s, border-color 0.4s;
  }
  .panel-header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 8px;
  }
  .panel-label { display: flex; align-items: center; gap: 6px; }
  .weight-name { font-size: 13px; font-weight: 700; }
  .dominant-tag {
    font-size: 8px; font-weight: 600; letter-spacing: 0.5px;
    text-transform: uppercase; color: var(--foam);
    background: color-mix(in srgb, var(--foam) 12%, transparent);
    padding: 1px 5px; border-radius: 3px;
  }
  .weight-value { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }

  input[type="range"] {
    width: 100%; height: 4px; appearance: none; -webkit-appearance: none;
    outline: none; border-radius: 2px; cursor: pointer; display: block;
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none; -webkit-appearance: none;
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--base); cursor: pointer; margin-top: -1px;
  }
  input[type="range"]::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--base); cursor: pointer;
  }

  .slider-meta {
    display: flex; justify-content: space-between;
    font-size: 9px; color: var(--muted); margin-top: 3px;
  }
  .chart-svg { width: 100%; height: auto; display: block; }
  .footer {
    text-align: center; margin-top: 16px; font-size: 10px;
    color: var(--muted); letter-spacing: 0.3px;
  }
  .footer .arrow-hint { color: var(--foam); }
</style>
</head>
<body>

<div class="top-bar">
  <span class="equation">
    L(<span class="wl">w</span>) = (<span class="wl">w₁</span>·x₁ + <span class="wg">w₂</span>·x₂ + <span class="wi">w₃</span>·x₃ − 1)²
  </span>
  <div class="top-right">
    <span class="loss-readout" id="loss-readout"></span>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
      <div class="knob"></div>
    </button>
  </div>
</div>

<!-- Hero loss landscape -->
<div class="landscape-wrap">
  <div class="landscape-header">
    <span class="landscape-title">Loss Landscape</span>
    <span class="landscape-sum" id="landscape-sum"></span>
  </div>
  <svg id="landscape-svg"></svg>
</div>

<div class="panels" id="panels"></div>

<div class="footer">
  drag any slider — coupled weights shift together · <span class="arrow-hint">⟶</span> gradient direction · descend the landscape
</div>

<script>
const X = [0.8, 0.5, 0.3];
const TARGET = 1.0;
const COUPLING = [0.12, 0.07, 0.04];
const W_LABELS = ["w₁", "w₂", "w₃"];
const COLOR_VARS = ["--love", "--gold", "--iris"];

let weights = [0.1, 0.1, 0.1];
let isDark = true;

function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

function loss(w) {
  const dot = w[0] * X[0] + w[1] * X[1] + w[2] * X[2];
  return (dot - TARGET) ** 2;
}

function gradient(w) {
  const dot = w[0] * X[0] + w[1] * X[1] + w[2] * X[2];
  return X.map(x => 2 * (dot - TARGET) * x);
}

function lossCurve(w, idx) {
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const v = -2 + (i / 200) * 5;
    const ww = [...w]; ww[idx] = v;
    pts.push({ x: v, y: loss(ww) });
  }
  return pts;
}

// Complex landscape function: the weighted sum (w·x) is the x-axis.
// Base quadratic + sinusoidal ridges to create local minima.
// Global minimum is at w·x = 1 (loss = 0), matching the real loss.
function landscape(t) {
  const base = (t - TARGET) * (t - TARGET);
  const ridges = 0.18 * Math.sin(4.5 * t + 0.5)
               + 0.09 * Math.sin(9.8 * t - 1.2)
               + 0.05 * Math.sin(17.0 * t + 2.0);
  // Ensure global min stays near t=1 and is ~0
  const raw = base + ridges;
  // Slight vertical shift so minimum ≈ 0
  return Math.max(raw, 0);
}

function landscapeGrad(t) {
  const h = 0.001;
  return (landscape(t + h) - landscape(t - h)) / (2 * h);
}

// Build weight panels
const panelsEl = document.getElementById("panels");
const svgEls = [];
const valueEls = [];
const sliderEls = [];
const gradEls = [];

for (let i = 0; i < 3; i++) {
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-label">
        <span class="weight-name" style="color: var(${COLOR_VARS[i]})">${W_LABELS[i]}</span>
        ${i === 0 ? '<span class="dominant-tag">dominant</span>' : ''}
      </div>
      <span class="weight-value" id="val-${i}" style="color: var(${COLOR_VARS[i]})"></span>
    </div>
    <div>
      <input type="range" id="slider-${i}" min="-2" max="3" step="0.005" value="${weights[i]}" />
      <div class="slider-meta">
        <span>−2</span>
        <span id="grad-${i}" style="color: color-mix(in srgb, var(${COLOR_VARS[i]}) 60%, transparent)"></span>
        <span>3</span>
      </div>
    </div>
    <svg id="chart-${i}" class="chart-svg"></svg>
  `;
  panelsEl.appendChild(panel);

  const slider = panel.querySelector(`#slider-${i}`);
  const idx = i;
  slider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    const delta = val - weights[idx];
    weights[idx] = val;
    for (let j = 0; j < 3; j++) {
      if (j !== idx) {
        weights[j] = Math.max(-2, Math.min(3, weights[j] + delta * COUPLING[j] * (idx === 0 ? 1.5 : 0.8)));
        sliderEls[j].value = weights[j];
      }
    }
    render();
  });

  svgEls.push(panel.querySelector(`#chart-${i}`));
  valueEls.push(panel.querySelector(`#val-${i}`));
  sliderEls.push(slider);
  gradEls.push(panel.querySelector(`#grad-${i}`));
}

// Theme
document.getElementById("theme-toggle").addEventListener("click", () => {
  isDark = !isDark;
  document.body.classList.toggle("dawn", !isDark);
  render();
  updateThumbColors();
});

function updateSliderTrack(slider, i) {
  const pct = ((weights[i] + 2) / 5) * 100;
  const c = css(COLOR_VARS[i]);
  const ov = css("--overlay");
  slider.style.background = `linear-gradient(90deg, ${c} ${pct}%, ${ov} ${pct}%)`;
}

// ── Render all ──
function render() {
  const L = loss(weights);
  const grad = gradient(weights);
  const wdot = weights[0] * X[0] + weights[1] * X[1] + weights[2] * X[2];

  // Loss readout
  const lossEl = document.getElementById("loss-readout");
  const lossColor = L < 0.01 ? css("--foam") : L < 0.15 ? css("--gold") : css("--love");
  lossEl.style.color = lossColor;
  lossEl.textContent = `loss  ${L.toFixed(4)}`;

  // Landscape sum label
  const sumEl = document.getElementById("landscape-sum");
  sumEl.innerHTML = `Σ w·x = <span style="color:${css("--text")}">${wdot.toFixed(3)}</span>  →  target = ${TARGET}`;

  drawLandscape(wdot, L);

  for (let idx = 0; idx < 3; idx++) {
    valueEls[idx].textContent = weights[idx].toFixed(3);
    gradEls[idx].textContent = `∂L/∂w = ${grad[idx].toFixed(3)}`;
    updateSliderTrack(sliderEls[idx], idx);
    drawChart(idx, L, grad[idx]);
  }
}

// ── Hero landscape chart ──
function drawLandscape(wdot, currentLoss) {
  const svg = d3.select("#landscape-svg");
  svg.selectAll("*").remove();

  const base = css("--base");
  const overlay = css("--overlay");
  const muted = css("--muted");
  const foam = css("--foam");
  const rose = css("--rose");
  const pine = css("--pine");
  const text = css("--text");

  const width = 800, height = 280;
  const m = { top: 16, right: 24, bottom: 34, left: 50 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const defs = svg.append("defs");

  // Generate landscape data over the weighted-sum range
  const xMin = -1.2, xMax = 3.2;
  const data = [];
  for (let i = 0; i <= 400; i++) {
    const t = xMin + (i / 400) * (xMax - xMin);
    data.push({ x: t, y: landscape(t) });
  }

  const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, iw]);
  const yMax = Math.min(d3.max(data, d => d.y) * 1.05, 8);
  const yScale = d3.scaleLinear().domain([0, yMax]).range([ih, 0]);

  // Grid
  yScale.ticks(5).forEach(tick => {
    g.append("line")
      .attr("x1", 0).attr("x2", iw)
      .attr("y1", yScale(tick)).attr("y2", yScale(tick))
      .attr("stroke", overlay).attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,5");
  });
  xScale.ticks(8).forEach(tick => {
    g.append("line")
      .attr("x1", xScale(tick)).attr("x2", xScale(tick))
      .attr("y1", 0).attr("y2", ih)
      .attr("stroke", overlay).attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,5");
  });

  // Axes
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(xScale).ticks(8).tickSize(0).tickPadding(8))
    .call(s => s.select(".domain").attr("stroke", overlay))
    .call(s => s.selectAll("text").attr("fill", muted)
      .style("font-size", "10px").style("font-family", "inherit"));

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(0).tickPadding(6))
    .call(s => s.select(".domain").attr("stroke", overlay))
    .call(s => s.selectAll("text").attr("fill", muted)
      .style("font-size", "10px").style("font-family", "inherit"));

  // Axis labels
  g.append("text").attr("x", iw / 2).attr("y", ih + 28)
    .attr("text-anchor", "middle").attr("fill", muted)
    .style("font-size", "10px").style("font-family", "inherit")
    .text("weighted sum  Σ wᵢxᵢ");

  g.append("text").attr("x", -ih / 2).attr("y", -36)
    .attr("text-anchor", "middle").attr("fill", muted)
    .attr("transform", "rotate(-90)")
    .style("font-size", "10px").style("font-family", "inherit")
    .text("loss");

  // Gradient fills — a rich layered fill
  const fillId = "landscape-fill";
  const lg = defs.append("linearGradient").attr("id", fillId)
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  lg.append("stop").attr("offset", "0%").attr("stop-color", foam).attr("stop-opacity", isDark ? 0.12 : 0.18);
  lg.append("stop").attr("offset", "40%").attr("stop-color", pine).attr("stop-opacity", isDark ? 0.06 : 0.10);
  lg.append("stop").attr("offset", "100%").attr("stop-color", pine).attr("stop-opacity", 0);

  const area = d3.area()
    .x(d => xScale(d.x)).y0(ih)
    .y1(d => yScale(Math.min(d.y, yMax)))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.append("path").datum(data).attr("d", area).attr("fill", `url(#${fillId})`);

  // Landscape line
  const line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(Math.min(d.y, yMax)))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.append("path").datum(data).attr("d", line)
    .attr("fill", "none").attr("stroke", foam)
    .attr("stroke-width", 2.5).attr("stroke-linecap", "round");

  // Target line at x = 1
  const tx = xScale(TARGET);
  g.append("line")
    .attr("x1", tx).attr("x2", tx)
    .attr("y1", 0).attr("y2", ih)
    .attr("stroke", pine).attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4").attr("opacity", 0.5);
  g.append("text")
    .attr("x", tx + 6).attr("y", 12)
    .attr("fill", pine).style("font-size", "9px").style("font-family", "inherit")
    .attr("opacity", 0.7).text("target");

  // Vertical drop line from point to x-axis
  const lVal = landscape(wdot);
  const cx = xScale(wdot);
  const cy = yScale(Math.min(lVal, yMax));

  g.append("line")
    .attr("x1", cx).attr("x2", cx)
    .attr("y1", cy).attr("y2", ih)
    .attr("stroke", rose).attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3").attr("opacity", 0.5);

  // Gradient direction arrow
  const gVal = landscapeGrad(wdot);
  const arrowLen = Math.min(Math.abs(gVal) * 22, 60);
  const dir = gVal > 0 ? -1 : 1;
  if (arrowLen > 4) {
    const arrowId = "landscape-arr";
    defs.append("marker").attr("id", arrowId)
      .attr("viewBox", "0 0 10 10").attr("refX", 8).attr("refY", 5)
      .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M 0 1 L 10 5 L 0 9 z").attr("fill", rose);

    g.append("line")
      .attr("x1", cx).attr("y1", cy)
      .attr("x2", cx + dir * arrowLen).attr("y2", cy)
      .attr("stroke", rose).attr("stroke-width", 1.8)
      .attr("stroke-dasharray", "5,3")
      .attr("marker-end", `url(#${arrowId})`);
  }

  // Glow + point
  const glow = defs.append("filter").attr("id", "land-glow");
  glow.append("feGaussianBlur").attr("stdDeviation", 8).attr("result", "b");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "b");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 16)
    .attr("fill", rose).attr("opacity", 0.18).attr("filter", "url(#land-glow)");
  g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 6)
    .attr("fill", rose).attr("stroke", base).attr("stroke-width", 2);

  // Loss label near point
  g.append("text")
    .attr("x", cx).attr("y", cy - 16)
    .attr("text-anchor", "middle").attr("fill", rose)
    .style("font-size", "10px").style("font-weight", "700")
    .style("font-family", "inherit").style("font-variant-numeric", "tabular-nums")
    .text(lVal.toFixed(3));
}

// ── Per-weight charts ──
function drawChart(idx, currentLoss, gVal) {
  const svg = d3.select(svgEls[idx]);
  svg.selectAll("*").remove();

  const wColor = css(COLOR_VARS[idx]);
  const base = css("--base");
  const overlay = css("--overlay");
  const muted = css("--muted");
  const foam = css("--foam");
  const fillOp = parseFloat(css("--fill-opacity")) || 0.2;

  const width = 360, height = 180;
  const m = { top: 14, right: 14, bottom: 28, left: 42 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const defs = svg.append("defs");

  const data = lossCurve(weights, idx);
  const xScale = d3.scaleLinear().domain([-2, 3]).range([0, iw]);
  const yMax = Math.min(Math.max(d3.max(data, d => d.y) * 1.05, 0.5), 14);
  const yScale = d3.scaleLinear().domain([0, yMax]).range([ih, 0]);

  yScale.ticks(4).forEach(tick => {
    g.append("line")
      .attr("x1", 0).attr("x2", iw)
      .attr("y1", yScale(tick)).attr("y2", yScale(tick))
      .attr("stroke", overlay).attr("stroke-width", 0.6)
      .attr("stroke-dasharray", "2,4");
  });

  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(xScale).ticks(5).tickSize(0).tickPadding(8))
    .call(s => s.select(".domain").attr("stroke", overlay))
    .call(s => s.selectAll("text").attr("fill", muted)
      .style("font-size", "9.5px").style("font-family", "inherit"));

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(4).tickSize(0).tickPadding(6))
    .call(s => s.select(".domain").attr("stroke", overlay))
    .call(s => s.selectAll("text").attr("fill", muted)
      .style("font-size", "9.5px").style("font-family", "inherit"));

  const gradId = `fill-${idx}`;
  const lg = defs.append("linearGradient").attr("id", gradId)
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  lg.append("stop").attr("offset", "0%").attr("stop-color", wColor).attr("stop-opacity", fillOp);
  lg.append("stop").attr("offset", "100%").attr("stop-color", wColor).attr("stop-opacity", 0);

  const area = d3.area()
    .x(d => xScale(d.x)).y0(ih)
    .y1(d => yScale(Math.min(d.y, yMax)))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.append("path").datum(data).attr("d", area).attr("fill", `url(#${gradId})`);

  const line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(Math.min(d.y, yMax)))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.append("path").datum(data).attr("d", line)
    .attr("fill", "none").attr("stroke", wColor)
    .attr("stroke-width", 2.2).attr("stroke-linecap", "round");

  const cx = xScale(weights[idx]);
  const cy = yScale(Math.min(currentLoss, yMax));

  const filt = defs.append("filter").attr("id", `glow-${idx}`);
  filt.append("feGaussianBlur").attr("stdDeviation", 6).attr("result", "b");
  const merge = filt.append("feMerge");
  merge.append("feMergeNode").attr("in", "b");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 12)
    .attr("fill", wColor).attr("opacity", 0.2).attr("filter", `url(#glow-${idx})`);
  g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 4.5)
    .attr("fill", wColor).attr("stroke", base).attr("stroke-width", 1.5);

  const arrowLen = Math.min(Math.abs(gVal) * 28, 55);
  const dir = gVal > 0 ? -1 : 1;
  if (arrowLen > 5) {
    const arrowId = `arr-${idx}`;
    defs.append("marker").attr("id", arrowId)
      .attr("viewBox", "0 0 10 10").attr("refX", 8).attr("refY", 5)
      .attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
      .append("path").attr("d", "M 0 1 L 10 5 L 0 9 z").attr("fill", foam);

    g.append("line")
      .attr("x1", cx).attr("y1", cy)
      .attr("x2", cx + dir * arrowLen).attr("y2", cy)
      .attr("stroke", foam).attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,2")
      .attr("marker-end", `url(#${arrowId})`);
  }

  g.append("text").attr("x", iw / 2).attr("y", ih + 22)
    .attr("text-anchor", "middle").attr("fill", muted)
    .style("font-size", "10px").style("font-family", "inherit")
    .text(`${W_LABELS[idx]} value`);
}

// Thumb color injection
const thumbSheet = document.createElement("style");
document.head.appendChild(thumbSheet);
function updateThumbColors() {
  const rules = [];
  for (let i = 0; i < 3; i++) {
    const c = css(COLOR_VARS[i]);
    rules.push(`#slider-${i}::-webkit-slider-thumb { background: ${c}; }`);
    rules.push(`#slider-${i}::-moz-range-thumb { background: ${c}; }`);
  }
  thumbSheet.textContent = rules.join("\n");
}

render();
updateThumbColors();

const observer = new MutationObserver(() => { updateThumbColors(); });
observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
</script>
</body>
</html>
