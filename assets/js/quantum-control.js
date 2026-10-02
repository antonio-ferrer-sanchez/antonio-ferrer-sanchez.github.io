// Analytic rotating-field example; these curves are not trained PINN outputs.
export function fidelity(s, duration, fraction) {
  const mismatch = (1 - fraction) * Math.PI;
  const phase = Math.hypot(duration, mismatch);
  return 1 - (mismatch / phase) ** 2 * Math.sin((phase * s) / 2) ** 2;
}

export function controlStrength(duration, fraction) {
  return (fraction * Math.PI) / (2 * duration);
}

const labels = {
  en: {
    duration: "Duration T (in units of Ω⁻¹)",
    fraction: "Control fraction η",
    bare: "No added control",
    partial: "Selected control",
    ideal: "Exact CD control",
    time: "Fraction elapsed, s = t / T",
    fidelity: "Ground-state fidelity",
    summary: (bare, selected, c) =>
      `Final fidelity: ${bare} without control; ${selected} with the selected control; 1.000 with exact CD. Selected control coefficient: ${c} ℏΩ.`,
  },
  es: {
    duration: "Duración T (en unidades de Ω⁻¹)",
    fraction: "Fracción de control η",
    bare: "Sin control adicional",
    partial: "Control seleccionado",
    ideal: "Control CD exacto",
    time: "Fracción transcurrida, s = t / T",
    fidelity: "Fidelidad al estado fundamental",
    summary: (bare, selected, c) =>
      `Fidelidad final: ${bare} sin control; ${selected} con el control seleccionado; 1.000 con CD exacto. Coeficiente del control seleccionado: ${c} ℏΩ.`,
  },
};

async function enhance(figure) {
  const L = labels[document.documentElement.lang] || labels.en;
  const picture = figure.querySelector("picture");
  const caption = figure.querySelector("figcaption");
  const originalCaption = caption.textContent;
  const holder = document.createElement("div");
  holder.className = "plot-holder";
  holder.setAttribute("role", "img");
  holder.setAttribute("aria-label", `${L.fidelity}; ${L.time}`);
  holder.setAttribute("aria-describedby", "quantum-summary");
  const controls = document.createElement("div");
  controls.className = "plot-controls";
  const readout = document.createElement("p");
  readout.className = "plot-readout";
  readout.id = "quantum-summary";
  readout.setAttribute("aria-live", "polite");
  function slider(name, label, min, max, step, value) {
    const row = document.createElement("div");
    row.className = "plot-control";
    const id = `quantum-${name}`;
    row.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}"></output>`;
    controls.append(row);
    return row.querySelector("input");
  }
  const duration = slider("duration", L.duration, 0.5, 10, 0.25, 2);
  const fraction = slider("fraction", L.fraction, 0, 1, 0.05, 0.5);
  const xs = Array.from({ length: 401 }, (_, i) => i / 400);
  const axis = (title, range) => ({
    title: { text: title, standoff: 8 },
    range,
    fixedrange: true,
    zeroline: false,
    showline: true,
    linecolor: "#415950",
    ticks: "outside",
    gridcolor: "rgba(21,63,54,0.12)",
  });
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      family: '"Source Sans 3", Arial, sans-serif',
      size: 14,
      color: "#203c33",
    },
    margin: { l: 62, r: 14, t: 100, b: 58 },
    xaxis: axis(L.time, [0, 1]),
    yaxis: axis(L.fidelity, [-0.03, 1.04]),
    legend: {
      orientation: "v",
      x: 0,
      y: 1.03,
      yanchor: "bottom",
      xanchor: "left",
    },
    hovermode: "x unified",
  };
  const config = {
    responsive: true,
    displaylogo: false,
    displayModeBar: false,
    scrollZoom: false,
  };
  function update() {
    const T = Number(duration.value);
    const eta = Number(fraction.value);
    for (const input of [duration, fraction])
      input.nextElementSibling.value = Number(input.value).toFixed(2);
    readout.textContent = L.summary(
      fidelity(1, T, 0).toFixed(3),
      fidelity(1, T, eta).toFixed(3),
      controlStrength(T, eta).toFixed(3),
    );
    const traces = [
      [0, L.bare, "#A65313", "dash"],
      [eta, L.partial, "#0072B2", "dot"],
      [1, L.ideal, "#153f36", "solid"],
    ].map(([strength, name, color, dash]) => ({
      type: "scatter",
      mode: "lines",
      x: xs,
      y: xs.map((s) => fidelity(s, T, strength)),
      name,
      line: { color, dash, width: 2.5 },
      hovertemplate: "%{y:.4f}<extra>%{fullData.name}</extra>",
    }));
    return window.Plotly.react(holder, traces, layout, config);
  }
  function restore() {
    picture.hidden = false;
    figure.classList.remove("is-interactive");
    caption.textContent = originalCaption;
    window.Plotly?.purge(holder);
    holder.remove();
    controls.remove();
    readout.remove();
  }
  picture.after(holder, controls, readout);
  try {
    await update();
    picture.hidden = true;
    figure.classList.add("is-interactive");
    caption.textContent = figure.dataset.interactiveCaption || originalCaption;
    for (const input of [duration, fraction])
      input.addEventListener("input", () =>
        Promise.resolve().then(update).catch(restore),
      );
  } catch {
    restore();
  }
}

if (typeof document !== "undefined") {
  const figure = document.querySelector('figure[data-plot="quantum-control"]');
  if (figure) {
    const start = () => {
      const tag = document.createElement("script");
      tag.src = new URL("plotly-basic.min.js", import.meta.url).href;
      tag.onload = () => enhance(figure);
      // A failed download leaves the original SVG and caption in place.
      document.head.append(tag);
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            start();
          }
        },
        { rootMargin: "600px" },
      );
      observer.observe(figure);
    } else start();
  }
}
