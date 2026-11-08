// ---------- Particles ----------
const parts = [];
const partGeo = new T.BoxGeometry(0.4, 0.4, 0.4);
let glowK = 1;
function burst(x, y, z, color, n, spd, up, life = 0.9) {
  glowK = settings.gfx === 'fancy' && (color === 0xff6f00 || color === 0xffeb3b || color === 0xff9800 || color === 0xffffff) ? 4 : 1;
  for (let k = 0; k < n; k++) {
    let p = parts.find(q => !q.live);
    if (!p) {
      if (parts.length > 400) return;
      p = { m: new T.Mesh(partGeo, new T.MeshBasicMaterial({ color })), live: false, v: new T.Vector3() };
      scene.add(p.m); parts.push(p);
    }
    p.live = true; p.t = life * (0.6 + Math.random() * 0.6); p.life = p.t;
    p.m.material.color.setHex(color).multiplyScalar(glowK); p.m.visible = true;
    p.m.position.set(x, y, z);
    const a = Math.random() * Math.PI * 2;
    p.v.set(Math.cos(a) * spd * Math.random(), up * (0.5 + Math.random()), Math.sin(a) * spd * Math.random());
  }
}
function updateParts(dt) {
  for (const p of parts) {
    if (!p.live) continue;
    p.t -= dt;
    if (p.t <= 0) { p.live = false; p.m.visible = false; continue; }
    p.v.y -= 25 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 5; p.m.rotation.y += dt * 4;
    const s = Math.max(0.1, p.t / p.life); p.m.scale.setScalar(s);
  }
}
