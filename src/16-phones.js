// ---------- Phones: QR join + play-on-this-screen touch ----------
const phones = new Map();   // client id -> { cid, conn, role, slot, inp, lastIn, goneAt, viewerNo, cd }
const phoneWaiting = [];     // players who joined mid-match
let roomCode = '', peerHost = null, phoneStateT = 0, viewerCount = 0;
const touchInput = { st: 0, thr: 0, boost: false, fire: false };
const CHEERS = ['👏', '😂', '😱', '🔥', '👻', '🦶'];
const POWER_CD = { rocket: 12, boost: 10, bigfoot: 20, ghost: 20 };

function slotTaken(t) { return t === 'pad' || t === 'phone' || t === 'touch' || t === 'net'; }
function remoteSlot(t) { return t === 'phone' || t === 'net'; }
function phoneForSlot(s) { for (const p of phones.values()) if (p.slot === s && p.role === 'player') return p; return null; }
function phoneSend(p, m) { try { if (p && p.conn && p.conn.open) p.conn.send(m); } catch (e) {} }
function freeCars() { return settings.slots.filter(t => !slotTaken(t)).length; }
function viewers() { return [...phones.values()].filter(p => p.role === 'viewer' && p.conn); }

function seatPhone(p) {
  if (p.slot >= 0 && remoteSlot(settings.slots[p.slot])) { sayHello(p); return; } // already seated (reconnect)
  const s = settings.slots.findIndex(t => !slotTaken(t));
  if (s < 0) { phoneSend(p, { t: 'full' }); return; }
  settings.slots[s] = p.net ? 'net' : 'phone'; settings.padOf[s] = null; p.slot = s; p.role = 'player';
  sayHello(p);
  audio(); tone(520, 0.08, 'square', 0.08); setTimeout(() => tone(780, 0.1, 'square', 0.08), 90); setJoinPanelCount();
  toast(`${p.net ? (p.name ? '<b>' + p.name + '</b>' : 'A player') + ' joined –' : 'A phone is'} driving <b style="color:${COLORS[s].css}">${COLORS[s].name}</b>`);
  buildMenu();
}
function sayHello(p) {
  if (p.role === 'viewer') phoneSend(p, { t: 'hello', role: 'viewer', name: 'VIEWER ' + p.viewerNo, css: '#7e57c2' });
  else phoneSend(p, { t: 'hello', role: 'player', name: COLORS[p.slot].name, css: COLORS[p.slot].css });
  phoneSend(p, { t: 'state', s: state, free: freeCars(), viewers: viewers().length });
  if (p.net) { phoneSend(p, netLobbyMsg()); if (state !== 'menu') netSendSetup(p); }
}
function unseatPhone(p, kicked) {
  if (p.slot >= 0 && remoteSlot(settings.slots[p.slot])) { settings.slots[p.slot] = 'cpu'; toast(`<b style="color:${COLORS[p.slot].css}">${COLORS[p.slot].name}</b>'s ${p.net ? 'laptop' : 'phone'} left`); }
  if (kicked) phoneSend(p, { t: 'kicked' });
  p.slot = -1; buildMenu();
}
function seatWaitingPhones() { while (phoneWaiting.length) { const p = phoneWaiting.shift(); if (p.conn && p.role === 'player') seatPhone(p); } }
function makeViewer(p) {
  if (p.slot >= 0) unseatPhone(p, false);
  p.role = 'viewer'; if (!p.viewerNo) p.viewerNo = ++viewerCount;
  sayHello(p); setJoinPanelCount();
}

function onPhoneMessage(p, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'join' || m.t === 'role') {
    if (m.net) { p.net = true; p.name = String(m.name || '').replace(/[^\w '\-]/g, '').slice(0, 12); }
    if (m.role === 'viewer') { makeViewer(p); return; }
    if (p.slot >= 0 && remoteSlot(settings.slots[p.slot])) { p.role = 'player'; sayHello(p); return; }
    p.role = 'player';
    if (state === 'menu' || state === 'matchEnd') seatPhone(p);
    else {
      if (!phoneWaiting.includes(p)) phoneWaiting.push(p);
      phoneSend(p, { t: 'wait' });
      if (p.net) { phoneSend(p, netLobbyMsg()); netSendSetup(p); toast(`<b>${p.name || 'A player'}</b> is waiting – they'll join the next match`); tone(660, 0.1, 'triangle', 0.08); setJoinPanelCount(); }
    }
  } else if (m.t === 'in') {
    p.inp.st = Math.max(-1, Math.min(1, Number(m.st) || 0)); p.inp.thr = Math.max(-1, Math.min(1, Number(m.thr) || 0)); p.inp.boost = !!m.boost; p.inp.fire = !!m.fire;
    p.lastIn = performance.now();
  } else if (m.t === 'start') { if (state === 'menu' || state === 'matchEnd') startMatch(); }
  else if (m.t === 'pause') { if (p.role === 'player') togglePause(); }
  else if (m.t === 'car') { if (p.slot >= 0 && state === 'menu') cycleCar(p.slot, m.dir < 0 ? -1 : 1); }
  else if (m.t === 'cheer') { if (CHEERS.includes(m.e)) showCheer(m.e, p); }
  else if (m.t === 'power' && p.role === 'viewer') viewerPower(p, m.k);
}

function newRoomCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); }
function startRoom(tries = 0, code) {
  if (typeof Peer === 'undefined') return;
  // keep the same room code between visits, so a code you've already shared still works
  if (!code) { try { code = localStorage.getItem('doozie-room'); } catch (e) {} }
  if (!code || !/^[A-Z]{4}$/.test(code)) code = newRoomCode();
  roomCode = code; try { localStorage.setItem('doozie-room', code); } catch (e) {}
  setJoinPanel('connecting');
  const peer = new Peer('doozie-' + roomCode, peerOptions());
  peerHost = peer;
  peer.on('open', () => setJoinPanel('ready'));
  peer.on('error', e => {
    // the code may still be held for a moment by this screen's last visit: wait, then try again
    if (e.type === 'unavailable-id' && tries < 4) { peer.destroy(); setTimeout(() => startRoom(tries + 1, tries < 2 ? code : newRoomCode()), tries < 2 ? 2500 : 0); return; }
    if (e.type === 'peer-unavailable') return;
    if (!peer.open) setJoinPanel('offline');
  });
  peer.on('disconnected', () => { setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} }, 1000); });
  peer.on('connection', conn => {
    let p = null;
    conn.on('data', m => {
      if (!p) {
        // first message identifies the phone; a returning phone gets its old car back
        const cid = (m && typeof m.cid === 'string') ? m.cid.slice(0, 16) : conn.connectionId;
        p = phones.get(cid);
        if (!p) { p = { cid, conn: null, role: null, slot: -1, inp: { st: 0, thr: 0, boost: false }, lastIn: 0, goneAt: 0, viewerNo: 0, cd: { rocket: 0, boost: 0 } }; phones.set(cid, p); }
        if (p.conn && p.conn !== conn) { try { p.conn.close(); } catch (e) {} }
        p.conn = conn; p.goneAt = 0;
      }
      onPhoneMessage(p, m);
    });
    conn.on('close', () => { if (p && p.conn === conn) { p.conn = null; p.goneAt = performance.now(); setJoinPanelCount(); } });
    conn.on('error', () => {});
  });
}
// coming back to the page (after sharing the code in another app, say): make sure the room is still open
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !peerHost) return;
  if (peerHost.destroyed) startRoom(0, roomCode);
  else if (peerHost.disconnected) { try { peerHost.reconnect(); } catch (e) {} }
});
function roomLink() {
  const q = new URLSearchParams({ room: roomCode });
  if (URLQ.get('peerhost')) { q.set('peerhost', URLQ.get('peerhost')); q.set('peerport', URLQ.get('peerport') || '9000'); }
  return location.origin + location.pathname + '?' + q.toString();
}
function shareRoom() {
  const url = roomLink(), text = `Join my Doozie! game – room ${roomCode}`;
  if (navigator.share) navigator.share({ title: 'Doozie!', text, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copied – send it to a friend'), () => toast('Room code: <b>' + roomCode + '</b>'));
  else toast('Room code: <b>' + roomCode + '</b>');
}
function joinLink() {
  const q = new URLSearchParams({ join: roomCode });
  if (URLQ.get('peerhost')) { q.set('peerhost', URLQ.get('peerhost')); q.set('peerport', URLQ.get('peerport') || '9000'); }
  return location.origin + location.pathname + '?' + q.toString();
}
function setJoinPanel(mode) {
  const el = document.getElementById('phoneJoin'); if (!el) return;
  if (mode === 'ready') {
    let qrHtml = '';
    if (location.protocol !== 'file:') { const qr = qrcode(0, 'M'); qr.addData(joinLink()); qr.make(); qrHtml = `<div class="pj-qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>`; }
    el.innerHTML = `${qrHtml}<div class="pj-txt"><b>Room <span class="pj-code">${roomCode}</span></b><br><span class="pj-long">Scan to use a phone as a controller<br></span><button class="pj-share" id="pjShare">Share link to play</button><br><span id="pj-count"></span></div>`;
    document.getElementById('pjShare').onclick = e => { e.stopPropagation(); audio(); shareRoom(); };
    setJoinPanelCount();
  } else if (mode === 'connecting') el.innerHTML = `<div class="pj-txt"><b>Phone controller</b><br>Opening a room…</div>`;
  else el.innerHTML = `<div class="pj-txt"><b>Phone controller</b><br>Offline – needs internet</div>`;
}
function phoneRumble(s, ms) { const p = phoneForSlot(s); if (p) phoneSend(p, { t: 'buzz', ms: Math.round(ms) }); }
function setJoinPanelCount() {
  const el = document.getElementById('pj-count'); if (!el) return;
  const v = viewers().length, d = [...phones.values()].filter(p => p.role === 'player' && p.conn && !p.net).length;
  const online = [...phones.values()].filter(p => p.net && p.conn), w = online.filter(p => phoneWaiting.includes(p)).length;
  el.textContent = (d || v || online.length) ? [online.length ? `🌐 ${online.map(p => p.name || 'player').join(', ')}${w ? ` (${w} waiting)` : ''}` : '', d ? `📱 ${d} driving` : '', v ? `👀 ${v} watching` : ''].filter(Boolean).join(' · ') : '';
}
function phonesTick(dt) {
  // wall-clock timer, so slow frames never starve the phones of updates
  if (performance.now() >= phoneStateT) {
    phoneStateT = performance.now() + 500;
    const msg = { t: 'state', s: state, free: freeCars(), viewers: viewers().length };
    for (const p of phones.values()) {
      if (p.conn) phoneSend(p, msg);
      // a phone that has been gone for 30 s gives its car back to the computer
      else if (p.goneAt && performance.now() - p.goneAt > 30000) { if (p.slot >= 0) unseatPhone(p, false); phones.delete(p.cid); setJoinPanelCount(); }
    }
  }
  // touchscreen pad shows only while racing with a touch player
  const touchOn = (settings.slots.includes('touch') || (netClient && netClient.live && IS_TOUCH)) && state !== 'menu';
  if (touchOn !== document.body.classList.contains('touchplay')) {
    document.body.classList.toggle('touchplay', touchOn);
    resize(); applyViewShift();
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
    toast(`You're driving <b style="color:${COLORS[free].css}">${COLORS[free].name}</b>`);
  }
  buildMenu();
}
makeTouchPad(document.getElementById('touchpad'), o => { touchInput.st = o.st; touchInput.thr = o.thr; touchInput.boost = o.boost; touchInput.fire = o.fire; });
document.getElementById('btnTouch').onclick = () => { audio(); toggleTouchPlayer(); };
document.getElementById('tpPause').onclick = () => togglePause();
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (netClient) { if (a.dataset.act === 'again') netSend({ t: 'start' }); if (a.dataset.act === 'resume') netSend({ t: 'pause' }); if (a.dataset.act === 'menu') leaveNet('You left the game'); return; }
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
  if (document.body.classList.contains('touchplay') && w > h) camera.setViewOffset(w, h, 0, h * 0.18, w, h);
  else camera.clearViewOffset();
}
window.addEventListener('resize', applyViewShift);

// ----- Viewer fun -----
function showCheer(e, p) {
  const el = document.createElement('div');
  el.className = 'cheer'; el.textContent = e;
  el.style.left = (8 + Math.random() * 84) + '%';
  el.style.setProperty('--drift', ((Math.random() - 0.5) * 120) + 'px');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function viewerPower(p, k) {
  if (!(k in POWER_CD)) return;
  const now = performance.now() / 1000;
  if (p.cd[k] > now) return;
  if (state !== 'race') { phoneSend(p, { t: 'msg', text: 'Powers work during a race' }); return; }
  const alive = activeCars().filter(c => c.alive && !c.falling);
  if (!alive.length) return;
  const who = `<b style="color:#b39ddb">Viewer ${p.viewerNo}</b>`;
  if (k === 'bigfoot' || k === 'ghost') {
    if (creature) { phoneSend(p, { t: 'msg', text: 'Another creature is on the track – try again in a moment' }); return; }
    if (!(k === 'bigfoot' ? spawnBigfoot() : spawnGhost())) return;
    toast(k === 'bigfoot' ? `${who} sent in <b>BIGFOOT</b>!` : `${who} summoned the <b>Ghost car</b>!`);
  } else if (k === 'rocket') {
    const lead = alive.reduce((a, b) => (b.prog > a.prog ? b : a));
    spawnRocket(lead, null, false, 0x7e57c2, 0x651fff, 0.9);
    toast(`${who} fired a rocket at <b style="color:${lead.color.css}">${lead.color.name}</b>!`);
  } else if (k === 'boost') {
    const back = alive.reduce((a, b) => (b.prog < a.prog ? b : a));
    back.vel.x += Math.sin(back.h) * 22; back.vel.y += Math.cos(back.h) * 22;
    burst(back.pos.x, 1, back.pos.z, 0xb388ff, 18, 6, 4, 0.6);
    tone(300, 0.4, 'sawtooth', 0.07, 500); rumble(back, 0.3, 0.6, 200);
    toast(`${who} boosted <b style="color:${back.color.css}">${back.color.name}</b>!`);
  }
  p.cd[k] = now + POWER_CD[k];
  phoneSend(p, { t: 'cool', k, s: POWER_CD[k] });
}

window.__phones = phones;
