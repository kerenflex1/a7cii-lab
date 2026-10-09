// Course shell: routing, home, lessons, lab, explorers, progress.
import COURSE from './course/index.js';
import { Sim, SCENE_LIST, stopActive } from './sim.js';
import { renderParts, renderExplorer, lensFigure } from './figures.js';
import { bodySVG } from './camera-art.js';
import { PARTS } from './parts.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const done = () => store.get('a7c2.done', {});
const markDone = (id) => { const d = done(); d[id] = Date.now(); store.set('a7c2.done', d); updateProgress(); };

const LESSONS = [];
COURSE.forEach(ch => ch.lessons.forEach(l => LESSONS.push({ ...l, ch })));
const lessonIdx = (id) => LESSONS.findIndex(l => l.id === id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let diagramsMod = null;
async function diagrams() {
  if (!diagramsMod) { try { diagramsMod = await import('./diagrams.js'); } catch (e) { diagramsMod = { renderDiagram: (h) => { h.innerHTML = '<p class="note">התרשים לא נטען.</p>'; } }; } }
  return diagramsMod;
}

/* ---------- routing ---------- */
function route() {
  stopActive();
  const h = (location.hash || '#home').slice(1);
  document.querySelectorAll('.nav a').forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + h || (h.startsWith('l-') && a.getAttribute('href') === '#course'))));
  if (h.startsWith('l-')) renderLesson(h.slice(2));
  else if (h === 'lab') renderLab();
  else if (h === 'camera') renderCameraPage();
  else if (h === 'lens') renderLensPage();
  else if (h === 'credits') renderCredits();
  else if (h === 'course') renderHome(true);
  else renderHome();
  window.scrollTo(0, 0);
  store.set('a7c2.last', h);
}
window.addEventListener('hashchange', route);

function updateProgress() {
  const d = done(); const n = LESSONS.filter(l => d[l.id]).length;
  const p = $('#progress'); if (p) { p.style.setProperty('--p', (n / LESSONS.length * 100).toFixed(1) + '%'); p.title = `${n} מתוך ${LESSONS.length} שיעורים`; $('#progress-n').textContent = `${n}/${LESSONS.length}`; }
}

/* ---------- home ---------- */
function renderHome(scrollToCourse) {
  const d = done();
  const next = LESSONS.find(l => !d[l.id]) || LESSONS[0];
  const total = LESSONS.reduce((s, l) => s + (l.minutes || 6), 0);
  main.innerHTML = `
  <section class="hero">
    <div class="hero-txt">
      <div class="eyebrow">קורס מעשי · ${COURSE.length} פרקים · ${LESSONS.length} שיעורים · כ-${Math.round(total / 60)} שעות</div>
      <h1>ללמוד לצלם עם<br><span dir="ltr">α7C II</span> ועדשת <span dir="ltr">24–50mm F2.8 G</span></h1>
      <p>מאפס ועד שליטה מלאה. כל כפתור במקום האמיתי שלו, כל מושג עם מספרים אמיתיים, ותרגול בסימולטור שמחשב את התמונה כמו החיישן והעדשה: עומק שדה, חשיפה, רעש, רעידה ותנועה.</p>
      <div class="cta-row">
        <a class="cta" href="#l-${next.id}">${Object.keys(d).length ? 'להמשיך' : 'להתחיל'}: ${esc(next.title)}</a>
        <a class="cta ghost" href="#lab">למעבדת הצילום</a>
      </div>
    </div>
    <div class="hero-art">
      <div class="hero-body">${bodySVG('rear', { screen: true })}<div class="hero-screen" style="background-image:url(scenes/kyoto/poster.jpg)"></div></div>
      <div class="hero-lens"></div>
    </div>
  </section>
  <section class="quick">
    <a href="#camera" class="qcard"><div class="qart">${bodySVG('top')}</div><div><b>הכירו את המצלמה</b><span>כל כפתור וחוגה, על צילום אמיתי</span></div></a>
    <a href="#lens" class="qcard"><div class="qart qlens"></div><div><b>הכירו את העדשה</b><span>טבעות, מתגים ו-11 להבי צמצם</span></div></a>
    <a href="#lab" class="qcard"><img src="scenes/night/poster.jpg" alt=""><div><b>מעבדה חופשית</b><span>7 סצנות: פורטרט, פרח, נוף, לילה, שמש, מים, כלב</span></div></a>
  </section>
  <section class="course" id="course-list">
    <h2>מסלול הלימוד</h2>
    ${COURSE.map(ch => {
      const n = ch.lessons.filter(l => d[l.id]).length;
      return `<details class="chapter" ${ch.lessons.some(l => l.id === next.id) ? 'open' : ''}>
        <summary><span class="chnum">${ch.num}</span><span class="cht"><b>${esc(ch.title)}</b><span>${esc(ch.subtitle || '')}</span></span><span class="chp">${n}/${ch.lessons.length}</span></summary>
        <ol class="lessons">${ch.lessons.map(l => `<li class="${d[l.id] ? 'done' : ''}"><a href="#l-${l.id}"><span class="lid" dir="ltr">${l.id}</span><span class="lt">${esc(l.title)}</span><span class="lm">${l.minutes || 6} דק'</span></a></li>`).join('')}</ol>
      </details>`;
    }).join('')}
  </section>
  <footer class="foot"><a href="#credits">מקורות, קרדיטים ורישיונות</a></footer>`;
  $('.hero-lens').append(lensFigure([], { focal: 35, view: 'three-quarter' }));
  import('./lens3d.js').then(m => m.renderLensStill({ view: 'side', focal: 50 })).then(url => { const q = $('.qlens'); if (q && url) q.innerHTML = `<img src="${url}" alt="">`; }).catch(() => {});
  import('./camera-art.js').then(({ SLOTS, VIEWBOX }) => {
    const sl = SLOTS.rear.lcd, [X0, Y0, W, H] = VIEWBOX.rear, sc = $('.hero-screen');
    if (sc) Object.assign(sc.style, { left: (sl.x - X0) / W * 100 + '%', top: (sl.y - Y0) / H * 100 + '%', width: sl.w / W * 100 + '%', height: sl.h / H * 100 + '%' });
  });
  if (scrollToCourse) $('#course-list').scrollIntoView();
}

/* ---------- lesson ---------- */
async function renderLesson(id) {
  const i = lessonIdx(id);
  if (i < 0) { location.hash = '#home'; return; }
  const L = LESSONS[i], prev = LESSONS[i - 1], next = LESSONS[i + 1];
  main.innerHTML = `
  <article class="lesson">
    <nav class="crumbs"><a href="#course">מסלול הלימוד</a> › <span>פרק ${L.ch.num}: ${esc(L.ch.title)}</span></nav>
    <header class="l-head">
      <div class="eyebrow" dir="rtl">שיעור <bdi>${L.id}</bdi> · ${L.minutes || 6} דקות</div>
      <h1>${esc(L.title)}</h1>
      ${L.goal ? `<p class="goal"><b>בסוף השיעור:</b> ${L.goal}</p>` : ''}
    </header>
    <div class="blocks"></div>
    <footer class="l-foot">
      <button type="button" class="cta done-btn">${done()[L.id] ? 'השיעור הושלם ✓' : 'סיימתי את השיעור'}</button>
      <div class="pn">${prev ? `<a href="#l-${prev.id}" class="pn-a">→ ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#l-${next.id}" class="pn-a">${esc(next.title)} ←</a>` : '<a href="#lab" class="pn-a">למעבדה ←</a>'}</div>
    </footer>
  </article>`;
  const host = $('.blocks');
  for (const b of L.blocks) host.append(await renderBlock(b, L));
  $('.done-btn').addEventListener('click', (e) => { markDone(L.id); e.target.textContent = 'השיעור הושלם ✓'; if (next) setTimeout(() => (location.hash = '#l-' + next.id), 350); });
  document.title = `${L.title} · מעבדת α7C II`;
}

async function renderBlock(b, L) {
  const div = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; return d; };
  switch (b.t) {
    case 'p': return div('b-p', `<p>${b.html}</p>`);
    case 'h': return div('b-h', `<h2>${esc(b.text)}</h2>`);
    case 'tip': return div('call tip', `<b class="ct">טיפ</b><div>${b.html}</div>`);
    case 'warn': return div('call warn', `<b class="ct">טעות נפוצה</b><div>${b.html}</div>`);
    case 'pro': return div('call pro', `<b class="ct">למתקדמים</b><div>${b.html}</div>`);
    case 'steps': return div('b-steps', `<ol>${b.items.map(x => `<li>${x}</li>`).join('')}</ol>`);
    case 'menu': {
      const path = b.path.map((p, i) => `<span class="mp ${i === 0 ? 'm0' : ''}">${esc(p)}</span>`).join('<span class="msep">›</span>');
      return div('b-menu', `<div class="mrow" dir="ltr">${path}${b.value ? `<span class="msep">›</span><span class="mv">${esc(b.value)}</span>` : ''}</div>${b.note ? `<div class="mnote">${b.note}</div>` : ''}`);
    }
    case 'table': return div('b-table', `<div class="tscroll"><table><thead><tr>${b.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    case 'recipe': return div('b-recipe', `<div class="rt">${esc(b.title)}</div><dl>${b.items.map(([k, v]) => `<dt>${k}</dt><dd dir="auto">${v}</dd>`).join('')}</dl>`);
    case 'parts': {
      const d = div('b-parts'); renderParts(d, b.view, b.show || [], {});
      if (b.caption) d.append(div('cap', b.caption));
      return d;
    }
    case 'diagram': {
      const d = div('b-diagram'); const m = await diagrams();
      try { m.renderDiagram(d, b.kind, b.props || {}); } catch (e) { console.error(e); d.innerHTML = '<p class="note">התרשים לא נטען.</p>'; }
      return d;
    }
    case 'quiz': {
      const d = div('b-quiz', `<div class="qq">${b.q}</div><div class="qo">${b.options.map((o, i) => `<button type="button" data-i="${i}">${o}</button>`).join('')}</div><div class="qe" hidden></div>`);
      d.querySelectorAll('.qo button').forEach(btn => btn.addEventListener('click', () => {
        const ok = +btn.dataset.i === b.answer;
        d.querySelectorAll('.qo button').forEach(x => { x.disabled = true; if (+x.dataset.i === b.answer) x.classList.add('right'); });
        if (!ok) btn.classList.add('wrong');
        const e = d.querySelector('.qe'); e.hidden = false; e.innerHTML = `<b>${ok ? 'נכון!' : 'לא בדיוק.'}</b> ${b.explain || ''}`;
      }));
      return d;
    }
    case 'sim': return simBlock(b, L);
    default: return div('note', '');
  }
}

function simBlock(b, L) {
  const d = document.createElement('div'); d.className = 'b-sim';
  const sc = SCENE_LIST.find(s => s.id === b.scene) || { he: b.scene };
  const poster = () => {
    d.innerHTML = `<div class="sim-poster" style="background-image:url(scenes/${b.scene}/poster.jpg)">
      <div class="sp-in"><div class="eyebrow">תרגול בסימולטור · ${sc.he}</div><p>${b.task ? b.task.text : 'נסו בעצמכם.'}</p>
      <button type="button" class="cta">פתחו את המצלמה</button></div></div>`;
    d.querySelector('button').addEventListener('click', open);
  };
  const open = () => {
    d.innerHTML = '';
    const host = document.createElement('div'); d.append(host);
    const sim = new Sim(host, { scene: b.scene, preset: b.preset, lock: b.lock, task: b.task, hint: b.hint, onStop: () => poster() });
    sim.start(b.scene);
    host.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  poster();
  return d;
}

/* ---------- lab ---------- */
function renderLab() {
  const last = store.get('a7c2.labScene', 'kyoto');
  main.innerHTML = `<section class="labpage">
    <header class="l-head"><div class="eyebrow">מעבדה חופשית</div><h1>מעבדת הצילום</h1>
    <p class="goal">בחרו סצנה וצלמו בלי משימה. כל המספרים אמיתיים: חיישן 33MP, העדשה 24–50mm F2.8, חשיפה, רעש ועומק שדה מחושבים לכל פיקסל.</p></header>
    <nav class="scene-chips">${SCENE_LIST.map(s => `<button type="button" class="chip" data-id="${s.id}" aria-pressed="${s.id === last}">${s.he}</button>`).join('')}</nav>
    <div class="lab-sim"></div></section>`;
  const sim = new Sim($('.lab-sim'), { scene: last });
  sim.start(last);
  document.querySelectorAll('.scene-chips .chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.scene-chips .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    store.set('a7c2.labScene', c.dataset.id); sim.hideReview(); sim.loadScene(c.dataset.id);
  }));
  document.title = 'מעבדת הצילום · α7C II';
}

function renderCameraPage() {
  main.innerHTML = `<section class="explorer"><header class="l-head"><div class="eyebrow">הכרת הגוף</div><h1>המצלמה: Sony α7C II</h1>
    <p class="goal">לחצו על מספר, על חלק בשרטוט או על שם ברשימה כדי לראות מה הוא עושה. השרטוטים נמדדו מצילומים של הגוף ובקנה מידה של 124×71.1 מ"מ.</p></header><div class="exp"></div></section>`;
  renderExplorer($('.exp'));
  document.title = 'המצלמה · α7C II';
}
function renderLensPage() {
  main.innerHTML = `<section class="explorer"><header class="l-head"><div class="eyebrow">הכרת העדשה</div><h1>העדשה: FE 24–50mm F2.8 G</h1>
    <p class="goal">מודל תלת-ממדי בקנה מידה (Ø74.8 מ"מ, 72.3–92.3 מ"מ אורך). גררו כדי לסובב את העדשה. גררו על טבעת הזום וראו את העדשה מתארכת, ועל טבעת הצמצם וראו את 11 הלהבים נסגרים.</p></header>
    <div class="exp"></div>
    <div class="spec card"><h2>מפרט</h2><dl class="kv">
      <dt>אורך מוקד</dt><dd>24–50 מ"מ (זווית אלכסונית 84°–47°)</dd><dt>צמצם</dt><dd>F2.8 קבוע עד F22, 11 להבים מעוגלים</dd>
      <dt>מרחק פוקוס מינימלי</dt><dd>AF: 0.19 מ' (24) / 0.30 מ' (50) · MF: 0.18 / 0.29 מ'</dd><dt>הגדלה מרבית</dt><dd>0.30× (AF) · 0.33× (MF)</dd>
      <dt>מבנה אופטי</dt><dd>16 עדשות ב-13 קבוצות, 4 אספריות, 2 ED</dd><dt>פילטר</dt><dd>67 מ"מ</dd><dt>משקל ומידות</dt><dd>440 גרם · Ø74.8 × 92.3 מ"מ</dd>
      <dt>ייצוב</dt><dd>אין בעדשה. הייצוב בגוף (IBIS, עד 7 סטופים)</dd><dt>מגן אור</dt><dd>ALC-SH178</dd></dl></div></section>`;
  const ids = Object.entries(PARTS).filter(([, p]) => p.view === 'lens').map(([id]) => id);
  renderParts($('.exp'), 'lens', ids, { focal: 24, noHL: true });
  document.title = 'העדשה · FE 24-50mm F2.8 G';
}

async function renderCredits() {
  const rows = [];
  for (const s of SCENE_LIST) {
    try { const m = await (await fetch(`scenes/${s.id}/scene.json`)).json(); const c = m.credit || {}; rows.push(`<li><b>${s.he}</b>: <a href="${c.url}" target="_blank" rel="noopener">${esc(c.title || '')}</a>, ${esc(c.author || '')} · ${esc(c.source || '')} · ${esc(c.license || '')}</li>`); } catch { /* skip */ }
  }
  main.innerHTML = `<section class="credits"><header class="l-head"><h1>מקורות וקרדיטים</h1></header>
    <h2>תמונות הסצנות</h2><ul>${rows.join('')}</ul>
    <h2>המצלמה</h2><p>שרטוטים וקטוריים מקוריים. קווי המתאר נמדדו מצילומי CC0 של גוף ה-α7CR (זהה ל-α7C II) מ-Wikimedia Commons.</p>
    <h2>העדשה</h2><p>מודל תלת-ממדי מקורי (three.js) לפי מפרט Sony, נבנה בהשוואה לצילומי ביקורת (Photography Blog, Phillip Reeve) ששימשו כרפרנס בלבד.</p>
    <h2>עומק ופיזיקה</h2><p>מפות העומק חושבו עם Apple Depth Pro. פנורמות HDR מ-Poly Haven (CC0). המידע על התפריטים והכפתורים: Sony Help Guide ל-ILCE-7CM2.</p>
    <p class="note">זהו פרויקט לימודי פרטי, ללא קשר רשמי ל-Sony.</p></section>`;
}

/* ---------- boot ---------- */
updateProgress();
route();
