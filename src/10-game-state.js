// ---------- Game state ----------
let state = 'menu'; // menu | countdown | race | roundEnd | matchEnd | paused
let prevState = 'race';
let stateT = 0, timeScale = 1, slowT = 0, raceT = 0;
let outOrder = [];
let roundNo = 0;
let lastWinner = null;
const camTarget = new T.Vector3(), camLook = new T.Vector3();
let camDist = 60, camFocus = null;
const CAM_PITCH = 0.98; // radians above horizontal
const MAX_CAM = 80;

function activeCars() { return cars.filter(c => c.active); }
function aliveCars() { return cars.filter(c => c.alive && !c.falling); }

function placeCars(atIdx) {
  const act = activeCars();
  act.forEach((c, n) => {
    const row = Math.floor(n / 2), side = n % 2 ? 1 : -1;
    const k = ((atIdx - row * Math.round(7 / SPACING)) % N + N) % N;
    const w = side * 3.6;
    c.idx = k; c.pos.set(P[k].x + NRM[k].x * w, 0, P[k].z + NRM[k].z * w);
    c.h = Math.atan2(TAN[k].x, TAN[k].z);
    c.vel.set(0, 0); c.y = 0; c.vy = 0; c.alive = true; c.falling = false; c.lost = false; c.off = 0; c.warn = 0; c.spin = 0; c.boostCd = 0;
    c.mesh.group.visible = c.mesh.shadow.visible = c.mesh.ring.visible = true;
    c.mesh.group.rotation.set(0, c.h, 0);
    c.prog = atIdx - row * Math.round(7 / SPACING);
  });
  for (const c of cars) if (!c.active) c.mesh.group.visible = c.mesh.shadow.visible = c.mesh.ring.visible = false;
}

function startMatch() {
  audio();
  cars.forEach((c, i) => {
    const s = settings.slots[i];
    c.active = s !== 'off'; c.human = s === 'keys' || s === 'pad' || s === 'phone' || s === 'touch'; c.points = 0; c.alive = false;
  });
  if (activeCars().length < 2) { flashMsg('Need at least 2 cars', 1.5); return; }
  // pick the track (Random chooses a different one each match)
  const want = settings.track === 'random' ? TRACKS[Math.floor(Math.random() * TRACKS.length)].id : settings.track;
  if (!curTrack || curTrack.id !== want) buildTrack(want);
  roundNo = 0; lastWinner = null; gun.hits = 0; gun.cd = 0;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.body.classList.add('playing');
  buildHud();
  newRound(0);
}

function newRound(atIdx) {
  roundNo++;
  clearCreature(); resetAmbient();
  outOrder = [];
  placeCars(atIdx);
  resetWeapons();
  const lead = activeCars()[0];
  camTarget.copy(lead.pos); camLook.copy(lead.pos); camDist = 40; camFocus = null;
  camYaw = settings.cam === 'classic' ? Math.PI : trackYaw(atIdx + Math.round(20 / SPACING)); camPitch = settings.cam === 'calm' ? 0.95 : 0.85;
  state = 'countdown'; stateT = 3.2; timeScale = 1; raceT = 0;
  bigMsg(`Round ${roundNo}`, 'Get ready…');
}

function knockOut(car, why) {
  if (outOrder.includes(car)) return;
  outOrder.push(car);
  car.alive = false;
  rumble(car, 1, 1, 450);
  const remaining = activeCars().filter(c => c.alive && !c.falling).length;
  if (car.lost) {
    const lc = curTrack.lostColors || [0x2e7d32, 0x8bc34a];
    burst(car.pos.x, 1.5, car.pos.z, lc[0], 26, 9, 9, 1.1); burst(car.pos.x, 2, car.pos.z, lc[1], 14, 6, 10, 0.9);
    if (curTrack.theme === 'haunted') scream(0.09);
    else { tone(520, 0.12, 'square', 0.1, 600); setTimeout(() => noise(0.35, 0.2, 2500), 60); }
  } else if (car.falling) {
    noise(0.5, 0.3, 1200);
    burst(car.pos.x, -0.5, car.pos.z, 0xe3f2fd, 26, 7, 10, 1);
  } else {
    burst(car.pos.x, 1, car.pos.z, car.color.hex, 20, 9, 8, 1);
    tone(300, 0.4, 'square', 0.1, -220);
  }
  if (remaining >= 1) { slowT = 0.6; }
  toast(`<b style="color:${car.color.css}">${car.color.name}</b> ${why}!`);
  if (remaining <= 1) endRound();
}

function endRound() {
  if (state !== 'race') return;
  const act = activeCars();
  let winner = act.find(c => c.alive && !c.falling) || outOrder[outOrder.length - 1];
  const ranking = [winner, ...outOrder.filter(c => c !== winner).reverse()];
  const n = ranking.length;
  const deltas = new Map();
  ranking.forEach((c, r) => {
    let d = 0;
    if (r === 0) d = 2; else if (r === 1 && n >= 3) d = 1; else if (r === n - 1 && n >= 3) d = -1;
    deltas.set(c, d);
    c.points = Math.max(0, c.points + d);
  });
  lastWinner = winner;
  camFocus = winner;
  state = 'roundEnd'; stateT = 3.2; slowT = 1.0;
  winner.alive = true;
  burst(winner.pos.x, 2, winner.pos.z, 0xffffff, 30, 10, 14, 1.4);
  [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => tone(f, 0.18, 'square', 0.09), k * 110));
  const sub = ranking.map(c => {
    const d = deltas.get(c);
    return `<span style="color:${c.color.css}">${c.color.name} ${d > 0 ? '+' + d : d < 0 ? d : '0'}</span>`;
  }).join(' &nbsp; ');
  bigMsg(`<span style="color:${winner.color.css}">${winner.color.name}</span> wins the round!`, sub);
  updateHud(true);
}

function endMatch(champ) {
  state = 'matchEnd'; camFocus = champ;
  const order = activeCars().slice().sort((a, b) => b.points - a.points);
  bigMsg(`<span style="color:${champ.color.css}">${champ.color.name}</span> is the CHAMPION!`,
    order.map((c, k) => `<span style="color:${c.color.css}">${k + 1}. ${c.color.name} ${c.points}</span>`).join(' &nbsp; ') +
    '<br><small>ENTER or A to play again · M or B for menu</small><div class="bigbtns"><button data-act="again">Play again</button><button data-act="menu">Menu</button></div>');
  [523, 659, 784, 1046, 784, 1046].forEach((f, k) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), k * 160));
}
