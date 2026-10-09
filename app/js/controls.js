// Every adjustable thing on the α7C II + FE 24-50mm F2.8 G, described the way the real camera works:
// which physical control does it in the current mode, what values it has, and when the camera decides instead of you.
import * as C from './camera.js';

const range = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(Math.round(v * 100) / 100); return r; };
const near = (list, v) => { let b = 0; list.forEach((x, i) => { if (Math.abs(Math.log2(x / v)) < Math.abs(Math.log2(list[b] / v))) b = i; }); return b; };
const idxOf = (list, v) => { const i = list.findIndex(x => x === v || (typeof x === 'number' && typeof v === 'number' && Math.abs(x - v) < 0.02)); return i < 0 ? 0 : i; };
const fmtD = (m) => (m >= 199 ? '∞' : m < 1 ? m.toFixed(2) : m < 10 ? m.toFixed(1) : Math.round(m) + '');
const RING = ['A', 22, 20, 18, 16, 14, 13, 11, 10, 9, 8, 7.1, 6.3, 5.6, 5, 4.5, 4, 3.5, 3.2, 2.8];
const RING_PRINTED = new Set(['A', 22, 16, 11, 8, 5.6, 4, 2.8]);

export const WHERE = {
  'mode-dial': { view: 'top', part: 'mode-dial', he: 'גלגל המצבים', en: 'Mode dial', note: 'למעלה, ליד כפתור הצילום' },
  'front-dial': { view: 'top', part: 'front-dial', he: 'החוגה הקדמית', en: 'Front dial', note: 'מתחת לכפתור הצילום, באצבע המורה' },
  'rear-dial-l': { view: 'rear', part: 'rear-dial-l', he: 'חוגה אחורית L', en: 'Rear dial L', note: 'בגב, מתחת לאגודל' },
  'rear-dial-r': { view: 'top', part: 'rear-dial-r', he: 'חוגה אחורית R', en: 'Rear dial R', note: 'החוגה הגדולה בפינה העליונה' },
  'wheel-iso': { view: 'rear', part: 'wheel-iso', he: 'ISO בגלגל השליטה', en: 'Control wheel: ISO', note: 'לוחצים על הצד הימני של הגלגל, ובוחרים בחוגה' },
  'fn': { view: 'rear', part: 'fn', he: 'תפריט Fn', en: 'Fn button', note: 'Fn ← בוחרים פריט ← משנים בחוגה הקדמית' },
  'zoom-ring': { view: 'lens', part: 'zoom-ring', he: 'טבעת הזום', en: 'Zoom ring', note: 'הטבעת האמצעית בעדשה' },
  'focus-ring': { view: 'lens', part: 'focus-ring', he: 'טבעת הפוקוס', en: 'Focus ring', note: 'הטבעת הקדמית בעדשה' },
  'aperture-ring': { view: 'lens', part: 'aperture-ring', he: 'טבעת הצמצם', en: 'Aperture ring', note: 'הטבעת הקרובה לגוף המצלמה' },
  'afmf-switch': { view: 'lens', part: 'afmf-switch', he: 'מתג AF/MF', en: 'Focus mode switch', note: 'בצד שמאל של העדשה' },
};

/** sim: the Sim instance. Returns the ordered list of controls. */
export function buildControls(sim) {
  const st = sim.st;
  const exp = () => sim.exp || { N: 2.8, t: 1 / 125, iso: 100 };
  const ringSet = () => st.apertureRing !== 'A';
  const lockMsg = { ok: false, lock: true, why: 'ההגדרה הזו נעולה בתרגיל הזה, כדי שתתמקדו במה שחשוב בו.' };
  const fnList = (k) => (sim.FN.find(i => i.k === k) || { opts: () => [] }).opts();
  const goMode = (m) => ({ label: `עברו למצב ${m}`, run: () => { if (sim.locked('mode')) return sim.toast('גלגל המצבים נעול בתרגיל'); st.mode = m; st.shift = 0; sim.markDirty(); } });

  const list = [
    {
      id: 'mode', group: 'body', name: 'מצב צילום', en: 'Mode', style: 'dial',
      where: () => WHERE['mode-dial'],
      items: () => C.MODES.map(m => ({ label: m })),
      index: () => C.MODES.indexOf(st.mode),
      set: (i) => { st.mode = C.MODES[i]; st.shift = 0; },
      enabled: () => (sim.locked('mode') ? lockMsg : { ok: true }),
      chip: () => st.mode === 'AUTO' ? 'AUTO' : st.mode,
      big: () => ({ AUTO: 'AUTO · אוטומטי מלא', P: 'P · Program', A: 'A · עדיפות צמצם', S: 'S · עדיפות תריס', M: 'M · ידני' })[st.mode],
    },
    {
      id: 'aperture', group: 'body', name: 'צמצם', en: 'Aperture', style: 'dial',
      where: () => ringSet() ? WHERE['aperture-ring'] : (st.mode === 'P' ? { ...WHERE['front-dial'], note: 'ב-P החוגה הקדמית עושה Program Shift: בוחרים צמצם והמצלמה מתאימה תריס' } : st.mode === 'A' ? { ...WHERE['front-dial'], note: 'מתחת לכפתור הצילום. במצב A גם חוגה אחורית L עושה את זה' } : WHERE['front-dial']),
      items: () => C.APERTURES.map(n => ({ label: n < 10 ? n.toFixed(1) : String(n) })),
      index: () => near(C.APERTURES, exp().N),
      set: (i) => {
        const v = C.APERTURES[i];
        if (st.mode === 'P') { const base = exp().N / Math.pow(2, (st.shift || 0) / 6); st.shift = Math.max(-12, Math.min(12, Math.round(6 * Math.log2(v / base)))); }
        else st.ai = i;
      },
      enabled: () => {
        if (sim.locked('ap')) return lockMsg;
        if (ringSet()) return { ok: false, why: `טבעת הצמצם בעדשה על F${st.apertureRing}, אז היא קובעת את הצמצם והחוגה לא פעילה.`, act: { label: 'החזירו את הטבעת ל-A', run: () => { st.apertureRing = 'A'; sim.markDirty(); } } };
        if (st.mode === 'AUTO') return { ok: false, why: 'ב-AUTO המצלמה בוחרת הכל.', act: goMode('A') };
        if (st.mode === 'S') return { ok: false, why: 'במצב S אתם בוחרים תריס, והמצלמה בוחרת את הצמצם בשבילכם.', act: goMode('A') };
        return { ok: true };
      },
      auto: () => ['AUTO', 'S'].includes(st.mode) && !ringSet(),
      chip: () => C.fmtF(exp().N),
      big: () => C.fmtF(exp().N),
    },
    {
      id: 'shutter', group: 'body', name: 'תריס', en: 'Shutter', style: 'dial',
      where: () => st.mode === 'M' ? { ...WHERE['rear-dial-l'], note: 'בגב מתחת לאגודל. ב-M היא קובעת תריס והקדמית צמצם' } : WHERE['front-dial'],
      items: () => C.SHUTTERS.map(t => ({ label: C.fmtShutter(t) })),
      index: () => near(C.SHUTTERS, exp().t),
      set: (i) => { st.si = i; },
      enabled: () => {
        if (sim.locked('sh')) return lockMsg;
        if (st.mode === 'S' || st.mode === 'M') return { ok: true };
        const why = { AUTO: 'ב-AUTO המצלמה בוחרת הכל.', P: 'ב-P המצלמה בוחרת תריס. אפשר להזיז את הצירוף ב-Program Shift (שבב הצמצם).', A: 'במצב A אתם בוחרים צמצם, והמצלמה בוחרת תריס.' }[st.mode];
        return { ok: false, why, act: goMode('S') };
      },
      auto: () => !['S', 'M'].includes(st.mode),
      chip: () => C.fmtShutter(exp().t),
      big: () => C.fmtShutter(exp().t) + (exp().t >= 0.4 ? '' : ' שנ\''),
    },
    {
      id: 'iso', group: 'body', name: 'ISO', en: 'ISO', style: 'dial',
      where: () => WHERE['wheel-iso'],
      items: () => [{ label: 'AUTO' }, ...C.ISOS.map(v => ({ label: String(v) }))],
      index: () => (st.iso === 'AUTO' || st.mode === 'AUTO') ? 0 : 1 + C.ISOS.indexOf(st.isoManual),
      set: (i) => { const v = i === 0 ? 'AUTO' : C.ISOS[i - 1]; st.iso = v; if (v !== 'AUTO') st.isoManual = v; },
      enabled: () => sim.locked('iso') ? lockMsg : st.mode === 'AUTO' ? { ok: false, why: 'ב-AUTO ה-ISO אוטומטי.', act: goMode('A') } : { ok: true },
      auto: () => st.iso === 'AUTO' || st.mode === 'AUTO',
      chip: () => (st.iso === 'AUTO' || st.mode === 'AUTO' ? 'A ' : '') + exp().iso,
      big: () => (st.iso === 'AUTO' || st.mode === 'AUTO') ? `ISO AUTO → ${exp().iso}` : `ISO ${exp().iso}`,
    },
    {
      id: 'ec', group: 'body', name: 'פיצוי חשיפה', en: 'Exposure Comp.', style: 'dial',
      where: () => WHERE['rear-dial-r'],
      items: () => range(-5, 5, 1 / 3).map(v => ({ label: Math.abs(v - Math.round(v)) < 0.01 ? C.fmtEV(Math.round(v)).replace('.0', '') : '', major: Math.abs(v - Math.round(v)) < 0.01 })),
      index: () => Math.round((st.ec + 5) * 3),
      set: (i) => { st.ec = Math.round((i / 3 - 5) * 100) / 100; },
      enabled: () => {
        if (sim.locked('ec')) return lockMsg;
        if (st.mode === 'AUTO') return { ok: false, why: 'ב-AUTO אין פיצוי חשיפה.', act: goMode('A') };
        if (st.mode === 'M' && st.iso !== 'AUTO') return { ok: true, note: 'ב-M עם ISO ידני הפיצוי לא משנה את התמונה. הוא משפיע רק כשה-ISO על AUTO.' };
        return { ok: true };
      },
      chip: () => C.fmtEV(st.mode === 'AUTO' ? 0 : st.ec),
      big: () => C.fmtEV(st.mode === 'AUTO' ? 0 : st.ec) + ' EV',
    },
    {
      id: 'zoom', group: 'lens', name: 'זום', en: 'Zoom', style: 'ring',
      where: () => WHERE['zoom-ring'],
      items: () => { const a = []; for (let f = 24; f <= 50; f++) a.push({ label: String(f), major: [24, 28, 35, 50].includes(f) }); return a; },
      index: () => st.focal - 24,
      set: (i) => { const f = 24 + i; st.focal = Math.max(sim.scene ? sim.scene.srcFocal : 24, f); st.afState = 'idle'; if (!sim.focusIsManual()) sim.autofocus(true); },
      enabled: () => {
        if (sim.locked('zoom')) return lockMsg;
        if (sim.scene && sim.scene.srcFocal >= 50) return { ok: false, why: 'התמונה של הסצנה הזו צולמה ב-50 מ"מ, אז אי אפשר לפתוח זווית רחבה יותר. נסו זום בסצנות הנוף, הלילה והזריחה.' };
        return { ok: true, note: sim.scene && sim.scene.srcFocal > 24 ? `בסצנה הזו אפשר מ-${sim.scene.srcFocal} מ"מ` : '' };
      },
      chip: () => st.focal + 'mm',
      big: () => st.focal + ' מ"מ',
    },
    {
      id: 'focus', group: 'lens', name: 'פוקוס', en: 'Focus', style: 'ring',
      where: () => WHERE['focus-ring'],
      items: () => {
        const L = focusList(st.focal), lab = new Map();
        for (const n of [0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 10, 20]) if (n >= L[0] * 0.97) lab.set(near(L, n), String(n));
        lab.set(0, fmtD(L[0])); lab.set(L.length - 1, '∞');
        return L.map((d, i) => ({ label: lab.get(i) || fmtD(d), major: lab.has(i) }));
      },
      index: () => { const L = focusList(st.focal); return near(L, Math.min(st.focusDist, 200)); },
      set: (i) => { const L = focusList(st.focal); st.focusDist = st.mfDist = L[i]; if (sim.focusIsManual()) sim.flashMagnify(); },
      enabled: () => (sim.focusIsManual() || st.focusMode === 'DMF') ? { ok: true, note: 'הזכוכית מגדילה ו-Peaking (קווים אדומים) עוזרים לראות מה חד.' } :
        { ok: false, why: 'טבעת הפוקוס פעילה רק בפוקוס ידני (MF) או DMF. עכשיו המצלמה ממקדת לבד.', act: { label: 'העבירו את מתג העדשה ל-MF', run: () => { st.lensAFMF = 'MF'; sim.markDirty(); } } },
      auto: () => !(sim.focusIsManual() || st.focusMode === 'DMF'),
      chip: () => fmtD(st.focusDist) + 'm',
      big: () => (st.focusDist >= 199 ? '∞' : fmtD(st.focusDist) + ' מ\''),
    },
    {
      id: 'apring', group: 'lens', name: 'טבעת צמצם', en: 'Aperture ring', style: 'ring',
      where: () => WHERE['aperture-ring'],
      items: () => RING.map(v => ({ label: String(v), major: RING_PRINTED.has(v) })),
      index: () => RING.findIndex(v => String(v) === String(st.apertureRing)),
      set: (i) => { st.apertureRing = RING[i]; if (RING[i] !== 'A' && ['S', 'P', 'AUTO'].includes(st.mode)) sim.toast('הטבעת לא על A: המצלמה תשתמש בצמצם שבטבעת'); },
      enabled: () => sim.locked('ap') ? lockMsg : { ok: true, note: st.apertureRing === 'A' ? 'על A המצלמה (או החוגה) קובעת את הצמצם.' : 'הטבעת קובעת את הצמצם. החוגה הקדמית לא משנה אותו עכשיו.' },
      chip: () => st.apertureRing === 'A' ? 'A' : 'F' + st.apertureRing,
      big: () => st.apertureRing === 'A' ? 'A · המצלמה קובעת' : 'F' + st.apertureRing,
    },
    {
      id: 'afmf', group: 'lens', name: 'AF/MF', en: 'AF/MF switch', style: 'menu',
      where: () => WHERE['afmf-switch'],
      items: () => [{ label: 'AF' }, { label: 'MF' }],
      index: () => (st.lensAFMF === 'MF' ? 1 : 0),
      set: (i) => { st.lensAFMF = i ? 'MF' : 'AF'; st.afState = 'idle'; if (!i) sim.autofocus(true); },
      enabled: () => ({ ok: true, note: 'MF בעדשה גובר על כל הגדרה במצלמה.' }),
      chip: () => st.lensAFMF,
      big: () => st.lensAFMF === 'MF' ? 'MF · ידני' : 'AF · אוטומטי',
    },
  ];

  // Fn-menu items: on the camera you press Fn, pick the tile and turn the front dial
  const fnItem = (k, name, en, chip, extraWhere) => ({
    id: k, group: 'fn', name, en, style: 'menu',
    where: () => ({ ...WHERE.fn, ...(extraWhere || {}) }),
    items: () => fnList(k).map(([, l]) => ({ label: l })),
    index: () => { const L = fnList(k).map(o => o[0]); return idxOf(L, st[k]); },
    set: (i) => sim.setValue(k, fnList(k)[i][0]),
    enabled: () => sim.locked(k) ? lockMsg : st.mode === 'AUTO' && !['steady'].includes(k) ? { ok: false, why: 'ב-AUTO המצלמה קובעת את זה לבד.', act: goMode('A') } : { ok: true },
    chip,
    big: () => { const o = fnList(k).find(o => o[0] === st[k] || (typeof o[0] === 'number' && Math.abs(o[0] - st[k]) < 0.02)); return o ? o[1] : String(st[k]); },
  });
  list.push(
    fnItem('focusMode', 'מצב פוקוס', 'Focus Mode', () => (sim.focusIsManual() ? 'MF' : st.focusMode), { note: 'Fn ← Focus Mode (ובסימולטור גם C2)' }),
    fnItem('focusArea', 'אזור פוקוס', 'Focus Area', () => (C.FOCUS_AREAS.find(a => a.id === st.focusArea) || {}).label),
    fnItem('recog', 'זיהוי נושא', 'Recognition', () => (C.RECOG.find(a => a.id === st.recog) || {}).label),
    fnItem('metering', 'מדידת אור', 'Metering', () => (C.METERING.find(a => a.id === st.metering) || {}).label.replace('Entire Screen Avg.', 'Avg')),
    fnItem('wb', 'איזון לבן', 'White Balance', () => (st.wb === 'CTemp' ? st.kelvin + 'K' : (C.WB_PRESETS.find(w => w.id === st.wb) || {}).label), { note: 'Fn ← White Balance, או ישר בכפתור C1' }),
    fnItem('kelvin', 'טמפרטורת צבע', 'C.Temp.', () => st.kelvin + 'K'),
    fnItem('look', 'Creative Look', 'Creative Look', () => st.look),
    fnItem('dro', 'DRO', 'D-Range Opt.', () => (C.DRO.find(d => d.id === st.dro) || {}).label.replace('DRO ', '')),
  );
  return list;
}

function focusList(focal) {
  const mfd = C.LENS.mfdMF(focal), out = [];
  const n = 54, lo = Math.log(mfd), hi = Math.log(60);
  for (let i = 0; i < n; i++) out.push(Math.round(Math.exp(lo + (hi - lo) * i / (n - 1)) * 1000) / 1000);
  out.push(200);
  return out;
}
