// ---------- Main loop ----------
let last = performance.now(), wt = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; wt += rdt;
  pollPads(); fpsTick(rdt);
  phonesTick(rdt);
  if (toastT > 0) { toastT -= rdt; if (toastT <= 0) document.getElementById('toast').style.opacity = 0; }
  if (state === 'paused' || state === 'menu') {
    if (state === 'menu') updateMenuCamera(rdt, Math.floor((wt * 25) % N)); // idle flyover
    animateWorld(rdt);
    draw();
    return;
  }
  if (slowT > 0) { slowT -= rdt; timeScale = 0.35; } else timeScale = 1;
  const dt = rdt * timeScale;
  bumpCd -= rdt;

  if (state === 'countdown') {
    const before = Math.ceil(stateT / 0.8);
    stateT -= rdt;
    const after = Math.ceil(stateT / 0.8);
    if (after !== before && after > 0) { bigMsg(String(after), roundNo === 1 ? MODE_TAGS[settings.mode] : ''); tone(440, 0.15, 'square', 0.1); }
    if (stateT <= 0) { state = 'race'; bigMsg('GO!', ''); tone(880, 0.3, 'square', 0.12); setTimeout(() => { if (state === 'race') bigMsg('', ''); }, 700); }
  }

  const racing = state === 'race' || state === 'roundEnd' || state === 'matchEnd';
  if (state === 'race') raceT += dt;
  for (const c of cars) {
    if (!c.active) continue;
    if (c.falling) {
      c.vy -= 30 * dt; c.y += c.vy * dt; c.pos.x += c.vel.x * dt * 0.5; c.pos.z += c.vel.y * dt * 0.5;
      c.mesh.group.rotation.x += dt * 2;
      if (c.y < (curTrack.edge === 'woods' ? -40 : -6)) { c.falling = false; c.mesh.group.visible = c.mesh.shadow.visible = c.mesh.ring.visible = false; }
    } else if (c.alive || (c === lastWinner && state !== 'race')) {
      let inp = { thr: 0, st: 0, boost: false };
      if (state === 'race') inp = c.human ? humanInput(c) : aiInput(c, dt);
      else if (racing) inp = { thr: 0, st: 0, boost: false };
      driveCar(c, inp, dt);
      if (state === 'race') { if (inp.fire && !c.firePrev) useItem(c); c.firePrev = !!inp.fire; }
      if (c.y > 0 || c.vy > 0) { c.vy -= 30 * dt; c.y += c.vy * dt; if (c.y <= 0) { c.y = 0; c.vy = 0; if (c.alive) noise(0.08, 0.15, 400); } }
      const ni = nearestIdx(c, false);
      let d = ni - c.idx; if (d < -N / 2) d += N; if (d > N / 2) d -= N;
      c.prog += d; c.idx = ni;
      if (state === 'race') edgeCheck(c, dt);
    }
  }
  if (state === 'race') collide();
  modesTick(dt, rdt);
  if (state === 'race' || state === 'roundEnd') { ambientCreatures(dt); updateCreature(dt); updateWeapons(dt, wt); }

  // knock-out by camera
  updateCamera(rdt);
  if (state === 'race' && raceT > 2) {
    for (const c of activeCars()) {
      if (!c.alive || c.falling) continue;
      tmpV.set(c.pos.x, 1, c.pos.z).project(camera);
      const e = Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y));
      c.warn = e > 0.84 ? Math.min(1, (e - 0.84) / 0.16 + c.off) : 0;
      // while the camera is swinging round a bend, the timer runs slower so it stays fair
      if (e > 1.0) c.off += dt * (camSwing > 0.4 ? 0.45 : 1); else c.off = Math.max(0, c.off - dt * 2);
      if (c.warn > 0 && Math.floor(wt * 3) !== c.wb) { c.wb = Math.floor(wt * 3); rumble(c, 0.15, 0.35, 90); }
      if (c.off > 1.2) knockOut(c, 'got left behind');
      if (state !== 'race') break;
    }
  }

  if (state === 'roundEnd') {
    stateT -= rdt;
    if (stateT <= 0) {
      const champ = activeCars().find(c => c.points >= settings.target);
      if (champ) endMatch(champ);
      else newRound(lastWinner.idx);
    }
  }

  // sync meshes
  for (const c of cars) {
    if (!c.active || !c.mesh.group.visible) continue;
    c.mesh.group.position.set(c.pos.x, c.y, c.pos.z);
    c.mesh.group.rotation.y = c.h;
    if (!c.falling) c.mesh.group.rotation.x = 0;
    c.mesh.shadow.position.set(c.pos.x, 0.09, c.pos.z); c.mesh.shadow.rotation.z = c.h;
    c.mesh.shadow.visible = !c.falling && settings.gfx !== 'fancy';
    c.mesh.ring.position.set(c.pos.x, 0.1, c.pos.z);
    const ringOn = c.alive && !c.falling;
    c.mesh.ring.visible = ringOn;
    if (ringOn) {
      if (c.warn > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(wt * 20);
        c.mesh.ring.material.color.setHex(pulse > 0.5 ? 0xff1744 : 0xffffff);
        c.mesh.ring.scale.setScalar(1 + 0.25 * pulse);
      } else { c.mesh.ring.material.color.setHex(c.color.hex); c.mesh.ring.scale.setScalar(1); }
    }
  }
  if (state === 'matchEnd' && Math.random() < 0.3) {
    const ch = camFocus; burst(ch.pos.x + (Math.random() - 0.5) * 16, 10, ch.pos.z + (Math.random() - 0.5) * 16, [0xe53935, 0x1e88e5, 0x43a047, 0xfbc02d][Math.floor(Math.random() * 4)], 3, 3, 2, 2);
  }
  updateGun(dt);
  updateParts(dt);
  animateWorld(rdt);
  hudT -= rdt; if (hudT <= 0) { hudT = 0.1; updateHud(false); }
  draw();
}
function animateWorld(dt) {
  if (waterNormal) { waterNormal.offset.x += dt * 0.004; waterNormal.offset.y += dt * 0.0025; }
  for (const b of bobbers) { b.ph += dt; b.m.position.y = b.y + Math.sin(b.ph * 1.5) * 0.15; b.m.rotation.z = Math.sin(b.ph) * 0.05; }
  if (themeTick) themeTick(dt, wt);
}
camTarget.copy(P[0]);
applyGfx();
requestAnimationFrame(frame);
window.__shunt = { screen: (x, z) => { const v = new T.Vector3(x, 0.5, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, cars, settings, startMatch, knock: i => knockOut(cars[i], 'was zapped'), get state() { return state; }, renderer, scene, camera, buildTrack };
