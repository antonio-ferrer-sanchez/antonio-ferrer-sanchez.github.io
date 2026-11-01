// The home page's fixed half: a lattice of points around a Schwarzschild
// black hole, displaced by its fundamental quasinormal ringdown,
// h = e^{-ω_I τ} cos(ω_R τ − ℓφ), with τ the retarded time at each point.
// The ratio ω_I/ω_R is the true one for the chosen ℓ; only the time scale is
// chosen for the screen. A click or the button perturbs the hole again.
// Without JavaScript the caption, the recorded trace and the picker remain;
// under reduced motion one still frame is drawn.
(() => {
  "use strict";
  const field = document.querySelector(".field");
  const canvas = field?.querySelector(".field-canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  // Mω for the fundamental mode, ℓ = 2, 3, 4 (Leaver 1985).
  const MODES = {
    2: [0.3737, 0.089],
    3: [0.5994, 0.0927],
    4: [0.8092, 0.0942],
  };
  const PERIOD_L2 = 1.5; // seconds on screen for one ℓ = 2 cycle
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const button = field.querySelector(".strike");
  const picker = field.querySelector(".qnm-picker");
  const trace = field.querySelector(".ringdown-curve");
  const style = getComputedStyle(field);
  const ink = style.color;
  const horizon = style.getPropertyValue("--horizon").trim() || "#000";

  let ell = 2;
  let wr = 0;
  let wi = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let strikes = [];
  let visible = true;
  let frame = 0;

  function setMode(l) {
    ell = l;
    const scale = (2 * Math.PI) / PERIOD_L2 / MODES[2][0];
    wr = MODES[l][0] * scale;
    wi = MODES[l][1] * scale;
  }

  function resize() {
    if (canvas.clientWidth === w && canvas.clientHeight === h) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (still) draw(1.8);
  }

  function strike(t0 = performance.now() / 1000, replay = true) {
    strikes = strikes.filter((s) => t0 - s < 9).concat(t0);
    if (trace && replay) {
      // Replay the recorded trace with the new perturbation.
      trace.style.animation = "none";
      void trace.getBoundingClientRect();
      trace.style.animation = "";
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * (w > h ? 0.4 : 0.3);
    const unit = Math.min(w, h);
    const rh = unit * 0.055; // horizon radius on screen
    const speed = unit * 0.13; // pixels per second
    const step = unit < 500 ? 13 : 16;
    ctx.fillStyle = ink;
    for (let y = step / 2; y < h; y += step) {
      const fadeY = Math.min(1, (h - y) / (h * 0.35)); // quiet under the caption
      for (let x = step / 2; x < w; x += step) {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (r < rh * 1.25) continue;
        const phi = Math.atan2(dy, dx);
        let a = 0;
        for (const t0 of strikes) {
          const tau = now - t0 - (r - rh) / speed;
          if (tau <= 0) continue;
          a +=
            (1 - Math.exp(-tau / 0.12)) *
            Math.exp(-wi * tau) *
            Math.cos(wr * tau - ell * phi);
        }
        a *= Math.sqrt(rh / r) * 2;
        // Crests light up and swell; troughs fall back to the faint lattice.
        // The square root is display gain only, so late, weak cycles still show.
        const crest = Math.min(1, Math.sqrt(Math.max(0, a)));
        const push = a * 8;
        const px = x + (dx / r) * push;
        const py = y + (dy / r) * push;
        const size = 1.1 + crest * 2.6;
        ctx.globalAlpha = (0.16 + crest * 0.84) * fadeY;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }
    // The horizon as an unlit disc; the photon sphere (1.5 r_s) as a thin ring.
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rh, 0, 2 * Math.PI);
    ctx.fillStyle = horizon;
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rh * 1.5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function loop() {
    frame = 0;
    if (!visible || document.hidden) return;
    const now = performance.now() / 1000;
    // Ring it again every few seconds, so a train of waves is always leaving.
    if (!strikes.length || now - strikes[strikes.length - 1] > 3)
      strike(now, false);
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (!frame && !still) frame = requestAnimationFrame(loop);
  }

  setMode(2);
  field.classList.add("is-live");
  if (still) strikes = [0];
  resize();
  // The field's height follows the sliding header, so watch the canvas itself.
  new ResizeObserver(resize).observe(canvas);

  picker?.addEventListener("change", (event) => {
    setMode(Number(event.target.value));
    if (still) draw(1.8);
    else strike();
  });

  if (!still) {
    button.hidden = false;
    button.addEventListener("click", () => strike());
    canvas.addEventListener("pointerdown", () => strike());
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(field);
    document.addEventListener("visibilitychange", start);
    start();
  }
})();
