'use strict';
// EFFEKTER I 3D (18. nov, nattarbeidet «natur»): det som skjer, skal synes.
//  - KJØRETØY: eksos når de kjører, støvsky på grus og i terrenget (ikke på våt bakke eller asfalt), snøføyke på snø, og hjulspor
//    som blir liggende en stund (mørkner bakken; tones bort).
//  - KAMP: munningsild, sporlys, kruttrøyk og nedslag når et lag skyter (SKUDD-lista i index.html: { a, b, til }), og et lite
//    blink i 2D-kartet.
//  - ØDELEGGELSE: kratere (Effekter3d.krater), svidd bakke og svidde trær i brente områder, flammer og røyk der det brenner.
//    Brente områder og branner leses fra window.BRENT og window.BRANNER (pakka «verden») – listene kan mangle, og hvert innslag
//    trenger bare { x, y, r } (kartets meter). Et kjøretøy som blir ødelagt (window.skadKjoretoy), etterlater et krater og røyk.
// Alt er billig: én punktsky (Points) for røyk/støv/ild, ett linjenett for sporlys, ett instansnett for hjulspor og ett for
// kratere, og et lite nett per brent område. Ingen nye lys. Mengden følger grafikknivået (KVAL.nivå); på Lav bare det viktigste.
// Reglene øverst uten DOM – test: node pipeline/fliser/test_effekter3d.js.
(function (rot) {
  // Alle tallene er Claudes forslag.
  const REGLER = {
    // høyeste antall partikler, spor og sporlys per grafikknivå [høy, middels, lav]
    partikler: { høy: 700, middels: 400, lav: 160 },
    spor: { høy: 1600, middels: 900, lav: 300 },
    sporlys: 48,
    // hjulspor: nytt stykke for hver 1,5 m, ligger i 10 minutter og tones bort de siste 2 (sekunder i ekte tid; runde 4: før 100 s –
    // sporene lagres nå per leir og kommer tilbake etter ny innlasting, så de får ligge litt)
    sporSteg: 1.5, sporTid: 600, sporTone: 120, sporBredde: .34,
    // lagring per leir (localStorage «riksbrudd-effekter»): høyst så mange hjulspor og kratere
    lagreSpor: 900, lagreKratere: 80,
    // krater: en mine mot fotfolk (radius m) og en salve fra rakettartilleriet (antall nedslag spredt innen «spredt» × salvens radius)
    mineKrater: 2.2, salve: { nedslag: 6, r: [3.5, 6], spredt: .45 },
    // støv: bare når bakken er tørrere enn dette (VAER.våt 0–1)
    tørt: .35,
    // skudd: så mange sporlys per sekund per lag som skyter, og farten på dem (m/s; saktere enn ekte kuler så de synes)
    skuddTakt: 5, kuleFart: 320, kuleLengde: 9,
    // kratere: høyst så mange, standard radius
    kratere: 80, kraterR: 4,
    // brente områder og branner: høyst så mange leses (de siste i lista)
    brente: 160, brenteHus: 60,
    // bare ting innen denne avstanden fra kameraet får røyk og støv (m)
    nær: 900,
    // lyngtustene lysnes opptil så mange ganger når du ser rett ned på dem (runde 4)
    lyng: 1.6,
    // brent mark: askefargen (0–1) og hvor mye den dekker der det har brent helt (resten er bakken under)
    aske: { farge: [.1, .085, .07], dekker: .74 },
  };
  // Hva ligger under hjulene? vegtype = 'asfalt' | 'grus' | null (terreng), snø = ligger det snø her, våt = 0–1.
  // Svar: { støv: 0–1, snø: bool, spor: 0–1 (hvor mørke sporene blir) }
  function underlag(vegtype, snø, våt) {
    if (snø) return { støv: 0, snø: true, spor: .55 };
    if (vegtype === 'asfalt') return { støv: 0, snø: false, spor: 0 };
    const tørr = Math.max(0, 1 - (våt || 0) / REGLER.tørt);
    return { støv: (vegtype === 'grus' ? 1 : .6) * tørr, snø: false, spor: vegtype === 'grus' ? .3 : .42 };
  }
  // Tolerant lesing av en liste med områder: tar bare med innslag som har tall for x og y; r mangler = 12 m.
  // Godtar også { X, Y }, { radius } og [x, y, r]. Høyst maks innslag (de siste).
  function områder(liste, maks) {
    const ut = []; if (!liste || typeof liste !== 'object') return ut;
    const alle = Array.isArray(liste) ? liste : (typeof liste.values === 'function' ? [...liste.values()] : Object.values(liste));
    for (const o of alle) { if (!o) continue;
      const x = Array.isArray(o) ? o[0] : (o.x != null ? o.x : o.X), y = Array.isArray(o) ? o[1] : (o.y != null ? o.y : o.Y); let r = Array.isArray(o) ? o[2] : (o.r != null ? o.r : o.radius);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue; if (!Number.isFinite(r) || r <= 0) r = 12;
      ut.push({ x, y, r: Math.min(400, r), styrke: Number.isFinite(o.styrke) ? Math.max(0, Math.min(1, o.styrke)) : 1 }); }
    return maks && ut.length > maks ? ut.slice(ut.length - maks) : ut;
  }
  // Hvor mye er (x, y) brent? 0–1 (1 i midten, 0 fra kanten)
  function brentVed(om, x, y) { let b = 0; for (const o of om) { const d = Math.hypot(x - o.x, y - o.y); if (d < o.r) b = Math.max(b, Math.min(1, (1 - d / o.r) * 2.2) * o.styrke); } return b; }
  // Hjulsporets styrke etter alderen (sekunder): fullt først, tones bort mot slutten
  function sporStyrke(alder) { const R = REGLER; if (alder >= R.sporTid) return 0; return alder < R.sporTid - R.sporTone ? 1 : (R.sporTid - alder) / R.sporTone; }
  // Lagring (runde 4): kratere [{ x, y, r, v }] og spor [{ x, y, cx, cy, l, v, h, b, k, født }] (født i sekunder som nå) blir til korte
  // lister i kartets meter; sporene som er for gamle, tas ikke med. Gir { kratere: [[x, y, r, v]], spor: [[X, Y, l, v, h, b, k, alder]] }.
  function tilLagring(kratere, spor, nå) {
    const R = REGLER, r2 = (x, d = 100) => Math.round(x * d) / d;
    const S = []; for (const s of spor.slice(-R.lagreSpor)) { const alder = nå - s.født; if (alder >= R.sporTid) continue; S.push([r2(s.x + (s.cx || 0), 10), r2(s.y + (s.cy || 0), 10), r2(s.l), r2(s.v, 1000), r2(s.h, 1000), s.b, r2(s.k), Math.max(0, Math.round(alder))]); }
    return { kratere: kratere.slice(-R.lagreKratere).map(k => [r2(k.x, 10), r2(k.y, 10), r2(k.r), r2(k.v || 0)]), spor: S };
  }
  // Tilbake fra lagringen: kratere og spor (sporene i kartets meter med cx = cy = 0, z regnes når de tegnes). Tåler skadde data.
  function fraLagring(d, nå) {
    const R = REGLER, ok = a => Array.isArray(a) && a.every(Number.isFinite), kratere = [], spor = []; if (!d || typeof d !== 'object') return { kratere, spor };
    for (const k of (Array.isArray(d.kratere) ? d.kratere : []).slice(-R.lagreKratere)) if (ok(k) && k.length >= 3 && k[2] > 0) kratere.push({ x: k[0], y: k[1], r: Math.min(30, k[2]), v: k[3] || 0 });
    for (const q of (Array.isArray(d.spor) ? d.spor : []).slice(-R.lagreSpor)) if (ok(q) && q.length >= 8 && q[7] < R.sporTid) spor.push({ x: q[0], y: q[1], cx: 0, cy: 0, z: 0, dz: null, l: q[2], v: q[3], h: q[4], b: q[5], k: q[6], født: nå - q[7] });
    return { kratere, spor };
  }
  // Nedslagene i en salve: n kratere spredt rundt (x, y) innen radius, fast for salven (frø)
  function salveKratere(x, y, radius, frø) {
    const S = REGLER.salve, ut = []; let f = (Math.floor(Math.abs(frø)) % 2147483646) + 1; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < S.nedslag; i++) { const a = rnd() * 6.283, d = i ? Math.sqrt(rnd()) * radius * S.spredt : 0; ut.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: S.r[0] + (S.r[1] - S.r[0]) * rnd() }); }
    return ut;
  }
  const Effekter = { REGLER, underlag, områder, brentVed, sporStyrke, tilLagring, fraLagring, salveKratere };
  if (typeof module !== 'undefined') { module.exports = Effekter; return; }
  rot.Effekter = Effekter;
  if (typeof KROKER === 'undefined') return;

  // ---------- i nettleseren ----------
  const r3 = () => (typeof R3 !== 'undefined' && R3 && R3.ut ? R3 : null);
  const nivå = () => (window.KVAL ? KVAL.nivå : 'høy');
  const T = { P: [], kuler: [], spor: [], sporNr: 0, sist: 0, kj: new Map(), skudd: new WeakMap(), kratere: [], brentNøkkel: '', brannTid: 0, laget: 0 };
  // lagringen per leir (runde 4)
  const L = { nøkkel: 'riksbrudd-effekter', leir: '', klar: false, endret: false };
  const zVed = (R, x, y) => (hoyde3d(x + R.ut.cx, y + R.ut.cy) - R.ut.h0) * R.EX;

  // ---- punktskyen: røyk, støv, eksos, munningsild, nedslag ----
  function punktsky(R) {
    if (R.effPunkter) return R.effPunkter;
    const N = REGLER.partikler.høy, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('aFarge', new THREE.BufferAttribute(new Float32Array(N * 4), 4)); geo.setAttribute('aStr', new THREE.BufferAttribute(new Float32Array(N), 1));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSkala: { value: 600 } }]),
      vertexShader: `attribute vec4 aFarge; attribute float aStr; uniform float uSkala; varying vec4 vFarge;
        #include <fog_pars_vertex>
        void main() { vFarge = aFarge; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = min(220.0, aStr * uSkala / max(0.5, -mvPosition.z));
          #include <fog_vertex>
        }`,
      fragmentShader: `varying vec4 vFarge;
        #include <fog_pars_fragment>
        void main() { float d = length(gl_PointCoord - 0.5); float a = vFarge.a * smoothstep(0.5, 0.12, d); if (a < 0.01) discard; gl_FragColor = vec4(vFarge.rgb, a);
          #include <fog_fragment>
        }` });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = 6; R.scene.add(p); return (R.effPunkter = p);
  }
  // ny partikkel: sted, fart, levetid (s), størrelse fra–til (m), farge og styrke; tyngde = fall (m/s²), brems = luftmotstand
  function ny(x, y, z, vx, vy, vz, liv, s0, s1, r, g, b, a, tyngde = 0, brems = 1.2) {
    const maks = REGLER.partikler[nivå()] || 400; if (T.P.length >= maks) T.P.shift();
    T.P.push({ x, y, z, vx, vy, vz, t: 0, liv, s0, s1, r, g, b, a, tyngde, brems });
  }
  const tilf = (a = 1) => (Math.random() - .5) * 2 * a;
  function røyk(x, y, z, mengde = 1, mørk = .25) { for (let i = 0; i < mengde; i++) ny(x + tilf(.4), y + tilf(.4), z, tilf(.4), tilf(.4), 1.2 + Math.random(), 3.5 + Math.random() * 3, .8, 4.5, mørk, mørk, mørk * 1.05, .42, -.15, .5); }
  function støv(x, y, z, mengde = 1, snø = false) { for (let i = 0; i < mengde; i++) { const k = snø ? [.93, .95, .98] : [.6, .52, .4];
    ny(x + tilf(.6), y + tilf(.6), z + .2, tilf(.9), tilf(.9), .5 + Math.random() * .9, 1.6 + Math.random() * 1.6, .7, snø ? 2.4 : 3.6, k[0], k[1], k[2], snø ? .5 : .34, snø ? 1.2 : .1, 1.4); } }
  function nedslag(x, y, z, snø = false) { const k = snø ? [.92, .94, .97] : [.36, .3, .22];
    for (let i = 0; i < 4; i++) ny(x, y, z + .1, tilf(1.8), tilf(1.8), 2.5 + Math.random() * 2.5, .5 + Math.random() * .4, .25, .9, k[0], k[1], k[2], .7, 9, .6); }
  function eksplosjon(x, y, z, r = 4) {
    for (let i = 0; i < 10; i++) ny(x + tilf(r * .3), y + tilf(r * .3), z + .5, tilf(r), tilf(r), 2 + Math.random() * r, .35 + Math.random() * .3, r * .4, r * 1.1, 1, .62 + Math.random() * .25, .2, .9, 2, 2);
    for (let i = 0; i < 12; i++) ny(x + tilf(r * .4), y + tilf(r * .4), z + .3, tilf(r * 1.2), tilf(r * 1.2), 4 + Math.random() * r * 1.5, .9 + Math.random() * .8, .4, 1.3, .3, .25, .2, .8, 9, .5);
    røyk(x, y, z + 1, 8, .16);
  }
  function stegPartikler(R, dt) {
    const p = punktsky(R), P = T.P, pos = p.geometry.attributes.position.array, kol = p.geometry.attributes.aFarge.array, str = p.geometry.attributes.aStr.array;
    const vind = window.Vind3d && Vind3d.VIND ? Vind3d.VIND : null, vx = vind && Number.isFinite(vind.fart) ? Math.sin(vind.retning || 0) * vind.fart * .25 : 0, vy = vind && Number.isFinite(vind.fart) ? Math.cos(vind.retning || 0) * vind.fart * .25 : 0;
    let n = 0;
    for (let i = 0; i < P.length; i++) { const q = P[i]; q.t += dt; if (q.t >= q.liv) continue;
      const f = Math.max(0, 1 - q.brems * dt); q.vx *= f; q.vy *= f; q.vz = q.vz * f - q.tyngde * dt;
      q.x += (q.vx + vx * Math.min(1, q.t)) * dt; q.y += (q.vy + vy * Math.min(1, q.t)) * dt; q.z += q.vz * dt;
      const t = q.t / q.liv; pos[n * 3] = q.x; pos[n * 3 + 1] = q.y; pos[n * 3 + 2] = q.z; str[n] = q.s0 + (q.s1 - q.s0) * t;
      kol[n * 4] = q.r; kol[n * 4 + 1] = q.g; kol[n * 4 + 2] = q.b; kol[n * 4 + 3] = q.a * (t < .12 ? t / .12 : 1 - (t - .12) / .88); P[n++] = q; }
    P.length = n; p.geometry.setDrawRange(0, n); p.visible = n > 0;
    if (n) { p.geometry.attributes.position.needsUpdate = true; p.geometry.attributes.aFarge.needsUpdate = true; p.geometry.attributes.aStr.needsUpdate = true; }
    // punktstørrelsen i skjermpunkter: lerretets høyde / (2 · tan(halv synsvinkel))
    const h = R.renderer.domElement.height || 800; p.material.uniforms.uSkala.value = h / (2 * Math.tan((R.cam.fov || 50) * Math.PI / 360));
  }

  // ---- sporlys ----
  function linjer(R) {
    if (R.effKuler) return R.effKuler;
    const N = REGLER.sporlys, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3)); geo.setDrawRange(0, 0);
    const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .95, depthWrite: false, fog: false })); l.frustumCulled = false; l.renderOrder = 7; R.scene.add(l); return (R.effKuler = l);
  }
  function stegKuler(R, dt) {
    const l = linjer(R), K = T.kuler, pos = l.geometry.attributes.position.array; let n = 0;
    for (let i = 0; i < K.length; i++) { const k = K[i]; k.s += REGLER.kuleFart * dt;
      if (k.s >= k.l) { if (k.treff) nedslag(k.x1, k.y1, k.z1, k.snø); continue; }
      const a = k.s / k.l, b = Math.max(0, (k.s - REGLER.kuleLengde) / k.l);
      pos[n * 6] = k.x0 + (k.x1 - k.x0) * a; pos[n * 6 + 1] = k.y0 + (k.y1 - k.y0) * a; pos[n * 6 + 2] = k.z0 + (k.z1 - k.z0) * a;
      pos[n * 6 + 3] = k.x0 + (k.x1 - k.x0) * b; pos[n * 6 + 4] = k.y0 + (k.y1 - k.y0) * b; pos[n * 6 + 5] = k.z0 + (k.z1 - k.z0) * b; K[n++] = k; }
    K.length = n; l.geometry.setDrawRange(0, n * 2); l.visible = n > 0; if (n) l.geometry.attributes.position.needsUpdate = true;
  }
  const snøVed = (X, Y) => { const V = window.VAER; return !!(V && Number.isFinite(V.snøgrense) && hoydeVed(X, Y) > V.snøgrense); };
  // lagene som skyter akkurat nå: munningsild og sporlys fra skytteren mot målet
  function stegSkudd(R, dt) {
    if (typeof SKUDD === 'undefined' || !SKUDD.length) return; const u = R.ut, nå = performance.now(), c = R.cam.position;
    for (const k of SKUDD) { if (k.til < nå || !k.a || !k.b) continue;
      if (typeof VIS !== 'undefined' && VIS.taake && typeof synlig === 'function' && !synlig(k.a) && !synlig(k.b)) continue;
      const ax = k.a.x - u.cx, ay = k.a.y - u.cy, bx = k.b.x - u.cx, by = k.b.y - u.cy;
      if (Math.abs(ax) > u.S * 1.2 || Math.abs(ay) > u.S * 1.2) continue;
      if (Math.hypot(ax - c.x, ay - c.y) > 2500) continue;
      let s = T.skudd.get(k); if (!s) { s = { t: 0 }; T.skudd.set(k, s); }
      s.t += dt * REGLER.skuddTakt * (nivå() === 'lav' ? .5 : 1);
      while (s.t >= 1) { s.t -= 1; if (T.kuler.length >= REGLER.sporlys) break;
        const x0 = ax + tilf(5), y0 = ay + tilf(5), z0 = zVed(R, x0, y0) + 1.25, x1 = bx + tilf(7), y1 = by + tilf(7), z1 = zVed(R, x1, y1) + Math.random() * 1.4;
        const l = Math.hypot(x1 - x0, y1 - y0, z1 - z0) || 1, dx = (x1 - x0) / l, dy = (y1 - y0) / l, dz = (z1 - z0) / l;
        T.kuler.push({ x0, y0, z0, x1, y1, z1, l, s: 0, treff: Math.abs(bx) < u.S && Math.abs(by) < u.S, snø: snøVed(k.b.x, k.b.y) });
        // munningsild (lyst, kort) og litt kruttrøyk
        ny(x0 + dx * .7, y0 + dy * .7, z0 + dz * .7, dx * 3, dy * 3, dz * 3, .07, .9, .5, 1, .85, .45, 1, 0, 0);
        if (Math.random() < .5) ny(x0 + dx, y0 + dy, z0 + dz, dx * 1.5 + tilf(.3), dy * 1.5 + tilf(.3), .4, 1.2 + Math.random(), .4, 1.6, .75, .75, .76, .22, -.2, 1.5);
      } }
  }

  // ---- hjulspor ----
  function spornett(R) {
    if (R.effSpor) return R.effSpor;
    const N = REGLER.spor.høy, g = new THREE.PlaneGeometry(1, 1);
    // MultiplyBlending: sporet mørkner bakken under (hvit = ingenting), så det virker både på grus, gress og snø
    const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ blending: THREE.MultiplyBlending, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), N);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3).fill(1), 3); m.count = 0; m.frustumCulled = false; m.renderOrder = 2; R.scene.add(m); return (R.effSpor = m);
  }
  const DUMMY = { o: null };
  function leggSpor(R, x0, y0, x1, y1, bredde, styrke) {
    const maks = REGLER.spor[nivå()] || 600, z0 = zVed(R, x0, y0), z1 = zVed(R, x1, y1);
    const s = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 + .07, l: Math.hypot(x1 - x0, y1 - y0) + .15, v: Math.atan2(y1 - y0, x1 - x0), h: Math.atan2(z1 - z0, Math.hypot(x1 - x0, y1 - y0) || 1), b: bredde, k: styrke, født: T.nå, cx: R.ut.cx, cy: R.ut.cy };
    if (T.spor.length >= maks) T.spor.shift(); T.spor.push(s); L.endret = true;
  }
  function stegSpor(R) {
    const m = spornett(R), d = DUMMY.o || (DUMMY.o = new THREE.Object3D()), u = R.ut, K = m.instanceColor.array; let n = 0, ut = 0;
    for (let i = 0; i < T.spor.length; i++) { const s = T.spor[i], f = sporStyrke(T.nå - s.født) * s.k; if (f <= 0) continue; T.spor[ut++] = s;
      // sporene huskes i det utsnittet de ble laget i: flytt dem når utsnittet er byttet
      d.position.set(s.x + s.cx - u.cx, s.y + s.cy - u.cy, s.z + (s.cx !== u.cx || s.cy !== u.cy ? (s.dz != null ? s.dz : (s.dz = zVed(R, s.x + s.cx - u.cx, s.y + s.cy - u.cy) + .07 - s.z)) : 0));
      d.rotation.set(0, -s.h, s.v, 'ZYX'); d.scale.set(s.l, s.b, 1); d.updateMatrix(); m.setMatrixAt(n, d.matrix);
      const c = 1 - f; K[n * 3] = c; K[n * 3 + 1] = c; K[n * 3 + 2] = c * 1.02 > 1 ? 1 : c * 1.02; n++; }
    T.spor.length = ut; m.count = n; m.visible = n > 0; if (n) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  }
  // Ett kjøretøy som kanskje har flyttet seg: eksos, støv/snøføyke og spor. id = fast navn, (X, Y) i kartets meter,
  // L = lengde, B = bredde, belter = bredere spor. Retningen tas fra bevegelsen.
  function kjør(R, dt, sett, id, X, Y, L, B, belter) {
    const u = R.ut, c = R.cam.position, x = X - u.cx, y = Y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) return; sett.add(id);
    const f = T.kj.get(id); if (!f) { T.kj.set(id, { X, Y, sx: X, sy: Y, røyk: 0 }); return; }
    const d = Math.hypot(X - f.X, Y - f.Y), cv = d ? (X - f.X) / d : 1, sv = d ? (Y - f.Y) / d : 0; f.X = X; f.Y = Y;
    // hopp (ny ordre, spoling med 600×) gir ingen spor
    if (d < .004 || d > 40) { f.sx = X; f.sy = Y; return; }
    const fart = d / Math.max(dt, .001), nær = Math.hypot(x - c.x, y - c.y) < REGLER.nær, lav = nivå() === 'lav', våt = window.VAER && Number.isFinite(VAER.våt) ? VAER.våt : 0;
    const U = underlag(u.vegType && (!u.påVeg || u.påVeg(x, y) || (u.vegNær && u.vegNær(x, y))) ? u.vegType(x, y) : null, snøVed(X, Y), våt);
    if (nær) { f.røyk += dt * Math.min(3, .6 + fart * .15);
      if (f.røyk > .12) { f.røyk = 0; const bx = x - cv * L * .45, by = y - sv * L * .45, z = zVed(R, bx, by);
        // eksos bak, støv eller snøføyke fra hjulene
        ny(bx + tilf(.3), by + tilf(.3), z + .6, -cv * 1.2 + tilf(.3), -sv * 1.2 + tilf(.3), .5, .9 + Math.random() * .6, .25, 1.1, .2, .2, .21, .38, -.3, 1.5);
        if (!lav && U.snø) støv(bx, by, z, 1, true); else if (!lav && U.støv > 0 && Math.random() < U.støv * Math.min(1, fart / 6)) støv(bx, by, z, fart > 9 ? 2 : 1, false); } }
    // spor: ett stykke per hjulrad for hver 1,5 m
    const ds = Math.hypot(X - f.sx, Y - f.sy);
    if (ds >= REGLER.sporSteg) { if (U.spor > 0 && ds < 12) { const hb = B * .38, nx = -(Y - f.sy) / ds, ny2 = (X - f.sx) / ds;
        for (const s of [-1, 1]) leggSpor(R, f.sx - u.cx + nx * hb * s, f.sy - u.cy + ny2 * hb * s, x + nx * hb * s, y + ny2 * hb * s, belter ? .55 : REGLER.sporBredde, U.spor); }
      f.sx = X; f.sy = Y; }
  }
  // kolonnenes kjøretøy (KJORETOY) og bilen du kjører selv (KjorSpill)
  function stegKjøretøy(R, dt) {
    const sett = new Set();
    if (window.KJORETOY && window.Kjoretoy) for (const k of KJORETOY) { const Ty = Kjoretoy.TYPER[k.type]; if (!Ty) continue; if (k.side !== 'blå' && typeof synlig === 'function' && !synlig(k)) continue;
      for (let i = 0; i < Math.min(k.antall || 1, 12); i++) { let p; try { p = Kjoretoy.posisjon(k, i * Ty.avstand); } catch (e) { continue; }
        kjør(R, dt, sett, (k.id != null ? k.id : k.navn) + ':' + i, p.x, p.y, Ty.lengde || 6, Ty.bredde || 2.4, !!Ty.belter || k.type === 'stridsvogn'); } }
    try { const L = window.KjorSpill && KjorSpill.liste ? KjorSpill.liste() : null;
      if (L) L.forEach((k, i) => { if (k && k.type === 'bil' && Number.isFinite(k.X) && Number.isFinite(k.Y)) kjør(R, dt, sett, 'egen:' + i, k.X, k.Y, 4.5, 2, false); }); } catch (e) { /* kjøring finnes ikke */ }
    if (T.kj.size > sett.size + 40) for (const id of [...T.kj.keys()]) if (!sett.has(id)) T.kj.delete(id);
  }

  // ---- kratere ----
  let kraterTex = null;
  function kraterTekstur() {
    if (kraterTex) return kraterTex; const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    // mørk grop i midten, lysere voll av jord rundt, flekker av jord utover – gjennomsiktig i kanten
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(18,15,12,.95)'); gr.addColorStop(.38, 'rgba(34,28,21,.92)'); gr.addColorStop(.5, 'rgba(96,80,58,.9)'); gr.addColorStop(.62, 'rgba(62,52,38,.75)'); gr.addColorStop(1, 'rgba(50,42,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S); let f = 77; const rnd = () => (f = (f * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 90; i++) { const a = rnd() * 6.283, r = 20 + rnd() * 42; g.fillStyle = `rgba(${40 + rnd() * 40 | 0},${32 + rnd() * 30 | 0},${22 + rnd() * 20 | 0},${.25 + rnd() * .5})`; g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1 + rnd() * 3.5, 0, 6.283); g.fill(); }
    return (kraterTex = new THREE.CanvasTexture(c));
  }
  function kraternett(R) {
    if (R.effKrater) return R.effKrater;
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: kraterTekstur(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), REGLER.kratere);
    m.count = 0; m.frustumCulled = false; m.renderOrder = 3; R.scene.add(m); R.effKraterNøkkel = ''; return (R.effKrater = m);
  }
  function stegKratere(R) {
    const u = R.ut, nøkkel = T.kratere.length + '|' + u.cx + '|' + u.cy; if (R.effKrater && R.effKraterNøkkel === nøkkel) return;
    const m = kraternett(R), d = DUMMY.o || (DUMMY.o = new THREE.Object3D()); let n = 0;
    for (const k of T.kratere) { const x = k.x - u.cx, y = k.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) continue;
      // flaten legges etter bakkens helning
      const z = zVed(R, x, y), e = k.r * .6, hx = Math.atan2(zVed(R, x + e, y) - zVed(R, x - e, y), 2 * e), hy = Math.atan2(zVed(R, x, y + e) - zVed(R, x, y - e), 2 * e);
      d.position.set(x, y, z + .12); d.rotation.set(hy, -hx, k.v || 0, 'XYZ'); d.scale.set(k.r * 2.6, k.r * 2.6, 1); d.updateMatrix(); m.setMatrixAt(n++, d.matrix); }
    m.count = n; m.visible = n > 0; m.instanceMatrix.needsUpdate = true; R.effKraterNøkkel = nøkkel;
  }
  // Lag et krater (kartets meter). smell = eksplosjon med ild og røyk nå.
  function krater(X, Y, r, smell) {
    if (!Number.isFinite(X) || !Number.isFinite(Y)) return; r = Number.isFinite(r) && r > 0 ? Math.min(30, r) : REGLER.kraterR;
    if (T.kratere.length >= REGLER.kratere) T.kratere.shift(); T.kratere.push({ x: X, y: Y, r, v: Math.random() * 6.283 }); T.sistKrater = { x: X, y: Y, t: performance.now() }; L.endret = true;
    const R = r3(); if (R && smell && på3d) { const x = X - R.ut.cx, y = Y - R.ut.cy; if (Math.abs(x) < R.ut.S && Math.abs(y) < R.ut.S) eksplosjon(x, y, zVed(R, x, y), r); }
    if (R) R.effKraterNøkkel = '';
  }

  // ---- brente områder: svidd bakke (ett nett som følger terrenget og mørkner det) og svidde trær ----
  // Pakka «verden» gir rutene som har brent (64 m brede, r = halve bredden): derfor regnes sverten ut til 1,5 × r, så naboruter
  // går i ett og en enslig rute får en myk, ujevn kant. Nettet ligger på et fast rutenett i kartet, og hver rute tegnes én gang.
  const brente = () => områder(window.BRENT, REGLER.brente).map(o => ({ ...o, r: o.r * 1.5 })), branner = () => områder(window.BRANNER, REGLER.brente);
  function ryddBrent(R) { for (const m of R.effBrent || []) { R.scene.remove(m); m.geometry.dispose(); } R.effBrent = []; }
  const sum = L => { let s = L.length; for (const o of L) s += o.x * 3 + o.y * 7 + o.r * 13 + o.styrke; return s; };
  function stegBrent(R) {
    // lista leses bare hver 20. ramme (den endres sjelden)
    if (R.effBrent && (T.brentTeller = (T.brentTeller || 0) + 1) % 20 && T.brentNøkkel !== '') return;
    const u = R.ut, om = brente(), nøkkel = u.cx + '|' + u.cy + '|' + (R.settNr || 0) + '|' + sum(om);
    if (nøkkel === T.brentNøkkel && R.effBrent) return; T.brentNøkkel = nøkkel; ryddBrent(R);
    // (runde 4) brent mark blandes mot aske (farge og styrke per hjørne) i stedet for å ganges mørkere: før ble lyse jorder og plener
    // stående lyse midt i det brente (sett på /rogaland)
    if (!R.effBrentMat) R.effBrentMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const inne = om.filter(o => Math.abs(o.x - u.cx) < u.S + o.r && Math.abs(o.y - u.cy) < u.S + o.r);
    if (inne.length) {
      const minR = inne.reduce((a, o) => Math.min(a, o.r), Infinity), st = Math.max(8, Math.min(40, minR / 3)), sett = new Set(), pos = [], kol = [], zs = new Map(), bs = new Map();
      // hjørnet (i, j) i rutenettet: høyde og svertegrad regnes én gang
      const hj = (i, j) => { const k = i + ',' + j; if (!bs.has(k)) { const X = i * st, Y = j * st, x = X - u.cx, y = Y - u.cy, ujevn = 1 + .16 * Math.sin(X * .21) * Math.cos(Y * .17);
        let b = 0; for (const o of inne) { const d = Math.hypot(X - o.x, Y - o.y) * ujevn; if (d < o.r) b = Math.max(b, Math.min(1, (1 - d / o.r) * 2.2) * o.styrke); }
        bs.set(k, b); zs.set(k, Math.abs(x) <= u.S && Math.abs(y) <= u.S ? zVed(R, x, y) + .09 : NaN); } return k; };
      for (const o of inne) { const i0 = Math.floor((o.x - o.r) / st), i1 = Math.ceil((o.x + o.r) / st), j0 = Math.floor((o.y - o.r) / st), j1 = Math.ceil((o.y + o.r) / st);
        for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) { const q = i + ',' + j; if (sett.has(q)) continue; sett.add(q);
          const K = [hj(i, j), hj(i + 1, j), hj(i + 1, j + 1), hj(i, j + 1)]; if (K.every(k => bs.get(k) <= 0) || K.some(k => zs.get(k) !== zs.get(k))) continue;
          const P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
          for (const n of [0, 1, 2, 0, 2, 3]) { const b = bs.get(K[n]), A = REGLER.aske; pos.push(P[n][0] * st - u.cx, P[n][1] * st - u.cy, zs.get(K[n])); kol.push(A.farge[0], A.farge[1], A.farge[2], A.dekker * b); } } }
      if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(kol), 4));
        const m = new THREE.Mesh(g, R.effBrentMat); m.renderOrder = 1; m.frustumCulled = false; R.scene.add(m); R.effBrent.push(m); }
    }
    const lokal = inne.map(o => ({ x: o.x - u.cx, y: o.y - u.cy, r: o.r, styrke: o.styrke }));
    // brente hus: et sotlag utenpå huset (et skall litt større enn omrisset som mørkner det som er bak – husene selv er ett
    // sammenslått nett og kan ikke farges ett og ett). Høyst REGLER.brenteHus hus.
    if (lokal.length && u.hus && u.hus.omriss) { const pos = []; let ant = 0;
      for (const P0 of u.hus.omriss) { if (ant >= REGLER.brenteHus) break; if (!P0 || P0.length < 3 || !(P0.topp === P0.topp)) continue;
        let mx = 0, my = 0, areal = 0; for (let i = 0; i < P0.length; i++) { const a = P0[i], b = P0[(i + 1) % P0.length]; mx += a[0]; my += a[1]; areal += a[0] * b[1] - b[0] * a[1]; } mx /= P0.length; my /= P0.length;
        if (brentVed(lokal, mx, my) < .3) continue; ant++;
        // mot klokka sett ovenfra, og litt større enn huset
        const P = (areal < 0 ? P0.slice().reverse() : P0).map(p => { const dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * .25, p[1] + dy / l * .25]; });
        let zb = Infinity; for (const p of P) zb = Math.min(zb, zVed(R, p[0], p[1])); zb -= .3;
        // (runde 4, sett på ekte hus på /rogaland) skallet følger taket: veggene opp til der taket begynner (P0.veggTopp fra hus3d), og et
        // tak med møne langs den lengste siden opp til P0.topp – før var det et flatt lokk på toppen, som la en mørk flekk i lufta over
        // saltakene og på bakken bak husene. Flate tak (uten veggTopp) får et flatt lokk som før.
        const zv = (Number.isFinite(P0.veggTopp) ? Math.min(P0.veggTopp, P0.topp) : P0.topp) + .25, zt = P0.topp + .3, ms = sotMøne(P, mx, my);
        for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length];
          pos.push(a[0], a[1], zb, b[0], b[1], zb, b[0], b[1], zv, a[0], a[1], zb, b[0], b[1], zv, a[0], a[1], zv);
          if (zt - zv < .2) { pos.push(mx, my, zv, a[0], a[1], zv, b[0], b[1], zv); continue; }
          const ra = ms(a), rb = ms(b); pos.push(a[0], a[1], zv, b[0], b[1], zv, rb[0], rb[1], zt); if (Math.hypot(ra[0] - rb[0], ra[1] - rb[1]) > .05) pos.push(a[0], a[1], zv, rb[0], rb[1], zt, ra[0], ra[1], zt); } }
      if (pos.length) { if (!R.effSotMat) R.effSotMat = new THREE.MeshBasicMaterial({ color: 0x4a4541, blending: THREE.MultiplyBlending, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        const m = new THREE.Mesh(g, R.effSotMat); m.renderOrder = 4; m.frustumCulled = false; m.userData.sot = ant; R.scene.add(m); R.effBrent.push(m); } }
    // trærne i de brente områdene blir svarte (fargen per tre i detaljnivå-lista; lodTrær fordeler dem på nytt)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const o of lokal) { x0 = Math.min(x0, o.x - o.r); x1 = Math.max(x1, o.x + o.r); y0 = Math.min(y0, o.y - o.r); y1 = Math.max(y1, o.y + o.r); }
    for (const t of R.treLOD || []) { if (!t.C0) t.C0 = new Float32Array(t.C); else t.C.set(t.C0); if (!lokal.length) continue;
      for (let k = 0; k < t.n; k++) { const x = t.data[k * 5], y = t.data[k * 5 + 1]; if (x < x0 || x > x1 || y < y0 || y > y1) continue; const b = brentVed(lokal, x, y); if (b <= .05) continue; const f = 1 - .85 * Math.min(1, b * 1.3);
        // (rødt holdes lavest: «blad = grønnere enn rødt» i høstfargene skal fortsatt gjelde)
        t.C[k * 3] *= f * .9; t.C[k * 3 + 1] *= f * .78; t.C[k * 3 + 2] *= f * .7; } }
    R.lodVed = null;
  }
  // Mønet for sotlaget: linja gjennom midten langs husets lengste side, fra ende til ende av omrisset. Gir en funksjon som legger et
  // punkt på omrisset vinkelrett inn på mønet (et punkt på en gavl havner i mønets ende, så gavlen blir en loddrett trekant).
  function sotMøne(P, mx, my) {
    let lx = 1, ly = 0, best = -1; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > best) { best = l; lx = (b[0] - a[0]) / (l || 1); ly = (b[1] - a[1]) / (l || 1); } }
    let t0 = Infinity, t1 = -Infinity; for (const p of P) { const t = (p[0] - mx) * lx + (p[1] - my) * ly; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
    return p => { const t = Math.max(t0, Math.min(t1, (p[0] - mx) * lx + (p[1] - my) * ly)); return [mx + lx * t, my + ly * t]; };
  }
  // der det brenner: flammer og røyk (noen få av rutene per gang, tilfeldig valgt blant dem nær kameraet)
  function stegBrann(R, dt) {
    T.brannTid += dt; if (T.brannTid < .09) return; T.brannTid = 0;
    const om = branner(); if (!om.length) return; const u = R.ut, c = R.cam.position, ant = nivå() === 'lav' ? 2 : 7;
    for (let n = 0; n < ant; n++) { const o = om[Math.floor(Math.random() * om.length)], x0 = o.x - u.cx, y0 = o.y - u.cy; if (Math.abs(x0) > u.S || Math.abs(y0) > u.S || Math.hypot(x0 - c.x, y0 - c.y) > 2500) continue;
      const x = x0 + tilf(o.r), y = y0 + tilf(o.r), z = zVed(R, x, y), stor = Math.min(3, .8 + o.r / 20);
      ny(x, y, z + .5, tilf(.6), tilf(.6), 2 + Math.random() * 2.5, .6 + Math.random() * .5, 1.8 * stor, .6 * stor, 1, .5 + Math.random() * .3, .12, .85, -1.5, .4);
      if (Math.random() < .6) ny(x + tilf(1), y + tilf(1), z + 3, tilf(.5), tilf(.5), 2 + Math.random() * 1.5, 5 + Math.random() * 4, 2 * stor, 7 * stor, .2, .2, .21, .4, -.25, .35); }
  }

  // ---- lyngen sett ovenfra (runde 4) ----
  // Lyngtustene i gresset (index.html gress3d/gressMateriale, aFelt = 1) ser mørke ut mot lys bakke når du ser rett ned på dem fra
  // 30–110 m. Materialet pakkes inn her (index.html er ikke endret): lyngen lysnes opptil REGLER.lyng ganger jo mer ovenfra du ser.
  function lyngLys(R) {
    const m = R.gressMesh && R.gressMesh.material; if (!m || m.userData.lyngLys) return; m.userData.lyngLys = true;
    const før = m.onBeforeCompile, nøkkel = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => '';
    m.onBeforeCompile = (sh, r) => { if (før) før(sh, r);
      if (!/attribute float aFelt/.test(sh.vertexShader)) return;
      sh.vertexShader = sh.vertexShader.replace('attribute float aFelt;', 'attribute float aFelt;\nvarying float vLyngLys;').replace('#include <fog_vertex>', `#include <fog_vertex>
  vec4 lyngW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  float lyngOpp = clamp((cameraPosition.z - lyngW.z) / max(0.001, length(cameraPosition - lyngW.xyz)), 0.0, 1.0);
  vLyngLys = 1.0 + ${(REGLER.lyng - 1).toFixed(3)} * aFelt * smoothstep(0.35, 0.8, lyngOpp);`);
      sh.fragmentShader = 'varying float vLyngLys;\n' + sh.fragmentShader.replace('#include <fog_fragment>', 'gl_FragColor.rgb *= vLyngLys;\n#include <fog_fragment>'); };
    m.customProgramCacheKey = () => nøkkel() + '-lyng'; m.needsUpdate = true;
  }

  // ---- krokene ----
  KROKER.ramme3d.push(R => { lyngLys(R); });
  KROKER.ramme3d.push(R => {
    if (!R.ut || !R.scene || R.bygger && !R.mesh) return;
    const nå = performance.now() / 1000; let dt = T.sist ? nå - T.sist : 0; T.sist = nå; if (dt > .25) dt = .25; T.nå = nå;
    const står = typeof tempo !== 'undefined' && tempo === 0;
    if (!står) { stegSkudd(R, dt); stegKjøretøy(R, dt); stegBrann(R, dt); }
    stegKuler(R, står ? 0 : dt); stegPartikler(R, står ? 0 : dt); stegSpor(R); stegKratere(R); stegBrent(R);
  });
  // nytt utsnitt: nettene hører til scenen og står, men det som er lagt etter terrenget, må legges på nytt
  KROKER.sett3d.push((u, R) => { T.brentNøkkel = ''; R.effKraterNøkkel = ''; for (const s of T.spor) s.dz = null; });
  // 2D: et lite blink ved laget som skyter og et støt ved målet
  KROKER.tegn.push((g, vx0, vy1) => {
    if (typeof SKUDD === 'undefined' || !SKUDD.length || kam.m > 40) return; const nå = performance.now();
    g.save();
    for (const k of SKUDD) { if (k.til < nå || !k.a || !k.b) continue; if (typeof VIS !== 'undefined' && VIS.taake && !synlig(k.a) && !synlig(k.b)) continue;
      const fase = (nå / 90 + (k.a.x % 7)) % 2 < 1; if (!fase) continue;
      const ax = (k.a.x - vx0) / kam.m, ay = (vy1 - k.a.y) / kam.m, bx = (k.b.x - vx0) / kam.m, by = (vy1 - k.b.y) / kam.m, l = Math.hypot(bx - ax, by - ay) || 1, r = Math.max(3, Math.min(7, 9 / kam.m));
      // blinket står litt foran laget, i retning målet
      const mx = ax + (bx - ax) / l * (r + 6), my = ay + (by - ay) / l * (r + 6);
      g.fillStyle = 'rgba(255,225,130,.95)'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .45 : r * 1.25; g.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr); } g.closePath(); g.fill();
      g.fillStyle = 'rgba(120,95,60,.7)'; const t = (nå / 400) % 1; g.beginPath(); g.arc(bx + Math.sin(nå / 130 + k.b.x) * 5, by + Math.cos(nå / 170) * 4, 1.5 + t * 2.5, 0, 6.283); g.fill(); }
    g.restore();
  });
  // et kjøretøy som blir ødelagt, etterlater et krater og en røyksky
  function pakkSkade() {
    const før = window.skadKjoretoy; if (typeof før !== 'function' || før.effekter) return;
    const ny2 = function (k, ...rest) { const x = k && k.x, y = k && k.y, antall = k && k.antall; const svar = før.call(this, k, ...rest);
      try { if (Number.isFinite(x) && (rest.includes('en mine') || typeof KJORETOY === 'undefined' || !KJORETOY.includes(k) || (k.antall || 0) < antall)) krater(x, y, 3.5, true); } catch (e) { /* effekten er ikke viktig */ }
      return svar; };
    ny2.effekter = true; window.skadKjoretoy = ny2;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pakkSkade); else pakkSkade();
  // sprengt bru, tunnel, kraftverk, dam eller veg (spill/odeleggelse-visning.js): smell og røyk der det skjer, krater i vegen
  if (KROKER.ødelagt) KROKER.ødelagt.push((o, hva) => { try { if (hva !== 'ødelegg' || !o) return;
    let X = o.x, Y = o.y; const d = o.deler && o.deler[0];
    if (!Number.isFinite(X) && d && d.length) { if (Array.isArray(d[0])) { X = 0; Y = 0; for (const p of d) { X += p[0]; Y += p[1]; } X /= d.length; Y /= d.length; }
      else { X = 0; Y = 0; for (let i = 0; i + 1 < d.length; i += 2) { X += d[i]; Y += d[i + 1]; } X /= d.length / 2; Y /= d.length / 2; } }
    if (!Number.isFinite(X) && o.bb && o.bb.length >= 4) { X = (o.bb[0] + o.bb[2]) / 2; Y = (o.bb[1] + o.bb[3]) / 2; }
    if (!Number.isFinite(X) || !Number.isFinite(Y)) return;
    if (o.lag === 'veg') krater(X, Y, 5, true); else { window.Effekter3d.eksplosjon(X, Y, 7); window.Effekter3d.røyk(X, Y, 10); } } catch (e) { /* effekten er ikke viktig */ } });

  // ---- miner mot fotfolk og salver fra rakettartilleriet lager kratere (runde 4) ----
  // Modulene sier ikke fra selv, så lista over salver (window.SALVER) og minefeltene (window.MINEFELT) følges: en salve som er borte
  // fra lista, har slått ned der den sto; et minefelt som har mistet ladninger, har gått av under et lag til fots i feltet
  // (kjøretøy på en mine får krateret sitt fra skadKjoretoy over).
  const kjenteSalver = new Set(), ladninger = new WeakMap();
  function følgNedslag() {
    const SA = window.SALVER;
    if (Array.isArray(SA)) { for (const s of kjenteSalver) if (!SA.includes(s)) { kjenteSalver.delete(s);
        const rad = (window.Enheter && Enheter.REGLER && Enheter.REGLER.artilleri && Enheter.REGLER.artilleri.radius) || 150;
        Effekter.salveKratere(s.x, s.y, rad, s.x * 7 + s.y * 3).forEach((k, i) => krater(k.x, k.y, k.r, i < 3)); }
      for (const s of SA) if (s && Number.isFinite(s.x) && Number.isFinite(s.y)) kjenteSalver.add(s); }
    const MF = window.MINEFELT; if (!Array.isArray(MF) || typeof ENHETER === 'undefined') return;
    const radius = (window.Feltarbeid && Feltarbeid.REGLER && Feltarbeid.REGLER.mine && Feltarbeid.REGLER.mine.radius) || 60;
    for (const f of MF) { const før = ladninger.get(f), nå = f.ladninger; ladninger.set(f, nå); if (før == null || !(nå < før)) continue;
      const kand = ENHETER.filter(e => e.menn && e.side !== f.side && Math.hypot(e.x - f.x, e.y - f.y) <= radius * 1.3);
      // et kjøretøy har alt fått krateret sitt (skadKjoretoy) hvis det kom et krater i feltet nettopp nå
      const sist = T.sistKrater; if (!kand.length || (sist && performance.now() - sist.t < 1500 && Math.hypot(sist.x - f.x, sist.y - f.y) < radius * 1.5)) continue;
      for (let i = 0; i < Math.min(før - nå, 3); i++) { const e = kand[Math.floor(Math.random() * kand.length)]; krater(e.x + tilf(4), e.y + tilf(4), REGLER.mineKrater, true); } }
  }
  KROKER.sim.push(følgNedslag);

  // ---- lagring per leir: kratere og hjulspor (runde 4) ----
  function lagre() { L.endret = false; if (!L.klar || !L.leir) return; try { localStorage.setItem(L.nøkkel, JSON.stringify({ leir: L.leir, ...Effekter.tilLagring(T.kratere, T.spor, performance.now() / 1000) })); } catch (e) { /* fullt eller sperret */ } }
  function lastInn() {
    const S = window.OppstartSpill && OppstartSpill.tilstand(); if (!S || !S.leir) return; L.leir = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null;
    try { d = JSON.parse(localStorage.getItem(L.nøkkel) || 'null'); } catch (e) { d = null; }
    const r = Effekter.fraLagring(d && d.leir === L.leir ? d : null, performance.now() / 1000); T.kratere.length = 0; T.kratere.push(...r.kratere); T.spor.length = 0; T.spor.push(...r.spor);
    L.klar = true; L.endret = false; const R = r3(); if (R) R.effKraterNøkkel = '';
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(lastInn, 0));
  window.addEventListener('pagehide', () => { if (L.endret) lagre(); });
  setInterval(() => { if (L.endret) lagre(); }, 5000);

  window.Effekter3d = { krater, kratere: () => T.kratere, lagre, lastInn, lyngLys, lagring: () => ({ ...L }), eksplosjon(X, Y, r) { const R = r3(); if (R) { const x = X - R.ut.cx, y = Y - R.ut.cy; eksplosjon(x, y, zVed(R, x, y), r || 4); } },
    røyk(X, Y, mengde) { const R = r3(); if (R) { const x = X - R.ut.cx, y = Y - R.ut.cy; røyk(x, y, zVed(R, x, y) + 1, mengde || 3); } },
    brente, branner, tall: () => ({ partikler: T.P.length, sporlys: T.kuler.length, spor: T.spor.length, kjøretøy: T.kj.size, kratere: T.kratere.length, brent: (r3() && r3().effBrent || []).length, sotHus: (r3() && r3().effBrent || []).reduce((a, m) => a + (m.userData.sot || 0), 0), brentTrekanter: (r3() && r3().effBrent || []).reduce((a, m) => a + m.geometry.attributes.position.count / 3, 0) }),
    // oppdater(): les BRENT på nytt i neste bilde (ellers leses lista hver 20. ramme)
    oppdater() { T.brentNøkkel = ''; },
    tøm() { T.P.length = 0; T.kuler.length = 0; T.spor.length = 0; T.kratere.length = 0; T.kj.clear(); T.brentNøkkel = ''; const R = r3(); if (R) R.effKraterNøkkel = ''; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
