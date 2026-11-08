// ---------- Camera ----------
const tmpV = new T.Vector3();
function updateCamera(dt) {
  let want = new T.Vector3(), dist;
  const alive = activeCars().filter(c => c.alive && !c.falling);
  if (camFocus) {
    want.copy(camFocus.pos); dist = state === 'matchEnd' ? 20 : 24;
  } else if (alive.length) {
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const c of alive) { minx = Math.min(minx, c.pos.x); maxx = Math.max(maxx, c.pos.x); minz = Math.min(minz, c.pos.z); maxz = Math.max(maxz, c.pos.z); }
    const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
    const lead = alive.reduce((a, b) => (b.prog > a.prog ? b : a));
    const leanX = Math.max(-12, Math.min(12, lead.vel.x * 0.4)), leanZ = Math.max(-12, Math.min(12, lead.vel.y * 0.4));
    want.set(cx * 0.65 + lead.pos.x * 0.35 + leanX, 0, cz * 0.65 + lead.pos.z * 0.35 + leanZ);
    let ex = 0, ez = 0;
    for (const c of alive) { ex = Math.max(ex, Math.abs(c.pos.x - want.x)); ez = Math.max(ez, Math.abs(c.pos.z - want.z)); }
    const need = Math.max((ex * 2) / (0.93 * camera.aspect), (ez * 2) / 1.05);
    dist = Math.max(40, Math.min(MAX_CAM, need * 1.08 + 14));
  } else { want.copy(camTarget); dist = camDist; }
  const k = 1 - Math.exp(-(camFocus ? 2.2 : 3.2) * dt);
  camTarget.lerp(want, k);
  camDist += (dist - camDist) * (1 - Math.exp(-2.4 * dt));
  camera.position.set(camTarget.x, camTarget.y + Math.sin(CAM_PITCH) * camDist, camTarget.z + Math.cos(CAM_PITCH) * camDist);
  camera.lookAt(camTarget);
}
