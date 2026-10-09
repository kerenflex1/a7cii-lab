# α7C II Lab — build spec (shared contract for all contributors)

Static site, plain ES modules, no build step. Hebrew RTL UI; camera labels stay in English exactly as printed on the body / in Sony menus.
Root: `app/`. Entry: `app/index.html`. Hash routes: `#home`, `#l-<lessonId>`, `#lab`, `#camera`, `#lens`, `#credits`.

Source of truth for camera facts: Sony Help Guide ILCE-7CM2, extracted text at
`docs/manuals/ILCE-7CM2_HelpGuide_EN.txt` (PDF beside it); lens facts in `docs/manuals/SEL2450G_facts.md`
(re-extract from https://helpguide.sony.net/ilc/2360/v1/en/print.pdf with pdftotext if missing). Never invent menu names: grep the guide.

Lens facts (SEL2450G, verified): front→mount: ridged **focus ring**, **zoom ring** marked 24/28/35/50, **aperture ring** (A, F2.8–F22 in 1/3 stops).
Left side: **AF/MF switch** + round **Focus Hold button** (assignable). Bottom: **Aperture Click ON/OFF switch**. **No iris lock.**
Barrel extends ~2 cm toward 24 mm (shortest at 50 mm). MFD 0.19 m (24 mm) / 0.30 m (50 mm) AF, 0.18/0.29 MF; max mag 0.30× AF / 0.33× MF.
11 rounded blades, 16 elements/13 groups (4 asph, 2 ED), 67 mm filter, 440 g, Ø74.8 × 92.3 mm, hood ALC-SH178 (petal, bayonet, reversible),
dust & moisture resistant, no OSS (relies on body IBIS), linear-response MF, internal focusing (length constant while focusing), not parfocal.

Body facts (verified from guide): front dial below shutter; ON/OFF collar on shutter; rear dial R on top (exposure comp. by default);
rear dial L on back top-right; Still/Movie/S&Q dial under mode dial; mode dial AUTO/P/A/S/M/1/2/3; C1 next to MENU (default White Balance);
AF-ON (default "Tracking On + AF On"); Fn; control wheel: up DISP, right ISO, left Drive/Self-timer, down Image Index, centre button; C2/Delete; Playback.
A/S/P: front dial & rear dial L change the main value (P = program shift). M: front = aperture, rear L = shutter. Exposure comp −5…+5 (screen preview ±3).
Monitor 3.0" fully articulated (176° open, 270° rotate), EVF 0.70× 2.36M dots with eye sensor & diopter dial. NP-FZ100, single UHS-II SD slot, USB-C (charge/power),
3.5 mm mic & headphone, micro-HDMI. 33 MP BSI full frame, ISO 100–51200 (50–204800 ext.), mechanical 1/4000–30 s + Bulb, electronic 1/8000, flash sync 1/160,
10 fps, 7-stop 5-axis IBIS, AI subject recognition (Human, Animal/Bird, Animal, Bird, Insect, Car/Train, Airplane, Auto with fw 2.00+).

## Course content format — `app/js/course/chN.js`

```js
export default {
  id: 'ch4', num: 4, title: 'פוקוס', subtitle: 'איך המצלמה מחליטה מה יהיה חד',
  lessons: [
    { id: '4-1', title: 'AF-S, AF-C ו-AF-A', minutes: 6, goal: 'משפט אחד: מה תדעו לעשות בסוף',
      blocks: [ /* see block types */ ] },
  ],
};
```

Block types (`t` field). HTML strings may use `<b> <i> <br> <kbd>` (kbd = a physical control or menu item label, English) and `<span class="en">` for inline English.
| t | fields | renders |
|---|---|---|
| `p` | `html` | paragraph |
| `h` | `text` | sub-heading |
| `tip` / `warn` / `pro` | `html` | callout (tip = beginner hint, warn = common mistake, pro = advanced note) |
| `steps` | `items: [html]` | numbered physical instructions |
| `menu` | `path: ['MENU','Shooting','Image Quality/Rec','File Format']`, `value`, `note?` | Sony-style breadcrumb. Tab names: Main, Shooting, Exposure/Color, Focus, Playback, Network, Setup, My Menu |
| `parts` | `view`, `show: [partId]`, `caption?` | interactive camera/lens drawing with those parts highlighted |
| `diagram` | `kind`, `props?` | interactive explainer (kinds below) |
| `sim` | `scene`, `preset?`, `lock?`, `task: { text, checks: [{ t, c }] }`, `hint?` | embedded camera simulator with a mission |
| `quiz` | `q`, `options: [..]`, `answer` (index), `explain` | multiple choice |
| `table` | `head: [..]`, `rows: [[..]]` | small reference table |
| `recipe` | `title`, `items: [[label, value]]` | settings card (e.g. portrait recipe) |

**Views** for `parts`: `top`, `rear`, `front`, `side` (ports/card side), `bottom`, `lens`.
**Part ids**:
- top: `shutter`, `power`, `front-dial`, `movie`, `rear-dial-r`, `mode-dial`, `sq-dial`, `shoe`, `sensor-mark`, `speaker`, `mic`
- rear: `evf`, `eye-sensor`, `diopter`, `monitor`, `menu`, `c1`, `rear-dial-l`, `af-on`, `fn`, `control-wheel`, `wheel-disp`, `wheel-iso`, `wheel-drive`, `wheel-index`, `wheel-center`, `c2`, `playback`
- front: `lens-release`, `af-illuminator`, `mount`, `sensor`, `grip`, `strap-lug`
- side: `card-slot`, `usb-c`, `mic-jack`, `headphone-jack`, `hdmi`, `charge-lamp`, `access-lamp`
- bottom: `battery`, `tripod-socket`
- lens: `focus-ring`, `zoom-ring`, `zoom-scale`, `aperture-ring`, `afmf-switch`, `focus-hold`, `click-switch`, `mount-index`, `filter-thread`, `hood`, `g-badge`

**Diagram kinds**: `exposure-triangle`, `aperture` (blade opening + DOF hint per f-stop), `shutter` (motion freeze vs blur scale),
`iso` (noise scale), `stops` (doubling/halving ladder), `fov` (24/28/35/50 framing over one scene), `perspective` (distance vs focal),
`dof` (side-view diagram: focus plane, near/far limits; props `{ focal, N, dist }`), `hyperfocal`, `histogram` (examples: under/over/normal/high-contrast),
`wb` (Kelvin scale), `metering` (Multi/Center/Spot/Avg/Highlight zones), `af-areas` (Wide/Zone/Center Fix/Spot/Expand Spot overlays),
`magnification` (0.30× at MFD), `crop-vs-zoom`.

**Scenes** for `sim`: `kyoto` (street portrait, 50 mm fixed, human eye), `night` (HDR night square), `sunrise` (HDR sun in frame),
`meadow` (HDR snowdrops foreground + valley, landscape/hyperfocal), `flower` (close-up, 50 mm, ~0.32 m), `rapids` (fast water, motion field),
`dog` (animal eye AF).

**Preset keys** (all optional): `mode` ('AUTO'|'P'|'A'|'S'|'M'), `focal` (24–50), `N` (f-number), `t` (seconds, e.g. 1/125), `iso` ('AUTO'|number),
`ec`, `wb` (AWB|Daylight|Shade|Cloudy|Incandescent|FluorWarm|FluorCool|FluorDay|FluorDaylight|Flash|CTemp), `kelvin`, `look` (ST|PT|NT|VV|VV2|FL|IN|SH|BW|SE),
`dro` (off|auto|lv1..lv5), `metering` (multi|center|spot|average|highlight), `focusMode` (AF-S|AF-A|AF-C|DMF|MF), `focusArea` (wide|zone|center|spotL|spotM|spotS|expand),
`recog` (human|animal|off), `lensAFMF` (AF|MF), `focusDist` (m), `tripod` (bool), `steady` (bool), `peaking`, `zebra`.
`lock`: list of preset keys the learner cannot change in that exercise (keeps beginners focused).

**Check DSL** (`c` strings, evaluated on the captured frame; all must pass):
`mode==A`, `N<=2.8`, `N>=8`, `t<=1/500`, `t>=1/4`, `iso<=6400`, `focal>=50`, `ec<0`, `look==BW`, `wb==Incandescent`, `metering==spot`,
`focusMode==MF`, `focusArea==spotS`, `expOk` (|exposure error| ≤ 0.7 EV), `expErr<=-1` (signed), `shake<1.5` (px), `eyeSharp`, `subjectSharp`,
`bgBlur>=1.5` (background blur, % of frame width), `farInf` (DOF far limit = ∞), `nearBelow<=1.5` (DOF near limit in m), `clip<0.025`, `meanLuma>0.12`,
`motion>=20` (subject motion-blur length in px), `motion<=1`, `noiseOk` (SNR ≥ 20:1 at mid-grey).

## Writing style
Hebrew, warm and precise, second person plural (אתם). Short sentences. Explain the *why* with real numbers (stops, metres, mm).
Every lesson: a clear goal, the physical controls (`parts`), the menu path when relevant (`menu`), at least one hands-on `sim` or `diagram`, and a `quiz`.
Start from zero (no assumed knowledge) and grow to advanced. Mention this specific lens wherever it matters (24 vs 50 mm, F2.8, MFD 0.19/0.30 m, 11 blades, ring/switches).
Do not claim defaults you cannot find in the guide; say "ניתן להגדרה" instead.
