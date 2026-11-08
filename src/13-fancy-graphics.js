// ---------- Fancy graphics ----------
composer = new T.EffectComposer(renderer);
composer.addPass(new T.RenderPass(scene, camera));
const bokeh = new T.BokehPass(scene, camera, { focus: 60, aperture: 0.0008, maxblur: 0.006 });
composer.addPass(bokeh);
const bloom = new T.UnrealBloomPass(new T.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.45, 1.25);
composer.addPass(bloom);
composer.addPass(new T.OutputPass());
let shadowSize = 0;
function applyGfx() {
  const fancy = settings.gfx === 'fancy';
  renderer.toneMapping = fancy ? T.ACESFilmicToneMapping : T.NoToneMapping;
  renderer.toneMappingExposure = fancy ? (curTrack && curTrack.night ? 1.15 : 0.95) : 1;
  const night = !!(curTrack && curTrack.night);
  scene.environment = fancy && !night ? envTex : null;
  sun.castShadow = fancy;
  sun.color.setHex(night ? 0x8fa3ff : 0xfff0d8);
  sun.intensity = night ? (fancy ? 0.6 : 0.55) : fancy ? 2.4 : 1.4;
  hemi.color.setHex(night ? 0x46527a : 0xdff1ff); hemi.groundColor.setHex(night ? 0x1b1424 : 0x5a6a50);
  hemi.intensity = night ? (fancy ? 0.55 : 0.9) : fancy ? 0.35 : 1.6;
  for (const c of cars) { const hl = c.mesh.group.userData.headlight; if (hl) { hl.visible = night; hl.intensity = night ? (fancy ? 320 : 240) : 0; } }
  const sky = (curTrack && curTrack.sky) || { fancy: 0xbfdcf0, simple: 0x9fd3f0, fogNear: 180, fogFar: 420 };
  scene.fog.color.setHex(fancy ? sky.fancy : sky.simple); scene.background.setHex(fancy ? sky.fancy : sky.simple);
  scene.fog.near = sky.fogNear; scene.fog.far = sky.fogFar;
  const low = settings.gfx === 'low';
  renderer.setPixelRatio(fancy ? Math.min(window.devicePixelRatio || 1, 1.25) : low ? 0.7 : 1);
  if (trackGroup) trackGroup.traverse(o => {
    if (o.userData.fancyOnly) o.visible = fancy;      // real lanterns etc: Fancy only
    if (o.userData.detail) o.visible = !low;         // fog banks: off in Low
    if (o.userData.lightPool) o.material.opacity = fancy ? 0.3 : 0.55;
  });
  resize();
}
function draw() {
  if (settings.gfx === 'fancy') {
    const d = camera.position.distanceTo(camTarget);
    const S = Math.round((camDist * 0.95 + 25) / 10) * 10;
    if (S !== shadowSize) {
      shadowSize = S; const sc = sun.shadow.camera;
      sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.updateProjectionMatrix();
    }
    sun.target.position.copy(camTarget); sun.position.copy(camTarget).add(SUN_OFF);
    const swoop = !!camFocus || state === 'menu';
    bokeh.uniforms['focus'].value = d;
    bokeh.uniforms['aperture'].value = swoop ? 0.00022 : 0.00006;
    bokeh.uniforms['maxblur'].value = swoop ? 0.01 : 0.004;
    composer.render();
  } else {
    sun.position.copy(camTarget).add(SUN_OFF); sun.target.position.copy(camTarget);
    renderer.render(scene, camera);
  }
}

// ---------- FPS counter (press N, or add ?fps to the address) ----------
const fpsEl = document.createElement('div');
fpsEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:60;font:600 13px system-ui;color:#fff;background:rgba(0,0,0,.55);padding:4px 8px;border-radius:8px;pointer-events:none;display:none';
document.body.appendChild(fpsEl);
let fpsOn = URLQ.has('fps'), fpsN = 0, fpsT = 0, fpsWorst = 0;
function toggleFps() { fpsOn = !fpsOn; fpsEl.style.display = fpsOn ? 'block' : 'none'; }
if (fpsOn) fpsEl.style.display = 'block';
function fpsTick(dt) {
  if (!fpsOn) return;
  fpsN++; fpsT += dt; fpsWorst = Math.max(fpsWorst, dt);
  if (fpsT >= 0.5) {
    const fps = Math.round(fpsN / fpsT), info = renderer.info.render;
    fpsEl.textContent = `${fps} fps · worst ${Math.round(fpsWorst * 1000)} ms · ${info.calls} draws · ${GFX_NAMES[settings.gfx]}`;
    fpsEl.style.color = fps >= 50 ? '#9cff9c' : fps >= 30 ? '#ffe082' : '#ff8a80';
    fpsN = 0; fpsT = 0; fpsWorst = 0;
  }
}
