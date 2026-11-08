// ---------- Touch pad + phone controller page ----------
// makeTouchPad() draws big multi-touch buttons and reports {st, thr, boost}.
// It is used two ways:
//   1. on the big screen's own touchscreen ("Play on this phone")
//   2. on a phone that scanned the QR code (this file's runController), which sends the
//      buttons to the big screen over WebRTC.
const URLQ = new URLSearchParams(location.search);
const JOIN_CODE = (URLQ.get('join') || '').toUpperCase().replace(/[^A-Z]/g, '');

// How devices find each other: several free STUN servers, PeerJS's own relay, and (once set up)
// a proper relay server for networks that block direct links. TURN_API is a credentials URL,
// e.g. Metered's https://<app>.metered.live/api/v1/turn/credentials?apiKey=<key>
const TURN_API = '';
// Metered relay (free plan, 20 GB a month): used only when two devices can't link up directly.
// These are relay-only credentials, meant to sit in a web page; they can be replaced in the
// Metered dashboard (TURN Server page) if they ever leak or the quota gets used up.
const RELAY_USER = 'f7d795910cc5cde9fc45b4fe', RELAY_PASS = 'zWy5IUt/DcZsGoOn';
let EXTRA_ICE = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:standard.relay.metered.ca:80', username: RELAY_USER, credential: RELAY_PASS },
  { urls: 'turn:standard.relay.metered.ca:80?transport=tcp', username: RELAY_USER, credential: RELAY_PASS },
  { urls: 'turn:standard.relay.metered.ca:443', username: RELAY_USER, credential: RELAY_PASS },
  { urls: 'turns:standard.relay.metered.ca:443?transport=tcp', username: RELAY_USER, credential: RELAY_PASS },
];
const iceReady = !TURN_API ? Promise.resolve() : Promise.race([
  fetch(TURN_API).then(r => r.json()).then(list => { if (Array.isArray(list)) EXTRA_ICE = list.concat(EXTRA_ICE); }).catch(() => {}),
  new Promise(r => setTimeout(r, 4000)),
]);
function peerOptions() {
  const host = URLQ.get('peerhost');
  const config = { iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
    ...EXTRA_ICE,
    { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
  ] };
  return host ? { host, port: Number(URLQ.get('peerport') || 9000), path: '/', secure: false, debug: 0, config } : { debug: 0, config };
}

function makeTouchPad(root, onChange, opts = {}) {
  root.innerHTML = `
    <div class="tp-left">
      <div class="tp-row tp-top"><button class="tp-btn tp-fire" data-k="fire">FIRE</button><button class="tp-btn tp-boost" data-k="boost">BOOST</button></div>
      <div class="tp-row"><button class="tp-btn tp-steer" data-k="left">◀</button><button class="tp-btn tp-steer" data-k="right">▶</button></div>
    </div>
    <div class="tp-right">
      <div class="tp-row"><button class="tp-btn tp-brake" data-k="brake">BRAKE</button><button class="tp-btn tp-gas" data-k="gas">GO</button></div>
    </div>`;
  const held = { left: new Set(), right: new Set(), gas: new Set(), brake: new Set(), boost: new Set(), fire: new Set() };
  const out = { st: 0, thr: 0, boost: false, fire: false };
  const emit = () => {
    out.st = (held.right.size ? 1 : 0) - (held.left.size ? 1 : 0);
    out.thr = (held.gas.size ? 1 : 0) - (held.brake.size ? 1 : 0);
    out.boost = held.boost.size > 0; out.fire = held.fire.size > 0;
    root.querySelectorAll('.tp-btn').forEach(b => b.classList.toggle('on', held[b.dataset.k].size > 0));
    onChange(out);
  };
  root.querySelectorAll('.tp-btn').forEach(b => {
    const k = b.dataset.k;
    const down = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} held[k].add(e.pointerId); if (opts.tap) opts.tap(); emit(); };
    const up = e => { e.preventDefault(); held[k].delete(e.pointerId); emit(); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  return out;
}

function runController() {
  document.title = 'DOOZIE! controller';
  document.body.className = 'controller';
  document.body.innerHTML = `
    <div id="pc-top"><span id="pc-dot"></span><span id="pc-who">DOOZIE!</span><span id="pc-item"></span><span id="pc-status">Connecting to room ${JOIN_CODE}…</span>
      <button id="pc-start" class="pc-small">START</button><button id="pc-pause" class="pc-small">II</button></div>
    <div id="pc-choose" class="pc-panel">
      <div class="pc-q">Room <b>${JOIN_CODE}</b> – how do you want to join?</div>
      <div class="pc-choices">
        <button class="pc-choice" data-role="player"><span>🏎️</span>Player<small>drive a car</small></button>
        <button class="pc-choice" data-role="viewer"><span>👻</span>Viewer<small>watch &amp; cause chaos</small></button>
      </div>
      <div class="pc-free" id="pc-free"></div>
    </div>
    <div id="pc-pad"></div>
    <div id="pc-view" class="pc-panel">
      <div class="pc-cheers">${['👏', '😂', '😱', '🔥', '👻', '🦶'].map(e => `<button class="pc-cheer" data-e="${e}">${e}</button>`).join('')}</div>
      <div class="pc-powers">
        <button class="pc-power" data-k="rocket">🚀<b>Rocket the leader</b><i></i></button>
        <button class="pc-power" data-k="boost">⚡<b>Boost the back car</b><i></i></button>
        <button class="pc-power" data-k="bigfoot">🦶<b>Bigfoot</b><i></i></button>
        <button class="pc-power" data-k="ghost">👻<b>Ghost car</b><i></i></button>
      </div>
      <div class="pc-soon">More creatures coming: the Kraken, a UFO, Nessie…</div>
      <button id="pc-toplayer" class="pc-link">Switch to player</button>
    </div>
    <div id="pc-rotate">Turn your phone sideways ↻</div>`;
  const $ = id => document.getElementById(id);
  const status = t => { $('pc-status').textContent = t; };
  let cid = '';
  try { cid = sessionStorage.getItem('doozie-cid') || ''; } catch (e) {}
  if (!cid) { cid = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('doozie-cid', cid); } catch (e) {} }
  let peer = null, conn = null, role = null, lastHeard = 0, lastTry = 0, hello = false, firstTap = true;
  const cool = { rocket: 0, boost: 0, bigfoot: 0, ghost: 0 };

  function show(which) {
    $('pc-choose').style.display = which === 'choose' ? 'flex' : 'none';
    $('pc-pad').style.display = which === 'player' ? 'flex' : 'none';
    $('pc-view').style.display = which === 'viewer' ? 'flex' : 'none';
    document.body.classList.toggle('pc-is-player', which === 'player');
  }
  show('choose');
  function grabScreen() {
    if (!firstTap) return; firstTap = false;
    try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
  }
  const pad = makeTouchPad($('pc-pad'), () => sendInput(), { tap: grabScreen });
  function send(m) { try { if (conn && conn.open) { conn.send(m); return true; } } catch (e) {} return false; }
  function sendInput() { if (role === 'player') send({ t: 'in', st: pad.st, thr: pad.thr, boost: pad.boost, fire: pad.fire }); }
  function sendJoin() { if (role) send({ t: 'join', role, cid }); }
  setInterval(sendInput, 100); // heartbeat so a lost packet never leaves a button stuck

  document.querySelectorAll('.pc-choice').forEach(b => b.onclick = () => { grabScreen(); role = b.dataset.role; hello = false; show(role); status('Joining…'); sendJoin(); });
  $('pc-toplayer').onclick = () => { role = 'player'; hello = false; show('player'); status('Joining as a player…'); send({ t: 'role', role, cid }); };
  document.querySelectorAll('.pc-cheer').forEach(b => b.onclick = () => { send({ t: 'cheer', e: b.dataset.e }); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 200); });
  document.querySelectorAll('.pc-power').forEach(b => b.onclick = () => { if (cool[b.dataset.k] > Date.now()) return; send({ t: 'power', k: b.dataset.k }); });
  $('pc-start').onclick = () => { grabScreen(); send({ t: 'start' }); };
  $('pc-pause').onclick = () => send({ t: 'pause' });

  function onData(m) {
    lastHeard = Date.now();
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      hello = true; role = m.role; show(m.role);
      $('pc-who').textContent = m.name;
      document.body.style.setProperty('--car', m.css || '#7e57c2');
      status(m.note || (m.role === 'viewer' ? 'Watching – cheer or cause chaos!' : 'You\'re in!'));
    } else if (m.t === 'wait') { hello = true; status('Match in progress – you\'ll drive in the next one'); }
    else if (m.t === 'full') { hello = true; role = 'viewer'; status('All four cars are taken – joining as a viewer'); sendJoin(); }
    else if (m.t === 'state') {
      if (role === 'player' && hello) {
        const labels = { menu: 'Start screen – press START when everyone\'s in', countdown: 'Get ready…', race: 'GO GO GO!', roundEnd: 'Round over', matchEnd: 'Match over – START to play again', paused: 'Paused' };
        status(labels[m.s] || m.s);
      }
      $('pc-start').style.display = (m.s === 'menu' || m.s === 'matchEnd') ? '' : 'none';
      if ($('pc-free')) $('pc-free').textContent = `${m.free} car${m.free === 1 ? '' : 's'} free · ${m.viewers} watching`;
    } else if (m.t === 'buzz') { try { navigator.vibrate && navigator.vibrate(m.ms); } catch (e) {} }
    else if (m.t === 'cool') {
      cool[m.k] = Date.now() + m.s * 1000;
    } else if (m.t === 'msg') status(m.text);
    else if (m.t === 'item') $('pc-item').textContent = m.icon ? m.icon + (m.ammo > 1 ? '×' + m.ammo : '') : '';
    else if (m.t === 'kicked') { role = null; hello = false; show('choose'); status('You were taken out of the car – choose again'); }
  }
  // power buttons count down while cooling
  setInterval(() => {
    document.querySelectorAll('.pc-power').forEach(b => {
      const left = Math.ceil((cool[b.dataset.k] - Date.now()) / 1000);
      b.classList.toggle('cooling', left > 0); b.querySelector('i').textContent = left > 0 ? left + 's' : 'ready';
    });
  }, 250);

  function connect() {
    lastTry = Date.now();
    try { if (conn) conn.close(); } catch (e) {}
    conn = peer.connect('doozie-' + JOIN_CODE, { serialization: 'json', reliable: true });
    conn.on('open', () => { lastHeard = Date.now(); send({ t: 'ping', cid }); if (!role) status('Connected – choose Player or Viewer'); sendJoin(); });
    conn.on('data', onData);
    conn.on('close', () => { if (Date.now() - lastTry > 1500) connect(); });
    conn.on('error', () => {});
  }
  // watchdog: the big screen talks every half second; if it goes quiet, reconnect
  setInterval(() => {
    const dot = $('pc-dot'), quiet = Date.now() - lastHeard;
    dot.className = conn && conn.open && quiet < 2000 ? 'ok' : quiet < 6000 ? 'warn' : 'bad';
    if (!peer || peer.destroyed) return;
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} return; }
    // give a new link plenty of time to open (mobile data via a relay can take several seconds)
    if (peer.open && (!conn || !conn.open) && Date.now() - lastTry > 12000) { status('Still trying to reach the big screen…'); connect(); }
    else if (conn && conn.open && quiet > 6000 && Date.now() - lastTry > 6000) { status('Reconnecting…'); connect(); }
    else if (conn && conn.open && role && !hello && Date.now() - lastTry > 2500) { sendJoin(); lastTry = Date.now(); }
  }, 1000);

  if (!JOIN_CODE) { status('No room code – scan the QR code on the big screen'); return; }
  iceReady.then(() => {
  peer = new Peer(undefined, peerOptions());
  peer.on('open', () => connect());
  peer.on('error', e => {
    if (e.type === 'peer-unavailable') status(`Room ${JOIN_CODE} isn't open – keep the game showing on the big screen`);
    else status('Connection hiccup (' + e.type + ') – retrying…');
  });
  });
}

if (JOIN_CODE) { runController(); return; }
