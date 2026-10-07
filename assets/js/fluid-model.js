const linspace = (a, b, n) =>
  Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

export function profileAt(data, time) {
  if (!Number.isFinite(time) || time < 0 || time > data.tmax)
    throw new RangeError("time outside the solution domain");
  if (time === 0)
    return {
      x: [-0.5, 0, 0, 0.5],
      q: [data.left, data.left, data.right, data.right],
    };
  const [a, b, c, d] = data.speeds.map((s) => s * time);
  return {
    x: [-0.5, a, ...data.fan.xi.map((v) => v * time), b, c, c, d, d, 0.5],
    q: [
      data.left,
      data.left,
      ...data.fan.q,
      data.leftStar,
      data.leftStar,
      data.rightStar,
      data.rightStar,
      data.right,
      data.right,
    ],
  };
}

export function surfacePatches(data, field) {
  if (![0, 1, 2].includes(field)) throw new RangeError("unknown fluid field");
  const times = linspace(0, data.tmax, 17);
  const [a, b, c, d] = data.speeds;
  const regions = [
    [() => -0.5, (t) => a * t, data.left[field]],
    [(t) => b * t, (t) => c * t, data.leftStar[field]],
    [(t) => c * t, (t) => d * t, data.rightStar[field]],
    [(t) => d * t, () => 0.5, data.right[field]],
  ];
  const patches = regions.map(([lo, hi, value]) => ({
    x: times.map((t) => [lo(t), hi(t)]),
    y: times.map((t) => [t, t]),
    z: times.map(() => [value, value]),
  }));
  patches.push({
    x: times.map((t) => data.fan.xi.map((xi) => t * xi)),
    y: times.map((t) => data.fan.xi.map(() => t)),
    z: times.map(() => data.fan.q.map((q) => q[field])),
  });
  for (const [speed, left, right] of [
    [c, data.leftStar, data.rightStar],
    [d, data.rightStar, data.right],
  ]) {
    if (Math.abs(left[field] - right[field]) < 1e-12) continue;
    patches.push({
      x: times.map((t) => [speed * t, speed * t]),
      y: times.map((t) => [t, t]),
      z: times.map(() => [left[field], right[field]]),
    });
  }
  return patches;
}
