// Interactive explainers for the course. renderDiagram(host, kind, props) — plain SVG + small controls.
// Physics: 36×24 mm sensor, CoC 0.03 mm, FE 24-50mm F2.8 G (F2.8–F22, MFD 0.19/0.30 m, 0.30×, 11 blades).
import { irisSVG } from './lens-art.js';

export const DIAGRAM_KINDS = ['stops', 'aperture', 'shutter', 'iso', 'exposure-triangle', 'metering', 'af-areas', 'fov',
  'crop-vs-zoom', 'perspective', 'dof', 'magnification', 'hyperfocal', 'wb', 'histogram'];

const CSS = `
.dg{display:grid;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0;color:var(--ink)}
.dg svg{width:100%;height:auto;display:block;max-width:min(100%,560px);margin-inline:auto;direction:ltr}
.dg .ctl{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.dg .ctl label{display:flex;align-items:center;gap:8px;flex:1 1 200px;min-width:0;font-size:.9rem;color:var(--mute)}
.dg .ctl input[type=range]{flex:1;min-width:0;accent-color:var(--accent);direction:ltr}
.dg .seg{display:flex;flex-wrap:wrap;gap:4px}
.dg .seg button{background:var(--panel-2);border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:4px 10px;font:inherit;font-size:.86rem;cursor:pointer}
.dg .seg button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#111}
.dg .read{font-variant-numeric:tabular-nums;font-size:.95rem}
.dg .read b{color:var(--accent);font-weight:600}
.dg .note{font-size:.86rem;color:var(--mute);margin:0}
.dg .ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.dg .row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;min-width:0}
.dg .card{background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:8px;min-width:0}
.dg .card h4{margin:0 0 4px;font-size:.9rem;font-weight:600}
.dg .card p{margin:4px 0 0;font-size:.82rem;color:var(--mute)}
.dg svg text{font-family:inherit}
.dg svg text[text-anchor=middle]:not([direction]){direction:rtl}
.dg .iris{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.dg .iris svg{width:min(150px,40vw)}
`;
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById('dg-style')) return;
  const s = document.createElement('style'); s.id = 'dg-style'; s.textContent = CSS; document.head.append(s);
}

const SKY = 'var(--sky,#7fb3ff)';
const L = (v) => (/[\u0590-\u05FF]/.test(String(v)) ? `<bdi>${v}</bdi>` : `<span class="ltr">${v}</span>`);
const fmtT = (t) => (t >= 0.4 ? (Math.round(t * 10) / 10) + '"' : '1/' + Math.round(1 / t));
const fF = (n) => 'F' + (Number.isInteger(n) ? n : n.toFixed(1));
const fmtM = (m) => (m === Infinity || m > 9999 ? '∞' : m < 1 ? (m * 100).toFixed(0) + ' ס"מ' : m < 10 ? m.toFixed(2) + ' מ\'' : m.toFixed(1) + ' מ\'');
const C = 0.03;

function dofCalc(f, N, sM, c = C) {
  const s = sM * 1000, H = f * f / (N * c) + f;
  const near = s * (H - f) / (H + s - 2 * f);
  const far = s < H ? s * (H - f) / (H - s) : Infinity;
  return { near: near / 1000, far: far / 1000, H: H / 1000 };
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function root(host, kind) {
  ensureStyle();
  host.innerHTML = '';
  const d = document.createElement('div');
  d.className = `dg dg-${kind}`;
  host.append(d);
  return d;
}
function seg(opts, cur, onPick, label) {
  const w = document.createElement('div'); w.className = 'seg'; w.setAttribute('role', 'group'); if (label) w.setAttribute('aria-label', label);
  const btns = opts.map(([v, txt]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dir = 'auto'; b.innerHTML = txt;
    b.addEventListener('click', () => { btns.forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onPick(v); });
    b.setAttribute('aria-pressed', String(v === cur)); w.append(b); return b;
  });
  return w;
}
function slider(labelHtml, aria, min, max, step, val, onInput) {
  const lab = document.createElement('label');
  lab.innerHTML = `<span>${labelHtml}</span>`;
  const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
  r.setAttribute('aria-label', aria);
  r.addEventListener('input', () => onInput(Number(r.value)));
  lab.append(r); return lab;
}
function ctlRow(...kids) { const c = document.createElement('div'); c.className = 'ctl'; kids.forEach(k => c.append(k)); return c; }
function div(cls, html = '') { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; }

/* ---------------------------------------------------------------- stops */
function stops(d) {
  const SH = [1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15];
  const AP = [22, 16, 11, 8, 5.6, 4, 2.8];
  const IS = [100, 200, 400, 800, 1600, 3200, 6400];
  let k = 3;
  const svg = div(''); const read = div('read');
  const draw = () => {
    const col = (arr, i, fmt, x, title, dir) => {
      let s = `<text x="${x}" y="16" text-anchor="middle" font-size="12" fill="var(--mute)">${title}</text>`;
      arr.forEach((v, j) => {
        const y = 30 + j * 26, on = j === i;
        s += `<rect x="${x - 46}" y="${y}" width="92" height="22" rx="5" fill="${on ? 'var(--accent)' : 'var(--panel-2)'}" stroke="var(--line)"/>
        <text x="${x}" y="${y + 15}" text-anchor="middle" font-size="12" fill="${on ? '#111' : 'var(--ink)'}" direction="ltr">${fmt(v)}</text>`;
      });
      s += `<text x="${x}" y="${30 + arr.length * 26 + 14}" text-anchor="middle" font-size="10" fill="var(--mute)">${dir}</text>`;
      return s;
    };
    const iS = Math.min(k, SH.length - 1), iA = Math.min(k, AP.length - 1), iI = Math.min(k, IS.length - 1);
    // light bar: relative light of shutter step k vs 1/125 → 2^(k-3)
    const rel = Math.pow(2, k - 3);
    svg.innerHTML = `<svg viewBox="0 0 360 250" role="img" aria-label="סולם סטופים">
      ${col(SH, iS, fmtT, 62, 'תריס', '↓ כל שלב: פי 2 אור')}
      ${col(AP, iA, fF, 180, 'צמצם', '↓ כל שלב: פי 2 אור')}
      ${col(IS, iI, v => 'ISO ' + v, 298, 'ISO', '↓ כל שלב: פי 2 בהירות')}
      <rect x="20" y="232" width="320" height="10" rx="5" fill="var(--panel-2)"/>
      <rect x="20" y="232" width="${Math.min(320, 320 * rel / 8)}" height="10" rx="5" fill="var(--accent)"/></svg>`;
    read.innerHTML = `שלב ${L(k + 1)} מתוך 7. לעומת ${L('1/125')}: ${L(rel >= 1 ? '×' + rel : '÷' + (1 / rel))} אור בתריס. כל צעד בכל עמודה = סטופ אחד = הכפלה או חצייה של כמות האור.`;
  };
  d.append(svg, ctlRow(slider('צעד סטופ', 'שלב בסולם', 0, 6, 1, k, v => { k = v; draw(); })), read,
    div('note', 'סטופ הוא שפה משותפת: סטופ אחד בתריס = סטופ אחד בצמצם = סטופ אחד ב-ISO. המצלמה מאפשרת גם צעדים של שליש סטופ ביניהם.'));
  draw();
}

/* ---------------------------------------------------------------- aperture */
function aperture(d) {
  const FS = [2.8, 4, 5.6, 8, 11, 16, 22];
  let N = 2.8;
  const top = div('iris'); const read = div('read'); const bar = div('');
  const draw = () => {
    const light = Math.pow(2.8 / N, 2);
    const z = dofCalc(50, N, 2);
    top.innerHTML = irisSVG(N, 150) + `<div class="read">${L(fF(N))}<br>כמות אור: ${L((light * 100).toFixed(light < 0.1 ? 1 : 0) + '%')} מ-${L('F2.8')}<br>
      קוטר הפתח ב-50 מ"מ: ${L((50 / N).toFixed(1) + ' מ"מ')}</div>`;
    const lo = Math.log(1), hi = Math.log(4);
    const X = (m) => 10 + 340 * (Math.log(Math.min(4, Math.max(1, m))) - lo) / (hi - lo);
    bar.innerHTML = `<svg viewBox="0 0 360 64" role="img" aria-label="עומק שדה ב-50 מ&quot;מ ממרחק 2 מטר">
      <rect x="10" y="18" width="340" height="16" rx="4" fill="var(--panel-2)"/>
      <rect x="${X(z.near)}" y="18" width="${Math.max(2, X(z.far) - X(z.near))}" height="16" fill="var(--af)" opacity=".55"/>
      <line x1="${X(2)}" x2="${X(2)}" y1="12" y2="40" stroke="var(--accent)" stroke-width="2"/>
      ${[1, 1.5, 2, 3, 4].map(m => `<text x="${X(m)}" y="54" font-size="10" text-anchor="middle" fill="var(--mute)" direction="ltr">${m}m</text>`).join('')}
      <text x="350" y="11" font-size="10" text-anchor="start" direction="rtl" fill="var(--mute)">עומק שדה ב-50 מ"מ, פוקוס על 2 מ'</text></svg>`;
    read.innerHTML = `אזור חד: ${L(fmtM(z.near))} עד ${L(fmtM(z.far))} (${L(((z.far - z.near) * 100).toFixed(0) + ' ס"מ')})`;
  };
  d.append(top, ctlRow(seg(FS.map(f => [f, fF(f)]), N, v => { N = v; draw(); }, 'בחירת צמצם')), bar, read,
    div('note', 'מספר F קטן = פתח גדול = יותר אור ורקע מטושטש. 11 להבים מעוגלים שומרים על פתח כמעט עגול גם כשסוגרים, ולכן הבוקה עגול.'));
  draw();
}

/* ---------------------------------------------------------------- shutter */
function shutter(d) {
  const TS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1];
  let i = 6, focal = 24, steady = true;
  const svg = div(''), read = div('read');
  const draw = () => {
    const t = TS[i];
    // cyclist at 20 km/h (5.6 m/s), 10 m away, 24 mm: image speed = v*f/d on sensor → px on a 3000 px-wide frame
    const v = 5.6, dist = 10;
    const sensorMMs = v * 1000 * focal / (dist * 1000);   // mm/s on sensor
    const pxPerMM = 300 / 36;                           // drawing scale: frame 300 px = 36 mm
    const smear = Math.min(280, sensorMMs * t * pxPerMM);
    const safe = 1 / focal, eff = steady ? safe * Math.pow(2, 5) : safe;
    const risk = t > eff;
    const r = rng(7); let drops = '';
    for (let k = 0; k < 14; k++) { const x = 40 + r() * 280, y = 24 + r() * 50, len = Math.min(60, 3 + 900 * t * (0.6 + r())); drops += `<line x1="${x}" x2="${x}" y1="${y}" y2="${y + len}" stroke="${SKY}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`; }
    svg.innerHTML = `<svg viewBox="0 0 360 210" role="img" aria-label="מריחת תנועה לפי מהירות תריס">
      <rect x="30" y="16" width="300" height="80" rx="6" fill="var(--panel-2)"/>
      <text x="324" y="30" font-size="10" text-anchor="start" direction="rtl" fill="var(--mute)">מים נופלים</text>${drops}
      <rect x="30" y="108" width="300" height="70" rx="6" fill="var(--panel-2)"/>
      <text x="324" y="122" font-size="10" text-anchor="start" direction="rtl" fill="var(--mute)">רוכב אופניים, 20 קמ"ש, 10 מ'</text>
      <rect x="${60}" y="144" width="${Math.max(14, smear + 14)}" height="18" rx="9" fill="var(--accent)" opacity="${smear > 6 ? .55 : 1}"/>
      <circle cx="${67 + smear}" cy="153" r="9" fill="var(--accent)"/>
      <text x="180" y="200" font-size="12" text-anchor="middle" fill="${risk ? 'var(--warn)' : 'var(--af)'}">${risk ? 'סיכון לרעידת יד' : 'בטוח ביד'} ב-${focal} מ"מ${steady ? ' עם SteadyShot' : ' בלי ייצוב'}</text></svg>`;
    read.innerHTML = `תריס ${L(fmtT(t))}. הרוכב זז על החיישן ${L((sensorMMs * t).toFixed(2) + ' מ"מ')} בזמן החשיפה (~${L(Math.round(sensorMMs * t / 36 * 7008) + ' px')} מתוך 7008). כלל אצבע ביד: לפחות ${L('1/' + focal)}; SteadyShot נותן כמה סטופים נוספים, אבל לא עוצר תנועה של הנושא.`;
  };
  d.append(svg,
    ctlRow(slider('מהירות תריס', 'מהירות תריס', 0, TS.length - 1, 1, i, v => { i = v; draw(); })),
    ctlRow(seg([[24, '24 מ"מ'], [50, '50 מ"מ']], focal, v => { focal = v; draw(); }, 'אורך מוקד'),
      seg([[true, 'SteadyShot On'], [false, 'Off']], steady, v => { steady = v; draw(); }, 'ייצוב')),
    read);
  draw();
}

/* ---------------------------------------------------------------- iso */
function iso(d) {
  const IS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200];
  let i = 0;
  const svg = div(''), read = div('read');
  const draw = () => {
    const I = IS[i];
    // shot-noise model: relative noise ∝ sqrt(ISO/100) at the same final brightness
    const amp = 0.012 * Math.sqrt(I / 100);
    const r = rng(42); let px = '';
    const cols = 48, rows = 18, w = 340 / cols, h = 90 / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const base = 0.12 + 0.76 * x / (cols - 1);
      const vv = Math.max(0, Math.min(1, base + gauss(r) * amp * Math.sqrt(1 / Math.max(base, 0.08)) * 0.35));
      const cr = gauss(r) * amp * 0.25, cb = gauss(r) * amp * 0.25;
      const R = Math.round(255 * Math.max(0, Math.min(1, vv + cr))), G = Math.round(255 * vv), B = Math.round(255 * Math.max(0, Math.min(1, vv + cb)));
      px += `<rect x="${10 + x * w}" y="${20 + y * h}" width="${w + .2}" height="${h + .2}" fill="rgb(${R},${G},${B})"/>`;
    }
    const snr = Math.sqrt(0.18 * 52000 * 100 / I / 4.8);
    svg.innerHTML = `<svg viewBox="0 0 360 140" role="img" aria-label="דוגמת רעש ב-ISO ${I}">${px}
      <text x="10" y="128" font-size="10" fill="var(--mute)">צללים</text><text x="350" y="128" font-size="10" text-anchor="end" fill="var(--mute)">אורות</text>
      <text x="180" y="14" font-size="11" text-anchor="middle" fill="var(--ink)" direction="ltr">ISO ${I}</text></svg>`;
    read.innerHTML = `ISO ${L(I)}: יחס אות/רעש באפור-ביניים כ-${L(Math.round(snr) + ':1')}. ${I <= 1600 ? 'נקי מאוד בחיישן הזה.' : I <= 6400 ? 'גרעיניות עדינה, מצוין לרוב השימושים.' : I <= 12800 ? 'רעש נראה בצללים.' : 'רעש בולט וצבעים מתמזגים: רק כשאין ברירה.'}`;
  };
  d.append(svg, ctlRow(slider('ISO', 'ISO', 0, IS.length - 1, 1, i, v => { i = v; draw(); })), read,
    div('note', 'ISO לא מוסיף אור. הוא רק מגביר את האות שכבר נקלט. פחות אור על החיישן = פחות פוטונים = יותר רעש, ולכן הרעש בא בעצם מהחושך.'));
  draw();
}

/* ---------------------------------------------------------------- exposure triangle */
function triangle(d) {
  const FS = [2.8, 3.5, 4, 5.6, 8, 11, 16, 22], TS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1];
  const IS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
  let fi = 4, ti = 3, ii = 0, scene = 15;
  const svg = div(''), read = div('read');
  const draw = () => {
    const N = FS[fi], t = TS[ti], I = IS[ii];
    const ev = Math.log2(N * N / t) - Math.log2(I / 100);
    const err = Math.max(-3.4, Math.min(3.4, scene - ev));   // + = brighter
    const X = (v) => 180 + v * 46;
    let ticks = '';
    for (let v = -3; v <= 3; v++) ticks += `<line x1="${X(v)}" x2="${X(v)}" y1="150" y2="${v % 3 === 0 ? 162 : 158}" stroke="var(--ink)"/><text x="${X(v)}" y="176" font-size="10" text-anchor="middle" fill="var(--mute)" direction="ltr">${v > 0 ? '+' + v : v}</text>`;
    const dofTxt = N <= 4 ? 'רקע מטושטש' : N >= 11 ? 'הכל חד' : 'עומק בינוני';
    const motTxt = t <= 1 / 500 ? 'מקפיא תנועה' : t >= 1 / 30 ? 'מריחת תנועה' : 'תנועה רגילה';
    const noiseTxt = I <= 800 ? 'נקי' : I <= 6400 ? 'גרעין עדין' : 'רעש';
    svg.innerHTML = `<svg viewBox="0 0 360 190" role="img" aria-label="משולש החשיפה">
      <polygon points="180,14 62,128 298,128" fill="none" stroke="var(--line)" stroke-width="2"/>
      <circle cx="180" cy="14" r="7" fill="var(--accent)"/><text x="180" y="40" text-anchor="middle" font-size="12" fill="var(--ink)" direction="ltr">${fF(N)}</text>
      <text x="180" y="54" text-anchor="middle" font-size="10" fill="var(--mute)">${dofTxt}</text>
      <circle cx="62" cy="128" r="7" fill="${SKY}"/><text x="72" y="110" font-size="12" fill="var(--ink)" direction="ltr">${fmtT(t)}</text>
      <text x="72" y="98" font-size="10" fill="var(--mute)">${motTxt}</text>
      <circle cx="298" cy="128" r="7" fill="var(--af)"/><text x="288" y="110" text-anchor="end" font-size="12" fill="var(--ink)" direction="ltr">ISO ${I}</text>
      <text x="288" y="98" text-anchor="end" font-size="10" fill="var(--mute)">${noiseTxt}</text>
      <line x1="${X(-3)}" x2="${X(3)}" y1="150" y2="150" stroke="var(--ink)"/>${ticks}
      <polygon points="${X(err)},146 ${X(err) - 6},136 ${X(err) + 6},136" fill="${Math.abs(err) <= 0.5 ? 'var(--af)' : 'var(--warn)'}"/></svg>`;
    read.innerHTML = `הצירוף נותן ${L('EV ' + ev.toFixed(1))}; הסצנה דורשת ${L('EV ' + scene)}. ${Math.abs(err) <= 0.5 ? '<b>חשיפה נכונה.</b>' : err > 0 ? `בהיר מדי ב-${L(err.toFixed(1))} סטופ.` : `כהה מדי ב-${L((-err).toFixed(1))} סטופ.`}`;
  };
  d.append(ctlRow(seg([[15, 'שמש EV15'], [12, 'צל EV12'], [7, 'פנים EV7'], [3, 'לילה EV3']], scene, v => { scene = v; draw(); }, 'סוג אור')), svg,
    ctlRow(slider('צמצם', 'צמצם', 0, FS.length - 1, 1, fi, v => { fi = v; draw(); }), slider('תריס', 'מהירות תריס', 0, TS.length - 1, 1, ti, v => { ti = v; draw(); }),
      slider('ISO', 'ISO', 0, IS.length - 1, 1, ii, v => { ii = v; draw(); })), read);
  draw();
}

/* ---------------------------------------------------------------- metering */
function metering(d) {
  let mode = 'multi';
  const svg = div(''), read = div('read');
  const TXT = {
    multi: ['Multi', 'מחלק את הפריים להרבה אזורים ומשקלל. עם Face Priority פנים מקבלות משקל. בתאורה אחורית: פשרה, האדם עדיין מעט כהה.', -0.7],
    center: ['Center', 'ממוצע של כל המסך עם דגש על המרכז. האדם במרכז, אז החשיפה מתבהרת.', +0.3],
    spot: ['Spot', 'מודד רק את העיגול הקטן. על הפנים: הפנים נכונות, השמיים נשרפים.', +1.6],
    average: ['Entire Screen Avg.', 'ממוצע של כל המסך. השמיים הבהירים מושכים את החשיפה למטה: האדם יוצא צללית.', -1.4],
    highlight: ['Highlight', 'מגן על האזורים הבהירים. השמיים נשמרים, האדם כמעט שחור. טוב לשקיעות ובמה.', -2.4],
  };
  const draw = () => {
    const [name, txt, shift] = TXT[mode];
    const k = Math.pow(2, shift);
    const lum = (v) => Math.round(255 * Math.min(1, Math.pow(Math.min(1, v * k), 1 / 2.2)));
    const sky = lum(0.95), ground = lum(0.12), person = lum(0.05);
    let overlay = '';
    if (mode === 'multi') for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) overlay += `<rect x="${30 + x * 50}" y="${14 + y * 40}" width="50" height="40" fill="none" stroke="var(--accent)" stroke-opacity=".5"/>`;
    if (mode === 'center') overlay = `<ellipse cx="180" cy="94" rx="80" ry="58" fill="var(--accent)" opacity=".18" stroke="var(--accent)"/>`;
    if (mode === 'spot') overlay = `<circle cx="180" cy="86" r="11" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    if (mode === 'average') overlay = `<rect x="30" y="14" width="300" height="160" fill="var(--accent)" opacity=".14"/>`;
    if (mode === 'highlight') overlay = `<rect x="30" y="14" width="300" height="80" fill="var(--accent)" opacity=".2"/>`;
    svg.innerHTML = `<svg viewBox="0 0 360 190" role="img" aria-label="מדידת אור ${name}">
      <rect x="30" y="14" width="300" height="100" fill="rgb(${sky},${sky},${Math.min(255, sky + 8)})"/>
      <circle cx="270" cy="50" r="16" fill="rgb(255,255,${Math.min(255, sky)})"/>
      <rect x="30" y="114" width="300" height="60" fill="rgb(${ground},${ground + 6},${ground})"/>
      <circle cx="180" cy="86" r="16" fill="rgb(${person + 10},${person},${person})"/><rect x="160" y="102" width="40" height="72" rx="14" fill="rgb(${person},${person},${person + 4})"/>
      ${overlay}<text x="180" y="186" font-size="11" text-anchor="middle" fill="var(--mute)" direction="ltr">${name}: ${shift > 0 ? '+' : ''}${shift.toFixed(1)} EV</text></svg>`;
    read.innerHTML = `<b>${name}</b>: ${txt}`;
  };
  d.append(ctlRow(seg(Object.entries(TXT).map(([k, v]) => [k, v[0]]), mode, v => { mode = v; draw(); }, 'מצב מדידה')), svg, read,
    div('note', 'הדוגמה: אדם מול שמיים בהירים. כל מצב מדידה "מסתכל" על אזור אחר ולכן בוחר חשיפה אחרת. אין מצב "נכון": בוחרים לפי מה שחשוב בתמונה.'));
  draw();
}

/* ---------------------------------------------------------------- af areas */
function afAreas(d) {
  let a = 'wide';
  const svg = div(''), read = div('read');
  const TX = {
    wide: ['Wide', 'המצלמה בוחרת בעצמה בכל הפריים. עם זיהוי נושא היא תמצא עין. מהיר, אבל לפעמים בוחרת דבר אחר ממה שרציתם.'],
    zone: ['Zone', 'אתם בוחרים אזור (בערך תשיעית מהמסך), המצלמה בוחרת בתוכו.'],
    center: ['Center Fix', 'רק במרכז. מקדים, נועלים בחצי לחיצה ומסדרים קומפוזיציה מחדש.'],
    spotS: ['Spot S', 'נקודה קטנה שאתם מזיזים. לפרטים קטנים: עין, אבקן של פרח, ענף בין עלים.'],
    spotM: ['Spot M', 'נקודה בינונית: האיזון הכי נוח לרוב הצילומים.'],
    spotL: ['Spot L', 'נקודה גדולה: קל יותר לנושא קצת זז.'],
    expand: ['Expand Spot', 'Spot, ואם אין שם מספיק ניגודיות המצלמה נעזרת בנקודות סביבו.'],
    tracking: ['Tracking', 'זמין ב-AF-C בלבד: מתחילים מנקודה, והמסגרת עוקבת אחרי הנושא כשהוא זז.'],
  };
  const draw = () => {
    let o = '';
    const g = 'var(--af)';
    if (a === 'wide') { for (let y = 0; y < 7; y++) for (let x = 0; x < 11; x++) o += `<rect x="${44 + x * 25}" y="${24 + y * 21}" width="21" height="17" fill="none" stroke="var(--mute)" stroke-opacity=".35"/>`; o += `<rect x="169" y="58" width="18" height="16" fill="none" stroke="${g}" stroke-width="2"/>`; }
    if (a === 'zone') o = `<rect x="140" y="56" width="90" height="62" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/><rect x="169" y="66" width="18" height="16" fill="none" stroke="${g}" stroke-width="2"/>`;
    if (a === 'center') o = `<rect x="168" y="80" width="24" height="24" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
    const sp = { spotS: 12, spotM: 20, spotL: 30, expand: 20 }[a];
    if (sp) { o = `<rect x="${176 - sp / 2}" y="${70 - sp / 2}" width="${sp}" height="${sp}" fill="none" stroke="var(--ink)" stroke-width="2"/>`; if (a === 'expand') o += `<rect x="${176 - sp * 1.5}" y="${70 - sp * 1.5}" width="${sp * 3}" height="${sp * 3}" fill="none" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".7"/>`; }
    if (a === 'tracking') o = `<path d="M110 120 Q 150 70 176 70" fill="none" stroke="${g}" stroke-dasharray="4 4"/><rect x="164" y="58" width="24" height="24" fill="none" stroke="${g}" stroke-width="2"/><rect x="98" y="108" width="24" height="24" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>`;
    svg.innerHTML = `<svg viewBox="0 0 360 200" role="img" aria-label="אזור פוקוס ${TX[a][0]}">
      <rect x="30" y="14" width="300" height="172" rx="4" fill="var(--panel-2)" stroke="var(--line)"/>
      <circle cx="178" cy="72" r="14" fill="var(--mute)" opacity=".7"/><rect x="160" y="88" width="36" height="70" rx="12" fill="var(--mute)" opacity=".55"/>
      <rect x="250" y="40" width="40" height="120" fill="var(--line)"/>${o}</svg>`;
    read.innerHTML = `<b>${TX[a][0]}</b>: ${TX[a][1]}`;
  };
  d.append(ctlRow(seg(Object.entries(TX).map(([k, v]) => [k, v[0]]), a, v => { a = v; draw(); }, 'אזור פוקוס')), svg, read);
  draw();
}

/* ---------------------------------------------------------------- fov */
function fov(d) {
  const FS = [24, 28, 35, 50]; let f = 24;
  const svg = div(''), read = div('read');
  const ang = (f, s = 36) => 2 * Math.atan(s / (2 * f)) * 180 / Math.PI;
  const draw = () => {
    const cx = 180, cy = 176, R = 150;
    let wedges = '';
    for (const k of FS) {
      const a = ang(k) / 2 * Math.PI / 180, on = k === f;
      const x1 = cx - R * Math.sin(a), x2 = cx + R * Math.sin(a), y = cy - R * Math.cos(a);
      wedges += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y.toFixed(1)} Z" fill="${on ? 'var(--accent)' : 'none'}" fill-opacity="${on ? .2 : 0}" stroke="${on ? 'var(--accent)' : 'var(--line)'}" stroke-width="${on ? 2 : 1}"/>`;
    }
    const a = ang(f) / 2 * Math.PI / 180;
    wedges += `<text x="${cx}" y="${cy - 40}" font-size="13" text-anchor="middle" fill="var(--accent)" direction="ltr">${ang(f).toFixed(1)}°</text>
      <path d="M${cx - 34 * Math.sin(a)} ${cy - 34 * Math.cos(a)} A 34 34 0 0 1 ${cx + 34 * Math.sin(a)} ${cy - 34 * Math.cos(a)}" fill="none" stroke="var(--accent)"/>`;
    let frames = ''; const W0 = 240, H0 = 160, fx = 60, fy = 206;
    for (const k of FS) {
      const sc = 24 / k, on = k === f;
      frames += `<rect x="${fx + 120 - W0 * sc / 2}" y="${fy + 80 - H0 * sc / 2}" width="${W0 * sc}" height="${H0 * sc}" fill="${on ? 'var(--accent)' : 'none'}" fill-opacity="${on ? .15 : 0}" stroke="${on ? 'var(--accent)' : 'var(--mute)'}" stroke-width="${on ? 2 : 1}"/>
        <text x="${fx + 120 + W0 * sc / 2 - 4}" y="${fy + 80 - H0 * sc / 2 + 12}" font-size="10" text-anchor="end" fill="${on ? 'var(--accent)' : 'var(--mute)'}" direction="ltr">${k}</text>`;
    }
    svg.innerHTML = `<svg viewBox="0 0 360 380" role="img" aria-label="זווית ראייה ב-${f} מ&quot;מ">
      <text x="${cx}" y="14" font-size="11" text-anchor="middle" fill="var(--mute)">מבט מלמעלה: הזווית האופקית</text>
      ${wedges}<rect x="${cx - 10}" y="${cy - 2}" width="20" height="12" rx="2" fill="var(--ink)"/>
      <rect x="${fx}" y="${fy}" width="${W0}" height="${H0}" fill="var(--panel-2)" stroke="var(--line)"/>${frames}
      <text x="180" y="${fy + H0 + 14}" font-size="11" text-anchor="middle" fill="var(--mute)">מה נכנס לפריים בכל אורך מוקד</text></svg>`;
    read.innerHTML = `${L(f + ' מ"מ')}: אופקי ${L(ang(f).toFixed(1) + '°')}, אנכי ${L(ang(f, 24).toFixed(1) + '°')}, אלכסוני ${L(ang(f, 43.27).toFixed(1) + '°')}. ${f === 50 ? 'רואים כרבע מהשטח של 24 מ"מ.' : ''}`;
  };
  d.append(ctlRow(seg(FS.map(k => [k, k + ' מ"מ']), f, v => { f = v; draw(); }, 'אורך מוקד')), svg, read);
  draw();
}

/* ---------------------------------------------------------------- crop vs zoom */
function cropZoom(d) {
  let f = 50;
  const svg = div(''), read = div('read');
  const draw = () => {
    const s = 24 / f, mp = 33 * s * s;
    const scene = (ox, w, h, sc, label, pix) => {
      const cx = ox + w / 2, cy = 10 + h / 2;
      const P = (x, y) => `${(cx + x * sc).toFixed(1)} ${(cy + y * sc).toFixed(1)}`;
      return `<g><clipPath id="cz${ox}"><rect x="${ox}" y="10" width="${w}" height="${h}"/></clipPath>
        <g clip-path="url(#cz${ox})">
          <rect x="${ox}" y="10" width="${w}" height="${h}" fill="${SKY}" opacity=".35"/>
          <path d="M${P(-100, 8)} L${P(-50, -36)} L${P(-5, 2)} L${P(35, -26)} L${P(100, 8)} Z" fill="var(--mute)" opacity=".6"/>
          <rect x="${cx - 100 * sc}" y="${cy + 8 * sc}" width="${200 * sc}" height="${60 * sc}" fill="var(--af)" opacity=".35"/>
          <circle cx="${cx}" cy="${cy - 2 * sc}" r="${4 * sc}" fill="var(--accent)"/><rect x="${cx - 4 * sc}" y="${cy + 2 * sc}" width="${8 * sc}" height="${17 * sc}" rx="${3 * sc}" fill="var(--accent)"/>
          ${pix ? `<pattern id="px${ox}" width="${pix}" height="${pix}" patternUnits="userSpaceOnUse"><rect width="${pix}" height="${pix}" fill="none" stroke="var(--panel)" stroke-opacity=".55" stroke-width=".7"/></pattern><rect x="${ox}" y="10" width="${w}" height="${h}" fill="url(#px${ox})"/>` : ''}
        </g><rect x="${ox}" y="10" width="${w}" height="${h}" fill="none" stroke="var(--line)"/>
        <text x="${cx}" y="${h + 28}" font-size="11" text-anchor="middle" fill="var(--ink)">${label}</text></g>`;
    };
    svg.innerHTML = `<svg viewBox="0 0 360 160" role="img" aria-label="זום מול חיתוך">
      ${scene(190, 160, 110, 0.75 / s, `זום אופטי ל-${f} מ"מ · 33MP`, 0)}${scene(10, 160, 110, 0.75 / s, `חיתוך מ-24 מ"מ · ${mp.toFixed(1)}MP`, f > 24 ? 2.2 / s * 0.9 : 0)}</svg>`;
    read.innerHTML = `הפרספקטיבה זהה בשתי התמונות, כי המצלמה לא זזה. ההבדל הוא ברזולוציה: חיתוך של פריים 24 מ"מ למסגרת של ${L(f + ' מ"מ')} משאיר ${L(mp.toFixed(1) + ' MP')} מתוך 33, וזום אופטי שומר על כל ${L('33 MP')}.`;
  };
  d.append(svg, ctlRow(slider('אורך מוקד', 'אורך מוקד', 24, 50, 1, f, v => { f = v; draw(); })), read);
  draw();
}

/* ---------------------------------------------------------------- perspective */
function perspective(d) {
  let mode = 24;
  const svg = div(''), read = div('read');
  const draw = () => {
    // subject kept same height: distance 1 m at 24 mm, 2.08 m at 50 mm. Building 30 m behind subject, 10 m tall.
    const f = mode, dist = f === 24 ? 1 : 1 * 50 / 24;
    const bgDist = dist + 30;
    const bgH = 10 * (f / bgDist) * 2.2;
    const frameW = 160;
    const bgPx = bgH * 2.6, bgW = bgPx * 1.6;      // image size on the sensor ∝ f / distance
    svg.innerHTML = `<svg viewBox="0 0 360 200" role="img" aria-label="פרספקטיבה">
      <rect x="100" y="14" width="${frameW}" height="${frameW / 1.5}" fill="${SKY}" opacity=".3" stroke="var(--line)"/>
      <rect x="${180 - bgW / 2}" y="${14 + frameW / 1.5 - 18 - bgPx}" width="${bgW}" height="${bgPx}" fill="var(--mute)" opacity=".7"/>
      <rect x="100" y="${14 + frameW / 1.5 - 18}" width="${frameW}" height="18" fill="var(--af)" opacity=".35"/>
      <circle cx="180" cy="${14 + frameW / 1.5 - 66}" r="9" fill="var(--accent)"/><rect x="171" y="${14 + frameW / 1.5 - 57}" width="18" height="40" rx="7" fill="var(--accent)"/>
      <line x1="20" x2="340" y1="168" y2="168" stroke="var(--line)"/>
      <rect x="20" y="162" width="12" height="12" fill="var(--ink)"/><text x="26" y="190" font-size="10" text-anchor="middle" fill="var(--mute)">מצלמה</text>
      <circle cx="${32 + dist * 40}" cy="168" r="5" fill="var(--accent)"/><text x="${32 + dist * 40}" y="190" font-size="10" text-anchor="middle" fill="var(--mute)" direction="ltr">${dist.toFixed(1)}m</text>
      <rect x="320" y="156" width="14" height="12" fill="var(--mute)"/><text x="327" y="190" font-size="10" text-anchor="middle" fill="var(--mute)" direction="ltr">+30m</text></svg>`;
    read.innerHTML = `${L(f + ' מ"מ')} ממרחק ${L(dist.toFixed(1) + ' מ\'')}: האדם באותו גודל, אבל הבניין ברקע ${f === 50 ? 'גדול כמעט פי 2' : 'קטן ורחוק'}. מה שמשנה פרספקטיבה הוא <b>המרחק</b>, לא אורך המוקד.`;
  };
  d.append(ctlRow(seg([[24, '24 מ"מ, 1 מ\''], [50, '50 מ"מ, 2.1 מ\'']], mode, v => { mode = v; draw(); }, 'צירוף')), svg, read);
  draw();
}

/* ---------------------------------------------------------------- dof */
function dofDiagram(d, props) {
  let f = props.focal || 50, N = props.N || 2.8, s = props.dist || 2;
  const FS = [2.8, 3.5, 4, 5.6, 8, 11, 16, 22];
  let ni = Math.max(0, FS.findIndex(x => Math.abs(x - N) < 0.05)); if (ni < 0) ni = 0;
  const svg = div(''), read = div('read');
  const lo = Math.log(0.2), hi = Math.log(100);
  const X = (m) => 40 + 300 * (Math.log(Math.min(100, Math.max(0.2, m))) - lo) / (hi - lo);
  const draw = () => {
    N = FS[ni];
    const z = dofCalc(f, N, s);
    const farX = z.far === Infinity ? 352 : X(z.far);
    svg.innerHTML = `<svg viewBox="0 0 360 150" role="img" aria-label="עומק שדה">
      <rect x="10" y="56" width="22" height="24" rx="3" fill="var(--ink)"/><rect x="32" y="62" width="8" height="12" fill="var(--mute)"/>
      <polygon points="40,68 ${X(s)},30 ${X(s)},106" fill="var(--accent)" opacity=".08"/>
      <rect x="${X(z.near)}" y="30" width="${Math.max(2, farX - X(z.near))}" height="76" fill="var(--af)" opacity=".28"/>
      <line x1="${X(s)}" x2="${X(s)}" y1="24" y2="112" stroke="var(--accent)" stroke-width="2"/>
      <text x="${X(s)}" y="18" font-size="10" text-anchor="middle" fill="var(--accent)">פוקוס</text>
      ${z.H < 100 ? `<line x1="${X(z.H)}" x2="${X(z.H)}" y1="30" y2="106" stroke="${SKY}" stroke-dasharray="3 3"/><text x="${X(z.H)}" y="122" font-size="9" text-anchor="middle" fill="${SKY}">H</text>` : ''}
      <line x1="40" x2="350" y1="130" y2="130" stroke="var(--line)"/>
      ${[0.2, 0.5, 1, 2, 5, 10, 30, 100].map(m => `<line x1="${X(m)}" x2="${X(m)}" y1="127" y2="133" stroke="var(--mute)"/><text x="${X(m)}" y="145" font-size="9" text-anchor="middle" fill="var(--mute)" direction="ltr">${m}m</text>`).join('')}</svg>`;
    read.innerHTML = `${L(f + ' מ"מ')} · ${L(fF(N))} · פוקוס ${L(fmtM(s))}: חד מ-${L(fmtM(z.near))} עד ${L(fmtM(z.far))}${z.far === Infinity ? '' : ` (${L(fmtM(z.far - z.near))})`}. מרחק היפר-פוקלי ${L(fmtM(z.H))}.`;
  };
  d.append(svg, ctlRow(slider('אורך מוקד', 'אורך מוקד', 24, 50, 1, f, v => { f = v; draw(); }), slider('צמצם', 'צמצם', 0, FS.length - 1, 1, ni, v => { ni = v; draw(); }),
    slider('מרחק', 'מרחק פוקוס', 0, 100, 1, Math.round(100 * (Math.log(s) - Math.log(0.2)) / (Math.log(30) - Math.log(0.2))), v => { s = Math.exp(Math.log(0.2) + (Math.log(30) - Math.log(0.2)) * v / 100); draw(); })),
    read, div('note', 'החישוב לפי מעגל טשטוש של 0.03 מ"מ (הדפסה רגילה). שימו לב: האזור החד מתפרש יותר מאחורי נקודת הפוקוס מאשר לפניה.'));
  draw();
}

/* ---------------------------------------------------------------- magnification */
function magnification(d) {
  let f = 50;
  const svg = div(''), read = div('read');
  const draw = () => {
    // 50 mm: 0.30× at 0.30 m (AF). 24 mm at 0.19 m: m ≈ f/(s−2f) approximation with thin lens using MFD from sensor
    const s = f === 50 ? 300 : 190;
    const m = f === 50 ? 0.30 : Math.min(0.3, f / (s - 2 * f) * 0.9);
    const W = 36 / m, H = 24 / m;
    const sc = Math.min(1, 220 / W, 104 / H);   // drawing units per mm
    svg.innerHTML = `<svg viewBox="0 0 360 168" role="img" aria-label="שטח הצילום בהגדלה מרבית">
      <rect x="20" y="20" width="${W * sc}" height="${H * sc}" fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)"/>
      <text x="${20 + W * sc / 2}" y="${20 + H * sc + 14}" font-size="10" text-anchor="middle" fill="var(--accent)" direction="ltr">${W.toFixed(0)}×${H.toFixed(0)} mm</text>
      <rect x="270" y="20" width="${36 * sc}" height="${24 * sc}" fill="var(--ink)"/><text x="${270 + 18 * sc}" y="${36 + 24 * sc}" font-size="10" text-anchor="middle" fill="var(--mute)">חיישן 36×24</text>
      <line x1="20" x2="${20 + 100 * sc}" y1="148" y2="148" stroke="var(--ink)"/>
      ${[0, 50, 100].map(v => `<line x1="${20 + v * sc}" x2="${20 + v * sc}" y1="144" y2="152" stroke="var(--ink)"/><text x="${20 + v * sc}" y="${162}" font-size="9" text-anchor="middle" fill="var(--mute)" direction="ltr">${v / 10}cm</text>`).join('')}</svg>`;
    read.innerHTML = `${L(f + ' מ"מ')} במרחק המינימלי ${L((s / 1000).toFixed(2) + ' מ\'')} מסימון החיישן: הגדלה ${f === 50 ? '' : 'בערך '}${L('×' + m.toFixed(2))}, שטח בפריים כ-${L(W.toFixed(0) + '×' + H.toFixed(0) + ' מ"מ')}. ${f === 50 ? 'ב-50 מ"מ יש יותר מרחק עבודה (כ-20 ס"מ מקצה העדשה) ופחות צל של המצלמה על הפרח.' : 'ב-24 מ"מ קצה העדשה כמעט נוגע בנושא ומטיל צל.'}`;
  };
  d.append(ctlRow(seg([[50, '50 מ"מ · 0.30 מ\''], [24, '24 מ"מ · 0.19 מ\'']], f, v => { f = v; draw(); }, 'אורך מוקד')), svg, read,
    div('note', 'הגדלה מרבית: 0.30× ב-AF ו-0.33× ב-MF. כלומר פרח בקוטר 3 ס"מ יתפוס כ-9 מ"מ על חיישן ברוחב 36 מ"מ.'));
  draw();
}

/* ---------------------------------------------------------------- hyperfocal */
function hyperfocal(d) {
  let f = 24, ni = 2;
  const FS = [5.6, 8, 11, 16];
  const svg = div(''), read = div('read'), table = div('');
  const lo = Math.log(0.5), hi = Math.log(100);
  const X = (m) => 30 + 310 * (Math.log(Math.min(100, Math.max(0.5, m))) - lo) / (hi - lo);
  table.innerHTML = `<div style="overflow-x:auto"><table class="read" style="border-collapse:collapse;width:100%;font-size:.86rem;direction:rtl">
    <tr><th style="text-align:right;padding:4px">אורך מוקד</th>${FS.map(n => `<th style="padding:4px">${L(fF(n))}</th>`).join('')}</tr>
    ${[24, 35, 50].map(ff => `<tr><td style="padding:4px;border-top:1px solid var(--line)">${L(ff + ' מ"מ')}</td>${FS.map(n => `<td style="padding:4px;border-top:1px solid var(--line);text-align:center">${L(dofCalc(ff, n, 10).H.toFixed(1) + ' מ\'')}</td>`).join('')}</tr>`).join('')}
  </table></div>`;
  const draw = () => {
    const N = FS[ni], H = dofCalc(f, N, 10).H;
    svg.innerHTML = `<svg viewBox="0 0 360 90" role="img" aria-label="מרחק היפר-פוקלי">
      <rect x="${X(H / 2)}" y="20" width="${352 - X(H / 2)}" height="34" fill="var(--af)" opacity=".3"/>
      <line x1="${X(H)}" x2="${X(H)}" y1="14" y2="60" stroke="var(--accent)" stroke-width="2"/><text x="${X(H)}" y="11" font-size="10" text-anchor="middle" fill="var(--accent)">H</text>
      <text x="352" y="42" font-size="12" text-anchor="end" fill="var(--ink)">∞</text>
      <line x1="30" x2="350" y1="70" y2="70" stroke="var(--line)"/>
      ${[0.5, 1, 2, 5, 10, 20, 50, 100].map(m => `<text x="${X(m)}" y="84" font-size="9" text-anchor="middle" fill="var(--mute)" direction="ltr">${m}m</text>`).join('')}</svg>`;
    read.innerHTML = `${L('H = f²/(N·c) + f')} = ${L(H.toFixed(2) + ' מ\'')}. מקדו על ${L(H.toFixed(1) + ' מ\'')} וכל מה שבין ${L((H / 2).toFixed(1) + ' מ\'')} לאינסוף יהיה חד.`;
  };
  d.append(svg, ctlRow(seg([[24, '24 מ"מ'], [35, '35 מ"מ'], [50, '50 מ"מ']], f, v => { f = v; draw(); }, 'אורך מוקד'),
    seg(FS.map((n, i) => [i, fF(n)]), ni, v => { ni = v; draw(); }, 'צמצם')), read, table);
  draw();
}

/* ---------------------------------------------------------------- white balance */
function kelvinRGB(K) {
  const t = K / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  return [r, g, b].map(v => Math.max(1, Math.min(255, v)));
}
function wb(d) {
  const LIGHTS = [[1900, 'נר'], [3200, 'נורת להט'], [3500, 'שקיעה'], [5500, 'אור יום'], [6500, 'מעונן'], [7500, 'צל']];
  let light = 3200, set = 5500;
  const svg = div(''), read = div('read');
  const lo = 1500, hi = 10000, X = (k) => 20 + 320 * (k - lo) / (hi - lo);
  const draw = () => {
    let grad = '';
    for (let k = 1500; k <= 10000; k += 500) grad += `<stop offset="${(k - lo) / (hi - lo)}" stop-color="rgb(${kelvinRGB(k).map(Math.round).join(',')})"/>`;
    const a = kelvinRGB(light), b = kelvinRGB(set);
    const card = a.map((v, i) => v / b[i]); const m = Math.max(...card);
    const rgb = card.map(v => Math.round(240 * v / m));
    svg.innerHTML = `<svg viewBox="0 0 360 150" role="img" aria-label="איזון לבן">
      <defs><linearGradient id="dgK">${grad}</linearGradient></defs>
      <rect x="20" y="20" width="320" height="16" rx="4" fill="url(#dgK)"/>
      ${LIGHTS.map(([k, n], i) => `<line x1="${X(k)}" x2="${X(k)}" y1="38" y2="${i % 2 ? 56 : 46}" stroke="var(--ink)"/><text x="${X(k)}" y="${i % 2 ? 68 : 58}" font-size="10" text-anchor="middle" fill="${k === light ? 'var(--accent)' : 'var(--mute)'}">${n}</text>`).join('')}
      <polygon points="${X(set)},18 ${X(set) - 5},10 ${X(set) + 5},10" fill="var(--ink)"/>
      <text x="${X(set)}" y="8" font-size="9" text-anchor="middle" fill="var(--ink)" direction="ltr">WB ${set}K</text>
      <rect x="110" y="78" width="140" height="60" rx="6" fill="rgb(${rgb.join(',')})" stroke="var(--line)"/>
      <text x="180" y="112" font-size="11" text-anchor="middle" fill="#333">כרטיס לבן</text></svg>`;
    const diff = set - light;
    read.innerHTML = `אור: ${L(light + 'K')}, הגדרת WB: ${L(set + 'K')}. ${Math.abs(diff) < 300 ? '<b>הלבן יוצא לבן.</b>' : diff > 0 ? 'ההגדרה גבוהה מהאור: התמונה יוצאת חמה (כתומה).' : 'ההגדרה נמוכה מהאור: התמונה יוצאת קרה (כחולה).'}`;
  };
  d.append(ctlRow(seg(LIGHTS.map(([k, n]) => [k, n]), light, v => { light = v; draw(); }, 'מקור אור')), svg,
    ctlRow(slider('WB במצלמה (K)', 'טמפרטורת צבע במצלמה', 2500, 9900, 100, set, v => { set = v; draw(); })), read);
  draw();
}

/* ---------------------------------------------------------------- histogram */
function histogram(d) {
  const EX = [
    ['תת-חשיפה', 'הגרף נדחס לשמאל ונוגע בקיר. פרטים בצללים הולכים לאיבוד.', (x) => Math.exp(-((x - 0.12) ** 2) / 0.006) + 0.25 * Math.exp(-((x - 0.3) ** 2) / 0.01), 'L'],
    ['חשיפה תקינה', 'הגרף פרוש לאורך הטווח ולא נחתך באף צד.', (x) => 0.6 * Math.exp(-((x - 0.35) ** 2) / 0.02) + 0.8 * Math.exp(-((x - 0.6) ** 2) / 0.015) + 0.2, ''],
    ['חשיפת-יתר', 'הגרף נדחס לימין ועמוד גבוה בקצה: אזורים לבנים לגמרי, בלי מידע.', (x) => Math.exp(-((x - 0.85) ** 2) / 0.008) + (x > 0.98 ? 3 : 0), 'R'],
    ['ניגודיות גבוהה', 'שני הרים בקצוות: צללים עמוקים ושמיים בהירים. אולי צריך DRO או לבחור מה חשוב.', (x) => Math.exp(-((x - 0.06) ** 2) / 0.003) + Math.exp(-((x - 0.94) ** 2) / 0.003) + 0.08, 'LR'],
  ];
  const wrap = div('row2');
  for (const [name, txt, fn, clip] of EX) {
    let pts = ''; let mx = 0; const vals = [];
    for (let i = 0; i <= 60; i++) { const v = fn(i / 60); vals.push(v); mx = Math.max(mx, v); }
    vals.forEach((v, i) => { pts += `${(4 + i / 60 * 152).toFixed(1)},${(64 - Math.min(1, v / mx) * 56).toFixed(1)} `; });
    const c = div('card');
    c.innerHTML = `<h4>${name}</h4><svg viewBox="0 0 160 70" role="img" aria-label="היסטוגרמה: ${name}">
      <rect x="4" y="6" width="152" height="58" fill="var(--panel)" stroke="var(--line)"/>
      <polygon points="4,64 ${pts}156,64" fill="var(--ink)" opacity=".85"/>
      ${clip.includes('L') ? '<rect x="4" y="6" width="3" height="58" fill="var(--warn)"/>' : ''}${clip.includes('R') ? '<rect x="153" y="6" width="3" height="58" fill="var(--warn)"/>' : ''}</svg><p>${txt}</p>`;
    wrap.append(c);
  }
  d.append(wrap, div('note', 'שמאל = שחור, ימין = לבן, הגובה = כמה פיקסלים בכל בהירות. אין צורה "נכונה" אחת; מה שחשוב הוא לא לחתוך את הקצוות במקום שיש בו פרטים שאכפת לכם מהם.'));
}

/* ---------------------------------------------------------------- dispatcher */
const MAP = {
  'stops': stops, 'aperture': aperture, 'shutter': shutter, 'iso': iso, 'exposure-triangle': triangle, 'metering': metering,
  'af-areas': afAreas, 'fov': fov, 'crop-vs-zoom': cropZoom, 'perspective': perspective, 'dof': dofDiagram,
  'magnification': magnification, 'hyperfocal': hyperfocal, 'wb': wb, 'histogram': histogram,
};

export function renderDiagram(host, kind, props = {}) {
  const d = root(host, kind);
  const fn = MAP[kind];
  if (!fn) { d.append(div('note', 'תרשים בהכנה')); return d; }
  fn(d, props || {});
  return d;
}
