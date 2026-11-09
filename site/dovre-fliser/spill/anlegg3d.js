'use strict';
// Anleggene i 3D (byggdataene, lag «anlegg»): fotballmål med nett i hver ende av fotballbanene, lysmaster på de store banene,
// basketkurver på de andre ballbanene. Selve banene (gress, oppmerking, dekke) ligger i kartet (kartflis.js, anlegg()).
// Kroker: KROKER.bygg3d (henter banene), KROKER.sett3d (lager nettene). THREE finnes først når 3D er åpnet.
(function () {
  let mesh = [];
  KROKER.bygg3d.push(async u => {
    u.anlegg = null; if (u.S > 4200 || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.hus) return;
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), mål = [], master = [], kurver = [], sett = new Set();
    const fl = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('hus', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]));
    for (const [x, y, t] of await Promise.all(fl)) {
      if (!t || !t.anlegg) continue; const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096;
      for (const o of t.anlegg.obj) { const a = o.e.a; if (a !== 1 && a !== 3) continue;
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
    u.anlegg = { mål: new Float32Array(mål), master: new Float32Array(master), kurver: new Float32Array(kurver) };
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
  });
})();
