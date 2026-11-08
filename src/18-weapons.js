// ---------- Weapons & pickups ----------
// Crates sit across the road at a few spots each lap. Drive through one with empty hands and you
// get a random item (cars at the back get the nastier ones). Press FIRE to use it.
// Everything here pushes, spins or slows cars; the camera and the edges do the knocking out.
const ITEMS = {
  oil:     { icon: '🛢️', name: 'Oil slick',     ammo: 1 },
  mine:    { icon: '💣', name: 'Mines',         ammo: 2 },
  missile: { icon: '🚀', name: 'Missile',       ammo: 1 },
  homing:  { icon: '🎯', name: 'Homing missile', ammo: 1 },
  gun:     { icon: '🔫', name: 'Machine gun',   ammo: 1 },
  flame:   { icon: '🔥', name: 'Flamethrower',  ammo: 1 },
  mortar:  { icon: '☄️', name: 'Mortar',        ammo: 3 },
  drum:    { icon: '🧨', name: 'Drum bomb',     ammo: 1 },
  shock:   { icon: '💥', name: 'Shockwave',     ammo: 1 },
  shield:  { icon: '🛡️', name: 'Shield',        ammo: 1 },
  ram:     { icon: '🐏', name: 'Ram boost',     ammo: 1 },
};
// weights by race position: [leader … last]
const ROLL = {
  front: { oil: 4, mine: 4, drum: 3, shield: 3, gun: 2, missile: 2, flame: 2, mortar: 1, shock: 1, homing: 0, ram: 1 },
  back:  { oil: 1, mine: 1, drum: 1, shield: 2, gun: 2, missile: 3, flame: 2, mortar: 3, shock: 3, homing: 4, ram: 3 },
};
const CRATE_SPOTS = [0.08, 0.25, 0.42, 0.58, 0.75, 0.92];
let crates = [], crateTrack = null;
const shots = [];    // moving things: missiles, shells, bullets, drums
const hazards = [];  // things on the ground: oil, mines
const crateTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, '#ffd54f'); g.addColorStop(1, '#ff8f00');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#5d4037'; c.lineWidth = 10; c.strokeRect(5, 5, 118, 118);
  c.fillStyle = '#fff'; c.font = 'bold 86px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 8; c.strokeStyle = '#5d4037'; c.strokeText('?', 64, 70); c.fillText('?', 64, 70);
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
})();
const crateGeo = new T.BoxGeometry(1.8, 1.8, 1.8);
const crateMat = new T.MeshStandardMaterial({ map: crateTex, emissive: 0xffa000, emissiveIntensity: 0.35, roughness: 0.5 });

function setupCrates() {
  for (const c of crates) scene.remove(c.m);
  crates = [];
  for (const f of CRATE_SPOTS) {
    const i = Math.floor(f * N);
    for (const lat of [-4.2, 0, 4.2]) {
      const m = new T.Mesh(crateGeo, crateMat); m.castShadow = true;
      const p = trackPoint(i, lat, 1.4); m.position.copy(p); scene.add(m);
      crates.push({ m, x: p.x, z: p.z, gone: 0, ph: Math.random() * 6 });
    }
  }
  crateTrack = curTrack.id;
}
function resetWeapons() {
  if (crateTrack !== curTrack.id) setupCrates();
  for (const c of crates) { c.gone = 0; c.m.visible = settings.weapons; }
  for (const s of shots) scene.remove(s.m);
  for (const h of hazards) scene.remove(h.m);
  shots.length = 0; hazards.length = 0;
  for (const c of cars) { c.item = null; c.ammo = 0; c.shield = 0; c.slip = 0; c.burn = 0; c.ram = 0; c.gunT = 0; c.flameT = 0; c.firePrev = false; if (c.shieldMesh) c.shieldMesh.visible = false; }
}

function rankOf(car) {
  const alive = activeCars().filter(c => c.alive && !c.falling).sort((a, b) => b.prog - a.prog);
  return { r: Math.max(0, alive.indexOf(car)), n: alive.length };
}
function rollItem(car) {
  const { r, n } = rankOf(car), k = n > 1 ? r / (n - 1) : 0;
  const keys = Object.keys(ITEMS), w = keys.map(id => ROLL.front[id] * (1 - k) + ROLL.back[id] * k + 0.01);
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < keys.length; i++) { x -= w[i]; if (x <= 0) return keys[i]; }
  return keys[0];
}
function giveItem(car, id) {
  car.item = id; car.ammo = ITEMS[id].ammo;
  if (car.human) tone(1040, 0.08, 'square', 0.06);
  phoneItem(car);
}

// ----- shared effects -----
function shielded(car) {
  if (car.shield > 0) {
    car.shield = 0; if (car.shieldMesh) car.shieldMesh.visible = false;
    burst(car.pos.x, 1.2, car.pos.z, 0x80d8ff, 20, 7, 4, 0.5); tone(1200, 0.25, 'triangle', 0.08, -600);
    return true;
  }
  return false;
}
function shove(car, nx, nz, power, up = 0, spin = 0) {
  if (shielded(car)) return;
  car.vel.x += nx * power; car.vel.y += nz * power;
  if (up) { car.vy = Math.max(car.vy, up); car.y = Math.max(car.y, 0.01); }
  if (spin) car.spin = Math.max(car.spin, spin);
  rumble(car, Math.min(1, power / 25), 0.8, 250);
}
function blast(x, z, R, power, color = 0xff6f00) {
  burst(x, 1, z, color, 22, 11, 11, 0.8); burst(x, 1, z, 0xffeb3b, 12, 8, 9, 0.5); burst(x, 1, z, 0x616161, 8, 4, 5, 1.1);
  noise(0.45, 0.4, 500); tone(110, 0.35, 'square', 0.09, -70);
  for (const c of cars) {
    if (!c.active || !c.alive || c.falling) continue;
    const dx = c.pos.x - x, dz = c.pos.z - z, d = Math.hypot(dx, dz);
    if (d > R) continue;
    const s = 1 - d / R, nx = d > 0.01 ? dx / d : Math.random() - 0.5, nz = d > 0.01 ? dz / d : Math.random() - 0.5;
    shove(c, nx, nz, 8 + power * s, 5 + 8 * s, 0.25 + 0.4 * s);
  }
}
function fwd(car) { return { x: Math.sin(car.h), z: Math.cos(car.h) }; }
function aliveOthers(car) { return activeCars().filter(o => o !== car && o.alive && !o.falling && !(o.ghostT > 0) && !sameTeam(o, car)); }
// nearest rival in a cone ahead (dir = 1) or behind (dir = -1)
function rivalInCone(car, dir, range, cosLimit) {
  const f = fwd(car); let best = null, bd = range;
  for (const o of aliveOthers(car)) {
    const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z, d = Math.hypot(dx, dz);
    if (d > bd || d < 0.1) continue;
    if ((dx * f.x + dz * f.z) / d * dir < cosLimit) continue;
    best = o; bd = d;
  }
  return best;
}
const shotGeo = { missile: new T.ConeGeometry(0.45, 2.2, 8).rotateX(Math.PI / 2), shell: new T.SphereGeometry(0.55, 10, 8), bullet: new T.BoxGeometry(0.18, 0.18, 1.1), drum: new T.CylinderGeometry(0.9, 0.9, 1.6, 12).rotateZ(Math.PI / 2) };
const shotMat = {
  missile: new T.MeshStandardMaterial({ color: 0xe0e0e0, emissive: 0xff3d00, emissiveIntensity: 1.2 }),
  homing: new T.MeshStandardMaterial({ color: 0xffcdd2, emissive: 0xff1744, emissiveIntensity: 1.6 }),
  shell: new T.MeshStandardMaterial({ color: 0x37474f, emissive: 0xff6d00, emissiveIntensity: 0.8 }),
  bullet: new T.MeshBasicMaterial({ color: new T.Color(3, 2.6, 1) }),
  drum: new T.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5, metalness: 0.4 }),
};
function addShot(kind, car, extra) {
  const m = new T.Mesh(shotGeo[kind === 'homing' ? 'missile' : kind], shotMat[kind]); m.castShadow = true;
  const f = fwd(car), back = kind === 'drum' ? -1 : 1;
  m.position.set(car.pos.x + f.x * 3 * back, kind === 'drum' ? 0.9 : 1.1, car.pos.z + f.z * 3 * back);
  scene.add(m);
  const s = { kind, m, owner: car, t: 0, vx: f.x, vz: f.z, ...extra };
  shots.push(s); return s;
}
function dropHazard(kind, car) {
  const f = fwd(car), x = car.pos.x - f.x * 3.2, z = car.pos.z - f.z * 3.2;
  let m;
  if (kind === 'oil') { m = new T.Mesh(new T.CircleGeometry(3.2, 20), new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z); }
  else { m = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(0.7, 0.8, 0.35, 12), new T.MeshStandardMaterial({ color: 0x263238, metalness: 0.6, roughness: 0.4 })); m.add(body); const led = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), new T.MeshBasicMaterial({ color: 0xff1744 })); led.position.y = 0.25; m.add(led); m.userData.led = led; m.position.set(x, 0.18, z); }
  scene.add(m);
  hazards.push({ kind, m, x, z, t: 0, owner: car, life: kind === 'oil' ? 22 : 30, armed: kind === 'oil' ? 0 : 1.0 });
}

// ----- using items -----
function useItem(car) {
  if (!car.item || !settings.weapons) return;
  const id = car.item, f = fwd(car);
  switch (id) {
    case 'oil': dropHazard('oil', car); noise(0.3, 0.15, 900); break;
    case 'mine': dropHazard('mine', car); tone(500, 0.08, 'square', 0.05); break;
    case 'missile': addShot('missile', car, { speed: 70, life: 2.2 }); tone(700, 0.4, 'sawtooth', 0.06, -300); break;
    case 'homing': addShot('homing', car, { speed: 55, life: 3.5, target: rivalInCone(car, 1, 90, 0.2) || aliveOthers(car).sort((a, b) => b.prog - a.prog)[0] }); tone(900, 0.5, 'sawtooth', 0.06, -500); break;
    case 'gun': car.gunT = 0.9; break;
    case 'flame': car.flameT = 1.4; break;
    case 'mortar': {
      const tgt = rivalInCone(car, 1, 70, 0.3);
      const tx = tgt ? tgt.pos.x + tgt.vel.x * 0.8 : car.pos.x + f.x * 35, tz = tgt ? tgt.pos.z + tgt.vel.y * 0.8 : car.pos.z + f.z * 35;
      addShot('shell', car, { sx: car.pos.x, sz: car.pos.z, tx, tz, dur: 1.1, life: 1.1 }); tone(300, 0.3, 'square', 0.07, 200); break;
    }
    case 'drum': addShot('drum', car, { speed: -6, life: 7, vx: -f.x, vz: -f.z }); tone(200, 0.2, 'square', 0.05); break;
    case 'shock':
      burst(car.pos.x, 1, car.pos.z, 0x80d8ff, 40, 16, 3, 0.6); noise(0.4, 0.35, 900); tone(160, 0.5, 'sine', 0.12, -100);
      for (const o of aliveOthers(car)) { const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z, d = Math.hypot(dx, dz); if (d < 16 && d > 0.1) shove(o, dx / d, dz / d, 26 * (1 - d / 20), 3, 0.2); }
      break;
    case 'shield':
      car.shield = 10;
      if (!car.shieldMesh) { car.shieldMesh = new T.Mesh(new T.SphereGeometry(2.9, 20, 14), new T.MeshBasicMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.22, depthWrite: false })); scene.add(car.shieldMesh); }
      car.shieldMesh.visible = true; tone(880, 0.3, 'triangle', 0.07, 300); break;
    case 'ram': car.ram = 3.5; car.vel.x += f.x * 18; car.vel.y += f.z * 18; tone(150, 0.6, 'sawtooth', 0.09, 300); break;
  }
  car.ammo--;
  if (car.ammo <= 0) car.item = null;
  phoneItem(car);
}

// ----- per-frame update -----
function updateWeapons(dt, now) {
  if (!settings.weapons) return;
  // crates: spin, bob, get picked up, come back after a few seconds
  for (const c of crates) {
    if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) c.m.visible = true; continue; }
    c.ph += dt; c.m.rotation.y += dt * 1.6; c.m.position.y = 1.4 + Math.sin(c.ph * 2) * 0.25;
    if (state !== 'race') continue;
    for (const car of cars) {
      if (!car.active || !car.alive || car.falling) continue;
      if (Math.hypot(car.pos.x - c.x, car.pos.z - c.z) < 2.3) {
        c.gone = 4; c.m.visible = false; burst(c.x, 1.4, c.z, 0xffb300, 12, 6, 6, 0.5);
        if (!car.item) giveItem(car, rollItem(car));
        break;
      }
    }
  }
  // car states
  for (const car of cars) {
    if (!car.active) continue;
    if (car.shield > 0) { car.shield -= dt; if (car.shieldMesh) { car.shieldMesh.position.set(car.pos.x, car.y + 1.1, car.pos.z); car.shieldMesh.material.opacity = 0.18 + Math.sin(now * 8) * 0.06; if (car.shield <= 0 || !car.alive) car.shieldMesh.visible = false; } }
    if (car.slip > 0) car.slip -= dt;
    if (car.ram > 0) { car.ram -= dt; if (Math.random() < 0.6) burst(car.pos.x, 0.8, car.pos.z, 0xff5722, 1, 2, 2, 0.4); }
    if (car.burn > 0) { car.burn -= dt; if (Math.random() < 0.5) burst(car.pos.x, 1.4, car.pos.z, Math.random() < 0.5 ? 0xff6d00 : 0x424242, 1, 1.5, 3, 0.6); }
    if (!car.alive || car.falling) { car.gunT = car.flameT = 0; continue; }
    const f = fwd(car);
    if (car.gunT > 0) { // machine gun: a stream of tracer rounds
      car.gunT -= dt; car.gunAcc = (car.gunAcc || 0) + dt;
      while (car.gunAcc > 0.07) { car.gunAcc -= 0.07; const b = addShot('bullet', car, { speed: 95, life: 0.6 }); b.m.rotation.y = car.h; tone(1500, 0.03, 'square', 0.025); }
    }
    if (car.flameT > 0) { // flamethrower: a cone of fire behind the car
      car.flameT -= dt;
      for (let k = 0; k < 3; k++) burst(car.pos.x - f.x * (3 + Math.random() * 7), 0.9, car.pos.z - f.z * (3 + Math.random() * 7), Math.random() < 0.6 ? 0xff6d00 : 0xffd54f, 1, 3, 1, 0.35);
      if (Math.random() < 0.3) noise(0.08, 0.08, 1500);
      for (const o of aliveOthers(car)) {
        const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z, d = Math.hypot(dx, dz);
        if (d < 11 && (dx * f.x + dz * f.z) / (d || 1) < -0.75) { if (o.burn <= 0 && !shielded(o)) { o.burn = 2.2; rumble(o, 0.4, 0.8, 300); } }
      }
    }
  }
  // moving shots
  for (let k = shots.length - 1; k >= 0; k--) {
    const s = shots[k]; s.t += dt;
    let done = s.t > s.life, hitCar = null;
    if (s.kind === 'shell') { // lobbed: arc to the target spot
      const f2 = Math.min(1, s.t / s.dur);
      s.m.position.set(s.sx + (s.tx - s.sx) * f2, 1 + Math.sin(f2 * Math.PI) * 18, s.sz + (s.tz - s.sz) * f2);
      if (f2 >= 1) { blast(s.tx, s.tz, 9, 18); done = true; }
    } else {
      if (s.kind === 'homing' && s.target && s.target.alive && !s.target.falling) {
        const dx = s.target.pos.x - s.m.position.x, dz = s.target.pos.z - s.m.position.z, d = Math.hypot(dx, dz) || 1;
        const turn = Math.min(1, dt * 3.2); s.vx += (dx / d - s.vx) * turn; s.vz += (dz / d - s.vz) * turn;
        const l = Math.hypot(s.vx, s.vz) || 1; s.vx /= l; s.vz /= l;
      }
      if (s.kind === 'drum') { s.m.rotation.x += dt * 4; s.speed *= Math.exp(-0.3 * dt); s.m.rotation.y = Math.atan2(s.vx, s.vz); }
      const sp = Math.abs(s.speed);
      s.m.position.x += s.vx * sp * dt; s.m.position.z += s.vz * sp * dt;
      if (s.kind !== 'drum') s.m.rotation.y = Math.atan2(s.vx, s.vz);
      if (s.kind !== 'bullet' && Math.random() < 0.7) burst(s.m.position.x, s.m.position.y, s.m.position.z, 0xbdbdbd, 1, 1, 0, 0.35);
      for (const o of cars) {
        if (!o.active || !o.alive || o.falling || (o === s.owner && s.t < 0.5)) continue;
        if (Math.hypot(o.pos.x - s.m.position.x, o.pos.z - s.m.position.z) < (s.kind === 'drum' ? 2.4 : 2.0)) { hitCar = o; break; }
      }
      if (hitCar) {
        done = true;
        if (s.kind === 'bullet') { if (!shielded(hitCar)) { hitCar.vel.x += s.vx * 3.5; hitCar.vel.y += s.vz * 3.5; hitCar.vel.multiplyScalar(0.97); burst(s.m.position.x, 1.1, s.m.position.z, 0xffeb3b, 3, 4, 2, 0.25); } }
        else blast(s.m.position.x, s.m.position.z, s.kind === 'drum' ? 10 : 7, s.kind === 'drum' ? 22 : 18);
      } else if (done && s.kind === 'drum') blast(s.m.position.x, s.m.position.z, 10, 20);
    }
    if (done) { scene.remove(s.m); shots.splice(k, 1); }
  }
  // ground hazards
  for (let k = hazards.length - 1; k >= 0; k--) {
    const h = hazards[k]; h.t += dt;
    let done = h.t > h.life;
    if (h.kind === 'mine' && h.m.userData.led) h.m.userData.led.visible = h.t > h.armed && Math.sin(now * 10) > 0;
    for (const o of cars) {
      if (!o.active || !o.alive || o.falling || done) continue;
      const d = Math.hypot(o.pos.x - h.x, o.pos.z - h.z);
      if (h.kind === 'oil' && d < 3.2 && o.slip <= 0) { o.slip = 1.4; o.spin = Math.max(o.spin, 0.35); rumble(o, 0.3, 0.6, 250); }
      if (h.kind === 'mine' && d < 2.1 && h.t > h.armed) { blast(h.x, h.z, 8, 22); done = true; }
    }
    if (h.kind === 'oil') h.m.material.opacity = Math.min(0.85, (h.life - h.t) / 3);
    if (done) { scene.remove(h.m); hazards.splice(k, 1); }
  }
}

// ----- computer drivers: when to fire -----
function aiWantsFire(car) {
  if (!car.item || car.gunT > 0 || car.flameT > 0) return false;
  const id = car.item;
  if (id === 'shield' || id === 'ram') return Math.random() < 0.01;
  if (id === 'shock') return aliveOthers(car).some(o => Math.hypot(o.pos.x - car.pos.x, o.pos.z - car.pos.z) < 9);
  if (id === 'oil' || id === 'mine' || id === 'drum' || id === 'flame') return !!rivalInCone(car, -1, id === 'flame' ? 10 : 22, 0.7);
  if (id === 'homing' || id === 'mortar') return !!rivalInCone(car, 1, 70, 0.3) || Math.random() < 0.004;
  return !!rivalInCone(car, 1, id === 'gun' ? 30 : 45, 0.94);
}

// tell a phone driver what they're holding
function phoneItem(car) {
  if (settings.slots[car.i] !== 'phone') return;
  const p = phoneForSlot(car.i); if (p) phoneSend(p, { t: 'item', icon: car.item ? ITEMS[car.item].icon : '', ammo: car.ammo, name: car.item ? ITEMS[car.item].name : '' });
}
window.__weapons = { giveItem, useItem, ITEMS, get crates() { return crates.map(c => [Math.round(c.x), Math.round(c.z), c.m.visible, +c.gone.toFixed(1)]); }, get shots() { return shots.length; }, get hazards() { return hazards.length; } };
