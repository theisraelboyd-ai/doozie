// ---------- Phones: QR join + play-on-this-screen touch ----------
const phones = new Map();   // peer connection id -> { conn, slot, inp }
const phoneWaiting = [];     // connections that joined mid-match
let roomCode = '', peerHost = null, phoneStateT = 0;
const touchInput = { st: 0, thr: 0, boost: false };

function slotTaken(t) { return t === 'pad' || t === 'phone' || t === 'touch'; }
function phoneForSlot(s) { for (const p of phones.values()) if (p.slot === s) return p; return null; }
function phoneSend(p, m) { try { if (p && p.conn.open) p.conn.send(m); } catch (e) {} }

function seatPhone(p) {
  const s = settings.slots.findIndex(t => !slotTaken(t));
  if (s < 0) { phoneSend(p, { t: 'full' }); return; }
  settings.slots[s] = 'phone'; settings.padOf[s] = null; p.slot = s;
  phoneSend(p, { t: 'hello', name: COLORS[s].name, css: COLORS[s].css });
  phoneSend(p, { t: 'state', s: state });
  audio(); tone(520, 0.08, 'square', 0.08); setTimeout(() => tone(780, 0.1, 'square', 0.08), 90);
  toast(`A phone is driving <b style="color:${COLORS[s].css}">${COLORS[s].name}</b>`);
  buildMenu();
}
function unseatPhone(p, kicked) {
  if (p.slot >= 0 && settings.slots[p.slot] === 'phone') { settings.slots[p.slot] = 'cpu'; toast(`<b style="color:${COLORS[p.slot].css}">${COLORS[p.slot].name}</b>'s phone left`); }
  if (kicked) phoneSend(p, { t: 'kicked' });
  p.slot = -1; buildMenu();
}
function seatWaitingPhones() { while (phoneWaiting.length) { const p = phoneWaiting.shift(); if (p.conn.open) seatPhone(p); } }

function startRoom(tries = 0) {
  if (typeof Peer === 'undefined') return;
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  roomCode = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
  setJoinPanel('connecting');
  const peer = new Peer('doozie-' + roomCode, peerOptions());
  peerHost = peer;
  peer.on('open', () => setJoinPanel('ready'));
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && tries < 3) { peer.destroy(); startRoom(tries + 1); return; }
    if (e.type === 'peer-unavailable') return;
    setJoinPanel('offline');
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('connection', conn => {
    const p = { conn, slot: -1, inp: { st: 0, thr: 0, boost: false } };
    phones.set(conn.connectionId, p);
    conn.on('data', m => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'join') {
        if (p.slot >= 0) return;
        if (state === 'menu' || state === 'matchEnd') seatPhone(p); else { phoneWaiting.push(p); phoneSend(p, { t: 'wait' }); }
      } else if (m.t === 'in') {
        p.inp.st = Math.max(-1, Math.min(1, Number(m.st) || 0)); p.inp.thr = Math.max(-1, Math.min(1, Number(m.thr) || 0)); p.inp.boost = !!m.boost;
      } else if (m.t === 'start') { if (state === 'menu' || state === 'matchEnd') startMatch(); }
      else if (m.t === 'pause') togglePause();
    });
    conn.on('close', () => { unseatPhone(p, false); phones.delete(conn.connectionId); const w = phoneWaiting.indexOf(p); if (w >= 0) phoneWaiting.splice(w, 1); });
  });
}
function joinLink() {
  const q = new URLSearchParams({ join: roomCode });
  if (URLQ.get('peerhost')) { q.set('peerhost', URLQ.get('peerhost')); q.set('peerport', URLQ.get('peerport') || '9000'); }
  return location.origin + location.pathname + '?' + q.toString();
}
function setJoinPanel(mode) {
  const el = document.getElementById('phoneJoin'); if (!el) return;
  if (mode === 'ready' && location.protocol !== 'file:') {
    const qr = qrcode(0, 'M'); qr.addData(joinLink()); qr.make();
    el.innerHTML = `<div class="pj-qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <div class="pj-txt"><b>Phone controller</b><br>Scan to join<br>Room <span class="pj-code">${roomCode}</span></div>`;
  } else if (mode === 'ready') {
    el.innerHTML = `<div class="pj-txt"><b>Phone controller</b><br>Room <span class="pj-code">${roomCode}</span><br><small>QR works on the hosted site</small></div>`;
  } else if (mode === 'connecting') el.innerHTML = `<div class="pj-txt"><b>Phone controller</b><br>Opening a room…</div>`;
  else el.innerHTML = `<div class="pj-txt"><b>Phone controller</b><br>Offline – needs internet</div>`;
}
function phoneRumble(s, ms) { const p = phoneForSlot(s); if (p) phoneSend(p, { t: 'buzz', ms: Math.round(ms) }); }
function phonesTick(dt) {
  phoneStateT -= dt;
  if (phoneStateT <= 0) { phoneStateT = 0.5; for (const p of phones.values()) if (p.slot >= 0) phoneSend(p, { t: 'state', s: state }); }
  // touchscreen pad shows only while racing with a touch player
  const touchOn = settings.slots.includes('touch') && state !== 'menu';
  if (touchOn !== document.body.classList.contains('touchplay')) {
    document.body.classList.toggle('touchplay', touchOn);
    applyViewShift();
  }
}

// "Play on this phone": the screen's own touchscreen drives a car
function toggleTouchPlayer() {
  const s = settings.slots.indexOf('touch');
  if (s >= 0) { settings.slots[s] = 'cpu'; }
  else {
    const free = settings.slots.findIndex(t => !slotTaken(t));
    if (free < 0) { toast('All four cars are taken'); return; }
    settings.slots[free] = 'touch'; settings.padOf[free] = null;
    toast(`You're driving <b style="color:${COLORS[free].css}">${COLORS[free].name}</b> – turn your phone sideways`);
  }
  buildMenu();
}
makeTouchPad(document.getElementById('touchpad'), o => { touchInput.st = o.st; touchInput.thr = o.thr; touchInput.boost = o.boost; });
document.getElementById('btnTouch').onclick = () => { audio(); toggleTouchPlayer(); };
document.getElementById('tpPause').onclick = () => togglePause();
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'again') startMatch();
  if (a.dataset.act === 'menu') toMenu();
  if (a.dataset.act === 'resume') togglePause();
});
if (IS_TOUCH) {
  document.body.classList.add('is-touch');
  settings.gfx = 'simple'; settings.gunner = false;
  settings.slots = ['cpu', 'cpu', 'cpu', 'cpu'];
  applyGfx(); buildMenu();
}
startRoom();

// With touch buttons covering the bottom of the screen, aim the picture a little lower
// so the cars sit in the clear upper part (the knock-out edge moves with it, so it stays fair)
function applyViewShift() {
  const w = window.innerWidth, h = window.innerHeight;
  if (document.body.classList.contains('touchplay')) camera.setViewOffset(w, h, 0, h * 0.18, w, h);
  else camera.clearViewOffset();
}
window.addEventListener('resize', applyViewShift);
