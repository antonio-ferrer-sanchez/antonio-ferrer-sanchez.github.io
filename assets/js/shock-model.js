// Scalar GA-PINN weighting, arXiv:2305.08448v2 §3.1, and the Burgers front.
export function lambdaWeight(gradient, alpha = 1, beta = 2) {
  if (![gradient, alpha, beta].every(Number.isFinite) || alpha < 0 || beta <= 0)
    throw new RangeError("Invalid gradient-weight parameters");
  return 1 / (1 + alpha * Math.abs(gradient) ** beta);
}

export function point(x, time, width, speed = 0.5) {
  if (!(width > 0)) throw new RangeError("Width must be positive");
  const y = Math.tanh((x - speed * time) / width);
  const u = (1 - y) / 2;
  const dx = -(1 - y * y) / (2 * width);
  return { u, dx, r: (u - speed) * dx };
}

// Simpson weights in z=(x-vt)/delta. The omitted tails are negligible.
const N = 2048,
  H = 48 / N;
const quadrature = Array.from({ length: N + 1 }, (_, i) => {
  const y = Math.tanh(-24 + i * H);
  return {
    u: (1 - y) / 2,
    g: (1 - y * y) / 2,
    w: i === 0 || i === N ? 1 : i % 2 ? 4 : 2,
  };
});

export function integrals(width, speed = 0.5, alpha = 1, beta = 2) {
  if (!(width > 0) || !Number.isFinite(speed))
    throw new RangeError("Invalid front");
  lambdaWeight(0, alpha, beta);
  const raw = ((speed - 0.5) ** 2 / 3 + 1 / 60) / width;
  if (alpha === 0) return [raw, raw];
  let sum = 0;
  for (const q of quadrature) {
    const g = q.g / width;
    sum += (q.w * ((q.u - speed) * g) ** 2) / (1 + alpha * g ** beta);
  }
  return [raw, (sum * width * H) / 3];
}

export function diagnostics(time, width, speed, alpha = 1, beta = 2) {
  const [raw, weighted] = integrals(width, speed, alpha, beta);
  const peakGradient = 1 / (2 * width);
  return {
    exactPosition: 0.5 * time,
    frontPosition: speed * time,
    positionError: Math.abs((speed - 0.5) * time),
    conservationDefect: speed - 0.5,
    peakGradient,
    minimumWeight: lambdaWeight(peakGradient, alpha, beta),
    retained: weighted / raw,
    raw,
    weighted,
  };
}
