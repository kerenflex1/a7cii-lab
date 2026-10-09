// The simulator's control panel: pick a setting (chip), see exactly where it lives on the real camera or lens (glyph),
// and turn it with a big thumb dial. Plus the buttons you press while shooting and a large shutter button.
import { Ruler } from './ruler.js';
import { buildControls } from './controls.js';
import { bodySVG, ANCHORS, VIEWBOX } from './camera-art.js';
import * as C from './camera.js';

const GROUPS = { body: 'גוף', lens: 'עדשה', fn: 'Fn' };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Deck {
  constructor(host, sim) {
    this.host = host; this.sim = sim;
    this.controls = buildControls(sim);
    this.byId = Object.fromEntries(this.controls.map(c => [c.id, c]));
    host.innerHTML = `
      <div class="dk">
        <div class="dk-chips" role="tablist" aria-label="מה לשנות"></div>
        <div class="dk-card">
          <div class="dk-glyph" aria-hidden="true"></div>
          <div class="dk-read">
            <div class="dk-name"></div>
            <div class="dk-big"></div>
            <div class="dk-loc"></div>
          </div>
        </div>
        <div class="dk-ruler"></div>
        <div class="dk-msg"></div>
        <div class="dk-bar">
          <div class="dk-btns">
            <button type="button" data-b="fn"><b>Fn</b><span>תפריט</span></button>
            <button type="button" data-b="afon"><b>AF-ON</b><span>פוקוס</span></button>
            <button type="button" data-b="play"><b>▶</b><span>צפייה</span></button>
            <button type="button" data-b="mag"><b>⊕</b><span>הגדלה</span></button>
            <button type="button" data-b="more"><b>⋯</b><span>עוד</span></button>
          </div>
          <button type="button" class="dk-shutter" aria-label="כפתור הצילום. החזיקו כדי למקד, שחררו כדי לצלם"><i></i></button>
        </div>
        <div class="dk-stats" dir="rtl"></div>
      </div>`;
    this.$ = (s) => host.querySelector(s);
    this.ruler = new Ruler(this.$('.dk-ruler'), { onChange: (i) => this.turn(i) });
    this.buildChips();
    this.bindButtons();
    this.cur = null;
    this.select(this.defaultControl(), false);
    let seen = false; try { seen = localStorage.getItem('a7c2.dialHint') === '1'; } catch (_) { /* no storage */ }
    if (!seen) {
      setTimeout(() => {
        this.ruler.hint();
        const m = this.$('.dk-msg'); if (m && !m.textContent) { m.textContent = 'גררו את החוגה ימינה ושמאלה, כמו חוגה אמיתית. אפשר גם להקיש על ערך.'; }
        try { localStorage.setItem('a7c2.dialHint', '1'); } catch (_) { /* no storage */ }
      }, 900);
    }
  }

  defaultControl() {
    const st = this.sim.st;
    if (st.lensAFMF === 'MF' || st.focusMode === 'MF') return 'focus';
    return { AUTO: 'mode', P: 'aperture', A: 'aperture', S: 'shutter', M: 'aperture' }[st.mode] || 'aperture';
  }

  buildChips() {
    const box = this.$('.dk-chips');
    let g = null, html = '';
    for (const c of this.controls) {
      if (c.group !== g) { g = c.group; html += `<span class="dk-grp">${GROUPS[g]}</span>`; }
      html += `<button type="button" class="dk-chip" role="tab" data-id="${c.id}"><small>${esc(c.name)}</small><b dir="ltr"></b></button>`;
    }
    box.innerHTML = html;
    box.addEventListener('click', (e) => { const b = e.target.closest('.dk-chip'); if (b) this.select(b.dataset.id, true); });
  }

  select(id, scroll) {
    if (!this.byId[id]) return;
    this.cur = id;
    this.host.querySelectorAll('.dk-chip').forEach(b => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    if (scroll) { const b = this.host.querySelector(`.dk-chip[data-id="${id}"]`); b && b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
    this._glyphKey = null;
    this.refresh(true);
  }

  turn(i) {
    const c = this.byId[this.cur]; if (!c) return;
    const en = c.enabled(); if (!en.ok) return;
    c.set(i);
    this.sim.markDirty();
  }

  /** called by the sim on every rendered frame (cheap) */
  refresh(force) {
    const sim = this.sim, st = sim.st;
    // chips
    for (const c of this.controls) {
      const b = this.host.querySelector(`.dk-chip[data-id="${c.id}"]`); if (!b) continue;
      const v = c.chip(); const vb = b.querySelector('b');
      if (vb.textContent !== v) vb.textContent = v;
      const en = c.enabled();
      b.classList.toggle('auto', !!(c.auto && c.auto()));
      b.classList.toggle('lock', !!en.lock);
      b.hidden = c.id === 'kelvin' && st.wb !== 'CTemp';
    }
    const c = this.byId[this.cur]; if (!c) return;
    const en = c.enabled();
    const items = c.items();
    this.ruler.set(items, Math.max(0, c.index()), { disabled: !en.ok, style: c.style });
    const name = `${c.name} <span dir="ltr">${c.en}</span>`;
    const nm = this.$('.dk-name'); if (nm.innerHTML !== name) nm.innerHTML = name;
    const big = c.big(); const bg = this.$('.dk-big'); if (bg.textContent !== big) bg.textContent = big;
    bg.classList.toggle('auto', !!(c.auto && c.auto()));
    const w = c.where();
    const loc = `<b>${w.he}</b> · ${w.note}`; const lc = this.$('.dk-loc'); if (lc.innerHTML !== loc) lc.innerHTML = loc;
    // message: why it's automatic / locked, with a one-tap fix
    const msg = this.$('.dk-msg');
    const mk = (en.ok ? (en.note || '') : en.why) + '|' + (en.act ? en.act.label : '');
    if (msg.dataset.k !== mk || force) {
      msg.dataset.k = mk;
      msg.className = 'dk-msg' + (en.ok ? '' : ' warn');
      msg.innerHTML = (en.ok ? (en.note || '') : en.why) + (en.act ? ` <button type="button" class="dk-act">${en.act.label}</button>` : '');
      const a = msg.querySelector('.dk-act'); if (a) a.addEventListener('click', () => { en.act.run(); this.refresh(true); });
    }
    this.glyph(w);
    this.stats();
  }

  glyph(w) {
    const st = this.sim.st;
    const key = w.view + ':' + w.part + ':' + (w.view === 'top' ? st.mode : '');
    const g = this.$('.dk-glyph');
    if (w.view === 'lens') {
      if (this._glyphKey !== key) {
        this._glyphKey = key;
        if (!this.lensGlyph) {
          g.innerHTML = '<div class="gl-lens"><div class="gl-wait">העדשה</div></div>';
          const host = g.querySelector('.gl-lens');
          this._lensLoading = import('./lens3d.js').then(m => m.createLens3D(host, { view: 'side', compact: true, interactive: false, highlight: [w.part], hlStrength: 0.75, focal: st.focal, ring: st.apertureRing, afmf: st.lensAFMF }))
            .then(l => { this.lensGlyph = l; this._lensHost = host; const wn = host.querySelector('.gl-wait'); if (wn) wn.remove(); this._glyphKey = null; })
            .catch(() => { host.innerHTML = '<div class="gl-wait">העדשה</div>'; });
        } else {
          if (!g.contains(this._lensHost)) { g.innerHTML = ''; g.append(this._lensHost); }
          this.lensGlyph.highlight([w.part]);
        }
      }
      if (this.lensGlyph) {
        const L = this.lensGlyph.state;
        if (L.focal !== st.focal || String(L.ring) !== String(st.apertureRing) || L.afmf !== st.lensAFMF) this.lensGlyph.set({ focal: st.focal, ring: st.apertureRing, afmf: st.lensAFMF });
      }
      return;
    }
    if (this._glyphKey === key) return;
    this._glyphKey = key;
    const [x0, y0, W, H] = VIEWBOX[w.view];
    const a = (ANCHORS[w.view] || {})[w.part] || { x: x0 + W / 2, y: y0 + H / 2, r: 3 };
    const keep = this._lensHost && g.contains(this._lensHost) ? this._lensHost : null;
    if (keep) keep.remove();
    g.innerHTML = `<div class="gl-body" style="aspect-ratio:${W}/${H}">${bodySVG(w.view, { mode: st.mode })}
      <i class="gl-dot" style="left:${((a.x - x0) / W * 100).toFixed(2)}%;top:${((a.y - y0) / H * 100).toFixed(2)}%;--r:${Math.max(7, (a.r || 3) / W * 100 * 3.2).toFixed(1)}%"></i></div>`;
  }

  stats() {
    const sim = this.sim, st = sim.st, e = sim.exp; if (!e) return;
    const z = C.dof(st.focal, e.N, st.focusDist);
    const fm = (m) => (m === Infinity || m > 5000 ? '∞' : m < 10 ? m.toFixed(2) : m.toFixed(0));
    const shake = st.tripod ? 0 : C.shakePx(st, e.t, sim.view.width / 36);
    const err = Math.log2(e.expMul || 1);
    const s = `<span>חד <bdi dir="ltr">${fm(z.near)}–${fm(z.far)} m</bdi></span><span>חשיפה <bdi dir="ltr" class="${Math.abs(err) > 0.7 ? 'bad' : ''}">${C.fmtEV(Math.round(err * 10) / 10)}</bdi></span><span>רעידה <bdi dir="ltr" class="${shake > 1.5 ? 'bad' : ''}">${st.tripod ? 'חצובה' : shake.toFixed(1) + 'px'}</bdi></span>`;
    const el = this.$('.dk-stats'); if (el.innerHTML !== s) el.innerHTML = s;
  }

  bindButtons() {
    const sim = this.sim, st = sim.st;
    const B = (k) => this.host.querySelector(`[data-b="${k}"]`);
    B('fn').addEventListener('click', () => { sim.hideReview(); sim.ui.picker = null; sim.ui.fnOpen = !sim.ui.fnOpen; sim.markDirty(); });
    B('play').addEventListener('click', () => (sim.ui.review ? sim.hideReview() : sim.showReview()));
    B('mag').addEventListener('click', () => { st.magnify = st.magnify ? 0 : 1; if (st.magnify) sim.toast('Focus Magnifier ×6.9 סביב נקודת הפוקוס'); sim.markDirty(); });
    B('more').addEventListener('click', () => sim.openSheet('acc'));
    const af = B('afon');
    af.addEventListener('pointerdown', () => { if (!sim.focusIsManual()) { sim.autofocus(false); sim.markDirty(); } af.classList.add('down'); });
    const afUp = () => { af.classList.remove('down'); if (st.afState === 'ok') setTimeout(() => { if (!sim.ui.half) { st.afState = 'idle'; sim.markDirty(); } }, 700); };
    af.addEventListener('pointerup', afUp); af.addEventListener('pointercancel', afUp);
    // shutter: hold = half-press (focus + metering), release = full press
    const sh = this.$('.dk-shutter'); let inside = false;
    sh.addEventListener('pointerdown', (e) => { e.preventDefault(); try { sh.setPointerCapture(e.pointerId); } catch (_) { /* synthetic */ } inside = true; sim.hideReview(); sim.ui.fnOpen = false; sim.ui.picker = null; sim.halfPress(); });
    sh.addEventListener('pointermove', (e) => { const r = sh.getBoundingClientRect(); inside = e.clientX > r.left - 30 && e.clientX < r.right + 30 && e.clientY > r.top - 30 && e.clientY < r.bottom + 30; });
    sh.addEventListener('pointerup', () => sim.release(inside && st.afState !== 'fail'));
    sh.addEventListener('pointercancel', () => sim.release(false));
    sh.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setHalf(on) { this.$('.dk-shutter').classList.toggle('half', on); }

  dispose() { if (this.lensGlyph) this.lensGlyph.dispose(); this.host.innerHTML = ''; }
}
