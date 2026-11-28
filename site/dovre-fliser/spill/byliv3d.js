/* Riksbrudd – MER LIV I BYENE I 3D (ut9-liv2, 28. nov, brukeren: «legge til detaljer og liv i spillet»): folk som sitter på benkene
 * (spill/gate3d.js), noen av fotgjengerne (spill/liv3d.js) går tur med hund, og syklister på gang- og sykkelvegene (eller fortauet).
 * Alt følger linjene og plassene som finnes fra før, så ingenting står i hus eller i vegbanen: benkene står på fortauet, hunden går
 * like bak eieren på fortauet, syklistene går på gang- og sykkelvegen / fortauet som fotgjengerne. Bare om dagen, ikke i regn/snø for de
 * som sitter. Reglene øverst uten DOM (test_byliv.js); fast via hash av plassen (ingen Math.random). Alle tall er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // andel benker med folk, høyst så mange som sitter (PC/mobil), og klokka da folk er ute
    benk: { andel: .45, maks: [24, 8], to: .35 }, dag: [8, 21],
    // hver n-te fotgjenger går med hund, hunden går så langt bak (m)
    hund: { hver: 5, bak: 1.4 },
    // syklister: så mange (PC/mobil), fart (m/s)
    sykkel: { antall: [8, 3], fart: [3.5, 5.5] },
  };
  const iTid = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // folk på benkene: benker = flat liste [x, y, z, a, …] (Gate.punkter(u.gate).benk); gir [{ x, y, z, a (retning figuren ser), nr }]
  // Benken vender fram langs sin +y (mot vegen); setet er 0,47 m høyt – figuren sitter med hofta over setet.
  function benkFolk(benker, h, mobil, våt) {
    const B = REGLER.benk, ut = []; if (!iTid(h, REGLER.dag) || våt || !benker) return ut; const maks = B.maks[mobil ? 1 : 0];
    for (let k = 0; k + 3 < benker.length && ut.length < maks; k += 4) { const x = benker[k], y = benker[k + 1], z = benker[k + 2], a = benker[k + 3], hx = Math.round(x * 2), hy = Math.round(y * 2);
      if (hash(hx, hy) > B.andel) continue; const n = hash(hy, hx) < B.to ? 2 : 1;
      for (let i = 0; i < n && ut.length < maks; i++) { const dx = n === 2 ? (i ? .45 : -.45) : (hash(hx + 1, hy) - .5) * .6, ly = -.06, c = Math.cos(a), s = Math.sin(a);
        ut.push({ x: x + dx * c - ly * s, y: y + dx * s + ly * c, z, a: a + Math.PI / 2, nr: hx * 7 + hy * 13 + i }); } }
    return ut;
  }
  // hvem av fotgjengerne som har hund (indeksene)
  const medHund = n => Array.from({ length: n }, (_, i) => i).filter(i => i % REGLER.hund.hver === 2);
  // syklistene: velger linjer (helst gang- og sykkelveg) og lager { v, s, dir, fart, side } som fotgjengerne i liv3d.js
  function syklister(linjer, mobil) {
    const S = REGLER.sykkel, n = S.antall[mobil ? 1 : 0], gs = linjer.filter(v => v && v.g), L = (gs.length ? gs : linjer).filter(v => v && v.L > 40); if (!L.length) return [];
    return Array.from({ length: n }, (_, i) => { const v = L[Math.floor(hash(i, 3) * L.length)]; return { v, s: hash(i, 4) * v.L, dir: hash(i, 5) < .5 ? 1 : -1, fart: S.fart[0] + hash(i, 6) * (S.fart[1] - S.fart[0]), side: v.g ? .6 : v.w + .9, fase: hash(i, 7) * 6, nr: i }; });
  }
  // ett steg langs linja (snur i endene)
  function sykkelSteg(o, dt) { o.s += o.fart * dt * o.dir; if (o.s > o.v.L) { o.s = o.v.L; o.dir = -1; } else if (o.s < 0) { o.s = 0; o.dir = 1; } o.fase += o.fart * dt * 2.2; return o; }
  const api = { REGLER, benkFolk, medHund, syklister, sykkelSteg, iTid, hash };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Byliv = api;
  if (typeof window === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- visningen ----------
  const mobil = () => (typeof innerWidth !== 'undefined' && innerWidth < 700);
  const klokka = () => ((((6 + (typeof tid !== 'undefined' ? tid : 0) / 60) % 24) + 24) % 24);
  const JAKKER = [[.35, .42, .3], [.5, .32, .22], [.25, .33, .45], [.55, .5, .35], [.62, .46, .2], [.2, .36, .3], [.7, .7, .68], [.3, .3, .34]], BUKSER = [[.2, .21, .25], [.26, .22, .17], [.16, .2, .16], [.3, .3, .32]];
  const HÅR = [[.22, .17, .12], [.1, .08, .07], [.62, .5, .3], [.36, .2, .1], [.7, .7, .68]], HUD = [[.86, .69, .56], [.8, .62, .49], [.66, .48, .36], [.47, .33, .25]];
  const HUNDF = [[.5, .48, .44], [.36, .25, .16], [.15, .14, .13], [.8, .72, .55]];
  let S = null, sistMs = 0;
  const farg = (g, c) => { if (g.index) g = g.toNonIndexed(); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const boks = (x0, x1, y0, y1, z0, z1, c) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return farg(g, c); };
  const ring = (x, z, r, c) => { const g = new THREE.TorusGeometry(r, .02, 4, 14); g.rotateX(Math.PI / 2); g.translate(x, 0, z); return farg(g, c); };
  function lag(R) {
    kast(); const D = Figur3d.DEL, P = [.95, .95, .95], N = [.15, .13, .12], ST = [.18, .19, .2];
    const fl = Figur3d.flokk(R, { maks: 60, kilde: 'byliv3d.js', deler: D.hår | D.langt | D.lue | D.sekk });
    // hunden (hvit pels ganges med fargen per hund) og sykkelen (ramme, to hjul, styre og sete) – figuren står på pedalene
    const hund = window.MODELLER.samle([boks(-.28, .28, -.09, .09, .26, .46, P), boks(.22, .32, -.06, .06, .38, .52, P), boks(.26, .44, -.065, .065, .45, .6, P), boks(.44, .53, -.035, .035, .47, .54, N),
      boks(.3, .36, -.06, -.03, .6, .67, P), boks(.3, .36, .03, .06, .6, .67, P), boks(-.4, -.27, -.03, .03, .42, .48, P), ...[[.2, -1], [.2, 1], [-.2, -1], [-.2, 1]].map(([x, sy]) => boks(x - .03, x + .03, sy * .065 - .03, sy * .065 + .03, 0, .28, P))]);
    const sykkel = window.MODELLER.samle([ring(-.52, .34, .33, ST), ring(.52, .34, .33, ST), boks(-.52, .5, -.02, .02, .52, .56, [.6, .12, .1]), boks(-.12, -.08, -.02, .02, .34, .74, [.6, .12, .1]),
      boks(.45, .49, -.02, .02, .34, .95, ST), boks(.43, .51, -.28, .28, .93, .97, ST), boks(-.2, .02, -.07, .07, .74, .79, N)]);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), lagI = (g, n) => { const m = new THREE.InstancedMesh(g, mat, n); m.count = 0; m.frustumCulled = false; m.userData.kilde = 'byliv3d.js';
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); R.scene.add(m); return m; };
    S = { scene: R.scene, fl, hund: lagI(hund, 20), sykkel: lagI(sykkel, 12), mat, geo: [hund, sykkel], u: null, benk: [], sykler: [], o: new THREE.Object3D(), nøk: '' };
  }
  function kast() { if (!S) return; S.fl.kast(); for (const m of [S.hund, S.sykkel]) { if (m.parent) m.parent.remove(m); m.dispose(); } for (const g of S.geo) g.dispose(); S.mat.dispose(); S = null; }
  const farger = nr => Figur3d.farger(JAKKER[nr % JAKKER.length], BUKSER[(nr >>> 3) % BUKSER.length], HÅR[(nr >>> 5) % HÅR.length], HUD[(nr >>> 7) % HUD.length]);
  KROKER.ramme3d.push(R => {
    if (!R.ut || typeof THREE === 'undefined' || !window.Figur3d || !window.MODELLER || !window.Liv3d) return; const u = R.ut;
    if (!S || S.scene !== R.scene || !S.fl.nær.parent) lag(R);
    const T = Liv3d.trafikk(), h = klokka(), V = window.VAER || {}, våt = (V.nedbør || V.regn || V.snø || 0) > .2, mob = mobil();
    if (S.u !== u || (!S.sykler.length && (T.folk || []).length)) { S.u = u; S.sykler = syklister((T.folk || []).map(o => o.v).filter((v, i, a) => a.indexOf(v) === i), mob); }
    const nå = performance.now(), dt = typeof tempo !== 'undefined' && tempo > 0 ? Math.min(.25, (nå - (sistMs || nå)) / 1000) : 0; sistMs = nå;
    const benk = window.Gate3d ? (Gate3d.punkter(u).benk || []) : [], sitter = benkFolk(benk, h, mob, våt), dag = iTid(h, REGLER.dag), fl = S.fl, o = S.o, c = R.cam.position;
    fl.start();
    for (const p of sitter) { o.position.set(p.x, p.y, p.z); o.rotation.set(0, 0, p.a); o.scale.setScalar(.95 + hash(p.nr, 2) * .1); o.updateMatrix();
      fl.legg(o.matrix, { fase: 0, sving: 0, bære: hash(p.nr, 3) < .3 ? .5 : 0, kne: -1, maske: Figur3d.DEL.hår | (hash(p.nr, 4) < .3 ? Figur3d.DEL.langt : 0), farger: farger(p.nr) }); }
    // syklistene: figuren står på pedalene over sykkelen, beina går fort
    let ns = 0; if (dag && !våt && T.punkt) for (const q of S.sykler) { sykkelSteg(q, dt); const [x, y, z, v] = T.punkt(q.v, q.s, q.side * q.dir), a = v + (q.dir < 0 ? Math.PI : 0), zz = z + (q.v.g ? .02 : .17);
      if ((x - c.x) ** 2 + (y - c.y) ** 2 > 400 * 400) continue; o.position.set(x, y, zz); o.rotation.set(0, 0, a); o.scale.setScalar(1); o.updateMatrix(); S.sykkel.setMatrixAt(ns++, o.matrix);
      o.position.set(x - Math.cos(a) * .1, y - Math.sin(a) * .1, zz + .38); o.updateMatrix(); fl.legg(o.matrix, { fase: q.fase, sving: .55, bære: .85, krum: .35, maske: Figur3d.DEL.hår, farger: farger(q.nr * 11 + 5) }); }
    S.sykkel.count = ns; S.sykkel.instanceMatrix.needsUpdate = true; fl.slutt();
    // hundene går like bak eierne sine
    let nh = 0; const F = T.folk || []; if (dag && T.punkt) for (const i of medHund(F.length)) { const q = F[i]; if (!q || nh >= 20) continue; const [x, y, z, v] = T.punkt(q.v, Math.max(0, Math.min(q.v.L, q.s - q.dir * REGLER.hund.bak)), (q.side || 1.7) * q.dir), a = v + (q.dir < 0 ? Math.PI : 0);
      if ((x - c.x) ** 2 + (y - c.y) ** 2 > 250 * 250) continue; o.position.set(x, y, z + (q.gs ? .02 : .17) + Math.abs(Math.sin((q.fase || 0) * 1.3)) * .03); o.rotation.set(0, 0, a); o.scale.setScalar(.85 + hash(i, 9) * .35); o.updateMatrix();
      S.hund.setMatrixAt(nh, o.matrix); const f = HUNDF[i % HUNDF.length]; S.hund.instanceColor.setXYZ(nh, f[0], f[1], f[2]); nh++; }
    S.hund.count = nh; S.hund.instanceMatrix.needsUpdate = true; S.hund.instanceColor.needsUpdate = true;
    S.sist = { sitter: sitter.length, syklister: ns, hunder: nh, benker: benk.length / 4 };
  });
  window.Byliv3d = { antall: () => (S && S.sist) || null, sitter: () => { const R = typeof R3 !== 'undefined' ? R3 : null; return R && R.ut && window.Gate3d ? benkFolk(Gate3d.punkter(R.ut).benk || [], klokka(), mobil(), false) : []; },
    sykler: () => (S ? S.sykler : []), hundPunkter: () => { if (!S) return []; const m = new THREE.Matrix4(), v = new THREE.Vector3(), ut = []; for (let i = 0; i < S.hund.count; i++) { S.hund.getMatrixAt(i, m); v.setFromMatrixPosition(m); ut.push([v.x, v.y, v.z]); } return ut; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
