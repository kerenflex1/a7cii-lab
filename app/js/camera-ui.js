// The simulator's control surface IS the camera: a vector α7C II seen from behind (top plate folded in perspective
// over the back) plus the 3D FE 24-50mm F2.8 G. Every control is operated where it physically is:
// drag dials and rings, tap buttons, press-and-hold the shutter.
import { bodySVG, SLOTS, VIEWBOX } from './camera-art.js';

const STEP_PX = 14;               // drag distance per dial click
const DIALS = new Set(['rear-dial-l', 'rear-dial-r', 'front-dial', 'mode-dial', 'control-wheel', 'sq-dial']);
const HOLD = new Set(['shutter', 'af-on']);

export class CameraSurface {
  /**
   * host: element. handlers: { dial(id, steps), press(id), hold(id, down:boolean), lens(state), describe(id) → string, state() → {mode, ...} }
   */
  constructor(host, handlers, opts = {}) {
    this.host = host; this.h = handlers; this.opts = opts;
    host.classList.add('cam-surface');
    host.innerHTML = `
      <div class="cam-rig">
        <div class="cam-rear"></div>
      </div>
      <div class="cam-lens-wrap"><div class="cam-lens"></div><div class="cam-lens-cap">גררו על הטבעות כדי לסובב אותן</div></div>
      <div class="cam-cap" aria-live="polite"></div>`;
    this.rear = host.querySelector('.cam-rear');
    this.cap = host.querySelector('.cam-cap');
    this.draw();
    this.bind(this.rear);
    this.ro = new ResizeObserver(() => { const n = this.host.getBoundingClientRect().width < 820; if (n !== this.narrow) this.draw(); });
    this.ro.observe(this.host);
    this.initLens();
  }

  /** One crisp SVG: the top plate projected (foreshortened by TILT) above the back, as seen from behind and slightly above.
   *  top view: y = 55 is the rear face → maps onto the back's top edge (y = 0). */
  compose() {
    const s = this.h.state(), TILT = 0.42;
    const hl = this.opts.hl || [], pressed = [];
    const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    // give the top plate its own ids so its gradients/clips/patterns don't shadow the back's
    const top = inner(bodySVG('top', { mode: s.mode, hl, pressed }))
      .replace(/<rect x="21\.5" y="13"[^>]*\/><rect x="22\.4" y="12\.4"[^>]*\/>/, '')   // mount flange: hidden by the lens
      .replace(/id="([^"]+)"/g, 'id="tp-$1"').replace(/url\(#([^)]+)\)/g, 'url(#tp-$1)').replace(/href="#([^"]+)"/g, 'href="#tp-$1"');
    const rear = inner(bodySVG('rear', { screen: true, flat: true, hl, pressed }));
    const [rx0, ry0, rW, rH] = VIEWBOX.rear;
    const y0 = (-6 - 55) * TILT - 1;
    // phones: the screen is flipped out above the camera, so show just the control side of the body, much larger
    this.narrow = this.host.getBoundingClientRect().width < 820;
    this.vb = this.narrow ? [57, y0, 72, ry0 + rH - y0] : [rx0, y0, rW + 1, ry0 + rH - y0];
    return `<svg viewBox="${this.vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" class="cam-svg cam-composite">
      <g transform="scale(1 ${TILT}) translate(0 -55)" class="cam-topface">${top}</g>
      <path d="M3.3 0 H124" stroke="#000" stroke-opacity=".55" stroke-width="0.6"/>
      <g class="cam-backface">${rear}</g></svg>`;
  }

  draw() {
    this.rear.innerHTML = this.compose();
    const sl = SLOTS.rear.lcd, [X0, Y0, W, H] = this.vb;
    this.slot = { left: (sl.x - X0) / W, top: (sl.y - Y0) / H, width: sl.w / W, height: sl.h / H };
    this.h.slot && this.h.slot(this.slot, this.rear);
  }

  refresh() {
    const s = this.h.state();
    if (s.mode !== this._mode) {
      this._mode = s.mode;
      // redraw only when the mode dial turns; keep the live screen element that sits on top of the drawing
      const svg = this.rear.querySelector('svg.cam-composite');
      const tmp = document.createElement('div'); tmp.innerHTML = this.compose();
      if (svg) svg.replaceWith(tmp.firstElementChild);
    }
    if (this.pressed !== this._pressed) {
      this._pressed = this.pressed;
      this.rear.querySelectorAll('.pressed').forEach(n => n.classList.remove('pressed'));
      if (this.pressed) this.rear.querySelectorAll(`[data-part="${this.pressed}"]`).forEach(n => n.classList.add('pressed'));
    }
  }

  caption(id) {
    const t = this.h.describe ? this.h.describe(id) : id;
    this.cap.innerHTML = t; this.cap.classList.add('show');
    clearTimeout(this._ct); this._ct = setTimeout(() => this.cap.classList.remove('show'), 2600);
  }

  bind(root) {
    let drag = null;
    root.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('[data-part]'); if (!g) return;
      const id = g.dataset.part;
      e.preventDefault();
      root.setPointerCapture(e.pointerId);
      const r = g.getBoundingClientRect();
      drag = { id, x: e.clientX, y: e.clientY, acc: 0, moved: false, cx: r.left + r.width / 2, cy: r.top + r.height / 2,
        ang: Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) };
      this.pressed = id; this.refresh();
      this.caption(id);
      if (HOLD.has(id)) this.h.hold(id, true);
    });
    root.addEventListener('pointermove', (e) => {
      if (!drag || !DIALS.has(drag.id)) return;
      let d;
      if (drag.id === 'control-wheel' || drag.id === 'mode-dial') {
        // circular drag around the dial centre
        const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
        let da = a - drag.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        drag.ang = a; d = da * 40;
      } else {
        d = (e.clientX - drag.x) - (drag.id === 'front-dial' ? 0 : 0);
        drag.x = e.clientX;
        if (drag.id === 'rear-dial-l' || drag.id === 'front-dial') d = -d;   // thumb/finger roll direction
      }
      drag.acc += d;
      while (Math.abs(drag.acc) >= STEP_PX) {
        const s = Math.sign(drag.acc); drag.acc -= s * STEP_PX; drag.moved = true;
        this.h.dial(drag.id, s); this.caption(drag.id);
      }
    });
    const end = (e, cancel) => {
      if (!drag) return;
      const id = drag.id;
      if (HOLD.has(id)) this.h.hold(id, false, cancel);
      else if (!drag.moved) {
        if (DIALS.has(id) && id !== 'control-wheel') {
          // a tap on a dial: left half = one click down, right half = one click up
          const r = e.target.closest('[data-part]')?.getBoundingClientRect();
          const s = r && e.clientX < r.left + r.width / 2 ? -1 : 1;
          this.h.dial(id, id === 'mode-dial' ? 1 : s);
        } else this.h.press(id);
        this.caption(id);
      }
      drag = null; this.pressed = null; this.refresh();
    };
    root.addEventListener('pointerup', (e) => end(e, false));
    root.addEventListener('pointercancel', (e) => end(e, true));
  }

  async initLens() {
    const host = this.host.querySelector('.cam-lens');
    try {
      const { createLens3D } = await import('./lens3d.js');
      const s = this.h.state();
      this.lens = await createLens3D(host, {
        focal: s.focal, ring: s.apertureRing, afmf: s.lensAFMF, clicks: true, view: 'side', compact: true, interactive: true,
        onChange: (ls) => this.h.lens(ls),
      });
    } catch (e) {
      console.error(e);
      host.innerHTML = '<div class="cam-lens-fail">העדשה התלת-ממדית לא נטענה במכשיר הזה.</div>';
    }
  }

  syncLens(s) {
    if (!this.lens) return;
    const L = this.lens.state;
    if (L.focal !== s.focal || String(L.ring) !== String(s.apertureRing) || L.afmf !== s.lensAFMF) this.lens.set({ focal: s.focal, ring: s.apertureRing, afmf: s.lensAFMF });
  }

  dispose() { if (this.ro) this.ro.disconnect(); if (this.lens) this.lens.dispose(); this.host.innerHTML = ''; }
}
