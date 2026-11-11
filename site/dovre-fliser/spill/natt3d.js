'use strict';
// Dag og natt i 3D (regler i spill/vaer.js: måne, mørke, lyse vinduer, nordlys, vær). Henger seg på KROKER.lys3d / sett3d / ramme3d.
// Himmelen: stjerner (dreier rundt polstjerna), månen med riktig fase og svakt blått månelys, sol-skive med glød, varm himmel nær sola
// ved soloppgang og solnedgang, nordlys noen klare vinternetter, lyn i kraftig regn. Bakken: skyskygger som driver med vinden, våt bakke
// og pytter etter regn. Byen om kvelden: lyse vinduer i husene, lysflekker under gatelysene, tåkebanker i dalbunnen om morgenen.
// Alt følger klokka i spillet (tid), så det går like jevnt i 1×, 10× og 60×. Billig: uniformer, Points og sprites.
(function () {
  const glatt = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, trinn = (a, b, x) => glatt((x - a) / (b - a));
  const N = { mørke: 0, e: 40, stjerner: 0, måne: null, nordlys: 0, lyn: 0 };   // window.NATT: det andre moduler (liv3d.js) og testene leser
  window.NATT = N;
  // uniformer som deles av alle shaderne (endres hver ramme)
  const U = { uSkySkygge: { value: 0 }, uSkyTerskel: { value: .7 }, uSkyFlytt: { value: null }, uSentrum: { value: null }, uVaat: { value: 0 }, uStoy: { value: null },
    uVindu: { value: 0 }, uAndel: { value: .4 }, uTid: { value: 0 }, uNordlys: { value: 0 }, uStjerner: { value: 0 }, uStjStr: { value: 1.6 } };
  let H = null;   // himmelobjektene (lages første gang 3D vises)
  const mob = () => VW < 900;

  // ---------- teksturer ----------
  // Sømløs støy 256 × 256: r = skyskygger (store flak), g = pytter (små flekker), b = tåkeflak
  function støyTekstur() {
    const W = 256, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'), im = g.createImageData(W, W);
    let f = 9137; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647, s2 = t => t * t * (3 - 2 * t);
    const lag = [4, 8, 16, 32, 64].map(n => [n, Float32Array.from({ length: n * n }, rnd)]);
    const verdi = (x, y, fra, til) => { let v = 0, w = .5, sum = 0;
      for (let i = fra; i < til; i++) { const [n, a] = lag[i], u = x / W * n, t = y / W * n, i0 = Math.floor(u), j0 = Math.floor(t), fu = s2(u - i0), fv = s2(t - j0), q = (a1, b1) => a[(b1 % n) * n + (a1 % n)];
        v += w * ((q(i0, j0) * (1 - fu) + q(i0 + 1, j0) * fu) * (1 - fv) + (q(i0, j0 + 1) * (1 - fu) + q(i0 + 1, j0 + 1) * fu) * fv); sum += w; w /= 2; }
      return v / sum; };
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4;
      im.data[o] = verdi(x, y, 0, 4) * 255; im.data[o + 1] = verdi(x * 3 % W, y * 3 % W, 2, 5) * 255; im.data[o + 2] = verdi((x + 97) % W, (y + 41) % W, 1, 5) * 255; im.data[o + 3] = 255; }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function rund(W, stopp) {
    const c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'), gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    for (const [a, f] of stopp) gr.addColorStop(a, f); g.fillStyle = gr; g.fillRect(0, 0, W, W); return new THREE.CanvasTexture(c);
  }
  // Tåkeflak: myk kant med litt struktur
  function tåkeTekstur() {
    const W = 128, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'), im = g.createImageData(W, W);
    let f = 51; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647, p = Array.from({ length: 64 }, rnd);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const dx = (x - W / 2) / (W / 2), dy = (y - W / 2) / (W / 2), r = Math.hypot(dx, dy * 1.6), o = (y * W + x) * 4;
      const v = .75 + .25 * Math.sin(x * .11 + p[(y >> 3) % 64] * 6) * Math.sin(y * .17 + p[(x >> 3) % 64] * 6);
      im.data[o] = im.data[o + 1] = im.data[o + 2] = 255; im.data[o + 3] = Math.max(0, 1 - r) ** 1.6 * v * 255; }
    g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c);
  }
  // Månen: den lyse delen etter fasen (0 ny, 0,25 halv voksende = høyre side lys, 0,5 full), med mørkere «hav»
  function tegnMåne(c, fase) {
    const W = c.width, g = c.getContext('2d'), im = g.createImageData(W, W), L = [Math.sin(2 * Math.PI * fase), 0, -Math.cos(2 * Math.PI * fase)];
    const hav = [[-.25, -.2, .28], [.2, -.3, .2], [.1, .25, .22], [-.3, .3, .15]];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const nx = (x + .5) / W * 2 - 1, ny = (y + .5) / W * 2 - 1, r2 = nx * nx + ny * ny, o = (y * W + x) * 4;
      if (r2 > 1) { im.data[o + 3] = 0; continue; }
      const nz = Math.sqrt(1 - r2), lys = Math.max(0, Math.min(1, (nx * L[0] + nz * L[2]) * 6 + .5));
      let f = .93; for (const [hx, hy, hr] of hav) if (Math.hypot(nx - hx, ny - hy) < hr) f = .86;
      const v = (.05 + .95 * lys) * f, kant = Math.min(1, (1 - Math.sqrt(r2)) * W * .5);
      im.data[o] = 236 * v; im.data[o + 1] = 238 * v; im.data[o + 2] = 244 * v; im.data[o + 3] = (.12 + .88 * lys) * 255 * kant; }
    g.putImageData(im, 0, 0);
  }

  // ---------- himmelen (barn av himmelkuppelen, som følger kameraet) ----------
  const r = .985;   // bak skyene (0,97) og foran kuppelen (1)
  function lagHimmel(R) {
    const k = R.kuppel, h = {};
    // stjerner: punkter på kula, de fleste svake; dreies rundt himmelpolen (62° over nord) med klokka
    const n = mob() ? 1100 : 2600, pos = new Float32Array(n * 3), lys = new Float32Array(n), fase = new Float32Array(n), farge = new Float32Array(n * 3);
    let f = 4711; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const z = rnd() * 2 - 1, a = rnd() * 2 * Math.PI, s = Math.sqrt(1 - z * z);
      pos.set([Math.cos(a) * s * r, Math.sin(a) * s * r, z * r], i * 3); lys[i] = .25 + .75 * Math.pow(rnd(), 5); fase[i] = rnd() * 6.28;
      const t = rnd(); farge.set(t < .15 ? [1, .85, .7] : t < .35 ? [.8, .88, 1] : [1, 1, 1], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aLys', new THREE.BufferAttribute(lys, 1));
    sg.setAttribute('aFase', new THREE.BufferAttribute(fase, 1)); sg.setAttribute('aFarge', new THREE.BufferAttribute(farge, 3));
    h.stjerner = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: { uTid: U.uTid, uAlfa: U.uStjerner, uStr: U.uStjStr }, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute float aLys; attribute float aFase; attribute vec3 aFarge; uniform float uTid; uniform float uStr; varying float vLys; varying vec3 vFarge;
        void main() { vec3 d = normalize(mat3(modelMatrix) * position);
          vLys = aLys * (0.8 + 0.2 * sin(uTid * 2.3 + aFase)) * smoothstep(0.0, 0.22, d.z); vFarge = aFarge;
          gl_PointSize = uStr * (1.0 + aLys * 1.6); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uAlfa; varying float vLys; varying vec3 vFarge;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vLys * uAlfa; if (a < 0.01) discard; gl_FragColor = vec4(vFarge, a); }` }));
    h.polAkse = new THREE.Vector3(0, Math.cos(62.1 * Math.PI / 180), Math.sin(62.1 * Math.PI / 180));
    // nordlys: et bånd lavt på himmelen mot nord (asimut −85° til 85°, 7°–38° over horisonten), grønt med fiolett topp, gardiner som bølger
    const NA = 120, NE = 10, np = [], nu = [], ni = [];
    for (let j = 0; j <= NE; j++) for (let i = 0; i <= NA; i++) { const φ = (-85 + 170 * i / NA) * Math.PI / 180, el = (4 + 28 * j / NE) * Math.PI / 180;
      np.push(Math.sin(φ) * Math.cos(el) * r * .995, Math.cos(φ) * Math.cos(el) * r * .995, Math.sin(el) * r * .995); nu.push(i / NA, j / NE); }
    for (let j = 0; j < NE; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i; ni.push(a, a + 1, a + NA + 1, a + 1, a + NA + 2, a + NA + 1); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(np, 3)); ng.setAttribute('uv', new THREE.Float32BufferAttribute(nu, 2)); ng.setIndex(ni);
    h.nordlys = new THREE.Mesh(ng, new THREE.ShaderMaterial({ uniforms: { uTid: U.uTid, uStyrke: U.uNordlys }, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTid; uniform float uStyrke; varying vec2 vU;
        void main() { float x = vU.x * 34.0, t = uTid;
          float bolge = sin(x * 0.55 + t * 0.11) * 0.16 + sin(x * 1.7 - t * 0.19) * 0.07 + sin(x * 0.21 + t * 0.05) * 0.1;
          float y = vU.y - 0.12 - bolge * 0.8;
          float kant = smoothstep(-0.02, 0.06, y) * (1.0 - smoothstep(0.05, 0.75, y));
          float straler = 0.55 + 0.45 * sin(x * 7.0 + sin(x * 2.3 + t * 0.35) * 3.0 + t * 0.5);
          straler *= 0.65 + 0.35 * sin(x * 21.0 - t * 0.8);
          float side = smoothstep(0.0, 0.18, vU.x) * smoothstep(1.0, 0.82, vU.x) * (0.6 + 0.4 * sin(x * 0.13 + t * 0.03));
          float a = kant * straler * side * uStyrke;
          vec3 farge = mix(vec3(0.2, 1.0, 0.5), vec3(0.7, 0.3, 0.85), smoothstep(0.2, 0.7, y));
          gl_FragColor = vec4(farge, a * 0.85); }` }));
    // sola: skive med glød (adderes, så den lyser opp himmelen rundt); månen med fasen og en svak glorie
    h.sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: rund(128, [[0, 'rgba(255,255,250,1)'], [.07, 'rgba(255,250,235,1)'], [.1, 'rgba(255,235,190,.55)'], [.3, 'rgba(255,210,150,.16)'], [1, 'rgba(255,200,140,0)']]),
      transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    h.månC = document.createElement('canvas'); h.månC.width = h.månC.height = 96; h.månFase = -1;
    h.måne = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(h.månC), transparent: true, depthWrite: false, fog: false }));
    h.glorie = new THREE.Sprite(new THREE.SpriteMaterial({ map: rund(64, [[0, 'rgba(190,205,255,.5)'], [.25, 'rgba(170,190,240,.18)'], [1, 'rgba(160,180,230,0)']]), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    // tegnes i denne rekkefølgen før skyene (renderOrder −1), så skyene dekker dem
    [[h.stjerner, -3], [h.nordlys, -2.8], [h.glorie, -2.6], [h.måne, -2.5], [h.sol, -2.4]].forEach(([o, ro]) => { o.renderOrder = ro; o.frustumCulled = false; k.add(o); });
    return h;
  }

  // ---------- lys3d: varm himmel nær sola, månelys ----------
  let solVek = null, tmp = null;
  KROKER.lys3d.push((R, L) => {
    if (!H) { H = lagHimmel(R); N.himmel = H; solVek = new THREE.Vector3(); tmp = new THREE.Vector3(); }
    const V = window.VAER, sky = L.sky, e = L.e, er = e * Math.PI / 180;
    solVek.set(Math.sin(L.A) * Math.cos(er), Math.cos(L.A) * Math.cos(er), Math.sin(er));
    // glød rundt sola og et varmt bånd langs horisonten på samme side når sola er lav (sterkest rett før/etter den står opp/går ned)
    const glød = trinn(-10, -1.5, e) * (1 - trinn(5, 16, e)) * (1 - sky * .85), rosa = trinn(-7, -1, e) * (1 - trinn(1, 7, e)) * (1 - sky);
    if (glød > .01 || rosa > .01) {
      const pos = R.kuppel.geometry.attributes.position, kol = R.kuppel.geometry.attributes.color;
      for (let k = 0; k < pos.count; k++) { tmp.set(pos.getX(k), pos.getY(k), pos.getZ(k)); const z = tmp.z;
        const d = tmp.dot(solVek), nær = Math.pow(Math.max(0, d), 5), side = Math.pow(Math.max(0, d * .5 + .5), 4), lav = Math.pow(Math.max(0, 1 - Math.abs(z) * 5.5), 1.5);
        const gs = glød * (nær * .3 + side * lav * .24), ps = rosa * Math.pow(Math.max(0, -d * .5 + .5), 3) * Math.max(0, 1 - Math.abs(z - .08) * 5) * .22;   // rosa belte motsatt sola
        kol.setXYZ(k, kol.getX(k) + gs + ps * .9, kol.getY(k) + gs * .46 + ps * .55, kol.getZ(k) + gs * .16 + ps * .62); }
      kol.needsUpdate = true;
    }
    // månelyset: sollyset (retningslyset) flyttes over til månen om natta, svakt blått etter hvor mye av månen som lyser
    const h = L.h, dato = V ? V.dato : 200, M = Vaer.måne(dato, h); N.måne = M; N.e = e; N.mørke = Vaer.mørke(e);
    const Am = ((h - M.etter) - 12) * Math.PI / 12 + Math.PI, em = Math.max(M.høyde, 12) * Math.PI / 180, m = N.mørke;
    if (m > 0) {
      const månelys = (.06 + .2 * M.lys * trinn(-3, 10, M.høyde)) * (1 - .8 * sky);
      const sp = R.sol.position.clone().normalize().multiplyScalar(1 - m), mp = new THREE.Vector3(Math.sin(Am) * Math.cos(em), Math.cos(Am) * Math.cos(em), Math.sin(em)).multiplyScalar(m);
      R.sol.position.copy(sp.add(mp).normalize().multiplyScalar(1000));
      R.sol.intensity = R.sol.intensity * (1 - m) + månelys * m; R.sol.color.lerp(new THREE.Color(.62, .72, 1), m);
    }
    H.mDir = [Math.sin(Am) * Math.cos(M.høyde * Math.PI / 180), Math.cos(Am) * Math.cos(M.høyde * Math.PI / 180), Math.sin(M.høyde * Math.PI / 180)];
    H.sky = sky; H.base = { himmel: R.himmelLys.intensity, bak: R.scene.background.clone(), sky: R.skyer.material.color.clone() };
  });

  // ---------- sett3d: bakken, husene, gatelysene, tåkebankene ----------
  function bakkeShader(mat) {
    const før = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, rr) => { if (før) før(sh, rr); Object.assign(sh.uniforms, { uSkySkygge: U.uSkySkygge, uSkyTerskel: U.uSkyTerskel, uSkyFlytt: U.uSkyFlytt, uSentrum: U.uSentrum, uVaat: U.uVaat, uStoy: U.uStoy });
      sh.vertexShader = 'uniform vec2 uSentrum;\nvarying vec2 vVerd;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vVerd = position.xy + uSentrum;');
      sh.fragmentShader = 'uniform float uSkySkygge;\nuniform float uSkyTerskel;\nuniform vec2 uSkyFlytt;\nuniform float uVaat;\nuniform sampler2D uStoy;\nvarying vec2 vVerd;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
      // (ytelse 12. nov: teksturoppslagene bare når det er skyskygger / våt bakke)
      if (uSkySkygge > 0.001) { float skyN = texture2D(uStoy, (vVerd + uSkyFlytt) / 2400.0).r;
      diffuseColor.rgb *= 1.0 - uSkySkygge * smoothstep(uSkyTerskel, uSkyTerskel + 0.1, skyN); }
      float vaat = uVaat * smoothstep(0.55, 0.85, vOpp) * (1.0 - sno), pytt = 0.0;
      if (vaat > 0.001) pytt = vaat * smoothstep(0.6, 0.7, texture2D(uStoy, vVerd / 41.0).g) * smoothstep(0.96, 0.995, vOpp);
      diffuseColor.rgb *= 1.0 - 0.3 * vaat - 0.25 * pytt;`)
        .replace('#include <specularmap_fragment>', '#include <specularmap_fragment>\n      specularStrength = max(specularStrength, vaat * 0.22 + pytt * 0.85);'); };
    mat.customProgramCacheKey = () => 'natt-bakke'; mat.needsUpdate = true;
  }
  // lyse vinduer: glasset i vindusteksturen (blågrått, mørkt) lyser varmt i en fast tilfeldig andel av vinduene
  function vinduShader(mat) {
    mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, { uVindu: U.uVindu, uAndel: U.uAndel });
      sh.vertexShader = 'varying vec2 vVPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vVPos = position.xy;');
      sh.fragmentShader = 'uniform float uVindu;\nuniform float uAndel;\nvarying vec2 vVPos;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_MAP
      float glassM = step(0.04, texelColor.b - texelColor.r) * step(texelColor.r, 0.62);
      vec2 celle = floor(vUv + 0.001) + floor(vVPos / 23.0) * 17.0;
      float hv = fract(sin(dot(celle, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 lysF = mix(vec3(1.0, 0.7, 0.36), vec3(0.95, 0.9, 0.78), step(0.82, fract(hv * 7.3)));
      totalEmissiveRadiance += lysF * step(hv, uAndel) * glassM * uVindu * (0.75 + 0.4 * fract(hv * 13.1));
      #endif`); };
    mat.customProgramCacheKey = () => 'natt-vindu'; mat.needsUpdate = true;
  }
  // Tåkebanker: steder i dalbunnen (under 25 m over det laveste innen ca. 1 km), helst nær midten
  function dalpunkter(u, maks) {
    const steg = Math.max(1, Math.round(100 / u.steg)), m = Math.floor((u.N - 1) / steg) + 1, G = new Float32Array(m * m);
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) G[j * m + i] = u.H[(j * steg) * u.N + i * steg];
    const R = Math.max(2, Math.round(1000 / (steg * u.steg))), ut = []; let f = 77; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < m; j += 2) for (let i = 0; i < m; i += 2) { const h = G[j * m + i]; if (!(h > 5)) continue; let lav = h;
      for (let b = Math.max(0, j - R); b <= Math.min(m - 1, j + R); b += 2) for (let a = Math.max(0, i - R); a <= Math.min(m - 1, i + R); a += 2) lav = Math.min(lav, G[b * m + a]);
      if (h - lav > 25) continue; const x = -u.S + i * steg * u.steg, y = u.S - j * steg * u.steg; ut.push([x, y, h, Math.hypot(x, y) / u.S + rnd() * .6]); }
    return ut.sort((a, b) => a[3] - b[3]).slice(0, maks);
  }
  // testene (sjekk.js): kompilerer vindusshaderen også der det ikke står hus (en shaderfeil logges som feil i nettleseren)
  N.prøvShadere = R => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: vinduTekstur() })); vinduShader(m.material);
    m.position.copy(R.cam.position); R.scene.add(m); R.renderer.compile(R.scene, R.cam); R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); return true; };
  let tåkeTex = null, poolTex = null, glødTex = null;
  KROKER.sett3d.push((u, R) => {
    if (!U.uStoy.value) { U.uStoy.value = støyTekstur(); U.uSkyFlytt.value = new THREE.Vector2(); U.uSentrum.value = new THREE.Vector2(); }
    U.uSentrum.value.set(((u.cx % 2400) + 2400) % 2400, ((u.cy % 2400) + 2400) % 2400);
    bakkeShader(R.mesh.material);
    // husene med vindusglass (ikke tak, dører, planker og lager)
    const medGlass = [typeof VINDU !== 'undefined' && VINDU, typeof TREKL !== 'undefined' && TREKL, ...['leil', 'kontor', 'butikk', 'kirke', 'glass', 'industri'].map(t => BYGGTEX[t]), ...(window.Byhus ? Object.values(Byhus.TEX) : [])].filter(Boolean);
    for (const m of R.husMesh || []) if (m.material.map && medGlass.includes(m.material.map)) vinduShader(m.material);
    // gamle objekter bort
    for (const o of R.nattObj || []) { R.scene.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); } R.nattObj = [];
    // lysflekker under gatelysene (adderes på bakken) og en liten glød rundt lampa
    if (u.lys) {
      if (!poolTex) { poolTex = rund(64, [[0, 'rgba(255,214,150,.9)'], [.35, 'rgba(255,200,130,.45)'], [.7, 'rgba(255,190,120,.12)'], [1, 'rgba(255,190,120,0)']]);
        glødTex = rund(32, [[0, 'rgba(255,230,180,1)'], [.3, 'rgba(255,215,150,.5)'], [1, 'rgba(255,210,140,0)']]); }
      const n = u.lys.length / 4, pg = new THREE.PlaneGeometry(15, 15), mp = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
      const flekk = new THREE.InstancedMesh(pg, mp, n), d = new THREE.Object3D(), gp = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { const [x, y, z, v] = u.lys.subarray(k * 4, k * 4 + 4), hx = x + Math.cos(v) * 1.6, hy = y + Math.sin(v) * 1.6;
        d.position.set(hx, hy, (hoyde3d(hx + u.cx, hy + u.cy, u) - u.h0) * R.EX + .45); d.updateMatrix(); flekk.setMatrixAt(k, d.matrix); gp.set([hx, hy, z + 7.6], k * 3); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
      const glød = new THREE.Points(gg, new THREE.PointsMaterial({ size: 3.4, map: glødTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      for (const o of [flekk, glød]) { o.frustumCulled = false; o.visible = false; R.scene.add(o); R.nattObj.push(o); }
      R.nattLys = { flekk, glød };
    } else R.nattLys = null;
    // tåkebanker i dalbunnen
    if (!tåkeTex) tåkeTex = tåkeTekstur();
    let f = 3; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    R.nattTåke = dalpunkter(u, mob() ? 28 : 64).map(([x, y, h]) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tåkeTex, transparent: true, depthWrite: false, opacity: 0 })), str = 160 + rnd() * 200;
      s.scale.set(str, str * (.28 + rnd() * .14), 1); s.position.set(x + (rnd() - .5) * 60, y + (rnd() - .5) * 60, (h - u.h0) * R.EX + 8 + rnd() * 16); s.userData.a = .55 + rnd() * .45;
      s.visible = false; s.renderOrder = 2; R.scene.add(s); R.nattObj.push(s); return s; });
  });

  // ---------- hver ramme ----------
  let sistNå = 0, sistTid = null, nesteLyn = 0, lynStart = -9;
  KROKER.ramme3d.push(R => {
    if (!R.ut || !H) return; const V = window.VAER; if (!V) return;
    const nå = performance.now() / 1000, h = (6 + tid / TIME) % 24, e = Vaer.solHøyde(V.dag, h), m = Vaer.mørke(e), sky = V.sky, c = R.cam.position;
    const dTid = sistTid == null ? 0 : Math.max(0, Math.min(30, tid - sistTid)); sistTid = tid; sistNå = nå;
    N.e = e; N.mørke = m; U.uTid.value = nå % 10000;
    // stjerner: fram når sola er under −3°, fulle under −12°, borte bak skyene; dreier med stjernetiden
    N.stjerner = trinn(-3, -12, e) * (1 - trinn(.25, .85, sky)) * trinn(.15, .6, V.dis);
    U.uStjerner.value = N.stjerner; U.uStjStr.value = (mob() ? 1.3 : 1.6) * Math.min(2, dpr || 1); H.stjerner.visible = N.stjerner > .01;
    if (H.stjerner.visible) H.stjerner.quaternion.setFromAxisAngle(H.polAkse, -((tid / TIME) / 24) * 2 * Math.PI * 1.0027);
    // nordlys
    N.nordlys = Vaer.nordlys(V.årstid, V.dagNr || 0, h, e, sky); U.uNordlys.value = N.nordlys; H.nordlys.visible = N.nordlys > .01;
    // sola og månen
    const er = e * Math.PI / 180, A = (h - 12) * Math.PI / 12 + Math.PI;
    H.sol.position.set(Math.sin(A) * Math.cos(er) * r * .99, Math.cos(A) * Math.cos(er) * r * .99, Math.sin(er) * r * .99);
    const sa = trinn(-2.5, 1.5, e) * (1 - trinn(.55, .95, sky) * .95); H.sol.visible = sa > .01; H.sol.material.opacity = sa;
    H.sol.scale.setScalar(.2 + .1 * trinn(12, 0, e)); H.sol.material.color.setRGB(1, .9 - .25 * trinn(14, 0, e), .8 - .45 * trinn(14, 0, e));
    const M = N.måne;
    if (M && H.mDir) {
      if (Math.abs(M.fase - H.månFase) > .004) { H.månFase = M.fase; tegnMåne(H.månC, M.fase); H.måne.material.map.needsUpdate = true; }
      const [mx, my, mz] = H.mDir; H.måne.position.set(mx * r * .992, my * r * .992, mz * r * .992); H.glorie.position.copy(H.måne.position);
      const ma = trinn(-1.5, 2, M.høyde) * (.35 + .65 * m) * (1 - trinn(.55, .95, sky)) * trinn(.02, .1, M.lys);
      H.måne.visible = H.glorie.visible = ma > .01; H.måne.material.opacity = ma; H.måne.scale.setScalar(.034);
      H.glorie.material.opacity = ma * m * M.lys * .8; H.glorie.scale.setScalar(.2);
    }
    // vinduer og gatelys
    U.uVindu.value = trinn(.15, .6, m) * (mob() ? .9 : 1); U.uAndel.value = Vaer.vinduAndel(h);
    if (R.nattLys) { const a = trinn(.3, .7, m); R.nattLys.flekk.visible = R.nattLys.glød.visible = a > .01; R.nattLys.flekk.material.opacity = a * .5; R.nattLys.glød.material.opacity = a * .9; }
    // skyskygger og skyfart: skyene driver med vinden i spilltid (2 × vindfarten), skyggene bare når sola skinner gjennom glipper
    const vf = V.vind ? V.vind.fart : 3, vr = V.vind ? V.vind.retning : .4, fl = U.uSkyFlytt.value;
    if (fl && dTid) { fl.x = (fl.x - Math.cos(vr) * vf * 2 * dTid * 60) % 2400; fl.y = (fl.y - Math.sin(vr) * vf * 2 * dTid * 60) % 2400; }
    R.skyVri = (R.skyVri || tid * .0015) + dTid * .0015 * vf / 3.5;
    U.uSkySkygge.value = .34 * trinn(3, 15, e) * trinn(.12, .45, sky) * (1 - trinn(.85, 1, sky)); U.uSkyTerskel.value = .78 - .38 * sky;
    U.uVaat.value = V.våt || 0;
    // tåkebanker i dalen om morgenen (og i tåkevær), tones ut nær kameraet; litt dis i lavlandet om morgenen
    const dt = V.dalTåke || 0, høyde = c.z;
    if (dt > .01) { const fc = R.scene.fog.color, lys = .35 + .65 * (1 - m);
      for (const s of R.nattTåke || []) { const dd = Math.hypot(s.position.x - c.x, s.position.y - c.y, s.position.z - c.z);
        s.material.opacity = Math.min(.85, dt * s.userData.a * .95) * trinn(40, 220, dd); s.visible = s.material.opacity > .01;
        s.material.color.setRGB((fc.r * .5 + .5) * lys, (fc.g * .5 + .5) * lys, (fc.b * .5 + .52) * lys); }
      const fog = R.scene.fog; fog.far = Math.max(160, fog.far * (1 - .3 * dt * trinn(3000, 300, høyde))); fog.near = Math.min(fog.near, fog.far * .3);
    } else for (const s of R.nattTåke || []) s.visible = false;
    // lyn: i kraftig regn av og til et kort, dobbelt glimt som lyser opp himmelen og bakken
    if ((V.torden || 0) > .4 && nå > nesteLyn) { if (nesteLyn) lynStart = nå; nesteLyn = nå + (7 + Math.random() * 25) / V.torden; }
    const tl = nå - lynStart; N.lyn = tl < .45 ? Math.max(0, 1 - tl / .12) + (tl > .2 ? Math.max(0, .8 - (tl - .2) / .25 * .8) : 0) : 0;
    if (H.base) { const l = N.lyn;
      R.himmelLys.intensity = H.base.himmel * (1 + 2.2 * l); R.kuppel.material.color.setScalar(1 + 1.6 * l);
      R.scene.background.copy(H.base.bak).multiplyScalar(1 + 1.6 * l); R.skyer.material.color.copy(H.base.sky).multiplyScalar(1 + 1.2 * l); }
  });
})();
