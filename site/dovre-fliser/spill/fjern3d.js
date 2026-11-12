'use strict';
// Fjernterrenget i 3D (12. nov, brukeren: «få ting til å se penere ut, også hele Norge»): høyt oppe (f.eks. i Jotunheimen) så du kanten
// av 3D-utsnittet som flate, avklipte vegger i horisonten. Rundt utsnittet legges nå en grov ring av terreng (opptil 40 km ut) fra
// høydeflisene på et lavere detaljnivå, farget etter arealklassen (skog, fjell, snø, vann, myr, tettsted), årstiden og snøgrensen, og senket med jordkrumningen,
// så fjellene i horisonten finnes. Utsnittet selv dekker midten (ringen har et hull der). Tåka trekkes lenger ut når ringen finnes.
// Kroker: KROKER.sett3d (bygger ringen for utsnittet), KROKER.ramme3d (tåke og kameraets rekkevidde). window.Fjern3d.sjekk() for testene.
(function () {
  // arealklassene i høydeflisene (terreng.js): 0 snaufjell, 1 skog, 2 åpen mark, 3 vann, 4 snø/is, 5 dyrket, 6 myr, 7 tettsted, 255 utenfor
  const FARGE = { 0: [.52, .5, .44], 1: [.2, .29, .16], 2: [.43, .45, .3], 3: [.27, .39, .5], 4: [.9, .91, .93], 5: [.45, .52, .27], 6: [.42, .43, .3], 7: [.47, .45, .42] };
  const BERG = FARGE[0], SNO = [.9, .92, .96];
  const klem = v => Math.max(0, Math.min(1, v)), glatt = (a, b, v) => { const t = klem((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  // Fargen i ett punkt i ringen (regel uten DOM, test: node pipeline/fliser/test_fjern3d.js). Brukeren fant 12. nov at fjellene i horisonten
  // var sommergrønne midt på vinteren: ringen ble farget én gang etter arealklassen. Nå følger den de samme reglene som bakken i utsnittet
  // (detaljIBakken): snø over snøgrensen der det ikke er for bratt, og høstfarger på det grønne. Over tregrensen blir grønt til grått
  // snaufjell (arealklassene er grove langt ute: Jotunheimen var grønn rett bak snøfjellene).
  // K = arealklassen, moh = høyden, opp = normalens z (1 = flatt), tg = tregrensen der (moh.), V = { snøgrense, høst }, sjø = havet (aldri snø)
  function farge(K, moh, opp, tg, V, sjø) {
    let f = (FARGE[K] || FARGE[2]).slice();
    if (K === 1 || K === 2 || K === 5 || K === 6) { const t = glatt(tg + 150, tg + 500, moh) * (K === 1 ? 1 : .85); f = f.map((v, i) => v + (BERG[i] - v) * t); }
    if (V.høst) { const t = V.høst * klem((f[1] - Math.max(f[0], f[2])) * 7) * (K === 1 ? .45 : .75); f = [f[0] + (f[0] * .45 + .04) * t, f[1], f[2] - f[2] * .5 * t]; }
    if (!sjø) { const s = glatt(V.snøgrense - 70, V.snøgrense + 70, moh) * glatt(.3, .6, opp) * (K === 1 ? .8 : 1); f = f.map((v, i) => v + (SNO[i] - v) * s); }
    return f;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { farge, FARGE }; return; }

  // været som ringen skal vise: det samme som bakken i utsnittet bruker (VAER_U settes av spill/vaer-visning.js)
  const vær = () => ({ snøgrense: VAER_U.uSno.value ? VAER_U.uSnoGrense.value : 1e9, høst: VAER_U.uHost.value });
  const værNøkkel = V => Math.round(V.snøgrense / 20) + '|' + Math.round(V.høst * 10);
  const JORD = 6371000;
  let ring = null, nr = 0, R2 = 0;
  async function bygg(u, R) {
    const mitt = ++nr, mob = VW < 900, n = mob ? 97 : 129;
    R2 = Math.max(6000, Math.min(40000, u.S * 5)); const celle = 2 * R2 / (n - 1);
    const ZV = Math.max(6, Math.min(10, Math.floor(Math.log2(G.res0 / celle))));
    let v; try { v = await lagVindu([u.cx - R2, u.cy - R2, u.cx + R2, u.cy + R2], false, ZV); } catch (e) { return; }
    if (mitt !== nr || R3.ut !== u) return;
    const pos = new Float32Array(n * n * 3), kol = new Float32Array(n * n * 3), ok = new Uint8Array(n * n);
    // per punkt: arealklassen, høyden (moh.), tregrensen der og om det er hav – fargene regnes på nytt når årstiden eller snøgrensen endres
    const kl = new Uint8Array(n * n), moh = new Float32Array(n * n), tg = new Float32Array(n * n), sjø = new Uint8Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -R2 + i * celle, y = R2 - j * celle, [a, b] = Terreng.rute(v, u.cx + x, u.cy + y), inne = a >= 0 && b >= 0 && a < v.w && b < v.h, k = j * n + i;
      let h = inne ? v.H[b * v.w + a] : NaN, K = inne ? v.K[b * v.w + a] : 255;
      // havet på /norge (ingen høyde) ligger på 0 moh.; i Dovre-piloten er det utenfor kartet (hull)
      if (h !== h) { if (!NORGE_BLOKKER) continue; h = 0; K = 3; sjø[k] = 1; }
      if (NORGE_BLOKKER && K === 3 && h < .5) sjø[k] = 1;
      const d = Math.hypot(x, y);
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = (h - u.h0) * R.EX - d * d / (2 * JORD) - 1.5;
      kl[k] = K; moh[k] = h; tg[k] = window.Vegetasjon ? Vegetasjon.tregrense(u.cy + y) : 1100; ok[k] = 1;
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
    fjern(R); ring = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); ring.name = 'fjernring'; ring.userData.R2 = R2;
    ring.userData.punkt = { n, kl, moh, tg, sjø, ok }; fargelegg(); R.scene.add(ring);
  }
  // Fargene i ringen etter årstiden og snøgrensen akkurat nå (ca. 17 000 punkter – regnes bare når været har endret seg)
  function fargelegg() {
    const { n, kl, moh, tg, sjø, ok } = ring.userData.punkt, V = vær(), kol = ring.geometry.attributes.color, nor = ring.geometry.attributes.normal;
    for (let k = 0; k < n * n; k++) { if (!ok[k]) continue;
      const i = k % n, j = (k - i) / n, f = farge(kl[k], moh[k], nor.getZ(k), tg[k], V, !!sjø[k]), lys = .92 + .08 * Math.sin(i * 12.9898 + j * 78.233);
      kol.setXYZ(k, f[0] * lys, f[1] * lys, f[2] * lys); }
    kol.needsUpdate = true; ring.userData.vær = værNøkkel(V);
  }
  function fjern(R) { if (ring) { R.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; } }
  KROKER.sett3d.push((u, R) => { bygg(u, R); });
  // tåka slutter lenger ute (ellers står ringen i grått), og kameraet ser langt nok
  KROKER.ramme3d.push(R => {
    if (!ring || !R.ut) return; const c = R.cam, f = R.scene.fog, b = R.bane;
    if (ring.userData.vær !== værNøkkel(vær())) fargelegg();
    const far = R.fot ? R2 * .55 : (b ? b.avst : 0) + R2 * .75;
    if (f && f.far < far) { const k = far / f.far; f.far = far; f.near *= Math.min(k, 3); }
    if (c.far < R2 * 1.4) { c.far = R2 * 1.4; c.updateProjectionMatrix(); }
  });
  // sjekk(): for testene – også snittfargen i ringen (lys = hvor lys den er, grønn = hvor mye grønt stikker ut) og været den er farget for
  window.Fjern3d = { farge, sjekk() {
    if (!ring) return null; const { n, ok, sjø } = ring.userData.punkt, kol = ring.geometry.attributes.color; let a = 0, lys = 0, grønn = 0;
    for (let k = 0; k < n * n; k++) { if (!ok[k] || sjø[k]) continue; const r = kol.getX(k), g = kol.getY(k), b = kol.getZ(k); a++; lys += (r + g + b) / 3; grønn += g - Math.max(r, b); }
    return { trekanter: ring.geometry.index.count / 3, R2: ring.userData.R2, iScene: !!(R3.scene && R3.scene.children.includes(ring)), vær: ring.userData.vær, lys: a ? lys / a : 0, grønn: a ? grønn / a : 0 };
  } };
})();
