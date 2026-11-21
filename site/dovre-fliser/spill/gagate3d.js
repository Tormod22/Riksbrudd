'use strict';
// Gågatene i 3D (brukeren 21. nov: «gågater ser bare ut som vanlige gater»). Reglene i spill/gagate.js (uten DOM).
// Gagate3d.skill(u, veger, gang) kalles fra liv3d.js rett etter at vegene er laget: gatene som er gågater, tas ut av bilvegene (ingen
// asfalt, kantlinjer, fortau eller biltrafikk) og legges i u.gågater (folkene i liv3d.js går der). Her lages flaten fra husvegg til
// husvegg i brostein (egen tekstur, laget i koden), benker, blomsterkasser, lykter, bord med parasoll om sommeren og trær i brede gater.
// Kroker: KROKER.bygg3d (møblene, trærne), KROKER.sett3d (flaten og møblene som instanser).
(function () {
  let mesh = [], TEX = null;
  const G3 = { antall: () => ({ gater: G3.siste.length, ...G3.møbelTall }), siste: [], møbelTall: {} };

  // Tar gågatene ut av veger/gang (endrer listene) og gir dem tilbake: { k, g: 1, by: true, w, P, m (målepunktene), b ({ vl, vh }) }
  G3.skill = (u, veger, gang) => {
    G3.siste = []; if (typeof Gagate === 'undefined' || !u.hus || !u.hus.omriss || !u.hus.omriss.length) return [];
    const kand = veger.filter(v => v.k === 'K' && v.by && !v.t).concat(gang.filter(v => v.gå));
    if (!kand.length) return [];
    const R = Gagate.husRute(u.hus.omriss), ut = [];
    for (const v of kand) {
      if (v.P.length < 2) continue; const mid = v.P[v.P.length >> 1];
      if (!v.gå && Gagate.tetthet(R, mid[0], mid[1]) < Gagate.REGLER.TETT) continue;
      const m = Gagate.mål(v.P, R);
      if (!Gagate.erGågate(v.gå ? { ...v, g: 2 } : v, m, Infinity)) continue;
      const b = Gagate.bredder(m, v.w); let s = 0; for (let i = 0; i < m.length; i++) s += Math.min(b.vl[i], b.vh[i]);
      ut.push({ k: v.k, g: 1, gå: 1, t: 0, by: true, w: s / m.length, P: v.P, m, b, kilde: v });
    }
    const bort = new Set(ut.map(g => g.kilde));
    for (const L of [veger, gang]) for (let i = L.length - 1; i >= 0; i--) if (bort.has(L[i])) L.splice(i, 1);
    for (const g of ut) delete g.kilde;
    G3.siste = ut; return ut;
  };

  KROKER.bygg3d.push(async u => {
    u.gågateMøbler = null; const gater = u.gågater || []; if (!gater.length) return;
    const sommer = !window.VAER || !VAER.årstid || /sommer|vår|høst/.test(VAER.årstid);
    const zf = (x, y) => nettHoyde(u, x, y), M = { benk: [], kasse: [], lykt: [], tre: [], bord: [] };
    for (const g of gater) { if (børPuste()) await pust();
      const d = Gagate.møbler(g.m, g.b, (x, y) => !(typeof nærHus === 'function' && innenfor(u, x, y)), sommer);
      for (const sl in d) for (const [x, y, , r] of d[sl]) M[sl].push(x, y, zf(x, y) + .06, r); }
    // trærne i gata blant løvtrærne (samme modell, vind og årstid som resten)
    if (M.tre.length && u.trær) { const ny = []; for (let k = 0; k < M.tre.length; k += 4) ny.push(M.tre[k], M.tre[k + 1], M.tre[k + 2], 7 + Gagate.hash(M.tre[k], M.tre[k + 1], 3) * 3, .5);
      const g0 = u.trær.løv || new Float32Array(0), a = new Float32Array(g0.length + ny.length); a.set(g0); a.set(ny, g0.length); u.trær.løv = a; }
    u.gågateMøbler = { benk: new Float32Array(M.benk), kasse: new Float32Array(M.kasse), lykt: new Float32Array(M.lykt), bord: new Float32Array(M.bord) };
    G3.møbelTall = { benk: M.benk.length / 4, kasse: M.kasse.length / 4, lykt: M.lykt.length / 4, bord: M.bord.length / 4, tre: M.tre.length / 4 };
  });
  // inne i et hus (ikke bare nær): møblene står ofte 1–2 m fra veggen
  function innenfor(u, x, y) { for (const P of u.hus.omriss) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
      if (x < a - .3 || x > c + .3 || y < b - .3 || y > d + .3) continue; let inn = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; if (inn) return true; }
    return false; }

  // Brostein: grå og beige steiner (ca. 10 × 10 cm) i buede rader med mørke fuger; tegnes én gang og brukes av alle utsnitt.
  function stein() {
    if (TEX) return TEX; const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
    g.fillStyle = '#4a4741'; g.fillRect(0, 0, N, N);
    // 2 m per bilde (TEX_M): rader på ca. 10 cm = 25,6 punkter
    const rad = N / 20; let s = 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let r = 0; r < 20; r++) { let x = (r % 2) * rad * .5 - rad;
      while (x < N + rad) { const w = rad * (.75 + rnd() * .5), l = 104 + rnd() * 34, t = rnd() * 12 - 6;
        g.fillStyle = `rgb(${l + t + 6},${l + t},${l + t - 10})`;
        const y0 = r * rad + 2, h = rad - 4; g.beginPath(); const rr = 4;
        g.moveTo(x + rr, y0); g.lineTo(x + w - 2 - rr, y0); g.quadraticCurveTo(x + w - 2, y0, x + w - 2, y0 + rr); g.lineTo(x + w - 2, y0 + h - rr); g.quadraticCurveTo(x + w - 2, y0 + h, x + w - 2 - rr, y0 + h);
        g.lineTo(x + rr, y0 + h); g.quadraticCurveTo(x, y0 + h, x, y0 + h - rr); g.lineTo(x, y0 + rr); g.quadraticCurveTo(x, y0, x + rr, y0); g.fill();
        // lys topp og mørkere kant: steinen ser buet ut
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 3, y0 + 2, w - 8, h * .4);
        x += w; } }
    // her og der en mørk flekk (slitasje, fukt)
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,28,24,${.04 + rnd() * .06})`; g.beginPath(); g.arc(rnd() * N, rnd() * N, 10 + rnd() * 30, 0, 7); g.fill(); }
    TEX = new THREE.CanvasTexture(c); TEX.wrapS = TEX.wrapT = THREE.RepeatWrapping; TEX.anisotropy = 4; TEX.userData = { felles: true }; return TEX;
  }
  const TEX_M = 2;

  function flate(u, gater) {
    const pos = [], uv = [], idx = [], zf = (x, y) => nettHoyde(u, x, y) + .06;
    // fem punkter på tvers (vegg, halvveis, midten, halvveis, vegg) så flaten følger bakken mellom husene
    const Q = [1, .5, 0, -.5, -1];
    for (const g of gater) { const m = g.m, o = pos.length / 3;
      for (let i = 0; i < m.length; i++) { const p = m[i];
        for (const q of Q) { const d = q > 0 ? q * g.b.vl[i] : q * g.b.vh[i], x = p.x + p.nx * d, y = p.y + p.ny * d; pos.push(x, y, zf(x, y)); uv.push(p.t / TEX_M, d / TEX_M); } }
      // (rekkefølgen gir trekanter som vender opp – ellers ble flaten skjult sett ovenfra)
      for (let i = 1; i < m.length; i++) for (let j = 0; j < 4; j++) { const a = o + (i - 1) * 5 + j, b = a + 1, c = a + 5, d = c + 1; idx.push(a, b, c, b, d, c); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  const boks = (x, y, z, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); return g; };
  function instans(R, geo, mat, data) { const n = data.length / 4; if (!n) { geo.dispose(); mat.dispose(); return; }
    const m = new THREE.InstancedMesh(geo, mat, n), d = new THREE.Object3D();
    for (let k = 0; k < n; k++) { d.position.set(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]); d.rotation.set(0, 0, data[k * 4 + 3]); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }
    m.frustumCulled = false; R.scene.add(m); mesh.push(m); }

  KROKER.sett3d.push((u, R) => {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); if (m.material.map === TEX) m.material.map = null; m.material.dispose(); } mesh = [];
    const gater = u.gågater || []; if (!gater.length) return;
    const fm = new THREE.Mesh(flate(u, gater), new THREE.MeshLambertMaterial({ map: stein(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    fm.frustumCulled = false; R.scene.add(fm); mesh.push(fm);
    const D = u.gågateMøbler; if (!D) return;
    // benk: sete og rygg i tre på to støpejernsføtter (modellens +y mot midten av gata: ryggen mot veggen)
    instans(R, samle([boks(0, 0, .42, 1.8, .45, .06), boks(0, -.22, .5, 1.8, .06, .4)]), new THREE.MeshLambertMaterial({ color: 0x7a5534 }), D.benk);
    instans(R, samle([boks(-.75, 0, 0, .08, .45, .45), boks(.75, 0, 0, .08, .45, .45), boks(-.75, -.22, .45, .08, .08, .5), boks(.75, -.22, .45, .08, .08, .5)]), new THREE.MeshLambertMaterial({ color: 0x2a2b2d }), D.benk);
    // blomsterkasse: mørk betong/tre og en grønn topp med blomster (gul/rød/hvit i hjørnefargene er for dyrt – én farge holder)
    instans(R, boks(0, 0, 0, 1.4, 1.4, .55), new THREE.MeshLambertMaterial({ color: 0x55524c }), D.kasse);
    instans(R, samle([boks(0, 0, .55, 1.25, 1.25, .18), boks(-.3, .2, .7, .4, .4, .2), boks(.3, -.25, .7, .35, .35, .25)]), new THREE.MeshLambertMaterial({ color: 0x4f7a32 }), D.kasse);
    instans(R, samle([boks(-.35, -.3, .72, .18, .18, .22), boks(.25, .3, .72, .2, .2, .2), boks(.4, -.1, .74, .15, .15, .2)]), new THREE.MeshLambertMaterial({ color: 0xc8473d }), D.kasse);
    // lykt: lav, svart stolpe (4 m) med en lanterne på toppen som lyser svakt (ikke et eget lys)
    instans(R, samle([boks(0, 0, 0, .14, .14, 3.7), boks(0, 0, 0, .32, .32, .3)]), new THREE.MeshLambertMaterial({ color: 0x1e1f21 }), D.lykt);
    instans(R, samle([boks(0, 0, 3.7, .36, .36, .5), boks(0, 0, 4.2, .46, .46, .06)]), new THREE.MeshBasicMaterial({ color: 0xe9d9a6 }), D.lykt);
    // uteservering: bord med to stoler og parasoll
    instans(R, samle([boks(0, 0, 0, .08, .08, .72), boks(0, 0, .72, .8, .8, .04), boks(-.7, 0, 0, .45, .45, .45), boks(.7, 0, 0, .45, .45, .45), boks(0, 0, .72, .05, .05, 1.6)]), new THREE.MeshLambertMaterial({ color: 0x3b3a38 }), D.bord);
    const par = new THREE.ConeGeometry(1.4, .5, 8); par.rotateX(Math.PI / 2); par.translate(0, 0, 2.45);
    instans(R, par, new THREE.MeshLambertMaterial({ color: 0xe4ddd0, side: THREE.DoubleSide }), D.bord);
  });
  G3.nett = () => mesh.map(m => ({ type: m.type, n: m.count || (m.geometry.index ? m.geometry.index.count / 3 : 0), synlig: m.visible, iScene: !!m.parent }));
  window.Gagate3d = G3;
})();
