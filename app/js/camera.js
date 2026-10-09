// Sony α7C II + FE 24-50mm F2.8 G: camera behaviour model.
import { LSAT, SENSOR } from './engine.js';

export const SHUTTERS = [30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3.2, 2.5, 2, 1.6, 1.3, 1, 0.8, 0.6, 0.5, 0.4, 0.3,
  1 / 4, 1 / 5, 1 / 6, 1 / 8, 1 / 10, 1 / 13, 1 / 15, 1 / 20, 1 / 25, 1 / 30, 1 / 40, 1 / 50, 1 / 60, 1 / 80, 1 / 100,
  1 / 125, 1 / 160, 1 / 200, 1 / 250, 1 / 320, 1 / 400, 1 / 500, 1 / 640, 1 / 800, 1 / 1000, 1 / 1250, 1 / 1600,
  1 / 2000, 1 / 2500, 1 / 3200, 1 / 4000];
export const APERTURES = [2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
export const ISOS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200,
  4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200, 64000, 80000, 102400, 128000, 160000, 204800];
export const ISO_STD = [100, 51200];          // native range; 50 and 64000–204800 are extended (L/H)
export const ISO_AUTO_RANGE = [100, 12800];   // default ISO AUTO min/max
export const FOCALS = [24, 28, 35, 40, 50];

export const LENS = {
  name: 'FE 24-50mm F2.8 G', model: 'SEL2450G', fMin: 24, fMax: 50, nMin: 2.8, nMax: 22, blades: 11,
  mfdAF: f => 0.19 + (0.30 - 0.19) * (f - 24) / 26,   // metres, from the sensor plane
  mfdMF: f => 0.18 + (0.29 - 0.18) * (f - 24) / 26,
  filter: 67, weight: 440,
};

export const MODES = ['AUTO', 'P', 'A', 'S', 'M'];

export const WB_PRESETS = [
  { id: 'AWB', label: 'AWB', name: 'Auto', k: null },
  { id: 'Daylight', label: '☀', name: 'Daylight', k: 5500 },
  { id: 'Shade', label: 'Shade', name: 'Shade', k: 7500 },
  { id: 'Cloudy', label: 'Cloudy', name: 'Cloudy', k: 6500 },
  { id: 'Incandescent', label: 'Incand.', name: 'Incandescent', k: 3200 },
  { id: 'FluorWarm', label: 'Fl -1', name: 'Fluor.: Warm White', k: 2900, tint: 0.02 },
  { id: 'FluorCool', label: 'Fl 0', name: 'Fluor.: Cool White', k: 4000, tint: 0.03 },
  { id: 'FluorDay', label: 'Fl +1', name: 'Fluor.: Day White', k: 5000, tint: 0.02 },
  { id: 'FluorDaylight', label: 'Fl +2', name: 'Fluor.: Daylight', k: 6500, tint: 0.02 },
  { id: 'Flash', label: 'Flash', name: 'Flash', k: 5500 },
  { id: 'CTemp', label: 'K', name: 'C.Temp./Filter', k: 'manual' },
];

// Creative Look presets (names and intent from the Help Guide; parameters are our approximation)
export const LOOKS = {
  ST: { name: 'Standard', contrast: 0, sat: 0, fade: 0, bright: 0, hi: 0, sh: 0, tint: [1, 1, 1], shadowTint: [1, 1, 1] },
  PT: { name: 'Portrait', contrast: -0.12, sat: -0.08, fade: 0, bright: 0.08, hi: -0.2, sh: 0.15, tint: [1.02, 1.0, 0.98], shadowTint: [1, 1, 1] },
  NT: { name: 'Neutral', contrast: -0.22, sat: -0.3, fade: 0, bright: 0, hi: -0.2, sh: 0.2, tint: [1, 1, 1], shadowTint: [1, 1, 1] },
  VV: { name: 'Vivid', contrast: 0.18, sat: 0.38, fade: 0, bright: 0, hi: 0, sh: -0.1, tint: [1, 1, 1], shadowTint: [1, 1, 1] },
  VV2: { name: 'Vivid 2', contrast: 0.12, sat: 0.3, fade: 0, bright: 0.1, hi: -0.3, sh: 0.25, tint: [1, 1, 1], shadowTint: [1, 1, 1] },
  FL: { name: 'Film', contrast: 0.22, sat: -0.12, fade: 0.06, bright: 0, hi: -0.1, sh: 0, tint: [1.0, 1.01, 0.97], shadowTint: [0.9, 1.0, 1.08] },
  IN: { name: 'Instant', contrast: -0.28, sat: -0.25, fade: 0.14, bright: 0.05, hi: -0.2, sh: 0.1, tint: [1.04, 1.0, 0.94], shadowTint: [1, 1, 1] },
  SH: { name: 'Soft Highkey', contrast: -0.2, sat: 0.12, fade: 0.04, bright: 0.45, hi: -0.35, sh: 0.2, tint: [0.99, 1.0, 1.03], shadowTint: [1, 1, 1] },
  BW: { name: 'Black & White', contrast: 0.12, sat: 0, fade: 0, bright: 0, hi: 0, sh: 0, tint: [1, 1, 1], shadowTint: [1, 1, 1], mono: true },
  SE: { name: 'Sepia', contrast: 0.05, sat: 0, fade: 0.05, bright: 0, hi: 0, sh: 0, tint: [1, 1, 1], shadowTint: [1, 1, 1], mono: true, sepia: true },
};

export const METERING = [
  { id: 'multi', label: 'Multi', he: 'מדידה רב-אזורית' },
  { id: 'center', label: 'Center', he: 'משוקללת מרכז' },
  { id: 'spot', label: 'Spot', he: 'נקודתית' },
  { id: 'average', label: 'Entire Screen Avg.', he: 'ממוצע כל המסך' },
  { id: 'highlight', label: 'Highlight', he: 'הדגשת אזורים בהירים' },
];
export const FOCUS_MODES = [
  { id: 'AF-S', label: 'AF-S', name: 'Single-shot AF' },
  { id: 'AF-A', label: 'AF-A', name: 'Automatic AF' },
  { id: 'AF-C', label: 'AF-C', name: 'Continuous AF' },
  { id: 'DMF', label: 'DMF', name: 'DMF' },
  { id: 'MF', label: 'MF', name: 'Manual Focus' },
];
export const FOCUS_AREAS = [
  { id: 'wide', label: 'Wide' }, { id: 'zone', label: 'Zone' }, { id: 'center', label: 'Center Fix' },
  { id: 'spotL', label: 'Spot: L', size: 0.06 }, { id: 'spotM', label: 'Spot: M', size: 0.04 }, { id: 'spotS', label: 'Spot: S', size: 0.022 },
  { id: 'expand', label: 'Expand Spot', size: 0.04 },
];
export const DRO = [{ id: 'off', label: 'OFF', v: 0 }, { id: 'auto', label: 'DRO AUTO', v: 0.35 },
  { id: 'lv1', label: 'Lv1', v: 0.12 }, { id: 'lv2', label: 'Lv2', v: 0.25 }, { id: 'lv3', label: 'Lv3', v: 0.4 },
  { id: 'lv4', label: 'Lv4', v: 0.55 }, { id: 'lv5', label: 'Lv5', v: 0.75 }];
export const RECOG = [{ id: 'human', label: 'Human' }, { id: 'animal', label: 'Animal/Bird' }, { id: 'off', label: 'Off' }];

export function defaultState() {
  return {
    mode: 'A', focal: 24, ai: 0, si: SHUTTERS.indexOf(1 / 125), iso: 'AUTO', isoManual: 400, ec: 0, shift: 0,
    wb: 'AWB', kelvin: 5500, look: 'ST', dro: 'auto', metering: 'multi',
    focusMode: 'AF-S', focusArea: 'wide', focusPoint: { x: 0.5, y: 0.5 }, recog: 'human',
    lensAFMF: 'AF', apertureRing: 'A', clicks: true,
    mfDist: 3, focusDist: 3, afState: 'idle', afTarget: null,
    steady: true, tripod: false, nd: 0, peaking: true, zebra: false, disp: 0, magnify: 0, histogram: true,
  };
}

const log2 = Math.log2;
const nearestIdx = (arr, v) => arr.reduce((b, x, i) => Math.abs(log2(x / v)) < Math.abs(log2(arr[b] / v)) ? i : b, 0);

export function fmtShutter(t) {
  if (t >= 0.4) return (Math.round(t * 10) / 10).toString().replace(/\.0$/, '') + '"';
  return '1/' + Math.round(1 / t);
}
export const fmtF = n => 'F' + (n >= 10 ? Math.round(n) : n.toFixed(1));
export const fmtEV = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1);

/** frame crop inside the source image, for the current focal length */
export function frameCrop(scene, focal, loupe) {
  const k = scene.srcFocal / focal;          // fraction of the source width visible
  let x0 = 0.5 - k / 2, y0 = 0.5 - k / 2, w = k, h = k;
  if (loupe) { x0 += loupe.x * w - loupe.w * w / 2; y0 += loupe.y * h - loupe.w * h / 2; w *= loupe.w; h *= loupe.w; }
  return [x0, y0, w, h];
}
export const frameToSrc = (scene, focal, p) => { const [x0, y0, w, h] = frameCrop(scene, focal); return { x: x0 + p.x * w, y: y0 + p.y * h }; };

/** metering: returns Δ in stops (how much brighter than mid-grey the metered area reads at the scene anchor) */
export function meter(scene, st, faceBox) {
  const { w: W, h: H, data } = scene.lum;
  const [cx0, cy0, cw, ch] = frameCrop(scene, st.focal);
  const pts = [];
  const sx = Math.max(1, Math.floor(cw * W / 48));
  for (let y = Math.floor(cy0 * H); y < Math.ceil((cy0 + ch) * H); y += sx) {
    for (let x = Math.floor(cx0 * W); x < Math.ceil((cx0 + cw) * W); x += sx) {
      const fx = ((x + 0.5) / W - cx0) / cw, fy = ((y + 0.5) / H - cy0) / ch;
      pts.push({ fx, fy, v: Math.min(data[y * W + x], LSAT * 16) });
    }
  }
  const T = 0.18;
  const wmean = (wf, geo) => {
    let s = 0, ws = 0;
    for (const p of pts) { const w = wf(p); if (w <= 0) continue; s += w * (geo ? Math.log(p.v + 1e-4) : p.v); ws += w; }
    return geo ? Math.exp(s / ws) : s / ws;
  };
  const g = (p, s) => Math.exp(-(((p.fx - 0.5) ** 2) + ((p.fy - 0.5) * 0.67) ** 2) / (2 * s * s));
  switch (st.metering) {
    case 'center': return log2(wmean(p => g(p, 0.22) + 0.15) / (T * 1.6));
    case 'average': return log2(wmean(() => 1) / (T * 1.6));
    case 'spot': {
      const r = 0.035;
      return log2(wmean(p => (Math.hypot(p.fx - 0.5, (p.fy - 0.5) * 0.667) < r ? 1 : 0)) / T || 0);
    }
    case 'highlight': {
      const vs = pts.map(p => p.v).sort((a, b) => a - b);
      const p995 = vs[Math.floor(vs.length * 0.995)];
      const multi = log2(wmean(p => g(p, 0.35) + 0.5, true) / T);
      return Math.min(multi + 3, Math.max(multi, log2(p995 / (LSAT * 0.85))));
    }
    default: {
      const inFace = p => faceBox && p.fx > faceBox[0] && p.fx < faceBox[2] && p.fy > faceBox[1] && p.fy < faceBox[3];
      const base = log2(wmean(p => g(p, 0.35) + 0.5 + (inFace(p) ? 6 : 0), true) / T);
      // multi-segment metering protects large bright areas a little
      const vs = pts.map(p => p.v).sort((a, b) => a - b);
      const p98 = vs[Math.floor(vs.length * 0.98)];
      const protect = Math.max(0, log2(p98 / LSAT) - 1) * 0.25;
      return base + Math.min(protect, 1);
    }
  }
}

/** solve exposure for the current mode. returns {N,t,iso,mm,blink:{t,N,iso}, shifted} */
export function solveExposure(scene, st, delta) {
  const EVreq = scene.ev100 + delta - (st.mode === 'AUTO' ? 0 : st.ec);   // EV100 the camera wants
  const tMinAuto = 1 / Math.min(4000, Math.round(st.focal));             // ISO AUTO Min. SS "Standard" ≈ 1/focal
  const [isoMin, isoMax] = ISO_AUTO_RANGE;
  const autoIso = st.iso === 'AUTO' || st.mode === 'AUTO';
  const res = { blink: {} };
  const ringN = st.apertureRing !== 'A' ? st.apertureRing : null;
  const userN = ringN || APERTURES[st.ai];
  const clampT = t => Math.min(30, Math.max(1 / 4000, t));
  const isoFor = (N, t) => 100 * Math.pow(2, log2(N * N / t) - EVreq);

  if (st.mode === 'M') {
    res.N = userN; res.t = SHUTTERS[st.si];
    if (autoIso) {
      const want = isoFor(res.N, res.t);
      res.iso = ISOS[nearestIdx(ISOS, Math.min(isoMax, Math.max(isoMin, want)))];
      if (want < isoMin * 0.9 || want > isoMax * 1.1) res.blink.iso = true;
    } else res.iso = st.isoManual;
  } else if (st.mode === 'S') {
    res.t = SHUTTERS[st.si];
    let iso = autoIso ? isoMin : st.isoManual;
    let N = Math.sqrt(res.t * Math.pow(2, EVreq + log2(iso / 100)));
    if (N < 2.8 && autoIso) { iso = Math.min(isoMax, iso * (2.8 / N) ** 2); N = Math.sqrt(res.t * Math.pow(2, EVreq + log2(iso / 100))); }
    if (N < 2.8 * 0.95 || N > 22 * 1.05) res.blink.N = true;
    res.N = APERTURES[nearestIdx(APERTURES, Math.min(22, Math.max(2.8, N)))];
    res.iso = ISOS[nearestIdx(ISOS, iso)];
  } else {
    // A, P, AUTO
    let N;
    if (st.mode === 'A') N = userN;
    else {
      const ev = EVreq;   // program line: wide open in dim light, stopping down to about f/8 in sun
      N = 2.8 * Math.pow(2, Math.max(0, Math.min(3, (ev - 10.5) / 2)));
      if (st.mode === 'P' && st.shift) N = N * Math.pow(2, st.shift / 6);
      N = APERTURES[nearestIdx(APERTURES, Math.min(22, Math.max(2.8, N)))];
    }
    let iso = autoIso ? isoMin : st.isoManual;
    let t = N * N / Math.pow(2, EVreq + log2(iso / 100));
    if (autoIso && t > tMinAuto) { iso = Math.min(isoMax, iso * t / tMinAuto); t = N * N / Math.pow(2, EVreq + log2(iso / 100)); }
    if (t > 30 * 1.05 || t < (1 / 4000) * 0.95) res.blink.t = true;
    res.N = N; res.t = SHUTTERS[nearestIdx(SHUTTERS, clampT(t))]; res.iso = ISOS[nearestIdx(ISOS, iso)];
  }
  // metered manual / exposure error vs what the meter wanted
  res.ev = log2(res.N * res.N / res.t);
  res.mm = EVreq - (res.ev - log2(res.iso / 100));            // + = brighter than the meter suggests
  res.expMul = Math.pow(2, scene.ev100 - res.ev) * res.iso / 100;
  return res;
}

/** white balance: scene.kelvin = real light colour, scene.capK = white balance the source file was rendered with */
function kelvinRGB(K) {
  const t = K / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
  const lin = v => { v = Math.min(255, Math.max(1, v)) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return [lin(r), lin(g), lin(b)];
}
export function wbKelvin(scene, st) {
  const p = WB_PRESETS.find(x => x.id === st.wb);
  if (!p || p.k === null || st.mode === 'AUTO') {
    const Ks = scene.kelvin;   // AWB (Standard): neutralises most of the cast, keeps a little warmth under tungsten
    return Ks < 5000 ? Ks + (5200 - Ks) * 0.22 : Ks;
  }
  return p.k === 'manual' ? st.kelvin : p.k;
}
export function wbGains(scene, st) {
  const Kset = wbKelvin(scene, st);
  // the image file is baked at white balance capK; re-balancing to Kset multiplies by wp(capK)/wp(Kset)
  const a = kelvinRGB(scene.capK || scene.kelvin), b = kelvinRGB(Kset);
  let g = [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
  const p = WB_PRESETS.find(x => x.id === st.wb);
  if (p && p.tint && st.mode !== 'AUTO') g[1] *= 1 - p.tint;
  const y = 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2];
  return g.map(v => v / y);
}

/** depth of field for a 0.03 mm circle of confusion */
export function dof(f, N, sM, c = 0.03) {
  const s = sM * 1000, H = f * f / (N * c) + f;
  const near = s * (H - f) / (H + s - 2 * f);
  const far = s < H ? s * (H - f) / (H - s) : Infinity;
  return { near: near / 1000, far: far / 1000, hyper: H / 1000 };
}

/** camera shake blur length in px for a capture */
export function shakePx(st, t, pxPerMM) {
  if (st.tripod) return 0;
  const omega = 0.022 / (st.steady ? Math.pow(2, 5) : 1);   // rad/s; SteadyShot ≈ 5 effective stops
  return st.focal * omega * t * pxPerMM;
}

export function lookFor(st) {
  if (st.mode === 'AUTO') return LOOKS.ST;
  return LOOKS[st.look];
}

export { SENSOR };
