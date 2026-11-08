// ---------- Network play: laptops join a hosted game with its room code ----------
// The HOST runs the real game. A joined laptop (a NET player) sends its keyboard/controller
// input and draws what the host sends ~30 times a second: cars, camera, projectiles, creatures
// and the effects (particles, sounds, messages) as events. Same shared camera on every screen.

// ===== host side =====
const netObjs = new Set();      // moving things the joined laptops need to see
let netIdSeq = 0, netEvents = [], netDepth = 0, netSnapT = 0, netLobbyT = 0;
function netMark(obj, recipe) { obj.userData.net = { id: ++netIdSeq, r: recipe }; netObjs.add(obj); return obj; }
function netPlayers() { return [...phones.values()].filter(p => p.net && p.conn && p.conn.open); }
const r2 = v => Math.round(v * 100) / 100;

// effects are forwarded as they happen: wrap the effect functions so the outermost call is sent
function netWrap(name, fn, mapArgs) {
  return function (...a) {
    if (!netClient && netDepth === 0 && phones.size) {
      for (const p of phones.values()) if (p.net && p.conn) { netEvents.push([name, mapArgs ? mapArgs(a) : a]); break; }
    }
    netDepth++;
    try { return fn.apply(this, a); } finally { netDepth--; }
  };
}
burst = netWrap('burst', burst); tone = netWrap('tone', tone); noise = netWrap('noise', noise);
toast = netWrap('toast', toast); bigMsg = netWrap('bigMsg', bigMsg); cheer = netWrap('cheer', cheer);
scream = netWrap('scream', scream); wail = netWrap('wail', wail); owl = netWrap('owl', owl); crow = netWrap('crow', crow); wind = netWrap('wind', wind);
showCheer = netWrap('showCheer', showCheer, a => [a[0]]);
boostSound = netWrap('boostSound', boostSound, a => [a[0].i]);

function seatNames() { return COLORS.map((_, i) => { const p = phoneForSlot(i); return (p && p.name) || ''; }); }
function netSetupMsg() {
  return {
    t: 'setup', track: curTrack.id, mode: settings.mode, target: settings.target, weapons: settings.weapons,
    slots: settings.slots, types: cars.map(c => c.type), round: roundNo, names: seatNames(),
  };
}
function netSendSetup(p) { const m = netSetupMsg(); if (p) phoneSend(p, m); else for (const q of netPlayers()) phoneSend(q, m); }
function netLobbyMsg() {
  return { t: 'lobby', slots: settings.slots, carOf: settings.carOf, track: settings.track, mode: settings.mode, room: roomCode, names: seatNames() };
}
function carSnap(c) {
  const g = c.mesh.group, ring = c.mesh.ring;
  return [c.active ? 1 : 0, g.visible ? 1 : 0, r2(g.position.x), r2(g.position.y), r2(g.position.z), r2(g.rotation.y), r2(g.rotation.x),
    ring.visible ? 1 : 0, ring.material.color.getHex(), r2(ring.scale.x), c.alive ? 1 : 0, c.falling ? 1 : 0, c.points, c.item || '', c.ammo || 0,
    c.shield > 0 ? 1 : 0, r2(Math.max(0, c.boostCd)), r2(c.warn || 0), r2(c.respawnT || 0), r2(c.flagT || 0), Math.round(c.prog - (c.startProg || 0)),
    r2(c.vel.x), r2(c.vel.y), c.mesh.shadow.visible ? 1 : 0];
}
function netHostTick() {
  if (netClient) return;
  const ps = netPlayers(); if (!ps.length) { netEvents.length = 0; return; }
  const now = performance.now();
  if (state === 'menu') {
    netEvents.length = 0;
    if (now >= netLobbyT) { netLobbyT = now + 700; const m = netLobbyMsg(); for (const p of ps) phoneSend(p, m); }
    if (now >= netSnapT) { netSnapT = now + 700; for (const p of ps) phoneSend(p, { t: 'snap', s: 'menu' }); }
    return;
  }
  if (now < netSnapT) return;
  netSnapT = now + 33;
  const dyn = [];
  for (const o of netObjs) {
    if (!o.parent) { netObjs.delete(o); continue; }
    const q = o.quaternion, n = o.userData.net;
    dyn.push([n.id, n.r, r2(o.position.x), r2(o.position.y), r2(o.position.z), r2(q.x), r2(q.y), r2(q.z), r2(q.w), r2(o.scale.x), o.visible ? 1 : 0]);
  }
  const cq = camera.quaternion;
  const snap = {
    t: 'snap', s: state, rn: roundNo, lw: lastWinner ? lastWinner.i : -1, fh: flag.holder ? flag.holder.i : -1,
    cam: [r2(camera.position.x), r2(camera.position.y), r2(camera.position.z), Math.round(cq.x * 1e4) / 1e4, Math.round(cq.y * 1e4) / 1e4, Math.round(cq.z * 1e4) / 1e4, Math.round(cq.w * 1e4) / 1e4, r2(camera.fov), r2(camTarget.x), r2(camTarget.y), r2(camTarget.z), r2(camDist), camFocus ? 1 : 0],
    cars: cars.map(carSnap), dyn, crates: crates.map(c => c.m.visible ? 1 : 0), ev: netEvents,
  };
  netEvents = [];
  for (const p of ps) phoneSend(p, snap);
}

// ===== client side (this laptop joined someone else's game) =====
// netClient (declared in 01-settings so the menu can read it while loading): { conn, code, slot, live, snap, lobby, objs: Map, inT }
const clientInput = { st: 0, thr: 0, boost: false, fire: false };
function clean(html) { return String(html).replace(/<\s*\/?\s*(script|iframe|object|embed|img|svg|link|style)[^>]*>/gi, '').replace(/\son\w+\s*=/gi, ' data-x='); }

function joinGame(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (code.length !== 4) { joinStatus('Room codes are 4 letters'); return; }
  if (code === roomCode) { joinStatus("That's this screen's own room"); return; }
  if (!peerHost || !peerHost.open) { joinStatus('Not online yet – check the internet connection'); return; }
  joinStatus('Connecting to room ' + code + '…');
  let name = ''; try { name = (document.getElementById('joinName').value || localStorage.getItem('doozie-name') || '').trim().slice(0, 12); localStorage.setItem('doozie-name', name); } catch (e) {}
  let cid; try { cid = sessionStorage.getItem('doozie-net-cid'); } catch (e) {}
  if (!cid) { cid = 'net-' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('doozie-net-cid', cid); } catch (e) {} }
  const conn = peerHost.connect('doozie-' + code, { reliable: true, serialization: 'json' });
  const failT = setTimeout(() => { if (!netClient || netClient.conn !== conn || !netClient.ok) { joinStatus("Couldn't reach room " + code + '. Is the code right, and is that game open?'); try { conn.close(); } catch (e) {} } }, 10000);
  netClient = { conn, code, slot: -1, live: false, snap: null, lobby: null, objs: new Map(), inT: 0, ok: false, cid, name, lastMsg: performance.now() };
  conn.on('open', () => { conn.send({ t: 'join', role: 'player', net: true, cid, name, dev: IS_TOUCH ? 'phone' : 'laptop' }); });
  conn.on('data', m => { if (netClient && netClient.conn === conn) { netClient.ok = true; netClient.lastMsg = performance.now(); clearTimeout(failT); onHostMessage(m); } });
  conn.on('close', () => { if (netClient && netClient.conn === conn) retryJoin(); });
  conn.on('error', () => {});
}
function retryJoin() {
  const nc = netClient; if (!nc) return;
  nc.retries = (nc.retries || 0) + 1;
  if (nc.retries > 4) { leaveNet('Lost the connection to the host'); return; }
  toast('Reconnecting…');
  setTimeout(() => {
    if (netClient !== nc || !peerHost) return;
    const c2 = peerHost.connect('doozie-' + nc.code, { reliable: true, serialization: 'json' });
    nc.conn = c2; nc.lastMsg = performance.now();
    c2.on('open', () => { nc.retries = 0; c2.send({ t: 'join', role: 'player', net: true, cid: nc.cid, name: nc.name || '', dev: IS_TOUCH ? 'phone' : 'laptop' }); });
    c2.on('data', m => { if (netClient === nc && nc.conn === c2) { nc.lastMsg = performance.now(); onHostMessage(m); } });
    c2.on('close', () => { if (netClient === nc && nc.conn === c2) retryJoin(); });
    c2.on('error', () => {});
  }, 1500);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && netClient) { netClient.lastMsg = performance.now(); if (!netClient.conn.open) retryJoin(); } });
function joinStatus(t) { const el = document.getElementById('joinStatus'); if (el) el.textContent = t; }
function leaveNet(why) {
  const nc = netClient; if (!nc) return;
  netClient = null;
  try { nc.conn.close(); } catch (e) {}
  for (const o of nc.objs.values()) scene.remove(o);
  stopEngines(); bigMsg('', '');
  document.getElementById('pause').style.display = 'none';
  document.body.classList.remove('netclient');
  // put this screen back to a normal local lobby
  settings.slots = IS_TOUCH ? ['cpu', 'cpu', 'cpu', 'cpu'] : ['keys', 'keys', 'cpu', 'cpu'];
  state = 'playing-local'; toMenu();
  buildMenu();
  if (why) toast(why);
}
function onHostMessage(m) {
  if (!m || typeof m !== 'object') return;
  const nc = netClient;
  if (m.t === 'hello') {
    nc.slot = m.role === 'player' ? COLORS.findIndex(c => c.name === m.name) : -1;
    document.body.classList.add('netclient'); closeJoinDialog();
    toast(nc.slot >= 0 ? `Joined room <b>${nc.code}</b> – you're <b style="color:${COLORS[nc.slot].css}">${COLORS[nc.slot].name}</b>` : `Joined room <b>${nc.code}</b>`);
    buildMenu();
  } else if (m.t === 'wait') { toast('Match in progress – watching until the next one'); }
  else if (m.t === 'full') { joinStatus('That game is full (4 cars)'); }
  else if (m.t === 'kicked') { leaveNet('The host removed you from the game'); }
  else if (m.t === 'lobby') { nc.lobby = m; if (state === 'menu') buildMenu(); }
  else if (m.t === 'setup') applySetup(m);
  else if (m.t === 'snap') onSnap(m);
  else if (m.t === 'buzz') { const pad = getPad(0); if (pad) rumblePad(0, 0.4, 0.8, m.ms || 120); }
}
function applySetup(m) {
  settings.mode = MODE_ORDER.includes(m.mode) ? m.mode : 'knockout';
  settings.target = Number(m.target) || 5; settings.weapons = !!m.weapons; settings.gunner = false;
  if (!curTrack || curTrack.id !== m.track) buildTrack(m.track);
  cars.forEach((c, i) => {
    const s = m.slots[i]; c.active = s !== 'off'; c.human = s !== 'cpu' && s !== 'off';
    setCarType(c, CAR_TYPES[m.types[i]] && m.types[i] !== 'random' ? m.types[i] : 'classic');
  });
  applyGfx(); resetWeapons();
  netClient.slotsSeen = m.slots.slice();
  netClient.round = m.round;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.body.classList.add('playing');
  // the HUD tags come from the host's seats
  hudNames = m.names || ['', '', '', ''];
  // the host's own seats show without a tag here; only this player's car says YOU
  const keep = settings.slots; settings.slots = m.slots.map(t => (t === 'touch' || t === 'keys') ? 'keys' : t); buildHud(); settings.slots = keep;
  netClient.live = true;
}
const nq = new T.Quaternion(), nv = new T.Vector3();
function makeNetObj(r) {
  const [kind, a, b] = r.split(':');
  if (kind === 'shot') { const m = new T.Mesh(shotGeo[a === 'homing' ? 'missile' : a], shotMat[a]); return m; }
  if (kind === 'haz') return makeHazardMesh(a);
  if (kind === 'rocket') return new T.Mesh(rocketGeo, new T.MeshStandardMaterial({ color: Number(a), emissive: Number(b), emissiveIntensity: 2.5 }));
  if (kind === 'shield') return new T.Mesh(new T.SphereGeometry(2.9, 20, 14), new T.MeshBasicMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.22, depthWrite: false }));
  if (kind === 'bigfoot') return makeBigfoot().g;
  if (kind === 'ghost') return makeGhostMesh();
  if (kind === 'flag') return makeFlagMesh();
  return new T.Object3D();
}
function onSnap(m) {
  const nc = netClient;
  if (m.s === 'menu') {
    if (nc.live || state !== 'menu') { nc.live = false; for (const o of nc.objs.values()) scene.remove(o); nc.objs.clear(); stopEngines(); state = 'playing-local'; toMenu(); }
    return;
  }
  if (!nc.live) return; // waiting for the setup message
  nc.snap = m;
  if (m.rn !== nc.round) { nc.round = m.rn; resetWeapons(); }
  state = m.s;
  lastWinner = m.lw >= 0 ? cars[m.lw] : null;
  flag.holder = m.fh >= 0 ? cars[m.fh] : null;
  document.getElementById('pause').style.display = m.s === 'paused' ? 'flex' : 'none';
  // effects
  for (const [name, a] of m.ev || []) {
    try {
      if (name === 'toast') toast(clean(a[0]));
      else if (name === 'bigMsg') bigMsg(clean(a[0]), clean(a[1] || ''));
      else if (name === 'boostSound') boostSound(cars[a[0]] || cars[0]);
      else if (name === 'showCheer') showCheer(String(a[0]).slice(0, 4), null);
      else if (['burst', 'tone', 'noise', 'cheer', 'scream', 'wail', 'owl', 'crow', 'wind'].includes(name)) ({ burst, tone, noise, cheer, scream, wail, owl, crow, wind })[name](...a);
    } catch (e) {}
  }
  // car fields the HUD and sound read
  m.cars.forEach((s, i) => {
    const c = cars[i];
    c.active = !!s[0]; c.alive = !!s[10]; c.falling = !!s[11]; c.points = s[12]; c.item = s[13] || null; c.ammo = s[14];
    c.shield = s[15] ? 1 : 0; c.boostCd = s[16]; c.warn = s[17]; c.respawnT = s[18]; c.flagT = s[19]; c.prog = s[20]; c.startProg = 0;
    c.vel.set(s[21], s[22]);
    c.net = s;
  });
  // crates
  if (m.crates) crates.forEach((c, k) => { c.m.visible = !!m.crates[k]; });
  // projectiles, creatures, the flag
  const seen = new Set();
  for (const d of m.dyn) {
    seen.add(d[0]);
    let o = nc.objs.get(d[0]);
    if (!o) { o = makeNetObj(d[1]); o.position.set(d[2], d[3], d[4]); o.quaternion.set(d[5], d[6], d[7], d[8]); scene.add(o); nc.objs.set(d[0], o); }
    o.userData.to = d;
    o.visible = !!d[10]; o.scale.setScalar(d[9]);
  }
  for (const [id, o] of nc.objs) if (!seen.has(id)) { scene.remove(o); nc.objs.delete(id); }
}
function readClientInput() {
  // any of the usual keys, or the first controller
  const k = KEYSETS;
  let thr = ((keys[k[0].up] || keys[k[1].up]) ? 1 : 0) - ((keys[k[0].down] || keys[k[1].down]) ? 1 : 0);
  let st = ((keys[k[0].right] || keys[k[1].right]) ? 1 : 0) - ((keys[k[0].left] || keys[k[1].left]) ? 1 : 0);
  let boost = !!(keys[k[0].boost] || keys[k[1].boost] || keys.Space), fire = !!(keys[k[0].fire] || keys[k[1].fire] || keys.KeyF);
  const ps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of ps || []) {
    if (!p || !p.connected) continue;
    const ax = p.axes[0] || 0;
    if (Math.abs(ax) > 0.18) st = Math.sign(ax) * (Math.abs(ax) - 0.18) / 0.82;
    if (pressed(p, 14)) st = -1; if (pressed(p, 15)) st = 1;
    const gas = Math.max(btn(p, 7), pressed(p, 0) ? 1 : 0), brk = Math.max(btn(p, 6), pressed(p, 1) ? 1 : 0);
    if (gas || brk) thr = gas - brk;
    fire = fire || pressed(p, 2) || pressed(p, 5); boost = boost || pressed(p, 3) || pressed(p, 4);
    break;
  }
  if (IS_TOUCH) { if (touchInput.st) st = touchInput.st; if (touchInput.thr) thr = touchInput.thr; boost = boost || touchInput.boost; fire = fire || touchInput.fire; }
  clientInput.st = st; clientInput.thr = thr; clientInput.boost = boost; clientInput.fire = fire;
}
let padStartPrev = false;
function netClientFrame(rdt) {
  const nc = netClient, now = performance.now();
  readClientInput();
  if (now >= nc.inT) { nc.inT = now + 33; try { nc.conn.send({ t: 'in', ...clientInput }); } catch (e) {} }
  // controller START = pause/resume on the host (or play again at the end)
  const p0 = getPad(0), sp = !!(p0 && pressed(p0, 9));
  if (sp && !padStartPrev) netSend({ t: state === 'matchEnd' ? 'start' : 'pause' });
  padStartPrev = sp;
  if (now - nc.lastMsg > 6000 && !document.hidden) { nc.lastMsg = now; try { nc.conn.close(); } catch (e) {} retryJoin(); }
  const m = nc.snap;
  if (m) {
    const k = 1 - Math.exp(-rdt * 18);
    // camera
    const c = m.cam;
    nv.set(c[0], c[1], c[2]);
    if (camera.position.distanceTo(nv) > 40) camera.position.copy(nv); else camera.position.lerp(nv, k);
    nq.set(c[3], c[4], c[5], c[6]); camera.quaternion.slerp(nq, k);
    if (Math.abs(camera.fov - c[7]) > 0.01) { camera.fov += (c[7] - camera.fov) * k; camera.updateProjectionMatrix(); }
    camTarget.set(c[8], c[9], c[10]); camDist = c[11]; camFocus = c[12] ? cars[0] : null;
    // cars
    for (const car of cars) {
      const s = car.net; if (!s) continue;
      const g = car.mesh.group;
      g.visible = !!s[1];
      nv.set(s[2], s[3], s[4]);
      if (g.position.distanceTo(nv) > 8) g.position.copy(nv); else g.position.lerp(nv, k);
      g.rotation.y += wrapAng(s[5] - g.rotation.y) * k; g.rotation.x = s[6];
      car.pos.set(g.position.x, 0, g.position.z); car.y = g.position.y; car.h = g.rotation.y;
      const ring = car.mesh.ring; ring.visible = !!s[7]; ring.material.color.setHex(s[8]); ring.scale.setScalar(s[9]); ring.position.set(g.position.x, 0.1, g.position.z);
      const sh = car.mesh.shadow; sh.visible = !!s[23]; sh.position.set(g.position.x, 0.09, g.position.z); sh.rotation.z = g.rotation.y;
      if (car.shieldMesh) car.shieldMesh.visible = false;
    }
    for (const o of nc.objs.values()) {
      const d = o.userData.to; if (!d) continue;
      nv.set(d[2], d[3], d[4]);
      if (o.position.distanceTo(nv) > 25) o.position.copy(nv); else o.position.lerp(nv, Math.min(1, k * 1.4));
      nq.set(d[5], d[6], d[7], d[8]); o.quaternion.slerp(nq, k);
    }
    for (const cr of crates) if (cr.m.visible) cr.m.rotation.y += rdt * 1.6;
  }
  if (slowT > 0) slowT -= rdt;
  updateParts(rdt);
  animateWorld(rdt);
  hudT -= rdt; if (hudT <= 0) { hudT = 0.1; updateHud(false); }
  draw();
}
function netSend(m) { if (netClient) try { netClient.conn.send(m); } catch (e) {} }

// ===== the Join dialog =====
function openJoinDialog() {
  const d = document.getElementById('joinDlg'); d.style.display = 'flex';
  const inp = document.getElementById('joinCode'); inp.value = ''; joinStatus('');
  const nm = document.getElementById('joinName'); try { nm.value = localStorage.getItem('doozie-name') || ''; } catch (e) {}
  setTimeout(() => (nm.value ? inp : nm).focus(), 50);
}
function closeJoinDialog() { const d = document.getElementById('joinDlg'); if (d) d.style.display = 'none'; }
document.getElementById('joinGo').onclick = () => { audio(); joinGame(document.getElementById('joinCode').value); };
document.getElementById('joinName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') document.getElementById('joinCode').focus(); });
document.getElementById('joinCode').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') joinGame(e.target.value); if (e.key === 'Escape') closeJoinDialog(); });
document.getElementById('joinCancel').onclick = () => closeJoinDialog();
document.getElementById('btnJoin').onclick = () => { audio(); openJoinDialog(); };
document.getElementById('btnLeave').onclick = () => leaveNet('You left the game');
// a link with ?room=ABCD joins straight away (handy to send to a colleague)
if (URLQ.get('room')) { const code = URLQ.get('room'); const tryJoin = (n) => { if (peerHost && peerHost.open) joinGame(code); else if (n < 40) setTimeout(() => tryJoin(n + 1), 250); }; tryJoin(0); }
window.__net = { get client() { return netClient; }, joinGame, leaveNet, get room() { return roomCode; }, netPlayers };
