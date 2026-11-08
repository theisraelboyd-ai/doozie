// ---------- Cars ----------
function makeCarMesh(color, type = 'classic') {
  const g = new T.Group();
  const paint = new T.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new T.MeshPhysicalMaterial({ color: 0x1c2a3a, roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const chrome = new T.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.15, metalness: 1 });
  const dark = new T.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.3 });
  const tyre = new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const head = new T.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xfff3c4, emissiveIntensity: 4 });
  const tail = new T.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff1744, emissiveIntensity: 3 });
  const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const B = (w, h, d, mat, x, y, z) => add(new T.BoxGeometry(w, h, d), mat, x, y, z);
  const wheel = (r, w, x, y, z) => {
    const wg = new T.CylinderGeometry(r, r, w, 14); wg.rotateZ(Math.PI / 2); add(wg, tyre, x, y, z);
    const hg = new T.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 10); hg.rotateZ(Math.PI / 2); add(hg, chrome, x, y, z);
  };
  const lights = (y, zf, zr, spread = 0.65) => { for (const x of [-spread, spread]) { B(0.4, 0.25, 0.1, head, x, y, zf); B(0.4, 0.2, 0.1, tail, x, y, zr); } };
  let hlY = 1.0, hlZ = 2.0, shadowScale = [0.75, 1.1];
  if (type === 'racer') {
    B(2.0, 0.5, 4.4, paint, 0, 0.55, 0);
    const nose = B(1.6, 0.35, 1.3, paint, 0, 0.72, 1.75); nose.rotation.x = 0.18;
    B(0.5, 0.36, 3.6, paint, -0.95, 0.85, -0.1); B(0.5, 0.36, 3.6, paint, 0.95, 0.85, -0.1); // side pods
    const bub = add(new T.SphereGeometry(0.62, 12, 8), glass, 0, 1.0, -0.15); bub.scale.set(1.2, 0.75, 1.8);
    B(0.12, 0.7, 0.12, dark, -0.7, 1.15, -1.95); B(0.12, 0.7, 0.12, dark, 0.7, 1.15, -1.95);
    B(2.4, 0.1, 0.65, paint, 0, 1.52, -2.0); B(0.08, 0.45, 0.7, dark, -1.2, 1.4, -2.0); B(0.08, 0.45, 0.7, dark, 1.2, 1.4, -2.0);
    for (const [x, z] of [[-1.1, 1.35], [1.1, 1.35]]) wheel(0.42, 0.4, x, 0.42, z);
    for (const [x, z] of [[-1.12, -1.35], [1.12, -1.35]]) wheel(0.5, 0.55, x, 0.5, z);
    lights(0.62, 2.22, -2.22, 0.55); hlY = 0.7; hlZ = 2.3;
  } else if (type === 'buggy') {
    B(1.7, 0.25, 3.3, dark, 0, 0.6, 0);
    const nose = B(1.5, 0.45, 1.0, paint, 0, 0.85, 1.35); nose.rotation.x = -0.2;
    B(0.35, 0.5, 1.8, paint, -0.85, 0.9, -0.1); B(0.35, 0.5, 1.8, paint, 0.85, 0.9, -0.1);
    B(1.2, 0.7, 0.9, dark, 0, 1.0, -1.35); // engine
    const pipe = new T.CylinderGeometry(0.07, 0.07, 1.6, 6);
    for (const [x, z] of [[-0.7, 0.45], [0.7, 0.45], [-0.7, -0.75], [0.7, -0.75]]) add(pipe, chrome, x, 1.55, z);
    B(1.55, 0.12, 0.12, chrome, 0, 2.35, 0.45); B(1.55, 0.12, 0.12, chrome, 0, 2.35, -0.75);
    B(0.12, 0.12, 1.32, chrome, -0.7, 2.35, -0.15); B(0.12, 0.12, 1.32, chrome, 0.7, 2.35, -0.15);
    B(0.9, 0.6, 0.15, dark, 0, 1.15, -0.55); // seat back
    for (const [x, z] of [[-1.05, 1.25], [1.05, 1.25]]) wheel(0.45, 0.4, x, 0.45, z);
    for (const [x, z] of [[-1.15, -1.25], [1.15, -1.25]]) wheel(0.62, 0.6, x, 0.62, z);
    lights(0.95, 1.86, -1.82, 0.45); hlY = 1.0; hlZ = 1.9; shadowScale = [0.8, 1.0];
  } else if (type === 'monster') {
    const lift = 1.15;
    B(2.1, 0.8, 3.8, paint, 0, 0.75 + lift, 0); B(2.0, 0.4, 1.0, paint, 0, 1.25 + lift, 1.2);
    B(1.7, 0.7, 1.7, glass, 0, 1.5 + lift, -0.3); B(1.75, 0.15, 1.5, paint, 0, 1.9 + lift, -0.3);
    B(2.3, 0.3, 0.3, chrome, 0, 0.5 + lift, 1.95); B(2.3, 0.3, 0.3, chrome, 0, 0.5 + lift, -1.95);
    B(1.4, 0.3, 3.2, dark, 0, 1.1, 0); // chassis
    const strut = new T.CylinderGeometry(0.1, 0.1, 1.2, 6);
    for (const [x, z] of [[-1.0, 1.3], [1.0, 1.3], [-1.0, -1.3], [1.0, -1.3]]) { add(strut, chrome, x, 1.3, z).rotation.z = x > 0 ? -0.5 : 0.5; wheel(1.0, 0.85, x * 1.4, 1.0, z); }
    lights(0.85 + lift, 1.92, -1.92); hlY = 2.1; hlZ = 2.0; shadowScale = [1.25, 1.35];
  } else if (type === 'van') {
    B(2.2, 1.7, 4.3, paint, 0, 1.35, -0.1);
    B(2.25, 0.35, 4.35, dark, 0, 0.55, -0.1);
    const ws = B(2.0, 0.9, 0.12, glass, 0, 1.75, 2.08); ws.rotation.x = -0.25;
    for (const x of [-1.11, 1.11]) { B(0.04, 0.6, 1.2, glass, x, 1.75, 1.3); B(0.04, 0.6, 1.6, glass, x, 1.75, -0.8); }
    B(1.6, 0.18, 2.4, dark, 0, 2.3, -0.4); // roof rack
    for (const [x, z] of [[-1.1, 1.35], [1.1, 1.35], [-1.1, -1.45], [1.1, -1.45]]) wheel(0.5, 0.42, x, 0.5, z);
    lights(0.95, 2.12, -2.27, 0.7); hlY = 1.0; hlZ = 2.2; shadowScale = [0.8, 1.2];
  } else {
    B(2.1, 0.8, 3.8, paint, 0, 0.75, 0); B(2.0, 0.4, 1.0, paint, 0, 1.25, 1.2);
    B(1.7, 0.7, 1.7, glass, 0, 1.5, -0.3); B(1.75, 0.15, 1.5, paint, 0, 1.9, -0.3);
    B(2.2, 0.25, 0.25, chrome, 0, 0.45, 1.95); B(2.2, 0.25, 0.25, chrome, 0, 0.45, -1.95);
    for (const [x, z] of [[-1.1, 1.2], [1.1, 1.2], [-1.1, -1.2], [1.1, -1.2]]) wheel(0.45, 0.4, x, 0.45, z);
    lights(0.85, 1.92, -1.92);
  }
  const shadow = new T.Mesh(new T.CircleGeometry(2.1, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.09; shadow.scale.set(shadowScale[0], shadowScale[1], 1);
  const ring = new T.Mesh(new T.RingGeometry(2.6, 3.1, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1;
  // headlight beams, switched on for night tracks
  const hl = new T.SpotLight(0xfff1d6, 0, 46, 0.55, 0.55, 1.4); hl.position.set(0, hlY, hlZ);
  const tgt = new T.Object3D(); tgt.position.set(0, 0, 16); g.add(tgt); hl.target = tgt; hl.visible = false; g.add(hl);
  g.userData.headlight = hl;
  return { group: g, shadow, ring };
}
// swap a car's body (keeps its colour, position and state)
function setCarType(c, type) {
  if (type === 'random') type = CAR_ORDER[Math.floor(Math.random() * (CAR_ORDER.length - 1))];
  c.stats = CAR_TYPES[type];
  if (c.type === type) return;
  c.type = type;
  const old = c.mesh, vis = old.group.visible;
  scene.remove(old.group); scene.remove(old.shadow); scene.remove(old.ring);
  old.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  old.shadow.geometry.dispose(); old.ring.geometry.dispose();
  const m = makeCarMesh(c.color.hex, type);
  m.group.position.copy(old.group.position); m.group.rotation.copy(old.group.rotation);
  m.group.visible = m.shadow.visible = m.ring.visible = vis;
  scene.add(m.group); scene.add(m.shadow); scene.add(m.ring);
  c.mesh = m;
}

const cars = COLORS.map((c, i) => {
  const m = makeCarMesh(c.hex);
  scene.add(m.group); scene.add(m.shadow); scene.add(m.ring);
  m.group.visible = m.shadow.visible = m.ring.visible = false;
  return {
    i, color: c, mesh: m, pos: new T.Vector3(), vel: new T.Vector2(), h: 0, y: 0, vy: 0,
    active: false, human: false, alive: false, falling: false, idx: 0, prog: 0,
    off: 0, warn: 0, boostCd: 0, points: 0, ai: { lane: 0, laneT: 0, stuck: 0, rev: 0 },
    spin: 0, type: 'classic', stats: CAR_TYPES.classic,
  };
});
