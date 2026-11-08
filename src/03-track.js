// ---------- Track ----------
const ROAD_W = 8;           // half width of tarmac
const SHOULDER = 6;         // normal verge width
const raw = [
  [0, 0], [120, -30], [210, 10], [240, 100], [190, 170], [115, 150], [60, 210],
  [-40, 235], [-125, 190], [-145, 110], [-90, 62], [-155, 0], [-100, -55],
];
const curve = new T.CatmullRomCurve3(raw.map(p => new T.Vector3(p[0], 0, p[1])), true, 'centripetal');
const N = 900;
const P = [], TAN = [], NRM = [], SH = [];
for (let i = 0; i < N; i++) {
  const t = i / N;
  const p = curve.getPointAt(t);
  const tg = curve.getTangentAt(t).setY(0).normalize();
  P.push(p); TAN.push(tg);
  NRM.push(new T.Vector3(-tg.z, 0, tg.x)); // left-hand side normal
}
const SPACING = curve.getLength() / N;
// Narrow piers: verge shrinks to almost nothing on two stretches
function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
function pierAmount(i) {
  const f = i / N;
  const band = (a, b) => smooth01((f - a) / 0.02) * smooth01((b - f) / 0.02);
  return Math.max(band(0.30, 0.38), band(0.68, 0.74));
}
for (let i = 0; i < N; i++) SH.push(SHOULDER - pierAmount(i) * 5.2);

function ribbon(inner, outer, y, colorFn) {
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N, p = P[k], n = NRM[k];
    const a = inner(k), b = outer(k);
    pos.push(p.x + n.x * a, y, p.z + n.z * a, p.x + n.x * b, y, p.z + n.z * b);
    const c = colorFn(k, i);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.82, metalness: 0 }));
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
const cGrass = new T.Color(0x6abf4b), cPier = new T.Color(0xb08a5a), cRoad = new T.Color(0x45484f);
const cRed = new T.Color(0xd32f2f), cWhite = new T.Color(0xf5f5f5);
const vergeCol = k => cGrass.clone().lerp(cPier, pierAmount(k));
ribbon(k => -(ROAD_W + SH[k]), k => ROAD_W + SH[k], 0, vergeCol);
ribbon(k => -ROAD_W, k => ROAD_W, 0.03, () => cRoad);
ribbon(k => ROAD_W - 0.9, k => ROAD_W, 0.06, (k, i) => ((i >> 2) % 2 ? cRed : cWhite));
ribbon(k => -ROAD_W, k => -ROAD_W + 0.9, 0.06, (k, i) => ((i >> 2) % 2 ? cRed : cWhite));
ribbon(k => -0.25, k => 0.25, 0.05, (k, i) => ((i >> 3) % 2 ? cRoad : cWhite));
// Side walls of the land, dropping into the water
(function skirts() {
  const mat = new T.MeshStandardMaterial({ color: 0x6b5a45, side: T.DoubleSide, roughness: 1 });
  for (const sgn of [-1, 1]) {
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], n = NRM[k], w = sgn * (ROAD_W + SH[k]);
      pos.push(p.x + n.x * w, 0, p.z + n.z * w, p.x + n.x * w, -4, p.z + n.z * w);
      if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new T.Mesh(g, mat));
  }
})();
// Start line (chequered)
(function startLine() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16;
  const cx = cv.getContext('2d');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { cx.fillStyle = (x + y) % 2 ? '#111' : '#fff'; cx.fillRect(x * 4, y * 4, 4, 4); }
  const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter;
  const m = new T.Mesh(new T.PlaneGeometry(ROAD_W * 2, 4), new T.MeshBasicMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.atan2(TAN[0].x, TAN[0].z) + Math.PI / 2;
  m.position.set(P[0].x, 0.07, P[0].z);
  scene.add(m);
})();

// Water
const waterNormal = (() => {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const cx = cv.getContext('2d'), img = cx.createImageData(S, S), TAU = Math.PI * 2;
  const waves = [[3, 1, 0.0, 1], [1, 4, 1.3, 0.8], [5, -2, 2.1, 0.5], [-2, 6, 0.7, 0.4], [7, 3, 4.0, 0.3]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let dx = 0, dy = 0;
    for (const [a, b, ph, amp] of waves) { const c = Math.cos(TAU * (a * x + b * y) / S + ph) * amp; dx += c * a; dy += c * b; }
    const nx = -dx * 0.06, ny = -dy * 0.06, l = Math.hypot(nx, ny, 1), k = (y * S + x) * 4;
    img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = T.NoColorSpace;
  return t;
})();
const water = new T.Mesh(new T.PlaneGeometry(1400, 1400, 1, 1), new T.MeshStandardMaterial({ color: 0x1b6aa0, roughness: 0.08, metalness: 0.05, normalMap: waterNormal, normalScale: new T.Vector2(0.5, 0.5) }));
water.receiveShadow = true;
water.rotation.x = -Math.PI / 2; water.position.y = -1.4; scene.add(water);

// Harbour props (kept clear of the track)
function minTrackDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < N; i += 6) { const dx = x - P[i].x, dz = z - P[i].z; const d = dx * dx + dz * dz; if (d < best) best = d; }
  return Math.sqrt(best);
}
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const containerCols = [0xc62828, 0x1565c0, 0x2e7d32, 0xef6c00, 0x6a1b9a, 0x00838f];
const boxGeo = new T.BoxGeometry(1, 1, 1);
function box(x, y, z, sx, sy, sz, color, ry = 0) {
  const m = new T.Mesh(boxGeo, new T.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.castShadow = m.receiveShadow = true;
  m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
}
const bobbers = [];
for (let n = 0; n < 60; n++) {
  const x = -260 + rnd() * 560, z = -140 + rnd() * 450;
  if (minTrackDist(x, z) < 34) continue;
  const r = rnd();
  if (r < 0.55) { // container stack on a quay block
    const ry = rnd() * Math.PI;
    box(x, -0.7, z, 16, 1.6, 16, 0x8d8d8d, ry);
    const h = 1 + Math.floor(rnd() * 3);
    for (let s = 0; s < h; s++) box(x, 1.4 + s * 2.6, z, 5, 2.6, 12, containerCols[Math.floor(rnd() * 6)], ry + (s % 2) * 0.05);
  } else if (r < 0.75) { // crane
    const c = 0xf9a825;
    box(x, -0.7, z, 12, 1.6, 12, 0x8d8d8d);
    box(x - 3, 10, z, 1, 20, 1, c); box(x + 3, 10, z, 1, 20, 1, c);
    box(x, 20.5, z + 6, 1.4, 1.4, 26, c);
  } else { // little boat
    const b = box(x, -0.9, z, 4, 1.4, 10, rnd() < 0.5 ? 0xffffff : 0xd84315, rnd() * Math.PI);
    bobbers.push({ m: b, ph: rnd() * 6 });
  }
}
// Bollards along the piers
for (let i = 0; i < N; i += 14) {
  if (pierAmount(i) > 0.9) for (const s of [-1, 1]) {
    const w = s * (ROAD_W + SH[i] - 0.3);
    box(P[i].x + NRM[i].x * w, 0.4, P[i].z + NRM[i].z * w, 0.5, 0.8, 0.5, 0x333333);
  }
}
// Lamp posts on the verge
for (let i = 20; i < N; i += 45) {
  if (pierAmount(i) > 0.1) continue;
  const w = ROAD_W + SH[i] - 1.5;
  box(P[i].x + NRM[i].x * w, 3, P[i].z + NRM[i].z * w, 0.3, 6, 0.3, 0x555555);
  const lh = box(P[i].x + NRM[i].x * (w - 0.8), 6, P[i].z + NRM[i].z * (w - 0.8), 1.8, 0.3, 0.6, 0xfff59d);
  lh.material.emissive = new T.Color(0xffe082); lh.material.emissiveIntensity = 2.5;
}
