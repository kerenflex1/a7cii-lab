// FE 24-50mm F2.8 G (SEL2450G), drawn to scale from hands-on photos (1 unit = 1 mm).
// Side view, front to the left, mount to the right. Layout front → mount (verified):
//   front lip (red hood index) · [inner tube that extends ≈20 mm toward 24 mm] · focus ring (ribbed)
//   · band with "FE 2.8/24-50 G", G badge, Focus Hold button, AF/MF switch · zoom ring (ribbed)
//   · focal marks 50 35 28 24 · aperture ring (A 22 16 11 8 5.6 4 2.8, red A) · rear barrel with CLICK ON/OFF switch · mount.

const D = 74.8, R = D / 2;
export const RING_STOPS = ['A', 22, 16, 11, 8, 5.6, 4, 2.8];   // printed order on the ring
const ZOOM_MARKS = [50, 35, 28, 24];

// mm from the mount
const SEG = { bay: [0, 4], rear: [4, 9.5], ap: [9.5, 18.5], idx: [18.5, 19.5], marks: [19.5, 24.5], zoom: [24.5, 35],
  band: [35, 47.5], focus: [47.5, 61.3], lip: [61.3, 72.3] };

function ribs(xa, xb, y0, y1, pitch, phase) {
  const h = y1 - y0, n = Math.ceil(h / pitch) + 2;
  let s = '';
  for (let i = 0; i < n; i++) {
    let u = ((i * pitch + phase) % (n * pitch) + n * pitch) % (n * pitch) - pitch;
    if (u < 0 || u > h) continue;
    const t = u / h * 2 - 1;                              // -1..1 across the visible half-cylinder
    const yy = (y0 + y1) / 2 + Math.sin(t * Math.PI / 2) * h / 2;
    const op = (0.25 + 0.75 * Math.cos(t * Math.PI / 2)).toFixed(2);
    s += `<line x1="${xa}" x2="${xb}" y1="${yy.toFixed(2)}" y2="${yy.toFixed(2)}" class="rib" stroke-opacity="${op}"/>`;
  }
  return s;
}
// text that wraps around the barrel: vertical position y (unrolled), squash near the edges
function wrapText(x, yUnrolled, cy, label, cls, rot = 0) {
  const t = (yUnrolled - cy) / R;
  if (Math.abs(t) > 0.92) return '';
  const y = cy + Math.sin(t * Math.PI / 2) * R;
  const sc = Math.cos(t * Math.PI / 2);
  return `<text x="${x}" y="${y.toFixed(2)}" class="${cls}" text-anchor="middle" dominant-baseline="middle"
    transform="translate(${x} ${y.toFixed(2)}) rotate(${rot}) scale(1 ${sc.toFixed(3)}) translate(${-x} ${-y.toFixed(2)})">${label}</text>`;
}

/** SVG string. st: { focal 24..50, ring ('A'|f-number), focusDist (m), afmf ('AF'|'MF'), clicks (bool), hood (bool), hl: [partId] } */
export function lensSVG(st = {}) {
  const focal = st.focal ?? 24;
  const ext = 20 * (50 - focal) / 26;
  const L = 72.3 + ext;
  const mx = 170, cy = 50, y0 = cy - R, y1 = cy + R;
  const X = (m) => mx - m;
  const frontX = X(SEG.lip[1]) - ext;
  const hl = new Set(st.hl || []);
  const H = (id) => (hl.has(id) ? ' hl' : '');
  const ringIdx = Math.max(0, RING_STOPS.findIndex(v => String(v) === String(st.ring ?? 'A')));
  const apPitch = 5.2, zoomPitch = 7.5;
  const zoomPos = { 50: 0, 35: 1, 28: 2, 24: 3 };
  // continuous zoom-ring position between printed marks
  const zf = focal >= 35 ? (50 - focal) / 15 : focal >= 28 ? 1 + (35 - focal) / 7 : 2 + (28 - focal) / 4;
  const zoomPhase = zf * zoomPitch * 1.1;
  const focusPhase = Math.log(Math.max(0.18, st.focusDist ?? 3)) * 6;

  let s = `<svg viewBox="${frontX - (st.hood ? 40 : 10)} -8 ${L + (st.hood ? 52 : 22)} 118" class="lens-svg" role="img" aria-label="FE 24-50mm F2.8 G, מבט מהצד">
  <defs>
    <linearGradient id="lsBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070708"/><stop offset=".16" stop-color="#3b3e44"/>
      <stop offset=".3" stop-color="#26282c"/><stop offset=".72" stop-color="#151619"/><stop offset="1" stop-color="#040405"/></linearGradient>
    <linearGradient id="lsRub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040405"/><stop offset=".2" stop-color="#2b2d31"/>
      <stop offset=".36" stop-color="#1b1c1f"/><stop offset="1" stop-color="#030304"/></linearGradient>
    <linearGradient id="lsChrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55585e"/><stop offset=".22" stop-color="#e2e5ea"/>
      <stop offset=".5" stop-color="#8c9097"/><stop offset=".78" stop-color="#cfd2d8"/><stop offset="1" stop-color="#45484e"/></linearGradient>
    <linearGradient id="lsGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b6db0"/><stop offset=".45" stop-color="#0b0f1d"/><stop offset="1" stop-color="#6a3a7d"/></linearGradient>
  </defs>`;
  const rect = (a, b, fill, part, extra = '', inset = 0) =>
    `<rect x="${X(b)}" y="${y0 + inset}" width="${b - a}" height="${D - inset * 2}" fill="${fill}"${part ? ` data-part="${part}" class="pt${H(part)}"` : ''} ${extra}/>`;

  // petal hood (ALC-SH178), optional
  if (st.hood) {
    const hx = frontX + 1;
    s += `<path data-part="hood-mount" class="pt${H('hood-mount')}" d="M${hx} ${y0 - 1} L${hx - 36} ${y0 - 7} L${hx - 36} ${y0 + 9} L${hx - 24} ${y0 + 15}
      L${hx - 24} ${y1 - 15} L${hx - 36} ${y1 - 9} L${hx - 36} ${y1 + 7} L${hx} ${y1 + 1} Z" fill="url(#lsBody)" stroke="#000" stroke-width=".4"/>`;
  }
  // front element seen at a grazing angle
  s += `<path d="M${frontX} ${cy - 31} q -5 31 0 62" fill="url(#lsGlass)"/>`;
  // front lip (filter thread Ø67 + hood bayonet) — sits at the end of the extending tube
  s += `<g data-part="filter-thread" class="pt${H('filter-thread')}">
    <rect x="${frontX}" y="${y0 + 1.6}" width="${SEG.lip[1] - SEG.lip[0]}" height="${D - 3.2}" rx="1.2" fill="url(#lsBody)"/>
    <line x1="${frontX + 2.2}" x2="${frontX + 2.2}" y1="${y0 + 3}" y2="${y1 - 3}" stroke="#000" stroke-width=".6"/>
    <line x1="${frontX + 5.6}" x2="${frontX + 5.6}" y1="${y0 + 2}" y2="${y1 - 2}" stroke="#4a4d52" stroke-width=".25"/></g>`;
  s += `<circle cx="${frontX + 8.2}" cy="${cy - 0.5}" r="0.9" fill="#d23a2a"/>`;   // red hood index dot
  // extending inner tube (between lip and focus ring)
  if (ext > 0.3) s += `<rect x="${frontX + (SEG.lip[1] - SEG.lip[0])}" y="${cy - 33.6}" width="${ext + 0.4}" height="67.2" fill="url(#lsBody)" stroke="#000" stroke-width=".25"/>`;
  // focus ring
  s += rect(...SEG.focus, 'url(#lsRub)', 'focus-ring');
  s += `<g pointer-events="none">${ribs(X(SEG.focus[1]) + 0.8, X(SEG.focus[0]) - 0.8, y0 + 0.8, y1 - 0.8, 1.9, focusPhase)}</g>`;
  // band: name, G badge, focus hold, AF/MF
  s += rect(...SEG.band, 'url(#lsBody)', '');
  const bx = X((SEG.band[0] + SEG.band[1]) / 2);
  s += `<g pointer-events="none">${wrapText(bx, cy - 22, cy, 'FE 2.8/24-50 G', 'prt', -90)}</g>`;
  s += `<g data-part="g-badge" class="pt${H('g-badge')}"><rect x="${bx - 3.6}" y="${cy - 11.5}" width="7.2" height="7.2" rx="1.1" fill="#d9dadc"/>
    <text x="${bx}" y="${cy - 7.7}" class="gb" text-anchor="middle" dominant-baseline="middle">G</text></g>`;
  s += `<g data-part="focus-hold" class="pt${H('focus-hold')}"><circle cx="${bx}" cy="${cy + 1.8}" r="3.3" fill="#0d0e10" stroke="#5f6268" stroke-width=".45"/>
    <circle cx="${bx - .5}" cy="${cy + 1.3}" r="2.2" fill="#2a2c30"/></g>`;
  const af = st.afmf === 'MF';
  s += `<g data-part="afmf-switch" class="pt${H('afmf-switch')}"><rect x="${bx - 2.2}" y="${cy + 8}" width="4.4" height="12.5" rx="1.3" fill="#060607" stroke="#4d5056" stroke-width=".35"/>
    <rect x="${bx - 1.5}" y="${cy + (af ? 14.4 : 8.8)}" width="3" height="5.2" rx=".7" fill="url(#lsChrome)"/>
    <text x="${bx + 4.3}" y="${cy + 10.6}" class="sm">AF</text><text x="${bx + 4.3}" y="${cy + 18.6}" class="sm">MF</text></g>`;
  // zoom ring + printed focal marks (they turn with the ring)
  s += rect(...SEG.zoom, 'url(#lsRub)', 'zoom-ring');
  s += `<g pointer-events="none">${ribs(X(SEG.zoom[1]) + 0.8, X(SEG.zoom[0]) - 0.8, y0 + 0.8, y1 - 0.8, 2.7, zoomPhase)}</g>`;
  s += rect(...SEG.marks, 'url(#lsBody)', 'zoom-scale');
  const mkx = X((SEG.marks[0] + SEG.marks[1]) / 2);
  for (const f of ZOOM_MARKS) {
    const yu = cy + (zf - zoomPos[f]) * zoomPitch * 1.1;
    s += wrapText(mkx, yu, cy, f, 'lmk' + (Math.abs(f - focal) < 1.5 ? ' on' : ''), -90);
  }
  // fixed index band: white zoom index, red aperture index
  s += rect(...SEG.idx, '#101113', '');
  s += `<line x1="${X(SEG.idx[1]) - 2.2}" x2="${X(SEG.idx[1]) + .2}" y1="${cy}" y2="${cy}" stroke="#fff" stroke-width=".55"/>
    <line x1="${X(SEG.idx[0]) - .2}" x2="${X(SEG.idx[0]) + 2.2}" y1="${cy}" y2="${cy}" stroke="#e0402c" stroke-width=".7"/>`;
  // aperture ring: numbers on the front half, ribs on the rear half
  s += rect(...SEG.ap, 'url(#lsRub)', 'aperture-ring');
  const apx = X(SEG.ap[1]) + 2.6;
  RING_STOPS.forEach((v, i) => {
    const yu = cy + (ringIdx - i) * apPitch;
    s += wrapText(apx, yu, cy, v, 'lmk' + (i === ringIdx ? ' on' : '') + (v === 'A' ? ' a' : ''), -90);
  });
  s += `<g pointer-events="none">${ribs(X(SEG.ap[1]) + 5.4, X(SEG.ap[0]) - 0.6, y0 + 0.8, y1 - 0.8, 1.35, ringIdx * apPitch)}</g>`;
  // rear barrel (slight taper), CLICK switch on the underside, mounting index
  s += `<path d="M${X(SEG.rear[1])} ${y0} L${X(SEG.rear[0])} ${y0 + 3} L${X(SEG.rear[0])} ${y1 - 3} L${X(SEG.rear[1])} ${y1} Z" fill="url(#lsBody)"/>`;
  const cl = st.clicks !== false;
  s += `<g data-part="click-switch" class="pt${H('click-switch')}"><rect x="${X(SEG.rear[1]) + 0.8}" y="${y1 - 7.5}" width="4" height="6.6" rx=".9" fill="#060607" stroke="#4d5056" stroke-width=".3"/>
    <rect x="${X(SEG.rear[1]) + 1.4}" y="${y1 - (cl ? 7 : 4.2)}" width="2.8" height="3" rx=".5" fill="url(#lsChrome)"/>
    <text x="${X(SEG.rear[1]) + 2.8}" y="${y1 - 9.5}" class="sm tiny" text-anchor="middle">CLICK</text></g>`;
  s += `<circle data-part="lens-index" class="pt${H('lens-index')}" cx="${X(SEG.rear[0]) + 1.6}" cy="${cy - 26}" r="1.1" fill="#f2f2f2"/>`;
  s += `<rect x="${X(SEG.bay[1])}" y="${cy - 29.5}" width="${SEG.bay[1]}" height="59" fill="url(#lsChrome)" stroke="#2a2a2a" stroke-width=".3"/>`;
  // outline + specular
  s += `<rect x="${X(SEG.focus[1])}" y="${y0}" width="${SEG.focus[1] - SEG.bay[1]}" height="${D}" fill="none" stroke="#000" stroke-width=".35" pointer-events="none"/>`;
  s += `<rect x="${frontX}" y="${y0 + 6.5}" width="${L - SEG.bay[1]}" height="3.5" fill="#fff" opacity=".05" pointer-events="none"/>`;
  // dimension
  s += `<g class="dim" pointer-events="none"><line x1="${frontX}" x2="${mx}" y1="${y1 + 7}" y2="${y1 + 7}"/>
    <line x1="${frontX}" x2="${frontX}" y1="${y1 + 4.5}" y2="${y1 + 9.5}"/><line x1="${mx}" x2="${mx}" y1="${y1 + 4.5}" y2="${y1 + 9.5}"/>
    <text x="${(frontX + mx) / 2}" y="${y1 + 14}" text-anchor="middle">${L.toFixed(1)} מ"מ ב-${focal} מ"מ</text></g>`;
  return s + '</svg>';
}

/** front view of the iris: 11 rounded blades. N = f-number */
export function irisSVG(N = 2.8, size = 150) {
  const open = 44 * 2.8 / N;
  const n = 11;
  let blades = '';
  if (N > 2.85) {
    for (let i = 0; i < n; i++) {
      const rot = (i * 360 / n).toFixed(2);
      blades += `<path transform="rotate(${rot} 50 50)" d="M ${50 + open} 50 A ${open * 1.25} ${open * 1.25} 0 0 1 ${50 + open * Math.cos(0.62)} ${50 + open * Math.sin(0.62)}
        L ${50 + 49 * Math.cos(0.95)} ${50 + 49 * Math.sin(0.95)} A 49 49 0 0 0 99 50 Z" fill="#1a1b1e" stroke="#3d3f44" stroke-width=".4"/>`;
    }
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="iris-svg" role="img" aria-label="פתח הצמצם ב-F${N}">
    <defs><radialGradient id="irG"><stop offset="0" stop-color="#b4c4ff"/><stop offset=".55" stop-color="#2d3c7c"/><stop offset="1" stop-color="#140c26"/></radialGradient></defs>
    <circle cx="50" cy="50" r="49" fill="#08090b"/><circle cx="50" cy="50" r="${Math.min(46.5, open + 2)}" fill="url(#irG)"/>
    ${blades}<circle cx="50" cy="50" r="48.6" fill="none" stroke="#5c5f66" stroke-width="1.4"/></svg>`;
}

/** front of the lens as printed (for the "lens" overview) */
export function lensFrontSVG(size = 170) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="lens-front" role="img" aria-label="חזית העדשה">
    <defs><radialGradient id="lfG" cx=".42" cy=".38"><stop offset="0" stop-color="#7d8fd6"/><stop offset=".35" stop-color="#18203f"/><stop offset=".8" stop-color="#05060c"/><stop offset="1" stop-color="#2b1838"/></radialGradient>
    <path id="lfArc" d="M 12 50 A 38 38 0 0 1 88 50"/><path id="lfArc2" d="M 14 52 A 36 36 0 0 0 86 52"/></defs>
    <circle cx="50" cy="50" r="49" fill="#0c0d0f" stroke="#3c3f44"/><circle cx="50" cy="50" r="43" fill="#151619" stroke="#000"/>
    <circle cx="50" cy="50" r="33" fill="url(#lfG)"/><circle cx="41" cy="40" r="4" fill="#fff" opacity=".35"/>
    <text class="lf"><textPath href="#lfArc" startOffset="50%" text-anchor="middle">FE 2.8/24-50 G</textPath></text>
    <text class="lf"><textPath href="#lfArc2" startOffset="50%" text-anchor="middle">Ø67 · 0.19m/0.63ft–0.3m/0.99ft</textPath></text></svg>`;
}
