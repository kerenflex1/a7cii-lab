// Course figures: precise vector drawings of the α7C II (camera-art.js) and the 3D FE 24-50mm F2.8 G (lens3d.js),
// with numbered markers and a legend. Text never floats over the art: names live in the legend.
import { PARTS } from './parts.js';
import { bodySVG, ANCHORS, VIEWBOX } from './camera-art.js';

const VIEW_HE = { rear: 'מאחור', top: 'מלמעלה', front: 'מקדימה (בלי עדשה)', side: 'צד שמאל: שקעים וכרטיס', bottom: 'מלמטה', lens: 'העדשה' };
const ALIAS = { lens: { 'mount-index': 'lens-index', 'hood': 'hood-mount' } };
const LENS_IDS = new Set(['focus-ring', 'zoom-ring', 'zoom-scale', 'aperture-ring', 'afmf-switch', 'focus-hold', 'click-switch', 'lens-index', 'filter-thread', 'hood-mount', 'g-badge']);

Object.assign(PARTS, {
  'mic-jack': { view: 'side', en: 'Mic jack (3.5 mm)', he: 'שקע מיקרופון', d: 'מיקרופון חיצוני. כשמחברים, המיקרופון הפנימי כבה. מספק מתח למיקרופונים מסוג plug-in power.' },
  'usb-c': { view: 'side', en: 'USB Type-C', he: 'USB-C', d: 'טעינה, הזנת חשמל בזמן צילום (USB-PD), העברת קבצים ושימוש כמצלמת רשת.' },
  'charge-lamp': { view: 'side', en: 'Charge lamp', he: 'נורית טעינה', d: 'דולקת בכתום בזמן טעינה וכבה בסיום.' },
  'card-slot': { view: 'side', en: 'Memory card slot (SD, UHS-II)', he: 'חריץ כרטיס זיכרון', d: 'חריץ יחיד ל-SD (מומלץ UHS-II V60/V90 לווידאו 4K).' },
  'access-lamp': { view: 'side', en: 'Access lamp', he: 'נורית גישה', d: 'כשהיא דולקת המצלמה כותבת לכרטיס: לא מוציאים כרטיס ולא סוללה.' },
  'headphone-jack': { view: 'side', en: 'Headphones jack', he: 'שקע אוזניות', d: 'לבקרת שמע בזמן וידאו.' },
  'hdmi': { view: 'side', en: 'HDMI micro', he: 'Micro HDMI', d: 'יציאה למסך או למקליט חיצוני.' },
  'battery': { view: 'bottom', en: 'Battery compartment (NP-FZ100)', he: 'תא הסוללה', d: 'סוללת NP-FZ100. פותחים את הדלת עם הבריח, דוחפים את הסוללה עד שהלשונית הכחולה ננעלת.' },
  'tripod-socket': { view: 'bottom', en: 'Tripod socket (1/4")', he: 'הברגת חצובה', d: 'הברגה סטנדרטית ‎1/4". השתמשו בבורג באורך עד 5.5 מ"מ.' },
  'strap-lug': { view: 'front', en: 'Hook for shoulder strap', he: 'וו רצועה', d: 'שני ווים, אחד בכל צד.' },
  'hood-mount': { view: 'lens', en: 'Lens hood ALC-SH178', he: 'מגן אור ALC-SH178', d: 'מגן אור בצורת עלי כותרת. מונע אור צד והבזקים ומגן מנגיעות. אפשר להפוך אותו לאחסון.' },
});
for (const id of LENS_IDS) if (PARTS[id]) PARTS[id].view = 'lens';

function homeView(id, preferred) {
  if (LENS_IDS.has(id)) return 'lens';
  if ((ANCHORS[preferred] || {})[id]) return preferred;
  for (const v of ['rear', 'top', 'front', 'side', 'bottom']) if ((ANCHORS[v] || {})[id]) return v;
  return null;
}

/** Render a figure for one view with the given parts highlighted. */
export function renderParts(host, view, show = [], opts = {}) {
  const ids = [...new Set(show.map(id => (ALIAS[view] && ALIAS[view][id]) || id))].filter(id => PARTS[id] && homeView(id, view));
  const groups = new Map();
  for (const id of ids) {
    const v = view === 'lens' ? (LENS_IDS.has(id) ? 'lens' : homeView(id, 'front')) : homeView(id, view);
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(id);
  }
  if (!groups.size) groups.set(view, []);
  const root = document.createElement('div'); root.className = 'fig fig-' + view;
  const numbering = new Map(ids.map((id, i) => [id, i + 1]));
  let first = true;
  for (const [v, list] of groups) {
    const box = document.createElement('div'); box.className = first ? 'fig-main' : 'fig-sub'; first = false;
    if (v === 'lens') box.append(lensFigure(opts.noHL || list.length > 3 ? [] : list, opts));
    else box.append(bodyFigure(v, opts.noHL ? [] : list, list, numbering));
    root.append(box);
  }
  if (ids.length) {
    const legend = document.createElement('ol'); legend.className = 'legend';
    ids.forEach((id) => {
      const p = PARTS[id];
      const li = document.createElement('li'); li.dataset.part = id;
      li.innerHTML = `<button type="button" class="lg-btn"><span class="num">${numbering.get(id)}</span><span class="nm"><b>${p.he}</b> <span class="en" dir="ltr">${p.en || ''}</span></span></button><div class="lg-d">${p.d || ''}</div>`;
      li.querySelector('button').addEventListener('click', () => focusPart(root, id));
      legend.append(li);
    });
    root.append(legend);
  }
  host.append(root);
  return root;
}

function focusPart(root, id) {
  if (!root) return;
  root.querySelectorAll('.is-on').forEach(n => n.classList.remove('is-on'));
  root.querySelectorAll(`.fmk[data-mk="${id}"], .legend li[data-part="${id}"], [data-part="${id}"]`).forEach(n => n.classList.add('is-on'));
  root.dispatchEvent(new CustomEvent('partfocus', { detail: id }));
}

function bodyFigure(view, hl, markers, numbering) {
  const wrap = document.createElement('div'); wrap.className = 'body-fig';
  const [X0, Y0, W, H] = VIEWBOX[view];
  wrap.innerHTML = `<div class="art"><div class="art-in">${bodySVG(view, { hl })}</div></div><div class="ph-cap">${VIEW_HE[view] || ''}</div>`;
  const art = wrap.querySelector('.art-in');
  for (const id of markers) {
    const a = (ANCHORS[view] || {})[id]; if (!a) continue;
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'fmk'; m.dataset.mk = id;
    // the badge sits on the control's upper-outer edge so it doesn't cover what is printed on it
    const off = Math.max(a.r || 2.5, 2.5) * 0.72;
    const fx = (a.x - X0) / W, fy = (a.y - Y0) / H;
    m.style.left = ((a.x - X0 + (fx < 0.5 ? -off : off)) / W * 100) + '%';
    m.style.top = ((a.y - Y0 - off) / H * 100) + '%';
    m.setAttribute('aria-label', PARTS[id].he);
    m.textContent = numbering.get(id);
    m.addEventListener('click', () => focusPart(wrap.closest('.fig'), id));
    art.append(m);
  }
  art.addEventListener('click', (e) => { const g = e.target.closest('[data-part]'); if (g && PARTS[g.dataset.part]) focusPart(wrap.closest('.fig'), g.dataset.part); });
  return wrap;
}

/** 3D lens figure (lazy-loads three.js). */
export function lensFigure(hl = [], opts = {}) {
  const wrap = document.createElement('div'); wrap.className = 'lens3d-fig';
  wrap.innerHTML = `<div class="l3"><div class="l3-load">טוען את העדשה…</div></div>
    <div class="l3-views" role="group" aria-label="זווית צפייה">
      <button type="button" data-v="side" aria-pressed="true">מהצד</button><button type="button" data-v="three-quarter">באלכסון</button>
      <button type="button" data-v="front">מקדימה</button><button type="button" data-v="rear">מאחור</button></div>
    <div class="l3-read" dir="rtl"></div><div class="cap">גררו את העדשה כדי לסובב אותה, וגררו על טבעת כדי לסובב את הטבעת.</div>`;
  const read = wrap.querySelector('.l3-read');
  const show = (s) => { read.innerHTML = `זום <b dir="ltr">${Math.round(s.focal)} mm</b> · טבעת צמצם <b dir="ltr">${s.ring === 'A' ? 'A' : 'F' + s.ring}</b> · <b dir="ltr">${s.afmf}</b> · קליקים <b dir="ltr">${s.clicks ? 'ON' : 'OFF'}</b>`; };
  let L = null;
  const io = new IntersectionObserver(async (ents) => {
    if (!ents.some(e => e.isIntersecting) || L) return;
    io.disconnect();
    try {
      const { createLens3D } = await import('./lens3d.js');
      const host = wrap.querySelector('.l3'); host.innerHTML = '';
      L = await createLens3D(host, { focal: opts.focal || 35, ring: 'A', view: opts.view || 'side', interactive: true, highlight: hl, onChange: show });
      show(L.state);
      wrap.querySelectorAll('.l3-views button').forEach(b => b.addEventListener('click', () => {
        wrap.querySelectorAll('.l3-views button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); L.setView(b.dataset.v);
      }));
      const fig = wrap.closest('.fig'); if (fig) fig.addEventListener('partfocus', (e) => { if (LENS_IDS.has(e.detail)) L.highlight([e.detail]); });
      const mo = new MutationObserver(() => { if (!wrap.isConnected) { L.dispose(); mo.disconnect(); } });
      mo.observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
    } catch (e) {
      console.error(e); wrap.querySelector('.l3').innerHTML = '<div class="l3-load">לא ניתן להציג את העדשה התלת-ממדית במכשיר הזה.</div>';
    }
  }, { rootMargin: '200px' });
  io.observe(wrap);
  return wrap;
}

/** Explorer page with all body views. */
export function renderExplorer(host) {
  const tabs = [['rear', 'גב'], ['top', 'למעלה'], ['front', 'חזית'], ['side', 'צד ושקעים'], ['bottom', 'תחתית']];
  host.innerHTML = `<div class="seg-tabs" role="tablist">${tabs.map(([v, l], i) => `<button type="button" role="tab" data-v="${v}" aria-selected="${i === 0}">${l}</button>`).join('')}</div><div class="exp-body"></div>`;
  const body = host.querySelector('.exp-body');
  const show = (v) => {
    host.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v)));
    body.innerHTML = '';
    renderParts(body, v, Object.keys(ANCHORS[v] || {}).filter(id => PARTS[id]), { noHL: true });
  };
  host.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  show('rear');
}
