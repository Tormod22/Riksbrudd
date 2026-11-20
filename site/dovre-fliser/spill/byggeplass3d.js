/* Byggeplassen og den nye leiren i 3D (runde 8, 20. nov natt – kritikken: «Leiren i 3D er et tomt jorde ved start» og «den uferdige
 * brakka er en svevende, mørk, flat plate»). Før ble et bygg under arbeid tegnet som den ferdige modellen klemt flat etter framdriften.
 * Nå står byggeplassen i trinn som i kartet (spill/leir2d.js): stikker og snor, grunnmur med forskaling, reisverket som reises, taket
 * som legges fra den ene enden, kledning nedenfra, stillas rundt og materialer ved siden av. Og en ny leir har telt, bål, kasser,
 * oljefat og vedstabel rundt flaggstanga fra første stund (teltene blir færre når den første brakka er ferdig).
 * Reglene øverst uten DOM (Node: require('./byggeplass3d'); nettleser: globalThis.Byggeplass). Modellene nederst lages bare i
 * nettleseren når three.js finnes; leir-visning.js (lagLeir3d) bruker dem. Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene)
  const REGLER = {
    // under dette (framdriften p, 0–1): bare stikker og snor – laget har ikke begynt (eller er i kø / på vei)
    stikker: .02,
    // grunnmuren støpes fra 0 til hit (høyde grunnH meter)
    grunnFerdig: .2, grunnH: .35,
    // stenderne reises mellom disse (andelen av dem som står), taket legges fra den ene enden, kledningen kommer nedenfra
    reisverk: [.25, .45], tak: [.45, .95], kledning: [.6, .97],
    // stillaset står mellom disse, materialhaugen ligger til hit
    stillas: [.08, .97], materialer: .9,
    // avstand mellom stenderne og stillasstolpene (m), stillaset så langt ut fra veggen, veggen er denne andelen av modellens høyde
    stender: 1.2, stillasSteg: 2, stillasUt: .9, veggAndel: .7, veggMin: 2.2,
    // modellen lages på nytt for hvert slikt steg i framdriften
    nøkkelSteg: .05,
    // den nye leiren: teltene (færre når en brakke er ferdig), ringene rundt midten (m), forsøk per ting og luft mellom tingene
    leir: { telt: 3, teltEtterBrakke: 1, ring: [8, 12.5, 17], forsøk: 24, luft: 1 },
  };
  const R = REGLER;
  const klemme = (v, a, b) => Math.max(a, Math.min(b, v));
  const andel = (p, [a, b]) => klemme((p - a) / (b - a), 0, 1);
  // Hvor langt byggeplassen er kommet: { stikker, grunn (0–1), reisverk, tak, kledning (andeler 0–1), stillas, materialer }
  function stadium(p) {
    p = klemme(Number.isFinite(p) ? p : 0, 0, 1);
    if (p < R.stikker) return { stikker: true, grunn: 0, reisverk: 0, tak: 0, kledning: 0, stillas: false, materialer: true };
    return { stikker: false, grunn: klemme(p / R.grunnFerdig, .15, 1), reisverk: andel(p, R.reisverk), tak: andel(p, R.tak), kledning: andel(p, R.kledning),
      stillas: p > R.stillas[0] && p < R.stillas[1], materialer: p < R.materialer };
  }
  // Byggeplassen lages på nytt når nøkkelen endres (hvert 5. prosent)
  const nøkkel = p => Math.floor(klemme(Number.isFinite(p) ? p : 0, 0, 1) / R.nøkkelSteg + 1e-9);
  // Stolper langs en side fra a til b med høyst steg meters mellomrom (begge ender med): posisjonene langs siden (0..L)
  function stolper(L, steg) { const n = Math.max(1, Math.ceil(L / steg - 1e-9)), ut = []; for (let i = 0; i <= n; i++) ut.push(L * i / n); return ut; }
  // Tingene i den nye leiren: [type, ring (0, 1, 2), vinkel fra grunnretningen (radianer), radius til tingen (m)]
  const TING = [['bål', 0, 0, 1.6], ['ved', 0, .75, 1.2], ['kasser', 0, -.9, 1], ['fat', 1, -1.5, 1], ['telt', 1, .9, 2], ['telt', 1, 1.65, 2],
    ['telt', 1, 2.4, 2], ['presenning', 2, -2.3, 1.8]];
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // Plassene rundt leirens midte (0, 0). antTelt telt, frø gir grunnretningen (fast per leir), opptatt(x, y, r) svarer true der noe står
  // (bygg, flaggstang, vann). Gir [{ type, x, y, r, ret }] – ret = retningen tingen vender (mot bålet/midten).
  function leirting(antTelt, frø, opptatt) {
    const L = R.leir, a0 = (frø || 0) * Math.PI * 2, ut = []; let telt = 0;
    for (const [type, ring, va, r] of TING) {
      if (type === 'telt' && telt >= antTelt) continue;
      let funnet = null;
      for (let k = 0; k < L.forsøk && !funnet; k++) {
        const ri = Math.min(L.ring.length - 1, ring + Math.floor(k / 12)), steg = (k % 12), side = steg % 2 ? -1 : 1, a = a0 + va + side * Math.ceil(steg / 2) * .26;
        const x = Math.cos(a) * L.ring[ri], y = Math.sin(a) * L.ring[ri];
        if (opptatt && opptatt(x, y, r)) continue;
        if (ut.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r + L.luft)) continue;
        funnet = { type, x, y, r, ret: Math.atan2(-y, -x) };
      }
      if (funnet) { ut.push(funnet); if (type === 'telt') telt++; }
    }
    return ut;
  }
  // Hvor mange telt: tre til den første brakka (eller et egenbygd rom) er ferdig, så ett
  const antallTelt = brakker => (brakker > 0 ? R.leir.teltEtterBrakke : R.leir.telt);
  const api = { REGLER, stadium, nøkkel, stolper, leirting, antallTelt, hash };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Byggeplass = api;

  // ---------------- MODELLENE (nettleseren, når THREE finnes) ----------------
  // hjørnefarger, origo midt på bunnen, fronten mot +x – som modellene i spill/modeller.js; ett materiale (MODELLER.materiale())
  const FARGE = { betong: [.6, .59, .56], forskaling: [.42, .33, .22], tre: [.7, .56, .36], treM: [.5, .39, .25], kledning: [.56, .45, .31],
    stål: [.62, .65, .68], planke: [.62, .5, .32], snor: [.9, .82, .45], sekk: [.78, .76, .7], pall: [.55, .44, .3], tak: [.32, .3, .28],
    telt: [.4, .44, .3], teltM: [.3, .33, .22], åpning: [.12, .12, .1], stein: [.45, .44, .42], kull: [.1, .09, .08], ved: [.48, .36, .22],
    presenning: [.28, .38, .3] };
  function boks(d, x, y, z, sx, sy, sz, c, rz) {
    const g = new THREE.BoxGeometry(Math.max(.01, sx), Math.max(.01, sy), Math.max(.01, sz)).toNonIndexed(); g.translate(0, 0, sz / 2); if (rz) g.rotateZ(rz); g.translate(x, y, z);
    const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); d.push(g); return g; }
  // bjelke fra a til b (x, y, z), tykkelse t
  function bjelke(d, a, b, t, c) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < .01) return;
    const g = new THREE.BoxGeometry(t, L, t).toNonIndexed(), v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v)));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); d.push(g); }
  // Tynn plate: hjørnet A, kantene u og v (vinkelrette vektorer), tykkelse t – som en dreid boks (synlig fra begge sider)
  function plate(d, A, u, v, t, c) {
    const lu = Math.hypot(...u), lv = Math.hypot(...v); if (lu < .01 || lv < .01) return;
    const e1 = new THREE.Vector3(...u).normalize(), e2 = new THREE.Vector3(...v).normalize(), e3 = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const g = new THREE.BoxGeometry(lu, lv, t).toNonIndexed(), m = new THREE.Matrix4().makeBasis(e1, e2, e3);
    m.setPosition(A[0] + u[0] / 2 + v[0] / 2, A[1] + u[1] / 2 + v[1] / 2, A[2] + u[2] / 2 + v[2] / 2); g.applyMatrix4(m);
    const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); d.push(g); }
  // Trekant synlig fra begge sider (gavler, teltåpningen)
  function trekant(d, a, b, c, farge) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...b], 3)); g.computeVertexNormals();
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array(6).fill(farge).flat(), 3)); d.push(g); }
  // Byggeplassen for et hus: fot = [x0, x1, y0, y1] (modellens mål), H = den ferdige modellens høyde, p = framdriften, flatt = flatt tak
  function byggeplassGeo(fot, H, p, flatt) {
    const s = stadium(p), d = [], [x0, x1, y0, y1] = fot, gh = R.grunnH, hv = Math.max(R.veggMin, Math.min(H - .3, H * R.veggAndel)), F = FARGE;
    const langsX = (x1 - x0) >= (y1 - y0);
    if (s.stikker) {
      // stikker i hjørnene og snor rundt
      for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) boks(d, x, y, 0, .07, .07, .9, F.tre);
      for (const [a, b] of [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]]) bjelke(d, [a[0], a[1], .6], [b[0], b[1], .6], .02, F.snor);
    } else {
      // grunnmuren (støpes opp) og forskalingen rundt så lenge den støpes
      const gz = gh * s.grunn; boks(d, (x0 + x1) / 2, (y0 + y1) / 2, 0, x1 - x0, y1 - y0, gz, F.betong);
      if (s.grunn < 1) for (const [x, y, sx, sy] of [[(x0 + x1) / 2, y0 - .04, x1 - x0 + .1, .04], [(x0 + x1) / 2, y1 + .04, x1 - x0 + .1, .04], [x0 - .04, (y0 + y1) / 2, .04, y1 - y0], [x1 + .04, (y0 + y1) / 2, .04, y1 - y0]])
        boks(d, x, y, 0, sx, sy, gh + .05, F.forskaling);
      // reisverket: svill rundt, stenderne langs veggene (andelen som står), toppsvill når alle står
      if (s.reisverk > 0) {
        const sider = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]], alle = [];
        for (const [a, b] of sider) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (const t of stolper(L, R.stender).slice(0, -1)) alle.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]);
          bjelke(d, [a[0], a[1], gh + .05], [b[0], b[1], gh + .05], .1, F.treM); }
        const n = Math.ceil(alle.length * s.reisverk);
        for (let i = 0; i < n; i++) boks(d, alle[i][0], alle[i][1], gh, .1, .1, hv, F.tre);
        if (s.reisverk >= 1) for (const [a, b] of sider) bjelke(d, [a[0], a[1], gh + hv], [b[0], b[1], gh + hv], .12, F.treM);
      }
      // kledningen nedenfra (døra i fronten, +x, står åpen)
      if (s.kledning > 0) { const kh = hv * s.kledning, t = .05;
        boks(d, (x0 + x1) / 2, y0 + t / 2, gh, x1 - x0, t, kh, F.kledning); boks(d, (x0 + x1) / 2, y1 - t / 2, gh, x1 - x0, t, kh, F.kledning);
        boks(d, x0 + t / 2, (y0 + y1) / 2, gh, t, y1 - y0, kh, F.kledning);
        const ym = (y0 + y1) / 2, dør = Math.min(1.2, (y1 - y0) * .4); boks(d, x1 - t / 2, (y0 + ym - dør / 2) / 2, gh, t, ym - dør / 2 - y0, kh, F.kledning); boks(d, x1 - t / 2, (ym + dør / 2 + y1) / 2, gh, t, y1 - ym - dør / 2, kh, F.kledning); }
      // taket: sperrer over hele, bordene (eller platene) legges fra den ene enden
      if (s.tak > 0) {
        const z0 = gh + hv, L = langsX ? x1 - x0 : y1 - y0, B = langsX ? y1 - y0 : x1 - x0, hr = flatt ? .15 : Math.max(.7, Math.min(2.4, H - z0, B * .35)), dekk = L * s.tak;
        const P = (l, b, z) => (langsX ? [x0 + l, y0 + b, z] : [x0 + b, y0 + l, z]);
        for (const l of stolper(L, R.stender)) { if (flatt) bjelke(d, P(l, 0, z0 + .08), P(l, B, z0 + .08), .1, F.treM); else { bjelke(d, P(l, 0, z0), P(l, B / 2, z0 + hr), .1, F.treM); bjelke(d, P(l, B, z0), P(l, B / 2, z0 + hr), .1, F.treM); } }
        if (flatt) { const g = boks(d, 0, 0, 0, langsX ? dekk : B + .3, langsX ? B + .3 : dekk, .08, F.tak); g.translate(langsX ? x0 + dekk / 2 : (x0 + x1) / 2, langsX ? (y0 + y1) / 2 : y0 + dekk / 2, z0 + .14); }
        else for (const eave of [0, B]) { const l2 = Math.hypot(B / 2, hr), db = (B / 2 - eave) / l2, dz = hr / l2, A = P(0, eave - db * .25, z0 - dz * .25 + .05), M2 = P(0, B / 2, z0 + hr + .05);
          plate(d, A, langsX ? [dekk, 0, 0] : [0, dekk, 0], [M2[0] - A[0], M2[1] - A[1], M2[2] - A[2]], .06, F.tak); }
      }
      // stillaset: to rader stolper rundt, rekkverk og plankedekke hver annen meter opp til takfoten
      if (s.stillas) {
        const u0 = R.stillasUt, u1 = u0 + .7, top = gh + hv + .9;
        for (const ut of [u0, u1]) { const X0 = x0 - ut, X1 = x1 + ut, Y0 = y0 - ut, Y1 = y1 + ut;
          for (const [a, b] of [[[X0, Y0], [X1, Y0]], [[X1, Y0], [X1, Y1]], [[X1, Y1], [X0, Y1]], [[X0, Y1], [X0, Y0]]]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
            for (const t of stolper(L, R.stillasSteg).slice(0, -1)) boks(d, a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L, 0, .05, .05, top, F.stål);
            if (ut === u1) for (let z = 1; z < top; z += 2) bjelke(d, [a[0], a[1], z + 1], [b[0], b[1], z + 1], .04, F.stål); } }
        for (let z = 2; z < top - .4; z += 2) { const m = (u0 + u1) / 2, w = .7;
          boks(d, (x0 + x1) / 2, y0 - m, z, x1 - x0 + 2 * u1, w, .05, F.planke); boks(d, (x0 + x1) / 2, y1 + m, z, x1 - x0 + 2 * u1, w, .05, F.planke);
          boks(d, x0 - m, (y0 + y1) / 2, z, w, y1 - y0, .05, F.planke); boks(d, x1 + m, (y0 + y1) / 2, z, w, y1 - y0, .05, F.planke); }
      }
    }
    // materialene ved siden av (venstre for fronten): plankestabel og en pall med sekker
    if (s.materialer) { const mx = x0 + .4, my = y0 - (s.stillas ? 2.7 : 1.6);
      boks(d, mx + 1.4, my, 0, 3.2, 1, .1, F.pall); for (let k = 0; k < 4; k++) boks(d, mx + 1.4, my, .1 + k * .1, 3.1, .9, .08, k % 2 ? F.planke : F.tre);
      boks(d, mx - 1, my, 0, 1.1, 1.1, .12, F.pall); for (let k = 0; k < 6; k++) boks(d, mx - 1.25 + (k % 2) * .5, my - .25 + (Math.floor(k / 2) % 2) * .5, .12 + Math.floor(k / 4) * .2, .45, .45, .19, F.sekk); }
    return MODELLER.samle(d, .12);
  }
  // Tingene i den nye leiren (origo midt på, fronten/åpningen mot +x)
  const TINGGEO = {
    telt: () => { const d = [], L = 3, B = 2.3, h = 1.65;
      for (const sd of [-1, 1]) plate(d, [-L / 2, sd * B / 2, 0], [L, 0, 0], [0, -sd * B / 2, h], .05, sd > 0 ? FARGE.telt : FARGE.teltM);
      // bakveggen og den mørke åpningen foran, bardunene og pluggene, stengene i hver ende
      trekant(d, [-L / 2, -B / 2, 0], [-L / 2, B / 2, 0], [-L / 2, 0, h], FARGE.teltM); trekant(d, [L / 2 - .03, -B / 2 + .05, 0], [L / 2 - .03, B / 2 - .05, 0], [L / 2 - .03, 0, h - .05], FARGE.åpning);
      for (const [x, y] of [[-L / 2 - .6, -B / 2 - .5], [-L / 2 - .6, B / 2 + .5], [L / 2 + .6, -B / 2 - .5], [L / 2 + .6, B / 2 + .5]]) { bjelke(d, [x, y, 0], [Math.sign(x) * L / 2, 0, h], .015, [.75, .72, .6]); boks(d, x, y, 0, .05, .05, .2, FARGE.treM); }
      bjelke(d, [-L / 2 - .05, 0, 0], [-L / 2 - .05, 0, h + .1], .05, FARGE.treM); bjelke(d, [L / 2 + .05, 0, 0], [L / 2 + .05, 0, h + .1], .05, FARGE.treM);
      return MODELLER.samle(d, .15); },
    bål: () => { const d = [];
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; boks(d, Math.cos(a) * .62, Math.sin(a) * .62, 0, .26, .22, .17, k % 2 ? FARGE.stein : [.52, .5, .47], a); }
      boks(d, 0, 0, 0, 1, 1, .03, FARGE.kull);
      for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + .4; bjelke(d, [Math.cos(a) * .45, Math.sin(a) * .45, .04], [Math.cos(a) * .05, Math.sin(a) * .05, .42], .08, FARGE.ved); }
      // to stokker å sitte på
      for (const sd of [-1, 1]) bjelke(d, [-.9, sd * 1.7, .2], [.9, sd * 1.7, .2], .32, [.42, .32, .2]);
      return MODELLER.samle(d, .1); },
    ved: () => { const d = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) bjelke(d, [-.8, -.6 + k * .24 + r * .12, .12 + r * .21], [.8, -.6 + k * .24 + r * .12, .12 + r * .21], .2, k % 2 ? FARGE.ved : [.56, .43, .27]);
      return MODELLER.samle(d, .1); },
    presenning: () => { const d = []; for (const [x, y] of [[-1.6, -1.2], [1.6, -1.2], [1.6, 1.2], [-1.6, 1.2]]) boks(d, x, y, 0, .08, .08, 2.1, FARGE.treM);
      const g = new THREE.BoxGeometry(3.6, 2.8, .04).toNonIndexed(); g.rotateX(.18); g.translate(0, 0, 2.15); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(FARGE.presenning, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); d.push(g);
      for (const [x, y] of [[-.8, -.3], [.4, .2]]) { boks(d, x, y, 0, 1, .8, .7, [.42, .45, .32]); boks(d, x, y, .7, 1.02, .82, .04, [.32, .34, .24]); }
      return MODELLER.samle(d, .15); },
  };
  // Flammene: et eget lite nett som ikke tar lys (MeshBasicMaterial) og flakker i rammene – ingen nye lys i scenen
  let flammeMat = null, glødTex = null;
  function flamme() {
    if (!flammeMat) flammeMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .9, depthWrite: false });
    const d = []; for (let k = 0; k < 3; k++) { const g = new THREE.ConeGeometry(.22 - k * .04, .7 + k * .2, 6).toNonIndexed(); g.rotateX(Math.PI / 2); g.translate(Math.cos(k * 2.1) * .1, Math.sin(k * 2.1) * .1, .35 + k * .1 + .05); g.deleteAttribute('uv'); d.push(g); }
    const n = d.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3); let o = 0; for (const g of d) { pos.set(g.attributes.position.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const m = new THREE.Mesh(g, flammeMat); m.userData.flamme = true; return m;
  }
  function glød() {
    if (!glødTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,110,.9)'); gr.addColorStop(.4, 'rgba(255,140,60,.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glødTex = new THREE.CanvasTexture(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glødTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.userData.glød = true; return s;
  }
  let bål = [];
  // Hver ramme: flammene flakker, gløden er sterkere når det er mørkt
  KROKER.ramme3d.push(() => { if (!bål.length) return; const t = performance.now() / 1000, mørk = window.NATT && Number.isFinite(NATT.mørke) ? NATT.mørke : 0;
    for (const m of bål) { if (m.userData.flamme) { const k = 1 + .18 * Math.sin(t * 11 + m.id) + .1 * Math.sin(t * 23.7); m.scale.set(1, 1, k); m.rotation.z = t * .7; }
      else if (m.userData.glød) { const k = (1.6 + 1.6 * mørk) * (1 + .06 * Math.sin(t * 9)); m.scale.set(k, k, 1); m.material.opacity = .35 + .55 * mørk; } } });
  // Leirens ting i 3D-utsnittet u: lister med nett lagt i scenen, og hindringene (telt, kasser) i R.hindre. opptatt(x, y, r) i leirens
  // egne meter fra midten. Gir { nett: [...], hindre: [[nøkkel, o] …] } – leir-visning.js tar dem bort igjen (fjernLeir).
  function lagLeir(u, R3_, sentrum, antTelt, frø, opptatt) {
    const ut = { nett: [], hindre: [] }, mat = MODELLER.materiale(); bål = [];
    for (const t of leirting(antTelt, frø, opptatt)) {
      const X = sentrum[0] + t.x, Y = sentrum[1] + t.y, x = X - u.cx, y = Y - u.cy; if (Math.abs(x) > u.S - 5 || Math.abs(y) > u.S - 5) continue;
      const z = (hoyde3d(X, Y, u) - u.h0) * R3_.EX, lag = t.type === 'kasser' ? () => MODELLER.kasser() : t.type === 'fat' ? () => MODELLER.fatpall() : TINGGEO[t.type];
      let g = null; try { g = lag(); } catch (e) { console.warn('leirting:', e); } if (!g) continue;
      const m = new THREE.Mesh(g, mat); m.position.set(x, y, z - .03); m.rotation.z = t.ret; m.userData.leirting = t.type; R3_.scene.add(m); ut.nett.push(m);
      if (t.type === 'bål') for (const f of [flamme(), glød()]) { f.position.set(x, y, z + (f.userData.glød ? .55 : 0)); R3_.scene.add(f); ut.nett.push(f); bål.push(f); }
      // telt, kasser og presenning stopper deg når du går (omrisset dreid som modellen)
      if (t.type !== 'bål' && R3_.hindre) { const [hx, hy] = t.type === 'telt' ? [1.6, 1.2] : t.type === 'presenning' ? [.4, .4] : [.6, .55], c = Math.cos(t.ret), s = Math.sin(t.ret);
        const P = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]), xs = P.map(q => q[0]), ys = P.map(q => q[1]);
        const o = { P, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }; P.topp = z + 2;
        for (let a = Math.floor(o.bb[0] / 20); a <= Math.floor(o.bb[2] / 20); a++) for (let b = Math.floor(o.bb[1] / 20); b <= Math.floor(o.bb[3] / 20); b++) { const k = a + ',' + b; if (!R3_.hindre.has(k)) R3_.hindre.set(k, []); R3_.hindre.get(k).push(o); ut.hindre.push([k, o]); } }
    }
    return ut;
  }
  function fjernLeir(R3_, l) {
    if (!l) return; for (const m of l.nett) { R3_.scene.remove(m); if (!m.userData.flamme && !m.userData.glød) m.geometry.dispose(); else if (m.userData.flamme) m.geometry.dispose(); else m.material.dispose(); }
    for (const [k, o] of l.hindre) { const A = R3_.hindre && R3_.hindre.get(k), i = A ? A.indexOf(o) : -1; if (i >= 0) A.splice(i, 1); }
    bål = bål.filter(m => !l.nett.includes(m));
  }
  Object.assign(api, { byggeplassGeo, lagLeir, fjernLeir, TINGGEO, antallBål: () => bål.length });
})(typeof globalThis !== 'undefined' ? globalThis : this);
