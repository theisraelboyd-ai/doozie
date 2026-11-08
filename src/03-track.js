// ---------- Track ----------
// Builds the road, verges, kerbs and edges from a track definition (03-a-tracks-data.js),
// then hands the scenery to the theme kit. buildTrack() can be called again to switch tracks.
const ROAD_W = 8;           // half width of tarmac
const SHOULDER = 6;         // normal verge width
const N = 900;              // samples along the centre line
const P = [], TAN = [], NRM = [], SH = [], MUD = [], NARROW = [];
let SPACING = 1, curTrack = null, trackGroup = null;
let waterNormal = null, bobbers = [], themeTick = null;
const boxGeo = new T.BoxGeometry(1, 1, 1);
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
function zoneAmount(def, f, type) {
  let a = 0;
  for (const z of def.zones || []) if (z.type === type) a = Math.max(a, smooth01((f - z.from) / 0.02) * smooth01((z.to - f) / 0.02));
  return a;
}
function addTo(obj) { trackGroup.add(obj); return obj; }
function box(x, y, z, sx, sy, sz, color, ry = 0, opts = {}) {
  const m = new T.Mesh(boxGeo, new T.MeshStandardMaterial({ color, roughness: 0.7, ...opts }));
  m.castShadow = m.receiveShadow = true;
  m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = ry; return addTo(m);
}
function minTrackDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < N; i += 6) { const dx = x - P[i].x, dz = z - P[i].z; const d = dx * dx + dz * dz; if (d < best) best = d; }
  return Math.sqrt(best);
}
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
  return addTo(m);
}
function skirts(depth, color) {
  const mat = new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 1 });
  for (const sgn of [-1, 1]) {
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], n = NRM[k], w = sgn * (ROAD_W + SH[k]);
      pos.push(p.x + n.x * w, 0, p.z + n.z * w, p.x + n.x * w, -depth, p.z + n.z * w);
      if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    addTo(new T.Mesh(g, mat));
  }
}
function startLine() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16;
  const cx = cv.getContext('2d');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { cx.fillStyle = (x + y) % 2 ? '#111' : '#fff'; cx.fillRect(x * 4, y * 4, 4, 4); }
  const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter;
  const m = new T.Mesh(new T.PlaneGeometry(ROAD_W * 2, 4), new T.MeshBasicMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.atan2(TAN[0].x, TAN[0].z) + Math.PI / 2;
  m.position.set(P[0].x, 0.07, P[0].z);
  addTo(m);
}
function signTexture(lines, bg = '#f9a825', fg = '#1b1b1b') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
  const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, 256, 160); c.strokeStyle = fg; c.lineWidth = 10; c.strokeRect(8, 8, 240, 144);
  c.fillStyle = fg; c.textAlign = 'center'; c.font = 'bold 34px Arial Black, Arial';
  lines.forEach((l, k) => c.fillText(l, 128, 62 + k * 44));
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
}

function buildTrack(id) {
  const def = TRACKS.find(t => t.id === id) || TRACKS[0];
  if (trackGroup) {
    scene.remove(trackGroup);
    trackGroup.traverse(o => { if (o.geometry && o.geometry !== boxGeo) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  }
  trackGroup = new T.Group(); scene.add(trackGroup);
  curTrack = def; waterNormal = null; bobbers = []; themeTick = null; seed = 7;
  const curve = new T.CatmullRomCurve3(def.points.map(p => new T.Vector3(p[0], 0, p[1])), true, 'centripetal');
  P.length = TAN.length = NRM.length = SH.length = MUD.length = NARROW.length = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t).setY(0).normalize();
    P.push(p); TAN.push(tg); NRM.push(new T.Vector3(-tg.z, 0, tg.x)); // left-hand side normal
    NARROW.push(zoneAmount(def, t, 'narrow')); MUD.push(zoneAmount(def, t, 'mud'));
    SH.push(SHOULDER - NARROW[i] * 5.2);
  }
  SPACING = curve.getLength() / N;
  const kit = KITS[def.theme] || KITS.harbour;
  kit(def);
  startLine();
  if (typeof applyGfx === 'function' && typeof composer !== 'undefined' && composer) applyGfx();
}

// ---------- Theme kits ----------
const KITS = {};

KITS.harbour = function (def) {
  curTrack.fallText = 'went for a swim';
  curTrack.sky = { fancy: 0xbfdcf0, simple: 0x9fd3f0, fogNear: 180, fogFar: 420 };
  const cGrass = new T.Color(0x6abf4b), cPier = new T.Color(0xb08a5a), cRoad = new T.Color(0x45484f);
  const cRed = new T.Color(0xd32f2f), cWhite = new T.Color(0xf5f5f5), cMud = new T.Color(0x5d4630);
  ribbon(k => -(ROAD_W + SH[k]), k => ROAD_W + SH[k], 0, k => cGrass.clone().lerp(cPier, NARROW[k]));
  ribbon(k => -ROAD_W, k => ROAD_W, 0.03, k => cRoad.clone().lerp(cMud, MUD[k]));
  ribbon(k => ROAD_W - 0.9, k => ROAD_W, 0.06, (k, i) => ((i >> 2) % 2 ? cRed : cWhite));
  ribbon(k => -ROAD_W, k => -ROAD_W + 0.9, 0.06, (k, i) => ((i >> 2) % 2 ? cRed : cWhite));
  ribbon(k => -0.25, k => 0.25, 0.05, (k, i) => ((i >> 3) % 2 ? cRoad : cWhite));
  skirts(4, 0x6b5a45);
  // water with a moving ripple normal map
  waterNormal = (() => {
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
  water.receiveShadow = true; water.rotation.x = -Math.PI / 2; water.position.y = -1.4; addTo(water);
  // containers, cranes and boats, kept clear of the track
  const containerCols = [0xc62828, 0x1565c0, 0x2e7d32, 0xef6c00, 0x6a1b9a, 0x00838f];
  for (let n = 0; n < 60; n++) {
    const x = -260 + rnd() * 560, z = -140 + rnd() * 450;
    if (minTrackDist(x, z) < 34) continue;
    const r = rnd();
    if (r < 0.55) {
      const ry = rnd() * Math.PI;
      box(x, -0.7, z, 16, 1.6, 16, 0x8d8d8d, ry);
      const h = 1 + Math.floor(rnd() * 3);
      for (let s = 0; s < h; s++) box(x, 1.4 + s * 2.6, z, 5, 2.6, 12, containerCols[Math.floor(rnd() * 6)], ry + (s % 2) * 0.05);
    } else if (r < 0.75) {
      const c = 0xf9a825;
      box(x, -0.7, z, 12, 1.6, 12, 0x8d8d8d);
      box(x - 3, 10, z, 1, 20, 1, c); box(x + 3, 10, z, 1, 20, 1, c);
      box(x, 20.5, z + 6, 1.4, 1.4, 26, c);
    } else {
      const b = box(x, -0.9, z, 4, 1.4, 10, rnd() < 0.5 ? 0xffffff : 0xd84315, rnd() * Math.PI);
      bobbers.push({ m: b, ph: rnd() * 6, y: -0.9 });
    }
  }
  for (let i = 0; i < N; i += 14) if (NARROW[i] > 0.9) for (const s of [-1, 1]) {
    const w = s * (ROAD_W + SH[i] - 0.3);
    box(P[i].x + NRM[i].x * w, 0.4, P[i].z + NRM[i].z * w, 0.5, 0.8, 0.5, 0x333333);
  }
  for (let i = 20; i < N; i += 45) {
    if (NARROW[i] > 0.1) continue;
    const w = ROAD_W + SH[i] - 1.5;
    box(P[i].x + NRM[i].x * w, 3, P[i].z + NRM[i].z * w, 0.3, 6, 0.3, 0x555555);
    box(P[i].x + NRM[i].x * (w - 0.8), 6, P[i].z + NRM[i].z * (w - 0.8), 1.8, 0.3, 0.6, 0xfff59d, 0, { emissive: 0xffe082, emissiveIntensity: 2.5 });
  }
};

KITS.forest = function (def) {
  curTrack.fallText = 'fell into the ravine';
  curTrack.sky = { fancy: 0xb5cbbf, simple: 0x9cb9aa, fogNear: 120, fogFar: 360 };
  const cMoss = new T.Color(0x4f8a3c), cPlank = new T.Color(0x8b6a43), cDirt = new T.Color(0x7a5d40);
  const cMud = new T.Color(0x3e2c1c), cK1 = new T.Color(0xe8dcc0), cK2 = new T.Color(0x6d4c2f), cTyre = new T.Color(0x5b4632);
  ribbon(k => -(ROAD_W + SH[k]), k => ROAD_W + SH[k], 0, k => cMoss.clone().lerp(cPlank, NARROW[k]));
  ribbon(k => -ROAD_W, k => ROAD_W, 0.03, k => cDirt.clone().lerp(cPlank, NARROW[k] * 0.8).lerp(cMud, MUD[k]));
  ribbon(k => ROAD_W - 0.9, k => ROAD_W, 0.06, (k, i) => ((i >> 2) % 2 ? cK1 : cK2));
  ribbon(k => -ROAD_W, k => -ROAD_W + 0.9, 0.06, (k, i) => ((i >> 2) % 2 ? cK1 : cK2));
  // faint tyre ruts in the dirt
  ribbon(k => -3.6, k => -2.6, 0.045, () => cTyre);
  ribbon(k => 2.6, k => 3.6, 0.045, () => cTyre);
  skirts(60, 0x5f5850);
  // the ravine: a misty floor far below
  const floor = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshStandardMaterial({ color: 0x2f3e36, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -60; addTo(floor);
  const mistMat = new T.MeshBasicMaterial({ color: 0xc9d8d0, transparent: true, opacity: 0.1, depthWrite: false });
  for (let k = 0; k < 3; k++) { const mist = new T.Mesh(new T.PlaneGeometry(2000, 2000), mistMat); mist.rotation.x = -Math.PI / 2; mist.position.y = -14 - k * 12; addTo(mist); }
  // pine tree parts (shared geometry)
  const trunkG = new T.CylinderGeometry(0.35, 0.5, 1, 6), coneG = new T.ConeGeometry(1, 1, 7);
  const trunkM = new T.MeshStandardMaterial({ color: 0x5b3b22, roughness: 1 });
  const pineMs = [0x1f5a32, 0x2a6b3a, 0x1a4d2c, 0x34703f].map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  function pine(x, y, z, h) {
    const t = new T.Mesh(trunkG, trunkM); t.scale.set(1, h * 0.35, 1); t.position.set(x, y + h * 0.17, z); t.castShadow = true; addTo(t);
    const m = pineMs[Math.floor(rnd() * pineMs.length)];
    for (let k = 0; k < 3; k++) { const c = new T.Mesh(coneG, m); const s = h * (0.42 - k * 0.1); c.scale.set(s, h * 0.38, s); c.position.set(x, y + h * (0.38 + k * 0.2), z); c.castShadow = true; addTo(c); }
  }
  // rock pillars rising out of the ravine, each topped with trees
  const rockM = new T.MeshStandardMaterial({ color: 0x6e675e, roughness: 1, flatShading: true });
  const capM = new T.MeshStandardMaterial({ color: 0x46803a, roughness: 1, flatShading: true });
  for (let n = 0; n < 90; n++) {
    const x = -280 + rnd() * 580, z = -150 + rnd() * 470;
    const d = minTrackDist(x, z); if (d < 26) continue;
    const r = Math.min(d - 18, 6 + rnd() * 14), top = -2 + rnd() * 5;
    const col = new T.Mesh(new T.CylinderGeometry(r, r * 1.25, 62 + top, 7), rockM); col.position.set(x, top - (62 + top) / 2, z); col.receiveShadow = true; addTo(col);
    const cap = new T.Mesh(new T.CylinderGeometry(r * 1.02, r, 1, 7), capM); cap.position.set(x, top, z); cap.receiveShadow = true; addTo(cap);
    const trees = Math.max(1, Math.floor(r / 3));
    for (let k = 0; k < trees; k++) { const a = rnd() * 6.28, rr = rnd() * r * 0.75; pine(x + Math.cos(a) * rr, top, z + Math.sin(a) * rr, 8 + rnd() * 9); }
  }
  // trees along the outer edge of the verge, and logs, rocks and stumps
  for (let i = 0; i < N; i += 9) {
    if (NARROW[i] > 0.3) continue;
    for (const s of [-1, 1]) {
      if (rnd() < 0.45) continue;
      const w = s * (ROAD_W + SH[i] - 0.9);
      pine(P[i].x + NRM[i].x * w, 0, P[i].z + NRM[i].z * w, 7 + rnd() * 7);
    }
  }
  for (let i = 30; i < N; i += 70) {
    const s = rnd() < 0.5 ? -1 : 1, w = s * (ROAD_W + 3.2), x = P[i].x + NRM[i].x * w, z = P[i].z + NRM[i].z * w;
    const lg = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 4.5, 8), trunkM); lg.rotation.z = Math.PI / 2; lg.rotation.y = Math.atan2(TAN[i].x, TAN[i].z) + Math.PI / 2; lg.position.set(x, 0.5, z); lg.castShadow = true; addTo(lg);
    const rk = new T.Mesh(new T.DodecahedronGeometry(0.9 + rnd()), rockM); rk.position.set(x + TAN[i].x * 4, 0.5, z + TAN[i].z * 4); rk.castShadow = true; addTo(rk);
  }
  // log bridge: rails and rope posts along narrow sections
  for (let i = 0; i < N; i += 10) if (NARROW[i] > 0.9) for (const s of [-1, 1]) {
    const w = s * (ROAD_W + SH[i] - 0.2);
    box(P[i].x + NRM[i].x * w, 0.7, P[i].z + NRM[i].z * w, 0.35, 1.4, 0.35, 0x5b3b22);
  }
  // a log cabin with a glowing window, a campfire, and the famous sign
  const spot = Math.floor(N * 0.62), s0 = 1, cw = ROAD_W + SH[spot] + 9;
  const cxp = P[spot].x + NRM[spot].x * cw * s0, czp = P[spot].z + NRM[spot].z * cw * s0, yaw = Math.atan2(TAN[spot].x, TAN[spot].z);
  if (minTrackDist(cxp, czp) > ROAD_W + 7) {
    const plat = new T.Mesh(new T.CylinderGeometry(9, 11, 62, 8), rockM); plat.position.set(cxp, -31, czp); addTo(plat);
    const pc = new T.Mesh(new T.CylinderGeometry(9.2, 9, 1, 8), capM); pc.position.set(cxp, 0, czp); addTo(pc);
    box(cxp, 2, czp, 8, 4, 6, 0x7b5230, yaw);
    const roof = new T.Mesh(new T.ConeGeometry(6.3, 3, 4), new T.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9, flatShading: true }));
    roof.position.set(cxp, 5.5, czp); roof.rotation.y = yaw + Math.PI / 4; roof.castShadow = true; addTo(roof);
    box(cxp - NRM[spot].x * 3.05, 2.2, czp - NRM[spot].z * 3.05, 1.6, 1.2, 0.1, 0xffcc80, yaw + Math.PI / 2, { emissive: 0xffa726, emissiveIntensity: 2 });
  }
  const sp = Math.floor(N * 0.05), sw = ROAD_W + 2.4;
  const signX = P[sp].x + NRM[sp].x * sw, signZ = P[sp].z + NRM[sp].z * sw;
  box(signX, 1.6, signZ, 0.25, 3.2, 0.25, 0x5b3b22);
  const sign = new T.Mesh(new T.PlaneGeometry(3.4, 2.1), new T.MeshStandardMaterial({ map: signTexture(['BIGFOOT', 'CROSSING']), side: T.DoubleSide, roughness: 0.6 }));
  sign.position.set(signX, 3.6, signZ); sign.rotation.y = Math.atan2(TAN[sp].x, TAN[sp].z) + Math.PI; sign.castShadow = true; addTo(sign);
  const fi = Math.floor(N * 0.33), fx = P[fi].x - NRM[fi].x * (ROAD_W + 3.5), fz = P[fi].z - NRM[fi].z * (ROAD_W + 3.5);
  const fire = new T.Mesh(new T.ConeGeometry(0.6, 1.4, 6), new T.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff6d00, emissiveIntensity: 3 }));
  fire.position.set(fx, 0.7, fz); addTo(fire);
  for (let k = 0; k < 5; k++) { const st = new T.Mesh(new T.DodecahedronGeometry(0.35), rockM); st.position.set(fx + Math.cos(k * 1.26) * 1.1, 0.2, fz + Math.sin(k * 1.26) * 1.1); addTo(st); }
  themeTick = (dt, t) => { fire.scale.set(1 + Math.sin(t * 13) * 0.12, 1 + Math.sin(t * 9) * 0.2, 1 + Math.cos(t * 11) * 0.12); };
};

buildTrack(TRACKS[0].id);
