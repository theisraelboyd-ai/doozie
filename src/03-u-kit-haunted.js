// ---------- Theme kit: Haunted Hollow ----------
// Night. A muddy lane through dead woods lit by lanterns, weeping willows, abandoned houses,
// a ruined chapel with its graveyard, ghosts drifting between the trees, and things that scream.
KITS.haunted = function (def) {
  curTrack.fallText = 'was taken by the ghosts';
  curTrack.edge = 'woods';
  curTrack.night = true;
  curTrack.lostColors = [0x7e57c2, 0xb2fff0];
  curTrack.sky = { fancy: 0x14121f, simple: 0x1a1729, fogNear: 22, fogFar: 150 };
  const cMoss = new T.Color(0x1f2e24), cRoot = new T.Color(0x16201a), cRoad = new T.Color(0x3d3229), cBog = new T.Color(0x1a120c);
  const cK1 = new T.Color(0xcfc6b0), cK2 = new T.Color(0x2a2430), cRut = new T.Color(0x2b231c);
  ribbon(k => -(ROAD_W + SH[k]), k => ROAD_W + SH[k], 0, k => cMoss.clone().lerp(cRoot, NARROW[k]));
  ribbon(k => -ROAD_W, k => ROAD_W, 0.03, k => cRoad.clone().lerp(cBog, MUD[k]));
  ribbon(k => ROAD_W - 0.9, k => ROAD_W, 0.06, (k, i) => ((i >> 2) % 2 ? cK1 : cK2));
  ribbon(k => -ROAD_W, k => -ROAD_W + 0.9, 0.06, (k, i) => ((i >> 2) % 2 ? cK1 : cK2));
  ribbon(k => -3.6, k => -2.6, 0.045, () => cRut);
  ribbon(k => 2.6, k => 3.6, 0.045, () => cRut);
  const floor = new T.Mesh(new T.PlaneGeometry(2400, 2400), new T.MeshStandardMaterial({ color: 0x131b16, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; floor.receiveShadow = true; addTo(floor);
  const moon = new T.Mesh(new T.SphereGeometry(30, 24, 16), new T.MeshBasicMaterial({ color: new T.Color(1.5, 1.5, 1.3), fog: false }));
  moon.position.set(P[0].x - 350, 260, P[0].z - 600); addTo(moon);

  const clear = [];
  const near = (x, z) => clear.some(([a, b, r]) => Math.hypot(x - a, z - b) < r);
  const side = (i, off) => { const k = ((i % N) + N) % N; return { x: P[k].x + NRM[k].x * off, z: P[k].z + NRM[k].z * off, yaw: Math.atan2(TAN[k].x, TAN[k].z) }; };
  const stone = new T.MeshStandardMaterial({ color: 0x4a4a52, roughness: 1, flatShading: true });
  const oldWood = new T.MeshStandardMaterial({ color: 0x3a3029, roughness: 1 });
  const darkWood = new T.MeshStandardMaterial({ color: 0x241d19, roughness: 1 });
  const flicker = [];  // glowing windows that flicker
  const lanterns = []; // { glow sprite, light, ph }
  const glowTex = softTexture(255, 190, 110), poolTex = softTexture(255, 170, 90);

  // ----- abandoned houses -----
  function house(x, z, yaw, w = 8, d = 6) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; addTo(g);
    const part = (geo, mat, px, py, pz) => { const m = new T.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    part(new T.BoxGeometry(w, 4.6, d), oldWood, 0, 2.3, 0);
    const r1 = part(new T.BoxGeometry(w + 0.6, 0.25, d * 0.62), darkWood, 0, 5.3, d * 0.26); r1.rotation.x = 0.6;
    const r2 = part(new T.BoxGeometry(w * 0.7, 0.25, d * 0.62), darkWood, -w * 0.15, 5.0, -d * 0.24); r2.rotation.x = -0.9; r2.rotation.z = 0.25; // caved in
    part(new T.BoxGeometry(1, 3, 1), stone, w * 0.32, 6, -d * 0.1);              // chimney
    part(new T.BoxGeometry(1.4, 2.4, 0.1), new T.MeshStandardMaterial({ color: 0x0b0a0a }), 0, 1.2, d / 2 + 0.02); // doorway
    for (const wx of [-w * 0.3, w * 0.3]) {
      const lit = rnd() < 0.5;
      const win = part(new T.BoxGeometry(1.3, 1.1, 0.1), new T.MeshStandardMaterial({ color: lit ? 0x99ffdd : 0x090909, emissive: lit ? 0x55ffcc : 0x000000, emissiveIntensity: lit ? 1.2 : 0 }), wx, 2.8, d / 2 + 0.02);
      if (lit) { win.material.userData.keep = true; flicker.push({ m: win.material, ph: rnd() * 10 }); }
      const board = part(new T.BoxGeometry(1.6, 0.18, 0.08), darkWood, wx, 2.8, d / 2 + 0.08); board.rotation.z = (rnd() - 0.5) * 1.2;
    }
    for (const px of [-w * 0.45, w * 0.45]) part(new T.BoxGeometry(0.25, 2.6, 0.25), darkWood, px, 1.3, d / 2 + 1.2);
    const porch = part(new T.BoxGeometry(w, 0.2, 1.6), darkWood, 0, 2.7, d / 2 + 0.9); porch.rotation.z = 0.12;
  }
  for (const f of [0.12, 0.47, 0.7, 0.93]) {
    const i = Math.floor(f * N), s = rnd() < 0.5 ? -1 : 1, off = s * (ROAD_W + SH[i] + 10);
    const p = side(i, off);
    if (nearestOnTrack(p.x, p.z).d < ROAD_W + 8) continue;
    clear.push([p.x, p.z, 9]); house(p.x, p.z, p.yaw + (s > 0 ? Math.PI : 0) + (rnd() - 0.5) * 0.3);
  }

  // ----- ruined chapel and graveyard -----
  {
    const i = Math.floor(0.55 * N), s = -1, p = side(i, s * (ROAD_W + SH[i] + 16));
    if (nearestOnTrack(p.x, p.z).d > ROAD_W + 12) {
      clear.push([p.x, p.z, 17]);
      const g = new T.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.yaw; addTo(g);
      const part = (geo, mat, px, py, pz) => { const m = new T.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      part(new T.BoxGeometry(9, 7, 15), stone, 0, 3.5, 3);
      const roofL = part(new T.BoxGeometry(5.6, 0.3, 15.4), darkWood, -2.3, 8.3, 3); roofL.rotation.z = 0.7;
      const roofR = part(new T.BoxGeometry(5.6, 0.3, 9), darkWood, 2.3, 8.3, 6); roofR.rotation.z = -0.7; // half the roof has fallen in
      part(new T.BoxGeometry(4, 11, 4), stone, 0, 5.5, -6);
      part(new T.ConeGeometry(3, 6, 4), darkWood, 0, 14, -6).rotation.y = Math.PI / 4;
      const rose = part(new T.CircleGeometry(1.4, 16), new T.MeshStandardMaterial({ color: 0xb388ff, emissive: 0x7c4dff, emissiveIntensity: 1.6 }), 0, 7, -8.05);
      rose.rotation.y = Math.PI; rose.material.userData.keep = true; flicker.push({ m: rose.material, ph: 2 });
      const crossV = part(new T.BoxGeometry(0.3, 2, 0.3), stone, 0, 18, -6), crossH = part(new T.BoxGeometry(1.2, 0.3, 0.3), stone, 0, 18.4, -6);
      // gravestones and crosses in rows towards the road
      const graveM = new T.MeshStandardMaterial({ color: 0x6b6b70, roughness: 1, flatShading: true });
      for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
        if (rnd() < 0.15) continue;
        const gx = -9 + c * 3 + (rnd() - 0.5), gz = 14 + r * 3 + (rnd() - 0.5);
        if (rnd() < 0.7) { const st = part(new T.BoxGeometry(1.1, 1.5, 0.3), graveM, gx, 0.6, gz); st.rotation.z = (rnd() - 0.5) * 0.4; st.rotation.x = (rnd() - 0.5) * 0.3; }
        else { part(new T.BoxGeometry(0.25, 1.9, 0.25), graveM, gx, 0.9, gz); part(new T.BoxGeometry(1.0, 0.25, 0.25), graveM, gx, 1.4, gz); }
      }
      for (let k = 0; k < 12; k++) { const post = part(new T.BoxGeometry(0.12, 1.6, 0.12), darkWood, -11 + k * 2, 0.8, 26); post.rotation.z = (rnd() - 0.5) * 0.4; }
    }
  }

  // ----- lanterns along the lane -----
  const lampM = new T.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 4 });
  let lights = 0;
  for (let i = 10, n = 0; i < N; i += 34, n++) {
    const s = n % 2 ? 1 : -1, p = side(i, s * (ROAD_W + 1.6));
    if (near(p.x, p.z)) continue;
    box(p.x, 1.7, p.z, 0.22, 3.4, 0.22, 0x1d1a18);
    const q = side(i, s * (ROAD_W + 0.9));
    box(q.x, 3.25, q.z, 0.12, 0.12, 1.2, 0x1d1a18, p.yaw + Math.PI / 2);
    box(q.x, 2.9, q.z, 0.55, 0.75, 0.55, 0xffd08a, 0, { emissive: 0xffa040, emissiveIntensity: 4 });
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffb060, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
    glow.position.set(q.x, 2.9, q.z); glow.scale.setScalar(4.5); addTo(glow);
    let light = null;
    // a soft pool of light on the ground: nearly free, and all Simple/Low mode gets
    const pool = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: poolTex, color: 0xff9a40, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(q.x, 0.09, q.z); pool.scale.setScalar(13); pool.userData.lightPool = true; addTo(pool);
    // real lights cost every pixel on screen, so only Fancy gets them
    if (n % 2 === 0 && lights < 8) { light = new T.PointLight(0xffa860, 70, 26, 2); light.position.set(q.x, 3.2, q.z); light.userData.fancyOnly = true; addTo(light); lights++; }
    lanterns.push({ glow, light, ph: rnd() * 20 });
    clear.push([p.x, p.z, 2]);
  }

  // ----- weeping willows -----
  const willows = [];
  for (let k = 0; k < 40 && willows.length < 16; k++) {
    const i = Math.floor(rnd() * N), s = rnd() < 0.5 ? -1 : 1, p = side(i, s * (ROAD_W + SH[i] + 5 + rnd() * 10));
    if (near(p.x, p.z) || nearestOnTrack(p.x, p.z).d < ROAD_W + SH[i] + 4) continue;
    willows.push(p); clear.push([p.x, p.z, 6]);
  }
  const strandCount = willows.length * 70;
  const strands = new T.InstancedMesh(new T.BoxGeometry(0.14, 1, 0.14), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), Math.max(1, strandCount));
  const dummy = new T.Object3D(), tint = new T.Color();
  let sn = 0;
  for (const w of willows) {
    const h = 6 + rnd() * 2;
    const trunk = new T.Mesh(new T.CylinderGeometry(0.55, 0.95, h, 7), darkWood); trunk.position.set(w.x, h / 2, w.z); trunk.rotation.z = (rnd() - 0.5) * 0.2; trunk.castShadow = true; addTo(trunk);
    const dome = new T.Mesh(new T.SphereGeometry(4.6, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0x34452f, roughness: 1, flatShading: true }));
    dome.position.set(w.x, h - 0.6, w.z); dome.scale.y = 0.6; dome.castShadow = true; addTo(dome);
    for (let k = 0; k < 70; k++) {
      const a = rnd() * Math.PI * 2, r = 2.6 + rnd() * 2.2, L = 3 + rnd() * 3.2;
      dummy.position.set(w.x + Math.cos(a) * r, h - 0.6 - L / 2 + 0.3, w.z + Math.sin(a) * r);
      dummy.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); dummy.scale.set(1, L, 1); dummy.updateMatrix();
      strands.setMatrixAt(sn, dummy.matrix); strands.setColorAt(sn, tint.setHex(rnd() < 0.5 ? 0x4f6646 : 0x3e5538)); sn++;
    }
  }
  strands.count = sn; strands.castShadow = true; addTo(strands);

  // ----- dead trees near the lane, dark pines behind -----
  const deadPos = [];
  for (let k = 0; k < 160 && deadPos.length < 60; k++) {
    const i = Math.floor(rnd() * N), s = rnd() < 0.5 ? -1 : 1, p = side(i, s * (ROAD_W + SH[i] + 2.5 + rnd() * 9));
    if (near(p.x, p.z) || nearestOnTrack(p.x, p.z).d < ROAD_W + SH[i] + 2) continue;
    deadPos.push(p); clear.push([p.x, p.z, 2.5]);
  }
  const deadTrunk = new T.CylinderGeometry(0.22, 0.5, 1, 6), deadBranch = new T.CylinderGeometry(0.06, 0.18, 1, 5);
  for (const p of deadPos) {
    const h = 6 + rnd() * 6, g = new T.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = rnd() * 6; addTo(g);
    const t = new T.Mesh(deadTrunk, darkWood); t.scale.set(1, h, 1); t.position.y = h / 2; t.rotation.z = (rnd() - 0.5) * 0.25; t.castShadow = true; g.add(t);
    for (let b = 0; b < 4; b++) {
      const br = new T.Mesh(deadBranch, darkWood), L = 1.6 + rnd() * 2.4; br.scale.set(1, L, 1);
      const a = rnd() * 6.28, y = h * (0.5 + rnd() * 0.45);
      br.position.set(Math.cos(a) * L * 0.4, y + L * 0.3, Math.sin(a) * L * 0.4); br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); br.castShadow = true; g.add(br);
    }
  }
  const pines = [];
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const p of P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  for (let x = minX - 50; x < maxX + 50; x += 5) for (let z = minZ - 50; z < maxZ + 50; z += 5) {
    const tx = x + (rnd() - 0.5) * 4, tz = z + (rnd() - 0.5) * 4;
    const { d, i } = nearestOnTrack(tx, tz), edge = ROAD_W + SH[i];
    if (d < edge + 6 || d > edge + 55 || near(tx, tz)) continue;
    pines.push([tx, tz, 7 + rnd() * 10]);
  }
  const pineTrunk = new T.InstancedMesh(new T.CylinderGeometry(0.3, 0.45, 1, 6), darkWood, Math.max(1, pines.length));
  const pineLeaf = [0, 1, 2].map(() => new T.InstancedMesh(new T.ConeGeometry(1, 1, 7), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), Math.max(1, pines.length)));
  pines.forEach(([x, z, h], n) => {
    dummy.rotation.set(0, 0, 0); dummy.position.set(x, h * 0.17, z); dummy.scale.set(1, h * 0.35, 1); dummy.updateMatrix(); pineTrunk.setMatrixAt(n, dummy.matrix);
    tint.setHex([0x15261b, 0x1b2e22, 0x112018][Math.floor(rnd() * 3)]);
    pineLeaf.forEach((L, k) => { const s = h * (0.38 - k * 0.1); dummy.position.set(x, h * (0.38 + k * 0.2), z); dummy.scale.set(s, h * 0.38, s); dummy.updateMatrix(); L.setMatrixAt(n, dummy.matrix); L.setColorAt(n, tint); });
  });
  for (const m of [pineTrunk, ...pineLeaf]) { m.castShadow = true; m.receiveShadow = true; addTo(m); }
  // brambles along the verge edge so cars that leave the lane vanish into them
  const brambles = [];
  for (let i = 0; i < N; i += 2) for (const s of [-1, 1]) {
    if (rnd() < 0.3) continue;
    const w = s * (ROAD_W + SH[i] + 1.2 + rnd() * 1.6), x = P[i].x + NRM[i].x * w, z = P[i].z + NRM[i].z * w;
    if (!near(x, z)) brambles.push([x, z, 0.8 + rnd() * 1.0]);
  }
  const bramI = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), Math.max(1, brambles.length));
  brambles.forEach(([x, z, r], n) => { dummy.position.set(x, r * 0.5, z); dummy.rotation.set(rnd(), rnd() * 6, rnd()); dummy.scale.set(r * 1.3, r, r * 1.3); dummy.updateMatrix(); bramI.setMatrixAt(n, dummy.matrix); bramI.setColorAt(n, tint.setHex(rnd() < 0.5 ? 0x1e2e1f : 0x2a2a22)); });
  bramI.castShadow = true; addTo(bramI);

  // ----- low purple fog -----
  const fogTex = softTexture(150, 140, 190), banks = [];
  for (let k = 0; k < 40; k++) {
    const i = Math.floor(rnd() * N), p = trackPoint(i, (rnd() - 0.5) * 60);
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.25 + rnd() * 0.2, depthWrite: false, fog: false }));
    const sz = 35 + rnd() * 45; m.scale.set(sz, sz * 0.7, 1); m.rotation.x = -Math.PI / 2; m.rotation.z = rnd() * 6;
    m.position.set(p.x, 1.5 + rnd() * 5, p.z); m.userData.detail = true; addTo(m);
    banks.push({ m, vx: (rnd() - 0.5) * 2, vz: (rnd() - 0.5) * 2, ph: rnd() * 6, base: m.material.opacity });
  }

  // ----- ghosts drifting through the trees -----
  const ghostMat = new T.MeshStandardMaterial({ color: 0xe8fff8, emissive: 0x88ffe0, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, depthWrite: false });
  const eyeMat = new T.MeshBasicMaterial({ color: 0x050505 });
  const ghosts = [];
  for (let k = 0; k < 12; k++) {
    const g = new T.Group(); g.userData.dynamic = true;
    const head = new T.Mesh(new T.SphereGeometry(0.85, 14, 10), ghostMat); head.position.y = 2.2; g.add(head);
    const body = new T.Mesh(new T.ConeGeometry(1.0, 2.4, 14, 1, true), ghostMat); body.position.y = 1.1; body.rotation.x = Math.PI; g.add(body);
    for (const ex of [-0.3, 0.3]) { const e = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), eyeMat); e.position.set(ex, 2.35, 0.72); g.add(e); }
    const mouth = new T.Mesh(new T.SphereGeometry(0.18, 8, 6), eyeMat); mouth.scale.set(1, 1.5, 0.5); mouth.position.set(0, 1.95, 0.78); g.add(mouth);
    const i = Math.floor(rnd() * N), centre = trackPoint(i, (rnd() < 0.5 ? -1 : 1) * (ROAD_W + 6 + rnd() * 18));
    addTo(g);
    ghosts.push({ g, cx: centre.x, cz: centre.z, r: 5 + rnd() * 14, sp: (0.25 + rnd() * 0.4) * (rnd() < 0.5 ? -1 : 1), a: rnd() * 6, h: 1 + rnd() * 4, ph: rnd() * 6 });
  }

  // ----- the sounds of the hollow -----
  let soundT = 4;
  themeTick = (dt, t) => {
    for (const L of lanterns) {
      const f = 0.85 + 0.15 * Math.sin(t * 9 + L.ph) * Math.sin(t * 3.7 + L.ph * 2);
      L.glow.material.opacity = 0.7 * f; L.glow.scale.setScalar(4.2 + f);
      if (L.light) L.light.intensity = 60 * f;
    }
    for (const w of flicker) w.m.emissiveIntensity = Math.max(0, Math.sin(t * 2 + w.ph) * 0.8 + Math.sin(t * 13 + w.ph) * 0.4 + 0.7);
    for (const b of banks) { b.m.position.x += b.vx * dt; b.m.position.z += b.vz * dt; b.m.material.opacity = b.base * (0.7 + 0.3 * Math.sin(t * 0.25 + b.ph)); }
    for (const gh of ghosts) {
      gh.a += gh.sp * dt;
      const x = gh.cx + Math.cos(gh.a) * gh.r, z = gh.cz + Math.sin(gh.a) * gh.r;
      gh.g.position.set(x, gh.h + Math.sin(t * 1.6 + gh.ph) * 0.6, z);
      gh.g.rotation.y = Math.atan2(-Math.sin(gh.a) * gh.sp, Math.cos(gh.a) * gh.sp);
      gh.g.rotation.z = Math.sin(t * 2 + gh.ph) * 0.12;
    }
    ghostMat.opacity = 0.42 + Math.sin(t * 1.3) * 0.12;
    if (state === 'menu' || state === 'race' || state === 'countdown') {
      soundT -= dt;
      if (soundT <= 0) { soundT = 5 + Math.random() * 9; spookySound(); }
    }
  };
};

// ---------- Spooky sounds (all made up on the fly, no audio files) ----------
function spookyNode(pan) {
  const g = actx.createGain(); g.gain.value = 0;
  let out = g;
  if (actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(actx.destination); }
  else g.connect(actx.destination);
  return out;
}
function scream(vol = 0.07) {
  if (!actx) return;
  const t = actx.currentTime, g = spookyNode((Math.random() - 0.5) * 1.6);
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2.5; bp.connect(g);
  const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 7.5; lg.gain.value = 45; lfo.connect(lg);
  for (const det of [0, 9]) {
    const o = actx.createOscillator(); o.type = 'sawtooth'; o.detune.value = det * 10;
    o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(1250, t + 0.25); o.frequency.exponentialRampToValueAtTime(700, t + 1.3);
    lg.connect(o.frequency); o.connect(bp); o.start(t); o.stop(t + 1.4);
  }
  lfo.start(t); lfo.stop(t + 1.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.setValueAtTime(vol, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
}
function wail(vol = 0.05) {
  if (!actx) return;
  const t = actx.currentTime, g = spookyNode((Math.random() - 0.5) * 1.6), o = actx.createOscillator(), lfo = actx.createOscillator(), lg = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(260, t); o.frequency.linearRampToValueAtTime(560, t + 1.0); o.frequency.linearRampToValueAtTime(330, t + 2.4);
  lfo.frequency.value = 5; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); o.connect(g);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
  o.start(t); lfo.start(t); o.stop(t + 2.6); lfo.stop(t + 2.6);
}
function owl(vol = 0.07) {
  if (!actx) return;
  const t = actx.currentTime, g = spookyNode((Math.random() - 0.5) * 1.8);
  [[0, 0.32], [0.55, 0.22], [0.85, 0.45]].forEach(([s, d]) => {
    const o = actx.createOscillator(), e = actx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(390, t + s); o.frequency.linearRampToValueAtTime(340, t + s + d);
    e.gain.setValueAtTime(0.0001, t + s); e.gain.exponentialRampToValueAtTime(1, t + s + 0.05); e.gain.exponentialRampToValueAtTime(0.0001, t + s + d);
    o.connect(e); e.connect(g); o.start(t + s); o.stop(t + s + d + 0.05);
  });
  g.gain.setValueAtTime(vol, t);
}
function crow(vol = 0.05) {
  if (!actx) return;
  const t = actx.currentTime, g = spookyNode((Math.random() - 0.5) * 1.8), bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 4; bp.connect(g);
  const n = 2 + Math.floor(Math.random() * 2);
  for (let k = 0; k < n; k++) {
    const s = k * 0.32, o = actx.createOscillator(), e = actx.createGain(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(950, t + s); o.frequency.exponentialRampToValueAtTime(620, t + s + 0.2);
    e.gain.setValueAtTime(0.0001, t + s); e.gain.exponentialRampToValueAtTime(1, t + s + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + s + 0.22);
    o.connect(e); e.connect(bp); o.start(t + s); o.stop(t + s + 0.25);
  }
  g.gain.setValueAtTime(vol, t);
}
function wind(vol = 0.06) {
  if (!actx) return;
  const t = actx.currentTime, len = Math.floor(actx.sampleRate * 3.5), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = actx.createBufferSource(); s.buffer = buf;
  const lp = actx.createBiquadFilter(); lp.type = 'bandpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(900, t + 1.6); lp.frequency.linearRampToValueAtTime(350, t + 3.4);
  const g = spookyNode((Math.random() - 0.5)); s.connect(lp); lp.connect(g);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
  s.start(t); s.stop(t + 3.5);
}
function spookySound() {
  const r = Math.random();
  if (r < 0.28) owl(); else if (r < 0.5) wind(); else if (r < 0.7) wail(); else if (r < 0.86) crow(); else scream();
}
