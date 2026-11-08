// ---------- Track queries ----------
function nearestIdx(car, full) {
  let best = 1e9, bi = car.idx;
  const span = full ? N : 40;
  for (let o = -span; o <= span; o++) {
    const k = ((car.idx + o) % N + N) % N;
    const dx = car.pos.x - P[k].x, dz = car.pos.z - P[k].z, d = dx * dx + dz * dz;
    if (d < best) { best = d; bi = k; }
    if (full && o > 0) break;
  }
  if (full) { for (let k = 0; k < N; k++) { const dx = car.pos.x - P[k].x, dz = car.pos.z - P[k].z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = k; } } }
  return bi;
}
