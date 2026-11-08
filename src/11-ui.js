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
    d.innerHTML = `<div class="nm" style="color:${c.color.css}">${c.color.name}${settings.slots[c.i] === 'pad' ? ' <small>PAD ' + (settings.padOf[c.i] + 1) + '</small>' : settings.slots[c.i] === 'phone' ? ' <small>PHONE</small>' : settings.slots[c.i] === 'touch' ? ' <small>YOU</small>' : c.human ? '' : ' <small>CPU</small>'}</div>
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
function buildMenu() {
  const wrap = document.getElementById('slots'); wrap.innerHTML = '';
  COLORS.forEach((c, i) => {
    const s = settings.slots[i];
    const d = document.createElement('button');
    d.className = 'slot ' + s; d.style.borderColor = c.css;
    d.innerHTML = `<div class="sw" style="background:${c.css}"></div><div class="nm">${c.name}</div>
      <div class="ty">${s === 'keys' ? 'KEYBOARD' : s === 'pad' ? 'CONTROLLER ' + (settings.padOf[i] + 1) : s === 'phone' ? 'PHONE' : s === 'touch' ? 'THIS SCREEN' : s === 'cpu' ? 'COMPUTER' : 'EMPTY'}</div>
      ${s !== 'off' ? `<div class="car" data-car="${i}" title="Change car">${CAR_TYPES[settings.carOf[i]].icon} ${CAR_TYPES[settings.carOf[i]].name} <small>${CAR_TYPES[settings.carOf[i]].blurb}</small></div>` : ''}
      <div class="ks">${s === 'keys' ? KEYSETS[i].label : s === 'pad' ? 'B to leave' : s === 'phone' ? 'click to remove' : s === 'touch' ? 'touch buttons' : s === 'cpu' ? 'drives itself' : 'click to add'}</div>`;
    d.onclick = e => {
      audio(); tone(660, 0.05, 'square', 0.06);
      if (e.target.closest('.car')) { cycleCar(i, 1); return; }
      if (s === 'phone') { const p = phoneForSlot(i); if (p) unseatPhone(p, true); return; }
      if (s === 'pad') settings.padOf[i] = null;
      settings.slots[i] = s === 'keys' ? 'cpu' : s === 'cpu' ? 'off' : (s === 'pad' || s === 'touch') ? 'cpu' : (IS_TOUCH ? 'cpu' : 'keys');
      buildMenu();
    };
    wrap.appendChild(d);
  });
  document.getElementById('optTarget').textContent = settings.target;
  document.getElementById('optSkill').textContent = SKILL_NAMES[settings.skill];
  document.getElementById('optWater').textContent = settings.water === 'deadly' ? 'Fall = out' : 'Bouncy';
  document.getElementById('optMode').textContent = MODE_NAMES[settings.mode];
  document.getElementById('optSound').textContent = SOUND_NAMES[settings.sound];
  document.getElementById('modeTag').innerHTML = MODE_TAGS[settings.mode];
  document.getElementById('optTrack').textContent = settings.track === 'random' ? 'Random' : (TRACKS.find(t => t.id === settings.track) || TRACKS[0]).name;
  document.getElementById('optGun').textContent = settings.gunner ? 'On' : 'Off';
  document.getElementById('optGfx').textContent = GFX_NAMES[settings.gfx];
  document.getElementById('optAuto').textContent = settings.autoGas ? 'On' : 'Off';
  document.getElementById('optCam').textContent = CAM_NAMES[settings.cam];
  document.getElementById('optWeapons').textContent = settings.weapons ? 'On' : 'Off';
  document.getElementById('optCreatures').textContent = CREATURE_NAMES_UI[settings.creatures];
}
document.getElementById('btnTarget').onclick = () => { const o = [3, 5, 8, 10]; settings.target = o[(o.indexOf(settings.target) + 1) % o.length]; buildMenu(); };
document.getElementById('btnSkill').onclick = () => { settings.skill = (settings.skill + 1) % 3; buildMenu(); };
document.getElementById('btnWater').onclick = () => { settings.water = settings.water === 'deadly' ? 'bouncy' : 'deadly'; buildMenu(); };
document.getElementById('btnGfx').onclick = () => { nextGfx(); applyGfx(); buildMenu(); };
document.getElementById('btnGun').onclick = () => { settings.gunner = !settings.gunner; buildMenu(); };
function cycleTrack() {
  const ids = [...TRACKS.map(t => t.id), 'random'];
  settings.track = ids[(ids.indexOf(settings.track) + 1) % ids.length];
  if (settings.track !== 'random') buildTrack(settings.track);
  buildMenu();
}
document.getElementById('btnCreatures').onclick = () => { const o = ['off', 'own', 'anywhere']; settings.creatures = o[(o.indexOf(settings.creatures) + 1) % 3]; buildMenu(); };
document.getElementById('btnWeapons').onclick = () => { settings.weapons = !settings.weapons; buildMenu(); };
document.getElementById('btnSound').onclick = () => { audio(); settings.sound = SOUND_ORDER[(SOUND_ORDER.indexOf(settings.sound) + 1) % 3]; applySoundSetting(); try { localStorage.setItem('doozie-sound', settings.sound); } catch (e) {} tone(660, 0.05, 'square', 0.06); buildMenu(); };
document.getElementById('btnMode').onclick = () => { audio(); tone(660, 0.05, 'square', 0.06); settings.mode = MODE_ORDER[(MODE_ORDER.indexOf(settings.mode) + 1) % MODE_ORDER.length]; buildMenu(); };
document.getElementById('btnTrack').onclick = () => { audio(); cycleTrack(); };
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
