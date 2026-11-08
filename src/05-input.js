// ---------- Input ----------
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  onKey(e.code);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ----- Gamepads -----
const padPrev = {}; // gamepad index -> previous pressed buttons
function getPad(i) { const ps = navigator.getGamepads ? navigator.getGamepads() : []; const p = ps && ps[i]; return p && p.connected ? p : null; }
function btn(p, i) { const b = p.buttons[i]; return b ? (typeof b === 'object' ? b.value : b) : 0; }
function pressed(p, i) { const b = p.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); }
function padSlot(index) { return settings.padOf.findIndex((x, s) => x === index && settings.slots[s] === 'pad'); }
function joinPad(index) {
  if (padSlot(index) >= 0) return;
  // controllers take the cars in order (RED, BLUE, GREEN, GOLD), skipping cars other controllers hold
  const s = settings.slots.findIndex(t => !slotTaken(t));
  if (s < 0) { toast('All four cars are taken'); return; }
  settings.slots[s] = 'pad'; settings.padOf[s] = index;
  audio(); tone(520, 0.08, 'square', 0.08); setTimeout(() => tone(780, 0.1, 'square', 0.08), 90);
  toast(`Controller ${index + 1} is <b style="color:${COLORS[s].css}">${COLORS[s].name}</b>`);
  rumblePad(index, 0.6, 0.6, 180);
  buildMenu();
}
function leavePad(index) {
  const s = padSlot(index); if (s < 0) return;
  settings.slots[s] = 'cpu'; settings.padOf[s] = null;
  tone(400, 0.1, 'square', 0.06); toast(`<b style="color:${COLORS[s].css}">${COLORS[s].name}</b> left`); buildMenu();
}
function rumblePad(index, strong, weak, ms) {
  const p = getPad(index); const a = p && p.vibrationActuator;
  if (a && a.playEffect) { try { a.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {}); } catch (e) {} }
}
function rumble(car, strong, weak, ms) {
  if (!car) return;
  if (settings.slots[car.i] === 'pad' && settings.padOf[car.i] !== null) rumblePad(settings.padOf[car.i], strong, weak, ms);
  else if (settings.slots[car.i] === 'phone') phoneRumble(car.i, ms * (0.5 + strong));
  else if (settings.slots[car.i] === 'touch') { try { navigator.vibrate && navigator.vibrate(Math.round(ms * (0.5 + strong))); } catch (e) {} }
}
// Called every frame: menu joining, Start/pause, play-again
function pollPads() {
  const ps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < (ps ? ps.length : 0); i++) {
    const p = ps[i]; if (!p || !p.connected) continue;
    const prev = padPrev[i] || [];
    const now = p.buttons.map((b, k) => pressed(p, k));
    const hit = k => now[k] && !prev[k];
    padPrev[i] = now;
    if (state === 'menu') {
      if (hit(0)) { if (padSlot(i) < 0) joinPad(i); }
      if (hit(1) || hit(8)) leavePad(i);
      if (hit(9)) startMatch();
    } else if (state === 'matchEnd') {
      if (hit(0) || hit(9)) { startMatch(); }
      if (hit(1) || hit(8)) toMenu();
    } else if (state === 'paused') {
      if (hit(9)) togglePause();
      if (hit(1) || hit(8)) toMenu();
    } else if (hit(9)) togglePause();
  }
}
window.addEventListener('gamepadconnected', e => { toast(`Controller ${e.gamepad.index + 1} connected${state === 'menu' ? ' – press A to join' : ''}`); });
window.addEventListener('gamepaddisconnected', e => { const s = padSlot(e.gamepad.index); if (s >= 0) toast(`<b style="color:${COLORS[s].css}">${COLORS[s].name}</b>'s controller disconnected`); });

function humanInput(car) {
  let thr = 0, st = 0, boost = false, fire = false;
  if (settings.slots[car.i] === 'pad') {
    const p = getPad(settings.padOf[car.i]);
    if (p) {
      const ax = p.axes[0] || 0;
      if (Math.abs(ax) > 0.18) st = Math.sign(ax) * (Math.abs(ax) - 0.18) / 0.82;
      if (pressed(p, 14)) st = -1; if (pressed(p, 15)) st = 1;
      let gas = Math.max(btn(p, 7), pressed(p, 0) ? 1 : 0), brk = Math.max(btn(p, 6), pressed(p, 1) ? 1 : 0);
      if (p.mapping !== 'standard') { const ay = p.axes[1] || 0; if (ay < -0.5) gas = Math.max(gas, 1); if (ay > 0.5) brk = Math.max(brk, 1); }
      thr = gas - brk;
      fire = pressed(p, 2) || pressed(p, 5);   // X or RB
      boost = pressed(p, 3) || pressed(p, 4);  // Y or LB
    }
  } else if (settings.slots[car.i] === 'phone') {
    const p = phoneForSlot(car.i);
    // phone gone quiet (dropped signal, screen locked): the computer drives until it's back
    if (!p || !p.conn || performance.now() - p.lastIn > 1500) return aiInput(car, 1 / 60);
    st = p.inp.st; thr = p.inp.thr; boost = p.inp.boost; fire = p.inp.fire;
  } else if (settings.slots[car.i] === 'touch') {
    st = touchInput.st; thr = touchInput.thr; boost = touchInput.boost; fire = touchInput.fire;
  } else {
    const ks = KEYSETS[car.i];
    thr = (keys[ks.up] ? 1 : 0) - (keys[ks.down] ? 1 : 0);
    st = (keys[ks.right] ? 1 : 0) - (keys[ks.left] ? 1 : 0);
    boost = !!keys[ks.boost]; fire = !!keys[ks.fire];
  }
  if (settings.autoGas && thr >= 0) thr = 1;
  return { thr, st, boost, fire };
}

function wrapAng(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

function aiInput(car, dt) {
  const ai = car.ai;
  const speed = car.vel.length();
  ai.laneT -= dt;
  if (ai.laneT <= 0) { ai.lane = (Math.random() * 2 - 1) * 4; ai.laneT = 2 + Math.random() * 3; }
  const ahead = Math.round((14 + speed * 0.55) / SPACING);
  const ti = (car.idx + ahead) % N;
  let tx = P[ti].x + NRM[ti].x * ai.lane, tz = P[ti].z + NRM[ti].z * ai.lane;
  // aggression: steer toward a nearby rival
  if (settings.skill > 0) {
    for (const o of cars) {
      if (o === car || !o.alive || o.falling || sameTeam(o, car)) continue;
      const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z, d = Math.hypot(dx, dz);
      const fwd = (dx * Math.sin(car.h) + dz * Math.cos(car.h)) / (d || 1);
      if (d < 9 && fwd > 0.5 && (o.human || settings.skill === 2)) { tx = tx * 0.5 + o.pos.x * 0.5; tz = tz * 0.5 + o.pos.z * 0.5; break; }
    }
  }
  const mt = modeAiTarget(car);
  if (mt) { tx = mt.x; tz = mt.z; }
  const want = Math.atan2(tx - car.pos.x, tz - car.pos.z);
  const diff = wrapAng(want - car.h);
  let st = Math.max(-1, Math.min(1, -diff * 2.4));
  // corner anticipation
  const far = (car.idx + Math.round(40 / SPACING)) % N;
  const bend = Math.abs(wrapAng(Math.atan2(TAN[far].x, TAN[far].z) - Math.atan2(TAN[car.idx].x, TAN[car.idx].z)));
  let thr = 1;
  if (bend > 0.9 && speed > 22) thr = 0;
  if (Math.abs(diff) > 0.9) thr = speed > 10 ? -0.3 : 0.6;
  // unstick
  if (speed < 2 && ai.rev <= 0) ai.stuck += dt; else ai.stuck = 0;
  if (ai.stuck > 1.2) { ai.rev = 0.9; ai.stuck = 0; }
  if (ai.rev > 0) { ai.rev -= dt; thr = -1; st = -st; }
  let boost = false;
  if (settings.skill > 0 && bend < 0.3 && Math.random() < 0.01 * settings.skill) boost = true;
  if (car.warn > 0.3) boost = true;
  return { thr, st, boost, fire: settings.weapons && aiWantsFire(car) };
}
