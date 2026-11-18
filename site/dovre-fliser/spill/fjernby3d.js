'use strict';
// FJERN SKOG OG BEBYGGELSE (18. nov, nattarbeidet «natur»): verden skal ikke slutte brått. Trærne og husene finnes bare i utsnittet
// rundt deg – og når taket på antall trær er nådd, tynnes skogen lenger enn 600 m fra midten. Utenfor lå fjernterrenget
// (spill/fjern3d.js) som bare flater. Her fylles det ut med billige former:
//  - SKOGHOLT: fem lave, tresidede kjegler (15 trekanter) som står for en klynge trær. Inne i utsnittet der skogen er tynnet
//    (skogbunnen i bunnkartet, lenger enn 520 m fra midten, så mange som tynningen tok bort), og ute i ringen der arealklassen
//    er skog (ut til 2 × utsnittet). Nær kameraet krymper de bort (350–650 m), så de aldri står ved siden av ekte trær på nært hold.
//  - HUSKLYNGER: tre små hus (kasser med mørkt tak, 30 trekanter) der ringen har arealklassen tettsted.
// Høyden i ringen leses fra fjernringens eget nett (navnet «fjernring» i scenen), så holtene står på den. Finnes ikke ringen,
// lages bare det som er inne i utsnittet. Nettene deles i ruter så bare de i synsfeltet tegnes. Mengden følger grafikknivået
// (ingenting på Lav). Reglene øverst uten DOM – test: node pipeline/fliser/test_fjernby3d.js.
(function (rot) {
  // Alle tallene er Claudes forslag.
  const REGLER = {
    // høyeste antall skogholt [PC, mobil] per grafikknivå, og husklynger
    holt: { høy: [6000, 2400], middels: [3000, 1200], lav: [0, 0] },
    // så stor del av holtene kan stå inne i utsnittet (resten er til ringen utenfor)
    inneDel: .6,
    hus: { høy: [600, 250], middels: [300, 120], lav: [0, 0] },
    // inne i utsnittet: rutenett (m) og minste avstand fra midten; ute i ringen: rutenett (m) og hvor langt ut (× utsnittets halve side)
    inneRute: 45, inneFra: 520, uteRute: 95, uteTil: 2, uteStørrelse: 1.8,
    // holtene krymper bort nærmere kameraet enn dette (m): helt borte, helt framme
    nærFra: 350, nærTil: 650,
    // rutene nettene deles i (per side)
    ruter: 6,
  };
  const brøk = x => x - Math.floor(x);
  // fast tilfeldig tall 0–1 for en rute (samme sted gir samme svar)
  const hash = (i, j, s) => brøk(Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453);
  // Hvor stor andel av rutene med skog inne i utsnittet skal få et holt? andel = delen av de fjerne trærne som fikk stå (u.treTall).
  function inneAndel(andel) { if (!(andel >= 0)) return 0; return andel > .85 ? 0 : Math.min(1, (1 - andel) * 1.15); }
  // Høyden i et rutenett av punkter (z per punkt, n per side, fra −R til R, første rad øverst) med samme trekanter som fjernringen.
  // ok(k) = punktet finnes. Svar: z eller NaN.
  function nettHøyde(z, ok, n, R, x, y) {
    const c = 2 * R / (n - 1), fi = (x + R) / c, fj = (R - y) / c, i = Math.floor(fi), j = Math.floor(fj); if (i < 0 || j < 0 || i >= n - 1 || j >= n - 1) return NaN;
    const a = j * n + i, b = a + 1, cc = a + n, d = cc + 1; if (!(ok(a) && ok(b) && ok(cc) && ok(d))) return NaN;
    const fx = fi - i, fy = fj - j;
    return fx + fy <= 1 ? z(a) + (z(b) - z(a)) * fx + (z(cc) - z(a)) * fy : z(d) + (z(cc) - z(d)) * (1 - fx) + (z(b) - z(d)) * (1 - fy);
  }
  // Fargen på et holt: mørk barskog, noen lysere (løv), gule om høsten, hvite over snøgrensen. f = fast tall 0–1 for holtet.
  function holtFarge(f, moh, V) {
    const løv = f > .68, lys = .8 + .4 * brøk(f * 7.3); let k = løv ? [1.25 * lys, 1.3 * lys, .9 * lys] : [lys, lys, lys];
    if (V && V.høst && løv) { const t = V.høst * .8; k = [k[0] + (2.6 - k[0]) * t, k[1] + (1.7 - k[1]) * t, k[2] + (.5 - k[2]) * t]; }
    if (V && Number.isFinite(V.snøgrense) && moh > V.snøgrense) { const t = Math.min(1, (moh - V.snøgrense) / 60) * .78; k = k.map(v => v + (5.2 - v) * t); }
    return k;
  }
  const FjernBy = { REGLER, hash, inneAndel, nettHøyde, holtFarge };
  if (typeof module !== 'undefined') { module.exports = FjernBy; return; }
  rot.FjernBy = FjernBy;
  if (typeof KROKER === 'undefined') return;

  // ---------- i nettleseren ----------
  const mob = () => VW < 900, nivå = () => (window.KVAL ? KVAL.nivå : 'høy');
  let GEO = null;
  // geometriene (lages én gang og beholdes): skogholt og husklynge, z opp, farger i hjørnene
  function geo() {
    if (GEO) return GEO;
    const lag = fn => { const pos = [], kol = []; fn((p, k) => { pos.push(...p); kol.push(...k); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(kol), 3)); g.computeVertexNormals(); return g; };
    const holt = lag(legg => { for (const [x, y, r, h, v] of [[0, 0, 4.4, 14, .2], [9, 3, 3.8, 11, 1.3], [-6, 8, 4, 12.5, 2.1], [-4, -9, 3.6, 10, .7], [7, -7, 3.4, 9, 1.7]])
      for (let s = 0; s < 3; s++) { const a0 = v + s * 2.0944, a1 = v + (s + 1) * 2.0944, m = .7 + .25 * ((s * 5 + h) % 3) / 2;
        legg([x + Math.cos(a0) * r, y + Math.sin(a0) * r, -1], [.07 * m, .13 * m, .07 * m]); legg([x + Math.cos(a1) * r, y + Math.sin(a1) * r, -1], [.07 * m, .13 * m, .07 * m]); legg([x, y, h], [.15 * m, .26 * m, .13 * m]); } });
    const hus = lag(legg => { for (const [x, y, b, d, h, v] of [[0, 0, 11, 8, 6, .3], [17, 9, 9, 7, 5, 1.2], [-12, 14, 8, 8, 5.5, 2.4]]) {
      const c = Math.cos(v), s = Math.sin(v), P = (px, py, z) => [x + px * c - py * s, y + px * s + py * c, z], vegg = [.8, .78, .74], tak = [.22, .2, .2];
      const hj = [[-b / 2, -d / 2], [b / 2, -d / 2], [b / 2, d / 2], [-b / 2, d / 2]];
      for (let i = 0; i < 4; i++) { const [x0, y0] = hj[i], [x1, y1] = hj[(i + 1) % 4];
        for (const [px, py, z] of [[x0, y0, -1], [x1, y1, -1], [x1, y1, h], [x0, y0, -1], [x1, y1, h], [x0, y0, h]]) legg(P(px, py, z), vegg); }
      for (const [px, py] of [hj[0], hj[1], hj[2], hj[0], hj[2], hj[3]]) legg(P(px * 1.1, py * 1.1, h + .2), tak); } });
    return (GEO = { holt, hus });
  }
  // (three setter ikke cameraPosition for Lambert-materialer: kameraets plass sendes inn selv, hver ramme)
  const U = { uFjNaer: { value: REGLER.nærFra }, uFjFjern: { value: REGLER.nærTil }, uFjKam: { value: null } };
  function materiale(nærTone) {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); if (!nærTone) return m;
    // holtene krymper bort nær kameraet (avstanden regnes fra holtets fot)
    m.onBeforeCompile = sh => { if (!U.uFjKam.value) U.uFjKam.value = new THREE.Vector3(); Object.assign(sh.uniforms, U);
      sh.vertexShader = 'uniform float uFjNaer;\nuniform float uFjFjern;\nuniform vec3 uFjKam;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 fjFot = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float fjK = smoothstep(uFjNaer, uFjFjern, distance(fjFot.xyz, uFjKam));
        transformed.xy *= fjK; transformed.z = transformed.z * fjK - (1.0 - fjK) * 3.0;`); };
    m.customProgramCacheKey = () => 'fjernby-holt';
    return m;
  }
  const T = { u: null, ring: null, nivå: null, nett: [], vær: '', teller: 0, holt: 0, hus: 0, ute: 0 };
  function rydd(R) { for (const m of T.nett) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } T.nett = []; T.holt = T.hus = T.ute = 0; }
  const værNå = () => { const V = window.VAER || {}; return { snøgrense: Number.isFinite(V.snøgrense) ? V.snøgrense : 1e9, høst: V.høst || 0 }; };
  const værNøkkel = V => Math.round(V.snøgrense / 20) + '|' + Math.round(V.høst * 10);
  // Punktene deles i ruter (hver rute sitt instansnett med egen kule for synsfeltet)
  function lagNett(R, punkter, g0, mat, slag, RAD) {
    const N = REGLER.ruter, ruter = new Map(), d = new THREE.Object3D(), c = new THREE.Color(), V = værNå();
    for (const p of punkter) { const k = Math.min(N - 1, Math.max(0, Math.floor((p.x + RAD) / (2 * RAD) * N))) + N * Math.min(N - 1, Math.max(0, Math.floor((p.y + RAD) / (2 * RAD) * N))); if (!ruter.has(k)) ruter.set(k, []); ruter.get(k).push(p); }
    for (const L of ruter.values()) {
      // egen geometri per rute (deler hjørnedataene), så kula for synsfeltet gjelder ruta
      const g = new THREE.BufferGeometry(); for (const n of ['position', 'color', 'normal']) g.setAttribute(n, g0.attributes[n]);
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      const m = new THREE.InstancedMesh(g, mat(), L.length); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(L.length * 3), 3);
      L.forEach((p, i) => { d.position.set(p.x, p.y, p.z); d.rotation.set(0, 0, p.f * 6.283); d.scale.set(p.s, p.s, p.s * (.8 + .4 * brøk(p.f * 3.7))); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
        if (slag === 'holt') c.setRGB(...holtFarge(p.f, p.moh, V)); else { const t = brøk(p.f * 5.1); c.setRGB(...(t < .45 ? [1.1, 1.1, 1.08] : t < .7 ? [.95, .42, .34] : t < .88 ? [1, .86, .6] : [.7, .72, .74])); } m.setColorAt(i, c); });
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 60);
      m.userData.fjernby = slag; m.userData.punkter = L; m.name = 'fjernby-' + slag; R.scene.add(m); T.nett.push(m); }
  }
  function bygg(R, ring, u = R.ut) {
    rydd(R); if (!u) return; T.u = u; T.ring = ring; T.nivå = nivå(); T.vær = værNøkkel(værNå());
    const i = mob() ? 1 : 0, maksHolt = (REGLER.holt[T.nivå] || [0, 0])[i], maksHus = (REGLER.hus[T.nivå] || [0, 0])[i]; if (!maksHolt && !maksHus) return;
    const S = u.S, holt = [], hus = [];
    // inne i utsnittet: der skogen er tynnet
    const pInne = inneAndel(u.treTall ? u.treTall.andel : 1), B = u.bunn;
    if (pInne > 0 && B && maksHolt) { const st = REGLER.inneRute, i0 = Math.ceil((u.cx - S) / st), i1 = Math.floor((u.cx + S) / st), j0 = Math.ceil((u.cy - S) / st), j1 = Math.floor((u.cy + S) / st);
      for (let j = j0; j <= j1; j++) for (let a = i0; a <= i1; a++) { if (hash(a, j, 1) >= pInne) continue;
        const X = (a + .15 + .7 * hash(a, j, 2)) * st, Y = (j + .15 + .7 * hash(a, j, 3)) * st, x = X - u.cx, y = Y - u.cy; if (Math.abs(x) > S - 14 || Math.abs(y) > S - 14 || Math.hypot(x, y) < REGLER.inneFra) continue;
        const bi = Math.floor((x + S) / (2 * S) * B.W), bj = Math.floor((S - y) / (2 * S) * B.W); if (B.gress[bj * B.W + bi] !== 2) continue;
        if (u.påVeg && u.påVeg(x, y)) continue; const moh = hoyde3d(X, Y, u); if (!(moh === moh)) continue;
        holt.push({ x, y, z: (moh - u.h0) * R.EX, moh, f: hash(a, j, 4), s: .8 + .35 * hash(a, j, 5) }); } }
    // ute i ringen: skog og tettsteder etter arealklassen i fjernringens punkter, høyden fra ringens nett
    const P = ring && ring.userData && ring.userData.punkt, pos = ring && ring.geometry && ring.geometry.attributes.position, R2 = ring && ring.userData.R2;
    if (P && pos && R2 && P.kl && P.ok && P.n) { const n = P.n, celle = 2 * R2 / (n - 1), til = Math.min(R2 - celle, S * REGLER.uteTil), st = REGLER.uteRute, z = k => pos.getZ(k), ok = k => !!P.ok[k];
      const i0 = Math.ceil((u.cx - til) / st), i1 = Math.floor((u.cx + til) / st), j0 = Math.ceil((u.cy - til) / st), j1 = Math.floor((u.cy + til) / st);
      for (let j = j0; j <= j1; j++) for (let a = i0; a <= i1; a++) {
        const X = (a + .1 + .8 * hash(a, j, 12)) * st, Y = (j + .1 + .8 * hash(a, j, 13)) * st, x = X - u.cx, y = Y - u.cy; if (Math.abs(x) < S * .98 && Math.abs(y) < S * .98) continue;
        const k = Math.round((R2 - y) / celle) * n + Math.round((x + R2) / celle), K = P.kl[k]; if (K !== 1 && K !== 7) continue;
        const zz = nettHøyde(z, ok, n, R2, x, y); if (!(zz === zz)) continue; const moh = P.moh ? P.moh[k] : 0;
        if (K === 1) { if (maksHolt && hash(a, j, 14) < .8) holt.push({ x, y, z: zz - .5, moh, f: hash(a, j, 15), s: REGLER.uteStørrelse * (.8 + .4 * hash(a, j, 16)), ute: true }); }
        else if (maksHus && hash(a, j, 17) < .7) hus.push({ x, y, z: zz + .3, moh, f: hash(a, j, 18), s: 1 + .5 * hash(a, j, 19), ute: true }); } }
    // over taket: tynnes jevnt (etter holtets faste tall), inne og ute hver for seg – så skogen ikke slutter i en kant
    const kutt = (L, maks) => { if (L.length <= maks) return L; const andel = maks / L.length; return L.filter(p => brøk(p.f * 91.7) < andel); };
    const inne = kutt(holt.filter(p => !p.ute), Math.round(maksHolt * REGLER.inneDel)), ute = kutt(holt.filter(p => p.ute), maksHolt - inne.length);
    holt.length = 0; holt.push(...inne, ...ute); const hus2 = kutt(hus, maksHus); hus.length = 0; hus.push(...hus2); T.holt = holt.length; T.hus = hus.length; T.ute = ute.length;
    const RAD = Math.max(S, Math.min(R2 || S, S * REGLER.uteTil)), G = geo();
    if (holt.length) lagNett(R, holt, G.holt, () => materiale(true), 'holt', RAD);
    if (hus.length) lagNett(R, hus, G.hus, () => materiale(false), 'hus', RAD);
  }
  function farg() { const V = værNå(), c = new THREE.Color(); T.vær = værNøkkel(V);
    for (const m of T.nett) { if (m.userData.fjernby !== 'holt') continue; m.userData.punkter.forEach((p, i) => { c.setRGB(...holtFarge(p.f, p.moh, V)); m.setColorAt(i, c); }); m.instanceColor.needsUpdate = true; } }
  // ringen som ligger i scenen når et nytt utsnitt settes inn, hører til det forrige utsnittet: vent på en ny
  KROKER.sett3d.push((u, R) => { T.gammel = R.scene.getObjectByName('fjernring') || null; bygg(R, null, u); T.teller = 0; });
  KROKER.ramme3d.push(R => {
    if (!R.ut) return; if (!U.uFjKam.value) U.uFjKam.value = new THREE.Vector3(); U.uFjKam.value.copy(R.cam.position);
    if (T.u !== R.ut) { T.gammel = R.scene.getObjectByName('fjernring') || null; bygg(R, null); T.teller = 0; }
    // fjernringen bygges litt etter utsnittet: se etter den av og til, og bygg på nytt når den er kommet (eller grafikknivået er byttet)
    if ((T.teller++ & 31) === 0) { const ring = R.scene.getObjectByName('fjernring') || null;
      if (T.nivå !== nivå() || (ring && ring !== T.ring && ring !== T.gammel && ring.userData && ring.userData.punkt)) bygg(R, ring && ring !== T.gammel && ring.userData && ring.userData.punkt ? ring : null);
      else if (T.vær !== værNøkkel(værNå())) farg(); }
  });
  window.FjernBy3d = { tall: () => ({ holt: T.holt, ute: T.ute, hus: T.hus, nett: T.nett.length, trekanter: T.holt * 15 + T.hus * 30 }),
    // for vakten: står holtene på bakken? (bare de inne i utsnittet kan måles mot terrenget)
    sjekk() { const R = typeof R3 !== 'undefined' && R3; if (!R || !R.ut) return null; let svever = 0, nær = 0, inne = 0;
      for (const m of T.nett) for (const p of m.userData.punkter) { if (p.ute) continue; inne++; const z = (hoyde3d(p.x + R.ut.cx, p.y + R.ut.cy, R.ut) - R.ut.h0) * R.EX; if (Math.abs(z - p.z) > 1) svever++; if (Math.hypot(p.x, p.y) < REGLER.inneFra) nær++; }
      return { ...this.tall(), inne, svever, nær, iScene: T.nett.every(m => R.scene.children.includes(m)) }; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
