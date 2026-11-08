// ---------- Sound: mixer, engines, skids, boost, crowd, and music the game writes itself ----------
function applySoundSetting() {
  if (!actx) return;
  const t = actx.currentTime;
  sfxBus.gain.setTargetAtTime(settings.sound === 'off' ? 0 : 1, t, 0.05);
  musicBus.gain.setTargetAtTime(settings.sound === 'all' ? musicLevel() : 0, t, 0.3);
}
function musicLevel() { return state === 'paused' ? 0.08 : state === 'menu' ? 0.4 : 0.26; }

let noiseBuf = null;
function getNoise() {
  if (!noiseBuf) {
    const len = actx.sampleRate * 2; noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function panNode(dest) {
  if (actx.createStereoPanner) { const p = actx.createStereoPanner(); p.connect(dest); return p; }
  const g = actx.createGain(); g.connect(dest); g.pan = { value: 0, setTargetAtTime() {} }; return g;
}

// ----- engines: one voice per car, pitch follows speed, panned by where the car is on screen -----
const ENGINE_BASE = { classic: 52, racer: 78, buggy: 96, monster: 34, van: 44 };
const engines = new Map();
function makeEngine(c) {
  const out = panNode(sfxBus), g = actx.createGain(); g.gain.value = 0; g.connect(out);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 2; lp.connect(g);
  const o1 = actx.createOscillator(), o2 = actx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = -1200 + 7;
  o1.connect(lp); o2.connect(lp); o1.start(); o2.start();
  // skid: looped noise through a band-pass, faded in when the car slides
  const sk = actx.createBufferSource(); sk.buffer = getNoise(); sk.loop = true;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.4;
  const sg = actx.createGain(); sg.gain.value = 0; sk.connect(bp); bp.connect(sg); sg.connect(out); sk.start();
  return { out, g, lp, o1, o2, sk, sg, type: null };
}
function stopEngines() {
  for (const e of engines.values()) { try { e.o1.stop(); e.o2.stop(); e.sk.stop(); e.out.disconnect(); } catch (err) {} }
  engines.clear();
}
const sndV = new T.Vector3();
function engineTick() {
  const racing = state === 'countdown' || state === 'race' || state === 'roundEnd' || state === 'matchEnd';
  if (!racing) { if (engines.size) stopEngines(); return; }
  const t = actx.currentTime;
  for (const c of cars) {
    if (!c.active) continue;
    let e = engines.get(c); if (!e) { e = makeEngine(c); engines.set(c, e); }
    const on = (c.alive || c === lastWinner) && !c.falling && c.mesh.group.visible;
    const sp = c.vel.length(), k = Math.min(1.4, sp / MAXV);
    // fake gear changes: pitch climbs then drops back as speed passes each band
    const band = 0.28, gear = Math.min(3, Math.floor(k / band)), inGear = (k - gear * band) / band;
    const base = ENGINE_BASE[c.type] || 52;
    const f = base * (1 + gear * 0.35 + inGear * 0.9);
    e.o1.frequency.setTargetAtTime(f, t, 0.05); e.o2.frequency.setTargetAtTime(f, t, 0.05);
    e.lp.frequency.setTargetAtTime(300 + k * 1400, t, 0.08);
    const vol = on ? (c.human ? 0.05 : 0.03) * (0.45 + k * 0.7) : 0;
    e.g.gain.setTargetAtTime(vol, t, 0.06);
    sndV.set(c.pos.x, 1, c.pos.z).project(camera);
    e.out.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, sndV.x * 0.8)), t, 0.1);
    const rx = -Math.cos(c.h), rz = Math.sin(c.h), slide = Math.abs(c.vel.x * rx + c.vel.y * rz);
    e.sg.gain.setTargetAtTime(on && c.y <= 0.05 && slide > 7 ? Math.min(0.06, (slide - 7) * 0.008) : 0, t, 0.05);
  }
}
function boostSound(car) {
  if (!actx) return;
  const t = actx.currentTime, s = actx.createBufferSource(); s.buffer = getNoise();
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3500, t + 0.35); bp.frequency.exponentialRampToValueAtTime(800, t + 0.7);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(car.human ? 0.16 : 0.07, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  sndV.set(car.pos.x, 1, car.pos.z).project(camera);
  const p = panNode(sfxBus); p.pan.value = Math.max(-0.9, Math.min(0.9, sndV.x * 0.8));
  s.connect(bp); bp.connect(g); g.connect(p); s.start(t); s.stop(t + 0.75);
  if (car.human) tone(180, 0.3, 'sawtooth', 0.04, 300);
}
// crowd: several bands of noise swelling and falling at slightly different rates
function cheer(size = 1) {
  if (!actx) return;
  const t = actx.currentTime, dur = 2.2 * size;
  for (const [f, q, v] of [[700, 0.8, 0.09], [1400, 1.2, 0.07], [2600, 1.5, 0.04]]) {
    const s = actx.createBufferSource(); s.buffer = getNoise(); s.loop = true;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * size, t + 0.25); g.gain.setValueAtTime(v * size, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 5 + Math.random() * 4; lg.gain.value = v * 0.4; lfo.connect(lg); lg.connect(g.gain);
    s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur); lfo.start(t); lfo.stop(t + dur);
  }
  // a few whistles
  for (let k = 0; k < 3 * size; k++) {
    const st = t + 0.2 + Math.random() * dur * 0.5, o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(1800 + Math.random() * 600, st); o.frequency.linearRampToValueAtTime(2600 + Math.random() * 500, st + 0.25);
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.025, st + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.35);
    o.connect(g); g.connect(sfxBus); o.start(st); o.stop(st + 0.4);
  }
}

// ----- music: a small sequencer that writes a loop per track mood -----
// chords are semitone offsets from the key; a mood sets tempo, scale, instruments and how busy the drums are
const MOODS = {
  bright: { bpm: 132, key: 48, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: 'square', bass: 'square', pad: 0.5, swing: 0, scale: [0, 2, 4, 7, 9] },
  folk: { bpm: 116, key: 50, chords: [[0, 3, 7], [-2, 2, 5], [0, 3, 7], [-5, -2, 2]], lead: 'triangle', bass: 'triangle', pad: 0.95, swing: 0.12, scale: [0, 2, 3, 5, 7, 9, 10] },
  spooky: { bpm: 92, key: 45, chords: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [-1, 3, 6]], lead: 'sine', bass: 'sawtooth', pad: 1, swing: 0, scale: [0, 2, 3, 5, 7, 8, 11] },
};
const THEME_MOOD = { harbour: 'bright', forest: 'folk', haunted: 'spooky' };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const mus = { next: 0, step: 0, bar: 0, mood: null, intensity: 0 };
function songRand(bar, step, salt) { // repeats every 8 bars so tunes are catchy
  let h = ((bar % 8) * 131 + step * 17 + salt * 7919) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function musicIntensity() {
  if (state === 'menu' || state === 'paused') return 0;
  if (state !== 'race') return 1;
  const alive = activeCars().filter(c => c.alive && !c.falling).length;
  if (settings.mode === 'laps' && typeof finalLapSaid !== 'undefined' && finalLapSaid) return 2;
  if (settings.mode === 'flag' && flag.holder && flag.holder.flagT > FLAG_WIN - 6) return 2;
  if (settings.mode === 'knockout' && alive === 2 && activeCars().length > 2) return 2;
  return 1;
}
function voice(type, freq, t, dur, vol, cutoff = 2400, attack = 0.008) {
  const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(freq, t); f.type = 'lowpass'; f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function drum(kind, t, vol = 1) {
  if (kind === 'kick') {
    const o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.55 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.22); return;
  }
  const s = actx.createBufferSource(); s.buffer = getNoise();
  const f = actx.createBiquadFilter(), g = actx.createGain();
  const hat = kind === 'hat', len = hat ? 0.035 : kind === 'shaker' ? 0.06 : 0.14;
  f.type = hat || kind === 'shaker' ? 'highpass' : 'bandpass'; f.frequency.value = hat ? 7500 : kind === 'shaker' ? 5000 : 1800;
  g.gain.setValueAtTime((hat ? 0.07 : kind === 'shaker' ? 0.05 : 0.22) * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + len + 0.01);
  if (kind === 'snare') voice('triangle', 190, t, 0.08, 0.08 * vol, 3000, 0.002);
  if (kind === 'tom') voice('sine', 95, t, 0.3, 0.25 * vol, 600, 0.004);
}
function playStep(m, t, step, bar, inten, stepDur) {
  const ch = m.chords[bar % m.chords.length], root = m.key + ch[0];
  const spooky = m === MOODS.spooky;
  // pad: one long chord per bar
  if (step === 0) for (const n of ch) {
    voice(spooky ? 'sawtooth' : 'triangle', midi(m.key + 12 + n), t, stepDur * 16, 0.028 * m.pad * (inten === 0 ? 2 : 1), spooky ? 700 : 1500, stepDur * 3);
    if (spooky) voice('sawtooth', midi(m.key + 12 + n) * 1.004, t, stepDur * 16, 0.02, 600, stepDur * 4);
  }
  // bass
  const bassHit = spooky ? step % 8 === 0 : m === MOODS.folk ? step % 4 === 0 : step % 2 === 0;
  if ((inten > 0 || step % 8 === 0) && bassHit) voice(m.bass, midi(root - 12 + (!spooky && step % 8 === 6 ? 7 : 0)), t, stepDur * (spooky ? 7 : 1.7), spooky ? 0.09 : 0.11, spooky ? 500 : 900);
  // arpeggio
  if (step % 2 === 0) {
    const n = ch[(step / 2) % 3] + 24 + (step >= 8 && !spooky ? 12 : 0);
    voice(spooky ? 'sine' : 'square', midi(m.key + n), t, stepDur * 1.2, spooky ? 0.035 : 0.022, spooky ? 1800 : 2200);
  }
  // lead melody, only when things get tense
  if (inten >= 2 && songRand(bar, step, 3) < (spooky ? 0.3 : 0.45)) {
    const deg = m.scale[Math.floor(songRand(bar, step, 9) * m.scale.length)];
    const o = voice(m.lead, midi(m.key + 24 + deg), t, stepDur * 1.8, 0.045, 3200);
    if (spooky) { const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = 6; lg.gain.value = 6; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + stepDur * 2); }
  }
  // drums
  if (inten > 0) {
    if (spooky) {
      if (step === 0 || step === 10) drum('tom', t);
      if (inten >= 2 && step % 4 === 2) drum('hat', t, 0.7);
      if (step === 8 && songRand(bar, 0, 5) < 0.5) drum('snare', t, 0.5);
    } else {
      if (step % 8 === 0 || (inten >= 2 && step % 8 === 6)) drum('kick', t);
      if (step % 8 === 4) drum('snare', t);
      if (m === MOODS.folk) { if (step % 2 === 1) drum('shaker', t); }
      else if (step % 2 === 0 || inten >= 2) drum('hat', t, step % 4 === 2 ? 1 : 0.6);
    }
  }
}
function musicTick() {
  if (settings.sound !== 'all') { mus.next = 0; return; }
  const mood = MOODS[THEME_MOOD[curTrack && curTrack.theme] || 'bright'];
  const t = actx.currentTime;
  if (mus.mood !== mood || !mus.next || mus.next < t - 0.5) { mus.mood = mood; mus.next = t + 0.1; mus.step = 0; mus.bar = 0; }
  const inten = musicIntensity();
  const stepDur = 60 / (mood.bpm * (inten >= 2 ? 1.08 : 1)) / 4;
  while (mus.next < t + 0.3) {
    const swing = mus.step % 2 ? mood.swing * stepDur : 0;
    playStep(mood, mus.next + swing, mus.step, mus.bar, inten, stepDur);
    mus.next += stepDur; mus.step++;
    if (mus.step >= 16) { mus.step = 0; mus.bar++; }
  }
}
let lastSoundState = '';
function soundTick() {
  if (!actx || actx.state !== 'running') return;
  if (state !== lastSoundState) { lastSoundState = state; applySoundSetting(); }
  engineTick();
}
// music runs on its own timer so a slow frame never makes it stutter
setInterval(() => { if (actx && actx.state === 'running') musicTick(); }, 60);
window.__sound = { engines, mus, cheer, get ctx() { return actx; }, get master() { return masterBus; } };
// phones: stop all sound the moment the page is hidden or closed, carry on when it comes back
function pauseAudioForHidden() { if (actx && actx.state === 'running') actx.suspend().catch(() => {}); }
document.addEventListener('visibilitychange', () => {
  if (!actx) return;
  if (document.hidden) pauseAudioForHidden();
  else actx.resume().catch(() => {});
});
window.addEventListener('pagehide', pauseAudioForHidden);
window.addEventListener('blur', () => { if (IS_TOUCH) pauseAudioForHidden(); });
window.addEventListener('focus', () => { if (actx && !document.hidden) actx.resume().catch(() => {}); });
