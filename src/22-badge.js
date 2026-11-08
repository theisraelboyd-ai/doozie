// ---------- The lobby badge: the six letter-cylinders fire like a straight-six starting up ----------
const badgeEl = document.querySelector('#menu .badge');
const FIRING_ORDER = [0, 4, 2, 5, 1, 3]; // 1-5-3-6-2-4, like a real straight-six
let badgeTimer = null;
function badgeFire(i, idle) {
  const g = badgeEl && badgeEl.querySelector('.c' + i); if (!g) return;
  g.classList.remove('f', 'fi'); void g.getBoundingClientRect(); // restart the animation
  g.classList.add(idle ? 'fi' : 'f');
  if (!idle && actx && actx.state === 'running' && settings.sound !== 'off') noise(0.07, 0.07, 240);
}
function startBadgeEngine() {
  if (!badgeEl) return;
  clearTimeout(badgeTimer);
  const t0 = performance.now(); let n = 0;
  badgeEl.classList.add('revving');
  const step = () => {
    if (state !== 'menu') { badgeEl.classList.remove('revving'); return; }
    const t = (performance.now() - t0) / 1000, idle = t > 2.6;
    if (idle) badgeEl.classList.remove('revving');
    badgeFire(FIRING_ORDER[n++ % 6], idle);
    // catches, revs up, then settles to a slow idle
    badgeTimer = setTimeout(step, idle ? 420 : Math.max(80, 300 - t * 95));
  };
  setTimeout(step, 350);
}
startBadgeEngine();

// ---------- Installable app (PWA): register the service worker on the hosted site ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
