'use strict';
// BØLGER, VIND OG TÅKE (12. nov, brukeren: «legg til bølger, vind og tåke»).
// Vinden kommer fra værreglene (window.VAER.vind: fart i m/s og retningen den blåser mot; spill/vaer.js, nytt vær «Storm» med kuling).
// Her legges vindkast oppå, og vinden brukes til:
//  - bølger på sjø og vann: bakkeshaderen får bølgenormaler (flere bølgetog, lengre og høyere jo mer det blåser; mindre på innsjøer),
//    himmelspeiling ved flat vinkel, skumtopper når det blåser friskt og brenninger langs land på havet (under ca. 1 moh.);
//  - trærne: svaiingen og takten følger vindfarten, og toppen heller med vinden (Vind3d.U / DEKL / prosjekt brukes av liv3d.js og
//    vegetasjon3d.js);
//  - løv som blåser (høst, eller storm), snøfokk langs bakken (vinter/snø) – punkter rundt kameraet når du er nær bakken;
//  - tåkedotter som driver med vinden rundt kameraet i tåke og morgentåke, og havtåke over sjøen;
//  - vinden i statuslinja («6 m/s SV», hele navnet som tittel: «laber bris fra sørvest»).
// Kroker: KROKER.sett3d (bølgeshaderen, havtåka), KROKER.ramme3d (vind, partikler, tåke). window.Vind3d.sjekk() for testene.
(function () {
  let UU = null;
  // felles uniformer for trærne (lages første gang de trengs; THREE finnes først i 3D)
  const U = () => UU || (UU = { uVindT: { value: 0 }, uVindK: { value: 1 }, uVindL: { value: new THREE.Vector2() } });
  const DEKL = 'uniform float uVindT;\nuniform float uVindK;\nuniform vec2 uVindL;\n';
  // som three sin project_vertex, men toppen av treet heller med vinden (i meter etter instansmatrisen, kvadratisk mot toppen)
  const prosjekt = f => `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  mvPosition.xy += uVindL * ${(+f).toFixed(3)} * max(0.0, transformed.z) * max(0.0, transformed.z) * instanceMatrix[2].z;
#endif
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;`;

  // ---------- regler uten THREE ----------
  const NAVN = [[.3, 'stille'], [1.6, 'flau vind'], [3.4, 'svak vind'], [5.5, 'lett bris'], [8, 'laber bris'], [10.8, 'frisk bris'], [13.9, 'liten kuling'],
    [17.2, 'stiv kuling'], [20.8, 'sterk kuling'], [24.5, 'liten storm'], [99, 'full storm']];
  const RETN = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'], RETN_LANG = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'];
  function styrke(fart) { for (const [g, n] of NAVN) if (fart < g) return n; return 'full storm'; }
  // retningen vinden kommer FRA (kompass, 0 = nord, med klokka); retning = vinkelen den blåser mot i kartet (0 = øst, π/2 = nord)
  function fra(retning) { const kurs = ((90 - (retning + Math.PI) * 180 / Math.PI) % 360 + 360) % 360; return Math.round(kurs / 45) % 8; }
  // vindkast: 1 ± opptil 35 % (mer når det blåser mye), glatt i tid (s)
  function kast(t, fart) { const k = Math.min(1, fart / 9); return 1 + k * (.22 * Math.sin(t * .9) * Math.sin(t * .37 + 1) + .13 * Math.sin(t * 2.3 + Math.sin(t * .5))); }
  const trinn = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

  // ---------- bølger i bakkeshaderen ----------
  const BU = {}; let bShader = null;
  function bølgeShader(mat) {
    if (!BU.uBTid) Object.assign(BU, { uBTid: { value: 0 }, uBAmp: { value: .3 }, uBSkum: { value: 0 }, uBDir: { value: new THREE.Vector2(1, 0) }, uBHimmel: { value: new THREE.Color(.7, .78, .85) } });
    const før = mat.onBeforeCompile, nøkkel = mat.customProgramCacheKey;
    mat.onBeforeCompile = (sh, rr) => { if (før) før(sh, rr); Object.assign(sh.uniforms, BU); bShader = sh;
      sh.vertexShader = 'varying vec2 vBP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBP = position.xy;');
      sh.fragmentShader = 'uniform float uBTid;\nuniform float uBAmp;\nuniform float uBSkum;\nuniform vec2 uBDir;\nuniform vec3 uBHimmel;\nvarying vec2 vBP;\n' + sh.fragmentShader
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef USE_SPECULARMAP
  float bVann = texture2D(specularMap, vUv).r;
  if (bVann > 0.03) {
    float bAvst = length(vViewPosition), bHav = 1.0 - smoothstep(1.0, 3.0, vMoh), bA = uBAmp * mix(0.45, 1.0, bHav);
    vec2 d1 = uBDir, d2 = vec2(d1.x * 0.88 - d1.y * 0.47, d1.x * 0.47 + d1.y * 0.88), d3 = vec2(d1.x * 0.82 + d1.y * 0.57, d1.y * 0.82 - d1.x * 0.57);
    vec2 d4 = vec2(d1.x * 0.34 - d1.y * 0.94, d1.x * 0.94 + d1.y * 0.34), bG = vec2(0.0);
    float bH = 0.0, bM = 0.0, bK, bP, bF, bS;
    // bølgegrupper: hvert bølgetog er sterkt noen steder og svakt andre (flekkene i detaljteksturen), så det ikke blir et rutemønster
    vec2 bDrift = uBDir * uBTid;
    float bG1 = texture2D(detalj, vBP / 61.0 + bDrift * 0.004).g, bG2 = texture2D(detalj, vBP / 43.0 - bDrift * 0.006 + 0.37).g;
#define BOLGE(D, L, F, S) bK = 6.2832 / L; bS = S; bP = bK * dot(D, vBP) - sqrt(9.81 * bK) * uBTid + F; bF = (1.0 - smoothstep(L * 14.0, L * 60.0, bAvst)) * bS; bG += D * (0.075 * bA * cos(bP) * bF); bH += 0.012 * L * bA * sin(bP) * bF; bM += 0.012 * L * bA * bF;
    BOLGE(d1, 13.0, 0.0, 0.3 + 1.4 * bG1)
    BOLGE(d2, 7.3, 1.7, 1.7 - 1.4 * bG1)
    BOLGE(d3, 4.1, 4.1, 0.3 + 1.4 * bG2)
    BOLGE(d4, 2.2, 2.6, 1.7 - 1.4 * bG2)
    BOLGE(d1, 1.25, 5.3, 1.0)
    // uregelmessig krusning oppå (støy i detaljteksturen som driver med vinden)
    vec2 bQ = vBP / 7.0 - bDrift * 0.05; float bN0 = texture2D(detalj, bQ).r;
    bG += vec2(texture2D(detalj, bQ + vec2(0.02, 0.0)).r - bN0, texture2D(detalj, bQ + vec2(0.0, 0.02)).r - bN0) * 2.2 * bA * (1.0 - smoothstep(40.0, 200.0, bAvst));
    vec3 bNV = normalize((viewMatrix * vec4(normalize(vec3(-bG, 1.0)), 0.0)).xyz);
    float bVekt = smoothstep(0.03, 0.5, bVann);
    normal = normalize(mix(normal, bNV, bVekt));
    // skum på bølgetoppene (friskt og mer) og brenninger langs land på havet
    // skumflekker: der bølgetoppen og en flekk i støyen faller sammen (brytes og drives av vinden), lenger ute striper langs vinden
    float bFl = texture2D(detalj, vBP / 23.0 - bDrift * 0.02).g, bFn = texture2D(detalj, vBP / 4.3 - bDrift * 0.08).r;
    float bTopp = smoothstep(0.62, 0.9, bH / max(bM, 0.001) * 0.45 + bFl * 0.55 + (bFn - 0.5) * 0.25) * step(0.004, bM);
    float bStripe = smoothstep(0.55, 0.8, texture2D(detalj, vec2(dot(vBP, uBDir) / 260.0, dot(vBP, vec2(-uBDir.y, uBDir.x)) / 31.0) + 0.5).g);
    float bSkum = uBSkum * bHav * (bTopp * 0.8 + 0.22 * bStripe * smoothstep(60.0, 300.0, bAvst));
    float bBrudd = bHav * (1.0 - smoothstep(0.3, 0.85, bVann)) * (0.55 + 0.45 * sin(uBTid * 1.1 + dot(vBP, uBDir) * 0.25)) * (0.3 + uBSkum);
    float bHvit = clamp(bSkum + bBrudd, 0.0, 0.9) * bVekt;
    float bFr = pow(1.0 - clamp(dot(bNV, normalize(vViewPosition)), 0.0, 1.0), 4.0);
    diffuseColor.rgb *= 1.0 - 0.16 * uBSkum * bVekt;
    diffuseColor.rgb = mix(diffuseColor.rgb, uBHimmel, bFr * 0.45 * bVekt);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.92), bHvit);
    specularStrength *= 1.0 - bHvit * 0.8;
  }
#endif`); };
    mat.customProgramCacheKey = () => (nøkkel ? nøkkel.call(mat) : '') + '-bolger'; mat.needsUpdate = true;
  }

  // ---------- teksturer ----------
  function sky(n, kant) {
    const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
    if (kant === 'tåke') {
      // myk, ujevn tåkedott: flere runde flekker
      let f = 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 14; k++) { const x = n * (.25 + rnd() * .5), y = n * (.35 + rnd() * .3), r = n * (.12 + rnd() * .2), gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }
    } else {
      // blad/fnugg: liten rund flekk med myk kant
      const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(n / 2, n / 2, n / 2, n * .32, .5, 0, 7); g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // ---------- partikler (løv og snøfokk) og tåke rundt kameraet ----------
  const mob = () => (typeof VW !== 'undefined' ? VW : 1200) < 900;
  let P = null, T = null, HAV = [], tåkeTex = null;
  const VIND = { fart: 0, kast: 1, retning: 0, vx: 0, vy: 0, modus: null, partikler: 0, tåke: 0, hav: 0 };
  function lagPartikler(R) {
    const N = mob() ? 110 : 280, pos = new Float32Array(N * 3), kol = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(kol, 3));
    const m = new THREE.Points(geo, new THREE.PointsMaterial({ size: .16, map: sky(16), vertexColors: true, transparent: true, depthWrite: false, alphaTest: .05 }));
    m.frustumCulled = false; m.visible = false; m.name = 'vindpartikler'; R.scene.add(m);
    P = { m, N, mål: new Float32Array(N), fase: Float32Array.from({ length: N }, () => Math.random() * 6.28), modus: null, aktiv: 0 };
  }
  function lagTåke(R) {
    if (!tåkeTex) tåkeTex = sky(128, 'tåke');
    const N = mob() ? 10 : 22; T = [];
    for (let k = 0; k < N; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tåkeTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { a: .6 + Math.random() * .4, str: 45 + Math.random() * 70, h: Math.random() * 6, ny: true }; s.renderOrder = 3; s.visible = false; s.name = 'tåkedott'; R.scene.add(s); T.push(s); }
  }
  const bakke = (R, x, y) => { const u = R.ut; return (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R.EX; };
  // et nytt punkt et tilfeldig sted rundt kameraet; mot vinden når den driver ut (oppvind = baksiden)
  function nyPartikkel(R, k, c, rad, oppvind) {
    const p = P.m.geometry.attributes.position.array, a = oppvind ? Math.atan2(-VIND.vy, -VIND.vx) + (Math.random() - .5) * 2.4 : Math.random() * 6.283, r = oppvind ? rad * (.75 + Math.random() * .25) : rad * Math.sqrt(Math.random());
    const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r, z = bakke(R, x, y);
    P.mål[k] = z; p[k * 3] = x; p[k * 3 + 1] = y; p[k * 3 + 2] = z + (P.modus === 'snø' ? Math.random() * 1.4 : .5 + Math.random() * 11);
    const col = P.m.geometry.attributes.color.array, v = Math.random();
    if (P.modus === 'snø') col.set([.95, .96, .98], k * 3);
    else if (P.modus === 'løv') col.set(v < .4 ? [.85, .5 + v * .4, .12] : v < .75 ? [.72, .26 + v * .15, .08] : [.55, .42, .18], k * 3);
    else col.set(v < .6 ? [.32, .45 + v * .2, .16] : [.5, .44, .22], k * 3);
  }
  function partikler(R, dt, nå) {
    const V = window.VAER, c = R.cam.position, nær = R.fot || (R.bane && R.bane.avst < 220);
    const snøBakke = V && (V.årstid === 'vinter' || (V.snøgrense != null && V.snøgrense < (c.z + R.ut.h0)));
    let modus = null, mengde = 0;
    if (V && nær) {
      if (snøBakke && VIND.fart > 6) { modus = 'snø'; mengde = trinn(6, 13, VIND.fart); }
      else if (V.årstid === 'høst' && VIND.fart > 2) { modus = 'løv'; mengde = trinn(2, 9, VIND.fart); }
      else if (V.årstid !== 'vinter' && VIND.fart > 9) { modus = 'blad'; mengde = trinn(9, 16, VIND.fart) * .7; }
    }
    VIND.modus = modus;
    if (!modus) { if (P) P.m.visible = false; VIND.partikler = 0; return; }
    if (!P) lagPartikler(R);
    const rad = R.fot ? 45 : 70, p = P.m.geometry.attributes.position.array;
    if (P.modus !== modus) { P.modus = modus; for (let k = 0; k < P.N; k++) nyPartikkel(R, k, c, rad, false); P.m.geometry.attributes.color.needsUpdate = true;
      P.m.material.size = modus === 'snø' ? .09 : .16; P.m.material.opacity = modus === 'snø' ? .75 : 1; }
    const n = Math.max(1, Math.round(P.N * mengde)); P.m.geometry.setDrawRange(0, n); P.m.visible = true; VIND.partikler = n;
    let nye = false; const tung = modus === 'snø' ? 1.25 : .8;
    for (let k = 0; k < n; k++) { const i = k * 3, f = P.fase[k] + nå * (modus === 'snø' ? 3 : 1.6);
      p[i] += (VIND.vx * tung + Math.sin(f) * .9) * dt; p[i + 1] += (VIND.vy * tung + Math.cos(f * 1.3) * .9) * dt;
      p[i + 2] += (modus === 'snø' ? Math.sin(f * 2.1) * .5 : -.55 + Math.sin(f * 1.7) * .9) * dt;
      // bakken under punktet hentes på nytt litt etter litt (åtte rammer per runde)
      if ((k & 7) === (Math.floor(nå * 60) & 7)) P.mål[k] = bakke(R, p[i], p[i + 1]);
      const dx = p[i] - c.x, dy = p[i + 1] - c.y;
      if (dx * dx + dy * dy > rad * rad || p[i + 2] < P.mål[k] - .1 || p[i + 2] > P.mål[k] + 14) { nyPartikkel(R, k, c, rad, true); nye = true; }
    }
    P.m.geometry.attributes.position.needsUpdate = true; if (nye) P.m.geometry.attributes.color.needsUpdate = true;
  }
  function tåke(R, dt) {
    const V = window.VAER, c = R.cam.position; if (!V) return;
    const lav = R.fot ? 1 : trinn(700, 150, R.bane ? R.bane.avst : 9999);
    const styrke = Math.max(trinn(.6, .15, V.dis), (V.dalTåke || 0) * .6) * lav; VIND.tåke = 0;
    const fc = R.scene.fog ? R.scene.fog.color : null, m = typeof NATT !== 'undefined' && NATT ? NATT.mørke || 0 : 0, lys = .4 + .6 * (1 - m);
    if (styrke > .02) {
      if (!T) lagTåke(R);
      const vx = VIND.vx * .8 || .6, vy = VIND.vy * .8, RAD = R.fot ? 95 : 220;
      for (const s of T) { const d = s.userData;
        if (d.ny) { const a = Math.random() * 6.283, r = 20 + Math.random() * RAD; s.position.x = c.x + Math.cos(a) * r; s.position.y = c.y + Math.sin(a) * r; d.ny = false; d.z = null; }
        s.position.x += vx * dt; s.position.y += vy * dt;
        let dx = s.position.x - c.x, dy = s.position.y - c.y;
        // driver den ut, kommer den inn igjen på motsatt side (mot vinden)
        if (dx * dx + dy * dy > RAD * RAD * 1.1) { s.position.x = c.x - dx * .92; s.position.y = c.y - dy * .92; dx = s.position.x - c.x; dy = s.position.y - c.y; d.z = null; }
        if (d.z == null || Math.random() < .03) d.z = bakke(R, s.position.x, s.position.y);
        s.position.z = d.z + d.h + d.str * .12; s.scale.set(d.str, d.str * .36, 1);
        const dd = Math.hypot(dx, dy, s.position.z - c.z);
        s.material.opacity = Math.min(.8, styrke * d.a * .75) * trinn(10, 40, dd) * (1 - trinn(RAD * .85, RAD * 1.05, dd)); s.visible = s.material.opacity > .01;
        if (fc) s.material.color.setRGB(Math.min(1, fc.r * .45 + .55) * lys, Math.min(1, fc.g * .45 + .55) * lys, Math.min(1, fc.b * .45 + .57) * lys);
        if (s.visible) VIND.tåke++; }
    } else if (T) for (const s of T) { s.visible = false; s.userData.ny = true; }
    // havtåke: store, lave banker over sjøen i tåkevær og når det er morgentåke
    const hs = Math.max(trinn(.6, .15, V.dis), (V.dalTåke || 0) * .9); VIND.hav = 0;
    for (const s of HAV) { const d = s.userData;
      d.dx = (d.dx + VIND.vx * .5 * dt) % 300; d.dy = (d.dy + VIND.vy * .5 * dt) % 300;
      s.position.set(d.x + d.dx, d.y + d.dy, d.z);
      const dd = Math.hypot(s.position.x - c.x, s.position.y - c.y, s.position.z - c.z);
      s.material.opacity = hs * d.a * .55 * trinn(30, 160, dd); s.visible = s.material.opacity > .01;
      if (fc) s.material.color.setRGB(Math.min(1, fc.r * .4 + .6) * lys, Math.min(1, fc.g * .4 + .6) * lys, Math.min(1, fc.b * .4 + .62) * lys);
      if (s.visible) VIND.hav++; }
  }

  // tett tåke: himmelen og disen blir gråhvite (før skinte blå himmel gjennom tåka). Kuppelen og skyene tones ut mot en grå bakgrunn.
  const sistFog = { r: -1, g: -1, b: -1 }, baseFog = { r: 0, g: 0, b: 0 };
  function gråHimmel(R) {
    const V = window.VAER, fog = R.scene.fog; if (!V || !fog || !R.kuppel) return;
    const tf = trinn(.6, .12, V.dis), fc = fog.color;
    // lys3d skriver tåkefargen av og til: ta vare på den som utgangspunkt så blandingen ikke drar seg mot grått rame for ramme
    if (Math.abs(fc.r - sistFog.r) + Math.abs(fc.g - sistFog.g) + Math.abs(fc.b - sistFog.b) > 1e-4) { baseFog.r = fc.r; baseFog.g = fc.g; baseFog.b = fc.b; }
    const l = (baseFog.r + baseFog.g + baseFog.b) / 3, g = Math.min(.92, l * 1.05 + .06), k = tf * .85;
    fc.setRGB(baseFog.r + (g - baseFog.r) * k, baseFog.g + (g - baseFog.g) * k, baseFog.b + (g * 1.01 - baseFog.b) * k); sistFog.r = fc.r; sistFog.g = fc.g; sistFog.b = fc.b;
    const km = R.kuppel.material; if (!km.transparent) { km.transparent = true; km.needsUpdate = true; }
    km.opacity = 1 - tf * .9; if (R.skyer) R.skyer.material.opacity = 1 - tf;
    if (R.scene.background && R.scene.background.isColor && tf > 0) R.scene.background.lerp(fc, tf);
    // nede i tåka ser du ca. 120 m (oppe i lufta er tåka et lag under deg, der gjelder disen fra været)
    const lav = (R.fot ? 1 : trinn(450, 120, R.bane ? R.bane.avst : 9999)) * tf;
    if (lav > 0) { fog.far = fog.far + (Math.min(fog.far, 120) - fog.far) * lav; fog.near = Math.min(fog.near, fog.far * (.15 - .13 * lav)); }
    VIND.grå = tf;
  }

  // ---------- kroker ----------
  KROKER.sett3d.push((u, R) => {
    if (R.mesh && R.mesh.material && R.mesh.material.specularMap) bølgeShader(R.mesh.material);
    for (const s of HAV) { R.scene.remove(s); s.material.dispose(); } HAV = [];
    // havtåka: punkter i sjøen (vannmasken og terreng under 1 moh.), spredt utover utsnittet
    if (!u.vann || !u.vann.getContext) return;
    const n = 48, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.drawImage(u.vann, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data, kand = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { if (d[(j * n + i) * 4] < 200) continue;
      const x = -u.S + (i + .5) / n * 2 * u.S, y = u.S - (j + .5) / n * 2 * u.S, h = hoyde3d(x + u.cx, y + u.cy, u); if (!(h < 1)) continue; kand.push([x, y, h]); }
    if (!kand.length) return; if (!tåkeTex) tåkeTex = sky(128, 'tåke');
    const MAKS = mob() ? 14 : 32, steg = Math.max(1, kand.length / MAKS);
    for (let k = 0; k < kand.length && HAV.length < MAKS; k += steg) { const [x, y, h] = kand[Math.floor(k)], str = 220 + Math.random() * 180;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tåkeTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.scale.set(str, str * .22, 1); s.userData = { x, y, z: (h - u.h0) * R.EX + 6 + Math.random() * 10, dx: 0, dy: 0, a: .6 + Math.random() * .4 };
      s.renderOrder = 3; s.visible = false; s.name = 'havtåke'; R.scene.add(s); HAV.push(s); }
  });
  let sist = 0, tekst = '';
  KROKER.ramme3d.push(R => {
    const nå = performance.now() / 1000, dt = Math.min(.1, nå - (sist || nå)); sist = nå;
    const V = window.VAER, vind = V && V.vind ? V.vind : { fart: 3, retning: .4 };
    VIND.kast = kast(nå, vind.fart); VIND.fart = vind.fart * VIND.kast; VIND.retning = vind.retning;
    VIND.vx = Math.cos(vind.retning) * VIND.fart; VIND.vy = Math.sin(vind.retning) * VIND.fart;
    const u = U(); u.uVindT.value = (u.uVindT.value + dt * (.5 + VIND.fart * .12)) % 6283;
    u.uVindK.value = .35 + VIND.fart * .22; const ln = Math.pow(VIND.fart, 1.5) * .001; u.uVindL.value.set(Math.cos(vind.retning) * ln, Math.sin(vind.retning) * ln);
    if (BU.uBTid) { BU.uBTid.value = nå % 3000; BU.uBAmp.value = Math.min(1.8, .2 + Math.pow(VIND.fart / 9, 1.3)); BU.uBSkum.value = trinn(6, 14, VIND.fart);
      BU.uBDir.value.set(Math.cos(vind.retning), Math.sin(vind.retning)); if (R.scene.fog) BU.uBHimmel.value.copy(R.scene.fog.color); }
    if (!R.ut) return;
    gråHimmel(R); partikler(R, dt, nå); tåke(R, dt);
  });
  // vinden i statuslinja (også i 2D)
  setInterval(() => {
    const V = window.VAER; if (!V || !V.vind) return; let el = document.getElementById('sVind');
    if (!el) { const sv = document.getElementById('sVaer'); if (!sv) return; el = document.createElement('span'); el.id = 'sVind'; sv.parentNode.insertBefore(el, sv.nextSibling); sv.parentNode.insertBefore(document.createTextNode(' '), el); }
    const f = Math.round(V.vind.fart), r = fra(V.vind.retning), t = `${f} m/s ${RETN[r]}`;
    if (t !== tekst) { tekst = t; el.textContent = t; el.title = `${styrke(V.vind.fart)} fra ${RETN_LANG[r]}`; }
  }, 1000);
  window.Vind3d = { U, DEKL, prosjekt, styrke, fra, kast, VIND,
    sjekk: () => ({ bølger: !!bShader && !!BU.uBTid, amp: BU.uBAmp ? BU.uBAmp.value : 0, skum: BU.uBSkum ? BU.uBSkum.value : 0, fart: VIND.fart, modus: VIND.modus,
      partikler: VIND.partikler, tåke: VIND.tåke, hav: VIND.hav, havDotter: HAV.length, status: (document.getElementById('sVind') || {}).textContent || '' }) };
})();
