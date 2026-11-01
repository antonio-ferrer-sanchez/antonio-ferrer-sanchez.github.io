// Progressive enhancement for article figures marked with data-plot.
// The static SVG stays in place until Plotly loads; without JavaScript it is the figure.
(() => {
  "use strict";
  const figures = [...document.querySelectorAll("figure[data-plot]")];
  const script = document.currentScript;
  if (!figures.length || !script) return;
  const plotlySrc = new URL(
    `plotly-basic.min.js${new URL(script.src).search}`,
    script.src,
  ).href;

  const TEXT = {
    en: {
      time: "Time <i>t</i>",
      alpha: "Diffusivity <i>α</i>",
      initial: "Initial profile, t = 0",
      exact: "Exact solution u(x, t)",
      position: "Position x",
      temperature: "Temperature u(x, t)",
      peak: (v) =>
        `Peak temperature at x = 0.5: ${v} (decay factor exp(−απ²t)).`,
      shaded:
        "Shaded area: initial-condition error. For the zero field, the mean squared mismatch is 0.5, while its equation residual is exactly zero.",
      zero: "Zero-field candidate",
      zeroHover: "zero field",
      required: "Required initial profile",
      temperature0: "Temperature at t = 0",
      contrast: "Contrast",
      phase: "Phase offset (rad)",
      idealSensor: "Ideal (contrast 1)",
      selectedSensor: "Selected contrast",
      ramseyLabel: "Interactive Ramsey response: ideal and selected contrast",
      ramseyValues: (ideal, selected, slope) =>
        `At the selected phase: ideal probability ${ideal}; selected probability ${selected}; selected slope ${slope} per radian.`,
    },
    es: {
      time: "Tiempo <i>t</i>",
      alpha: "Difusividad <i>α</i>",
      initial: "Perfil inicial, t = 0",
      exact: "Solución exacta u(x, t)",
      position: "Posición x",
      temperature: "Temperatura u(x, t)",
      peak: (v) =>
        `Temperatura máxima en x = 0.5: ${v} (factor de decaimiento exp(−απ²t)).`,
      shaded:
        "Área sombreada: error en la condición inicial. Para el campo nulo, el desajuste cuadrático medio es 0.5, mientras que su residuo de la ecuación es exactamente cero.",
      zero: "Candidato de campo nulo",
      zeroHover: "campo nulo",
      required: "Perfil inicial requerido",
      temperature0: "Temperatura en t = 0",
      contrast: "Contraste",
      phase: "Desfase (rad)",
      idealSensor: "Ideal (contraste 1)",
      selectedSensor: "Contraste elegido",
      ramseyLabel: "Respuesta de Ramsey interactiva: contraste ideal y elegido",
      ramseyValues: (ideal, selected, slope) =>
        `En el desfase elegido: probabilidad ideal ${ideal}; probabilidad elegida ${selected}; pendiente elegida ${slope} por radián.`,
    },
  };
  const L = TEXT[document.documentElement.lang] || TEXT.en;
  const INK = "#1a1a1a";
  const MUTED = "#4d4d4d";
  const BLUE = "#0072B2";
  const ORANGE = "#D55E00";
  const FONT = {
    family: "Arial, Helvetica, sans-serif",
    size: 13,
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
      title: { text: title, standoff: 10, font: { size: 14 } },
      range,
      zeroline: false,
      showline: true,
      mirror: false,
      linecolor: INK,
      linewidth: 1,
      ticks: "outside",
      ticklen: 4,
      tickcolor: INK,
      tickfont: { size: 12 },
      showgrid: false,
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
        borderwidth: 0,
      },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: "#ffffff",
        bordercolor: INK,
        font: { family: FONT.family, size: 13, color: INK },
      },
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
    ramsey(holder, controls, readout) {
      const contrast = slider(
        controls,
        "contrast",
        L.contrast,
        0,
        1,
        0.01,
        0.6,
      );
      const phase = slider(controls, "phase", L.phase, -1.2, 1.2, 0.01, 0);
      const phases = Array.from(
        { length: 601 },
        (_, i) => -1.2 + (2.4 * i) / 600,
      );
      const probability = (offset, visibility) =>
        (1 + visibility * Math.sin(offset)) / 2;
      const base = layout("δ (rad)", "p<sub>+</sub>", [-0.03, 1.03]);
      base.xaxis.range = [-1.2, 1.2];
      base.xaxis.tickvals = [-1.2, -0.6, 0, 0.6, 1.2];
      base.yaxis.tickvals = [0, 0.25, 0.5, 0.75, 1];
      base.margin = { l: 48, r: 16, t: 86, b: 50 };
      base.legend.orientation = "v";
      base.legend.itemclick = false;
      base.legend.itemdoubleclick = false;
      base.font = { ...FONT, size: 13 };
      base.dragmode = false;
      base.xaxis.fixedrange = true;
      base.yaxis.fixedrange = true;
      holder.setAttribute("aria-label", L.ramseyLabel);
      const update = () => {
        const visibility = Number(contrast.value);
        const offset = Number(phase.value);
        readout.textContent = L.ramseyValues(
          probability(offset, 1).toFixed(3),
          probability(offset, visibility).toFixed(3),
          ((visibility * Math.cos(offset)) / 2).toFixed(3),
        );
        const traces = [1, visibility].map((v, index) => ({
          x: phases,
          y: phases.map((delta) => probability(delta, v)),
          name: index === 0 ? L.idealSensor : L.selectedSensor,
          mode: "lines",
          line: {
            color: index === 0 ? BLUE : ORANGE,
            width: 3,
            dash: index === 0 ? "solid" : "dash",
          },
          hovertemplate: "%{y:.3f}<extra>%{fullData.name}</extra>",
        }));
        const markers = [1, visibility].map((v, index) => ({
          x: [offset],
          y: [probability(offset, v)],
          mode: "markers",
          marker: {
            color: index === 0 ? BLUE : ORANGE,
            size: index === 0 ? 9 : 14,
            symbol: index === 0 ? "circle" : "circle-open",
            line: { width: 2 },
          },
          showlegend: false,
          hoverinfo: "skip",
        }));
        return Plotly.react(holder, [...traces, ...markers], base, CONFIG);
      };
      contrast.addEventListener("input", update);
      phase.addEventListener("input", update);
      return update();
    },
    diffusion(holder, controls, readout) {
      const time = slider(controls, "t", L.time, 0, 1, 0.01, 0.5);
      const alpha = slider(controls, "alpha", L.alpha, 0.02, 0.3, 0.01, 0.1);
      const traces = () => {
        const t = Number(time.value);
        const a = Number(alpha.value);
        return [
          {
            x: xs,
            y: exact(0, a),
            name: L.initial,
            line: { color: MUTED, width: 2, dash: "dot" },
            hovertemplate: "%{y:.3f}<extra>t = 0</extra>",
          },
          {
            x: xs,
            y: exact(t, a),
            name: L.exact,
            line: { color: BLUE, width: 3 },
            hovertemplate: `%{y:.3f}<extra>t = ${t.toFixed(2)}</extra>`,
          },
        ];
      };
      const base = layout(L.position, L.temperature, [0, 1.05]);
      const update = () => {
        const peak = Math.exp(
          -Number(alpha.value) * Math.PI ** 2 * Number(time.value),
        );
        readout.textContent = L.peak(peak.toFixed(3));
        return Plotly.react(holder, traces(), base, CONFIG);
      };
      time.addEventListener("input", update);
      alpha.addEventListener("input", update);
      return update();
    },
    counterexample(holder, controls, readout) {
      const zero = xs.map(() => 0);
      const initial = exact(0, 0.1);
      readout.textContent = L.shaded;
      controls.remove();
      return Plotly.newPlot(
        holder,
        [
          {
            x: xs,
            y: zero,
            name: L.zero,
            line: { color: ORANGE, width: 3, dash: "dash" },
            hovertemplate: `%{y:.3f}<extra>${L.zeroHover}</extra>`,
          },
          {
            x: xs,
            y: initial,
            name: L.required,
            line: { color: INK, width: 3 },
            fill: "tonexty",
            fillcolor: "rgba(213, 94, 0, 0.14)",
            hovertemplate: "%{y:.3f}<extra>sin(πx)</extra>",
          },
        ],
        layout(L.position, L.temperature0, [-0.08, 1.05]),
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
    readout.id = `${controls.id}-readout`;
    readout.setAttribute("aria-live", "polite");
    holder.setAttribute("aria-describedby", readout.id);
    let viewport = holder;
    if (figure.dataset.plot === "ramsey") {
      viewport = document.createElement("div");
      viewport.className = "ramsey-viewport";
      viewport.tabIndex = 0;
      viewport.setAttribute("role", "region");
      viewport.setAttribute("aria-label", L.ramseyLabel);
      viewport.append(holder);
    }
    // Hide the static fallback directly so a stale cached stylesheet cannot show both.
    const picture = figure.querySelector("picture");
    picture.after(viewport, controls, readout);
    picture.hidden = true;
    figure.classList.add("is-interactive");
    const caption = figure.querySelector("figcaption");
    const staticCaption = caption?.textContent;
    if (caption && figure.dataset.interactiveCaption) {
      const fallback = document.createElement("span");
      fallback.className = "plot-static-caption";
      fallback.textContent = staticCaption;
      const interactive = document.createElement("span");
      interactive.className = "plot-interactive-caption";
      interactive.textContent = figure.dataset.interactiveCaption;
      caption.replaceChildren(fallback, interactive);
    }
    Promise.resolve()
      .then(() => make(holder, controls, readout))
      .catch(() => {
        figure.classList.remove("is-interactive");
        picture.hidden = false;
        viewport.remove();
        controls.remove();
        readout.remove();
        if (caption) caption.textContent = staticCaption;
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
