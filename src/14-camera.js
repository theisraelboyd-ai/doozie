// ---------- Camera ----------
// Three styles (settings.cam):
//  cinematic – swings round to face the road ahead of the leader, dips low on straights,
//              rises on bends and widens the lens at speed (the Mashed feel)
//  calm      – same idea, but turns slowly and keeps a steady height
//  classic   – fixed direction, like the first preview
const tmpV = new T.Vector3();
let camYaw = Math.PI, camPitch = CAM_PITCH, camSwing = 0, camFov = 50;

function trackYaw(i) { const t = TAN[((i % N) + N) % N]; return Math.atan2(t.x, t.z); }
// average road direction between two track indices (smooths out kinks)
function roadYaw(from, to) {
  let x = 0, z = 0;
  for (let k = from; k <= to; k += 4) { const t = TAN[((k % N) + N) % N]; x += t.x; z += t.z; }
  return Math.atan2(x, z);
}
function steerCamera(dt, leadIdx, leadSpeed) {
  const style = settings.cam;
  if (style === 'classic') { camYaw = Math.PI; camPitch = CAM_PITCH; camSwing = 0; return 0; }
  const ahead = Math.round(45 / SPACING);
  const want = roadYaw(leadIdx + Math.round(10 / SPACING), leadIdx + ahead);
  const delta = wrapAng(want - camYaw);
  const maxRate = style === 'calm' ? 0.45 : 1.1;
  let step = delta * (1 - Math.exp(-(style === 'calm' ? 1.0 : 1.8) * dt));
  step = Math.max(-maxRate * dt, Math.min(maxRate * dt, step));
  camYaw = wrapAng(camYaw + step);
  camSwing = Math.abs(step) / Math.max(dt, 1e-4);
  // bends ahead -> rise up and look down more; straights -> lower, more dramatic
  const bend = Math.abs(wrapAng(trackYaw(leadIdx + ahead) - trackYaw(leadIdx)));
  const wantPitch = style === 'calm' ? 0.95 : 0.8 + Math.min(1, bend / 1.2) * 0.24;
  camPitch += (wantPitch - camPitch) * (1 - Math.exp(-1.2 * dt));
  return Math.min(1, leadSpeed / 34);
}
function placeCamera(dist) {
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const h = Math.cos(camPitch) * dist;
  camera.position.set(camTarget.x - fx * h, camTarget.y + Math.sin(camPitch) * dist, camTarget.z - fz * h);
  camera.lookAt(camTarget);
}
function setFov(f, dt) {
  camFov += (f - camFov) * (1 - Math.exp(-2 * dt));
  if (Math.abs(camera.fov - camFov) > 0.05) { camera.fov = camFov; camera.updateProjectionMatrix(); }
}

function updateCamera(dt) {
  let want = new T.Vector3(), dist;
  const alive = activeCars().filter(c => c.alive && !c.falling);
  let speedK = 0;
  if (camFocus) {
    want.copy(camFocus.pos); dist = state === 'matchEnd' ? 20 : 24;
    camSwing = 0;
  } else if (alive.length) {
    const lead = alive.reduce((a, b) => (b.prog > a.prog ? b : a));
    const leadSpeed = lead.vel.length();
    speedK = steerCamera(dt, lead.idx, leadSpeed);
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    // centre of the pack, pulled towards the leader, leaning into the direction of travel
    let cx = 0, cz = 0; for (const c of alive) { cx += c.pos.x; cz += c.pos.z; } cx /= alive.length; cz /= alive.length;
    let tx = cx * 0.65 + lead.pos.x * 0.35, tz = cz * 0.65 + lead.pos.z * 0.35;
    if (settings.cam === 'classic') {
      tx += Math.max(-12, Math.min(12, lead.vel.x * 0.4)); tz += Math.max(-12, Math.min(12, lead.vel.y * 0.4));
    } else {
      const lean = Math.min(12, leadSpeed * 0.35); tx += fx * lean; tz += fz * lean;
    }
    want.set(tx, 0, tz);
    // how far the pack spreads across and along the screen
    let side = 0, along = 0;
    for (const c of alive) {
      const dx = c.pos.x - tx, dz = c.pos.z - tz;
      side = Math.max(side, Math.abs(dx * rx + dz * rz)); along = Math.max(along, Math.abs(dx * fx + dz * fz));
    }
    const need = Math.max((side * 2) / (0.93 * camera.aspect), (along * 2) / 1.05);
    dist = Math.max(40, Math.min(MAX_CAM, need * 1.08 + 14));
  } else { want.copy(camTarget); dist = camDist; }
  const k = 1 - Math.exp(-(camFocus ? 2.2 : 3.2) * dt);
  camTarget.lerp(want, k);
  camDist += (dist - camDist) * (1 - Math.exp(-2.4 * dt));
  setFov(settings.cam === 'cinematic' ? 50 + speedK * 7 : 50, dt);
  placeCamera(camDist);
}

// Title-screen fly-over: drift along the track with the chosen camera style
function updateMenuCamera(dt, k) {
  camTarget.lerp(P[k], 1 - Math.exp(-1.2 * dt));
  camDist += (55 - camDist) * (1 - Math.exp(-1.2 * dt));
  if (settings.cam === 'classic') { camYaw = Math.PI; camPitch = CAM_PITCH; }
  else steerCamera(dt, k, 20);
  setFov(50, dt);
  placeCamera(camDist);
}
