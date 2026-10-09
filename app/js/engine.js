// Physically based viewfinder renderer (WebGL2).
// Pass 1 "prep":   HDR reconstruction from an exposure stack + exposure + white balance + per-pixel circle of confusion
// Pass 2 "dof":    scatter-as-gather lens blur driven by the CoC (11 rounded blades -> circular bokeh)
// Pass 3 "finish": camera shake, photon/read noise, sensor clip, vignetting, DRO, JPEG tone curve, Creative Look, overlays

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

const PREP = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uEv0, uEv4, uEv8, uDepth;
uniform float uHasEv4, uHasEv8;
uniform vec4 uCrop;          // x0,y0,w,h in source uv (top-left origin)
uniform float uExpMul;       // linear exposure multiplier vs. the scene anchor
uniform vec3 uWB;            // white balance channel gains
uniform vec2 uDepthLog;      // log(dmin), log(dmax) in metres
uniform float uF, uN, uS;    // focal mm, f-number, focus distance mm
uniform float uPxPerMM;      // output pixels per mm of sensor
uniform float uAiry;         // diffraction blur radius in px
float mx(vec3 c){ return max(c.r,max(c.g,c.b)); }
void main(){
  vec2 uv = uCrop.xy + vec2(vUv.x, 1.0-vUv.y)*uCrop.zw;
  vec3 a = texture(uEv0, uv).rgb;              // sRGB textures -> already linear
  vec3 c = a;
  if (uHasEv4 > 0.5) {
    vec3 b = texture(uEv4, uv).rgb*16.0;
    c = mix(a, b, smoothstep(0.72, 0.92, mx(a)));
    if (uHasEv8 > 0.5) {
      vec3 d = texture(uEv8, uv).rgb*256.0;
      c = mix(c, d, smoothstep(0.72*16.0, 0.92*16.0, mx(b)));
    }
  }
  float dz = texture(uDepth, uv).r;
  float dm = exp(mix(uDepthLog.x, uDepthLog.y, dz))*1000.0;   // mm
  float cocMM = (uF*uF/(uN*max(uS-uF,1.0))) * (dm-uS)/dm;      // signed blur-disc diameter on sensor
  float r = cocMM*uPxPerMM*0.5;
  r = sign(r)*max(abs(r), uAiry);
  o = vec4(c*uExpMul*uWB, r);
}`;

const DOF = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uMaxR; uniform int uCount;
const float GA = 2.39996323;
void main(){
  vec4 c0 = texture(uSrc, vUv);
  float cz = c0.a, cs = abs(cz);
  if (uMaxR < 0.6) { o = c0; return; }
  vec3 col = c0.rgb; float tot = 1.0;
  float spacing = uMaxR/sqrt(float(uCount));
  for (int i=0; i<512; i++){
    if (i >= uCount) break;
    float fi = float(i)+0.5;
    float rad = uMaxR*sqrt(fi/float(uCount));
    float ang = fi*GA;
    vec4 s = texture(uSrc, vUv + vec2(cos(ang),sin(ang))*rad*uTexel);
    float ss = abs(s.a);
    if (s.a > cz) ss = clamp(ss, 0.0, cs*2.0);   // farther samples can't bleed over sharper foreground
    float m = smoothstep(rad-spacing, rad+spacing*0.5, ss);
    col += mix(col/tot, s.rgb, m); tot += 1.0;
  }
  o = vec4(col/tot, cz);
}`;

const FINISH = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uDof, uPrep, uMotion; uniform vec2 uTexel;
uniform vec4 uCrop; uniform float uMotionK, uHasMotion;      // uMotionK = max speed * exposure time / crop width (in screen widths)
uniform vec2 uShake;                 // blur vector in px
uniform float uISO, uLsat, uFW, uRN, uK, uSeed, uNoiseOn;
uniform float uVig, uDRO;
uniform vec4 uLook1;                 // contrast, saturation, fade, brightness(EV)
uniform vec4 uLook2;                 // highlights, shadows, mono(0/1), sepia(0/1)
uniform vec3 uTint, uShadowTint;
uniform float uPeak, uZebra, uPeakLevel;
uniform vec3 uPeakColor;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float gauss(vec2 p, float s){ float u1=max(h12(p+s),1e-6), u2=h12(p*1.37+s*2.1+17.0); return sqrt(-2.0*log(u1))*cos(6.2831853*u2); }
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 srgb(vec3 x){ x=clamp(x,0.0,1.0); return mix(12.92*x, 1.055*pow(x,vec3(1.0/2.4))-0.055, step(0.0031308,x)); }
float shoulder(float x, float head){ float t=0.42; if (x<=t) return x; return t+(1.0-t)*tanh((x-t)/(head-t)*1.9); }
void main(){
  vec3 c = vec3(0.0);
  vec2 mv = vec2(0.0);
  if (uHasMotion > 0.5) {
    vec4 m = texture(uMotion, uCrop.xy + vec2(vUv.x, 1.0-vUv.y)*uCrop.zw);
    vec2 dir = (m.rg*2.0-1.0); dir.y = -dir.y;             // texture y-down -> screen uv y-up
    mv = dir * m.b * uMotionK;                              // in uv units
  }
  vec2 blurV = uShake*uTexel + mv;
  float bl = length(blurV/uTexel);
  if (bl > 0.75) {
    int n = int(clamp(bl, 8.0, 48.0));
    for (int i=0;i<48;i++){ if (i>=n) break; float t=float(i)/float(n-1)-0.5; c += texture(uDof, vUv + blurV*t).rgb; }
    c /= float(n);
  } else c = texture(uDof, vUv).rgb;

  // sensor: photon shot noise + read noise, evaluated per sensor pixel then averaged into one screen pixel
  if (uNoiseOn > 0.5) {
    float ePerUnit = uFW*(100.0/uISO)/uLsat;
    float k = max(uK, 1.0);
    vec2 cell = floor(gl_FragCoord.xy*min(uK,1.0));
    vec3 e = max(c,0.0)*ePerUnit;
    vec3 sig = sqrt(e + uRN*uRN)/ePerUnit/k;
    float gl = gauss(cell, uSeed);
    vec3 gc = vec3(gauss(cell+11.1,uSeed), gauss(cell+23.7,uSeed), gauss(cell+41.3,uSeed));
    c = c + sig*(gl*0.8 + gc*0.6);
  }
  c = clamp(c, 0.0, uLsat);                    // sensor saturation, per channel

  // lens shading residual (SEL2450G wide open, Shading Comp: Auto)
  vec2 q = (vUv-0.5)*vec2(1.0, 0.6667)*2.0/1.2019;
  c *= 1.0 - uVig*pow(clamp(dot(q,q),0.0,1.0),1.25);

  // D-Range Optimizer: lift shadows, ease highlights
  float L = luma(c);
  c *= 1.0 + uDRO*0.9*(1.0-smoothstep(0.0, 0.2, L));
  c *= exp2(uLook1.w);

  // JPEG tone: filmic shoulder so ~3.2 stops above mid-grey reach white
  float head = uLsat;
  vec3 tc = vec3(shoulder(c.r,head), shoulder(c.g,head), shoulder(c.b,head)) / shoulder(head,head);
  vec3 d = srgb(tc);

  // Creative Look
  float y = luma(d);
  d = mix(d, d*uShadowTint, (1.0-smoothstep(0.0,0.5,y))*0.6);
  d *= uTint;
  float con = uLook1.x;
  d = d + con*(d-0.5)*(1.0-abs(2.0*d-1.0))*1.2;
  d = mix(d, d*(1.0+uLook2.x*0.25), smoothstep(0.55,1.0,y));
  d = mix(d, d+uLook2.y*0.12, 1.0-smoothstep(0.0,0.45,y));
  y = luma(d);
  d = mix(vec3(y), d, 1.0+uLook1.y);
  if (uLook2.z > 0.5) { d = vec3(y); if (uLook2.w > 0.5) d = y*vec3(1.07,0.96,0.80)+vec3(0.03,0.015,0.0); }
  d = mix(d, vec3(0.5)*0.2 + d*0.8, uLook1.z);
  d = clamp(d, 0.0, 1.0);

  // overlays
  if (uZebra > 0.5 && luma(d) > 0.94 && mod(gl_FragCoord.x+gl_FragCoord.y, 10.0) < 5.0) d = mix(d, vec3(0.1), 0.65);
  if (uPeak > 0.5) {
    float r0 = abs(texture(uPrep, vUv).a);
    if (r0 < 0.75) {
      float lx = luma(texture(uPrep, vUv+vec2(uTexel.x,0.0)).rgb) - luma(texture(uPrep, vUv-vec2(uTexel.x,0.0)).rgb);
      float ly = luma(texture(uPrep, vUv+vec2(0.0,uTexel.y)).rgb) - luma(texture(uPrep, vUv-vec2(0.0,uTexel.y)).rgb);
      float lc = luma(texture(uPrep, vUv).rgb);
      float g = (abs(lx)+abs(ly))/(lc+0.06);
      if (g > uPeakLevel) d = uPeakColor;
    }
  }
  o = vec4(d, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function program(gl, fsrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsrc));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

async function loadBitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`לא נטען: ${url}`);
  const blob = await res.blob();
  return createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error('הדפדפן לא תומך ב-WebGL2');
    this.gl = gl;
    this.floatOK = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('OES_texture_float_linear');
    if (!this.floatOK) throw new Error('המכשיר לא תומך ברינדור HDR (float buffers)');
    this.prep = program(gl, PREP); this.dof = program(gl, DOF); this.fin = program(gl, FINISH);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.tex = {}; this.fbo = null; this.size = [0, 0];
  }

  _texFrom(bitmap, srgb) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    if (srgb === 'rgba') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    else if (srgb) gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, bitmap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  async loadScene(meta, base, onProgress) {
    const gl = this.gl;
    for (const t of Object.values(this.tex)) gl.deleteTexture(t);
    this.tex = {};
    const names = meta.stack;
    let done = 0; const total = names.length + 1;
    const tick = () => onProgress && onProgress(++done / total);
    const [depthBmp, ...bmps] = await Promise.all([
      loadBitmap(`${base}/depth.png`).then(b => (tick(), b)),
      ...names.map(n => loadBitmap(`${base}/${n}.jpg`).then(b => (tick(), b))),
    ]);
    names.forEach((n, i) => { this.tex[n] = this._texFrom(bmps[i], true); });
    if (meta.motion) {
      const mb = await loadBitmap(`${base}/${meta.motion.file || 'motion.png'}`);
      this.tex.motion = this._texFrom(mb, 'rgba'); mb.close && mb.close();
    }
    this.tex.depth = this._texFrom(depthBmp, false);
    // CPU copy of depth for autofocus
    const dw = 512, dh = Math.round(depthBmp.height * dw / depthBmp.width);
    const c = new OffscreenCanvas(dw, dh), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(depthBmp, 0, 0, dw, dh);
    const px = ctx.getImageData(0, 0, dw, dh).data;
    const lo = Math.log(meta.depth.min), hi = Math.log(meta.depth.max);
    const depth = new Float32Array(dw * dh);
    for (let i = 0; i < dw * dh; i++) depth[i] = Math.exp(lo + (hi - lo) * px[i * 4] / 255);
    this.depthCPU = { w: dw, h: dh, data: depth };
    [depthBmp, ...bmps].forEach(b => b.close && b.close());
    this.meta = meta;
  }

  _ensureTargets(w, h) {
    if (this.size[0] === w && this.size[1] === h) return;
    const gl = this.gl;
    if (this.fbo) this.fbo.forEach(f => { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); });
    this.fbo = [0, 1].map(() => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t, fb };
    });
    this.size = [w, h];
  }

  dispose() {
    const gl = this.gl;
    for (const t of Object.values(this.tex)) gl.deleteTexture(t);
    if (this.fbo) this.fbo.forEach(f => { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); });
    const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
  }

  /** depth in metres at a frame point (0..1, top-left), median of a small box */
  depthAt(src, half = 0.006) {
    const { w, h, data } = this.depthCPU, vals = [];
    const x0 = Math.max(0, Math.floor((src.x - half) * w)), x1 = Math.min(w - 1, Math.ceil((src.x + half) * w));
    const y0 = Math.max(0, Math.floor((src.y - half * 1.5) * h)), y1 = Math.min(h - 1, Math.ceil((src.y + half * 1.5) * h));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) vals.push(data[y * w + x]);
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] || 10;
  }

  /**
   * p: { crop:[x0,y0,w,h], pxPerMM, focal, N, focusMM, expMul, wb:[r,g,b], iso, noise, seed, shake:[x,y],
   *      vignette, dro, look:{...}, peaking, zebra, kSensor }
   */
  render(p) {
    const gl = this.gl, cv = this.canvas;
    const w = cv.width, h = cv.height;
    this._ensureTargets(w, h);
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(this.vao);
    const bind = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };

    // pass 1
    const P = this.prep; gl.useProgram(P.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[0].fb);
    bind(0, this.tex.ev0); bind(1, this.tex['ev-4'] || this.tex.ev0); bind(2, this.tex['ev-8'] || this.tex.ev0); bind(3, this.tex.depth);
    gl.uniform1i(P.u.uEv0, 0); gl.uniform1i(P.u.uEv4, 1); gl.uniform1i(P.u.uEv8, 2); gl.uniform1i(P.u.uDepth, 3);
    gl.uniform1f(P.u.uHasEv4, this.tex['ev-4'] ? 1 : 0); gl.uniform1f(P.u.uHasEv8, this.tex['ev-8'] ? 1 : 0);
    gl.uniform4fv(P.u.uCrop, p.crop);
    gl.uniform1f(P.u.uExpMul, p.expMul);
    gl.uniform3fv(P.u.uWB, p.wb);
    gl.uniform2f(P.u.uDepthLog, Math.log(this.meta.depth.min), Math.log(this.meta.depth.max));
    gl.uniform1f(P.u.uF, p.focal); gl.uniform1f(P.u.uN, p.N); gl.uniform1f(P.u.uS, p.focusMM);
    gl.uniform1f(P.u.uPxPerMM, p.pxPerMM);
    gl.uniform1f(P.u.uAiry, 1.22 * 0.00055 * p.N * p.pxPerMM * 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // pass 2: max blur radius present in the frame (estimated analytically from the depth range)
    const f = p.focal, N = p.N, s = p.focusMM;
    const cocAt = d => (f * f / (N * Math.max(s - f, 1))) * Math.abs(d - s) / d * p.pxPerMM * 0.5;
    const maxR = Math.min(56, Math.max(cocAt(this.meta.depth.min * 1000), cocAt(this.meta.depth.max * 1000)));
    let count = Math.round(Math.min(220, Math.max(24, maxR * maxR * 0.45)));
    if (p.fast) count = Math.min(count, 40);        // live preview while a dial turns; full quality when it stops
    const D = this.dof; gl.useProgram(D.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[1].fb);
    bind(0, this.fbo[0].t); gl.uniform1i(D.u.uSrc, 0);
    gl.uniform2f(D.u.uTexel, 1 / w, 1 / h); gl.uniform1f(D.u.uMaxR, maxR); gl.uniform1i(D.u.uCount, count);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // pass 3
    const F = this.fin; gl.useProgram(F.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    bind(0, this.fbo[1].t); bind(1, this.fbo[0].t); bind(2, this.tex.motion || this.tex.depth);
    gl.uniform1i(F.u.uDof, 0); gl.uniform1i(F.u.uPrep, 1); gl.uniform1i(F.u.uMotion, 2);
    gl.uniform4fv(F.u.uCrop, p.crop);
    gl.uniform1f(F.u.uHasMotion, this.tex.motion && p.motionT ? 1 : 0);
    gl.uniform1f(F.u.uMotionK, this.meta.motion ? this.meta.motion.max * (p.motionT || 0) / p.crop[2] : 0);
    gl.uniform2f(F.u.uTexel, 1 / w, 1 / h);
    gl.uniform2fv(F.u.uShake, p.shake || [0, 0]);
    gl.uniform1f(F.u.uISO, p.iso); gl.uniform1f(F.u.uLsat, LSAT);
    gl.uniform1f(F.u.uFW, SENSOR.fullWell); gl.uniform1f(F.u.uRN, p.iso >= 640 ? SENSOR.readNoiseHigh : SENSOR.readNoiseLow);
    gl.uniform1f(F.u.uK, p.kSensor); gl.uniform1f(F.u.uSeed, p.seed || 0); gl.uniform1f(F.u.uNoiseOn, p.noise ? 1 : 0);
    gl.uniform1f(F.u.uVig, p.vignette); gl.uniform1f(F.u.uDRO, p.dro);
    const L = p.look;
    gl.uniform4f(F.u.uLook1, L.contrast, L.sat, L.fade, L.bright);
    gl.uniform4f(F.u.uLook2, L.hi, L.sh, L.mono ? 1 : 0, L.sepia ? 1 : 0);
    gl.uniform3fv(F.u.uTint, L.tint); gl.uniform3fv(F.u.uShadowTint, L.shadowTint);
    gl.uniform1f(F.u.uPeak, p.peaking ? 1 : 0); gl.uniform1f(F.u.uZebra, p.zebra ? 1 : 0);
    gl.uniform1f(F.u.uPeakLevel, p.peakLevel || 0.35); gl.uniform3fv(F.u.uPeakColor, [1, 0.12, 0.1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return { maxR, count };
  }
}

// a7C II sensor model: 33 MP BSI, 7008 px across 35.9 mm, 5.1 µm pixels, dual-gain readout
export const SENSOR = { widthPx: 7008, fullWell: 52000, readNoiseLow: 3.2, readNoiseHigh: 1.4 };
// linear scene value that saturates the sensor when mid-grey sits at 0.18 (about 3.2 stops of headroom)
export const LSAT = 0.18 * Math.pow(2, 3.2);
