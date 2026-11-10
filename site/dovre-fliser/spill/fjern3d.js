'use strict';
// Fjernterrenget i 3D (12. nov, brukeren: «få ting til å se penere ut, også hele Norge»): høyt oppe (f.eks. i Jotunheimen) så du kanten
// av 3D-utsnittet som flate, avklipte vegger i horisonten. Rundt utsnittet legges nå en grov ring av terreng (opptil 40 km ut) fra
// høydeflisene på et lavere detaljnivå, farget etter arealklassen (skog, fjell, snø, vann, myr, tettsted) og senket med jordkrumningen,
// så fjellene i horisonten finnes. Utsnittet selv dekker midten (ringen har et hull der). Tåka trekkes lenger ut når ringen finnes.
// Kroker: KROKER.sett3d (bygger ringen for utsnittet), KROKER.ramme3d (tåke og kameraets rekkevidde). window.Fjern3d.sjekk() for testene.
(function () {
  // arealklassene i høydeflisene (terreng.js): 0 snaufjell, 1 skog, 2 åpen mark, 3 vann, 4 snø/is, 5 dyrket, 6 myr, 7 tettsted, 255 utenfor
  const FARGE = { 0: [.52, .5, .44], 1: [.2, .29, .16], 2: [.43, .45, .3], 3: [.27, .39, .5], 4: [.9, .91, .93], 5: [.45, .52, .27], 6: [.42, .43, .3], 7: [.47, .45, .42] };
  const JORD = 6371000;
  let ring = null, nr = 0, R2 = 0;
  async function bygg(u, R) {
    const mitt = ++nr, mob = VW < 900, n = mob ? 97 : 129;
    R2 = Math.max(6000, Math.min(40000, u.S * 5)); const celle = 2 * R2 / (n - 1);
    const ZV = Math.max(6, Math.min(10, Math.floor(Math.log2(G.res0 / celle))));
    let v; try { v = await lagVindu([u.cx - R2, u.cy - R2, u.cx + R2, u.cy + R2], false, ZV); } catch (e) { return; }
    if (mitt !== nr || R3.ut !== u) return;
    const pos = new Float32Array(n * n * 3), kol = new Float32Array(n * n * 3), ok = new Uint8Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -R2 + i * celle, y = R2 - j * celle, [a, b] = Terreng.rute(v, u.cx + x, u.cy + y), inne = a >= 0 && b >= 0 && a < v.w && b < v.h, k = j * n + i;
      let h = inne ? v.H[b * v.w + a] : NaN, K = inne ? v.K[b * v.w + a] : 255;
      // havet på /norge (ingen høyde) ligger på 0 moh.; i Dovre-piloten er det utenfor kartet (hull)
      if (h !== h) { if (!NORGE_BLOKKER) continue; h = 0; K = 3; }
      const d = Math.hypot(x, y);
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = (h - u.h0) * R.EX - d * d / (2 * JORD) - 1.5;
      const f = FARGE[K] || FARGE[2], lys = .92 + .08 * Math.sin(i * 12.9898 + j * 78.233);
      kol.set([f[0] * lys, f[1] * lys, f[2] * lys], k * 3); ok[k] = 1;
    }
    // trekantene utenfor utsnittet (utsnittets kant overlapper litt, så det ikke blir sprekk)
    const idx = [], S = u.S * .96;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1; if (!(ok[a] && ok[b] && ok[c] && ok[d])) continue;
      const x0 = -R2 + i * celle, x1 = x0 + celle, y1 = R2 - j * celle, y0 = y1 - celle;
      if (x0 > -S && x1 < S && y0 > -S && y1 < S) continue;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(kol, 3));
    g.setIndex(idx); g.computeVertexNormals();
    fjern(R); ring = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); ring.name = 'fjernring'; ring.userData.R2 = R2; R.scene.add(ring);
  }
  function fjern(R) { if (ring) { R.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; } }
  KROKER.sett3d.push((u, R) => { bygg(u, R); });
  // tåka slutter lenger ute (ellers står ringen i grått), og kameraet ser langt nok
  KROKER.ramme3d.push(R => {
    if (!ring || !R.ut) return; const c = R.cam, f = R.scene.fog, b = R.bane;
    const far = R.fot ? R2 * .55 : (b ? b.avst : 0) + R2 * .75;
    if (f && f.far < far) { const k = far / f.far; f.far = far; f.near *= Math.min(k, 3); }
    if (c.far < R2 * 1.4) { c.far = R2 * 1.4; c.updateProjectionMatrix(); }
  });
  window.Fjern3d = { sjekk: () => (ring ? { trekanter: ring.geometry.index.count / 3, R2: ring.userData.R2, iScene: !!(R3.scene && R3.scene.children.includes(ring)) } : null) };
})();
