// ---------- Physics ----------
const MAXV = 34, ACC = 26, BRAKE = 45, TURN = 2.7, GRIP = 7.5;
function driveCar(car, inp, dt) {
  const fx = Math.sin(car.h), fz = Math.cos(car.h);
  const rx = -Math.cos(car.h), rz = Math.sin(car.h);
  let vf = car.vel.x * fx + car.vel.y * fz;
  let vl = car.vel.x * rx + car.vel.y * rz;
  const lat = (car.pos.x - P[car.idx].x) * NRM[car.idx].x + (car.pos.z - P[car.idx].z) * NRM[car.idx].z;
  const onVerge = Math.abs(lat) > ROAD_W;
  const skillMul = car.human ? 1 : SKILL_SPEED[settings.skill], st8 = car.stats || CAR_TYPES.classic;
  const inMud = !onVerge && MUD[car.idx] > 0.5;
  const maxv = (onVerge ? 22 : inMud ? 17 : MAXV * st8.top) * skillMul * (car.burn > 0 ? 0.65 : 1) * (car.ram > 0 ? 1.3 : 1);
  if (inp.thr > 0) vf += ACC * st8.acc * inp.thr * dt * (vf < maxv ? 1 : 0);
  else if (inp.thr < 0) vf += (vf > 0 ? -BRAKE : -ACC * 0.6) * -inp.thr * dt;
  if (vf < -12) vf = -12;
  if (vf > maxv) vf -= (vf - maxv) * 2.5 * dt;
  vf -= vf * (inp.thr === 0 ? 0.9 : 0.15) * dt;
  vl *= Math.exp(-(car.slip > 0 ? GRIP * 0.12 : GRIP * st8.grip) * dt); // oil = almost no grip
  const steerScale = Math.max(-1, Math.min(1, vf / 7));
  car.h -= inp.st * TURN * st8.turn * steerScale * dt;
  if (car.spin > 0) { car.spin -= dt; car.h += 9 * dt; }
  if (car.boostCd > 0) car.boostCd -= dt;
  if (inp.boost && car.boostCd <= 0) {
    vf += 20; car.boostCd = 3;
    burst(car.pos.x - fx * 2, 0.8, car.pos.z - fz * 2, 0xff9800, 12, 6, 3, 0.5);
    boostSound(car);
    rumble(car, 0.2, 0.5, 150);
  }
  const nfx = Math.sin(car.h), nfz = Math.cos(car.h), nrx = -Math.cos(car.h), nrz = Math.sin(car.h);
  car.vel.set(nfx * vf + nrx * vl, nfz * vf + nrz * vl);
  car.pos.x += car.vel.x * dt; car.pos.z += car.vel.y * dt;
}

function collide() {
  const R = 1.75;
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const A = cars[a], B = cars[b];
    if (!A.alive || !B.alive || A.falling || B.falling || A.ghostT > 0 || B.ghostT > 0) continue;
    const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z, d = Math.hypot(dx, dz);
    if (d >= R * 2 || d === 0) continue;
    const nx = dx / d, nz = dz / d, over = R * 2 - d;
    A.pos.x -= nx * over / 2; A.pos.z -= nz * over / 2; B.pos.x += nx * over / 2; B.pos.z += nz * over / 2;
    const rv = (B.vel.x - A.vel.x) * nx + (B.vel.y - A.vel.y) * nz;
    if (rv < 0) {
      const j = -rv * 0.85;
      // a ramming car hits much harder and barely slows
      // heavier bodies shove harder and get shoved less
      const mA = (A.stats || CAR_TYPES.classic).mass, mB = (B.stats || CAR_TYPES.classic).mass, ka = 2 * mB / (mA + mB), kb = 2 * mA / (mA + mB);
      const ja = j * ka * (A.ram > 0 ? 0.3 : B.ram > 0 ? 2.6 : 1), jb = j * kb * (B.ram > 0 ? 0.3 : A.ram > 0 ? 2.6 : 1);
      A.vel.x -= nx * ja; A.vel.y -= nz * ja; B.vel.x += nx * jb; B.vel.y += nz * jb;
      if (-rv > 5) flagBump(A, B);
      if (-rv > 6) {
        const rs = Math.min(1, -rv / 25); rumble(A, rs, rs * 0.6, 120); rumble(B, rs, rs * 0.6, 120);
        burst((A.pos.x + B.pos.x) / 2, 1, (A.pos.z + B.pos.z) / 2, 0xffeb3b, Math.min(16, Math.round(-rv)), 8, 5, 0.4);
        if (bumpCd <= 0) { noise(0.15, Math.min(0.35, -rv / 60), 600); bumpCd = 0.08; }
      }
    }
  }
}

function edgeCheck(car, dt) {
  const k = car.idx;
  const lat = (car.pos.x - P[k].x) * NRM[k].x + (car.pos.z - P[k].z) * NRM[k].z;
  const edge = ROAD_W + SH[k];
  if (Math.abs(lat) > edge + 0.6) {
    if (settings.water === 'bouncy') {
      const s = Math.sign(lat), push = Math.abs(lat) - (edge + 0.6);
      car.pos.x -= NRM[k].x * s * push; car.pos.z -= NRM[k].z * s * push;
      const vn = car.vel.x * NRM[k].x + car.vel.y * NRM[k].z;
      if (vn * s > 0) { car.vel.x -= NRM[k].x * vn * 1.6; car.vel.y -= NRM[k].z * vn * 1.6; }
    } else if (curTrack.edge === 'woods') {
      // into the trees: gone with a pop of leaves
      if (car.alive) { car.lost = true; car.mesh.group.visible = car.mesh.shadow.visible = car.mesh.ring.visible = false; knockOut(car, curTrack.fallText || 'got lost'); }
    } else if (!car.falling) {
      car.falling = true; car.vy = 2;
      knockOut(car, curTrack.fallText || 'fell off');
    }
  }
}
