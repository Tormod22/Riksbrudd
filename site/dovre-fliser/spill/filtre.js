'use strict';
// Filtre / kameralinser i 3D (brukeren 10. nov: «lag 10 forskjellige filter/kamera-linse-forslag … pikselert, grain osv.»).
// Kroken KROKER.bilde3d tegner scenen til en WebGLRenderTarget og så en fullskjerm-firkant med filterets shader til skjermen.
// «Ingen» = kroken svarer false og index.html tegner som før (ingen kostnad). Valget huskes i nettleseren («riksbrudd-filter»).
// Dybdeteksturen (DepthTexture) brukes til kontur, himmel og avstand når den finnes (WebGL2 eller WEBGL_depth_texture); ellers lysstyrke.
// Piksel tegner scenen i lav oppløsning direkte (raskere enn vanlig). Tunge filtre tegnes litt mindre på mobil (VW < 900).
// VAKT: GLSL tåler bare ASCII – ingen æ/ø/å i shaderkoden under.
(function () {
  // felles GLSL: uniformer, lysstyrke, tilfeldig tall, dybde
  const FELLES = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tBilde;
uniform sampler2D tDybde;
uniform vec2 uRes;
uniform vec2 uKilde;
uniform float uTid;
uniform float uPx;
uniform float uNaer;
uniform float uFjern;
uniform float uHarDybde;
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float stoy(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * stoy(p); p *= 2.03; a *= .5; } return s; }
float rawDybde(vec2 uv) { return uHarDybde > .5 ? texture2D(tDybde, uv).x : .5; }
float avstand(vec2 uv) { float z = rawDybde(uv) * 2. - 1.; return 2. * uNaer * uFjern / (uFjern + uNaer - z * (uFjern - uNaer)); }
float himmel(vec2 uv) { return uHarDybde > .5 ? step(.99999, texture2D(tDybde, uv).x) : 0.; }
vec3 metning(vec3 c, float s) { return mix(vec3(lum(c)), c, s); }
`;
  const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

  const FILTRE = [
    { id: 'ingen', navn: 'Ingen' },

    // 1 Piksel: lav oppløsning, skarpe piksler, 16 farger med Bayer-raster
    { id: 'piksel', navn: 'Piksel', lav: mobil => mobil ? 170 : 200, frag: `
uniform vec3 uPal[16];
float bayer(vec2 p) { vec2 q = mod(p, 4.);
  float x = q.x, y = q.y; float b = 0.;
  if (y < 1.) b = x < 1. ? 0. : x < 2. ? 8. : x < 3. ? 2. : 10.;
  else if (y < 2.) b = x < 1. ? 12. : x < 2. ? 4. : x < 3. ? 14. : 6.;
  else if (y < 3.) b = x < 1. ? 3. : x < 2. ? 11. : x < 3. ? 1. : 9.;
  else b = x < 1. ? 15. : x < 2. ? 7. : x < 3. ? 13. : 5.;
  return b / 16. - .47; }
void main() {
  vec2 px = floor(vUv * uKilde);
  vec3 c = texture2D(tBilde, (px + .5) / uKilde).rgb;
  c = pow(c, vec3(.92)) * 1.04;
  c += bayer(px) * .075;
  vec3 best = uPal[0]; float bd = 99.;
  for (int i = 0; i < 16; i++) { vec3 d = (c - uPal[i]) * vec3(.9, 1.2, .7); float e = dot(d, d); if (e < bd) { bd = e; best = uPal[i]; } }
  gl_FragColor = vec4(best, 1.);
}` },

    // 2 Filmkorn: korn, vignett, svak S-kurve og varme høylys / kjølige skygger
    { id: 'korn', navn: 'Filmkorn', frag: `
void main() {
  vec3 c = pow(texture2D(tBilde, vUv).rgb, vec3(.85));
  c = mix(c, c * c * (3. - 2. * c), .4);
  float l = lum(c);
  c += vec3(.045, .018, -.035) * smoothstep(.45, 1., l) + vec3(-.02, .004, .035) * (1. - smoothstep(0., .45, l));
  c = metning(c, .88);
  float g = hash(floor(gl_FragCoord.xy / (1.4 * uPx)) + fract(uTid * 7.13) * 91.) - .5;
  c += g * (.11 - l * .06);
  vec2 p = vUv - .5; p.x *= uRes.x / uRes.y;
  c *= 1. - smoothstep(.35, 1.05, length(p)) * .55;
  gl_FragColor = vec4(c, 1.);
}` },

    // 3 VHS / kamerafeed: skjelvende linjer, fargeforskyvning, utvasket farge, scanlines, støy og sporingsstripe
    { id: 'vhs', navn: 'VHS-kamera', frag: `
void main() {
  vec2 uv = vUv;
  float linje = floor(uv.y * 240.);
  uv.x += (hash(vec2(linje, floor(uTid * 30.))) - .5) * .0016 + sin(uv.y * 24. + uTid * 2.3) * .0009;
  float band = fract(uTid * .07);
  float iBand = smoothstep(.035, 0., abs(uv.y - (1. - band)));
  uv.x += iBand * (hash(vec2(linje, uTid)) - .3) * .02;
  float o = .0028 + iBand * .006;
  float r = 0., g = 0., b = 0.;
  for (int i = -2; i <= 2; i++) { float f = float(i) * .0016;
    r += texture2D(tBilde, uv + vec2(o + f, 0.)).r; g += texture2D(tBilde, uv + vec2(f * .5, 0.)).g; b += texture2D(tBilde, uv + vec2(-o + f, 0.)).b; }
  vec3 c = vec3(r, g, b) / 5.;
  c = metning(c, .72) * .92 + .05;
  c *= vec3(1.02, 1., .95);
  c *= .86 + .14 * sin(gl_FragCoord.y / uPx * 1.9);
  c += (hash(gl_FragCoord.xy + fract(uTid) * 333.) - .5) * .09;
  c += iBand * (hash(vec2(gl_FragCoord.x * .05, linje + uTid)) - .4) * .35;
  vec2 p = vUv - .5; c *= 1. - dot(p, p) * .8;
  gl_FragColor = vec4(c, 1.);
}` },

    // 4 Nattsikt: lys forsterket, grønn fosfor, kraftig korn, rundt rør
    { id: 'natt', navn: 'Nattsikt', frag: `
void main() {
  vec2 d = 1.5 * uPx / uRes;
  vec3 c = texture2D(tBilde, vUv).rgb, glod = vec3(0.);
  for (int i = 0; i < 8; i++) { float a = float(i) * .785; glod += texture2D(tBilde, vUv + vec2(cos(a), sin(a)) * d * 4.).rgb; }
  float l = lum(c) * .8 + lum(glod / 8.) * .2;
  l = 1. - exp(-l * 1.5);
  l += max(lum(glod / 8.) - .75, 0.) * .8;
  l += (hash(floor(gl_FragCoord.xy / (1.3 * uPx)) + fract(uTid * 11.7) * 77.) - .5) * .16;
  l *= .93 + .07 * sin(gl_FragCoord.y / uPx * 2.2);
  vec3 f = vec3(.28, .9, .38) * l + vec3(.6, .7, .6) * max(l - .75, 0.) + vec3(.0, .025, .01);
  vec2 p = vUv - .5; p.x *= uRes.x / uRes.y;
  f *= 1. - smoothstep(.42, .56, length(p));
  gl_FragColor = vec4(f, 1.);
}` },

    // 5 Varmesøker: hvit = varm. Mørke flater (asfalt, tak, skog) er varme, snø, vann og himmel kalde, langt unna flatere
    { id: 'varme', navn: 'Varmesøker', dybde: true, frag: `
void main() {
  vec2 d = uPx / uRes;
  vec3 c = texture2D(tBilde, vUv).rgb;
  vec3 b = (texture2D(tBilde, vUv + vec2(d.x, 0.)).rgb + texture2D(tBilde, vUv - vec2(d.x, 0.)).rgb + texture2D(tBilde, vUv + vec2(0., d.y)).rgb + texture2D(tBilde, vUv - vec2(0., d.y)).rgb) * .25;
  c = c + (c - b) * .8;
  float l = lum(c);
  float gronn = smoothstep(.0, .06, c.g - max(c.r, c.b) * .95);
  float mett = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float h = .38 + (.45 - l) * .55 - gronn * .22 + (1. - gronn) * (1. - smoothstep(.05, .2, mett)) * .25;
  float vann = smoothstep(.02, .12, c.b - max(c.r, c.g));
  h -= vann * .3 + smoothstep(.8, .95, l) * .25;
  h = smoothstep(.2, .9, h);
  float z = avstand(vUv);
  h = mix(h, .28, smoothstep(600., 7000., z) * uHarDybde);
  float s = uHarDybde > .5 ? himmel(vUv) : smoothstep(.75, .9, l) * step(.6, vUv.y);
  h = mix(h, .06 + (1. - vUv.y) * .12, s);
  h += (hash(gl_FragCoord.xy + fract(uTid * 5.3) * 50.) - .5) * .05;
  h = clamp(h, 0., 1.);
  vec3 f = vec3(h) * vec3(1., .99, .96);
  vec2 p = vUv - .5; f *= 1. - dot(p, p) * .5;
  gl_FragColor = vec4(f, 1.);
}` },

    // 6 Tegneserie: flate fargefelt i trinn og svarte konturer fra dybden (ellers fra fargen)
    { id: 'cel', navn: 'Tegneserie', dybde: true, frag: `
float w(vec2 uv) { return 1. / max(avstand(uv), .001); }
void main() {
  vec3 c = texture2D(tBilde, vUv).rgb;
  float l = lum(c);
  float t = floor(l * 4. + .5) / 4.;
  t = mix(t, l, .25);
  vec3 f = metning(c, 1.35) * (t + .06) / max(l, .04);
  vec2 d = uPx / uRes;
  float kant = 0.;
  if (uHarDybde > .5) {
    float wc = w(vUv), wl = w(vUv - vec2(d.x, 0.)), wr = w(vUv + vec2(d.x, 0.)), wu = w(vUv + vec2(0., d.y)), wd = w(vUv - vec2(0., d.y));
    float lap = (abs(wl + wr - 2. * wc) + abs(wu + wd - 2. * wc)) / max(wc, 1e-6);
    kant = smoothstep(.008, .025, lap);
    float hs = himmel(vUv - vec2(d.x, 0.)) + himmel(vUv + vec2(d.x, 0.)) + himmel(vUv + vec2(0., d.y)) + himmel(vUv - vec2(0., d.y));
    kant = max(kant, step(.5, abs(hs - 4. * himmel(vUv))));
  }
  float gx = lum(texture2D(tBilde, vUv + vec2(d.x, 0.)).rgb) - lum(texture2D(tBilde, vUv - vec2(d.x, 0.)).rgb);
  float gy = lum(texture2D(tBilde, vUv + vec2(0., d.y)).rgb) - lum(texture2D(tBilde, vUv - vec2(0., d.y)).rgb);
  kant = max(kant, smoothstep(.14, .3, length(vec2(gx, gy))) * .8);
  f = mix(f, vec3(.06, .05, .05), kant);
  gl_FragColor = vec4(f, 1.);
}` },

    // 7 Akvarell på papir: ujevne kanter, utflytende farge, pigment i kantene, papirstruktur
    { id: 'akvarell', navn: 'Akvarell', mobilSkala: .75, frag: `
void main() {
  vec2 uv = vUv + (vec2(fbm(vUv * 9. + 3.), fbm(vUv * 9. + 7.)) - .5) * .012;
  vec2 d = 2.2 * uPx / uRes;
  vec3 s = texture2D(tBilde, uv).rgb, b = vec3(0.);
  for (int i = 0; i < 8; i++) { float v = float(i) * .785 + .3; b += texture2D(tBilde, uv + vec2(cos(v), sin(v)) * d * (1. + mod(float(i), 2.))).rgb; }
  b /= 8.;
  vec3 c = mix(s, b, .55);
  float kant = abs(lum(s) - lum(b));
  c = metning(c, .8);
  c = 1. - (1. - c) * .78;
  c = mix(c, c * c * .9, smoothstep(.02, .12, kant));
  float papir = fbm(gl_FragCoord.xy / uPx * .35) * .6 + fbm(gl_FragCoord.xy / uPx * 1.6) * .4;
  c *= 1. - (papir - .5) * .22;
  c *= vec3(.98, .95, .87);
  c = mix(c, vec3(.94, .9, .8), smoothstep(.42, .7, length(vUv - .5)) * .7);
  gl_FragColor = vec4(c, 1.);
}` },

    // 8 Sepia 1940: brunt fotografi, myk kant, flimmer, riper og støv
    { id: 'sepia', navn: 'Sepia 1940', frag: `
void main() {
  vec2 p = vUv - .5;
  float r = length(p);
  vec2 d = uPx / uRes * (1. + r * 6.);
  vec3 c = texture2D(tBilde, vUv).rgb * .4;
  c += (texture2D(tBilde, vUv + vec2(d.x, 0.)).rgb + texture2D(tBilde, vUv - vec2(d.x, 0.)).rgb + texture2D(tBilde, vUv + vec2(0., d.y)).rgb + texture2D(tBilde, vUv - vec2(0., d.y)).rgb) * .15;
  float l = pow(lum(c), .7);
  l = smoothstep(.04, .98, l);
  l *= 1. + (hash(vec2(floor(uTid * 16.), 1.)) - .5) * .08;
  vec3 f = mix(vec3(.12, .08, .05), vec3(1., .92, .76), l);
  f += (hash(floor(gl_FragCoord.xy / (1.2 * uPx)) + fract(uTid * 9.1) * 40.) - .5) * .08;
  float kol = floor(vUv.x * 900.), bilde = floor(uTid * 10.);
  float ripe = step(.9985, hash(vec2(kol, floor(bilde / 3.))));
  f = mix(f, vec3(.95, .9, .8), ripe * .5 * step(.3, stoy(vec2(kol, vUv.y * 30. + bilde))));
  float stov = step(.9993, hash(floor(gl_FragCoord.xy / (3. * uPx)) + bilde * 1.7));
  f *= 1. - stov * .7;
  vec2 q = p; q.x *= uRes.x / uRes.y;
  f *= 1. - smoothstep(.3, .85, length(q) + (fbm(vUv * 4.) - .5) * .12) * .75;
  gl_FragColor = vec4(f, 1.);
}` },

    // 9 Kald nordisk film: bleach bypass – lav metning, hard kontrast, blågrønne skygger
    { id: 'nordisk', navn: 'Kald nordisk', frag: `
void main() {
  vec3 c = pow(texture2D(tBilde, vUv).rgb, vec3(.7));
  float l = lum(c);
  vec3 o = mix(2. * c * l, 1. - 2. * (1. - c) * (1. - l), step(.5, l));
  c = mix(c, o, .5);
  c = metning(c, .45);
  l = lum(c);
  c += vec3(-.035, .012, .045) * (1. - smoothstep(0., .55, l)) + vec3(-.01, .005, .02) * smoothstep(.6, 1., l);
  c = smoothstep(.02, 1., c) * .97;
  c += (hash(floor(gl_FragCoord.xy / uPx) + fract(uTid * 3.7) * 60.) - .5) * .035;
  vec2 p = vUv - .5; p.x *= uRes.x / uRes.y; c *= 1. - smoothstep(.45, 1.1, length(p)) * .4;
  gl_FragColor = vec4(c, 1.);
}` },

    // 10 Miniatyr (tilt-shift): skarpt bånd i midten, uskarpt over og under, sterkere farger
    { id: 'miniatyr', navn: 'Miniatyr', mobilSkala: .75, frag: `
void main() {
  float fokus = .44;
  float u = smoothstep(.07, .42, abs(vUv.y - fokus));
  float rad = u * 7. * uPx;
  vec3 s = vec3(0.); float n = 0.;
  for (int i = 0; i < 16; i++) { float fi = float(i);
    float rr = sqrt((fi + .5) / 16.) * rad; float v = fi * 2.39996;
    s += texture2D(tBilde, vUv + vec2(cos(v), sin(v)) * rr / uRes).rgb; n += 1.; }
  vec3 c = s / n;
  c = metning(c, 1.4);
  c = mix(c, c * c * (3. - 2. * c), .4) * 1.04;
  vec2 p = vUv - .5; c *= 1. - dot(p, p) * .45;
  gl_FragColor = vec4(c, 1.);
}` },
  ];
  // palett til Piksel: dempede jord-, grønn- og himmelfarger (80-tall)
  const PALETT = ['14161a', '2b2f33', '4a4f4f', '7a7d75', 'b5b3a3', 'e6e1cc', '2e3a28', '4d5e33', '7d8a4a', '3b4a5a', '6b8299', 'a9bccb', '5a4231', '8f6a45', 'c2a172', '8a3b2e'];

  const NØKKEL = 'riksbrudd-filter';
  let valgt = 'ingen';
  try { const v = localStorage.getItem(NØKKEL); if (FILTRE.some(f => f.id === v)) valgt = v; } catch (e) { /* privat vindu */ }
  let G = null;   // GL-ting, lages første gang et filter brukes (THREE finnes først i 3D)

  function oppsett(R) {
    const r = R.renderer, T = THREE;
    const harDybde = r.capabilities.isWebGL2 || !!r.extensions.get('WEBGL_depth_texture');
    const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), null); quad.frustumCulled = false; scene.add(quad);
    const tom = new T.DataTexture(new Uint8Array(4), 1, 1);
    G = { scene, cam, quad, harDybde, tom, mat: {}, rt: {}, str: new T.Vector2(), pal: PALETT.map(h => new T.Color('#' + h)).map(c => new T.Vector3(c.r, c.g, c.b)) };
  }
  // tre slags mål: vanlig (multisample i WebGL2 = kantutjevning), med dybde (uten kantutjevning) og lav (Piksel, skarpe piksler)
  function mål(type, w, h) {
    let rt = G.rt[type];
    if (!rt) {
      const T = THREE, r = R3.renderer, val = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: true };
      if (type === 'lav') { val.minFilter = val.magFilter = T.NearestFilter; rt = new T.WebGLRenderTarget(w, h, val); }
      else if (type === 'dybde') { rt = new T.WebGLRenderTarget(w, h, val); rt.depthTexture = new T.DepthTexture(w, h); rt.depthTexture.type = T.UnsignedIntType; }
      else rt = r.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(w, h, val) : new T.WebGLRenderTarget(w, h, val);
      G.rt[type] = rt;
    }
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    return rt;
  }
  function materiale(F) {
    if (G.mat[F.id]) return G.mat[F.id];
    const u = { tBilde: { value: null }, tDybde: { value: G.tom }, uRes: { value: new THREE.Vector2() }, uKilde: { value: new THREE.Vector2() }, uTid: { value: 0 },
      uPx: { value: 1 }, uNaer: { value: 5 }, uFjern: { value: 80000 }, uHarDybde: { value: 0 } };
    if (F.id === 'piksel') u.uPal = { value: G.pal };
    const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FELLES + F.frag, depthTest: false, depthWrite: false });
    G.mat[F.id] = m; return m;
  }

  function tegn(R) {
    const F = FILTRE.find(f => f.id === valgt);
    if (!F || !F.frag) return false;
    if (!G) oppsett(R);
    const r = R.renderer; r.getDrawingBufferSize(G.str);
    const W = G.str.x, H = G.str.y, mobil = VW < 900;
    let w = W, h = H, type = F.dybde && G.harDybde ? 'dybde' : 'vanlig';
    if (F.lav) { h = Math.min(H, F.lav(mobil)); w = Math.max(1, Math.round(W * h / H)); type = 'lav'; }
    else if (mobil && F.mobilSkala) { w = Math.round(W * F.mobilSkala); h = Math.round(H * F.mobilSkala); }
    const rt = mål(type, w, h), m = materiale(F), u = m.uniforms;
    u.tBilde.value = rt.texture; u.tDybde.value = type === 'dybde' ? rt.depthTexture : G.tom; u.uHarDybde.value = type === 'dybde' ? 1 : 0;
    u.uRes.value.set(W, H); u.uKilde.value.set(w, h); u.uTid.value = (performance.now() / 1000) % 1000; u.uPx.value = r.getPixelRatio();
    u.uNaer.value = R.cam.near; u.uFjern.value = R.cam.far;
    G.quad.material = m;
    // tellerne (trekanter, rammer) skal gjelde scenen, ikke firkanten: nullstilles én gang her
    r.info.autoReset = false; r.info.reset();
    try {
      r.setRenderTarget(rt); r.render(R.scene, R.cam);
      r.setRenderTarget(null); r.render(G.scene, G.cam);
    } finally { r.setRenderTarget(null); r.info.autoReset = true; }
    return true;
  }
  KROKER.bilde3d.push(tegn);

  // tekst i 3D-overlegget for kamerafiltrene: tidsstempel på VHS, sikte på varmesøkeren, merke på nattsikt
  const to = n => String(n).padStart(2, '0');
  function klokke() { const t = 360 + (typeof tid !== 'undefined' ? tid : 0), m = Math.floor(t) % 1440; return `${to(Math.floor(m / 60))}:${to(m % 60)}:${to(Math.floor((t % 1) * 60))}`; }
  KROKER.tegn3d.push(g => {
    if (valgt !== 'vhs' && valgt !== 'varme' && valgt !== 'natt') return;
    const W = VW, H = VH, s = Math.max(14, Math.min(26, W / 34)), x = Math.max(16, W * .04), y = Math.max(70, H * .1);
    g.save(); g.font = `bold ${s}px "Courier New", monospace`; g.textBaseline = 'top';
    const skriv = (t, tx, ty, farge, venstre = true) => { g.textAlign = venstre ? 'left' : 'right'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(t, tx + 2, ty + 2); g.fillStyle = farge; g.fillText(t, tx, ty); };
    if (valgt === 'vhs') {
      const blink = Math.floor(performance.now() / 600) % 2 === 0;
      skriv('PLAY ▶', x, y, '#f2f2f2'); if (blink) skriv('● REC', W - x, y, '#ff4a3a', false);
      skriv('SP', x, y + s * 1.3, '#f2f2f2');
      const dag = typeof tid !== 'undefined' ? Math.floor((360 + tid) / 1440) : 0, dato = new Date(2023, 10, 10 + dag);
      skriv(`${to(dato.getDate())}.${to(dato.getMonth() + 1)}.${dato.getFullYear()}`, x, H - y - s * 1.3, '#f2f2f2');
      skriv(klokke(), x, H - y, '#f2f2f2');
    } else if (valgt === 'varme') {
      const cx = W / 2, cy = H / 2, k = Math.min(W, H) * .05; g.strokeStyle = 'rgba(20,20,20,.9)'; g.lineWidth = 2; g.beginPath();
      g.moveTo(cx - k * 2, cy); g.lineTo(cx - k * .4, cy); g.moveTo(cx + k * .4, cy); g.lineTo(cx + k * 2, cy);
      g.moveTo(cx, cy - k * 2); g.lineTo(cx, cy - k * .4); g.moveTo(cx, cy + k * .4); g.lineTo(cx, cy + k * 2); g.stroke();
      g.strokeRect(cx - k * 3.2, cy - k * 2.2, k * 6.4, k * 4.4);
      skriv('IR  WHT', x, y, '#ffffff'); skriv('×2.0', W - x, y, '#ffffff', false); skriv(klokke(), x, H - y, '#ffffff');
    } else {
      skriv('NV-2', x, y, '#9cff9c'); skriv('IR AV', W - x, y, '#9cff9c', false);
    }
    g.restore();
  });

  // knappen i ☰: blar gjennom filtrene
  const knapp = document.createElement('button'); knapp.id = 'filterknapp'; knapp.title = 'Filter / kameralinse i 3D (trykk for neste)';
  const sett = () => { knapp.textContent = 'Filter: ' + FILTRE.find(f => f.id === valgt).navn; };
  function velg(id) {
    if (!FILTRE.some(f => f.id === id)) return false;
    valgt = id; try { localStorage.setItem(NØKKEL, id); } catch (e) { /* privat vindu */ } sett(); return true;
  }
  knapp.onclick = () => { const i = FILTRE.findIndex(f => f.id === valgt); velg(FILTRE[(i + 1) % FILTRE.length].id); if (typeof logg === 'function') logg('Filter i 3D: ' + FILTRE.find(f => f.id === valgt).navn); };
  sett(); document.getElementById('lagmeny').appendChild(knapp);
  window.Filtre = { liste: FILTRE.map(f => ({ id: f.id, navn: f.navn })), velg, valgt: () => valgt, harDybde: () => G ? G.harDybde : null };
})();
