// Sony α7C II (ILCE-7CM2) body as clean vector drawings, Help-Guide style. 1 user unit = 1 mm.
// Geometry measured from background-removed photos of the identical α7CR body: tools/gen_camera_art.py
// -> tools/work/camera_geom.json (body 124.0 × 71.1 × 63.4 mm). Views: rear, top (front up, grip right),
// front (grip left), side (left/ports side, lens to the left), bottom (front up, grip left).
// Every control is <g data-part="id" class="pt">. Printed text uses fixed font sizes + textLength so it can
// never spill outside its shape at any rendered size.

export const VIEWBOX = {
  rear: [-4, -7, 132, 81],
  top: [-4, -6, 133, 73],
  front: [-4, -5, 134, 79],
  side: [-22, -8, 80, 82],
  bottom: [-4, -6, 133, 73],
};

export const SLOTS = { rear: { lcd: { x: 18.1, y: 22.5, w: 66.3, h: 44.2 } } };

// centre + radius (mm) for every part, used for numbered markers / hit areas
export const ANCHORS = {
  rear: {
    evf: { x: 14.4, y: 8.7, r: 7 }, 'eye-sensor': { x: 26, y: 8.8, r: 2.4 }, diopter: { x: 34.5, y: 11, r: 3.6 },
    monitor: { x: 51.2, y: 44.6, r: 10 }, menu: { x: 65.3, y: 8.4, r: 3.4 }, c1: { x: 78.3, y: 8.4, r: 2.9 },
    'rear-dial-l': { x: 96.1, y: 8.4, r: 4 }, 'af-on': { x: 96.1, y: 20.1, r: 4.1 }, fn: { x: 95.9, y: 32, r: 2.8 },
    'control-wheel': { x: 103.3, y: 47, r: 9.4 }, 'wheel-disp': { x: 103.3, y: 40.3, r: 2.4 }, 'wheel-iso': { x: 110, y: 47, r: 2.4 },
    'wheel-drive': { x: 96.6, y: 47, r: 2.4 }, 'wheel-index': { x: 103.3, y: 53.7, r: 2.4 }, 'wheel-center': { x: 103.3, y: 47, r: 2.8 },
    c2: { x: 110.1, y: 62.3, r: 2.8 }, playback: { x: 98.7, y: 62.8, r: 2.8 }, 'grip-rear': { x: 117.5, y: 22, r: 4 },
  },
  top: {
    shutter: { x: 105.8, y: 8, r: 5.5 }, power: { x: 112.5, y: 13.2, r: 2.2 }, 'mode-dial': { x: 88.3, y: 33, r: 11 },
    'sq-dial': { x: 101.4, y: 26.6, r: 2.2 }, movie: { x: 113.3, y: 25, r: 3.4 }, 'rear-dial-r': { x: 116.4, y: 46.5, r: 7.5 },
    shoe: { x: 51.5, y: 43, r: 6 }, 'sensor-mark': { x: 35, y: 30.6, r: 2 }, speaker: { x: 19.3, y: 27.3, r: 2.6 },
    'top-label': { x: 10.6, y: 42.5, r: 3 }, 'front-dial': { x: 110, y: 1.3, r: 2.2 },
  },
  front: {
    'front-dial': { x: 14, y: 15.2, r: 3 }, 'shutter-front': { x: 16.8, y: 3.4, r: 3.4 }, 'af-illuminator': { x: 36.6, y: 16.1, r: 1.6 },
    'lens-release': { x: 44.4, y: 51.1, r: 2.4 }, 'mount-index': { x: 89.7, y: 16.2, r: 1.4 }, mount: { x: 73.2, y: 8.5, r: 3 },
    sensor: { x: 73.2, y: 35.9, r: 8 }, 'lens-contacts': { x: 73.2, y: 54.5, r: 3 }, mic: { x: 58.6, y: 4.6, r: 1.8 },
    grip: { x: 16, y: 45, r: 6 }, 'front-badge': { x: 109.3, y: 16.8, r: 3 }, 'strap-lug': { x: 126.4, y: 6.4, r: 1.8 },
  },
  side: {
    'mic-jack': { x: 13.5, y: 21, r: 2.4 }, 'usb-c': { x: 23, y: 27.8, r: 3 }, 'charge-lamp': { x: 29.5, y: 20.5, r: 1.4 },
    'card-slot': { x: 20, y: 44.5, r: 4 }, 'access-lamp': { x: 29.5, y: 39.6, r: 1.4 }, 'headphone-jack': { x: 15.5, y: 60.5, r: 2.4 },
    hdmi: { x: 26.5, y: 60.5, r: 3 },
  },
  bottom: { battery: { x: 17.5, y: 33, r: 6 }, 'tripod-socket': { x: 73.2, y: 33.5, r: 3.4 } },
};

const MODE_ANGLES = { A: 180, S: 222, M: 254, 1: 305, 2: 350, 3: 395, AUTO: 444, P: 505 };   // printed positions (deg, SVG)
const SQ_ANGLES = { sq: 112, movie: 92, still: 70 };

const f = (n) => +n.toFixed(2);
const T = (x, y, s, size, len, extra = '') =>
  `<text x="${f(x)}" y="${f(y)}" class="cam-t" font-size="${size}" textLength="${len}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" dominant-baseline="central" ${extra}>${s}</text>`;
const pol = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];

function ticksRing(cx, cy, r0, r1, n, stroke = '#5b5f66', w = 0.22) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = i * 360 / n, [x0, y0] = pol(cx, cy, r0, a), [x1, y1] = pol(cx, cy, r1, a);
    s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${stroke}" stroke-width="${w}"/>`;
  }
  return s;
}
// a knurled dial seen edge-on (horizontal cylinder band)
function edgeDial(x, y, w, h, pitch = 0.75) {
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(Math.min(h / 2, 1.2))}" fill="url(#cam-cyl)"/>`;
  for (let u = x + pitch / 2; u < x + w; u += pitch) s += `<line x1="${f(u)}" y1="${f(y + 0.25)}" x2="${f(u)}" y2="${f(y + h - 0.25)}" stroke="#0b0c0e" stroke-width="0.28"/>`;
  return s + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(Math.min(h / 2, 1.2))}" fill="url(#cam-cylShade)" stroke="#0a0a0b" stroke-width="0.25"/>`;
}
// a knurled disc seen from above
function topDial(cx, cy, r, n = 72) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#cam-disc)" stroke="#0a0a0b" stroke-width="0.3"/>
    ${ticksRing(cx, cy, r - 1.7, r - 0.15, n, '#0d0e10', 0.3)}
    <circle cx="${cx}" cy="${cy}" r="${f(r - 1.9)}" fill="url(#cam-discTop)" stroke="#3c4047" stroke-width="0.2"/>${lathe(cx, cy, r - 1.9, 8, 0.05)}`;
}
// concentric "lathe" finish of metal button / dial tops
function lathe(cx, cy, r, n = 9, op = 0.07) {
  let s = '';
  for (let i = 1; i <= n; i++) s += `<circle cx="${cx}" cy="${cy}" r="${f(r * i / (n + 0.5))}" fill="none" stroke="#fff" stroke-opacity="${op}" stroke-width="0.12"/>`;
  return s;
}
const btn = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#cam-btn)" stroke="#08090a" stroke-width="0.3"/><circle cx="${cx}" cy="${f(cy - r * 0.12)}" r="${f(r * 0.78)}" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="0.3"/>`;

function defs() {
  // pebble texture for the grip: deterministic pseudo-random dimples
  let peb = '';
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 170; i++) {
    const x = rnd() * 9, y = rnd() * 9, rx = 0.18 + rnd() * 0.32, a = rnd() * 180;
    peb += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * (0.55 + rnd() * 0.4))}" transform="rotate(${f(a)} ${f(x)} ${f(y)})" fill="#000" fill-opacity="${f(0.16 + rnd() * 0.22)}"/>`;
    if (i % 2) peb += `<ellipse cx="${f(x - 0.12)}" cy="${f(y - 0.14)}" rx="${f(rx * 0.7)}" ry="${f(rx * 0.35)}" fill="#fff" fill-opacity=".045"/>`;
  }
  return `<defs>
    <linearGradient id="cam-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3034"/><stop offset=".08" stop-color="#2a2c30"/><stop offset="1" stop-color="#17181b"/></linearGradient>
    <linearGradient id="cam-bodyH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2c30"/><stop offset="1" stop-color="#1b1c1f"/></linearGradient>
    <linearGradient id="cam-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26282c"/><stop offset="1" stop-color="#1c1d20"/></linearGradient>
    <linearGradient id="cam-cyl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16171a"/><stop offset=".45" stop-color="#3d4046"/><stop offset="1" stop-color="#121315"/></linearGradient>
    <linearGradient id="cam-cylShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <radialGradient id="cam-btn" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#4a4d53"/><stop offset=".6" stop-color="#2b2d31"/><stop offset="1" stop-color="#18191c"/></radialGradient>
    <radialGradient id="cam-disc" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#3b3e44"/><stop offset="1" stop-color="#1d1e21"/></radialGradient>
    <radialGradient id="cam-discTop" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#3a3d42"/><stop offset=".55" stop-color="#232528"/><stop offset="1" stop-color="#18191c"/></radialGradient>
    <linearGradient id="cam-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef0f3"/><stop offset=".35" stop-color="#9fa4ab"/><stop offset=".55" stop-color="#d9dce1"/><stop offset=".8" stop-color="#8a8f96"/><stop offset="1" stop-color="#c9ccd1"/></linearGradient>
    <radialGradient id="cam-glass" cx=".3" cy=".25" r="1"><stop offset="0" stop-color="#1c2230"/><stop offset=".5" stop-color="#07080b"/><stop offset="1" stop-color="#030304"/></radialGradient>
    <linearGradient id="cam-lcdGlare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="cam-sensor" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#2c4a46"/><stop offset=".6" stop-color="#14262a"/><stop offset="1" stop-color="#0b1114"/></radialGradient>
    <radialGradient id="cam-shutter" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#5d6168"/><stop offset=".5" stop-color="#2d3034"/><stop offset="1" stop-color="#15161a"/></radialGradient>
    <pattern id="cam-peb" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#1f2023"/>${peb}</pattern>
  </defs>
  <style>
    .cam-svg{overflow:visible}
    .cam-svg .cam-t{font-family:"Barlow Condensed","Arial Narrow",sans-serif;fill:#e9e9e9;font-weight:500}
    .cam-svg .cam-logo{font-family:"Times New Roman",Georgia,serif;font-weight:700;fill:#ececec}
    .cam-svg .pt{cursor:pointer;transition:filter .15s}
    .cam-svg .pt:hover{filter:brightness(1.35)}
    .cam-svg .pt.hl{filter:drop-shadow(0 0 .7px #f0892a) drop-shadow(0 0 1.6px #f0892a)}
    .cam-svg .pt.pressed{filter:brightness(.55)}
    .cam-svg .cam-hit{fill:transparent}
  </style>`;
}

/* ------------------------------------------------------------------ rear */
function rear(o) {
  let s = '';
  // parts of the top plate that rise above the body, seen from behind (omitted when the top face is drawn in 3D)
  if (!o.flat) s += `<g><rect x="44.3" y="-5.5" width="17.7" height="6" rx="0.6" fill="#1a1b1e" stroke="#08090a" stroke-width="0.3"/>
    <rect x="46" y="-4.6" width="14.3" height="3.6" rx="0.4" fill="#2a2c30"/></g>`;
  if (!o.flat) s += edgeDial(75.6, -3.1, 17.7, 4.0, 0.7);                    // mode dial
  // body
  s += `<path d="M3.3 4.5 Q3.3 0 7.5 0 H120.6 Q124 0 124 3.6 V66.6 Q124 70.8 119.8 70.8 H6.6 Q3.3 70.8 3.3 67.4 Z"
      fill="url(#cam-body)" stroke="#0b0c0e" stroke-width="0.35"/>
    <path d="M7.5 0.45 H120.4" stroke="#ffffff" stroke-opacity=".1" stroke-width="0.5"/>`;
  if (!o.flat) s += edgeDial(104.6, -0.6, 17.1, 4.8, 0.7);                   // rear dial R overhang (top-right corner)
  // thumb rest (textured), cut around the control wheel
  s += `<path d="M106.2 10.2 H122.2 Q124 10.2 124 12.4 V60.4 Q122.6 62 120 61 L115.6 54.3 A14 14 0 0 0 104.3 33 V12.2 Q104.3 10.2 106.2 10.2 Z"
      fill="url(#cam-peb)" stroke="#0b0c0e" stroke-width="0.25" data-part="grip-rear" class="pt"/>`;
  // hinge strip
  s += `<g><rect x="3.3" y="18" width="7.9" height="51.4" rx="1.2" fill="#202225" stroke="#0b0c0e" stroke-width="0.25"/>
    <line x1="3.6" x2="11" y1="37" y2="37" stroke="#0b0c0e" stroke-width="0.35"/><line x1="3.6" x2="11" y1="54.4" y2="54.4" stroke="#0b0c0e" stroke-width="0.35"/>
    <rect x="9.6" y="20" width="1" height="47" fill="#000" opacity=".35"/></g>`;
  // monitor
  s += `<g data-part="monitor" class="pt"><rect x="11.1" y="19.6" width="76.1" height="49.5" rx="2" fill="#141517" stroke="#08090a" stroke-width="0.35"/>
    <rect x="12" y="20.5" width="74.6" height="48.2" rx="1.2" fill="url(#cam-glass)"/>
    ${o.screen ? `<rect data-slot="lcd" x="18.1" y="22.5" width="66.3" height="44.2" fill="#000"/>` : `<rect x="18.1" y="22.5" width="66.3" height="44.2" fill="#050608" stroke="#15171b" stroke-width="0.2"/>`}
    <rect x="12" y="20.5" width="74.6" height="48.2" rx="1.2" fill="url(#cam-lcdGlare)" pointer-events="none"/></g>`;
  // EVF: rubber eyecup, window, eye sensor, diopter
  s += `<g data-part="evf" class="pt"><rect x="-0.5" y="0.2" width="28.6" height="16.6" rx="3" fill="#141518" stroke="#060607" stroke-width="0.35"/>
    <rect x="0.6" y="1.2" width="26.4" height="14.6" rx="2.2" fill="none" stroke="#2a2c31" stroke-width="0.35"/>
    <rect x="7.4" y="3.9" width="13.9" height="9.7" rx="1.3" fill="url(#cam-glass)" stroke="#000" stroke-width="0.3"/>
    <rect x="8.2" y="4.6" width="5" height="2.2" rx="1" fill="#fff" opacity=".05"/></g>`;
  s += `<g data-part="eye-sensor" class="pt"><rect x="24.7" y="5.6" width="2.6" height="6.5" rx="1.3" fill="#060607" stroke="#2c2e33" stroke-width="0.2"/><circle cx="26" cy="9.9" r="0.45" fill="#8c3a6e"/></g>`;
  s += `<g data-part="diopter" class="pt"><circle cx="34.5" cy="11" r="3.6" fill="url(#cam-disc)" stroke="#08090a" stroke-width="0.3"/>${ticksRing(34.5, 11, 2.3, 3.5, 30, '#0c0d0f', 0.3)}<circle cx="34.5" cy="11" r="2.1" fill="#26282c"/></g>`;
  // MENU, C1, rear dial L
  s += `<g data-part="menu" class="pt"><rect x="60.2" y="6.65" width="10.2" height="3.5" rx="1.75" fill="url(#cam-btn)" stroke="#08090a" stroke-width="0.3"/>${T(65.3, 8.42, 'MENU', 2.1, 6.6)}</g>`;
  s += `<g data-part="c1" class="pt">${btn(78.3, 8.4, 2.9)}${T(78.3, 8.45, 'C1', 2.2, 2.9)}</g>`;
  s += `<g data-part="rear-dial-l" class="pt"><rect x="87.9" y="5.9" width="16.4" height="5" rx="2" fill="#0d0e10"/>${edgeDial(88.7, 6.7, 14.7, 3.4, 0.62)}</g>`;
  // icons beside AF-ON / Fn
  s += `<g stroke="#d9d9d9" stroke-width="0.32" fill="none"><circle cx="90.4" cy="15" r="0.95"/><line x1="91.1" y1="15.7" x2="91.9" y2="16.5"/><line x1="89.9" x2="90.9" y1="15" y2="15"/><line x1="90.4" x2="90.4" y1="14.5" y2="15.5"/>
    <path d="M90.2 26.4 h1.5 v2.2 h-1.5 M89.2 27.5 h1.6 m-0.6 -0.6 l0.6 0.6 l-0.6 0.6"/></g>`;
  s += `<g data-part="af-on" class="pt">${btn(96.1, 20.1, 4.1)}${T(96.1, 20.15, 'AF-ON', 1.9, 5.4)}</g>`;
  s += `<g data-part="fn" class="pt">${btn(95.9, 32, 2.8)}${T(95.9, 32.05, 'Fn', 2.2, 2.6)}</g>`;
  // control wheel
  s += `<circle cx="103.3" cy="47" r="10.8" fill="#121315" stroke="#08090a" stroke-width="0.3"/>`;
  s += `<g data-part="control-wheel" class="pt"><circle cx="103.3" cy="47" r="9.35" fill="url(#cam-disc)" stroke="#060607" stroke-width="0.3"/>
    ${ticksRing(103.3, 47, 6.4, 9.1, 48, '#0c0d0f', 0.32)}<circle cx="103.3" cy="47" r="6.1" fill="#1f2124" stroke="#0a0a0b" stroke-width="0.25"/></g>`;
  const wedge = (id, a0, a1) => {
    const [x0, y0] = pol(103.3, 47, 4.2, a0), [x1, y1] = pol(103.3, 47, 9.35, a0), [x2, y2] = pol(103.3, 47, 9.35, a1), [x3, y3] = pol(103.3, 47, 4.2, a1);
    return `<path data-part="${id}" class="pt cam-hit" d="M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)} A9.35 9.35 0 0 1 ${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} A4.2 4.2 0 0 0 ${f(x0)} ${f(y0)} Z"/>`;
  };
  s += wedge('wheel-disp', 225, 315) + wedge('wheel-iso', -45, 45) + wedge('wheel-index', 45, 135) + wedge('wheel-drive', 135, 225);
  s += `<g data-part="wheel-center" class="pt">${btn(103.3, 47, 3.9)}</g>`;
  s += T(103.3, 35.1, 'DISP', 2.1, 4.8) + T(115.8, 47, 'ISO', 2.2, 3.4) + T(113.3, 57.2, 'C2', 2.1, 2.7);
  // drive / self-timer icons (left of wheel), index icon (below)
  s += `<g stroke="#d9d9d9" stroke-width="0.3" fill="none"><circle cx="90.5" cy="45.6" r="1.05"/><path d="M90.5 44.9 v0.75 l0.5 0.35 M90 44.2 h1"/>
    <rect x="89.4" y="49.2" width="1.8" height="1.3"/><path d="M89.8 48.8 h1.8 v1.3"/>
    <rect x="103.6" y="58.7" width="0.65" height="0.65" fill="#d9d9d9"/><rect x="104.5" y="59.6" width="0.65" height="0.65" fill="#d9d9d9"/><rect x="104.5" y="58.7" width="0.65" height="0.65"/><rect x="103.6" y="59.6" width="0.65" height="0.65"/></g>`;
  s += `<g data-part="playback" class="pt">${btn(98.7, 62.8, 2.8)}<rect x="97.5" y="61.9" width="2.4" height="1.8" rx="0.2" fill="none" stroke="#e5e5e5" stroke-width="0.3"/><path d="M98.4 62.3 L99.3 62.8 L98.4 63.3 Z" fill="#e5e5e5"/></g>`;
  s += `<g data-part="c2" class="pt">${btn(110.1, 62.3, 2.8)}<path d="M109.1 61.4 h2 M109.9 61.4 v-0.3 h0.4 v0.3 M109.3 61.7 l0.2 1.8 h1.2 l0.2 -1.8 M109.8 61.9 v1.3 M110.4 61.9 v1.3" stroke="#e5e5e5" stroke-width="0.25" fill="none"/></g>`;
  // strap lug (left side)
  s += `<path d="M-0.2 9.6 h-1.6 a1.6 1.6 0 0 0 0 3.2 h1.6" fill="none" stroke="url(#cam-chrome)" stroke-width="0.8"/>`;
  return s;
}

/* ------------------------------------------------------------------ top */
function topView(o) {
  let s = '';
  const mode = o.mode || 'A', sq = o.sq || 'still';
  // things behind the rear face: monitor back, EVF eyecup, thumb rest, rear dial L edge
  s += `<rect x="11.1" y="54" width="76.1" height="4.4" rx="1" fill="#141517" stroke="#08090a" stroke-width="0.3"/>
    <rect x="-0.5" y="54" width="28.6" height="9.4" rx="2.4" fill="#141518" stroke="#060607" stroke-width="0.35"/>
    <rect x="104.3" y="54" width="19.7" height="3" rx="1.2" fill="#1d1e21" stroke="#0b0c0e" stroke-width="0.25"/>`;
  s += edgeDial(88.7, 54.2, 14.7, 2.4, 0.62);
  // lens mount flange peeking out in front of the body
  s += `<rect x="21.5" y="13" width="58.6" height="2.4" rx="0.6" fill="#141517" stroke="#08090a" stroke-width="0.25"/><rect x="22.4" y="12.4" width="56.8" height="1" fill="#c8551f"/>`;
  // body + grip outline (top view)
  s += `<path d="M3.2 15 H89.2 Q91 15 91.6 12.2 Q93.4 0.4 102.5 0 H118.6 Q124 0.6 124 6.4 V51.6 Q124 55 120.6 55 H3.4 Q0 55 0 51.6 V18.4 Q0 15 3.2 15 Z"
      fill="url(#cam-plate)" stroke="#0b0c0e" stroke-width="0.35"/>
    <path d="M3.2 15.5 H89" stroke="#fff" stroke-opacity=".08" stroke-width="0.5"/>`;
  // front dial edge, under the shutter at the grip front
  s += `<g data-part="front-dial" class="pt">${edgeDial(102, 0.5, 16, 1.6, 0.6)}</g>`;
  // speaker, sensor mark, label, mode index
  s += `<g data-part="speaker" class="pt"><rect x="17" y="26.8" width="2.1" height="1" rx="0.5" fill="#060607"/><rect x="19.6" y="26.8" width="2.1" height="1" rx="0.5" fill="#060607"/><rect x="15.6" y="25.4" width="7.4" height="3.8" fill="transparent"/></g>`;
  s += `<g data-part="sensor-mark" class="pt"><circle cx="35" cy="30.6" r="1.1" fill="none" stroke="#e9e9e9" stroke-width="0.3"/><line x1="32.6" x2="37.4" y1="30.6" y2="30.6" stroke="#e9e9e9" stroke-width="0.3"/><rect x="32.4" y="29" width="5.2" height="3.2" fill="transparent"/></g>`;
  s += `<g data-part="top-label" class="pt">${T(10.6, 42.5, 'α7C II', 2.6, 10.4, 'font-style="italic"')}</g>`;
  s += `<rect x="73.6" y="32.75" width="2.4" height="0.5" fill="#e9e9e9"/>`;   // mode dial index (left of dial)
  // hot shoe
  s += `<g data-part="shoe" class="pt"><rect x="40.5" y="32" width="22" height="22" rx="0.8" fill="#121315" stroke="#060607" stroke-width="0.3"/>
    <rect x="42" y="33.5" width="19" height="19.2" rx="0.5" fill="#1d1e21"/><rect x="43.3" y="34.6" width="16.4" height="16.4" rx="0.6" fill="#2c2e33" stroke="#3a3d43" stroke-width="0.2"/>
    <line x1="47" x2="56" y1="47.8" y2="47.8" stroke="#55585e" stroke-width="0.3"/></g>`;
  // Still/Movie/S&Q ring under the mode dial: icons printed on the plate + ring with tab
  const [lx1, ly1] = pol(88.3, 33, 15.6, SQ_ANGLES.sq), [lx2, ly2] = pol(88.3, 33, 15.6, SQ_ANGLES.movie), [lx3, ly3] = pol(88.3, 33, 15.6, SQ_ANGLES.still);
  s += T(lx1, ly1, 'S&amp;Q', 1.9, 3.6);
  s += `<g fill="#e9e9e9"><path d="M${f(lx2 - 1)} ${f(ly2 - 0.55)} h1.25 v1.1 h-1.25 Z M${f(lx2 + 0.3)} ${f(ly2)} l0.75 -0.5 v1 Z"/>
    <path d="M${f(lx3 - 0.9)} ${f(ly3 - 0.35)} h0.45 l0.25 -0.3 h0.5 l0.25 0.3 h0.35 v1.1 h-1.8 Z"/></g>`;
  const notch = SQ_ANGLES[sq] ?? 70, tab = notch - 92;
  const [tx, ty] = pol(88.3, 33, 13.2, tab), [nx, ny] = pol(88.3, 33, 12.2, notch);
  s += `<g data-part="sq-dial" class="pt"><circle cx="88.3" cy="33" r="12.4" fill="#141517" stroke="#08090a" stroke-width="0.3"/>
    <rect x="${f(tx - 1.6)}" y="${f(ty - 1.2)}" width="3.2" height="2.4" rx="0.5" fill="url(#cam-btn)" stroke="#08090a" stroke-width="0.25" transform="rotate(${f(tab)} ${f(tx)} ${f(ty)})"/>
    <circle cx="${f(nx)}" cy="${f(ny)}" r="0.32" fill="#e9e9e9"/></g>`;
  // mode dial (rotates so the chosen position faces the index on the left)
  const rot = 180 - (MODE_ANGLES[mode] ?? 180);
  let marks = '';
  // letters are printed so the one at the index (9 o'clock) reads upright from behind the camera
  for (const [k, a] of Object.entries(MODE_ANGLES)) {
    const num = /\d/.test(k), [x, y] = pol(88.3, 33, k === 'AUTO' ? 6.3 : num ? 6.6 : 6.9, a);
    if (k === 'AUTO') marks += `<g transform="rotate(${f(a + 180)} ${f(x)} ${f(y)})"><rect x="${f(x - 2.4)}" y="${f(y - 0.95)}" width="4.8" height="1.9" rx="0.3" fill="#1aa7a1"/>${T(x, y + 0.02, 'AUTO', 1.5, 3.9, 'style="fill:#fff"')}</g>`;
    else marks += `<g transform="rotate(${f(a + 180)} ${f(x)} ${f(y)})">${T(x, y, k, num ? 2.5 : 2.9, num ? 1.4 : 2.2)}</g>`;
  }
  // memory-recall bracket around 1·2·3
  const [bx0, by0] = pol(88.3, 33, 8.6, 284), [bx1, by1] = pol(88.3, 33, 8.6, 416), [ix0, iy0] = pol(88.3, 33, 5.0, 284), [ix1, iy1] = pol(88.3, 33, 5.0, 416);
  marks += `<path d="M${f(ix0)} ${f(iy0)} L${f(bx0)} ${f(by0)} A8.6 8.6 0 0 1 ${f(bx1)} ${f(by1)} L${f(ix1)} ${f(iy1)}" fill="none" stroke="#e9e9e9" stroke-width="0.3" stroke-linejoin="round"/>`;
  s += `<g data-part="mode-dial" class="pt"><g transform="rotate(${f(rot)} 88.3 33)">${topDial(88.3, 33, 11, 80)}${marks}</g></g>`;
  // movie button
  s += `<g data-part="movie" class="pt"><circle cx="113.3" cy="25" r="3.4" fill="#141517" stroke="#08090a" stroke-width="0.3"/><circle cx="113.3" cy="25" r="2.5" fill="none" stroke="#e0302a" stroke-width="0.7"/><circle cx="113.3" cy="25" r="1.8" fill="url(#cam-btn)"/></g>`;
  // shutter + ON/OFF collar
  const on = o.power !== 'off';
  const [lvx, lvy] = pol(105.8, 8, 8.4, on ? 25 : -5);
  s += `<g data-part="power" class="pt"><circle cx="105.8" cy="8" r="8.2" fill="#18191c" stroke="#08090a" stroke-width="0.3"/>${ticksRing(105.8, 8, 7.2, 8.1, 60, '#0b0c0e', 0.25)}
    <circle cx="${f(lvx)}" cy="${f(lvy)}" r="1.1" fill="#24262a" stroke="#08090a" stroke-width="0.25"/>
    ${T(118.6, 6.3, 'OFF', 2, 3.6)}${T(117.9, 11.6, 'ON', 2, 2.6)}<circle cx="114.4" cy="${on ? 10.6 : 6.6}" r="0.32" fill="#e9e9e9"/></g>`;
  s += `<g data-part="shutter" class="pt"><circle cx="105.8" cy="8" r="5.5" fill="url(#cam-shutter)" stroke="#060607" stroke-width="0.3"/>${lathe(105.8, 8, 5.3, 10, 0.09)}<circle cx="104.6" cy="6.7" r="1.4" fill="#fff" opacity=".1"/></g>`;
  // rear dial R (corner)
  s += `<g data-part="rear-dial-r" class="pt">${topDial(116.4, 46.5, 7.6, 60)}</g>`;
  // strap lugs
  s += `<path d="M0 29 h-1.8 a1.4 1.4 0 0 0 0 2.8 h1.8 M124 29 h1.8 a1.4 1.4 0 0 1 0 2.8 h-1.8" fill="none" stroke="url(#cam-chrome)" stroke-width="0.8"/>`;
  return s;
}

/* ------------------------------------------------------------------ front */
function front(o) {
  let s = '';
  // top protrusions: shoe, mode dial, rear dial R (behind shutter)
  s += `<rect x="64.6" y="-1.6" width="16.4" height="2" rx="0.4" fill="#151618" stroke="#08090a" stroke-width="0.25"/>`;
  s += edgeDial(30.1, -2.5, 20.3, 3.2, 0.7);
  s += edgeDial(8.9, -0.9, 15.6, 2.2, 0.6);
  // body
  s += `<path d="M8.8 0.6 Q9.6 0 11 0 H121.4 Q124.9 0 124.9 3.6 V66.6 Q124.9 70.8 120.7 70.8 H4.4 Q-0.4 70.8 -0.4 66 V10.8 Q-0.4 5.2 4.2 3.4 Q8.2 2 8.8 0.6 Z"
      fill="url(#cam-body)" stroke="#0b0c0e" stroke-width="0.35"/><path d="M11 0.45 H121" stroke="#fff" stroke-opacity=".1" stroke-width="0.5"/>`;
  // grip (textured) with front dial recess
  s += `<g data-part="grip" class="pt"><path d="M-0.4 12 Q-0.4 8 3.4 7.6 L30.5 7.6 Q34.6 7.8 34.6 12 V70.8 H4.4 Q-0.4 70.8 -0.4 66 Z" fill="url(#cam-peb)" stroke="#0b0c0e" stroke-width="0.3"/>
    <path d="M34.6 9 V70.6" stroke="#000" stroke-opacity=".5" stroke-width="0.4"/></g>`;
  s += `<g data-part="front-dial" class="pt"><rect x="5.1" y="12.9" width="17.8" height="4.6" rx="1.6" fill="#08090a"/>${edgeDial(5.9, 13.5, 16.2, 3.4, 0.55)}</g>`;
  // shutter + collar seen from the front
  s += `<g data-part="shutter-front" class="pt"><path d="M8.2 6.6 Q8.4 1.6 16.8 1.4 Q25.2 1.6 25.4 6.6 Z" fill="#17181b" stroke="#08090a" stroke-width="0.3"/>
    <path d="M11 2.6 Q11.4 -0.6 16.8 -0.8 Q22.2 -0.6 22.6 2.6 Z" fill="url(#cam-shutter)" stroke="#08090a" stroke-width="0.25"/></g>`;
  s += T(4.8, 5.4, 'OFF', 1.7, 3.1, 'transform="rotate(-18 4.8 5.4)"');
  // logo, AF illuminator, mics
  s += `<text x="45" y="9.1" class="cam-logo" font-size="4.1" textLength="18.7" lengthAdjust="spacingAndGlyphs" text-anchor="middle" dominant-baseline="central">SONY</text>`;
  s += `<g data-part="af-illuminator" class="pt"><circle cx="36.6" cy="16.1" r="1.3" fill="#2d2a28" stroke="#08090a" stroke-width="0.25"/><circle cx="36.3" cy="15.8" r="0.5" fill="#e8dcc8" opacity=".55"/></g>`;
  s += `<g data-part="mic" class="pt"><rect x="57.2" y="4.1" width="2.8" height="1.1" rx="0.55" fill="#060607"/><rect x="87.6" y="5.2" width="2.8" height="1.1" rx="0.55" fill="#060607"/><rect x="55.6" y="2.6" width="6" height="4" fill="transparent"/></g>`;
  // mount
  const cx = 73.2, cy = 35.9;
  let screws = '';
  for (const a of [-135, -43, 47, 136]) { const [x, y] = pol(cx, cy, 26.1, a); screws += `<circle cx="${f(x)}" cy="${f(y)}" r="0.95" fill="url(#cam-chrome)" stroke="#555" stroke-width="0.15"/><path d="M${f(x - 0.55)} ${f(y)} h1.1 M${f(x)} ${f(y - 0.55)} v1.1" stroke="#444" stroke-width="0.15"/>`; }
  let lugs = '';
  for (const a of [-60, 60, 180]) {
    const [x0, y0] = pol(cx, cy, 23.1, a - 24), [x1, y1] = pol(cx, cy, 23.1, a + 24), [x2, y2] = pol(cx, cy, 21.4, a + 22), [x3, y3] = pol(cx, cy, 21.4, a - 22);
    lugs += `<path d="M${f(x0)} ${f(y0)} A23.1 23.1 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A21.4 21.4 0 0 0 ${f(x3)} ${f(y3)} Z" fill="#9da2a9" stroke="#5c6066" stroke-width="0.15"/>`;
  }
  let pins = '';
  for (let i = 0; i < 10; i++) { const [x, y] = pol(cx, cy, 19.2, 63 + i * 6); pins += `<circle cx="${f(x)}" cy="${f(y)}" r="0.42" fill="#d6b45a"/>`; }
  s += `<g data-part="mount" class="pt"><circle cx="${cx}" cy="${cy}" r="29.6" fill="#141517" stroke="#c8551f" stroke-width="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="27.9" fill="url(#cam-chrome)" stroke="#6d7177" stroke-width="0.2"/>${screws}
    <circle cx="${cx}" cy="${cy}" r="23.1" fill="#0b0c0e" stroke="#2d3034" stroke-width="0.3"/>${lugs}</g>`;
  s += `<clipPath id="cam-throat"><circle cx="${cx}" cy="${cy}" r="22.9"/></clipPath>`;
  s += `<g data-part="sensor" class="pt" clip-path="url(#cam-throat)"><rect x="${cx - 20}" y="${cy - 14}" width="40" height="28" rx="1" fill="#16181b"/>
    <rect x="${f(cx - 18)}" y="${f(cy - 12)}" width="36" height="24" fill="url(#cam-sensor)" stroke="#3a4a4a" stroke-width="0.25"/>
    <path d="M${f(cx - 16)} ${f(cy - 10)} L${f(cx - 6)} ${f(cy - 10)} L${f(cx - 14)} ${f(cy + 2)} Z" fill="#fff" opacity=".05"/></g>`;
  s += `<g data-part="lens-contacts" class="pt"><path d="M${f(pol(cx, cy, 20.6, 60)[0])} ${f(pol(cx, cy, 20.6, 60)[1])} A20.6 20.6 0 0 1 ${f(pol(cx, cy, 20.6, 120)[0])} ${f(pol(cx, cy, 20.6, 120)[1])} L${f(pol(cx, cy, 17.8, 120)[0])} ${f(pol(cx, cy, 17.8, 120)[1])} A17.8 17.8 0 0 0 ${f(pol(cx, cy, 17.8, 60)[0])} ${f(pol(cx, cy, 17.8, 60)[1])} Z" fill="#1c1d20"/>${pins}</g>`;
  s += `<g data-part="mount-index" class="pt"><circle cx="89.7" cy="16.2" r="0.9" fill="#f4f4f4" stroke="#999" stroke-width="0.12"/></g>`;
  s += `<g data-part="lens-release" class="pt"><ellipse cx="44.4" cy="51.1" rx="2" ry="2.6" fill="url(#cam-btn)" stroke="#060607" stroke-width="0.3"/></g>`;
  // α logo and model badge
  s += `<text x="109.8" y="10.1" class="cam-logo" font-size="7.2" font-style="italic" text-anchor="middle" dominant-baseline="central" style="fill:#c9ccd1">α</text>`;
  s += `<g data-part="front-badge" class="pt"><rect x="104.2" y="14.7" width="10.1" height="4.2" rx="0.5" fill="#101113" stroke="#7d8188" stroke-width="0.22"/>${T(109.25, 16.82, '7C', 2.9, 4.6)}</g>`;
  s += `<g data-part="strap-lug" class="pt"><path d="M124.9 4.2 h1.6 a2.2 2.2 0 0 1 0 4.4 h-1.6" fill="none" stroke="url(#cam-chrome)" stroke-width="0.9"/></g>`;
  return s;
}

/* ------------------------------------------------------------------ side (left side: ports, lens to the left) */
function side() {
  // x: 0 = body front face, 40.5 = rear face; y: 0 = top plate, 71.1 = bottom
  let s = '';
  s += `<path d="M0 10 L-17.5 10 Q-19.5 10 -19.5 14 V68.4 Q-19.5 71.1 -16.8 71.1 H0 Z" fill="url(#cam-peb)" stroke="#0b0c0e" stroke-width="0.3"/><path d="M0 10 L-17.5 10 Q-19.5 10 -19.5 14 V68.4 Q-19.5 71.1 -16.8 71.1 H0 Z" fill="#000" opacity=".35"/>`;     // grip behind
  s += `<rect x="-2.8" y="6.3" width="2.9" height="59.2" rx="0.6" fill="url(#cam-chrome)" stroke="#6d7177" stroke-width="0.2"/><rect x="-0.4" y="6.3" width="0.6" height="59.2" fill="#c8551f"/>`;
  s += `<rect x="12" y="-5.5" width="22" height="5.8" rx="0.6" fill="#151618" stroke="#08090a" stroke-width="0.25"/>`;                       // shoe silhouette
  s += `<path d="M2 0 H38.5 Q40.5 0 40.5 2 V69.1 Q40.5 71.1 38.5 71.1 H2 Q0 71.1 0 69.1 V2 Q0 0 2 0 Z" fill="url(#cam-bodyH)" stroke="#0b0c0e" stroke-width="0.35"/>`;
  s += `<rect x="40.5" y="19.6" width="3.6" height="49.5" rx="0.8" fill="#141517" stroke="#08090a" stroke-width="0.3"/>`;              // monitor
  s += `<rect x="40.5" y="0.2" width="8.6" height="16.6" rx="2.2" fill="#141518" stroke="#060607" stroke-width="0.35"/>`;                // eyecup
  s += `<path d="M18.6 3.2 L21 0.8 L23.4 3.2 Z" fill="none" stroke="url(#cam-chrome)" stroke-width="0.7" stroke-linejoin="round"/><rect x="19.4" y="2.8" width="3.2" height="1.4" rx="0.4" fill="#2a2c30"/>`;                  // strap lug
  // upper hatch: mic + USB-C, charge lamp
  s += `<rect x="7.5" y="15" width="26" height="18" rx="1.6" fill="#101113" stroke="#2a2c30" stroke-width="0.3"/>`;
  s += `<g data-part="mic-jack" class="pt"><circle cx="13.5" cy="21" r="2.1" fill="#1c1d20" stroke="#4a4d53" stroke-width="0.3"/><circle cx="13.5" cy="21" r="1.1" fill="#000"/>
    <rect x="13.05" y="16.6" width="0.9" height="1.5" rx="0.45" fill="none" stroke="#bbb" stroke-width="0.2"/><path d="M12.7 17.6 a0.8 0.8 0 0 0 1.6 0 M13.5 18.4 v0.5" fill="none" stroke="#bbb" stroke-width="0.2"/></g>`;
  s += `<g data-part="usb-c" class="pt"><rect x="18.8" y="26.5" width="8.4" height="2.6" rx="1.3" fill="#1c1d20" stroke="#4a4d53" stroke-width="0.3"/><rect x="20" y="27.4" width="6" height="0.8" rx="0.4" fill="#000"/></g>`;
  s += `<g data-part="charge-lamp" class="pt"><circle cx="29.5" cy="20.5" r="0.75" fill="#f08a2a"/></g>`;
  // card door
  s += `<rect x="6" y="36" width="29" height="15.5" rx="1.6" fill="#101113" stroke="#2a2c30" stroke-width="0.3"/>`;
  s += `<g data-part="card-slot" class="pt"><rect x="8.5" y="43.6" width="23" height="1.8" rx="0.4" fill="#000" stroke="#3a3d43" stroke-width="0.2"/><rect x="10" y="40.5" width="10" height="2.2" fill="transparent"/>${T(15, 48.4, 'SD', 1.8, 2.6, 'style="fill:#9a9da3"')}</g>`;
  s += `<g data-part="access-lamp" class="pt"><circle cx="29.5" cy="39.6" r="0.75" fill="#e04030"/></g>`;
  // lower hatch: headphones + HDMI micro
  s += `<rect x="9.5" y="55.5" width="23" height="10" rx="1.6" fill="#101113" stroke="#2a2c30" stroke-width="0.3"/>`;
  s += `<g data-part="headphone-jack" class="pt"><circle cx="15.5" cy="60.5" r="2.1" fill="#1c1d20" stroke="#4a4d53" stroke-width="0.3"/><circle cx="15.5" cy="60.5" r="1.1" fill="#000"/>
    <path d="M14.4 57.8 a1.1 1.1 0 0 1 2.2 0 M14.3 57.7 v0.6 M16.7 57.7 v0.6" fill="none" stroke="#bbb" stroke-width="0.2"/></g>`;
  s += `<g data-part="hdmi" class="pt"><path d="M23.4 59.3 h6.2 v1.6 l-0.6 0.8 h-5 l-0.6 -0.8 Z" fill="#1c1d20" stroke="#4a4d53" stroke-width="0.3"/><rect x="24.4" y="59.9" width="4.2" height="0.7" fill="#000"/></g>`;
  return s;
}

/* ------------------------------------------------------------------ bottom (front up, grip left) */
function bottom() {
  let s = '';
  s += `<rect x="36.8" y="54" width="76.1" height="4.4" rx="1" fill="#141517" stroke="#08090a" stroke-width="0.3"/>
    <rect x="95.9" y="54" width="28.6" height="9.4" rx="2.4" fill="#141518" stroke="#060607" stroke-width="0.35"/>`;
  s += `<rect x="43.9" y="13" width="58.6" height="2.4" rx="0.6" fill="#141517" stroke="#08090a" stroke-width="0.25"/><rect x="44.8" y="12.4" width="56.8" height="1" fill="#c8551f"/>`;
  s += `<path d="M120.8 15 H34.8 Q33 15 32.4 12.2 Q30.6 0.4 21.5 0 H5.4 Q0 0.6 0 6.4 V51.6 Q0 55 3.4 55 H120.6 Q124 55 124 51.6 V18.4 Q124 15 120.8 15 Z"
      fill="url(#cam-plate)" stroke="#0b0c0e" stroke-width="0.35"/>`;
  s += `<g data-part="battery" class="pt"><rect x="3" y="7" width="29" height="44" rx="2.4" fill="#1c1d20" stroke="#0b0c0e" stroke-width="0.35"/>
    <rect x="4.2" y="8.2" width="26.6" height="41.6" rx="1.8" fill="none" stroke="#2c2e33" stroke-width="0.25"/>
    <rect x="13.5" y="44" width="8" height="3.2" rx="0.8" fill="url(#cam-btn)" stroke="#08090a" stroke-width="0.25"/>
    <path d="M19.5 45.6 l1.2 0 m-0.5 -0.5 l0.5 0.5 l-0.5 0.5" stroke="#e9e9e9" stroke-width="0.25" fill="none"/>${T(17.5, 40.6, 'OPEN', 1.8, 4.6)}</g>`;
  s += `<g data-part="tripod-socket" class="pt"><circle cx="73.2" cy="33.5" r="4.4" fill="#121315" stroke="#2c2e33" stroke-width="0.3"/>
    <circle cx="73.2" cy="33.5" r="3.2" fill="#2a2c30" stroke="#8c9097" stroke-width="0.35"/>${ticksRing(73.2, 33.5, 1.6, 3.0, 18, '#4f5359', 0.22)}<circle cx="73.2" cy="33.5" r="1.5" fill="#050505"/></g>`;
  s += `<rect x="86" y="23" width="32" height="20" rx="1" fill="none" stroke="#2c2e33" stroke-width="0.25"/>${T(102, 33, 'ILCE-7CM2', 2.1, 14)}`;
  return s;
}

/** SVG string for a view. opts: { mode, sq, screen, hl:[ids], pressed:[ids], power } */
export function bodySVG(view, opts = {}) {
  const vb = VIEWBOX[view];
  if (!vb) return '';
  let inner = { rear, top: topView, front, side, bottom }[view](opts);
  const hl = new Set(opts.hl || []), pr = new Set(opts.pressed || []);
  if (hl.size || pr.size) {
    inner = inner.replace(/data-part="([^"]+)" class="pt([^"]*)"/g, (m, id, rest) =>
      `data-part="${id}" class="pt${rest}${hl.has(id) ? ' hl' : ''}${pr.has(id) ? ' pressed' : ''}"`);
  }
  return `<svg class="cam-svg cam-${view}" viewBox="${vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sony α7C II — ${view}">${defs()}${inner}</svg>`;
}
