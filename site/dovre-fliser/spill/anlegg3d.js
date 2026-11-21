'use strict';
// Anleggene i 3D (byggdataene, lag «anlegg»): fotballmål med nett i hver ende av fotballbanene, lysmaster på de store banene,
// basketkurver på de andre ballbanene, og bensinstasjonene (lag «punkt»: tak over pumpene, pumpeøyer og en skiltstolpe i kjedens farger). Selve banene (gress, oppmerking, dekke) ligger i kartet (kartflis.js, anlegg()).
// Kroker: KROKER.bygg3d (henter banene), KROKER.sett3d (lager nettene). THREE finnes først når 3D er åpnet.
(function () {
  let mesh = [];
  KROKER.bygg3d.push(async u => {
    u.anlegg = null; u.flyplass = []; if (u.S > 4200 || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.hus) return;
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), mål = [], master = [], kurver = [], sett = new Set(), bensin = [];
    const fl = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('hus', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]));
    for (const [x, y, t] of await Promise.all(fl)) {
      if (t && t.punkt) { const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096;
        for (const o of t.punkt.obj) { if (o.e.p !== 1 || !o.deler[0]) continue; const [a, b] = o.deler[0][0], X = minx + a * k - u.cx, Y = maxy - b * k - u.cy;
          if (Math.abs(X) < u.S - 30 && Math.abs(Y) < u.S - 30) bensin.push({ x: X, y: Y, k: o.e.k || 0 }); } }
      if (!t || !t.anlegg) continue; const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096;
      for (const o of t.anlegg.obj) { const a = o.e.a;
        // flyplassen (rullebane 7, taksebane 8, oppstillingsplass 9): omrissene tas vare på, så gjerder, rundballer og beitedyr ikke
        // settes på gresset mellom banene (spill/dyr3d.js, feiljakten 12. nov: sauer og gårdsgjerder på Gardermoen)
        if (a >= 7 && a <= 9) { for (const d of o.deler) if (d.length > 2) u.flyplass.push(d.map(([p, q]) => [minx + p * k - u.cx, maxy - q * k - u.cy])); continue; }
        if (a !== 1 && a !== 3) continue;
        for (const d of o.deler) { if (d.length < 5) continue;
          const P = d.slice(0, -1).map(([p, q]) => [minx + p * k - u.cx, maxy - q * k - u.cy]), f = form(P);
          // samme bane kan ligge i to fliser: én gang per midtpunkt (avrundet til 2 m)
          const nøkkel = Math.round((f.sx) / 2) + ',' + Math.round(f.sy / 2); if (sett.has(nøkkel)) continue; sett.add(nøkkel);
          if (Math.abs(f.sx) > u.S - 10 || Math.abs(f.sy) > u.S - 10 || f.lu < 12) continue;
          const zz = (X, Y) => (hoyde3d(X + u.cx, Y + u.cy, u) - u.h0) * R3.EX, ret = Math.atan2(f.uy, f.ux), L = f.lu;
          for (const sd of [-1, 1]) {
            const ex = f.sx + f.ux * sd * (L / 2 - 1.6), ey = f.sy + f.uy * sd * (L / 2 - 1.6);
            if (a === 1) mål.push(ex, ey, zz(ex, ey), ret + (sd > 0 ? Math.PI : 0), L > 80 ? 1 : L > 50 ? .68 : .42);
            else kurver.push(ex, ey, zz(ex, ey), ret + (sd > 0 ? Math.PI : 0));
          }
          if (a === 1 && L > 80) for (const su of [-1, 1]) for (const sv of [-1, 1]) {
            const mx = f.sx + f.ux * su * L * .32 + f.vx * sv * (f.lv / 2 + 4), my = f.sy + f.uy * su * L * .32 + f.vy * sv * (f.lv / 2 + 4);
            master.push(mx, my, zz(mx, my), Math.atan2(-sv * f.vy, -sv * f.vx));
          }
        }
      }
    }
    u.anlegg = { mål: new Float32Array(mål), master: new Float32Array(master), kurver: new Float32Array(kurver), bensin };
  });

  const boks = (x, y, z, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); return g; };
  function instans(R, geo, mat, data, per, skala) {
    const n = data.length / per; if (!n) return;
    const m = new THREE.InstancedMesh(geo, mat, n), d = new THREE.Object3D();
    for (let k = 0; k < n; k++) { d.position.set(data[k * per], data[k * per + 1], data[k * per + 2]); d.rotation.set(0, 0, data[k * per + 3]);
      const s = skala ? data[k * per + 4] : 1; d.scale.set(1, s, s); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }
    m.frustumCulled = false; R.scene.add(m); mesh.push(m);
  }
  KROKER.sett3d.push((u, R) => {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } mesh = [];
    const A = u.anlegg; if (!A) return;
    // fotballmål (11er: 7,32 × 2,44 m; mindre baner skaleres): stolper og tverrligger i hvitt, nett bakover
    const hvit = new THREE.MeshLambertMaterial({ color: 0xf2f2ee }), B = 7.32, H = 2.44, t = .12;
    instans(R, samle([boks(0, -B / 2, 0, t, t, H), boks(0, B / 2, 0, t, t, H), boks(0, 0, H - t, t, B + t, t), boks(-1.8, -B / 2, 0, .05, .05, 1.2), boks(-1.8, B / 2, 0, .05, .05, 1.2)]), hvit, A.mål, 5, true);
    const nett = new THREE.BufferGeometry(); nett.setAttribute('position', new THREE.Float32BufferAttribute([
      0, -B / 2, H, -1.8, -B / 2, 1.2, -1.8, B / 2, 1.2, 0, -B / 2, H, -1.8, B / 2, 1.2, 0, B / 2, H,
      -1.8, -B / 2, 1.2, -1.8, -B / 2, 0, -1.8, B / 2, 0, -1.8, -B / 2, 1.2, -1.8, B / 2, 0, -1.8, B / 2, 1.2,
      0, -B / 2, 0, 0, -B / 2, H, -1.8, -B / 2, 1.2, 0, -B / 2, 0, -1.8, -B / 2, 1.2, -1.8, -B / 2, 0,
      0, B / 2, 0, -1.8, B / 2, 0, -1.8, B / 2, 1.2, 0, B / 2, 0, -1.8, B / 2, 1.2, 0, B / 2, H], 3)); nett.computeVertexNormals();
    instans(R, nett, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }), A.mål, 5, true);
    // lysmaster (18 m) med lyskastere som peker inn mot banen
    instans(R, samle([boks(0, 0, 0, .35, .35, 18), boks(.3, 0, 17.2, .5, 2.4, 1.1)]), new THREE.MeshLambertMaterial({ color: 0x8c9096 }), A.master, 4, false);
    // basketkurv: stolpe, plate og ring (forenklet som en flat ramme)
    instans(R, samle([boks(-1.2, 0, 0, .14, .14, 3.3), boks(-1.1, 0, 2.9, .05, 1.8, 1.05), boks(-.75, 0, 3.05, .45, .45, .04)]), new THREE.MeshLambertMaterial({ color: 0xd8d6d0 }), A.kurver, 4, false);
    const klar = u.bensinKlar; u.bensinKlar = null;
    if (A.bensin && A.bensin.length) for (const ms of klar && klar.length === A.bensin.length ? klar : A.bensin.map(st => bensinstasjon(u, st))) for (const m of ms) { R.scene.add(m); mesh.push(m); }
  });
  // (18. nov, hakk: bensinstasjonene – nærmeste veg, plassen og nettene – lages i forbered3d-kroken, én om gangen med pust mellom, ikke i
  // selve byttet; sett3d lager dem selv når de ikke er forberedt)
  if (KROKER.forbered3d) KROKER.forbered3d.push(async u => {
    u.bensinKlar = null; const A = u.anlegg; if (!A || !A.bensin || !A.bensin.length) return;
    const ut = []; for (const st of A.bensin) { if (børPuste()) await pust(); ut.push(bensinstasjon(u, st)); } u.bensinKlar = ut; });

  // ---------- bensinstasjon ----------
  // Fargede bokser slått sammen til ett nett per stasjon (vertex-farger); skiltet med navnet som tekstur (skiltTekstur i index.html).
  function fargeboks(liste, x, y, z, sx, sy, sz, c) { const g = boks(x, y, z, sx, sy, sz).toNonIndexed(), n = g.attributes.position.count, f = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); liste.push(g); }
  function slå(liste) { let n = 0; for (const g of liste) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of liste) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g; }
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  // Husomrissene i et rutenett på 32 m etter boksen rundt hvert omriss (18. nov, hakk: «inni» prøvde alle husene i utsnittet for hvert
  // punkt – 30–120 ms i byttet i Bergen). omrissVed(omriss, x, y): bare omrissene der boksen rundt dem har punktet – et punkt utenfor
  // boksen er aldri inni omrisset, så svaret er det samme. Ett rutenett per omrissliste (WeakMap, slippes med utsnittet).
  const OMRISS_RUTE = new WeakMap(), OC = 32;
  function omrissVed(omriss, x, y) {
    if (!omriss || !omriss.length) return [];
    let r = OMRISS_RUTE.get(omriss);
    if (!r) { r = new Map(); OMRISS_RUTE.set(omriss, r);
      for (const P of omriss) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
        const e = { P, a, b, c, d }; for (let j = Math.floor(b / OC); j <= Math.floor(d / OC); j++) for (let i = Math.floor(a / OC); i <= Math.floor(c / OC); i++) { const k = (i + 32768) * 65536 + (j + 32768); let l = r.get(k); if (!l) r.set(k, l = []); l.push(e); } } }
    const l = r.get((Math.floor(x / OC) + 32768) * 65536 + (Math.floor(y / OC) + 32768)); if (!l) return [];
    const ut = []; for (const e of l) if (x >= e.a && x <= e.c && y >= e.b && y <= e.d) ut.push(e.P); return ut;
  }
  // (21. nov, runde 15) tre slags stasjoner – automat, vanlig og stor – etter vegen og stedet: reglene i Byhus.bensinType (spill/byhus.js).
  // Mål i meter: [halv lengde, dybde fra vegsiden].
  const BENSIN = { automat: [4, 6], vanlig: [9, 22], stor: [17, 28] };
  const bensinType = (k, by, st) => window.Byhus && Byhus.bensinType ? Byhus.bensinType(k, by, st.x, st.y) : 'vanlig';
  window.Anlegg3d = { bensinstasjon: (u, st) => bensinstasjon(u, st), BENSIN };
  function bensinstasjon(u, st) {
    // langs nærmeste veg (innen 70 m): taket står ved siden av vegen, på samme side som stasjonen
    let ret = 0, cx = st.x, cy = st.y, best = 70, nær = null;
    for (const v of u.veger || []) { if (!'ERFK'.includes(v.k)) continue;
      for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, q = Math.max(0, Math.min(1, ((st.x - a[0]) * dx + (st.y - a[1]) * dy) / l2));
        const px = a[0] + dx * q, py = a[1] + dy * q, d = Math.hypot(st.x - px, st.y - py);
        if (d < best) { best = d; ret = Math.atan2(dy, dx); const l = Math.sqrt(l2), side = ((st.x - px) * -dy + (st.y - py) * dx) >= 0 ? 1 : -1, w = { E: 8, R: 7.5, F: 6.5, K: 5.5 }[v.k] / 2;
          nær = { px, py, ux: dx / l, uy: dy / l, nx: -dy / l * side, ny: dx / l * side, w, side, k: v.k, by: !!v.by }; } } }
    const type = bensinType(nær ? nær.k : 'K', nær ? nær.by : false, st), [HL, DY] = BENSIN[type]; st.type = type;
    // taket skal ikke gå inn i et bygg: prøv flere plasser langs vegen og litt nærmere vegen, ta den første som er fri
    const inni = (x, y) => omrissVed(u.hus && u.hus.omriss, x, y).some(P => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; });
    if (nær) { let fri = null;
      // (runde 15) hele stasjonen (tak, butikk, vaskehall) skal være fri: fra 4,5 m mot vegen til DY m bort fra den
      for (const ut of [8.5, 7]) for (const langs of [0, 8, -8, 16, -16, 24, -24]) { if (fri) break;
        const x = nær.px + nær.nx * (nær.w + ut) + nær.ux * langs, y = nær.py + nær.ny * (nær.w + ut) + nær.uy * langs;
        const hj = [[-HL, -4.5], [HL, -4.5], [HL, DY], [-HL, DY], [0, DY / 2], [0, 0], [-HL, DY / 2], [HL, DY / 2]].map(([a, b]) => [x + nær.ux * a + nær.nx * b, y + nær.uy * a + nær.ny * b]);
        if (!hj.some(([a, b]) => inni(a, b))) fri = [x, y]; }
      const [fx, fy] = fri || [nær.px + nær.nx * (nær.w + 8.5), nær.py + nær.ny * (nær.w + 8.5)]; cx = fx; cy = fy; }
    const kj = st.k && typeof BUTIKKER !== 'undefined' ? BUTIKKER[st.k] : null, farge = kj ? hex(kj[1]) : [.25, .3, .38], hvit = [.93, .93, .9], grå = [.55, .56, .57], betong = [.7, .69, .66];
    const deler = [], sg = nær ? nær.side : 1, mørk = [.16, .17, .19], glassF = [.3, .37, .44];
    // pumpeøy: betongøy med pumper (hvit kropp, kjedefarget topp) på en linje langs vegen
    const pumpeøy = (y, n, L) => { fargeboks(deler, 0, y, 0, L, 1.3, .2, betong); for (let q = 0; q < n; q++) { const px = n === 1 ? 0 : -L / 2 + 1.6 + q * (L - 3.2) / (n - 1);
      fargeboks(deler, px, y, .2, .7, .9, 1.55, hvit); fargeboks(deler, px, y, 1.75, .72, .92, .25, farge); } };
    // butikk bak pumpene (bort fra vegen): lys kropp, glassfront mot vegen, kjedefarget bånd øverst og flatt tak med takkant
    const butikk = (x, y0, L, D, H) => { const y = sg * (y0 + D / 2); fargeboks(deler, x, y, 0, L, D, H, [.86, .86, .84]); fargeboks(deler, x, y, H, L + .4, D + .4, .35, [.4, .4, .41]);
      fargeboks(deler, x, sg * (y0 - .05), .3, L * .7, .12, H * .62, glassF); fargeboks(deler, x, sg * (y0 - .08), H - 1.1, L + .1, .16, .9, farge); };
    // skiltstolpe ved vegen med kjedens farge og en mørk pristavle under (høyere ved store stasjoner)
    const skilt = (x, hS) => { fargeboks(deler, x, -6 * sg, 0, .3, .3, hS, grå); fargeboks(deler, x, -6 * sg, hS - 3.3, .35, 1.8, 1.6, mørk); fargeboks(deler, x, -6 * sg, hS - 1.6, .4, 2.4, 1.6, farge); return [x, hS]; };
    let skp;
    if (type === 'automat') {
      // ubemannet automat: én øy med 1–2 pumper, betalingsautomat og et lite skilt – ingen tak, ingen butikk
      const n = window.Byhus && Byhus.hash && Byhus.hash(Math.round(st.x), Math.round(st.y), 67) < .5 ? 1 : 2; pumpeøy(0, n, n === 1 ? 3.2 : 5.5);
      fargeboks(deler, (n === 1 ? 2.6 : 3.8), 0, .2, .55, .5, 1.6, mørk); fargeboks(deler, (n === 1 ? 2.6 : 3.8), 0, 1.8, .6, .55, .3, farge);
      fargeboks(deler, -3.2, 2.2 * sg, 0, .2, .2, 2.4, grå); fargeboks(deler, -3.2, 2.2 * sg, 2.4, .5, .5, .7, hvit);
      skp = skilt(5.5, 4.2);
    } else if (type === 'vanlig') {
      fargeboks(deler, 0, 0, 4.8, 16, 9, .9, farge); fargeboks(deler, 0, 0, 4.75, 15.6, 8.6, .06, hvit);
      for (const [px, py] of [[-6.5, -3], [6.5, -3], [-6.5, 3], [6.5, 3]]) fargeboks(deler, px, py, 0, .35, .35, 4.8, grå);
      for (const py of [-2.2, 2.2]) pumpeøy(py, 2, 8);
      butikk(0, 9.5, 14, 9, 4);
      skp = skilt(9.5, 7.5);
    } else {
      // stor stasjon ved hovedvegen: langt tak over tre øyer, butikk med kafé (større glassfelt), vaskehall med port i enden
      fargeboks(deler, 0, 0, 5.2, 28, 13, 1, farge); fargeboks(deler, 0, 0, 5.15, 27.6, 12.6, .06, hvit);
      for (const px of [-11.5, 0, 11.5]) for (const py of [-4.5, 4.5]) fargeboks(deler, px, py, 0, .4, .4, 5.2, grå);
      for (const py of [-4.2, 0, 4.2]) pumpeøy(py, 3, 14);
      butikk(-3, 11.5, 22, 12, 4.5); fargeboks(deler, -3 - 11 + 3.5, sg * 11.4, .3, 6, .14, 3.4, glassF);
      fargeboks(deler, 12.5, sg * (11.5 + 6), 0, 6.5, 12, 4.6, [.8, .8, .79]); fargeboks(deler, 12.5, sg * 11.42, .2, 4, .14, 3.8, [.5, .52, .54]);
      fargeboks(deler, 12.5, sg * 11.4, 4, 6.5, .16, .5, farge);
      skp = skilt(16.5, 10);
    }
    const z0 = (hoyde3d(cx + u.cx, cy + u.cy, u) - u.h0) * R3.EX - .05, mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const m = new THREE.Mesh(slå(deler), mat); m.position.set(cx, cy, z0); m.rotation.z = ret; const ut = [m];
    if (kj && typeof skiltTekstur === 'function') {
      // navnet på begge sider av skiltet øverst på stolpen
      for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(2.3, .58); g.rotateX(Math.PI / 2); g.rotateZ(sd > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(skp[0] + sd * .21, -6 * sg, skp[1] - .8);
        const sk = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: skiltTekstur(st.k), emissive: 0x222222 })); sk.position.set(cx, cy, z0); sk.rotation.z = ret; ut.push(sk); }
    }
    return ut;
  }
})();
