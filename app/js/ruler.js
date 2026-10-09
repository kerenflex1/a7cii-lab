// A thumb-friendly dial: a knurled band you swipe, with momentum and detents on every value (like turning a real dial).
// items: [{ label, major }]. onChange(index) fires live on every detent.

const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Ruler {
  constructor(host, { onChange } = {}) {
    this.host = host; this.onChange = onChange;
    host.classList.add('ruler');
    host.setAttribute('dir', 'ltr');
    host.tabIndex = 0;
    host.setAttribute('role', 'slider');
    host.innerHTML = `<div class="ru-scale"><div class="ru-track"></div></div><div class="ru-band"></div><div class="ru-needle"></div>`;
    this.track = host.querySelector('.ru-track');
    this.band = host.querySelector('.ru-band');
    this.items = []; this.index = 0; this.x = 0; this.W = 48; this.disabled = false; this.anim = 0;
    this.bind();
    new ResizeObserver(() => this.place(false)).observe(host);
  }

  /** items, selected index, { disabled, style: 'dial'|'ring'|'menu' } */
  set(items, index, opts = {}) {
    const sameList = items.length === this.items.length && items.every((it, i) => it.label === this.items[i].label);
    this.disabled = !!opts.disabled;
    const grid = (opts.style === 'menu') && items.length <= 8;
    if (grid !== this.grid) { this.grid = grid; this.host.classList.toggle('as-grid', grid); this.items = []; }
    this.host.classList.toggle('is-disabled', this.disabled);
    this.host.dataset.style = opts.style || 'dial';
    this.host.setAttribute('aria-disabled', String(this.disabled));
    if (!sameList) {
      this.items = items;
      const longest = Math.max(...items.map(it => (it.major === false ? 0 : String(it.label).length)), 2);
      const dense = items.length > 14;
      this.W = Math.max(dense ? 30 : 46, Math.min(112, longest * (dense ? 8.6 : 9.5) + (dense ? 10 : 22)));
      this.track.innerHTML = items.map((it, i) => `<div class="ru-it${it.major === false ? ' minor' : ''}" data-i="${i}" style="${this.grid ? '' : `width:${this.W}px`}"><span class="ru-lb">${it.major === false ? '' : it.label}</span><i class="ru-tk"></i></div>`).join('');
      cancelAnimationFrame(this.anim); this.anim = 0;
      this.index = -1;
      this.setIndex(index, false);
      return;
    }
    if (this.dragging) return;
    if (this.anim && index === this.index) return;     // a fling/snap is already heading there
    if (index !== this.index) { cancelAnimationFrame(this.anim); this.anim = 0; this.setIndex(index, true); }
  }

  setIndex(i, animate) {
    i = Math.max(0, Math.min(this.items.length - 1, i | 0));
    const changed = i !== this.index;
    this.index = i;
    this.track.querySelectorAll('.ru-it.on').forEach(n => n.classList.remove('on'));
    const cur = this.track.children[i]; if (cur) cur.classList.add('on');
    this.host.setAttribute('aria-valuenow', String(i));
    this.host.setAttribute('aria-valuetext', this.items[i] ? String(this.items[i].label) : '');
    this.place(animate && changed && !reduced());
  }

  targetX(i) { return this.host.clientWidth / 2 - (i + 0.5) * this.W; }

  place(animate) {
    if (this.grid) { this.track.style.transform = 'none'; return; }
    const tx = this.targetX(this.index);
    if (!animate) { this.x = tx; this.apply(); return; }
    cancelAnimationFrame(this.anim);
    const from = this.x, t0 = performance.now(), dur = 180;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      this.x = from + (tx - from) * e; this.apply();
      this.anim = k < 1 ? requestAnimationFrame(step) : 0;
    };
    this.anim = requestAnimationFrame(step);
  }

  apply() {
    this.track.style.transform = `translate3d(${this.x.toFixed(1)}px,0,0)`;
    this.band.style.backgroundPositionX = `${(this.x * 1.0).toFixed(1)}px`;
  }

  nearest() { return Math.max(0, Math.min(this.items.length - 1, Math.round((this.host.clientWidth / 2 - this.x) / this.W - 0.5))); }

  detent() {
    const i = this.nearest();
    if (i !== this.index) {
      this.index = i;
      this.track.querySelectorAll('.ru-it.on').forEach(n => n.classList.remove('on'));
      const cur = this.track.children[i]; if (cur) cur.classList.add('on');
      this.onChange && this.onChange(i);
      if (navigator.vibrate) { try { navigator.vibrate(4); } catch (_) { /* not allowed */ } }
    }
  }

  /** one-time affordance: the band nudges sideways so people see it can be dragged */
  hint() {
    if (this.grid || this.disabled || reduced()) return;
    const x0 = this.x, t0 = performance.now();
    const step = (t) => {
      const k = (t - t0) / 900; if (k >= 1 || this.dragging) { if (!this.dragging) { this.x = x0; this.apply(); } return; }
      this.x = x0 - Math.sin(k * Math.PI * 2) * 18 * (1 - k); this.apply(); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  bind() {
    const h = this.host;
    let sx = 0, sy = 0, lastX = 0, lastT = 0, v = 0, moved = 0, startX = 0;
    h.addEventListener('pointerdown', (e) => {
      if (this.disabled) return;
      if (this.grid) {
        const it = e.target.closest('.ru-it'); if (!it) return;
        const i = +it.dataset.i; if (i !== this.index) { this.setIndex(i, false); this.onChange && this.onChange(i); }
        return;
      }
      cancelAnimationFrame(this.anim); this.anim = 0;
      this.dragging = true; moved = 0;
      sx = lastX = e.clientX; sy = e.clientY; lastT = performance.now(); v = 0; startX = this.x;
      try { h.setPointerCapture(e.pointerId); } catch (_) { /* synthetic */ }
      h.classList.add('grab');
    });
    h.addEventListener('pointermove', (e) => {
      if (!this.dragging || this.grid) return;
      const now = performance.now(), dx = e.clientX - lastX;
      moved += Math.abs(dx);
      const minX = this.targetX(this.items.length - 1) - this.W * 0.6, maxX = this.targetX(0) + this.W * 0.6;
      this.x = Math.max(minX, Math.min(maxX, startX + (e.clientX - sx)));
      v = 0.8 * (dx / Math.max(1, now - lastT)) + 0.2 * v;
      lastX = e.clientX; lastT = now;
      this.apply(); this.detent();
    });
    const end = (e) => {
      if (!this.dragging) return;
      this.dragging = false; h.classList.remove('grab');
      if (moved < 5) {             // tap: jump to the touched value
        const it = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ru-it');
        if (it && h.contains(it)) { const i = +it.dataset.i; this.setIndex(i, true); this.onChange && this.onChange(i); }
        else this.place(true);
        return;
      }
      if (reduced() || Math.abs(v) < 0.15) { this.setIndex(this.nearest(), true); return; }
      // momentum with friction, clicking through detents, then settle on the nearest value
      let vel = Math.max(-38, Math.min(38, v * 11));
      const minX = this.targetX(this.items.length - 1), maxX = this.targetX(0);
      const step = () => {
        vel *= 0.9; this.x += vel;
        if (this.x < minX) { this.x = minX; vel = 0; } if (this.x > maxX) { this.x = maxX; vel = 0; }
        this.apply(); this.detent();
        if (Math.abs(vel) > 0.4) this.anim = requestAnimationFrame(step);
        else { this.anim = 0; this.setIndex(this.nearest(), true); }
      };
      this.anim = requestAnimationFrame(step);
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
    h.addEventListener('wheel', (e) => {
      if (this.disabled) return;
      e.preventDefault();
      this._wacc = (this._wacc || 0) + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
      while (Math.abs(this._wacc) >= 40) { const s = Math.sign(this._wacc); this._wacc -= s * 40; this.nudge(s); }
    }, { passive: false });
    h.addEventListener('keydown', (e) => {
      if (this.disabled) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.nudge(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.nudge(-1); }
    });
  }

  nudge(d) {
    const i = Math.max(0, Math.min(this.items.length - 1, this.index + d));
    if (i !== this.index) { this.setIndex(i, true); this.onChange && this.onChange(i); }
  }
}
