const modelUrl = new URL("./shock-model.js", import.meta.url);
modelUrl.search = new URL(import.meta.url).search;
const { lambdaWeight, point, integrals, diagnostics } = await import(
  modelUrl.href
);

const C = {
  ink: "#203c33",
  muted: "#647870",
  blue: "#0072B2",
  raw: "#AF491E",
  weighted: "#177563",
  lambda: "#7850AD",
  grid: "rgba(32,60,51,0.10)",
};
const TEXT = {
  en: {
    profileTitle: "Move the shock",
    lambdaTitle: "Explore the gradient weight",
    profileHint:
      "Change the width, speed or time. The shaded interval marks the position error.",
    lambdaHint:
      "Change the weight and follow its effect across the four panels. Time is fixed at 0.6.",
    width: "Front width",
    speed: "Front speed",
    time: "Time",
    alpha: "Weight strength",
    beta: "Exponent",
    correct: "Correct speed",
    wrong: "Wrong speed",
    unweighted: "No weighting",
    reset: "Reset",
    exactPosition: "Exact position",
    frontPosition: "Front position",
    positionError: "Position error",
    minimumWeight: "Minimum weight",
    retained: "Residual retained",
    defect: "Conservation defect",
    peakGradient: "Peak gradient",
    profile: "Exact and smooth profiles",
    lambda: "Weight versus gradient",
    spatial: "Weight across the front",
    residual: "Residual before and after weighting",
    widths: "What happens as the front narrows",
    exact: "Exact shock",
    broad: "Broad profile · δ = 0.12",
    selected: "Selected profile",
    reference: "Reference · α = 1, β = 2",
    peak: "Peak front gradient",
    weight: "Selected weight",
    raw: "Unweighted",
    weighted: "Weighted",
    position: "Position x",
    field: "Field u",
    gradient: "Gradient g",
    lambdaAxis: "Weight λ",
    residualAxis: "Squared residual",
    widthAxis: "Width δ",
    integral: "Spatial integral",
    profileCaption:
      "Explore shock width and motion. The exact shock travels at speed 0.5.",
    lambdaCaption:
      "The same λ weights each squared residual. Dotted integral curves use the correct speed 0.5.",
  },
  es: {
    profileTitle: "Mover el choque",
    lambdaTitle: "Explorar el peso del gradiente",
    profileHint:
      "Cambiar la anchura, la velocidad o el tiempo. La franja sombreada indica el error de posición.",
    lambdaHint:
      "Cambiar el peso y seguir su efecto en los cuatro paneles. El tiempo se fija en 0.6.",
    width: "Anchura del frente",
    speed: "Velocidad del frente",
    time: "Tiempo",
    alpha: "Intensidad del peso",
    beta: "Exponente",
    correct: "Velocidad correcta",
    wrong: "Velocidad incorrecta",
    unweighted: "Sin ponderación",
    reset: "Restablecer",
    exactPosition: "Posición exacta",
    frontPosition: "Posición del frente",
    positionError: "Error de posición",
    minimumWeight: "Peso mínimo",
    retained: "Residuo retenido",
    defect: "Defecto de conservación",
    peakGradient: "Gradiente máximo",
    profile: "Perfiles exacto y suave",
    lambda: "Peso frente al gradiente",
    spatial: "Peso a través del frente",
    residual: "Residuo antes y después de ponderar",
    widths: "Qué ocurre al estrechar el frente",
    exact: "Choque exacto",
    broad: "Perfil ancho · δ = 0.12",
    selected: "Perfil seleccionado",
    reference: "Referencia · α = 1, β = 2",
    peak: "Gradiente máximo del frente",
    weight: "Peso seleccionado",
    raw: "Sin ponderar",
    weighted: "Ponderado",
    position: "Posición x",
    field: "Campo u",
    gradient: "Gradiente g",
    lambdaAxis: "Peso λ",
    residualAxis: "Residuo al cuadrado",
    widthAxis: "Anchura δ",
    integral: "Integral espacial",
    profileCaption:
      "Explorar la anchura y el movimiento. El choque exacto avanza a velocidad 0.5.",
    lambdaCaption:
      "La misma λ pondera cada residuo al cuadrado. Las curvas punteadas de las integrales usan la velocidad correcta 0.5.",
  },
};
const L = TEXT[document.documentElement.lang] || TEXT.en;
const linspace = (lo, hi, n) =>
  Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
const widths = linspace(Math.log(0.01), Math.log(0.16), 41).map(Math.exp);
const gradients = linspace(-2, 2, 241).map((x) => 10 ** x);
const CONFIG = {
  responsive: true,
  displaylogo: false,
  displayModeBar: false,
  scrollZoom: false,
};
const number = (v) =>
  v === 0 ? "0" : Math.abs(v) < 0.001 ? v.toExponential(2) : v.toFixed(3);
const percentage = (v) =>
  v > 0.99995
    ? "100%"
    : v < 0.0001
      ? `${(100 * v).toExponential(1)}%`
      : `${(100 * v).toFixed(2)}%`;
const symbol = (s) =>
  `<math xmlns="http://www.w3.org/1998/Math/MathML" class="shock-symbol"><mi>${s}</mi></math>`;

function node(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}
function line(x, y, name, color, dash = "solid", width = 2.5) {
  return {
    type: "scatter",
    mode: "lines",
    x,
    y,
    name,
    showlegend: false,
    line: { color, dash, width },
    hovertemplate: "%{y:.4g}<extra>%{fullData.name}</extra>",
    connectgaps: false,
  };
}
function axis(title, options = {}) {
  return {
    title: { text: title, standoff: 10, font: { size: 14 } },
    automargin: true,
    fixedrange: true,
    zeroline: false,
    showline: true,
    linecolor: "#819189",
    ticks: "outside",
    ticklen: 4,
    gridcolor: C.grid,
    nticks: 4,
    exponentformat: "power",
    showexponent: "all",
    tickfont: { size: 12 },
    ...options,
  };
}
function layout(xTitle, yTitle, xOptions = {}, yOptions = {}) {
  return {
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      family: "Source Sans 3, Arial, sans-serif",
      size: 14,
      color: C.ink,
    },
    margin: { l: 78, r: 16, t: 10, b: 49 },
    xaxis: axis(xTitle, xOptions),
    yaxis: axis(yTitle, yOptions),
    hovermode: "x unified",
    hoverlabel: {
      font: { family: "Source Sans 3, Arial, sans-serif", size: 13 },
    },
    showlegend: false,
  };
}
function legend(el, items) {
  el.replaceChildren(
    ...items.map(([label, color, dash]) => {
      const entry = node("span", "shock-key");
      const swatch = node("span", "shock-swatch");
      swatch.style.borderColor = color;
      swatch.style.borderTopStyle =
        dash === "dot" ? "dotted" : dash === "dash" ? "dashed" : "solid";
      if (dash === "marker") {
        swatch.classList.add("shock-swatch-marker");
        swatch.style.backgroundColor = color;
      }
      swatch.setAttribute("aria-hidden", "true");
      entry.append(swatch, node("span", "", label));
      return entry;
    }),
  );
}

let loading;
function loadPlotly() {
  if (window.Plotly) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const url = new URL("./plotly-basic.min.js", import.meta.url);
    url.search = new URL(import.meta.url).search;
    script.src = url.href;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  return loading;
}

async function enhance(figure, index) {
  const isProfile = figure.dataset.plot === "shock-profile";
  const initial = {
    time: 0.6,
    width: 0.03,
    speed: isProfile ? 0.5 : 0.7,
    alpha: 1,
    beta: 2,
  };
  const state = { ...initial };
  const picture = figure.querySelector("picture");
  const caption = figure.querySelector("figcaption");
  const originalCaption = caption.textContent;
  const ui = node("div", "shock-ui");
  const header = node("div", "shock-heading");
  const title = node(
    "h3",
    "shock-title",
    isProfile ? L.profileTitle : L.lambdaTitle,
  );
  const reset = node("button", "shock-button", L.reset);
  reset.type = "button";
  reset.dataset.preset = "reset";
  header.append(title, reset);
  const hint = node(
    "p",
    "shock-hint",
    isProfile ? L.profileHint : L.lambdaHint,
  );
  const controls = node("div", "shock-controls");
  const inputs = new Map();
  const definitions = isProfile
    ? [
        ["width", "δ", 0.01, 0.16, 0.005, 3],
        ["speed", "v", 0.3, 0.8, 0.01, 2],
        ["time", "t", 0, 1, 0.01, 2],
      ]
    : [
        ["alpha", "α", 0, 10, 0.05, 2],
        ["beta", "β", 1, 4, 0.1, 1],
        ["width", "δ", 0.01, 0.16, 0.005, 3],
        ["speed", "v", 0.3, 0.8, 0.01, 2],
      ];
  for (const [key, math, min, max, step, digits] of definitions) {
    const row = node("div", "shock-control");
    const id = `shock-${index}-${key}`;
    const label = node("label");
    label.htmlFor = id;
    label.innerHTML = `${L[key]} ${symbol(math)}`;
    const output = node("output");
    output.htmlFor = id;
    const input = node("input");
    Object.assign(input, {
      type: "range",
      id,
      min,
      max,
      step,
      value: state[key],
    });
    input.dataset.param = key;
    row.append(label, output, input);
    controls.append(row);
    inputs.set(key, { input, output, digits });
  }
  const presets = node("div", "shock-presets");
  for (const key of isProfile
    ? ["correct", "wrong"]
    : ["correct", "unweighted"]) {
    const button = node("button", "shock-button", L[key]);
    button.type = "button";
    button.dataset.preset = key;
    presets.append(button);
  }
  const metrics = node("dl", "shock-metrics");
  const metricKeys = isProfile
    ? ["exactPosition", "frontPosition", "positionError"]
    : ["minimumWeight", "retained", "defect", "peakGradient"];
  const outputs = new Map();
  for (const key of metricKeys) {
    const item = node("div");
    const value = node("dd");
    value.dataset.metric = key;
    item.append(node("dt", "", L[key]), value);
    metrics.append(item);
    outputs.set(key, value);
  }
  const charts = node(
    "div",
    `shock-panels${isProfile ? " shock-panels-single" : ""}`,
  );
  const panels = new Map();
  for (const key of isProfile
    ? ["profile"]
    : ["lambda", "spatial", "residual", "widths"]) {
    const panel = node("section", "shock-panel");
    panel.dataset.panel = key;
    const heading = node("h4", "shock-panel-title", L[key]);
    const keys = node("div", "shock-legend");
    const holder = node("div", "shock-chart");
    holder.setAttribute("role", "img");
    holder.setAttribute("aria-label", L[key]);
    panel.append(heading, keys, holder);
    charts.append(panel);
    panels.set(key, { holder, keys });
  }
  const readout = node("p", "sr-only");
  readout.setAttribute("aria-live", "polite");
  ui.append(header, hint, controls, presets, metrics, charts, readout);
  picture.after(ui);
  figure.classList.add("shock-explorer");
  let dead = false,
    busy = false,
    pending = false,
    frame = 0,
    observer;

  function restore() {
    dead = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    picture.hidden = false;
    figure.classList.remove("is-interactive");
    caption.textContent = originalCaption;
    for (const { holder } of panels.values()) window.Plotly.purge(holder);
    ui.remove();
  }
  function sync() {
    for (const [key, { input, output, digits }] of inputs) {
      input.value = String(state[key]);
      output.value = state[key].toFixed(digits);
    }
    for (const button of presets.children)
      button.setAttribute(
        "aria-pressed",
        String(
          button.dataset.preset === "correct"
            ? state.speed === 0.5
            : button.dataset.preset === "wrong"
              ? state.speed === 0.7
              : state.alpha === 0,
        ),
      );
    const d = diagnostics(
      state.time,
      state.width,
      state.speed,
      state.alpha,
      state.beta,
    );
    for (const [key, out] of outputs)
      out.textContent =
        key === "retained"
          ? percentage(d.retained)
          : key === "minimumWeight"
            ? number(d.minimumWeight)
            : (key === "defect" ? d.conservationDefect : d[key]).toFixed(3);
    return d;
  }
  function announce() {
    readout.textContent = [...outputs]
      .map(([key, out]) => `${L[key]}: ${out.textContent}`)
      .join(". ");
  }
  function draw(key, traces, options, keys) {
    const panel = panels.get(key);
    legend(panel.keys, keys);
    return window.Plotly.react(panel.holder, traces, options, CONFIG);
  }
  async function render() {
    const { time, width, speed, alpha, beta } = state;
    const d = sync();
    if (isProfile) {
      const xs = linspace(-0.2, 1, 601);
      const options = layout(
        L.position,
        L.field,
        { range: [-0.2, 1], tickformat: ".1f" },
        { range: [-0.04, 1.05], dtick: 0.25 },
      );
      options.shapes = [
        {
          type: "rect",
          xref: "x",
          yref: "paper",
          x0: Math.min(d.exactPosition, d.frontPosition),
          x1: Math.max(d.exactPosition, d.frontPosition),
          y0: 0,
          y1: 1,
          fillcolor: "rgba(175,73,30,0.10)",
          line: { width: 0 },
          layer: "below",
        },
      ];
      const traces = [
        line(
          [-0.2, d.exactPosition, d.exactPosition, 1],
          [1, 1, 0, 0],
          L.exact,
          C.ink,
          "dash",
          2,
        ),
        line(
          xs,
          xs.map((x) => point(x, time, 0.12, speed).u),
          L.broad,
          C.muted,
          "dot",
          1.8,
        ),
        line(
          xs,
          xs.map((x) => point(x, time, width, speed).u),
          L.selected,
          C.blue,
          "solid",
          3,
        ),
        {
          type: "scatter",
          mode: "markers",
          x: [d.frontPosition],
          y: [0.5],
          showlegend: false,
          marker: { color: C.blue, size: 8 },
          hovertemplate: `x = %{x:.3f}<extra>${L.frontPosition}</extra>`,
        },
      ];
      await draw("profile", traces, options, [
        [L.exact, C.ink, "dash"],
        [L.broad, C.muted, "dot"],
        [L.selected, C.blue, "solid"],
      ]);
      return;
    }
    const xs = linspace(
      speed * time - 6 * width,
      speed * time + 6 * width,
      501,
    );
    const field = xs.map((x) => point(x, time, width, speed));
    const weight = field.map((p) => lambdaWeight(p.dx, alpha, beta));
    const squared = field.map((p) => p.r * p.r);
    const selected = widths.map((w) => integrals(w, speed, alpha, beta));
    const correct = widths.map((w) => integrals(w, 0.5, alpha, beta));
    const spatialOptions = layout(
      L.position,
      L.lambdaAxis,
      { tickformat: ".2f" },
      { range: [-0.02, 1.04], dtick: 0.25 },
    );
    const lambdaOptions = layout(
      L.gradient,
      L.lambdaAxis,
      { type: "log", range: [-2, 2], tickvals: [0.01, 0.1, 1, 10, 100] },
      { type: "log", range: [-9.3, 0.08], dtick: 2 },
    );
    const integralTraces = [
      line(
        widths,
        selected.map((v) => v[0]),
        `${L.raw} · v = ${speed.toFixed(2)}`,
        C.raw,
      ),
      line(
        widths,
        selected.map((v) => v[1]),
        `${L.weighted} · v = ${speed.toFixed(2)}`,
        C.weighted,
      ),
      line(
        widths,
        correct.map((v) => v[0]),
        `${L.raw} · v = 0.50`,
        C.raw,
        "dot",
        1.7,
      ),
      line(
        widths,
        correct.map((v) => v[1]),
        `${L.weighted} · v = 0.50`,
        C.weighted,
        "dot",
        1.7,
      ),
    ];
    const integralOptions = layout(
      L.widthAxis,
      L.integral,
      {
        type: "log",
        range: [Math.log10(0.01), Math.log10(0.16)],
        tickvals: [0.01, 0.02, 0.04, 0.08, 0.16],
        ticktext: ["0.01", "0.02", "0.04", "0.08", "0.16"],
      },
      { type: "log" },
    );
    integralOptions.shapes = [
      {
        type: "line",
        xref: "x",
        yref: "paper",
        x0: width,
        x1: width,
        y0: 0,
        y1: 1,
        line: { color: C.muted, width: 1, dash: "dash" },
      },
    ];
    await Promise.all([
      draw(
        "lambda",
        [
          line(
            gradients,
            gradients.map((g) => lambdaWeight(g, alpha, beta)),
            L.weight,
            C.lambda,
          ),
          line(
            gradients,
            gradients.map((g) => lambdaWeight(g, 1, 2)),
            L.reference,
            C.muted,
            "dot",
            1.5,
          ),
          {
            type: "scatter",
            mode: "markers",
            x: [d.peakGradient],
            y: [d.minimumWeight],
            showlegend: false,
            marker: { color: C.blue, size: 8 },
            hovertemplate: `g = %{x:.3f}<br>λ = %{y:.4g}<extra>${L.peak}</extra>`,
          },
        ],
        lambdaOptions,
        [
          [L.weight, C.lambda],
          [L.reference, C.muted, "dot"],
          [L.peak, C.blue, "marker"],
        ],
      ),
      draw(
        "spatial",
        [line(xs, weight, L.lambdaAxis, C.lambda)],
        spatialOptions,
        [[L.lambdaAxis, C.lambda]],
      ),
      draw(
        "residual",
        [
          line(
            xs,
            squared.map((v) => (v > 0 ? v : null)),
            L.raw,
            C.raw,
          ),
          line(
            xs,
            squared.map((v, i) => (v > 0 ? v * weight[i] : null)),
            L.weighted,
            C.weighted,
          ),
        ],
        layout(
          L.position,
          L.residualAxis,
          { tickformat: ".2f" },
          { type: "log" },
        ),
        [
          [L.raw, C.raw],
          [L.weighted, C.weighted],
        ],
      ),
      draw("widths", integralTraces, integralOptions, [
        [`r² · v = ${speed.toFixed(2)}`, C.raw],
        [`λr² · v = ${speed.toFixed(2)}`, C.weighted],
        ["r² · v = 0.50", C.raw, "dot"],
        ["λr² · v = 0.50", C.weighted, "dot"],
      ]),
    ]);
  }
  async function update() {
    if (dead) return;
    pending = true;
    if (busy) return;
    busy = true;
    try {
      while (pending && !dead) {
        pending = false;
        await render();
      }
    } catch {
      restore();
    } finally {
      busy = false;
    }
  }
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }
  for (const [key, { input }] of inputs) {
    input.addEventListener("input", () => {
      state[key] = Number(input.value);
      sync();
      schedule();
    });
    input.addEventListener("change", announce);
  }
  ui.addEventListener("click", (event) => {
    const key = event.target.closest("button")?.dataset.preset;
    if (!key) return;
    if (key === "reset") Object.assign(state, initial);
    else if (key === "correct") state.speed = 0.5;
    else if (key === "wrong") state.speed = 0.7;
    else if (key === "unweighted") state.alpha = 0;
    sync();
    schedule();
    announce();
  });
  await update();
  if (dead) return;
  picture.querySelector("img").loading = "eager";
  picture.hidden = true;
  figure.classList.add("is-interactive");
  caption.textContent = isProfile ? L.profileCaption : L.lambdaCaption;
  let lastWidth = 0;
  observer = new ResizeObserver(() => {
    if (dead || Math.abs(ui.clientWidth - lastWidth) < 1) return;
    lastWidth = ui.clientWidth;
    Promise.all(
      [...panels.values()].map(({ holder }) =>
        window.Plotly.Plots.resize(holder),
      ),
    ).catch(restore);
  });
  observer.observe(ui);
}

const figures = [...document.querySelectorAll('figure[data-plot^="shock-"]')];
const start = (figure) =>
  loadPlotly()
    .then(() => enhance(figure, figures.indexOf(figure)))
    .catch(() => {});
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          start(entry.target);
        }
    },
    { rootMargin: "500px" },
  );
  figures.forEach((f) => observer.observe(f));
} else figures.forEach(start);
