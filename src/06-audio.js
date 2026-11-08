// ---------- Audio ----------
let actx = null, sfxBus = null, musicBus = null, masterBus = null;
function audio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      // master → speakers, with a gentle limiter so pile-ups don't clip
      const comp = actx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.connect(actx.destination);
      masterBus = actx.createGain(); masterBus.gain.value = 1.6; masterBus.connect(comp);
      sfxBus = actx.createGain(); sfxBus.connect(masterBus);
      musicBus = actx.createGain(); musicBus.connect(masterBus);
      applySoundSetting();
    } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(freq, dur, type = 'square', vol = 0.12, slide = 0) {
  if (!actx) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur);
}
function noise(dur, vol = 0.2, freq = 800) {
  if (!actx) return;
  const t = actx.currentTime, len = Math.floor(actx.sampleRate * dur);
  const buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = actx.createBufferSource(); s.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = actx.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(sfxBus); s.start(t);
}
let bumpCd = 0;
