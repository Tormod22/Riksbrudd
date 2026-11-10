'use strict';
// Gatemøbler i 3D (nær kameraet, utsnitt S ≤ 2200): benker og søppelkasser langs fortauene, ved fotgjengerfeltene og butikkene,
// sykkelstativ (med noen sykler) ved butikker og skoler, busskur med benk og holdeplasskilt langs E/R/F-vegene i tettstedene, og
// postkassestativ ved innkjørselen til en del eneboliger langs K/P-vegene. Hvor tingene står: spill/gate.js (regler uten DOM).
// Kroker: KROKER.bygg3d (plassene, u.gate – etter liv3d.js, byhus.js og bane3d.js, så vegene, gatetrærne og sporet finnes),
// KROKER.sett3d (InstancedMesh per slag, hjørnefarger). Aldri i/inntil hus (nærHus), på kjørebanen, i vann, i bekker, i trær eller lykter.
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const mobil = () => typeof VW !== 'undefined' && VW < 900;

  // byggene i utsnittet (midtpunkt, type, kjede, grunnflate) fra de samme flisene som hus3d bruker
  async function bygg(u) {
    if (!u.hus || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.hus) return [];
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), fl = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('hus', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]));
    const sett = new Set(), ut = [];
    for (const [x, y, t] of await Promise.all(fl)) { if (!t || !t.hus) continue; const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096;
      for (const o of t.hus.obj) { if (sett.has(o.e.i) || !o.deler[0] || o.deler[0].length < 4) continue; sett.add(o.e.i);
        const d = o.deler[0]; let sx = 0, sy = 0, A = 0; const n = d.length - 1;
        for (let q = 0; q < n; q++) { sx += d[q][0]; sy += d[q][1]; const a = d[q], b = d[q + 1]; A += a[0] * b[1] - b[0] * a[1]; }
        const gx = minx + sx / n * k - u.cx, gy = maxy - sy / n * k - u.cy; if (Math.abs(gx) > u.S || Math.abs(gy) > u.S) continue;
        ut.push({ x: gx, y: gy, t: o.e.t, k: o.e.k || 0, A: Math.abs(A) / 2 * k * k }); } }
    return ut;
  }
  // hindringer som ikke er hus: trær (alle treslagene), lyktestolper, flaggstenger og parkerte biler, i et rutenett på 4 m
  function hindre(u) {
    const C = 4, rute = new Map(), legg = (x, y, r) => { const k = Math.floor(x / C) + ',' + Math.floor(y / C); if (!rute.has(k)) rute.set(k, []); rute.get(k).push(x, y, r); };
    if (u.trær) for (const a of Object.values(u.trær)) for (let q = 0; q < a.length; q += 5) legg(a[q], a[q + 1], 1.6);
    if (u.lys) for (let q = 0; q < u.lys.length; q += 4) legg(u.lys[q], u.lys[q + 1], .6);
    if (u.hus && u.hus.flagg) for (let q = 0; q < u.hus.flagg.length; q += 4) legg(u.hus.flagg[q], u.hus.flagg[q + 1], .6);
    if (u.hus && u.hus.biler) for (let q = 0; q < u.hus.biler.length; q += 5) legg(u.hus.biler[q], u.hus.biler[q + 1], 2.8);
    return (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const l = rute.get((Math.floor(x / C) + i) + ',' + (Math.floor(y / C) + j)); if (l) for (let q = 0; q < l.length; q += 3) if (Math.hypot(l[q] - x, l[q + 1] - y) < l[q + 2]) return true; } return false; };
  }
  function vannTest(u) {
    if (!u.vann || !u.vann.getContext) return () => false;
    try { const W = u.vann.width, d = u.vann.getContext('2d').getImageData(0, 0, W, W).data;
      return (x, y) => { const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); return i >= 0 && j >= 0 && i < W && j < W && d[(j * W + i) * 4] > 128; }; } catch (e) { return () => false; }
  }
  const stat = { tid: 0 };
  KROKER.bygg3d.push(async u => {
    u.gate = null;
    if (u.S > 2200 || !u.veger || !u.veger.length || !window.Gate || !window.Liv3d || typeof VIS === 'undefined' || !VIS.veg) return;
    const t0 = performance.now(), R = r3(), kryss = Liv3d.finnKryss(u.veger), B = await bygg(u), vann = vannTest(u), hinder = hindre(u);
    const ok = (x, y) => !(u.hus && nærHus(u, x, y)) && !vann(x, y) && !(u.iBekk && u.iBekk(x, y)) && !(u.påBane && u.påBane(x, y)) && !hinder(x, y);
    u.gate = Gate.plasser(u.veger, { cx: u.cx, cy: u.cy, S: u.S, kryss, bygg: B, ok, bakke: (x, y) => (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * (R ? R.EX : 1), tak: mobil() ? Gate.TAK.mobil : Gate.TAK.pc });
    for (const k of Gate.SLAG) u.gate[k] = new Float32Array(u.gate[k]);
    stat.tid = Math.round(performance.now() - t0); stat.bygg = B.length;
  });

  // ---------- modellene (x langs vegen, +y mot vegen, z opp, foten i 0), hjørnefarger ----------
  function farg(g, f) { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let q = 0; q < n; q++) c.set(f, q * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
  const boks = (x, y, z, sx, sy, sz, f) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); return farg(g, f); };
  const syl = (x, y, z, r, h, n, f) => { const g = new THREE.CylinderGeometry(r, r, h, n); g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2); return farg(g, f); };
  function flett(gs) {
    const n = gs.reduce((a, g) => a + g.attributes.position.count, 0), p = new Float32Array(n * 3), no = new Float32Array(n * 3), c = new Float32Array(n * 3); let o = 0;
    for (const g of gs) { p.set(g.attributes.position.array, o * 3); no.set(g.attributes.normal.array, o * 3); c.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(no, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
  }
  const F = { metall: [.17, .18, .19], tre: [.5, .34, .2], galv: [.66, .68, .7], grønn: [.13, .26, .18], grønnMørk: [.09, .18, .12], skur: [.24, .26, .28], tak: [.3, .32, .34],
    reklame: [.86, .87, .82], blå: [.08, .27, .62], hvit: [.94, .94, .92], svart: [.1, .1, .1], gul: [.92, .8, .25], grå: [.5, .51, .52], hjul: [.07, .07, .07], hvitt: [1, 1, 1] };
  function modeller() {
    const M = {};
    M.benk = flett([boks(-.78, -.03, 0, .06, .48, .43, F.metall), boks(.78, -.03, 0, .06, .48, .43, F.metall), boks(-.78, -.24, .43, .05, .05, .42, F.metall), boks(.78, -.24, .43, .05, .05, .42, F.metall),
      boks(0, .09, .43, 1.8, .17, .04, F.tre), boks(0, -.1, .43, 1.8, .17, .04, F.tre), boks(0, -.27, .58, 1.8, .04, .12, F.tre), boks(0, -.27, .75, 1.8, .04, .12, F.tre)]);
    M.søppel = flett([boks(0, -.25, 0, .07, .07, 1.05, F.grå), syl(0, 0, .38, .22, .55, 6, F.grønn), syl(0, 0, .93, .235, .07, 6, F.grønnMørk)]);
    const bøyler = []; for (let k = 0; k < 4; k++) { const x = -.9 + k * .6; bøyler.push(boks(x, .27, 0, .04, .04, .76, F.galv), boks(x, -.27, 0, .04, .04, .76, F.galv), boks(x, 0, .74, .04, .58, .04, F.galv)); }
    M.sykkel = flett(bøyler);
    // sykkelen (står på tvers av stativet, framhjulet mot stativet): hjul og sete mørke, rammen i instansens farge
    const hjul = y => { const g = new THREE.CylinderGeometry(.33, .33, .035, 9); g.rotateZ(Math.PI / 2); g.translate(0, y, .33); return farg(g, F.hjul); };
    M.syklene = flett([hjul(.52), hjul(-.52), boks(0, 0, .58, .03, .78, .035, F.hvitt), boks(0, .08, .4, .03, .62, .035, F.hvitt), boks(0, -.22, .4, .03, .03, .5, F.hvitt),
      boks(0, -.22, .9, .1, .22, .05, F.hjul), boks(0, .47, .4, .03, .03, .52, F.hvitt), boks(0, .45, .92, .55, .03, .03, F.hjul)]);
    // busskuret: stolper, tak, benk og reklametavle på den lukkede siden; glasset er eget (gjennomsiktig)
    M.skur = flett([boks(-1.7, -.68, 0, .08, .08, 2.4, F.skur), boks(1.7, -.68, 0, .08, .08, 2.4, F.skur), boks(-1.7, .6, 0, .08, .08, 2.4, F.skur), boks(1.7, .6, 0, .08, .08, 2.4, F.skur),
      boks(0, -.05, 2.4, 3.75, 1.7, .1, F.tak), boks(0, .78, 2.3, 3.75, .06, .2, F.skur), boks(0, -.45, .44, 2.6, .34, .05, F.tre), boks(-1.1, -.45, 0, .05, .3, .44, F.metall), boks(1.1, -.45, 0, .05, .3, .44, F.metall),
      boks(1.7, -.12, .25, .12, 1.05, 1.85, F.reklame)]);
    M.glass = flett([boks(0, -.68, .12, 3.32, .02, 2.25, F.hvitt), boks(-1.7, -.04, .12, .02, 1.2, 2.25, F.hvitt)]);
    // holdeplasskiltet: blått skilt med hvitt felt og buss, rutetavle på stolpen
    M.skilt = flett([syl(0, 0, 0, .035, 2.75, 6, F.grå), boks(0, 0, 2.2, .52, .03, .52, F.blå), boks(0, 0, 2.31, .36, .04, .26, F.hvit), boks(0, 0, 2.36, .24, .05, .12, F.svart),
      boks(0, .05, 1.25, .24, .03, .34, F.gul)]);
    // postkassestativet: stolpe og tverrligger (skaleres i x etter antall kasser); kassene er egne instanser med farge
    M.stolpe = flett([boks(0, -.08, 0, .08, .08, 1.04, F.grå)]);
    M.ligger = flett([boks(0, -.08, .98, 1, .08, .05, F.grå)]);
    M.kasse = flett([boks(0, 0, 1.04, .34, .26, .3, F.hvitt), boks(0, -.01, 1.34, .37, .3, .03, F.hvitt), boks(0, .132, 1.22, .22, .01, .03, F.svart)]);
    return M;
  }
  const KASSEFARGER = [[.62, .1, .08], [.16, .34, .2], [.11, .11, .11], [.55, .57, .58], [.13, .23, .45], [.86, .86, .82]];
  const SYKKELFARGER = [[.75, .1, .1], [.1, .1, .12], [.15, .3, .6], [.85, .85, .85], [.2, .45, .25], [.6, .6, .62]];

  let L = null;
  function fjern(R) { if (L) for (const m of L.mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } L = null; }
  KROKER.sett3d.push((u, R) => {
    fjern(R); if (u.S > 2200 || !u.gate) return;
    const M = modeller(), o = new THREE.Object3D(), c = new THREE.Color(), g = u.gate; L = { u, mesh: [] };
    const mat = () => new THREE.MeshLambertMaterial({ vertexColors: true });
    const lag = (geo, n, materiale, sett) => { if (!n) { geo.dispose(); return null; } const m = new THREE.InstancedMesh(geo, materiale, n);
      for (let k = 0; k < n; k++) { const f = sett(k); o.position.set(f[0], f[1], f[2]); o.rotation.set(0, 0, f[3]); o.scale.set(f[4] || 1, 1, 1); o.updateMatrix(); m.setMatrixAt(k, o.matrix); if (f[5]) m.setColorAt(k, c.setRGB(...f[5])); }
      m.frustumCulled = false; R.scene.add(m); L.mesh.push(m); return m; };
    const fire = (a, k) => [a[k * 4], a[k * 4 + 1], a[k * 4 + 2], a[k * 4 + 3]];
    lag(M.benk, g.benk.length / 4, mat(), k => fire(g.benk, k));
    lag(M.søppel, g.søppel.length / 4, mat(), k => fire(g.søppel, k));
    lag(M.sykkel, g.sykkel.length / 4, mat(), k => fire(g.sykkel, k));
    lag(M.skur, g.skur.length / 4, mat(), k => fire(g.skur, k));
    lag(M.glass, g.skur.length / 4, new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xb9d0da, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide }), k => fire(g.skur, k));
    lag(M.skilt, g.skilt.length / 4, mat(), k => fire(g.skilt, k));
    // syklene: 0–4 i hvert stativ (oftest 1), fast per stativ, i en av de fire bøylene, litt skjevt
    const sykler = [];
    for (let k = 0; k < g.sykkel.length / 4; k++) { const [x, y, z, r] = fire(g.sykkel, k), cs = Math.cos(r), sn = Math.sin(r);
      for (let b = 0; b < 4; b++) { const h = Gate.hash(Math.round((x + u.cx) * 3) + b, Math.round((y + u.cy) * 3), 21); if (h > .3) continue;
        const lx = -.9 + b * .6 + .2, ly = .15; sykler.push([x + lx * cs - ly * sn, y + lx * sn + ly * cs, z, r + (h - .17) * .3, 1, SYKKELFARGER[Math.floor(h * 1e3) % SYKKELFARGER.length]]); } }
    lag(M.syklene, sykler.length, mat(), k => sykler[k]);
    // postkassene: stolpe, ligger (bredde etter antall) og 1–3 kasser i rad
    const n = g.postkasse.length / 6, kasser = [];
    for (let k = 0; k < n; k++) { const q = k * 6, [x, y, z, r, a, fi] = g.postkasse.subarray(q, q + 6), cs = Math.cos(r), sn = Math.sin(r);
      for (let j = 0; j < a; j++) { const lx = (j - (a - 1) / 2) * .4; kasser.push([x + lx * cs, y + lx * sn, z, r, 1, KASSEFARGER[(fi + j * 2) % KASSEFARGER.length]]); } }
    lag(M.stolpe, n, mat(), k => { const q = k * 6; return [g.postkasse[q], g.postkasse[q + 1], g.postkasse[q + 2], g.postkasse[q + 3]]; });
    lag(M.ligger, n, mat(), k => { const q = k * 6; return [g.postkasse[q], g.postkasse[q + 1], g.postkasse[q + 2], g.postkasse[q + 3], g.postkasse[q + 4] * .4 + .1]; });
    lag(M.kasse, kasser.length, mat(), k => kasser[k]);
    for (const m of L.mesh) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  // for vakt og tester: (x, y, z) per slag, og antall/trekanter i scenen
  const punkter = u => (u && u.gate ? Gate.punkter(u.gate) : {});
  function antall() {
    const ut = { mesh: 0, trekanter: 0, tid: stat.tid, bygg: stat.bygg }; if (!L) return ut;
    for (const k of Gate.SLAG) ut[k] = L.u.gate ? L.u.gate[k].length / (k === 'postkasse' ? 6 : 4) : 0;
    for (const m of L.mesh) { ut.mesh++; const g = m.geometry; ut.trekanter += g.attributes.position.count / 3 * m.count; }
    return ut;
  }
  // trekantene et utsnitt gir (uten å lage nettene): modellene × antall; syklene og postkassene regnet med 1,2 / 2 per stativ
  let TRI = null;
  function trekanter(u) {
    if (!u || !u.gate) return 0;
    if (!TRI) { const M = modeller(); TRI = {}; for (const k in M) { TRI[k] = M[k].attributes.position.count / 3; M[k].dispose(); } }
    const n = k => u.gate[k].length / (k === 'postkasse' ? 6 : 4);
    return n('benk') * TRI.benk + n('søppel') * TRI.søppel + n('sykkel') * (TRI.sykkel + 1.2 * TRI.syklene) + n('skur') * (TRI.skur + TRI.glass) + n('skilt') * TRI.skilt
      + n('postkasse') * (TRI.stolpe + TRI.ligger + 2 * TRI.kasse);
  }
  window.Gate3d = { punkter, antall, trekanter };
})();
