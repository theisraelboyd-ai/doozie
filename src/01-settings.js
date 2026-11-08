// ---------- Settings ----------
const COLORS = [
  { name: 'RED',   hex: 0xe53935, css: '#e53935' },
  { name: 'BLUE',  hex: 0x1e88e5, css: '#1e88e5' },
  { name: 'GREEN', hex: 0x43a047, css: '#43a047' },
  { name: 'GOLD',  hex: 0xfbc02d, css: '#fbc02d' },
];
const KEYSETS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'KeyQ', fire: 'KeyE', label: 'W A S D · boost Q · fire E' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', boost: 'ShiftRight', fire: 'Slash', label: 'Arrows · boost R-Shift · fire /' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', boost: 'KeyU', fire: 'KeyO', label: 'I J K L · boost U · fire O' },
  { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', boost: 'KeyR', fire: 'KeyY', label: 'T F G H · boost R · fire Y' },
];
const settings = {
  slots: ['keys', 'keys', 'cpu', 'cpu'], // keys | pad | cpu | off
  carOf: ['classic', 'classic', 'classic', 'classic'], // body each colour drives
  padOf: [null, null, null, null], // gamepad index driving each slot
  autoGas: false, // kids assist: accelerate automatically
  target: 5,
  skill: 0, // 0 easy, 1 normal, 2 hard
  water: 'deadly', // deadly | bouncy
  gunner: true, // mouse rocket launcher player
  sound: 'all', // all | sfx | off
  mode: 'knockout', // knockout | teams | laps | flag
  gfx: 'fancy', // fancy | simple | low
  cam: 'cinematic', // cinematic | classic | calm
  weapons: true, // item crates and weapons
  creatures: 'own', // off | own (each creature roams its home track) | anywhere
  track: 'harbour', // a TRACKS id, or 'random'
};
const SKILL_NAMES = ['Easy', 'Normal', 'Hard'];
const SKILL_SPEED = [0.84, 0.93, 1.0];
const CAM_STYLES = ['cinematic', 'classic', 'calm'];
const CAM_NAMES = { cinematic: 'Cinematic', classic: 'Classic', calm: 'Calm' };
const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const CREATURE_NAMES_UI = { off: 'Off', own: 'Own track', anywhere: 'Anywhere' };

const GFX_ORDER = ['fancy', 'simple', 'low'], GFX_NAMES = { low: 'Low', simple: 'Simple', fancy: 'Fancy' };
function nextGfx() { settings.gfx = GFX_ORDER[(GFX_ORDER.indexOf(settings.gfx) + 1) % 3]; }
const MODE_ORDER = ['knockout', 'teams', 'laps', 'flag'];
const MODE_NAMES = { knockout: 'Knockout', teams: 'Teams', laps: 'Lap Race', flag: 'Hold the Flag' };
const MODE_TAGS = {
  knockout: 'Last car on screen wins',
  teams: 'Red &amp; Gold vs Blue &amp; Green · last team on screen wins',
  laps: 'First to finish 3 laps · fall behind and you restart at the back',
  flag: 'Grab the flag and hold on · ram the holder to steal it',
};
const CAR_ORDER = ['classic', 'racer', 'buggy', 'monster', 'van', 'random'];
// top: top speed · acc: pick-up · grip: cornering · turn: steering · mass: how hard you shove and how little you're shoved
const CAR_TYPES = {
  classic: { name: 'Classic', icon: '🚗', blurb: 'all-rounder', top: 1, acc: 1, grip: 1, turn: 1, mass: 1 },
  racer: { name: 'Racer', icon: '🏎️', blurb: 'fast · slippy', top: 1.1, acc: 1.02, grip: 0.82, turn: 1, mass: 0.85 },
  buggy: { name: 'Buggy', icon: '🛻', blurb: 'quick · nimble · light', top: 0.95, acc: 1.2, grip: 1.12, turn: 1.12, mass: 0.75 },
  monster: { name: 'Monster', icon: '🚙', blurb: 'slow · heavy · bully', top: 0.9, acc: 0.88, grip: 0.95, turn: 0.88, mass: 1.75 },
  van: { name: 'Van', icon: '🚐', blurb: 'heavy · steady', top: 0.95, acc: 0.92, grip: 1.05, turn: 0.92, mass: 1.4 },
  random: { name: 'Random', icon: '🎲', blurb: 'surprise me' },
};
const SOUND_ORDER = ['all', 'sfx', 'off'], SOUND_NAMES = { all: 'Music + effects', sfx: 'Effects only', off: 'Off' };
try { const s = localStorage.getItem('doozie-sound'); if (SOUND_ORDER.includes(s)) settings.sound = s; } catch (e) {}
