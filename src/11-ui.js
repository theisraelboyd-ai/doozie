// ---------- UI ----------
const elBig = document.getElementById('big'), elBigT = document.getElementById('bigT'), elBigS = document.getElementById('bigS');
function bigMsg(t, s) { elBigT.innerHTML = t; elBigS.innerHTML = s || ''; elBig.style.opacity = t ? 1 : 0; }
let toastT = 0;
function toast(h) { const el = document.getElementById('toast'); el.innerHTML = h; el.style.opacity = 1; toastT = 1.6; }
function flashMsg(t, dur) { toast(t); toastT = dur; }

function buildHud() {
  const hud = document.getElementById('hud');
  hud.innerHTML = '';
  for (const c of activeCars()) {
    const d = document.createElement('div');
    d.className = 'card'; d.id = 'card' + c.i;
    d.style.borderColor = c.color.css;
    if (settings.mode === 'teams') d.style.background = TEAMS[teamOf(c)].bg;
    d.innerHTML = `<div class="nm" style="color:${c.color.css}">${c.color.name}${settings.slots[c.i] === 'pad' ? ' <small>PAD ' + (settings.padOf[c.i] + 1) + '</small>' : settings.slots[c.i] === 'phone' ? ' <small>PHONE</small>' : settings.slots[c.i] === 'touch' ? ' <small>YOU</small>' : settings.slots[c.i] === 'net' ? ' <small>' + (netClient && netClient.slot === c.i ? 'YOU' : 'NET') + '</small>' : c.human ? '' : ' <small>CPU</small>'}</div>
      <div class="pts"></div><div class="pips"></div><div class="md"></div><div class="bst"><i></i></div><div class="itm"></div><div class="out">OUT</div>`;
    hud.appendChild(d);
  }
  if (settings.gunner) {
    const d = document.createElement('div');
    d.className = 'card gun'; d.id = 'cardGun'; d.style.borderColor = '#ab47bc';
    d.innerHTML = `<div class="nm" style="color:#ce93d8">ROCKETS <small>MOUSE</small></div><div class="pts">0</div><div class="lbl">hits</div><div class="bst"><i style="background:#ce93d8"></i></div>`;
    hud.appendChild(d);
  }
  updateHud(true);
}
let hudT = 0;
function updateHud(force) {
  for (const c of activeCars()) {
    const d = document.getElementById('card' + c.i); if (!d) continue;
    d.querySelector('.pts').textContent = c.points;
    let pips = '';
    for (let k = 0; k < settings.target; k++) pips += `<span class="${k < c.points ? 'on' : ''}" style="${k < c.points ? 'background:' + c.color.css : ''}"></span>`;
    if (force) d.querySelector('.pips').innerHTML = pips;
    else if (d.dataset.p !== String(c.points)) d.querySelector('.pips').innerHTML = pips;
    d.dataset.p = c.points;
    d.querySelector('.bst i').style.width = `${Math.round((1 - Math.max(0, c.boostCd) / 3) * 100)}%`;
    const it = c.item ? ITEMS[c.item].icon + (c.ammo > 1 ? '<small>×' + c.ammo + '</small>' : '') : (c.shield > 0 ? '🛡️' : '');
    if (d.dataset.it !== it) { d.dataset.it = it; d.querySelector('.itm').innerHTML = it; }
    const out = (state === 'race' || state === 'roundEnd') && !c.alive && c !== lastWinner;
    d.classList.toggle('isout', out && state === 'race' && !respawnMode());
    const md = modeLine(c);
    if (d.dataset.md !== md) { d.dataset.md = md; d.querySelector('.md').innerHTML = md; }
    d.classList.toggle('flag', flag.holder === c);
    d.classList.toggle('warn', state === 'race' && c.alive && c.warn > 0.05);
  }
  const gd = document.getElementById('cardGun');
  if (gd) { gd.querySelector('.pts').textContent = gun.hits; gd.querySelector('.bst i').style.width = `${Math.round((1 - Math.max(0, gun.cd) / GUN_CD) * 100)}%`; }
}

// Menu
function cycleCar(i, dir) {
  const k = CAR_ORDER.indexOf(settings.carOf[i]);
  settings.carOf[i] = CAR_ORDER[(k + dir + CAR_ORDER.length) % CAR_ORDER.length];
  if (settings.carOf[i] !== 'random') setCarType(cars[i], settings.carOf[i]);
  tone(520 + 60 * CAR_ORDER.indexOf(settings.carOf[i]), 0.06, 'square', 0.05);
  buildMenu();
}
const TRACK_BLURB = {
  harbour: 'Docks and cranes · drop off the edge into the sea',
  forest: 'Foggy pine woods · leave the road and the woods take you',
  haunted: 'Night · lanterns, willows, ghosts and screams',
  random: 'A different track every match',
};
const WHO = { keys: 'KEYBOARD', pad: 'CONTROLLER', phone: 'PHONE', touch: 'THIS SCREEN', net: 'LAPTOP', cpu: 'COMPUTER', off: '' };
function buildMenu() {
  const nc = netClient, lob = nc && nc.lobby;
  const slots = lob ? lob.slots : settings.slots, carOf = lob ? lob.carOf : settings.carOf;
  const wrap = document.getElementById('slots'); wrap.innerHTML = '';
  COLORS.forEach((c, i) => {
    const s = slots[i], ct = CAR_TYPES[carOf[i]] || CAR_TYPES.classic, mine = nc && nc.slot === i;
    const d = document.createElement('button');
    d.className = 'slot ' + s + (mine ? ' me' : ''); d.style.setProperty('--c', c.css);
    if (s === 'off') d.innerHTML = `<div class="st-band">${c.name}</div><div class="st-add">${nc ? 'Empty' : '+ Add a car'}</div>`;
    else d.innerHTML = `<div class="st-band">${c.name}</div>
      <div class="st-car">${ct.icon}</div>
      <div class="st-carname">${!nc || mine ? '<span class="car-prev">&#8249;</span>' : ''}${ct.name}${!nc || mine ? '<span class="car-next">&#8250;</span>' : ''}</div>
      <div class="st-blurb">${ct.blurb}</div>
      <div class="st-who">${mine ? 'YOU' : WHO[s]}${s === 'pad' && !lob ? ' ' + (settings.padOf[i] + 1) : ''}</div>
      <div class="st-keys">${lob ? '' : s === 'keys' ? KEYSETS[i].label : s === 'pad' ? 'B to leave' : s === 'phone' || s === 'net' ? 'click to remove' : s === 'touch' ? 'touch buttons' : s === 'cpu' ? 'click to change' : ''}</div>`;
    d.onclick = e => {
      audio(); tone(660, 0.05, 'square', 0.06);
      const dir = e.target.closest('.car-prev') ? -1 : e.target.closest('.car-next') ? 1 : 0;
      if (nc) { if (mine && dir) netSend({ t: 'car', dir }); return; }
      if (dir) { cycleCar(i, dir); return; }
      if (s === 'phone' || s === 'net') { const p = phoneForSlot(i); if (p) unseatPhone(p, true); return; }
      if (s === 'pad') settings.padOf[i] = null;
      settings.slots[i] = s === 'keys' ? 'cpu' : s === 'cpu' ? 'off' : (s === 'pad' || s === 'touch') ? 'cpu' : (IS_TOUCH ? 'cpu' : 'keys');
      buildMenu();
    };
    wrap.appendChild(d);
  });
  const trackId = lob ? lob.track : settings.track, mode = lob ? lob.mode : settings.mode;
  document.getElementById('optTrack').textContent = trackId === 'random' ? 'Random' : (TRACKS.find(t => t.id === trackId) || TRACKS[0]).name;
  document.getElementById('trackSub').textContent = TRACK_BLURB[trackId] || '';
  document.getElementById('optMode').textContent = MODE_NAMES[mode] || 'Knockout';
  document.getElementById('modeTag').innerHTML = MODE_TAGS[mode] || '';
  document.getElementById('netBanner').innerHTML = nc ? `Connected to room <b>${nc.code}</b>${nc.slot >= 0 ? ` · you're <b style="color:${COLORS[nc.slot].css}">${COLORS[nc.slot].name}</b>` : ''} · the host picks the track and mode` : '';
  document.getElementById('go').textContent = nc ? 'READY · START' : 'START';
  document.getElementById('optTarget').textContent = settings.target;
  document.getElementById('optSkill').textContent = SKILL_NAMES[settings.skill];
  document.getElementById('optWater').textContent = settings.water === 'deadly' ? 'Fall = out' : 'Bouncy';
  document.getElementById('optSound').textContent = SOUND_NAMES[settings.sound];
  document.getElementById('optGun').textContent = settings.gunner ? 'On' : 'Off';
  document.getElementById('optGfx').textContent = GFX_NAMES[settings.gfx];
  document.getElementById('optAuto').textContent = settings.autoGas ? 'On' : 'Off';
  document.getElementById('optCam').textContent = CAM_NAMES[settings.cam];
  document.getElementById('optWeapons').textContent = settings.weapons ? 'On' : 'Off';
  document.getElementById('optCreatures').textContent = CREATURE_NAMES_UI[settings.creatures];
}
for (const id of ['btnTarget', 'btnWeapons', 'btnCreatures', 'btnWater', 'btnSkill', 'btnAuto', 'btnGun', 'btnCam']) document.getElementById(id).classList.add('hostonly');
document.getElementById('btnTarget').onclick = () => { const o = [3, 5, 8, 10]; settings.target = o[(o.indexOf(settings.target) + 1) % o.length]; buildMenu(); };
document.getElementById('btnSkill').onclick = () => { settings.skill = (settings.skill + 1) % 3; buildMenu(); };
document.getElementById('btnWater').onclick = () => { settings.water = settings.water === 'deadly' ? 'bouncy' : 'deadly'; buildMenu(); };
document.getElementById('btnGfx').onclick = () => { nextGfx(); applyGfx(); buildMenu(); };
document.getElementById('btnGun').onclick = () => { settings.gunner = !settings.gunner; buildMenu(); };
function cycleTrack(dir = 1) {
  if (netClient) return;
  const ids = [...TRACKS.map(t => t.id), 'random'];
  settings.track = ids[(ids.indexOf(settings.track) + dir + ids.length) % ids.length];
  if (settings.track !== 'random') buildTrack(settings.track);
  buildMenu();
}
document.getElementById('btnCreatures').onclick = () => { const o = ['off', 'own', 'anywhere']; settings.creatures = o[(o.indexOf(settings.creatures) + 1) % 3]; buildMenu(); };
document.getElementById('btnWeapons').onclick = () => { settings.weapons = !settings.weapons; buildMenu(); };
document.getElementById('btnSound').onclick = () => { audio(); settings.sound = SOUND_ORDER[(SOUND_ORDER.indexOf(settings.sound) + 1) % 3]; applySoundSetting(); try { localStorage.setItem('doozie-sound', settings.sound); } catch (e) {} tone(660, 0.05, 'square', 0.06); buildMenu(); };
function cycleMode(dir = 1) { if (netClient) return; audio(); tone(660, 0.05, 'square', 0.06); settings.mode = MODE_ORDER[(MODE_ORDER.indexOf(settings.mode) + dir + MODE_ORDER.length) % MODE_ORDER.length]; buildMenu(); }
document.getElementById('btnMode').onclick = () => cycleMode(1);
document.getElementById('modeNext').onclick = () => cycleMode(1);
document.getElementById('modePrev').onclick = () => cycleMode(-1);
document.getElementById('trackNext').onclick = () => { audio(); cycleTrack(1); };
document.getElementById('trackPrev').onclick = () => { audio(); cycleTrack(-1); };
document.getElementById('btnSettings').onclick = () => { audio(); document.getElementById('drawer').classList.add('open'); };
document.getElementById('drClose').onclick = () => document.getElementById('drawer').classList.remove('open');
document.getElementById('btnTrack').onclick = () => { audio(); cycleTrack(1); };
function cycleCam() { settings.cam = CAM_STYLES[(CAM_STYLES.indexOf(settings.cam) + 1) % CAM_STYLES.length]; buildMenu(); }
document.getElementById('btnCam').onclick = cycleCam;
document.getElementById('btnAuto').onclick = () => { settings.autoGas = !settings.autoGas; buildMenu(); };
document.getElementById('go').onclick = () => startMatch();
buildMenu();

function togglePause() {
  if (state === 'paused') { state = prevState; document.getElementById('pause').style.display = 'none'; }
  else if (state !== 'menu' && state !== 'matchEnd') { prevState = state; state = 'paused'; document.getElementById('pause').style.display = 'flex'; }
}
function toMenu() {
  clearCreature(); stopEngines();
  state = 'menu'; bigMsg('', '');
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  document.body.classList.remove('playing');
  document.getElementById('pause').style.display = 'none';
  seatWaitingPhones();
}

function onKey(code) {
  const dr = document.getElementById('drawer');
  if (code === 'Escape' && dr.classList.contains('open')) { dr.classList.remove('open'); return; }
  if (netClient) {
    if (code === 'KeyV') { nextGfx(); applyGfx(); buildMenu(); toast(`Graphics: <b>${GFX_NAMES[settings.gfx]}</b>`); }
    if (code === 'KeyN') toggleFps();
    if (code === 'Escape' || code === 'KeyP') netSend({ t: 'pause' });
    if (code === 'Enter' && (state === 'menu' || state === 'matchEnd')) netSend({ t: 'start' });
    return;
  }
  // B / Z summon Bigfoot / the Ghost car during a race (for the host, or for testing)
  if (state === 'race' && code === 'KeyB') { if (spawnBigfoot()) toast('<b>BIGFOOT</b> summoned!'); return; }
  if (state === 'race' && code === 'KeyZ') { if (spawnGhost()) toast('The <b>Ghost car</b> is coming…'); return; }
  if (code === 'KeyC') { cycleCam(); toast(`Camera: <b>${CAM_NAMES[settings.cam]}</b>`); return; }
  if (code === 'KeyV') { nextGfx(); applyGfx(); buildMenu(); toast(`Graphics: <b>${GFX_NAMES[settings.gfx]}</b>`); return; }
  if (code === 'KeyN') { toggleFps(); return; }
  if (state === 'menu') { if (code === 'Enter' || code === 'Space') startMatch(); return; }
  if (state === 'matchEnd') {
    if (code === 'Enter') { document.getElementById('menu').style.display = 'none'; startMatch(); }
    if (code === 'KeyM') toMenu();
    return;
  }
  if (code === 'Escape' || code === 'KeyP') { togglePause(); return; }
  if (state === 'paused' && code === 'KeyM') toMenu();
}
