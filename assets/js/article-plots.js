// Progressive enhancement for article figures marked with data-plot.
// The static SVG stays in place until Plotly loads; without JavaScript it is the figure.
(() => {
  "use strict";
  const figures = [...document.querySelectorAll("figure[data-plot]")];
  const script = document.currentScript;
  if (!figures.length || !script) return;
  const plotlySrc = new URL("plotly-basic.min.js", script.src).href;

  const INK = "#203c33";
  const MUTED = "#415950";
  const BLUE = "#0072B2";
  const ORANGE = "#A65313";
  const FONT = {
    family: '"Source Sans 3", Arial, sans-serif',
    size: 15,
    color: INK,
  };
  const CONFIG = {
    responsive: true,
    displaylogo: false,
    displayModeBar: false,
    scrollZoom: false,
  };
  const xs = Array.from({ length: 201 }, (_, i) => i / 200);
  const exact = (t, alpha) =>
    xs.map((x) => Math.exp(-alpha * Math.PI ** 2 * t) * Math.sin(Math.PI * x));

  function axis(title, range) {
    return {
      title: { text: title, standoff: 10 },
      range,
      zeroline: false,
      showline: true,
      linecolor: MUTED,
      ticks: "outside",
      tickcolor: MUTED,
      gridcolor: "rgba(21, 63, 54, 0.12)",
    };
  }

  function layout(xTitle, yTitle, yRange) {
    return {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: FONT,
      margin: { l: 64, r: 16, t: 56, b: 56 },
      xaxis: axis(xTitle, [0, 1]),
      yaxis: axis(yTitle, yRange),
      legend: {
        orientation: "h",
        x: 0,
        xanchor: "left",
        y: 1.02,
        yanchor: "bottom",
        bgcolor: "rgba(0,0,0,0)",
      },
      hovermode: "x unified",
      hoverlabel: { font: { family: FONT.family, size: 14 } },
    };
  }

  function slider(controls, name, label, min, max, step, value) {
    const id = `${controls.id}-${name}`;
    const row = document.createElement("div");
    row.className = "plot-control";
    row.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}"></output>`;
    controls.append(row);
    const input = row.querySelector("input");
    const output = row.querySelector("output");
    const sync = () => (output.value = Number(input.value).toFixed(2));
    input.addEventListener("input", sync);
    sync();
    return input;
  }

  const charts = {
    diffusion(holder, controls, readout) {
      const time = slider(controls, "t", "Time <i>t</i>", 0, 1, 0.01, 0.5);
      const alpha = slider(
        controls,
        "alpha",
        "Diffusivity <i>α</i>",
        0.02,
        0.3,
        0.01,
        0.1,
      );
      const traces = () => {
        const t = Number(time.value);
        const a = Number(alpha.value);
        return [
          {
            x: xs,
            y: exact(0, a),
            name: "Initial profile, t = 0",
            line: { color: MUTED, width: 2, dash: "dot" },
            hovertemplate: "%{y:.3f}<extra>t = 0</extra>",
          },
          {
            x: xs,
            y: exact(t, a),
            name: "Exact solution u(x, t)",
            line: { color: BLUE, width: 3 },
            hovertemplate: `%{y:.3f}<extra>t = ${t.toFixed(2)}</extra>`,
          },
        ];
      };
      const base = layout("Position x", "Temperature u(x, t)", [0, 1.05]);
      const update = () => {
        const peak = Math.exp(
          -Number(alpha.value) * Math.PI ** 2 * Number(time.value),
        );
        readout.textContent = `Peak temperature at x = 0.5: ${peak.toFixed(3)} (decay factor exp(−απ²t)).`;
        return Plotly.react(holder, traces(), base, CONFIG);
      };
      time.addEventListener("input", update);
      alpha.addEventListener("input", update);
      return update();
    },
    counterexample(holder, controls, readout) {
      const zero = xs.map(() => 0);
      const initial = exact(0, 0.1);
      readout.textContent =
        "Shaded area: initial-condition error. For the zero field, the mean squared mismatch is 0.5, while its equation residual is exactly zero.";
      controls.remove();
      return Plotly.newPlot(
        holder,
        [
          {
            x: xs,
            y: zero,
            name: "Zero-field candidate",
            line: { color: ORANGE, width: 3, dash: "dash" },
            hovertemplate: "%{y:.3f}<extra>zero field</extra>",
          },
          {
            x: xs,
            y: initial,
            name: "Required initial profile",
            line: { color: INK, width: 3 },
            fill: "tonexty",
            fillcolor: "rgba(166, 83, 19, 0.14)",
            hovertemplate: "%{y:.3f}<extra>sin(πx)</extra>",
          },
        ],
        layout("Position x", "Temperature at t = 0", [-0.08, 1.05]),
        CONFIG,
      );
    },
  };

  function enhance(figure, index) {
    const make = charts[figure.dataset.plot];
    const img = figure.querySelector("img");
    if (!make || !img) return;
    const holder = document.createElement("div");
    holder.className = "plot-holder";
    holder.setAttribute("role", "img");
    holder.setAttribute("aria-label", img.alt);
    const controls = document.createElement("div");
    controls.className = "plot-controls";
    controls.id = `plot-${index}`;
    const readout = document.createElement("p");
    readout.className = "plot-readout";
    readout.setAttribute("aria-live", "polite");
    figure.querySelector("picture").after(holder, controls, readout);
    figure.classList.add("is-interactive");
    const caption = figure.querySelector("figcaption");
    if (caption && figure.dataset.interactiveCaption)
      caption.textContent = figure.dataset.interactiveCaption;
    Promise.resolve(make(holder, controls, readout)).catch(() => {
      figure.classList.remove("is-interactive");
      holder.remove();
      controls.remove();
      readout.remove();
    });
  }

  let loading;
  function load() {
    loading ??= new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = plotlySrc;
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.append(tag);
    });
    return loading;
  }

  const start = (figure) =>
    load()
      .then(() => enhance(figure, figures.indexOf(figure)))
      .catch(() => {});
  if (!("IntersectionObserver" in window)) {
    figures.forEach(start);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        start(entry.target);
      }
    },
    { rootMargin: "600px 0px" },
  );
  figures.forEach((figure) => observer.observe(figure));
})();
