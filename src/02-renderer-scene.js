// ---------- Renderer / scene ----------
const canvas = document.getElementById('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
let composer = null;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMappingExposure = 1.0;
const scene = new T.Scene();
scene.background = new T.Color(0x9fd3f0);
scene.fog = new T.Fog(0x9fd3f0, 180, 420);
const camera = new T.PerspectiveCamera(50, 1, 1, 1000);
function playHeight() {
  const portraitPad = document.body.classList.contains('touchplay') && window.innerHeight > window.innerWidth;
  return portraitPad ? Math.round(window.innerHeight * 0.62) : window.innerHeight;
}
function resize() {
  const w = window.innerWidth, h = playHeight();
  canvas.style.height = h + 'px';
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
window.addEventListener('resize', resize);
resize();

const hemi = new T.HemisphereLight(0xdff1ff, 0x5a6a50, 0.75);
scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0d8, 0.75);
sun.position.set(80, 160, 60);
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.25;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 420;
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new T.Vector3(-70, 72, 40).normalize().multiplyScalar(200);

// Sky light for reflections (gradient dome with a bright sun spot)
const envTex = (() => {
  const sky = new T.Scene();
  const geo = new T.SphereGeometry(100, 48, 24);
  const top = new T.Color(0x5fa8ff).multiplyScalar(0.45), hor = new T.Color(0xffe2b8).multiplyScalar(0.5), low = new T.Color(0x23384d).multiplyScalar(0.4);
  const col = [], p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 100, c = y >= 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(low, Math.min(1, -y * 4));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  sky.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  const s = new T.Mesh(new T.SphereGeometry(7, 16, 8), new T.MeshBasicMaterial({ color: new T.Color(12, 10, 8) }));
  s.position.copy(SUN_OFF).normalize().multiplyScalar(90); sky.add(s);
  const pm = new T.PMREMGenerator(renderer);
  return pm.fromScene(sky, 0.01).texture;
})();
