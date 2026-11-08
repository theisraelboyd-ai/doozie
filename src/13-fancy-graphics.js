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
  renderer.setPixelRatio(fancy ? Math.min(window.devicePixelRatio || 1, 1.25) : 1);
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
