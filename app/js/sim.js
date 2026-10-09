// Camera simulator: one instance = LCD + controls + optional mission. Only one WebGL engine is alive at a time.
import { Engine, LSAT, SENSOR } from './engine.js';
import * as C from './camera.js';
import { Deck } from './deck.js';

export const SCENE_LIST = [
  { id: 'kyoto', he: 'פורטרט ברחוב' }, { id: 'flower', he: 'פרח בתקריב' }, { id: 'meadow', he: 'נוף ופרחים' },
  { id: 'night', he: 'כיכר בלילה' }, { id: 'sunrise', he: 'זריחה מול השמש' }, { id: 'rapids', he: 'מפל ומים זורמים' }, { id: 'dog', he: 'כלב' },
];
const MAG = 6.9;   // Focus Magnifier, full frame (Help Guide: x1.0 / x6.9)

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const range = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(Math.round(v * 100) / 100); return r; };
const nearestIdx = (arr, v) => arr.reduce((b, x, i) => (Math.abs(Math.log2(x / v)) < Math.abs(Math.log2(arr[b] / v)) ? i : b), 0);
const sceneCache = new Map();
let active = null;

const LOCK_KEYS = { mode: ['mode'], N: ['ap'], t: ['sh'], iso: ['iso'], metering: ['metering'], focal: ['zoom'], ec: ['ec'] };

/* ---------------- check DSL ---------------- */
function parseVal(v) {
  v = v.trim();
  if (/^\d+\/\d+$/.test(v)) { const [a, b] = v.split('/').map(Number); return a / b; }
  if (/^-?[\d.]+$/.test(v)) return Number(v);
  return v;
}
export function evalCheck(expr, ctx) {
  const m = expr.match(/^\s*([A-Za-z]+)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
  if (!m) return !!ctx[expr.trim()];
  const [, k, op, raw] = m; const a = ctx[k], b = parseVal(raw);
  if (a === undefined) return false;
  const A = typeof b === 'number' ? Number(a) : String(a), eps = 1e-6;
  switch (op) {
    case '==': return typeof b === 'number' ? Math.abs(A - b) < eps * Math.max(1, b) || Math.abs(A - b) < 1e-3 : A === b;
    case '!=': return A !== b;
    case '<=': return A <= b + eps * Math.max(1, Math.abs(b)) * 50;
    case '>=': return A >= b - eps * Math.max(1, Math.abs(b)) * 50;
    case '<': return A < b; case '>': return A > b;
  }
  return false;
}

export class Sim {
  constructor(host, opts = {}) {
    this.host = host; this.opts = opts;
    this.st = Object.assign(C.defaultState(), opts.state || {});
    this.ui = { fnOpen: false, fnSel: 0, picker: null, toast: null, half: false, review: null, last: null, timer: 0 };
    this.locks = new Set(opts.lock || []);
    this.dirty = true; this.raf = 0;
    this.build();
  }

  /* ---------- DOM: a full-screen camera ---------- */
  build() {
    const o = this.opts, t = o.task;
    const root = el('div', 'sim sim-fs');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'סימולטור המצלמה');
    root.innerHTML = `
      <header class="sim-top">
        <button type="button" class="sim-x" aria-label="סגירת המצלמה">✕</button>
        ${o.scenePicker ? `<button type="button" class="sim-scene" aria-haspopup="dialog"><span class="sc-name"></span><i>▾</i></button>` : `<div class="sim-title"><span class="sc-name"></span></div>`}
        ${t ? `<button type="button" class="sim-pill" aria-haspopup="dialog"><span>משימה</span><span class="dots"></span></button>` : '<span></span>'}
      </header>
      <div class="sim-main">
        <div class="vf">
          <div class="lcd" tabindex="0" aria-label="מסך המצלמה. נגיעה בוחרת נקודת פוקוס">
            <canvas class="view" width="1200" height="800"></canvas><div class="osd"></div>
            <div class="loading">טוען סצנה…<div class="bar"><i></i></div></div>
          </div>
          <div class="lcd-cap"><span class="credit"></span></div>
        </div>
        <div class="sim-panel"><div class="deck-host"></div></div>
      </div>
      ${t ? `<div class="sim-sheet" data-sheet="task" hidden><div class="sh-in">
        <div class="eyebrow">משימה</div><p class="tk-text">${t.text}</p><ol class="checks"></ol>
        ${o.hint ? `<details class="hint"><summary>רמז</summary><p>${o.hint}</p></details>` : ''}
        <button type="button" class="cta sh-go">יאללה, לצלם</button></div></div>` : ''}
      <div class="sim-sheet" data-sheet="acc" hidden><div class="sh-in">
        <div class="eyebrow">אביזרים ותצוגה</div>
        <div class="acc-grid">
          <div class="acc-row"><span>אחיזה</span><div class="sw" data-s="tripod"></div></div>
          <div class="acc-row"><span>SteadyShot (ייצוב בגוף)</span><div class="sw" data-s="steady"></div></div>
          <div class="acc-row"><span>פילטר ND על העדשה (67 מ"מ)</span><div class="sw" data-s="nd"></div></div>
          <div class="acc-row"><span>Peaking (קווי פוקוס)</span><div class="sw" data-s="peak"></div></div>
          <div class="acc-row"><span>Zebra (אזורים שרופים)</span><div class="sw" data-s="zebra"></div></div>
          <div class="acc-row"><span>DISP: היסטוגרמה במסך</span><div class="sw" data-s="disp"></div></div>
        </div>
        <p class="note scene-note"></p>
        <button type="button" class="cta ghost sh-close">סגירה</button></div></div>
      ${o.scenePicker ? `<div class="sim-sheet" data-sheet="scene" hidden><div class="sh-in">
        <div class="eyebrow">בחרו סצנה</div>
        <div class="scene-grid">${SCENE_LIST.map(s => `<button type="button" class="scene-card" data-id="${s.id}" style="background-image:url(scenes/${s.id}/poster.jpg)"><span>${s.he}</span></button>`).join('')}</div>
        <button type="button" class="cta ghost sh-close">סגירה</button></div></div>` : ''}`;
    this.host.innerHTML = ''; this.host.append(root);
    this.root = root;
    this.$ = (s) => root.querySelector(s);
    this.view = this.$('.view');
    this.refreshers = [];
    this.wire();
  }

  openSheet(name) {
    this.root.querySelectorAll('.sim-sheet').forEach(n => { n.hidden = n.dataset.sheet !== name; });
    this.root.classList.toggle('sheet-open', !!name);
    this.markDirty();
  }

  async start(sceneId) {
    if (active && active !== this) active.stop();
    active = this;
    try {
      this.engine = new Engine(this.view);
    } catch (e) { this.fail(e); return; }
    this.sizeCanvas();
    this.ro = new ResizeObserver(() => this.sizeCanvas()); this.ro.observe(this.$('.lcd'));
    await this.loadScene(sceneId || this.opts.scene || 'kyoto');
    if (this.opts.preset) this.applyPreset(this.opts.preset);
    this.deck = new Deck(this.$('.deck-host'), this);
    this.refreshers.push(() => this.deck.refresh());
    if (this.opts.task) this.openSheet('task');
    this.onKey = (e) => {
      if (e.target.closest && e.target.closest('input,textarea,select')) return;
      if (e.key === 'Escape') { if (this.root.classList.contains('sheet-open')) this.openSheet(null); else this.stop(); }
      if (e.code === 'Space' && !e.repeat && !this.root.classList.contains('sheet-open')) { e.preventDefault(); this.hideReview(); this.halfPress(); }
    };
    this.onKeyUp = (e) => { if (e.code === 'Space' && this.ui.half) { e.preventDefault(); this.release(this.st.afState !== 'fail'); } };
    window.addEventListener('keydown', this.onKey); window.addEventListener('keyup', this.onKeyUp);
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.ro) this.ro.disconnect();
    if (this.engine) { this.engine.dispose(); this.engine = null; }
    if (this.deck) { this.deck.dispose(); this.deck = null; }
    window.removeEventListener('keydown', this.onKey); window.removeEventListener('keyup', this.onKeyUp);
    if (active === this) active = null;
    this.opts.onStop && this.opts.onStop(this);
  }

  fail(err) {
    console.error(err);
    const L = this.$('.loading'); L.hidden = false;
    L.innerHTML = `<div class="err-box">לא הצלחנו להפעיל את הסימולטור.<br><span>${err.message}</span></div>`;
  }

  async loadScene(id) {
    const L = this.$('.loading'); L.hidden = false; this.$('.loading .bar i').style.width = '0%';
    let meta = sceneCache.get(id);
    if (!meta) { meta = await (await fetch(`scenes/${id}/scene.json`)).json(); sceneCache.set(id, meta); }
    const tier = meta.tiers && this.view.width <= 1300 ? meta.tiers.m : (meta.tiers ? meta.tiers.l : { path: '' });
    const base = `scenes/${id}` + (tier.path ? '/' + tier.path.replace(/\/$/, '') : '');
    try {
      await this.engine.loadScene(meta, base, p => { this.$('.loading .bar i').style.width = Math.round(p * 100) + '%'; });
    } catch (e) { this.fail(e); return; }
    this.scene = meta; this.st.scene = id;
    this.st.focal = Math.max(this.st.focal, meta.srcFocal);
    this.st.afState = 'idle'; this.st.afTarget = null;
    this.st.focusDist = this.st.mfDist = this.initialFocus();
    this.autofocus(true);
    L.hidden = true;
    this.$('.scene-note').textContent = meta.note || '';
    this.root.querySelectorAll('.sc-name').forEach(n => { n.textContent = (SCENE_LIST.find(x => x.id === id) || {}).he || meta.title || ''; });
    this.root.querySelectorAll('.scene-card').forEach(n => n.setAttribute('aria-pressed', String(n.dataset.id === id)));
    const c = meta.credit || {};
    this.$('.credit').innerHTML = c.url ? `<a href="${c.url}" target="_blank" rel="noopener">${c.author ? c.author + ' · ' : ''}${c.source} · ${c.license}</a>` : '';
    this.renderTask();
    this.markDirty();
  }

  applyPreset(p) {
    const st = this.st;
    if (p.mode) st.mode = p.mode;
    if (p.focal) st.focal = clamp(p.focal, this.scene ? this.scene.srcFocal : 24, 50);
    if (p.N) { st.ai = nearestIdx(C.APERTURES, p.N); }
    if (p.t) st.si = nearestIdx(C.SHUTTERS, p.t);
    if (p.iso !== undefined) { st.iso = p.iso; if (p.iso !== 'AUTO') st.isoManual = p.iso; }
    for (const k of ['nd', 'ec', 'wb', 'kelvin', 'look', 'dro', 'metering', 'focusMode', 'focusArea', 'recog', 'lensAFMF', 'tripod', 'steady', 'peaking', 'zebra']) if (p[k] !== undefined) st[k] = p[k];
    if (p.focusDist) { st.focusDist = st.mfDist = p.focusDist; }
    st.apertureRing = 'A';
    if (!p.focusDist && this.scene) { st.afState = 'idle'; this.autofocus(true); }
    this.markDirty();
  }

  /* ---------- autofocus ---------- */
  subjectInFrame() {
    const want = this.st.recog === 'human' ? 'human' : this.st.recog === 'animal' ? 'animal' : null;
    const s = this.scene.subjects && this.scene.subjects.find(x => x.type === want && x.eyes);
    if (!s) return null;
    const [x0, y0, w, h] = C.frameCrop(this.scene, this.st.focal);
    const toF = (p) => ({ x: (p[0] - x0) / w, y: (p[1] - y0) / h });
    const a = toF([s.face[0], s.face[1]]), b = toF([s.face[2], s.face[3]]);
    if (b.x < 0 || a.x > 1 || b.y < 0 || a.y > 1) return null;
    return { box: [a.x, a.y, b.x, b.y], eye: toF(s.eyes[0]), eyeSrc: { x: s.eyes[0][0], y: s.eyes[0][1] }, subj: s };
  }
  initialFocus() {
    const s = this.scene.subjects && this.scene.subjects[0];
    if (s && s.eyes) return this.engine.depthAt({ x: s.eyes[0][0], y: s.eyes[0][1] }, 0.003);
    if (s && s.center) return this.engine.depthAt({ x: s.center[0], y: s.center[1] }, 0.01);
    return this.engine.depthAt(C.frameToSrc(this.scene, this.st.focal, { x: 0.5, y: 0.5 }), 0.02);
  }
  focusIsManual() { return this.st.lensAFMF === 'MF' || this.st.focusMode === 'MF'; }
  autofocus(silent) {
    const st = this.st, scene = this.scene, E = this.engine;
    if (this.focusIsManual()) return;
    const area = st.mode === 'AUTO' ? 'wide' : st.focusArea;
    let target, dist;
    const face = this.subjectInFrame();
    if ((area === 'wide' || area === 'zone') && face) {
      target = { kind: 'eye', x: face.eye.x, y: face.eye.y, box: face.box };
      dist = E.depthAt(face.eyeSrc, 0.003);
    } else if (area === 'wide' || area === 'zone') {
      let best = null;
      const xr = area === 'zone' ? [0.3, 0.7] : [0.12, 0.88], yr = area === 'zone' ? [0.3, 0.7] : [0.18, 0.86];
      for (let y = yr[0]; y <= yr[1]; y += 0.05) for (let x = xr[0]; x <= xr[1]; x += 0.05) {
        const d = E.depthAt(C.frameToSrc(scene, st.focal, { x, y }), 0.01);
        const score = d * (1 + 1.6 * Math.hypot(x - 0.5, (y - 0.5) * 0.8));
        if (!best || score < best.score) best = { x, y, d, score };
      }
      target = { kind: 'area', x: best.x, y: best.y }; dist = best.d;
    } else {
      const p = area === 'center' ? { x: 0.5, y: 0.5 } : st.focusPoint;
      const size = (C.FOCUS_AREAS.find(a => a.id === area) || {}).size || 0.04;
      target = { kind: 'spot', x: p.x, y: p.y, size };
      dist = E.depthAt(C.frameToSrc(scene, st.focal, p), size * 0.4 * (scene.srcFocal / st.focal));
    }
    const mfd = C.LENS.mfdAF(st.focal);
    if (dist < mfd) { st.afState = 'fail'; st.afTarget = target; if (!silent) this.toast(`לא ניתן למקד: קרוב מדי. המרחק המינימלי ב-${st.focal} מ"מ הוא ${mfd.toFixed(2)} מ' מסימון החיישן`); return; }
    st.focusDist = st.mfDist = dist;
    st.afState = silent ? 'idle' : 'ok'; st.afTarget = target;
  }

  /* ---------- render ---------- */
  markDirty() { this.dirty = true; }
  frameParams(extra = {}) {
    const st = this.st, exp = this.exp, view = this.view;
    let crop = C.frameCrop(this.scene, st.focal), frac = 1;
    if (st.magnify) {
      const w = 1 / MAG, h2 = w / 2;
      const lx = clamp(st.focusPoint.x, h2, 1 - h2), ly = clamp(st.focusPoint.y, h2, 1 - h2);
      crop = C.frameCrop(this.scene, st.focal, { x: lx, y: ly, w }); frac = w;
    }
    return {
      crop, pxPerMM: view.width / (36 * frac), focal: st.focal, N: exp.N, focusMM: st.focusDist * 1000,
      expMul: exp.expMul * (this.scene.gain || 1), wb: C.wbGains(this.scene, st), iso: exp.iso, noise: true, seed: 1.234, shake: [0, 0],
      vignette: (1 - Math.pow(2, -0.6)) * Math.min(1, Math.pow(2.8 / exp.N, 2)) * (st.focal < 30 ? 1 : 0.7),
      dro: st.mode === 'AUTO' ? 0.35 : (C.DRO.find(d => d.id === st.dro) || C.DRO[0]).v,
      look: C.lookFor(st), peaking: st.peaking && (this.focusIsManual() || st.focusMode === 'DMF'), zebra: st.zebra,
      kSensor: SENSOR.widthPx * frac / view.width, motionT: 0, ...extra,
    };
  }
  /** the scene as the sensor sees it: an ND filter on the 67 mm thread removes light before metering */
  eff() { return this.st.nd ? { ...this.scene, ev100: this.scene.ev100 - this.st.nd } : this.scene; }
  compute() {
    const face = this.st.metering === 'multi' ? this.subjectInFrame() : null;
    const delta = C.meter(this.scene, this.st, face && face.box);
    this.exp = C.solveExposure(this.eff(), this.st, delta); this.exp.delta = delta;
  }
  loop() {
    if (this.dirty && this.scene && !this.ui.review && this.engine) {
      this.dirty = false;
      this.compute();
      // live view shows subject motion as it would look at the current shutter only when slower than ~1/30 (like a real EVF it doesn't)
      this.engine.render(this.frameParams());
      this.drawOSD(); this.refreshControls(); this.renderTask(); this.updateHist();
      this.opts.onChange && this.opts.onChange(this);
    }
    if (this.raf) this.raf = requestAnimationFrame(this.loop);
  }
  sizeCanvas() {
    const r = this.$('.lcd').getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(Math.min(1500, Math.max(600, r.width * dpr)));
    if (this.view.width !== w) { this.view.width = w; this.view.height = Math.round(w * 2 / 3); this.markDirty(); }
  }

  /* ---------- histogram ---------- */
  histogram(src) {
    if (!this.hc) { this.hc = new OffscreenCanvas(150, 100); this.hctx = this.hc.getContext('2d', { willReadFrequently: true }); }
    this.hctx.drawImage(src, 0, 0, 150, 100);
    const px = this.hctx.getImageData(0, 0, 150, 100).data;
    const bins = [new Uint32Array(64), new Uint32Array(64), new Uint32Array(64), new Uint32Array(64)];
    let clip = 0, sum = 0;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2], y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      bins[0][y >> 2]++; bins[1][r >> 2]++; bins[2][g >> 2]++; bins[3][b >> 2]++;
      if (r >= 253 || g >= 253 || b >= 253) clip++;
      sum += y / 255;
    }
    const n = px.length / 4;
    return { bins, clipFrac: clip / n, meanLuma: sum / n };
  }
  drawHist(canvas, h, rgb) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const sets = rgb ? [[1, 'rgba(255,80,80,.7)'], [2, 'rgba(80,255,120,.7)'], [3, 'rgba(90,140,255,.7)']] : [[0, 'rgba(255,255,255,.85)']];
    ctx.globalCompositeOperation = rgb ? 'lighter' : 'source-over';
    for (const [k, col] of sets) {
      const b = h.bins[k]; let mx = 1; for (let i = 1; i < 63; i++) mx = Math.max(mx, b[i]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let i = 0; i < 64; i++) ctx.lineTo(i / 63 * W, H - Math.min(1, b[i] / mx) * H);
      ctx.lineTo(W, H); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  updateHist() {
    clearTimeout(this.ui.htimer);
    this.ui.htimer = setTimeout(() => { const c = this.root.querySelector('.osd canvas.hist'); if (c && !c.hidden) this.drawHist(c, this.histogram(this.view), false); }, 80);
  }

  /* ---------- OSD ---------- */
  drawOSD() {
    const st = this.st, exp = this.exp, o = this.$('.osd');
    const bl = (k) => (exp.blink[k] ? 'blink' : '');
    const wb = C.WB_PRESETS.find(w => w.id === st.wb);
    const area = C.FOCUS_AREAS.find(a => a.id === st.focusArea);
    const fm = this.focusIsManual() ? 'MF' : st.focusMode;
    const meterLbl = { multi: '◉ Multi', center: '◎ Center', spot: '• Spot', average: '▢ Avg', highlight: '☼ Hi' }[st.metering];
    const shakeRisk = !st.tripod && C.shakePx(st, exp.t, this.view.width / 36) > 1.5;
    const auto = st.iso === 'AUTO' || st.mode === 'AUTO';
    const isoTxt = auto ? `ISO AUTO <b>${exp.iso}</b>` : `ISO ${exp.iso}`;
    const evPart = st.mode === 'M' && st.iso !== 'AUTO' ? `M.M. ${C.fmtEV(Math.round(exp.mm * 3) / 3)}` : C.fmtEV(st.mode === 'AUTO' ? 0 : st.ec);
    let h = `
      <div class="row tl"><span class="mode-box">${st.mode === 'AUTO' ? 'iA' : st.mode}${st.mode === 'P' && st.shift ? '*' : ''}</span><span>JPEG</span><span>L:33M</span><span>3:2</span>${st.magnify ? `<span>×${MAG}</span>` : ''}</div>
      <div class="row tr"><span>${st.focal}mm</span><span>1832</span><span>▮▮▮ 100%</span></div>
      <div class="row lc"><span>◻ 1</span><span>${fm}</span><span>${fm === 'MF' ? '' : st.mode === 'AUTO' ? 'Wide' : area.label}</span><span>${meterLbl}</span>
        <span>${st.mode === 'AUTO' ? 'AWB' : wb.id === 'CTemp' ? st.kelvin + 'K' : wb.label}</span><span>${st.mode === 'AUTO' ? 'DRO' : C.DRO.find(d => d.id === st.dro).label}</span>
        <span>${st.mode === 'AUTO' ? 'ST' : st.look}</span><span class="${shakeRisk ? 'blink' : ''}">${st.steady ? '((✋))' : '✋ OFF'}</span></div>
      <div class="row bot"><div class="ex"><span class="${bl('t')}">${C.fmtShutter(exp.t)}</span><span class="${bl('N')}">${C.fmtF(exp.N)}</span><span>${evPart}</span><span class="${bl('iso')}">${isoTxt}</span></div></div>
      <canvas class="hist" width="150" height="100" ${st.disp === 0 && !st.magnify ? '' : 'hidden'}></canvas>`;
    if (fm === 'MF' || st.focusMode === 'DMF') {
      const lo = Math.log(C.LENS.mfdMF(st.focal)), hi = Math.log(60);
      const pos = clamp((Math.log(st.focusDist) - lo) / (hi - lo), 0, 1);
      h += `<div class="mfbar"><span>${C.LENS.mfdMF(st.focal).toFixed(2)}m</span><span>1m</span><span>3m</span><span>∞</span><i class="pin" style="left:${(pos * 100).toFixed(1)}%"></i></div>`;
    }
    const t = st.afTarget;
    if (!st.magnify && t && fm !== 'MF') {
      const cls = st.afState === 'ok' ? 'ok' : st.afState === 'fail' ? 'fail blink' : '';
      if (t.kind === 'eye' && t.box) {
        const [a, b, c2, d] = t.box;
        h += `<div class="af-frame" style="left:${a * 100}%;top:${b * 100}%;width:${(c2 - a) * 100}%;height:${(d - b) * 100}%;border-color:rgba(255,255,255,.7)"></div>`;
        h += `<div class="af-frame eye ${cls}" style="left:calc(${t.x * 100}% - 1.1%);top:calc(${t.y * 100}% - 1.65%);width:2.2%;height:3.3%"></div>`;
      } else if (t.kind === 'spot' || st.afState !== 'idle') {
        const s = (t.size || 0.05) * 100;
        h += `<div class="af-frame ${cls}" style="left:calc(${t.x * 100}% - ${s / 2}%);top:calc(${t.y * 100}% - ${s * 0.75}%);width:${s}%;height:${s * 1.5}%"></div>`;
      }
    }
    if (!st.magnify && !this.focusIsManual() && st.mode !== 'AUTO' && /spot|expand/.test(st.focusArea) && (!t || t.kind !== 'spot')) {
      h += `<div class="af-frame" style="left:calc(${st.focusPoint.x * 100}% - 2.5%);top:calc(${st.focusPoint.y * 100}% - 3.75%);width:5%;height:7.5%"></div>`;
    }
    if (this.ui.toast) h += `<div class="toast">${this.ui.toast}</div>`;
    o.innerHTML = h;
    this.renderOverlays();
  }
  toast(msg) { this.ui.toast = msg; clearTimeout(this.ui.ttimer); this.ui.ttimer = setTimeout(() => { this.ui.toast = null; this.markDirty(); }, 2200); this.markDirty(); }

  /* ---------- Fn menu ---------- */
  get FN() {
    return [
      { k: 'drive', name: 'Drive Mode', val: () => 'Single' },
      { k: 'focusMode', name: 'Focus Mode', opts: () => C.FOCUS_MODES.map(x => [x.id, x.label]) },
      { k: 'focusArea', name: 'Focus Area', opts: () => C.FOCUS_AREAS.map(x => [x.id, x.label]) },
      { k: 'ec', name: 'Exposure Comp.', opts: () => range(-5, 5, 1 / 3).map(v => [v, C.fmtEV(v)]) },
      { k: 'iso', name: 'ISO', opts: () => [['AUTO', 'ISO AUTO'], ...C.ISOS.map(v => [v, (v < 100 ? 'L ' : v > 51200 ? 'H ' : '') + v])] },
      { k: 'recog', name: 'Recognition Target', opts: () => C.RECOG.map(x => [x.id, x.label]) },
      { k: 'metering', name: 'Metering Mode', opts: () => C.METERING.map(x => [x.id, x.label]) },
      { k: 'wb', name: 'White Balance', opts: () => C.WB_PRESETS.map(x => [x.id, x.name]) },
      { k: 'dro', name: 'D-Range Optimizer', opts: () => C.DRO.map(x => [x.id, x.label]) },
      { k: 'look', name: 'Creative Look', opts: () => Object.entries(C.LOOKS).map(([id, l]) => [id, `${id} · ${l.name}`]) },
      { k: 'kelvin', name: 'C.Temp.', opts: () => range(2500, 9900, 100).map(v => [v, v + 'K']) },
      { k: 'steady', name: 'SteadyShot', opts: () => [[true, 'On'], [false, 'Off']] },
    ];
  }
  fnValue(it) {
    if (it.val) return it.val();
    const v = it.k === 'iso' ? this.st.iso : this.st[it.k];
    const o = it.opts().find(([id]) => id === v || (typeof id === 'number' && Math.abs(id - v) < 0.02));
    return o ? o[1] : String(v);
  }
  locked(k) {
    for (const [p, keys] of Object.entries(LOCK_KEYS)) if (this.locks.has(p) && keys.includes(k)) return true;
    return this.locks.has(k);
  }
  setValue(k, v) {
    if (this.locked(k)) { this.toast('ההגדרה הזו נעולה בתרגיל הזה'); return; }
    if (k === 'iso') { this.st.iso = v; if (v !== 'AUTO') this.st.isoManual = v; } else this.st[k] = v;
    if (['focusMode', 'focusArea', 'recog'].includes(k)) { this.st.afState = 'idle'; this.autofocus(true); }
    if (k === 'kelvin') this.st.wb = 'CTemp';
    this.markDirty();
  }
  renderOverlays() {
    const lcd = this.$('.lcd');
    lcd.querySelectorAll('.fn,.picker').forEach(n => n.remove());
    if (this.ui.picker) {
      const it = this.ui.picker, cur = it.k === 'iso' ? this.st.iso : this.st[it.k];
      const p = el('div', 'picker'); p.append(el('div', 'ttl', it.name));
      const row = el('div', 'opts');
      for (const [id, label] of it.opts()) {
        const b = el('button', '', label); b.type = 'button';
        if (id === cur || (typeof id === 'number' && Math.abs(id - cur) < 0.02)) b.classList.add('sel');
        b.addEventListener('click', e => { e.stopPropagation(); this.setValue(it.k, id); });
        row.append(b);
      }
      p.append(row);
      const ok = el('button', 'btn ok', 'OK'); ok.type = 'button';
      ok.addEventListener('click', e => { e.stopPropagation(); this.ui.picker = null; this.markDirty(); });
      p.append(ok); p.addEventListener('pointerdown', e => e.stopPropagation());
      lcd.append(p);
      requestAnimationFrame(() => { const s = row.querySelector('.sel'); if (s) row.scrollLeft = s.offsetLeft - row.clientWidth / 2 + s.clientWidth / 2; });
    } else if (this.ui.fnOpen) {
      const g = el('div', 'fn');
      this.FN.forEach((it, i) => {
        const b = el('button', i === this.ui.fnSel ? 'sel' : '', `${this.fnValue(it)}<small>${it.name}</small>`); b.type = 'button';
        b.addEventListener('click', e => {
          e.stopPropagation(); this.ui.fnSel = i;
          if (this.deck && this.deck.byId[it.k]) { this.ui.fnOpen = false; this.deck.select(it.k, true); this.toast(`${it.name}: משנים בחוגה הקדמית`); }
          else if (it.opts) this.ui.picker = it;
          else this.toast(it.name + ': ' + this.fnValue(it));
          this.markDirty();
        });
        g.append(b);
      });
      g.addEventListener('pointerdown', e => e.stopPropagation());
      lcd.append(g);
    }
  }

  /* ---------- dials ---------- */
  dialRole(which) {
    const st = this.st, m = st.mode, ring = st.apertureRing !== 'A';
    if (this.ui.picker) return { name: this.ui.picker.name, step: d => this.stepPicker(d) };
    if (this.ui.fnOpen && which === 'F') return { name: this.FN[this.ui.fnSel].name, step: d => { const it = this.FN[this.ui.fnSel]; if (it.opts) { this.ui.picker = it; this.stepPicker(d); } } };
    if (which === 'R') return m === 'AUTO' ? { name: '—' } : { name: 'Exposure Comp.', step: d => { if (this.locked('ec')) return this.toast('נעול בתרגיל'); st.ec = clamp(Math.round((st.ec + d / 3) * 3) / 3, -5, 5); } };
    if (m === 'AUTO') return { name: '— (AUTO)' };
    if (m === 'P') return { name: 'Program Shift', step: d => { st.shift = clamp(st.shift + d, -12, 12); } };
    const ap = { name: ring ? 'Aperture (ring)' : 'Aperture', step: d => { if (this.locked('ap')) return this.toast('הצמצם נעול בתרגיל'); if (ring) return this.toast('הצמצם נקבע בטבעת העדשה. החזירו אותה ל-A'); st.ai = clamp(st.ai + d, 0, C.APERTURES.length - 1); } };
    const sh = { name: 'Shutter', step: d => { if (this.locked('sh')) return this.toast('התריס נעול בתרגיל'); st.si = clamp(st.si + d, 0, C.SHUTTERS.length - 1); } };
    if (m === 'A') return ap;
    if (m === 'S') return sh;
    return which === 'F' ? ap : sh;
  }
  stepPicker(d) {
    const it = this.ui.picker, opts = it.opts(), cur = it.k === 'iso' ? this.st.iso : this.st[it.k];
    let i = opts.findIndex(([id]) => id === cur || (typeof id === 'number' && Math.abs(id - cur) < 0.02));
    i = clamp(i + d, 0, opts.length - 1); this.setValue(it.k, opts[i][0]);
  }
  seg(host, opts, get, set) {
    host.innerHTML = '';
    for (const [v, l] of opts) {
      const b = el('button', '', l); b.type = 'button';
      b.addEventListener('click', () => { set(v); this.markDirty(); });
      host.append(b);
    }
    return () => host.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i][0] === get())));
  }
  refreshControls() { this.refreshers.forEach(f => f()); }

  /* ---------- wiring ---------- */
  wire() {
    const st = this.st, R = this.refreshers;
    const sw = (k) => this.root.querySelector(`.sw[data-s="${k}"]`);
    R.push(this.seg(sw('nd'), [[0, 'ללא'], [3, 'ND8'], [6, 'ND64'], [10, 'ND1000']], () => st.nd || 0, v => { if (this.locked('nd')) return this.toast('נעול בתרגיל'); st.nd = v; if (v) this.toast(`ND${Math.round(2 ** v)}: מוריד ${v} סטופים של אור`); }));
    R.push(this.seg(sw('tripod'), [[false, 'ביד'], [true, 'חצובה']], () => st.tripod, v => { st.tripod = v; }));
    R.push(this.seg(sw('steady'), [[true, 'On'], [false, 'Off']], () => st.steady, v => { st.steady = v; }));
    R.push(this.seg(sw('peak'), [[true, 'On'], [false, 'Off']], () => st.peaking, v => { st.peaking = v; }));
    R.push(this.seg(sw('zebra'), [[true, 'On'], [false, 'Off']], () => st.zebra, v => { st.zebra = v; }));
    R.push(this.seg(sw('disp'), [[0, 'On'], [1, 'Off']], () => st.disp, v => { st.disp = v; }));
    this.$('.sim-x').addEventListener('click', () => this.stop());
    this.root.querySelectorAll('.sh-close, .sh-go').forEach(b => b.addEventListener('click', () => this.openSheet(null)));
    this.root.querySelectorAll('.sim-sheet').forEach(sh => sh.addEventListener('click', (e) => { if (e.target === sh) this.openSheet(null); }));
    const pill = this.$('.sim-pill'); if (pill) pill.addEventListener('click', () => this.openSheet('task'));
    const scb = this.$('.sim-scene'); if (scb) scb.addEventListener('click', () => this.openSheet('scene'));
    this.root.querySelectorAll('.scene-card').forEach(c => c.addEventListener('click', () => {
      this.openSheet(null); this.hideReview();
      this.opts.onScene && this.opts.onScene(c.dataset.id);
      this.loadScene(c.dataset.id).then(() => { if (this.deck) this.deck.select(this.deck.cur); });
    }));
    // touch focus on the screen
    this.$('.lcd').addEventListener('pointerdown', e => {
      if (this.ui.review) return;
      if (this.ui.fnOpen || this.ui.picker) { this.ui.fnOpen = false; this.ui.picker = null; this.markDirty(); return; }
      const r = this.view.getBoundingClientRect();
      const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      if (st.mode === 'AUTO') return this.toast('ב-AUTO אזור הפוקוס נעול על Wide');
      st.focusPoint = p;
      if (!/spot|expand/.test(st.focusArea) && !this.locked('focusArea')) st.focusArea = 'spotM';
      if (!this.focusIsManual()) { this.autofocus(false); setTimeout(() => { if (!this.ui.half) { st.afState = 'idle'; this.markDirty(); } }, 900); }
      this.markDirty();
    });
  }

  flashMagnify() {
    this.st.magnify = 1; clearTimeout(this.ui.mag);
    this.ui.mag = setTimeout(() => { this.st.magnify = 0; this.markDirty(); }, 2200);
  }

  halfPress() {
    this.ui.half = true; if (this.deck) this.deck.setHalf(true);
    if (!this.focusIsManual()) this.autofocus(false);
    this.st.magnify = 0; this.markDirty();
  }
  release(shoot) {
    this.ui.half = false; if (this.deck) this.deck.setHalf(false);
    if (shoot) this.capture(); else if (this.st.afState === 'ok') { this.st.afState = 'idle'; this.markDirty(); }
  }

  /* ---------- capture + evaluation ---------- */
  capture() {
    if (!this.engine) return;
    const st = this.st, scene = this.scene, view = this.view;
    this.compute(); const exp = this.exp;
    const pxPerMM = view.width / 36;
    const len = C.shakePx(st, exp.t, pxPerMM), ang = Math.random() * Math.PI;
    st.magnify = 0;
    const p = this.frameParams({ shake: [Math.cos(ang) * len, Math.sin(ang) * len], seed: Math.random() * 100, peaking: false, zebra: false, motionT: exp.t });
    p.crop = C.frameCrop(scene, st.focal); p.pxPerMM = pxPerMM; p.kSensor = SENSOR.widthPx / view.width;
    this.engine.render(p);
    const shot = el('canvas', 'shot'); shot.width = view.width; shot.height = view.height;
    shot.getContext('2d').drawImage(view, 0, 0);
    const h = this.histogram(shot);
    const x = this.evaluate(exp, len, h);
    this.ui.last = { canvas: shot, hist: h, x, st: { ...st } };
    this.showReview();
    this.markDirty();
  }
  evaluate(exp, shake, h) {
    const st = this.st, scene = this.scene, E = this.engine;
    const z = C.dof(st.focal, exp.N, st.focusDist, 0.02), z3 = C.dof(st.focal, exp.N, st.focusDist, 0.03);
    const inDof = (d) => d >= z.near && d <= z.far && st.afState !== 'fail';
    const want = st.recog === 'human' ? 'human' : st.recog === 'animal' ? 'animal' : null;
    const subj = (scene.subjects || [])[0];
    let eyeSharp = false, subjectSharp = false;
    if (subj && subj.eyes) {
      const d = E.depthAt({ x: subj.eyes[0][0], y: subj.eyes[0][1] }, 0.003);
      eyeSharp = inDof(d) && (subj.type === 'human' || want === subj.type || st.focusArea !== 'wide' || this.focusIsManual());
      subjectSharp = inDof(d);
    } else if (subj && subj.center) subjectSharp = inDof(E.depthAt({ x: subj.center[0], y: subj.center[1] }, 0.01));
    const f = st.focal, s = st.focusDist * 1000, dmax = scene.depth.max * 1000;
    const cocInf = (f * f / (exp.N * Math.max(s - f, 1))) * Math.abs(dmax - s) / dmax;
    const crop = C.frameCrop(scene, f);
    const motion = scene.motion ? 0.7 * scene.motion.max * exp.t / crop[2] * 1200 : 0;
    const ePerUnit = SENSOR.fullWell * (100 / exp.iso) / LSAT;
    const eMid = 0.18 * ePerUnit * Math.min(4, Math.pow(2, Math.log2(exp.expMul)));
    const rn = exp.iso >= 640 ? SENSOR.readNoiseHigh : SENSOR.readNoiseLow;
    const snr = eMid / Math.sqrt(eMid + rn * rn) * Math.sqrt(SENSOR.widthPx / 1200);
    const expErr = Math.log2(exp.expMul);
    return {
      nd: st.nd || 0, mode: st.mode, N: exp.N, t: exp.t, iso: exp.iso, focal: f, ec: st.ec, look: st.look, wb: st.wb, metering: st.metering,
      focusMode: this.focusIsManual() ? 'MF' : st.focusMode, focusArea: st.focusArea, recog: st.recog, dro: st.dro,
      expOk: Math.abs(expErr) <= 0.7, expErr, shake, eyeSharp, subjectSharp, bgBlur: cocInf / 36 * 100,
      farInf: z3.far === Infinity, nearBelow: z3.near, clip: h.clipFrac, meanLuma: h.meanLuma, motion, noiseOk: snr >= 20, snr,
    };
  }
  showReview() {
    const s = this.ui.last; if (!s) { this.toast('עוד לא צילמתם'); return; }
    this.ui.review = true;
    const r = el('div', 'review'); r.append(s.canvas);
    const hc = el('canvas', 'hist'); hc.width = 150; hc.height = 100; r.append(hc); this.drawHist(hc, s.hist, true);
    const e = s.x;
    r.append(el('div', 'info', `${C.fmtShutter(e.t)} &nbsp; ${C.fmtF(e.N)} &nbsp; ISO ${e.iso} &nbsp; ${s.st.focal}mm${s.st.nd ? ' &nbsp; ND' + Math.round(2 ** s.st.nd) : ''}<br>${s.st.look} · ${C.WB_PRESETS.find(w => w.id === s.st.wb).name}`));
    const task = this.opts.task;
    if (task && task.checks) {
      const res = task.checks.map(c => ({ t: c.t, ok: evalCheck(c.c, e) }));
      const all = res.every(x => x.ok);
      r.append(el('div', 'verdict', (all ? '<b class="ok">המשימה הושלמה ✓</b><br>' : '') + res.map(x => `<span class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✗'}</span> ${x.t}`).join('<br>')));
      this.ui.lastRes = res;
      if (all && this.opts.onComplete) this.opts.onComplete();
    } else {
      r.append(el('div', 'verdict', this.explainShot(e)));
    }
    const close = el('button', 'close', 'חזרה לצילום ✕'); close.type = 'button';
    close.addEventListener('click', ev => { ev.stopPropagation(); this.hideReview(); });
    r.append(close);
    r.addEventListener('pointerdown', ev => ev.stopPropagation());
    this.$('.lcd').append(r);
    this.renderTask();
  }
  explainShot(e) {
    const out = [];
    out.push(Math.abs(e.expErr) <= 0.4 ? 'חשיפה מדויקת' : e.expErr > 0 ? `בהירה ב-${e.expErr.toFixed(1)} סטופ` : `כהה ב-${(-e.expErr).toFixed(1)} סטופ`);
    if (e.clip > 0.02) out.push(`${(e.clip * 100).toFixed(1)}% מהפריים שרוף`);
    if (e.shake > 1.5) out.push(`רעידה: מריחה של ${e.shake.toFixed(1)} פיקסלים`);
    if (e.motion > 2) out.push(`תנועה במים: ${e.motion.toFixed(0)} פיקסלים`);
    if (!e.noiseOk) out.push(`רעש בולט (ISO ${e.iso})`);
    return out.join(' · ');
  }
  hideReview() { if (!this.ui.review) return; this.ui.review = null; this.root.querySelectorAll('.review').forEach(n => n.remove()); this.markDirty(); }

  renderTask() {
    const t = this.opts.task; if (!t) return;
    const res = this.ui.lastRes;
    const ol = this.root.querySelector('.sim-sheet .checks');
    if (ol) ol.innerHTML = t.checks.map((c, i) => `<li class="${res ? (res[i].ok ? 'ok' : 'bad') : ''}">${c.t}</li>`).join('');
    const dots = this.root.querySelector('.sim-pill .dots');
    if (dots) dots.innerHTML = t.checks.map((c, i) => `<i class="${res ? (res[i].ok ? 'ok' : 'bad') : ''}"></i>`).join('');
    const pill = this.$('.sim-pill'); if (pill) pill.classList.toggle('done', !!(res && res.every(x => x.ok)));
  }
}

export function stopActive() { if (active) active.stop(); }
