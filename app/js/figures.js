// Interactive figures: real photos of the body (top / rear / front) and drawings (lens, side, bottom) with tappable parts.
import { PARTS, VIEWS } from './parts.js';
import { lensSVG, irisSVG, lensFrontSVG } from './lens-art.js';

// parts that have no photo position: shown on schematic drawings
Object.assign(PARTS, {
  'mic-jack': { view: 'side', x: 0.36, y: 0.24, r: 0.05, en: 'Mic jack (3.5 mm)', he: 'שקע מיקרופון', d: 'מיקרופון חיצוני. כשמחברים, המיקרופון הפנימי כבה. מספק מתח למיקרופונים מסוג plug-in power.' },
  'usb-c': { view: 'side', x: 0.36, y: 0.42, r: 0.05, en: 'USB Type-C', he: 'USB-C', d: 'טעינה, הזנת חשמל בזמן צילום (USB-PD), העברת קבצים ושימוש כמצלמת רשת.' },
  'charge-lamp': { view: 'side', x: 0.52, y: 0.33, r: 0.035, en: 'Charge lamp', he: 'נורית טעינה', d: 'דולקת בכתום בזמן טעינה וכבה בסיום.' },
  'card-slot': { view: 'side', x: 0.36, y: 0.66, r: 0.07, en: 'Memory card slot (SD, UHS-II)', he: 'חריץ כרטיס זיכרון', d: 'חריץ יחיד ל-SD (מומלץ UHS-II V60/V90 לווידאו 4K). התוויות של הכרטיס פונות לצד המסך.' },
  'access-lamp': { view: 'side', x: 0.52, y: 0.62, r: 0.035, en: 'Access lamp', he: 'נורית גישה', d: 'כשהיא דולקת המצלמה כותבת לכרטיס: לא מוציאים כרטיס ולא סוללה.' },
  'headphone-jack': { view: 'side', x: 0.66, y: 0.82, r: 0.045, en: 'Headphones jack', he: 'שקע אוזניות', d: 'לבקרת שמע בזמן וידאו.' },
  'hdmi': { view: 'side', x: 0.8, y: 0.82, r: 0.045, en: 'HDMI micro', he: 'Micro HDMI', d: 'יציאה למסך או למקליט חיצוני.' },
  'battery': { view: 'bottom', x: 0.2, y: 0.5, r: 0.09, en: 'Battery compartment (NP-FZ100)', he: 'תא הסוללה', d: 'סוללת NP-FZ100. פותחים את הדלת עם הבריח, דוחפים את הסוללה עד שהלשונית הכחולה ננעלת.' },
  'tripod-socket': { view: 'bottom', x: 0.56, y: 0.5, r: 0.05, en: 'Tripod socket (1/4")', he: 'הברגת חצובה', d: 'הברגה סטנדרטית ‎1/4". השתמשו בבורג באורך עד 5.5 מ"מ. במשקל העדשה, עדיף פלטה מתחת לגוף.' },
  'strap-lug': { view: 'front', x: 0.985, y: 0.17, r: 0.025, en: 'Hook for shoulder strap', he: 'וו רצועה', d: 'שני ווים, אחד בכל צד.' },
  'hood': { view: 'lens', en: 'Lens hood ALC-SH178', he: 'מגן אור ALC-SH178', d: 'מגן אור בצורת עלי כותרת. מונע אור צד והבזקים ומגן מנגיעות. נכנס בבאיונט ומסתובב עד קליק. אפשר להפוך אותו לאחסון.' },
});
const ALIAS = { lens: { 'mount-index': 'lens-index' } };

export const DRAWN = {
  side: () => `<svg viewBox="0 0 100 62" class="schem" role="img" aria-label="צד המצלמה עם השקעים">
    <rect x="4" y="4" width="92" height="54" rx="6" fill="#1b1c1f" stroke="#3a3d42"/>
    <rect x="22" y="8" width="38" height="24" rx="3" fill="#121315" stroke="#4a4d52"/><text x="41" y="7" class="sl">מכסה עליון</text>
    <rect x="22" y="36" width="38" height="18" rx="3" fill="#121315" stroke="#4a4d52"/><text x="41" y="58.5" class="sl">דלת הכרטיס</text>
    <rect x="58" y="44" width="34" height="12" rx="3" fill="#121315" stroke="#4a4d52"/>
    <circle cx="36" cy="15" r="2.2" fill="#000" stroke="#777" stroke-width=".4"/><rect x="31.5" y="23" width="9" height="3.2" rx="1.6" fill="#000" stroke="#777" stroke-width=".4"/>
    <circle cx="52" cy="20.5" r="1" fill="#f08a2a"/><circle cx="52" cy="38.5" r="1" fill="#e04030"/>
    <rect x="28" y="40" width="16" height="2" fill="#555"/><circle cx="66" cy="50.5" r="2" fill="#000" stroke="#777" stroke-width=".4"/><rect x="76" y="49" width="7" height="3" rx="1" fill="#000" stroke="#777" stroke-width=".4"/>
  </svg>`,
  bottom: () => `<svg viewBox="0 0 100 40" class="schem" role="img" aria-label="תחתית המצלמה">
    <rect x="3" y="4" width="94" height="32" rx="5" fill="#1b1c1f" stroke="#3a3d42"/>
    <rect x="7" y="8" width="26" height="24" rx="3" fill="#121315" stroke="#4a4d52"/><text x="20" y="35" class="sl">דלת הסוללה</text>
    <circle cx="56" cy="20" r="4.2" fill="#0c0c0d" stroke="#8a8d93" stroke-width=".7"/><circle cx="56" cy="20" r="2" fill="#2a2a2a"/>
    <text x="56" y="31" class="sl">1/4"</text><rect x="9" y="17" width="5" height="6" rx="1" fill="#444"/>
  </svg>`,
};

/** Render a figure for one view with the given parts highlighted. Returns the root element. */
export function renderParts(host, view, show = [], opts = {}) {
  const ids = show.map(id => (ALIAS[view] && ALIAS[view][id]) || id);
  const own = ids.filter(id => PARTS[id] && PARTS[id].view === view);
  const other = ids.filter(id => PARTS[id] && PARTS[id].view !== view);
  const root = document.createElement('div');
  root.className = 'fig fig-' + view;
  if (view === 'lens') root.append(lensFigure(opts.noHL ? [] : own, opts));
  else root.append(photoFigure(view, own));
  // parts that belong to another view: small extra figure
  const groups = {};
  other.forEach(id => (groups[PARTS[id].view] = groups[PARTS[id].view] || []).push(id));
  for (const [v, list] of Object.entries(groups)) {
    const sub = document.createElement('div'); sub.className = 'fig-sub';
    sub.append(v === 'lens' ? lensFigure(list, opts) : photoFigure(v, list));
    root.append(sub);
  }
  // legend
  const legend = document.createElement('ol'); legend.className = 'legend';
  ids.filter(id => PARTS[id]).forEach((id, i) => {
    const p = PARTS[id];
    const li = document.createElement('li');
    li.dataset.part = id;
    li.innerHTML = `<button type="button" class="lg-btn"><span class="num">${i + 1}</span><span class="nm"><b>${p.he}</b> <span class="en" dir="ltr">${p.en}</span></span></button><div class="lg-d">${p.d || ''}</div>`;
    li.querySelector('button').addEventListener('click', () => focusPart(root, id));
    legend.append(li);
  });
  if (ids.length) root.append(legend);
  host.append(root);
  // number the markers consistently with the legend
  ids.forEach((id, i) => root.querySelectorAll(`[data-mk="${id}"] .num`).forEach(n => (n.textContent = i + 1)));
  return root;
}

function focusPart(root, id) {
  root.querySelectorAll('.on').forEach(n => n.classList.remove('on'));
  root.querySelectorAll(`[data-mk="${id}"], .legend li[data-part="${id}"]`).forEach(n => n.classList.add('on'));
  root.querySelectorAll(`[data-part="${id}"]`).forEach(n => n.classList.add('on'));
}

function photoFigure(view, ids) {
  const v = VIEWS[view];
  const wrap = document.createElement('div');
  wrap.className = 'photo-fig';
  if (DRAWN[view]) {
    wrap.innerHTML = `<div class="ph" style="aspect-ratio:${view === 'side' ? '100/62' : '100/40'}">${DRAWN[view]()}</div>`;
  } else {
    wrap.innerHTML = `<div class="ph" style="aspect-ratio:${v.ratio}"><img src="${v.img}" alt="Sony α7C II ${v.he}" draggable="false" decoding="async"></div>`;
  }
  const ph = wrap.querySelector('.ph');
  if (v && v.screen) {   // cover the store-demo menu on the photo with a real shooting display
    const r = v.screen, scr = document.createElement('div');
    scr.className = 'scr';
    Object.assign(scr.style, { left: r.x * 100 + '%', top: r.y * 100 + '%', width: r.w * 100 + '%', height: r.h * 100 + '%', backgroundImage: 'url(scenes/kyoto/poster.jpg)' });
    scr.innerHTML = `<div class="osd"><div class="row tl"><span class="mode-box">A</span><span>JPEG</span><span>3:2</span></div><div class="row tr"><span>50mm</span><span>▮▮▮</span></div>
      <div class="row bot"><div class="ex"><span>1/500</span><span>F2.8</span><span>±0.0</span><span>ISO 100</span></div></div></div>`;
    ph.append(scr);
  }
  ids.forEach(id => {
    const p = PARTS[id]; if (p.x == null) return;
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'mk'; m.dataset.mk = id;
    m.style.left = (p.x * 100) + '%'; m.style.top = (p.y * 100) + '%';
    m.setAttribute('aria-label', p.he);
    m.innerHTML = `<span class="ring" style="width:${Math.max(4.5, p.r * 200)}%"></span><span class="num"></span>`;
    m.addEventListener('click', () => focusPart(wrap.closest('.fig') || wrap, id));
    ph.append(m);
  });
  const cap = document.createElement('div'); cap.className = 'ph-cap'; cap.textContent = (v && v.he) || '';
  wrap.append(cap);
  return wrap;
}

/** Interactive lens: drag the rings (zoom / focus / aperture), flip switches. */
export function lensFigure(ids = [], opts = {}) {
  const st = { focal: opts.focal || 24, ring: 'A', focusDist: 3, afmf: 'AF', clicks: true, hood: false, hl: ids };
  const wrap = document.createElement('div'); wrap.className = 'lens-fig';
  wrap.innerHTML = `<div class="lens-draw"></div>
    <div class="lens-ctl">
      <label class="lc"><span>זום</span><input type="range" min="24" max="50" step="1" value="${st.focal}" aria-label="טבעת זום"><b class="v-zoom" dir="ltr"></b></label>
      <label class="lc"><span>טבעת צמצם</span><input type="range" min="0" max="7" step="1" value="0" aria-label="טבעת צמצם"><b class="v-ap" dir="ltr"></b></label>
      <div class="lc sw-row"><button type="button" class="chipbtn t-afmf">AF/MF</button><button type="button" class="chipbtn t-click">CLICK</button><button type="button" class="chipbtn t-hood">מגן אור</button></div>
    </div>
    <div class="lens-extra"><div class="iris"></div><div class="lens-front-wrap"></div></div>`;
  const RING = ['A', 22, 16, 11, 8, 5.6, 4, 2.8];
  const draw = () => {
    wrap.querySelector('.lens-draw').innerHTML = lensSVG(st);
    wrap.querySelector('.v-zoom').textContent = st.focal + ' mm';
    wrap.querySelector('.v-ap').textContent = st.ring === 'A' ? 'A' : 'F' + st.ring;
    wrap.querySelector('.iris').innerHTML = irisSVG(st.ring === 'A' ? 2.8 : st.ring, 120) + `<div class="cap">${st.ring === 'A' ? 'A: המצלמה קובעת' : 'פתח הצמצם ב-F' + st.ring}<br>11 להבים מעוגלים</div>`;
    wrap.querySelector('.t-afmf').textContent = 'AF/MF: ' + st.afmf;
    wrap.querySelector('.t-click').textContent = 'CLICK: ' + (st.clicks ? 'ON' : 'OFF');
    wrap.querySelector('.t-hood').setAttribute('aria-pressed', String(st.hood));
    wrap.querySelectorAll('[data-part]').forEach(n => n.addEventListener('click', () => {
      const fig = wrap.closest('.fig'); if (fig) focusPart(fig, n.dataset.part);
    }));
  };
  wrap.querySelector('.lens-front-wrap').innerHTML = lensFrontSVG(120) + '<div class="cap">החזית: Ø67 ומרחק פוקוס מינימלי</div>';
  const [zr, ar] = wrap.querySelectorAll('input[type=range]');
  zr.addEventListener('input', () => { st.focal = +zr.value; draw(); });
  ar.addEventListener('input', () => { st.ring = RING[+ar.value]; draw(); });
  wrap.querySelector('.t-afmf').addEventListener('click', () => { st.afmf = st.afmf === 'AF' ? 'MF' : 'AF'; draw(); });
  wrap.querySelector('.t-click').addEventListener('click', () => { st.clicks = !st.clicks; draw(); });
  wrap.querySelector('.t-hood').addEventListener('click', () => { st.hood = !st.hood; draw(); });
  draw();
  return wrap;
}

/** Full explorer page: all views with every part. */
export function renderExplorer(host) {
  const tabs = [['rear', 'גב'], ['top', 'למעלה'], ['front', 'חזית'], ['side', 'צד ושקעים'], ['bottom', 'תחתית'], ['lens', 'העדשה']];
  host.innerHTML = `<div class="seg-tabs" role="tablist">${tabs.map(([v, l], i) => `<button type="button" role="tab" data-v="${v}" aria-selected="${i === 0}">${l}</button>`).join('')}</div><div class="exp-body"></div>`;
  const body = host.querySelector('.exp-body');
  const show = (v) => {
    host.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v)));
    body.innerHTML = '';
    const ids = Object.entries(PARTS).filter(([, p]) => p.view === v).map(([id]) => id);
    renderParts(body, v, ids, { noHL: true });
  };
  host.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  show('rear');
}
