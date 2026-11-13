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
    if (A.bensin && A.bensin.length) for (const st of A.bensin) for (const m of bensinstasjon(u, st)) { R.scene.add(m); mesh.push(m); }
  });

  // ---------- bensinstasjon ----------
  // Fargede bokser slått sammen til ett nett per stasjon (vertex-farger); skiltet med navnet som tekstur (skiltTekstur i index.html).
  function fargeboks(liste, x, y, z, sx, sy, sz, c) { const g = boks(x, y, z, sx, sy, sz).toNonIndexed(), n = g.attributes.position.count, f = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); liste.push(g); }
  function slå(liste) { let n = 0; for (const g of liste) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of liste) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g; }
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  function bensinstasjon(u, st) {
    // langs nærmeste veg (innen 70 m): taket står ved siden av vegen, på samme side som stasjonen
    let ret = 0, cx = st.x, cy = st.y, best = 70, nær = null;
    for (const v of u.veger || []) { if (!'ERFK'.includes(v.k)) continue;
      for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, q = Math.max(0, Math.min(1, ((st.x - a[0]) * dx + (st.y - a[1]) * dy) / l2));
        const px = a[0] + dx * q, py = a[1] + dy * q, d = Math.hypot(st.x - px, st.y - py);
        if (d < best) { best = d; ret = Math.atan2(dy, dx); const l = Math.sqrt(l2), side = ((st.x - px) * -dy + (st.y - py) * dx) >= 0 ? 1 : -1, w = { E: 8, R: 7.5, F: 6.5, K: 5.5 }[v.k] / 2;
          nær = { px, py, ux: dx / l, uy: dy / l, nx: -dy / l * side, ny: dx / l * side, w }; } } }
    // taket skal ikke gå inn i et bygg: prøv flere plasser langs vegen og litt nærmere vegen, ta den første som er fri
    const inni = (x, y) => (u.hus && u.hus.omriss || []).some(P => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; });
    if (nær) { let fri = null;
      for (const ut of [8.5, 7]) for (const langs of [0, 8, -8, 16, -16, 24, -24]) { if (fri) break;
        const x = nær.px + nær.nx * (nær.w + ut) + nær.ux * langs, y = nær.py + nær.ny * (nær.w + ut) + nær.uy * langs;
        const hj = [[-8, -4.5], [8, -4.5], [8, 4.5], [-8, 4.5], [0, 0]].map(([a, b]) => [x + nær.ux * a - nær.uy * b, y + nær.uy * a + nær.ux * b]);
        if (!hj.some(([a, b]) => inni(a, b))) fri = [x, y]; }
      const [fx, fy] = fri || [nær.px + nær.nx * (nær.w + 8.5), nær.py + nær.ny * (nær.w + 8.5)]; cx = fx; cy = fy; }
    const kj = st.k && typeof BUTIKKER !== 'undefined' ? BUTIKKER[st.k] : null, farge = kj ? hex(kj[1]) : [.25, .3, .38], hvit = [.93, .93, .9], grå = [.55, .56, .57], betong = [.7, .69, .66];
    const deler = [];
    fargeboks(deler, 0, 0, 4.8, 16, 9, .9, farge); fargeboks(deler, 0, 0, 4.75, 15.6, 8.6, .06, hvit);
    for (const [px, py] of [[-6.5, -3], [6.5, -3], [-6.5, 3], [6.5, 3]]) fargeboks(deler, px, py, 0, .35, .35, 4.8, grå);
    for (const py of [-2.2, 2.2]) { fargeboks(deler, 0, py, 0, 8, 1.3, .2, betong);
      for (const px of [-2.2, 2.2]) { fargeboks(deler, px, py, .2, .7, .9, 1.55, hvit); fargeboks(deler, px, py, 1.75, .72, .92, .25, farge); } }
    // skiltstolpe ved vegen med kjedens farge og en mørk pristavle under
    fargeboks(deler, 9.5, -6, 0, .3, .3, 7.5, grå); fargeboks(deler, 9.5, -6, 4.2, .35, 1.8, 1.6, [.12, .12, .13]); fargeboks(deler, 9.5, -6, 5.9, .4, 2.4, 1.6, farge);
    const z0 = (hoyde3d(cx + u.cx, cy + u.cy, u) - u.h0) * R3.EX - .05, mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const m = new THREE.Mesh(slå(deler), mat); m.position.set(cx, cy, z0); m.rotation.z = ret; const ut = [m];
    if (kj && typeof skiltTekstur === 'function') {
      // navnet på begge sider av skiltet øverst på stolpen
      for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(2.3, .58); g.rotateX(Math.PI / 2); g.rotateZ(sd > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(9.5 + sd * .21, -6, 6.7);
        const sk = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: skiltTekstur(st.k), emissive: 0x222222 })); sk.position.set(cx, cy, z0); sk.rotation.z = ret; ut.push(sk); }
    }
    return ut;
  }
})();
