// ---------- Cars ----------
function makeCarMesh(color) {
  const g = new T.Group();
  const paint = new T.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new T.MeshPhysicalMaterial({ color: 0x1c2a3a, roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const chrome = new T.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.15, metalness: 1 });
  const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new T.BoxGeometry(2.1, 0.8, 3.8), paint, 0, 0.75, 0);
  add(new T.BoxGeometry(2.0, 0.4, 1.0), paint, 0, 1.25, 1.2);
  add(new T.BoxGeometry(1.7, 0.7, 1.7), glass, 0, 1.5, -0.3);
  add(new T.BoxGeometry(1.75, 0.15, 1.5), paint, 0, 1.9, -0.3);
  add(new T.BoxGeometry(2.2, 0.25, 0.25), chrome, 0, 0.45, 1.95);
  add(new T.BoxGeometry(2.2, 0.25, 0.25), chrome, 0, 0.45, -1.95);
  const wg = new T.CylinderGeometry(0.45, 0.45, 0.4, 14); wg.rotateZ(Math.PI / 2);
  const wm = new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const hub = new T.CylinderGeometry(0.22, 0.22, 0.42, 10); hub.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1.1, 1.2], [1.1, 1.2], [-1.1, -1.2], [1.1, -1.2]]) { add(wg, wm, x, 0.45, z); add(hub, chrome, x, 0.45, z); }
  const head = new T.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xfff3c4, emissiveIntensity: 4 });
  const tail = new T.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff1744, emissiveIntensity: 3 });
  for (const x of [-0.65, 0.65]) { add(new T.BoxGeometry(0.4, 0.25, 0.1), head, x, 0.85, 1.92); add(new T.BoxGeometry(0.4, 0.2, 0.1), tail, x, 0.85, -1.92); }
  const shadow = new T.Mesh(new T.CircleGeometry(2.1, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.09; shadow.scale.set(0.75, 1.1, 1);
  const ring = new T.Mesh(new T.RingGeometry(2.6, 3.1, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1;
  return { group: g, shadow, ring };
}

const cars = COLORS.map((c, i) => {
  const m = makeCarMesh(c.hex);
  scene.add(m.group); scene.add(m.shadow); scene.add(m.ring);
  m.group.visible = m.shadow.visible = m.ring.visible = false;
  return {
    i, color: c, mesh: m, pos: new T.Vector3(), vel: new T.Vector2(), h: 0, y: 0, vy: 0,
    active: false, human: false, alive: false, falling: false, idx: 0, prog: 0,
    off: 0, warn: 0, boostCd: 0, points: 0, ai: { lane: 0, laneT: 0, stuck: 0, rev: 0 },
    spin: 0,
  };
});
