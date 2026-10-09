// Sony FE 24-50mm F2.8 G (SEL2450G) — interactive 3D model (three.js, units = mm).
// Axis = +x toward the front. Mount (rear) at x = 0. Top = +y. Control side (AF/MF, Focus Hold, G badge) = −z
// (the side facing you when the lens is on the camera and you look from the left). Printed name and marks on top, "SONY" on +z,
// CLICK switch underneath. Proportions measured from hands-on photos; dimensions from Sony spec (Ø74.8, 72.3 mm at 50 mm,
// +20 mm inner tube at 24 mm).

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
let THREE = null;
async function loadThree() { if (!THREE) THREE = await import(THREE_URL); return THREE; }

export const LENS_PARTS = ['focus-ring', 'zoom-ring', 'zoom-scale', 'aperture-ring', 'afmf-switch', 'focus-hold', 'click-switch', 'lens-index', 'filter-thread', 'hood-mount', 'g-badge'];

const R = 37.4;                       // barrel radius (Ø74.8)
const D2R = Math.PI / 180;
const X = {                           // x positions (mm from the rear of the mount)
  mount: [0, 4.4], rear: [4.4, 22], apRib: [22, 26.2], apPrint: [26.2, 30.4], marks: [30.4, 34.1], zoom: [34.1, 42.9],
  band: [42.9, 55.4], focus: [55.4, 67.7], lip: 8.3,
};
const STOPS = ['A', 22, 16, 11, 8, 5.6, 4, 2.8];
const AP_STEP = 12 * D2R;             // angle between full stops on the aperture ring
const ZOOM_STEP = 26 * D2R;           // angle between printed focal marks (≈80° total throw)
const PHI = { top: 90 * D2R, ctl: 180 * D2R, right: 0, bottom: -90 * D2R };

function zf(f) { return f >= 35 ? (50 - f) / 15 : f >= 28 ? 1 + (35 - f) / 7 : 2 + (28 - f) / 4; }   // 0..3 between marks
function stopIndex(ring) { if (ring === 'A' || ring == null) return 0; return 1 + 2 * Math.log2(22 / Number(ring)); }

/* ---------------- textures ---------------- */
const FONT = '"Helvetica Neue", "Arial Narrow", Arial, sans-serif';
function canvasTex(w, h, draw, aniso = 8) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
// Text that wraps around a cylinder: canvas u = arc length (decreasing φ), v = axis (top of canvas = toward the front)
function arcLabel(text, { px = 64, color = '#e9e9e9', weight = 500, w = 1024, h = 128, spacing = 0, align = 'center' } = {}) {
  return canvasTex(w, h, (g) => {
    g.font = `${weight} ${px}px ${FONT}`; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = align;
    if (spacing) g.letterSpacing = spacing + 'px';
    g.fillText(text, align === 'center' ? w / 2 : 8, h / 2);
  });
}
function noiseTex(size, amp, base) {     // fine grain for satin plastic / rubber roughness
  return canvasTex(size, size, (g) => {
    const d = g.createImageData(size, size);
    for (let i = 0; i < d.data.length; i += 4) { const v = base + (Math.random() - 0.5) * amp; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  });
}

/* ---------------- geometry helpers ---------------- */
function lathe(points, segs = 160) {          // points: [x, r] along the axis → LatheGeometry around +x
  const v = points.map(([x, r]) => new THREE.Vector2(r, x));
  const geo = new THREE.LatheGeometry(v, segs);
  geo.rotateZ(-Math.PI / 2);                  // lathe axis y → x  (y' = −x)
  return geo;
}
function ribbed(r, ribH, n, x0, x1, duty = 0.55) {   // longitudinal ribs as real geometry
  const shape = new THREE.Shape();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, da = Math.PI * 2 / n;
    const t = [0, (1 - duty) / 2 - 0.06, (1 - duty) / 2 + 0.06, (1 + duty) / 2 - 0.06, (1 + duty) / 2 + 0.06];
    const rr = [r, r, r + ribH, r + ribH, r];
    t.forEach((tt, k) => pts.push([a0 + tt * da, rr[k]]));
  }
  pts.forEach(([a, rr], i) => (i ? shape.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : shape.moveTo(rr * Math.cos(a), rr * Math.sin(a))));
  const hole = new THREE.Path(); hole.absarc(0, 0, r - 2.2, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, 0.35);
  geo.scale(1, 1, (x1 - x0) / (x1 - x0 + 0.7));
  geo.rotateY(Math.PI / 2);                   // extrude z → +x
  geo.translate(x0, 0, 0);
  return geo;
}
// Decal patch on a cylinder: φ from +z toward +y; u runs with decreasing φ (reads left→right from outside, front = up)
function cylDecal(r, x0, x1, phiC, span, segs = 48) {
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, phi = phiC + span / 2 - u * span;
    for (let j = 0; j <= 1; j++) {
      const x = j ? x1 : x0;
      pos.push(x, r * Math.sin(phi), r * Math.cos(phi)); uv.push(u, j);
    }
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
// a solid placed on the barrel surface at angle φ, local axes: x = lens axis, y = outward normal, z = tangent
function onSurface(obj, x, phi, r) {
  const n = new THREE.Vector3(0, Math.sin(phi), Math.cos(phi));
  obj.position.set(x, n.y * r, n.z * r);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  return obj;
}

/* ---------------- the model ---------------- */
function buildLens(st) {
  const M = {}, parts = {};
  const reg = (id, ...objs) => { (parts[id] = parts[id] || []).push(...objs); objs.forEach(o => o.traverse(c => { if (c.isMesh) c.userData.part = id; })); };
  const grain = noiseTex(256, 26, 128); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(6, 6); grain.colorSpace = THREE.NoColorSpace;
  M.plastic = new THREE.MeshPhysicalMaterial({ color: 0x17181b, roughness: 0.62, metalness: 0.0, roughnessMap: grain, clearcoat: 0.08, clearcoatRoughness: 0.6, envMapIntensity: 0.55 });
  M.plastic2 = new THREE.MeshPhysicalMaterial({ color: 0x111214, roughness: 0.5, metalness: 0.0, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.78, metalness: 0.0, roughnessMap: grain, envMapIntensity: 0.7 });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xa7acb4, roughness: 0.3, metalness: 1.0, envMapIntensity: 0.6 });
  M.inner = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95 });
  M.gold = new THREE.MeshStandardMaterial({ color: 0xd8a64a, roughness: 0.25, metalness: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x0b0d14, roughness: 0.02, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.0,
    iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [240, 520], transparent: true, opacity: 0.38, envMapIntensity: 1.8, side: THREE.DoubleSide });
  M.glassDeep = new THREE.MeshPhysicalMaterial({ color: 0x0a1410, roughness: 0.04, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.4,
    iridescenceThicknessRange: [380, 640], transparent: true, opacity: 0.45, envMapIntensity: 1.4 });
  const decalMat = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, side: THREE.DoubleSide, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, ...extra });

  const root = new THREE.Group();

  /* mount (chrome bayonet, contacts, index, rear element, baffle) */
  const mount = new THREE.Group();
  mount.add(new THREE.Mesh(lathe([[0, 23.2], [0, 30.6], [0.4, 31.0], [3.2, 31.0], [3.6, 32.6], [4.4, 32.6]]), M.chrome));
  for (let k = 0; k < 3; k++) {                // three bayonet tabs on the inner edge
    const a0 = (k * 120 + 20) * D2R, a1 = a0 + (k === 0 ? 46 : 36) * D2R;
    const sh = new THREE.Shape(); sh.absarc(0, 0, 25.6, a0, a1, false); sh.absarc(0, 0, 21.2, a1, a0, true);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false, curveSegments: 24 }); g.rotateY(Math.PI / 2); g.translate(0.4, 0, 0);
    mount.add(new THREE.Mesh(g, M.chrome));
  }
  for (const a of [35, 145, 215, 325]) {      // four mount screws
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0x6f737a, metalness: 1, roughness: 0.35 }));
    sc.rotation.z = Math.PI / 2; sc.position.set(-0.15, 27.6 * Math.sin(a * D2R), 27.6 * Math.cos(a * D2R)); mount.add(sc);
  }
  for (let k = 0; k < 11; k++) {               // gold contacts at the bottom
    const a = (-90 - 25 + k * 5) * D2R;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 1.1), M.gold);
    c.position.set(1.4, 20.4 * Math.sin(a), 20.4 * Math.cos(a)); c.rotation.x = -a; mount.add(c);
  }
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(23.2, 23.2, 14, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95, side: THREE.BackSide })); inner.rotation.z = Math.PI / 2; inner.position.x = 7; mount.add(inner);
  const baffle = new THREE.Shape(); baffle.absarc(0, 0, 23.2, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.moveTo(-15, -11); hole.lineTo(15, -11); hole.lineTo(15, 11); hole.lineTo(-15, 11); hole.lineTo(-15, -11); baffle.holes.push(hole);
  const bg = new THREE.ShapeGeometry(baffle, 32); bg.rotateY(Math.PI / 2); const bm = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95, side: THREE.DoubleSide })); bm.position.x = 6; mount.add(bm);
  const rearEl = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 12, 0, Math.PI * 2, 0, 0.4), M.glassDeep); rearEl.rotation.z = Math.PI / 2; rearEl.position.x = 46; mount.add(rearEl);
  root.add(mount);

  /* rear barrel (gentle taper toward the mount) with SONY and the CLICK switch */
  root.add(new THREE.Mesh(lathe([[4.4, 32.4], [5.2, 33.6], [8, 34.5], [14, 35.8], [20, 36.9], [22, 37.2]]), M.plastic));
  const idxDot = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 24), new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.4 }));
  onSurface(idxDot, 6.0, 90 * D2R + 0.62, 34.0); reg('lens-index', idxDot); root.add(idxDot);
  const sony = new THREE.Mesh(cylDecal(36.15, 9.5, 17.5, PHI.right, 40 * D2R), decalMat(arcLabel('SONY', { px: 92, weight: 700, spacing: 6, color: '#dedede' })));
  root.add(sony);
  // CLICK switch underneath
  const clickG = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.9, 7.5), M.plastic2); clickG.add(plate);
  const slider = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 3.0), new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.4 }));
  slider.position.y = 0.6; clickG.add(slider); clickG.userData.slider = slider;
  onSurface(clickG, 17.5, PHI.bottom, 36.2); reg('click-switch', clickG); root.add(clickG);
  root.add(new THREE.Mesh(cylDecal(36.25, 11.4, 13.6, PHI.bottom, 24 * D2R), decalMat(arcLabel('CLICK  ON ⇄ OFF', { px: 62, weight: 600, color: '#d6d6d6' }))));

  /* aperture ring (rotates) : ribs at the rear half, printed scale at the front half */
  const apRing = new THREE.Group();
  apRing.add(new THREE.Mesh(ribbed(R - 0.2, 0.4, 200, X.apRib[0], X.apRib[1], 0.5), M.rubber));
  apRing.add(new THREE.Mesh(lathe([[X.apPrint[0], R], [X.apPrint[1] - 0.3, R], [X.apPrint[1], R - 0.3]]), M.plastic));
  const apScaleTex = canvasTex(2048, 128, (g, w, h) => {      // A 22 16 11 8 5.6 4 2.8 with 1/3-stop ticks
    g.textBaseline = 'middle'; g.textAlign = 'center';
    const span = 120 * D2R, step = AP_STEP / span * w;
    for (let i = 0; i < STOPS.length; i++) {
      const x = w * 0.1 + i * step;
      g.font = `600 ${i === 0 ? 70 : 62}px ${FONT}`; g.fillStyle = i === 0 ? '#ef4a34' : '#e6e6e6';
      g.fillText(String(STOPS[i]), x, h * 0.55);
      if (i > 0 && i < STOPS.length - 1) for (const t of [1 / 3, 2 / 3]) { g.fillStyle = '#cfcfcf'; g.fillRect(x + t * step - 2, h * 0.38, 4, 34); }
    }
  });
  const apScale = new THREE.Mesh(cylDecal(R + 0.04, X.apPrint[0] + 0.4, X.apPrint[1] - 0.6, PHI.top - (60 * D2R - 0.1 * 120 * D2R), 120 * D2R), decalMat(apScaleTex));
  apRing.add(apScale);
  reg('aperture-ring', apRing); root.add(apRing);

  /* fixed index strip between aperture ring and zoom marks: red aperture index + white zoom index */
  const idxStrip = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ef4a34'; g.fillRect(w / 2 - 6, 0, 12, h * 0.42); g.fillStyle = '#f2f2f2'; g.fillRect(w / 2 - 6, h * 0.58, 12, h * 0.42); });
  root.add(new THREE.Mesh(lathe([[X.apPrint[1], R - 0.3], [X.apPrint[1] + 0.2, R - 0.45], [X.marks[0] + 0.6, R - 0.45]]), M.plastic2));
  root.add(new THREE.Mesh(cylDecal(R - 0.38, X.apPrint[1] - 0.2, X.marks[0] + 1.6, PHI.top, 4 * D2R, 4), decalMat(idxStrip)));

  /* zoom ring (rotates): printed focal marks band + ribbed grip */
  const zoomRing = new THREE.Group();
  zoomRing.add(new THREE.Mesh(lathe([[X.marks[0] + 0.6, R - 0.1], [X.marks[1], R]]), M.plastic));
  const zoomTex = canvasTex(2048, 128, (g, w, h) => {
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = `600 66px ${FONT}`; g.fillStyle = '#e8e8e8';
    const span = 100 * D2R;
    [[50, 0], [35, 1], [28, 2], [24, 3]].forEach(([f, k]) => { const x = w * 0.12 + k * (ZOOM_STEP / span) * w; g.fillText(String(f), x, h * 0.52); });
  });
  const zoomMarks = new THREE.Mesh(cylDecal(R + 0.04, X.marks[0] + 0.7, X.marks[1] - 0.2, PHI.top - (50 * D2R - 0.12 * 100 * D2R), 100 * D2R), decalMat(zoomTex));
  zoomRing.add(zoomMarks); reg('zoom-scale', zoomMarks);
  const zoomGrip = new THREE.Mesh(ribbed(R - 0.15, 0.55, 150, X.zoom[0], X.zoom[1], 0.5), M.rubber);
  zoomRing.add(zoomGrip); reg('zoom-ring', zoomGrip);
  root.add(zoomRing);

  /* band: printed name (top), SONY side, G badge + Focus Hold + AF/MF on the control side */
  root.add(new THREE.Mesh(lathe([[X.band[0], R - 0.2], [X.band[0] + 0.5, R], [X.band[1] - 0.5, R], [X.band[1], R - 0.2]]), M.plastic));
  const nameTex = canvasTex(1024, 256, (g, w, h) => {
    g.strokeStyle = '#8b8e94'; g.lineWidth = 5; const rr = 26;
    g.beginPath(); g.roundRect(24, 50, w - 48, h - 100, rr); g.stroke();
    g.font = `500 112px ${FONT}`; g.fillStyle = '#ececec'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FE 2.8/24-50 G', w / 2, h / 2 + 4);
  });
  root.add(new THREE.Mesh(cylDecal(R + 0.04, X.band[0] + 2.2, X.band[1] - 2.2, PHI.top, 64 * D2R), decalMat(nameTex)));
  // G badge
  const gTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e4e5e7'; g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, 34); g.fill();
    g.fillStyle = '#121214'; g.font = `700 200px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('G', w / 2 + 4, h / 2 + 10);
  });
  const badge = new THREE.Mesh(cylDecal(R + 0.12, X.band[0] + 4.0, X.band[1] - 2.0, PHI.ctl - 38 * D2R, 10.6 * D2R, 8), decalMat(gTex, { roughness: 0.3, metalness: 0.2 }));
  reg('g-badge', badge); root.add(badge);
  // Focus Hold button
  const holdG = new THREE.Group();
  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.7, 48), M.plastic2); bezel.position.y = 0.25; holdG.add(bezel);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 1.3, 48), new THREE.MeshPhysicalMaterial({ color: 0x1a1b1e, roughness: 0.35, clearcoat: 0.6 }));
  btn.position.y = 0.75; holdG.add(btn); holdG.userData.btn = btn;
  onSurface(holdG, (X.band[0] + X.band[1]) / 2 + 0.6, PHI.ctl - 12 * D2R, R - 0.1); reg('focus-hold', holdG); root.add(holdG);
  // AF/MF slide switch + printed AF ⇄ MF
  const afG = new THREE.Group();
  const well = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 9.2), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.8 })); well.position.y = 0.05; afG.add(well);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.1, 3.6), new THREE.MeshPhysicalMaterial({ color: 0x232529, roughness: 0.4, clearcoat: 0.5 }));
  knob.position.y = 0.45; afG.add(knob); afG.userData.knob = knob;
  onSurface(afG, (X.band[0] + X.band[1]) / 2 - 1.5, PHI.ctl + 14 * D2R, R - 0.15); reg('afmf-switch', afG); root.add(afG);
  root.add(new THREE.Mesh(cylDecal(R + 0.05, X.band[0] + 0.9, X.band[0] + 3.4, PHI.ctl + 14 * D2R, 22 * D2R, 12), decalMat(arcLabel('AF ⇄ MF', { px: 78, weight: 600, w: 512 }))));

  /* focus ring (rotates) */
  const focusRing = new THREE.Group();
  const fGrip = new THREE.Mesh(ribbed(R - 0.15, 0.5, 170, X.focus[0], X.focus[1], 0.5), M.rubber);
  focusRing.add(fGrip); reg('focus-ring', fGrip); root.add(focusRing);

  /* front assembly: inner tube (extends) + lip with filter thread, red hood index, glass, iris */
  const front = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(35.0, 35.0, 1, 128, 1, true), M.plastic2); tube.rotation.z = Math.PI / 2; root.add(tube);
  const L0 = X.focus[1];
  const lip = new THREE.Mesh(lathe([[0, 35.2], [0.6, 36.6], [5.6, 36.9], [6.4, 36.4], [7.4, 36.5], [8.0, 36.0], [8.3, 34.8], [8.3, 33.6], [7.6, 33.6]]), M.plastic2);
  front.add(lip); reg('hood-mount', lip);
  const thread = new THREE.Mesh(lathe([[5.2, 33.6], [7.6, 33.6]], 96), new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.5, metalness: 0.3 }));
  front.add(thread); reg('filter-thread', thread);
  const redDot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 24), new THREE.MeshStandardMaterial({ color: 0xd8382a, roughness: 0.4 }));
  onSurface(redDot, 3.2, PHI.top, 36.8); front.add(redDot);
  // front ring with printing (annulus facing +x)
  const ringTex = canvasTex(1024, 1024, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#0f1012'; g.beginPath(); g.arc(cx, cy, w / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#020203'; g.beginPath(); g.arc(cx, cy, w / 2 * (29.6 / 33.6), 0, Math.PI * 2); g.fill();
    const rad = w / 2 * (31.5 / 33.6);
    const arcText = (txt, start, px, dir) => {
      g.font = `500 ${px}px ${FONT}`; g.fillStyle = '#e4e4e4'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let ang = start; const chars = [...txt];
      const total = chars.reduce((s, ch) => s + g.measureText(ch).width, 0) / rad;
      ang -= dir * total / 2;
      for (const ch of chars) {
        const cw = g.measureText(ch).width / rad;
        g.save(); g.translate(cx + rad * Math.cos(ang + dir * cw / 2), cy + rad * Math.sin(ang + dir * cw / 2));
        g.rotate(ang + dir * cw / 2 + dir * Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
        ang += dir * cw;
      }
    };
    arcText('FE 2.8/24-50 G', -Math.PI / 2, 54, 1);
    arcText('0.19m/0.63ft-0.3m/0.99ft', 0.35, 44, 1);
    arcText('⌀67', Math.PI * 0.78, 50, 1);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(cx, cy, w / 2 * (29.4 / 33.6), 0, Math.PI * 2); g.fill();
  });
  const ringGeo = new THREE.CircleGeometry(33.6, 128); ringGeo.rotateY(Math.PI / 2);
  const ringFace = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.6, transparent: true, alphaTest: 0.5 })); ringFace.position.x = 5.2; front.add(ringFace);
  // glass (front element, convex) + inner elements
  const fe = new THREE.Mesh(new THREE.SphereGeometry(62, 96, 24, 0, Math.PI * 2, 0, Math.asin(29.4 / 62)), M.glass);
  fe.rotation.z = -Math.PI / 2; fe.position.x = 4.6 - 62; front.add(fe);
  const glassBack = new THREE.Mesh(new THREE.CylinderGeometry(29.4, 29.4, 30, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 1, side: THREE.BackSide }));
  glassBack.rotation.z = Math.PI / 2; glassBack.position.x = -10; front.add(glassBack);
  const stop = new THREE.Mesh(new THREE.CircleGeometry(29.4, 64).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x010102, roughness: 1 })); stop.position.x = -24; front.add(stop);
  const el2 = new THREE.Mesh(new THREE.SphereGeometry(34, 64, 12, 0, Math.PI * 2, 0, 0.5), M.glassDeep); el2.rotation.z = -Math.PI / 2; el2.position.x = -20 - 34; front.add(el2);
  // iris
  const seams = canvasTex(1024, 1024, (g, w, h) => {        // blade surface: soft gradient + 11 curved seams
    const gr = g.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#5a5d63'); gr.addColorStop(1, '#2a2c30'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 5;
    for (let k = 0; k < 11; k++) {
      g.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const r = t * w / 2, a = k * Math.PI * 2 / 11 + t * 1.1;
        const x = w / 2 + r * Math.cos(a), y = h / 2 + r * Math.sin(a);
        t ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  });
  seams.repeat.set(1 / 58.8, 1 / 58.8); seams.offset.set(0.5, 0.5);
  const irisMat = new THREE.MeshStandardMaterial({ map: seams, color: 0x8a8d94, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide, envMapIntensity: 0.9 });
  const iris = new THREE.Mesh(new THREE.BufferGeometry(), irisMat); iris.position.x = -14; front.add(iris);
  const irisLight = new THREE.PointLight(0xffffff, 260, 80, 2); irisLight.position.set(-2, 18, 10); front.add(irisLight);
  root.add(front);

  /* hood ALC-SH178 (petal) */
  const hood = new THREE.Group();
  {
    const seg = 192, geo = new THREE.BufferGeometry(), pos = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const phi = i / seg * Math.PI * 2;
      const petal = Math.pow(Math.abs(Math.sin(phi)), 6);          // long petals top & bottom
      const len = 22 + 10 * petal;
      for (const t of [0, 1]) {
        const x = t * len, r = 36.9 + t * (8 + 3 * petal);
        pos.push(x, r * Math.sin(phi), r * Math.cos(phi));
      }
    }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    hood.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x0c0d0f, roughness: 0.72, clearcoat: 0.12, side: THREE.DoubleSide, envMapIntensity: 0.6 })));
  }
  front.add(hood); hood.position.x = 3.0;

  return { root, M, parts, apRing, zoomRing, focusRing, front, tube, iris, hood, clickG, afG, holdG, L0 };
}

function irisGeometry(rOpen) {
  const n = 11, shape = new THREE.Shape(); shape.absarc(0, 0, 29.4, 0, Math.PI * 2, false);
  if (rOpen < 28.5) {
    const hole = new THREE.Path();
    for (let k = 0; k <= n * 6; k++) {          // rounded 11-gon: each edge a shallow arc
      const a = (k / (n * 6)) * Math.PI * 2, m = (k % 6) / 6;
      const bulge = 1 - 0.035 * Math.sin(m * Math.PI) * (rOpen / 20);
      const r = rOpen / Math.cos((m - 0.5) * (2 * Math.PI / n)) * bulge;
      k ? hole.lineTo(r * Math.cos(a), r * Math.sin(a)) : hole.moveTo(r * Math.cos(a), r * Math.sin(a));
    }
    shape.holes.push(hole);
  } else { const hole = new THREE.Path(); hole.absarc(0, 0, 29.2, 0, Math.PI * 2, true); shape.holes.push(hole); }
  const g = new THREE.ShapeGeometry(shape, 48); g.rotateY(Math.PI / 2);
  return g;
}

function envMap(renderer) {   // studio environment without addons: soft boxes in a dark room
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2c30);
  const box = (w, h, d, x, y, z, c, I = 1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(I) })); m.position.set(x, y, z); scene.add(m); };
  box(60, 1, 30, 0, 26, 0, 0xffffff, 2.4);       // large top softbox
  box(1, 20, 40, -30, 6, 0, 0xfff4e6, 2.2);       // side strip (warm)
  box(1, 16, 36, 30, 2, 0, 0xe6f0ff, 1.6);        // side strip (cool)
  box(40, 10, 1, 0, 4, -30, 0xffffff, 0.9);
  box(60, 1, 60, 0, -20, 0, 0x6b6f76, 1);         // floor bounce
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.035);
  pm.dispose();
  return rt.texture;
}

const VIEWS = {
  side: { az: -90, el: 12 }, 'three-quarter': { az: -38, el: 20 }, front: { az: 0, el: 4 }, rear: { az: 180, el: 6 }, top: { az: -90, el: 72 },
};

export async function createLens3D(host, opts = {}) {
  try { await loadThree(); } catch (e) { host.innerHTML = '<div class="l3-fallback">לא ניתן לטעון את המודל התלת-ממדי (אין חיבור לרשת?).</div>'; return null; }
  const state = { focal: 24, ring: 'A', afmf: 'AF', clicks: true, hood: false, focusSpin: 0, view: 'three-quarter', ...opts };
  const compact = !!opts.compact;
  host.classList.add('l3-host');
  host.style.position = host.style.position || 'relative';
  const wrap = document.createElement('div'); wrap.className = 'l3';
  wrap.style.cssText = `position:relative;width:100%;aspect-ratio:${compact ? '2/1' : '16/10'};max-width:100%;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden`;
  host.append(wrap);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
  } catch (e) { wrap.innerHTML = '<div class="l3-fallback">הדפדפן לא תומך ב-WebGL.</div>'; return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
  wrap.append(renderer.domElement);
  const badgeLayer = document.createElement('div'); badgeLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  wrap.append(badgeLayer);

  const scene = new THREE.Scene();
  scene.environment = envMap(renderer);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-60, 120, -80); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.9); rim.position.set(120, 40, 120); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));

  const L = buildLens(state);
  const pivot = new THREE.Group(); pivot.add(L.root); scene.add(pivot);
  const camera = new THREE.PerspectiveCamera(compact ? 20 : 22, 1.6, 10, 2000);
  const orbit = { az: VIEWS[state.view]?.az ?? -38, el: VIEWS[state.view]?.el ?? 20, dist: 330 };
  let target = null, raf = 0, dirty = true;
  const hl = new Set(opts.highlight || []);
  const origEm = new Map();

  function layout() {
    const ext = 20 * (50 - state.focal) / 26;
    L.tube.scale.y = Math.max(0.01, ext + 0.6); L.tube.position.x = L.L0 + (ext + 0.6) / 2 - 0.3;
    L.tube.visible = ext > 0.05;
    L.front.position.x = L.L0 + ext;
    L.zoomRing.rotation.x = -zf(state.focal) * ZOOM_STEP;
    L.apRing.rotation.x = -stopIndex(state.ring) * AP_STEP;
    L.focusRing.rotation.x = state.focusSpin;
    L.hood.visible = !!state.hood;
    L.afG.userData.knob.position.z = state.afmf === 'AF' ? -2.4 : 2.4;
    L.clickG.userData.slider.position.x = state.clicks ? -1.4 : 1.4;
    const N = state.ring === 'A' ? 2.8 : Number(state.ring);
    const pupil = state.ring === 'A' ? 29.2 : 27.5 * Math.pow(2.8 / N, 0.85) * (0.9 + 0.1 * state.focal / 50);   // apparent pupil seen through the front group
    L.iris.geometry.dispose(); L.iris.geometry = irisGeometry(pupil);
    const total = L.L0 + ext + X.lip + (state.hood ? 30 : 0);
    L.root.position.x = -total / 2;
    if (camera) fit();
    dirty = true;
  }
  function fit() {           // frame the whole lens (incl. hood) from any angle
    pivot.position.set(0, 0, 0); pivot.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(L.root).getBoundingSphere(new THREE.Sphere());
    pivot.position.copy(sph.center).negate();
    const v = camera.fov * D2R / 2, hf = Math.atan(Math.tan(v) * camera.aspect);
    orbit.dist = sph.radius / Math.sin(Math.min(v, hf)) * (compact ? 0.64 : 0.8);
  }
  function setCamera() {
    const az = orbit.az * D2R, el = orbit.el * D2R;
    // azimuth 0 = looking at the front (from +x); −90 = from the control side (−z)
    camera.position.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(orbit.dist);
    camera.lookAt(0, 0, 0);
  }
  function size() {
    const w = wrap.clientWidth || 600, h = wrap.clientHeight || 375;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    fit();
    camera.updateProjectionMatrix(); dirty = true;
  }
  function applyHighlight() {
    for (const id of LENS_PARTS) for (const o of (L.parts[id] || [])) o.traverse(c => {
      if (!c.isMesh) return;
      if (!origEm.has(c)) { c.material = c.material.clone(); origEm.set(c, c.material.emissive ? c.material.emissive.clone() : null); }
      if (c.material.emissive) { c.material.emissive.copy(hl.has(id) ? new THREE.Color(0xf0892a) : origEm.get(c)); c.material.emissiveIntensity = hl.has(id) ? 0.16 : 1; }
    });
    dirty = true;
  }
  const v3 = new THREE.Vector3();
  function anchor(id) {      // a point on the part that faces the camera, in world space
    const objs = L.parts[id]; if (!objs || !objs.length) return null;
    const o = objs[0]; const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    if (['focus-ring', 'zoom-ring', 'aperture-ring', 'zoom-scale', 'filter-thread', 'hood-mount'].includes(id)) {
      const toCam = camera.position.clone(); toCam.x = 0; toCam.normalize();
      const r = id === 'filter-thread' ? 33.6 : id === 'hood-mount' ? 36.9 : R + 0.6;
      return new THREE.Vector3(c.x, toCam.y * r, toCam.z * r);
    }
    return c;
  }
  function badges() {
    badgeLayer.innerHTML = '';
    let n = 0; const w = wrap.clientWidth, h = wrap.clientHeight;
    for (const id of opts.highlightOrder || [...hl]) {
      n++; if (!hl.has(id)) continue;
      const p = anchor(id); if (!p) continue;
      // hide when the point faces away from the camera
      const nrm = new THREE.Vector3(0, p.y, p.z).normalize(), view = camera.position.clone().sub(p).normalize();
      if (!['filter-thread', 'hood-mount'].includes(id) && nrm.dot(view) < -0.05) continue;
      v3.copy(p).project(camera);
      const x = Math.min(w - 13, Math.max(13, (v3.x * 0.5 + 0.5) * w)), y = Math.min(h - 13, Math.max(13, (-v3.y * 0.5 + 0.5) * h));
      const b = document.createElement('span'); b.className = 'l3-badge'; b.dataset.part = id; b.textContent = n;
      const bs = w < 520 ? 18 : 22;
      b.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);width:${bs}px;height:${bs}px;border-radius:50%;background:#f0892a;color:#1a1205;font:700 ${bs - 10}px/${bs}px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px rgba(0,0,0,.55)`;
      badgeLayer.append(b);
    }
  }
  function frame() {
    raf = 0;
    if (target) {   // eased view transition
      orbit.az += (target.az - orbit.az) * 0.18; orbit.el += (target.el - orbit.el) * 0.18;
      if (Math.abs(target.az - orbit.az) < 0.05 && Math.abs(target.el - orbit.el) < 0.05) { orbit.az = target.az; orbit.el = target.el; target = null; }
      dirty = true;
    }
    if (dirty) { setCamera(); renderer.render(scene, camera); badges(); dirty = false; }
    if (target) raf = requestAnimationFrame(frame);
  }
  const kick = () => { dirty = true; if (!raf) raf = requestAnimationFrame(frame); };

  /* interaction */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(L.root, true).find(h => h.object.visible);
    return hit ? hit.object.userData.part || 'body' : null;
  }
  let drag = null;
  const emit = () => opts.onChange && opts.onChange({ ...state });
  if (opts.interactive !== false) {
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic or already released pointer */ }
      const part = pick(e);
      drag = { part, x: e.clientX, y: e.clientY, moved: 0, acc: 0 };
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      // which screen direction turns a ring: perpendicular to the projected lens axis
      const a0 = new THREE.Vector3(-30, 0, 0).project(camera), a1 = new THREE.Vector3(30, 0, 0).project(camera);
      const ax = new THREE.Vector2(a1.x - a0.x, -(a1.y - a0.y)).normalize();
      const turn = (-ax.y * dx + ax.x * dy);   // movement across the axis
      if (drag.part === 'zoom-ring' || drag.part === 'zoom-scale') {
        drag.acc += turn; const st = Math.trunc(drag.acc / 6); if (st) { drag.acc -= st * 6; state.focal = Math.min(50, Math.max(24, state.focal - st)); layout(); emit(); kick(); }
      } else if (drag.part === 'aperture-ring') {
        drag.acc += turn; const st = Math.trunc(drag.acc / 14);
        if (st) {
          drag.acc -= st * 14;
          const thirds = ['A', 22, 20, 18, 16, 14, 13, 11, 10, 9, 8, 7.1, 6.3, 5.6, 5, 4.5, 4, 3.5, 3.2, 2.8];
          let i = thirds.findIndex(v => String(v) === String(state.ring)); if (i < 0) i = 0;
          i = Math.min(thirds.length - 1, Math.max(0, i + st)); state.ring = thirds[i]; layout(); emit(); kick();
        }
      } else if (drag.part === 'focus-ring') {
        state.focusSpin -= turn * 0.01; layout(); kick();
        drag.acc += turn; const st = Math.trunc(drag.acc / 5);
        if (st) { drag.acc -= st * 5; opts.onChange && opts.onChange({ ...state, focusTurn: -st }); }
      } else {
        orbit.az = Math.max(-200, Math.min(200, orbit.az + dx * 0.4)); orbit.el = Math.max(-35, Math.min(70, orbit.el + dy * 0.3)); target = null; kick();
      }
    });
    const up = (e) => {
      if (drag && drag.moved < 6) {        // tap
        const p = drag.part;
        if (p === 'afmf-switch') { state.afmf = state.afmf === 'AF' ? 'MF' : 'AF'; layout(); emit(); kick(); }
        else if (p === 'click-switch') { state.clicks = !state.clicks; layout(); emit(); kick(); }
        else if (p === 'focus-hold') { L.holdG.userData.btn.position.y = 0.4; kick(); setTimeout(() => { L.holdG.userData.btn.position.y = 0.75; kick(); }, 220); }
        if (p && p !== 'body' && opts.onPick) opts.onPick(p);
      }
      drag = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => (drag = null));
  }

  const ro = new ResizeObserver(() => { size(); kick(); }); ro.observe(wrap);
  layout(); size(); applyHighlight(); kick();

  return {
    state,
    set(p) { Object.assign(state, p); layout(); kick(); },
    highlight(ids) { hl.clear(); (ids || []).forEach(i => hl.add(i)); opts.highlightOrder = ids; applyHighlight(); kick(); },
    setView(name) { const v = VIEWS[name]; if (v) { target = { ...v }; state.view = name; kick(); } },
    render() { kick(); },
    renderNow() { size(); setCamera(); renderer.render(scene, camera); badges(); },
    canvas: renderer.domElement,
    dispose() {
      ro.disconnect(); cancelAnimationFrame(raf);
      scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); wrap.remove();
    },
  };
}

/** Render one still image (PNG data URL) of the lens. opts like createLens3D + {width, height} */
export async function renderLensStill(opts = {}) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${opts.width || 800}px`;
  document.body.append(host);
  const l = await createLens3D(host, { ...opts, interactive: false, preserve: true });
  if (!l) { host.remove(); return null; }
  l.renderNow();
  const url = l.canvas.toDataURL('image/png');
  l.dispose(); host.remove();
  return url;
}
