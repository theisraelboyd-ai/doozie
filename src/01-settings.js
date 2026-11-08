// ---------- Settings ----------
const COLORS = [
  { name: 'RED',   hex: 0xe53935, css: '#e53935' },
  { name: 'BLUE',  hex: 0x1e88e5, css: '#1e88e5' },
  { name: 'GREEN', hex: 0x43a047, css: '#43a047' },
  { name: 'GOLD',  hex: 0xfbc02d, css: '#fbc02d' },
];
const KEYSETS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'KeyQ', label: 'W A S D · boost Q' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', boost: 'ShiftRight', label: 'Arrows · boost Right Shift' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', boost: 'KeyU', label: 'I J K L · boost U' },
  { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', boost: 'KeyR', label: 'T F G H · boost R' },
];
const settings = {
  slots: ['keys', 'keys', 'cpu', 'cpu'], // keys | pad | cpu | off
  padOf: [null, null, null, null], // gamepad index driving each slot
  autoGas: false, // kids assist: accelerate automatically
  target: 5,
  skill: 0, // 0 easy, 1 normal, 2 hard
  water: 'deadly', // deadly | bouncy
  gunner: true, // mouse rocket launcher player
  gfx: 'fancy', // fancy | simple
  cam: 'cinematic', // cinematic | classic | calm
  track: 'harbour', // a TRACKS id, or 'random'
};
const SKILL_NAMES = ['Easy', 'Normal', 'Hard'];
const SKILL_SPEED = [0.84, 0.93, 1.0];
const CAM_STYLES = ['cinematic', 'classic', 'calm'];
const CAM_NAMES = { cinematic: 'Cinematic', classic: 'Classic', calm: 'Calm' };
const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
