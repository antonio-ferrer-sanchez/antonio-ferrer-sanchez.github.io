const modelURL = new URL("./fluid-model.js", import.meta.url);
modelURL.search = new URL(import.meta.url).search;
const { profileAt, surfacePatches } = await import(modelURL.href);
const ES = document.documentElement.lang === "es";
const L = ES
  ? {
      heading: "Explorar el fluido",
      field: "Magnitud",
      names: ["Densidad", "Presión", "Velocidad"],
      hint: "Gira la superficie con el ratón o las flechas del teclado. Mueve el tiempo para recorrer los perfiles.",
      reset: "Restablecer vista",
      time: "Tiempo",
      position: "Posición",
      slice: "Corte temporal",
      contact: "Posición del contacto",
      shock: "Posición del choque",
    }
  : {
      heading: "Explore the fluid",
      field: "Quantity",
      names: ["Density", "Pressure", "Velocity"],
      hint: "Rotate the surface by dragging or with the arrow keys. Move the time slider to follow the profiles.",
      reset: "Reset view",
      time: "Time",
      position: "Position",
      slice: "Time slice",
      contact: "Contact position",
      shock: "Shock position",
    };
const COLORS = ["#177563", "#B35420", "#0072B2"];
const SYMBOLS = ["ρ / ρL", "p / (ρL c²)", "v / c"];
const CAMERA = { eye: { x: 1.65, y: -1.65, z: 1.3 }, up: { x: 0, y: 0, z: 1 } };
function cameraFor(width) {
  const scale = Math.min(2.5, Math.max(1, 500 / width));
  return {
    ...CAMERA,
    eye: Object.fromEntries(
      Object.entries(CAMERA.eye).map(([key, value]) => [key, value * scale]),
    ),
  };
}
function supportsWebGL() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}
const CONFIG = {
  responsive: true,
  displayModeBar: false,
  displaylogo: false,
  scrollZoom: false,
};
const BASE = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: {
    family: "Source Sans 3, Arial, sans-serif",
    size: 14,
    color: "#203c33",
  },
};
function element(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}
function asset(path) {
  const url = new URL(path, import.meta.url);
  url.search = new URL(import.meta.url).search;
  return url.href;
}
function loadPlotly() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(
      () => reject(Error("Plot renderer timeout")),
      12000,
    );
    script.src = asset("./plotly-gl3d.min.js");
    script.onload = () => {
      clearTimeout(timer);
      window.Plotly ? resolve(window.Plotly) : reject(Error("No renderer"));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(Error("Plot renderer failed"));
    };
    document.head.append(script);
  });
}
function axis(title, range) {
  return {
    title: { text: title, font: { family: '"Source Sans 3"' } },
    range,
    gridcolor: "#dce5e0",
    zeroline: false,
    tickfont: { size: 12, family: '"Source Sans 3"' },
    nticks: 4,
    automargin: true,
  };
}
function surfaceData(data, field, time) {
  const maximum = field === 2 ? 0.6 : 1;
  const traces = surfacePatches(data, field).map((patch) => ({
    ...patch,
    type: "surface",
    cmin: 0,
    cmax: maximum,
    colorscale: [
      [0, "#e8f3ef"],
      [1, COLORS[field]],
    ],
    showscale: false,
    opacity: 1,
    name: L.names[field],
    lighting: { ambient: 0.85, diffuse: 0.45, specular: 0, roughness: 1 },
    hovertemplate: `${L.position}: %{x:.3f}<br>${L.time}: %{y:.3f}<br>${L.names[field]}: %{z:.3f}<extra></extra>`,
  }));
  const slice = profileAt(data, time);
  traces.push({
    type: "scatter3d",
    mode: "lines",
    x: slice.x,
    y: slice.x.map(() => time),
    z: slice.q.map((q) => q[field]),
    name: L.slice,
    line: { color: "#172e28", width: 6 },
    hoverinfo: "skip",
    showlegend: false,
  });
  return traces;
}
function surfaceLayout(field, width) {
  return {
    ...BASE,
    margin: { l: 5, r: 5, t: 5, b: 5 },
    uirevision: "fluid-camera",
    scene: {
      camera: cameraFor(width),
      aspectmode: "manual",
      aspectratio: { x: 1.4, y: 1, z: 0.85 },
      xaxis: axis(`${L.position} x`, [-0.5, 0.5]),
      yaxis: axis(`${L.time} t`, [0, 0.45]),
      zaxis: {
        ...axis(SYMBOLS[field], [0, field === 2 ? 0.65 : 1.05]),
        tickvals:
          field === 0
            ? [0.125, 0.5, 1]
            : field === 1
              ? [0.1, 0.5, 1]
              : [0, 0.3, 0.6],
      },
    },
  };
}
function sliceData(data, field, time) {
  const slice = profileAt(data, time);
  return [
    {
      type: "scatter",
      mode: "lines",
      x: slice.x,
      y: slice.q.map((q) => q[field]),
      line: { color: COLORS[field], width: 3 },
      name: L.names[field],
      hovertemplate: `${L.position}: %{x:.3f}<br>${L.names[field]}: %{y:.3f}<extra></extra>`,
    },
  ];
}
function sliceLayout(data, field, time) {
  const [a, b, c, d] = data.speeds.map((speed) => speed * time);
  return {
    ...BASE,
    showlegend: false,
    margin: { l: 64, r: 16, t: 7, b: 40 },
    xaxis: {
      ...axis(field === 2 ? `${L.position} x` : "", [-0.5, 0.5]),
      fixedrange: true,
    },
    yaxis: {
      ...axis(SYMBOLS[field], [-0.03, field === 2 ? 0.6 : 1.05]),
      fixedrange: true,
    },
    shapes: [
      {
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: a,
        x1: b,
        y0: 0,
        y1: 1,
        fillcolor: "#e6efe9",
        line: { width: 0 },
        layer: "below",
      },
      ...[c, d].map((x, i) => ({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        line: {
          color: i ? "#535e68" : "#9f4f89",
          width: 1.5,
          dash: i ? "dot" : "dash",
        },
        layer: "below",
      })),
    ],
  };
}

async function enhance(figure) {
  const fallback = document.querySelector("#fluid-profiles-fallback");
  const picture = figure.querySelector("picture");
  const ui = element("div", "fluid-ui fluid-loading");
  let Plotly;
  let failed = false;
  const charts = [];
  const fail = () => {
    failed = true;
    for (const chart of charts) {
      try {
        Plotly?.purge(chart);
      } catch {
        /* Keep the original vectors available. */
      }
    }
    ui.remove();
    picture.hidden = false;
    fallback.hidden = false;
    figure.removeAttribute("data-ready");
    figure.dataset.state = "fallback";
  };
  try {
    if (!supportsWebGL()) throw Error("WebGL unavailable");
    const loaded = await Promise.all([
      loadPlotly(),
      fetch(asset("../data/relativistic-tube.json")).then((r) => {
        if (!r.ok) throw Error("Fluid data unavailable");
        return r.json();
      }),
    ]);
    [Plotly] = loaded;
    const data = loaded[1];
    await document.fonts.ready;
    ui.append(
      element("h3", "fluid-heading", L.heading),
      element("p", "fluid-hint", L.hint),
    );
    const controls = element("div", "fluid-controls");
    const label = element("label", "", L.field);
    const select = element("select");
    select.id = "fluid-field";
    label.htmlFor = select.id;
    L.names.forEach((name, i) => {
      const option = element("option", "", name);
      option.value = String(i);
      select.append(option);
    });
    label.append(select);
    const reset = element("button", "fluid-reset", L.reset);
    reset.type = "button";
    controls.append(label, reset);
    ui.append(controls);
    const surface = element("div", "fluid-surface");
    surface.tabIndex = 0;
    surface.setAttribute(
      "aria-keyshortcuts",
      "ArrowLeft ArrowRight ArrowUp ArrowDown",
    );
    surface.setAttribute("role", "img");
    surface.setAttribute(
      "aria-label",
      ES
        ? "Superficie del fluido en posición y tiempo"
        : "Fluid surface over position and time",
    );
    ui.append(surface);
    charts.push(surface);
    const timeControl = element("div", "fluid-time");
    const timeLabel = element("label", "", L.time);
    timeLabel.htmlFor = "fluid-time";
    const timeValue = element("output", "fluid-time-value", "0.40");
    timeValue.htmlFor = "fluid-time";
    const slider = element("input");
    Object.assign(slider, {
      id: "fluid-time",
      type: "range",
      min: "0",
      max: "0.45",
      step: "0.005",
      value: "0.4",
    });
    timeControl.append(timeLabel, timeValue, slider);
    ui.append(timeControl);
    const status = element("p", "fluid-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    ui.append(status);
    const legend = element("div", "fluid-legend");
    [
      ES ? "Rarefacción" : "Rarefaction",
      ES ? "Contacto" : "Contact",
      ES ? "Choque" : "Shock",
    ].forEach((text, i) => {
      const key = element("span", `fluid-key fluid-key-${i}`, text);
      legend.append(key);
    });
    ui.append(legend);
    const profiles = element("div", "fluid-profiles");
    const profileCharts = L.names.map((name, field) => {
      const panel = element("section", "fluid-panel");
      const heading = element("h4", "", name);
      heading.style.color = COLORS[field];
      const chart = element("div", "fluid-chart");
      chart.setAttribute("role", "img");
      chart.setAttribute("aria-label", `${name}: ${L.slice}`);
      panel.append(heading, chart);
      profiles.append(panel);
      charts.push(chart);
      return chart;
    });
    ui.append(profiles);
    figure.insertBefore(ui, picture);
    let field = 0,
      time = 0.4,
      revision = 0,
      rendering = false;
    const render = async (initial = false) => {
      if (rendering || failed) return;
      rendering = true;
      try {
        do {
          const version = revision;
          const selectedField = field,
            selectedTime = time;
          const action = initial ? "newPlot" : "react";
          const jobs = [
            Plotly[action](
              surface,
              surfaceData(data, selectedField, selectedTime),
              surfaceLayout(selectedField, surface.clientWidth),
              CONFIG,
            ),
            ...profileCharts.map((chart, i) =>
              Plotly[action](
                chart,
                sliceData(data, i, selectedTime),
                sliceLayout(data, i, selectedTime),
                CONFIG,
              ),
            ),
          ];
          const results = await Promise.allSettled(jobs);
          if (failed || results.some((r) => r.status === "rejected"))
            throw Error("Fluid rendering failed");
          initial = false;
          surface.dataset.field = String(selectedField);
          profiles.dataset.time = String(selectedTime);
          status.textContent = `${L.contact}: ${(data.speeds[2] * selectedTime).toFixed(3)} · ${L.shock}: ${(data.speeds[3] * selectedTime).toFixed(3)}`;
          if (version === revision) break;
        } while (!failed);
      } catch {
        fail();
      } finally {
        rendering = false;
      }
    };
    await render(true);
    if (failed) return;
    if (!surface.querySelector("canvas")) {
      fail();
      return;
    }
    picture.hidden = true;
    fallback.hidden = true;
    ui.classList.remove("fluid-loading");
    figure.dataset.ready = "true";
    figure.dataset.state = "interactive";
    surface.on("plotly_webglcontextlost", fail);
    surface
      .querySelectorAll("canvas")
      .forEach((canvas) =>
        canvas.addEventListener("webglcontextlost", fail, { once: true }),
      );
    select.addEventListener("change", () => {
      field = Number(select.value);
      revision++;
      void render();
    });
    slider.addEventListener("input", () => {
      time = Number(slider.value);
      timeValue.value = time.toFixed(2);
      revision++;
      void render();
    });
    const moveCamera = async (camera) => {
      try {
        await Plotly.relayout(surface, { "scene.camera": camera });
      } catch {
        fail();
      }
    };
    reset.addEventListener("click", () => {
      void moveCamera(cameraFor(surface.clientWidth));
    });
    surface.addEventListener("keydown", (event) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      const camera = structuredClone(surface._fullLayout.scene.camera);
      const eye = camera.eye;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const angle = event.key === "ArrowLeft" ? 0.15 : -0.15;
        [eye.x, eye.y] = [
          eye.x * Math.cos(angle) - eye.y * Math.sin(angle),
          eye.x * Math.sin(angle) + eye.y * Math.cos(angle),
        ];
      } else {
        eye.z = Math.max(
          -4,
          Math.min(4, eye.z + (event.key === "ArrowUp" ? 0.2 : -0.2)),
        );
      }
      void moveCamera(camera);
    });
  } catch {
    fail();
  }
}
const figure = document.querySelector("#fluid-explorer");
if (figure) {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void enhance(figure);
        }
      },
      { rootMargin: "250px" },
    );
    observer.observe(figure);
  } else {
    void enhance(figure);
  }
}
