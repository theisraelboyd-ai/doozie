// ---------- Touch pad + phone controller page ----------
// makeTouchPad() draws big multi-touch buttons and reports {st, thr, boost}.
// It is used two ways:
//   1. on the big screen's own touchscreen ("Play on this phone")
//   2. on a phone that scanned the QR code (this file's runController), which sends the
//      buttons to the big screen over WebRTC.
const URLQ = new URLSearchParams(location.search);
const JOIN_CODE = (URLQ.get('join') || '').toUpperCase().replace(/[^A-Z]/g, '');

function peerOptions() {
  const host = URLQ.get('peerhost');
  return host ? { host, port: Number(URLQ.get('peerport') || 9000), path: '/', secure: false, debug: 0 } : { debug: 0 };
}

function makeTouchPad(root, onChange, opts = {}) {
  root.innerHTML = `
    <div class="tp-left">
      <button class="tp-btn tp-steer" data-k="left">◀</button>
      <button class="tp-btn tp-steer" data-k="right">▶</button>
    </div>
    <div class="tp-right">
      <button class="tp-btn tp-boost" data-k="boost">BOOST</button>
      <div class="tp-row">
        <button class="tp-btn tp-brake" data-k="brake">BRAKE</button>
        <button class="tp-btn tp-gas" data-k="gas">GO</button>
      </div>
    </div>`;
  const held = { left: new Set(), right: new Set(), gas: new Set(), brake: new Set(), boost: new Set() };
  const out = { st: 0, thr: 0, boost: false };
  const emit = () => {
    out.st = (held.right.size ? 1 : 0) - (held.left.size ? 1 : 0);
    out.thr = (held.gas.size ? 1 : 0) - (held.brake.size ? 1 : 0);
    out.boost = held.boost.size > 0;
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
    <div id="pc-top"><span id="pc-who">DOOZIE!</span><span id="pc-status">Connecting to room ${JOIN_CODE}…</span>
      <button id="pc-start" class="pc-small">START</button><button id="pc-pause" class="pc-small">II</button></div>
    <div id="pc-pad"></div>
    <div id="pc-rotate">Turn your phone sideways ↻</div>`;
  const status = t => { document.getElementById('pc-status').textContent = t; };
  let conn = null, sendT = 0, wake = null, first = true;
  const state = makeTouchPad(document.getElementById('pc-pad'), () => send(), {
    tap: () => {
      if (!first) return; first = false;
      try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch (e) {}
    },
  });
  function send() { if (conn && conn.open) conn.send({ t: 'in', st: state.st, thr: state.thr, boost: state.boost }); }
  setInterval(send, 100); // heartbeat so a lost packet never leaves a button stuck
  document.getElementById('pc-start').onclick = () => conn && conn.open && conn.send({ t: 'start' });
  document.getElementById('pc-pause').onclick = () => conn && conn.open && conn.send({ t: 'pause' });
  if (!JOIN_CODE) { status('No room code – scan the QR code on the big screen'); return; }
  const peer = new Peer(undefined, peerOptions());
  peer.on('open', () => {
    conn = peer.connect('doozie-' + JOIN_CODE, { serialization: 'json' });
    conn.on('open', () => { status('Connected – joining…'); conn.send({ t: 'join' }); });
    conn.on('data', m => {
      if (m.t === 'hello') {
        document.getElementById('pc-who').textContent = m.name;
        document.body.style.setProperty('--car', m.css);
        status(m.note || 'You\'re in!');
      } else if (m.t === 'wait') status('Match in progress – you\'ll join the next one');
      else if (m.t === 'full') status('All four cars are taken – try again later');
      else if (m.t === 'state') {
        const labels = { menu: 'On the start screen – press START when everyone\'s in', countdown: 'Get ready…', race: 'GO GO GO!', roundEnd: 'Round over', matchEnd: 'Match over – press START to play again', paused: 'Paused' };
        status(labels[m.s] || m.s);
        document.getElementById('pc-start').style.display = (m.s === 'menu' || m.s === 'matchEnd') ? '' : 'none';
      } else if (m.t === 'buzz') { try { navigator.vibrate && navigator.vibrate(m.ms); } catch (e) {} }
      else if (m.t === 'kicked') status('You were removed from the car – reload to join again');
    });
    conn.on('close', () => status('Disconnected – reload this page to rejoin'));
  });
  peer.on('error', e => status(e.type === 'peer-unavailable' ? `Room ${JOIN_CODE} not found – check the big screen` : 'Connection problem: ' + e.type));
}

if (JOIN_CODE) { runController(); return; }
