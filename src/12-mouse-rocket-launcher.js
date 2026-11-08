// ---------- Mouse rocket launcher ----------
const GUN_CD = 0.9, BLAST_R = 8.5, LOCK_R = 7;
const gun = { hits: 0, cd: 0, mouse: new T.Vector2(0, 0), has: false, aim: new T.Vector3(), lock: null };
const rockets = [];
const ray = new T.Raycaster();
const ground = new T.Plane(new T.Vector3(0, 1, 0), -0.5);
const cross = new T.Group();
const crossMat = new T.MeshBasicMaterial({ color: 0xce93d8, transparent: true, opacity: 0.95, depthWrite: false, side: T.DoubleSide });
{
  const r = new T.Mesh(new T.RingGeometry(2.2, 2.8, 32), crossMat); r.rotation.x = -Math.PI / 2; cross.add(r);
  for (let k = 0; k < 4; k++) {
    const b = new T.Mesh(new T.PlaneGeometry(0.5, 2.2), crossMat); b.rotation.x = -Math.PI / 2;
    const a = k * Math.PI / 2; b.position.set(Math.sin(a) * 3.8, 0, Math.cos(a) * 3.8); b.rotation.z = a; cross.add(b);
  }
}
cross.visible = false; scene.add(cross);
const rocketGeo = new T.ConeGeometry(0.6, 2.6, 8); rocketGeo.rotateX(Math.PI / 2);
canvas.addEventListener('mousemove', e => {
  gun.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); gun.has = true;
});
canvas.addEventListener('mousedown', e => { e.preventDefault(); audio(); fireRocket(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0]; if (!t) return;
  gun.mouse.set((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1); gun.has = true;
  aimUpdate(); audio(); fireRocket(); e.preventDefault();
}, { passive: false });

function aimUpdate() {
  ray.setFromCamera(gun.mouse, camera);
  const hit = ray.ray.intersectPlane(ground, gun.aim);
  if (!hit) return false;
  gun.lock = null; let best = LOCK_R;
  for (const c of cars) {
    if (!c.active || !c.alive || c.falling) continue;
    const d = Math.hypot(c.pos.x - gun.aim.x, c.pos.z - gun.aim.z);
    if (d < best) { best = d; gun.lock = c; }
  }
  return true;
}
function fireRocket() {
  if (!settings.gunner || state !== 'race' || gun.cd > 0) return;
  if (!aimUpdate()) return;
  gun.cd = GUN_CD;
  const m = new T.Mesh(rocketGeo, new T.MeshStandardMaterial({ color: 0xab47bc, emissive: 0xd500f9, emissiveIntensity: 2.5 }));
  const start = camera.position.clone().add(new T.Vector3((Math.random() - 0.5) * 20, 10, 0));
  m.position.copy(start); scene.add(m);
  rockets.push({ m, target: gun.lock, point: gun.aim.clone(), t: 0, dur: 0.7 });
  tone(900, 0.5, 'sawtooth', 0.06, -600);
}
const rTmp = new T.Vector3();
function explode(x, z) {
  burst(x, 1, z, 0xff6f00, 24, 12, 12, 0.8);
  burst(x, 1, z, 0xffeb3b, 16, 9, 10, 0.6);
  burst(x, 1, z, 0x616161, 10, 5, 6, 1.2);
  noise(0.5, 0.45, 500); tone(110, 0.4, 'square', 0.1, -70);
  let hitNames = [];
  for (const c of cars) {
    if (!c.active || !c.alive || c.falling) continue;
    const dx = c.pos.x - x, dz = c.pos.z - z, d = Math.hypot(dx, dz);
    if (d > BLAST_R) continue;
    const s = 1 - d / BLAST_R, nx = d > 0.01 ? dx / d : Math.random() - 0.5, nz = d > 0.01 ? dz / d : Math.random() - 0.5;
    c.vel.x = c.vel.x * 0.4 + nx * (10 + 18 * s); c.vel.y = c.vel.y * 0.4 + nz * (10 + 18 * s);
    c.vy = 6 + 9 * s; c.y = Math.max(c.y, 0.01);
    c.spin = 0.25 + 0.45 * s;
    hitNames.push(`<b style="color:${c.color.css}">${c.color.name}</b>`);
    rumble(c, 0.5 + 0.5 * s, 0.8, 300);
  }
  if (hitNames.length) { gun.hits += hitNames.length; toast(`Rocket hit ${hitNames.join(' & ')}!`); }
}
function updateGun(dt) {
  if (gun.cd > 0) gun.cd -= dt;
  const show = settings.gunner && state === 'race' && gun.has;
  cross.visible = show;
  document.body.classList.toggle('aiming', settings.gunner && state === 'race');
  if (show && aimUpdate()) {
    const p = gun.lock ? gun.lock.pos : gun.aim;
    cross.position.set(p.x, 0.15, p.z);
    cross.rotation.y += dt * 2;
    crossMat.color.setHex(gun.lock ? 0xff1744 : 0xce93d8);
    crossMat.opacity = gun.cd > 0 ? 0.35 : 0.95;
    cross.scale.setScalar(gun.lock ? 1.15 + 0.1 * Math.sin(wt * 12) : 1);
  }
  for (let k = rockets.length - 1; k >= 0; k--) {
    const r = rockets[k];
    r.t += dt;
    const tgt = r.target && r.target.alive && !r.target.falling ? rTmp.set(r.target.pos.x, r.target.y + 0.8, r.target.pos.z) : rTmp.copy(r.point);
    const left = Math.max(0.016, r.dur - r.t);
    const step = Math.min(1, dt / left);
    r.m.lookAt(tgt);
    r.m.position.lerp(tgt, step);
    if (Math.random() < 0.8) burst(r.m.position.x, r.m.position.y, r.m.position.z, 0xbdbdbd, 1, 1, 0, 0.4);
    if (r.t >= r.dur) {
      explode(r.m.position.x, r.m.position.z);
      scene.remove(r.m); rockets.splice(k, 1);
    }
  }
}
