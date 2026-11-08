// ---------- Game modes: Knockout, Teams, Lap Race, Hold the Flag ----------
const TEAMS = [
  { name: 'TEAM HOT', css: '#ff7043', bg: 'linear-gradient(180deg, rgba(255,112,67,.35), rgba(10,20,35,.82) 60%)' },
  { name: 'TEAM COOL', css: '#4fc3f7', bg: 'linear-gradient(180deg, rgba(79,195,247,.35), rgba(10,20,35,.82) 60%)' },
];
let teamPts = [0, 0];
const LAPS = 3, FLAG_WIN = 20, RESPAWN_T = 2.2, GHOST_T = 1.6;
function teamOf(c) { return c.i === 0 || c.i === 3 ? 0 : 1; }
function sameTeam(a, b) { return settings.mode === 'teams' && a !== b && teamOf(a) === teamOf(b); }
function respawnMode() { return settings.mode === 'laps' || settings.mode === 'flag'; }

// ----- per round -----
function modeNewRound(atIdx) {
  for (const c of cars) { c.respawnT = 0; c.ghostT = 0; c.startProg = c.prog; c.flagT = 0; c.lapShown = 1; }
  finalLapSaid = false;
  dropFlagMesh();
  if (settings.mode === 'flag') placeFlag(atIdx + Math.round(45 / SPACING), 0);
}

// ----- respawning (Lap Race and Hold the Flag) -----
function respawnCar(car, why) {
  if (car.respawnT > 0) return;
  if (flag.holder === car) dropFlag(car);
  car.alive = false; car.respawnT = RESPAWN_T; car.warn = 0; car.off = 0;
  rumble(car, 0.8, 0.8, 300);
  if (!car.falling && !car.lost) { burst(car.pos.x, 1, car.pos.z, car.color.hex, 16, 8, 7, 0.8); car.mesh.group.visible = false; }
  if (car.lost) burst(car.pos.x, 1.5, car.pos.z, (curTrack.lostColors || [0x2e7d32])[0], 18, 8, 8, 1);
  tone(300, 0.3, 'square', 0.08, -200);
  toast(`<b style="color:${car.color.css}">${car.color.name}</b> ${why}! Back in a moment…`);
}
function respawnPoint() {
  // just behind the middle of the screen, so you rejoin at the back of the pack
  const { i } = nearestOnTrack(camTarget.x, camTarget.z);
  return ((i - Math.round(10 / SPACING)) % N + N) % N;
}
function finishRespawn(car) {
  const k = respawnPoint(), lat = (Math.random() - 0.5) * 6;
  let d = k - car.idx; if (d < -N / 2) d += N; if (d > N / 2) d -= N;
  car.prog += d; car.idx = k;
  car.pos.set(P[k].x + NRM[k].x * lat, 0, P[k].z + NRM[k].z * lat);
  car.h = Math.atan2(TAN[k].x, TAN[k].z);
  car.vel.set(TAN[k].x * 12, TAN[k].z * 12); car.y = 0; car.vy = 0; car.spin = 0;
  car.alive = true; car.falling = false; car.lost = false; car.off = 0; car.warn = 0;
  car.ghostT = GHOST_T;
  car.mesh.group.visible = car.mesh.ring.visible = true; car.mesh.group.rotation.set(0, car.h, 0);
  burst(car.pos.x, 1, car.pos.z, 0xffffff, 14, 6, 6, 0.6); tone(660, 0.12, 'triangle', 0.08, 300);
}

// ----- Lap Race -----
let finalLapSaid = false;
function lapOf(c) { return Math.min(LAPS, Math.floor(Math.max(0, c.prog - c.startProg) / N) + 1); }
function lapsTick() {
  const act = activeCars();
  for (const c of act) {
    if (c.prog - c.startProg >= LAPS * N) {
      const ranking = act.slice().sort((a, b) => (b.prog - b.startProg) - (a.prog - a.startProg));
      ranking.splice(ranking.indexOf(c), 1); ranking.unshift(c);
      toast(`<b style="color:${c.color.css}">${c.color.name}</b> takes the chequered flag!`);
      endRound(ranking); return;
    }
    const lap = lapOf(c);
    if (lap > c.lapShown) {
      c.lapShown = lap;
      if (lap === LAPS && !finalLapSaid) { finalLapSaid = true; bigMsg('FINAL LAP!', `<span style="color:${c.color.css}">${c.color.name}</span> leads`); setTimeout(() => { if (state === 'race') bigMsg('', ''); }, 1500); tone(988, 0.15, 'square', 0.1); setTimeout(() => tone(1318, 0.25, 'square', 0.1), 150); }
    }
  }
}

// ----- Hold the Flag -----
const flag = { holder: null, g: null, x: 0, z: 0, cd: 0 };
function makeFlagMesh() {
  const g = new T.Group();
  const pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 3.4, 6), new T.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.6, roughness: 0.3 }));
  pole.position.y = 1.7; g.add(pole);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 40; const x = cv.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 8, j * 8, 8, 8); }
  const cloth = new T.Mesh(new T.PlaneGeometry(1.8, 1.1, 6, 1), new T.MeshStandardMaterial({ map: new T.CanvasTexture(cv), side: T.DoubleSide, emissive: 0x444444 }));
  cloth.position.set(0.95, 2.8, 0); g.add(cloth);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: softTexture(255, 255, 255), color: 0xfff59d, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
  glow.position.y = 2.2; glow.scale.setScalar(5); g.add(glow);
  g.userData.cloth = cloth;
  return g;
}
function dropFlagMesh() { if (flag.g) { scene.remove(flag.g); flag.g = null; } flag.holder = null; }
function placeFlag(i, lat) {
  const k = ((i % N) + N) % N;
  if (!flag.g) { flag.g = makeFlagMesh(); scene.add(flag.g); }
  flag.holder = null; flag.x = P[k].x + NRM[k].x * lat; flag.z = P[k].z + NRM[k].z * lat; flag.cd = 0.6;
}
function dropFlag(car) {
  // fall to the road where the holder was (kept on the tarmac so it can be reached)
  const k = car.idx, lat = Math.max(-ROAD_W + 1.5, Math.min(ROAD_W - 1.5, (car.pos.x - P[k].x) * NRM[k].x + (car.pos.z - P[k].z) * NRM[k].z));
  placeFlag(k, lat);
  burst(flag.x, 2, flag.z, 0xffffff, 12, 6, 7, 0.6); noise(0.2, 0.2, 1500);
}
function grabFlag(car, stolen) {
  flag.holder = car; flag.cd = 1.0;
  rumble(car, 0.5, 0.5, 200);
  tone(stolen ? 520 : 784, 0.12, 'square', 0.1, stolen ? 300 : 400);
  toast(`<b style="color:${car.color.css}">${car.color.name}</b> ${stolen ? 'stole' : 'grabbed'} the flag!`);
}
function flagBump(A, B) {
  if (settings.mode !== 'flag' || flag.cd > 0) return;
  if (flag.holder === A) grabFlag(B, true); else if (flag.holder === B) grabFlag(A, true);
}
function flagTick(dt) {
  if (!flag.g) return;
  flag.cd -= dt;
  const h = flag.holder;
  if (state === 'race') {
    if (h) {
      if (h.spin > 0.2 && flag.cd <= 0) { dropFlag(h); toast(`<b style="color:${h.color.css}">${h.color.name}</b> dropped the flag!`); }
      else {
        h.flagT += dt;
        if (h.flagT >= FLAG_WIN) { const ranking = activeCars().slice().sort((a, b) => b.flagT - a.flagT); return endRound(ranking); }
      }
    } else if (flag.cd <= 0) {
      for (const c of activeCars()) if (c.alive && !c.falling && !(c.ghostT > 0) && Math.hypot(c.pos.x - flag.x, c.pos.z - flag.z) < 3.4) { grabFlag(c, false); break; }
    }
  }
  const t = wt;
  flag.g.scale.setScalar(flag.holder ? 1.6 : 1.3);
  if (flag.holder) flag.g.position.set(flag.holder.pos.x, flag.holder.y + 1.1, flag.holder.pos.z);
  else flag.g.position.set(flag.x, Math.sin(t * 3) * 0.25, flag.z);
  flag.g.rotation.y = flag.holder ? flag.holder.h + Math.PI / 2 : t * 1.5;
  const cl = flag.g.userData.cloth.geometry.attributes.position;
  for (let v = 0; v < cl.count; v++) { const x = cl.getX(v) + 0.9; cl.setZ(v, Math.sin(t * 9 - x * 3) * 0.15 * x); }
  cl.needsUpdate = true;
}

// ----- what the computer drivers aim for -----
function modeAiTarget(car) {
  if (settings.mode !== 'flag' || !flag.g || flag.holder === car) return null;
  const tx = flag.holder ? flag.holder.pos.x : flag.x, tz = flag.holder ? flag.holder.pos.z : flag.z;
  const d = Math.hypot(tx - car.pos.x, tz - car.pos.z);
  if (d > 32) return null;
  // only chase if it's roughly ahead – no U-turns
  const fwdDot = ((tx - car.pos.x) * Math.sin(car.h) + (tz - car.pos.z) * Math.cos(car.h)) / (d || 1);
  return fwdDot > 0.1 || d < 8 ? { x: tx, z: tz } : null;
}

// ----- every frame -----
function modesTick(dt, rdt) {
  for (const c of activeCars()) {
    if (c.respawnT > 0) { c.respawnT -= dt; if (c.respawnT <= 0 && state === 'race') finishRespawn(c); }
    if (c.ghostT > 0) {
      c.ghostT -= dt;
      c.mesh.group.visible = c.ghostT <= 0 || Math.floor(c.ghostT * 10) % 2 === 0;
    }
  }
  if (state === 'race' && settings.mode === 'laps') lapsTick();
  if (settings.mode === 'flag') flagTick(dt);
  else if (flag.g) dropFlagMesh();
}

// ----- HUD line under the score -----
function modeLine(c) {
  if (settings.mode === 'teams') return `<span style="color:${TEAMS[teamOf(c)].css}">${TEAMS[teamOf(c)].name}</span>`;
  if (settings.mode === 'laps') return c.respawnT > 0 && state === 'race' ? 'RESPAWNING' : `LAP ${lapOf(c)}/${LAPS}`;
  if (settings.mode === 'flag') return c.respawnT > 0 && state === 'race' ? 'RESPAWNING' : `🚩 ${Math.floor(c.flagT)}/${FLAG_WIN}s`;
  return '';
}

// ----- Teams scoring -----
function endTeamRound() {
  const act = activeCars();
  const survivor = act.find(c => c.alive && !c.falling) || outOrder[outOrder.length - 1];
  const w = teamOf(survivor);
  teamPts[w]++;
  for (const c of act) c.points = teamPts[teamOf(c)];
  lastWinner = survivor; camFocus = survivor;
  state = 'roundEnd'; stateT = 3.2; slowT = 1.0;
  survivor.alive = true;
  burst(survivor.pos.x, 2, survivor.pos.z, 0xffffff, 30, 10, 14, 1.4);
  [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => tone(f, 0.18, 'square', 0.09), k * 110));
  bigMsg(`<span style="color:${TEAMS[w].css}">${TEAMS[w].name}</span> wins the round!`,
    `<span style="color:${TEAMS[0].css}">HOT ${teamPts[0]}</span> &nbsp; <span style="color:${TEAMS[1].css}">COOL ${teamPts[1]}</span>`);
  updateHud(true);
}
function endTeamMatch(champ) {
  state = 'matchEnd'; camFocus = champ;
  const w = teamOf(champ), names = activeCars().filter(c => teamOf(c) === w).map(c => `<span style="color:${c.color.css}">${c.color.name}</span>`).join(' &amp; ');
  bigMsg(`<span style="color:${TEAMS[w].css}">${TEAMS[w].name}</span> are the CHAMPIONS!`,
    `${names} · ${teamPts[w]} to ${teamPts[1 - w]}` +
    '<br><small>ENTER or A to play again · M or B for menu</small><div class="bigbtns"><button data-act="again">Play again</button><button data-act="menu">Menu</button></div>');
  [523, 659, 784, 1046, 784, 1046].forEach((f, k) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), k * 160));
}
window.__modes = { flag, get teamPts() { return teamPts; }, lapOf };
