// ---------- Creatures (viewer cards) ----------
// One creature on the track at a time. They cause chaos but never knock a car out directly:
// cars bounce off Bigfoot and spin when the Ghost car passes through them.
let creature = null;

function trackPoint(i, lat, y = 0) { const k = ((i % N) + N) % N; return new T.Vector3(P[k].x + NRM[k].x * lat, y, P[k].z + NRM[k].z * lat); }
function leadCar() { const a = activeCars().filter(c => c.alive && !c.falling); return a.length ? a.reduce((x, y) => (y.prog > x.prog ? y : x)) : null; }
function backCar() { const a = activeCars().filter(c => c.alive && !c.falling); return a.length ? a.reduce((x, y) => (y.prog < x.prog ? y : x)) : null; }
function clearCreature() { if (creature) { scene.remove(creature.g); creature = null; } }

// ----- Bigfoot: strides across the road ahead of the leader -----
function makeBigfoot() {
  const g = new T.Group();
  const fur = new T.MeshStandardMaterial({ color: 0x5a3d26, roughness: 1, flatShading: true });
  const dark = new T.MeshStandardMaterial({ color: 0x3a2716, roughness: 1, flatShading: true });
  const face = new T.MeshStandardMaterial({ color: 0x8d6e58, roughness: 1, flatShading: true });
  const part = (geo, mat, x, y, z, parent = g) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  part(new T.BoxGeometry(2.6, 3.0, 1.6), fur, 0, 4.4, 0);                  // body
  part(new T.BoxGeometry(2.2, 0.9, 1.5), fur, 0, 6.2, -0.1);               // shoulders
  const head = part(new T.BoxGeometry(1.3, 1.3, 1.3), fur, 0, 7.2, 0.2);
  part(new T.BoxGeometry(0.9, 0.7, 0.2), face, 0, 7.05, 0.86);             // face
  for (const x of [-0.25, 0.25]) part(new T.BoxGeometry(0.14, 0.14, 0.05), new T.MeshBasicMaterial({ color: 0xfff176 }), x, 7.2, 0.97);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(s * 0.7, 2.9, 0); g.add(leg);
    part(new T.BoxGeometry(0.9, 2.9, 1.0), dark, 0, -1.45, 0, leg);
    part(new T.BoxGeometry(1.0, 0.35, 1.7), dark, 0, -2.75, 0.3, leg);     // big feet
    legs.push(leg);
    const arm = new T.Group(); arm.position.set(s * 1.55, 6.0, 0); g.add(arm);
    part(new T.BoxGeometry(0.7, 3.3, 0.8), fur, 0, -1.6, 0, arm);
    arms.push(arm);
  }
  return { g, legs, arms, head };
}
function spawnBigfoot() {
  if (creature || state !== 'race') return false;
  const lead = leadCar(); if (!lead) return false;
  const idx = lead.idx + Math.round(55 / SPACING);
  const side = Math.random() < 0.5 ? -1 : 1, edge = ROAD_W + 2;
  const b = makeBigfoot();
  const from = trackPoint(idx, side * edge), to = trackPoint(idx, -side * edge);
  b.g.scale.setScalar(1.5); b.g.position.copy(from); b.g.lookAt(to.x, 0, to.z);
  scene.add(b.g);
  creature = { kind: 'bigfoot', ...b, from, to, t: 0, dur: 4.5, R: 3.2, hit: new Set() };
  noise(0.9, 0.35, 220); tone(90, 0.9, 'sawtooth', 0.12, -40);
  return true;
}

// ----- Ghost car: a see-through phantom that races through the pack -----
function spawnGhost() {
  if (creature || state !== 'race') return false;
  const back = backCar(); if (!back) return false;
  const m = makeCarMesh(0xffffff);
  const mat = new T.MeshBasicMaterial({ color: 0xc8fff4, transparent: true, opacity: 0.38, depthWrite: false });
  m.group.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  const glow = new T.PointLight(0x9effe5, 60, 18, 2); glow.position.y = 1.5; m.group.add(glow);
  scene.add(m.group);
  const startIdx = back.idx - Math.round(30 / SPACING);
  creature = { kind: 'ghost', g: m.group, mat, prog: startIdx, t: 0, dur: 9, R: 2.6, hit: new Set(), phase: Math.random() * 6 };
  tone(660, 1.2, 'sine', 0.08, -420); setTimeout(() => tone(520, 1.0, 'sine', 0.06, -300), 250);
  return true;
}

function updateCreature(dt) {
  if (!creature) return;
  const c = creature;
  c.t += dt;
  if (c.kind === 'bigfoot') {
    const f = Math.min(1, c.t / c.dur);
    c.g.position.lerpVectors(c.from, c.to, f);
    const swing = Math.sin(c.t * 6);
    c.legs[0].rotation.x = swing * 0.6; c.legs[1].rotation.x = -swing * 0.6;
    c.arms[0].rotation.x = -swing * 0.5; c.arms[1].rotation.x = swing * 0.5;
    c.g.position.y = Math.abs(Math.sin(c.t * 6)) * 0.25;
    if (Math.floor(c.t * 2) !== c.step) { c.step = Math.floor(c.t * 2); noise(0.12, 0.2, 180); }
    // cars bounce off him like a wall
    for (const car of cars) {
      if (!car.active || !car.alive || car.falling) continue;
      const dx = car.pos.x - c.g.position.x, dz = car.pos.z - c.g.position.z, d = Math.hypot(dx, dz), min = c.R + 1.6;
      if (d >= min || d === 0) continue;
      const nx = dx / d, nz = dz / d;
      car.pos.x = c.g.position.x + nx * min; car.pos.z = c.g.position.z + nz * min;
      const vn = car.vel.x * nx + car.vel.y * nz;
      if (vn < 0) { car.vel.x -= nx * vn * 1.7; car.vel.y -= nz * vn * 1.7; }
      if (!c.hit.has(car)) {
        c.hit.add(car); car.spin = 0.3; burst(car.pos.x, 1.5, car.pos.z, 0x8d6e58, 14, 7, 6, 0.6);
        noise(0.25, 0.35, 300); rumble(car, 0.9, 0.9, 300);
        toast(`<b style="color:${car.color.css}">${car.color.name}</b> bounced off Bigfoot!`);
      }
    }
    if (f >= 1) clearCreature();
  } else if (c.kind === 'ghost') {
    c.prog += (52 * dt) / SPACING;
    const i = Math.floor(c.prog), lat = Math.sin(c.t * 1.7 + c.phase) * 4.5;
    const p = trackPoint(i, lat, 0.25 + Math.sin(c.t * 3) * 0.25), q = trackPoint(i + 4, lat);
    c.g.position.copy(p); c.g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    c.mat.opacity = 0.28 + Math.sin(c.t * 8) * 0.1;
    if (Math.random() < 0.5) burst(p.x, 0.8, p.z, 0xb2fff0, 1, 1, 1, 0.5);
    for (const car of cars) {
      if (!car.active || !car.alive || car.falling || c.hit.has(car)) continue;
      if (Math.hypot(car.pos.x - p.x, car.pos.z - p.z) < c.R + 1.4) {
        c.hit.add(car); car.spin = 0.55; car.vel.multiplyScalar(0.6);
        burst(car.pos.x, 1.2, car.pos.z, 0xb2fff0, 16, 6, 5, 0.7);
        tone(880, 0.4, 'sine', 0.07, -500); rumble(car, 0.5, 1, 350);
        toast(`<b style="color:${car.color.css}">${car.color.name}</b> was spooked by the Ghost car!`);
      }
    }
    const lead = leadCar();
    const ahead = lead ? (((Math.floor(c.prog) - lead.idx) % N) + N) % N : 0;
    if (c.t > c.dur || (c.t > 3 && ahead > 70 / SPACING && ahead < N / 2)) clearCreature();
  }
}
window.__creature = { spawnBigfoot, spawnGhost, get current() { return creature && creature.kind; } };
