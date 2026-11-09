'use strict';
// Liv i 3D (nær kameraet, utsnitt S ≤ 2200): ekte veger med asfalt og oppmerking, fortau med kantstein i tettstedene,
// biltrafikk, folk som går på fortauene, fugler, røyk fra pipene og vind i trærne.
// Kroker i index.html: KROKER.bygg3d (henter vegene), KROKER.sett3d (lager nettene), KROKER.ramme3d (beveger alt hver ramme).
(function () {
  const BREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 }, LØFT = { E: .16, R: .15, F: .14, K: .13, P: .12, S: .11 };
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let liv = null, sist = 0;

  // ---------- vegene fra vektorflisene (z13, ca. 2 m) ----------
  KROKER.bygg3d.push(async u => {
    if (u.S > 2200 || !VIS.veg) return;
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), linjer = [];
    const fl = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('vektor', z, x, y).then(t => [x, y, t]));
    const byer = INFRA && INFRA.tettsted && window.Garnison ? INFRA.tettsted.filter(t => t.bb[2] > u.cx - u.S && t.bb[0] < u.cx + u.S && t.bb[3] > u.cy - u.S && t.bb[1] < u.cy + u.S) : [];
    for (const [x, y, t] of await Promise.all(fl)) {
      if (!t || !t.veg) continue; const mx = G.x0 + x * sp, my = G.y0 - y * sp, e = t.veg.ext;
      for (const o of t.veg.obj) { const k = o.e.k; if (!BREDDE[k]) continue;
        for (const d of o.deler) {
          // punkt hver ~3 m langs vegen, så den følger terrenget
          const P = [];
          for (let i = 0; i < d.length; i++) { const X = mx + d[i][0] / e * sp, Y = my - d[i][1] / e * sp;
            if (i) { const [ax, ay] = P[P.length - 1], l = Math.hypot(X - u.cx - ax, Y - u.cy - ay), n = Math.floor(l / 3); for (let s2 = 1; s2 < n; s2++) P.push([ax + (X - u.cx - ax) * s2 / n, ay + (Y - u.cy - ay) * s2 / n]); }
            P.push([X - u.cx, Y - u.cy]); }
          if (P.length < 2 || P.every(([a, b]) => Math.abs(a) > u.S || Math.abs(b) > u.S)) continue;
          const by = byer.length && byer.some(b => Garnison.inni(b, P[P.length >> 1][0] + u.cx, P[P.length >> 1][1] + u.cy));
          linjer.push({ k, P: P.map(([a, b]) => [a, b, (hoyde3d(a + u.cx, b + u.cy, u) - u.h0) * R3.EX + LØFT[k]]), by });
        }
      }
    }
    u.veger = linjer;
    // vegmaske (1024 × 1024): ingen stein, busker, trær eller gress i vegbanen og på fortauet
    const W = 1024, m = new Uint8Array(W * W), celle = 2 * u.S / W;
    for (const v of linjer) { const r = BREDDE[v.k] / 2 + (v.by ? 2.6 : .8), rc = Math.ceil(r / celle);
      for (let i = 1; i < v.P.length; i++) { const [ax, ay] = v.P[i - 1], [bx, by] = v.P[i], l = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(l / celle));
        for (let s2 = 0; s2 <= n; s2++) { const x = ax + (bx - ax) * s2 / n, y = ay + (by - ay) * s2 / n, ci = Math.floor((x + u.S) / celle), cj = Math.floor((u.S - y) / celle);
          for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const a2 = ci + di, b2 = cj + dj; if (a2 < 0 || b2 < 0 || a2 >= W || b2 >= W || (di * di + dj * dj) * celle * celle > r * r) continue; m[b2 * W + a2] = 1; } } } }
    const påVeg = (x, y) => { const i = Math.floor((x + u.S) / celle), j = Math.floor((u.S - y) / celle); return i >= 0 && j >= 0 && i < W && j < W && m[j * W + i] === 1; };
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) if (!påVeg(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.smått) { u.smått.stein = sil(u.smått.stein); u.smått.busk = sil(u.smått.busk); }
    if (u.trær) { u.trær.gran = sil(u.trær.gran); u.trær.løv = sil(u.trær.løv); }
    if (u.bunn) { const B = u.bunn; for (let j = 0; j < B.W; j++) for (let i = 0; i < B.W; i++) { const x = -u.S + (i + .5) / B.W * 2 * u.S, y = u.S - (j + .5) / B.W * 2 * u.S; if (påVeg(x, y)) B.gress[j * B.W + i] = 0; } }
  });

  // ---------- teksturer ----------
  const tekst = {};
  function vegTekstur(type) {
    if (tekst[type]) return tekst[type];
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'), im = g.createImageData(64, 256); let f = 7 + type.length;
    const rnd = () => (f = (f * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, grus = type === 'grus', fortau = type === 'fortau';
    for (let q = 0; q < 64 * 256; q++) { const n = rnd(), base = grus ? [118, 104, 82] : fortau ? [150, 148, 142] : [62, 63, 65], v = (n - .5) * (grus ? 46 : 18);
      im.data[q * 4] = base[0] + v; im.data[q * 4 + 1] = base[1] + v; im.data[q * 4 + 2] = base[2] + v; im.data[q * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    if (type === 'asfalt') { g.fillStyle = '#e8e6df'; g.fillRect(3, 0, 3, 256); g.fillRect(58, 0, 3, 256); g.fillStyle = '#d9b43a'; g.fillRect(30, 0, 4, 64); }   // kantlinjer + gul midtlinje 3 m av 12
    if (type === 'kommunal') { g.fillStyle = 'rgba(40,40,42,.5)'; g.fillRect(14, 0, 8, 256); g.fillRect(42, 0, 8, 256); }   // hjulspor
    if (fortau) { g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 64, 2); g.fillStyle = '#bdbab2'; g.fillRect(0, 0, 6, 256); }   // fuger + kantstein
    if (grus) { g.fillStyle = 'rgba(70,90,40,.35)'; g.fillRect(28, 0, 8, 256); }   // gress i midten
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return (tekst[type] = t);
  }

  // ---------- nettene: vegbånd (u på tvers, v = meter / 12) og fortau (2 m, 15 cm høyt med kantstein) ----------
  function bånd(P, a, b, løft, ut, kant) {
    // a, b: avstand fra midtlinjen (meter, venstre = negativ); ut = { pos, uv, idx }
    const n0 = ut.pos.length / 3; let L = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      if (i) L += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
      ut.pos.push(p[0] + nx * a, p[1] + ny * a, p[2] + løft, p[0] + nx * b, p[1] + ny * b, p[2] + løft); ut.uv.push(0, L / 12, 1, L / 12);
      if (kant) { ut.pos.push(p[0] + nx * a, p[1] + ny * a, p[2] - .05, p[0] + nx * a, p[1] + ny * a, p[2] + løft); ut.uv.push(0, L / 12, .08, L / 12); }
    }
    const per = kant ? 4 : 2;
    for (let i = 0; i < P.length - 1; i++) { const a0 = n0 + i * per, b0 = a0 + per; ut.idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); if (kant) ut.idx.push(a0 + 2, b0 + 2, a0 + 3, a0 + 3, b0 + 2, b0 + 3); }
  }
  function nett(ut, type, offset) {
    if (!ut.idx.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ut.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(ut.uv, 2)); g.setIndex(ut.idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: vegTekstur(type), polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset, side: THREE.DoubleSide }));
    return m;
  }
  function lagVeger(u, R) {
    const grupper = { asfalt: { pos: [], uv: [], idx: [] }, kommunal: { pos: [], uv: [], idx: [] }, grus: { pos: [], uv: [], idx: [] }, fortau: { pos: [], uv: [], idx: [] } };
    for (const v of u.veger) {
      const w = BREDDE[v.k] / 2, type = 'ERF'.includes(v.k) ? 'asfalt' : v.k === 'K' ? 'kommunal' : 'grus';
      bånd(v.P, -w, w, 0, grupper[type], false);
      if (v.by && 'RFK'.includes(v.k)) { bånd(v.P, w, w + 2, .15, grupper.fortau, true); bånd(v.P, -w, -w - 2, .15, grupper.fortau, true); }
    }
    let off = -4; for (const [type, ut] of Object.entries(grupper)) { const m = nett(ut, type, off--); if (m) { R.scene.add(m); liv.mesh.push(m); } }
  }

  // ---------- trafikk og folk ----------
  function velgLinjer(u, krav) { return u.veger.filter(krav).map(v => { const D = [0]; for (let i = 1; i < v.P.length; i++) D.push(D[i - 1] + Math.hypot(v.P[i][0] - v.P[i - 1][0], v.P[i][1] - v.P[i - 1][1])); return { ...v, D, L: D[D.length - 1] }; }).filter(v => v.L > 80); }
  function punkt(v, s, side) {   // posisjon s meter langs linjen, «side» meter til høyre for kjøreretningen
    let i = 1; while (i < v.D.length - 1 && v.D[i] < s) i++;
    const a = v.P[i - 1], b = v.P[i], f = Math.max(0, Math.min(1, (s - v.D[i - 1]) / (v.D[i] - v.D[i - 1] || 1))), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [a[0] + dx * f + dy / l * side, a[1] + dy * f - dx / l * side, a[2] + (b[2] - a[2]) * f, Math.atan2(dy, dx)];
  }
  const kasse = (x, y, z, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); return g; };
  function instanser(R, deler, n) { return deler.map(([g, farge]) => { const m = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial(farge ? { color: farge } : {}), n);
    if (!farge) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.frustumCulled = false; m.count = 0; R.scene.add(m); liv.mesh.push(m); return m; }); }
  function startLiv(u, R) {
    let f = 4242; const rnd = () => (f = (f * 1664525 + 1013904223) >>> 0) / 4294967296, mob = VW < 700;
    // biler: lakk (instansfarge), ruter, hjul
    const veg = velgLinjer(u, v => 'ERFK'.includes(v.k));
    if (veg.length) {
      const hjul = []; for (const [x, y] of [[1.35, .82], [1.35, -.82], [-1.35, .82], [-1.35, -.82]]) { const g = new THREE.CylinderGeometry(.33, .33, .22, 10); g.translate(x, y, .33); hjul.push(g); }
      liv.bilMesh = instanser(R, [[samle([kasse(0, 0, .3, 4.4, 1.78, .62), kasse(-.25, 0, 1.45, 2.2, 1.6, .08), kasse(1.55, 0, .88, 1.2, 1.7, .12)])], [kasse(-.25, 0, .9, 2.3, 1.66, .55), 0x1f262e], [samle(hjul), 0x101010]], mob ? 12 : 32);
      liv.biler = Array.from({ length: mob ? 12 : 32 }, () => { const v = veg[Math.floor(rnd() * veg.length)]; return { v, s: rnd() * v.L, dir: rnd() < .5 ? 1 : -1, fart: (v.k === 'K' ? 8 : 13) + rnd() * 5, farge: BILFARGER[Math.floor(rnd() * BILFARGER.length)] }; });
      liv.biler.forEach((b, k) => { liv.bilMesh[0].setColorAt(k, new THREE.Color(...b.farge)); });
    }
    // folk på fortauene i tettstedene: klær i tilfeldige farger
    const gate = velgLinjer(u, v => v.by && 'RFK'.includes(v.k));
    if (gate.length) {
      const bein = samle([kasse(0, .1, 0, .14, .14, .84), kasse(0, -.1, 0, .14, .14, .84)]), kropp = kasse(0, 0, .84, .26, .42, .62), hode = new THREE.SphereGeometry(.11, 10, 8); hode.translate(0, 0, 1.6);
      const hår = new THREE.SphereGeometry(.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2); hår.rotateX(Math.PI / 2); hår.translate(-.01, 0, 1.62);
      liv.folkMesh = instanser(R, [[bein, 0x2a2c33], [kropp], [hode, 0xd2a888], [hår, 0x3a2a1c]], mob ? 16 : 45);
      const KLÆR = [[.6, .12, .1], [.15, .25, .45], [.85, .78, .6], [.25, .35, .2], [.2, .2, .22], [.7, .55, .2], [.5, .5, .55], [.35, .15, .35]];
      liv.folk = Array.from({ length: mob ? 16 : 45 }, () => { const v = gate[Math.floor(rnd() * gate.length)]; return { v, s: rnd() * v.L, dir: rnd() < .5 ? 1 : -1, fart: 1.1 + rnd() * .5, side: BREDDE[v.k] / 2 + .9, fase: rnd() * 6 }; });
      liv.folk.forEach((p, k) => liv.folkMesh[1].setColorAt(k, new THREE.Color(...KLÆR[k % KLÆR.length])));
    }
    // fugler: tre flokker som sirkler over utsnittet
    const vinge = new THREE.BufferGeometry(); vinge.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -.3, .9, .08, .25, 0, 0, 0, 0, 0, .25, 0, 0, -.3, -.9, .08], 3)); vinge.computeVertexNormals();
    liv.fuglMesh = instanser(R, [[vinge, 0x1c1c1c]], 24); liv.fugler = Array.from({ length: 24 }, (_, k) => ({ flokk: k % 3, nr: Math.floor(k / 3), fase: rnd() * 6 }));
    liv.flokker = [0, 1, 2].map(() => ({ x: (rnd() - .5) * u.S, y: (rnd() - .5) * u.S, r: 150 + rnd() * 300, h: 70 + rnd() * 80, v: (rnd() < .5 ? 1 : -1) * (.05 + rnd() * .04) }));
    // røyk fra noen av pipene (dem nærmest midten)
    const piper = (u.hus && u.hus.piper) || [], valgt = [];
    for (let k = 0; k + 2 < piper.length && valgt.length < (mob ? 12 : 30); k += 3) if ((k / 3) % 3 === 0) valgt.push([piper[k], piper[k + 1], piper[k + 2]]);
    if (valgt.length) {
      const N = valgt.length * 8, pos = new Float32Array(N * 3), c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(225,225,228,.55)'); gr.addColorStop(1, 'rgba(225,225,228,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      liv.røyk = { piper: valgt, alder: Array.from({ length: N }, () => rnd() * 10), punkter: new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })) };
      liv.røyk.punkter.frustumCulled = false; R.scene.add(liv.røyk.punkter); liv.mesh.push(liv.røyk.punkter);
    }
    // vind i trærne: toppen svaier litt, hvert tre i sin egen takt
    liv.vind = [];
    for (const m of R.treMesh || []) if (m.geometry === TREGEO.gran || m.geometry === TREGEO['løv']) {
      m.material.onBeforeCompile = sh => { sh.uniforms.uTid = { value: 0 }; liv.vind.push(sh);
        sh.vertexShader = 'uniform float uTid;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float vh = max(0.0, transformed.z), fx = instanceMatrix[3].x, fy = instanceMatrix[3].y;
          transformed.x += sin(uTid * 1.3 + fx * .05 + fy * .07) * .035 * vh * vh; transformed.y += cos(uTid * 1.1 + fx * .06) * .02 * vh * vh;`); };
      m.material.needsUpdate = true;
    }
  }
  function fjern(R) { if (liv) for (const m of liv.mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } liv = { mesh: [] }; }
  KROKER.sett3d.push((u, R) => { fjern(R); if (u.veger && u.veger.length) lagVeger(u, R); if (u.S <= 2200) startLiv(u, R.ut === u ? R : R); });

  // ---------- hver ramme ----------
  let d = null;
  KROKER.ramme3d.push(R => {
    if (!liv || !R.ut) return; if (!d) d = new THREE.Object3D(); const nå = performance.now() / 1000, dt = Math.min(.1, nå - (sist || nå)); sist = nå; const u = R.ut;
    for (const sh of liv.vind || []) sh.uniforms.uTid.value = nå;
    const flytt = (liste, mesh, høyde) => liste.forEach((o, k) => {
      o.s += o.fart * dt * o.dir; if (o.s > o.v.L) { o.s = o.v.L; o.dir = -1; } else if (o.s < 0) { o.s = 0; o.dir = 1; }
      const [x, y, z, v] = punkt(o.v, o.s, (o.side || 1.7) * o.dir), bob = høyde ? Math.abs(Math.sin(nå * 7 + (o.fase || 0))) * .04 : 0;
      d.position.set(x, y, (hoyde3d(x + u.cx, y + u.cy) - u.h0) * R.EX + (høyde ? .15 : .12) + bob); d.rotation.set(0, 0, v + (o.dir < 0 ? Math.PI : 0)); d.scale.set(1, 1, 1); d.updateMatrix();
      for (const m of mesh) m.setMatrixAt(k, d.matrix); });
    if (liv.biler) { flytt(liv.biler, liv.bilMesh, false); for (const m of liv.bilMesh) { m.count = liv.biler.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
    if (liv.folk) { flytt(liv.folk, liv.folkMesh, true); for (const m of liv.folkMesh) { m.count = liv.folk.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
    if (liv.fugler) { liv.fugler.forEach((f, k) => { const F = liv.flokker[f.flokk], a = nå * F.v + f.nr * .05, rr = F.r + (f.nr % 3) * 6;
        d.position.set(F.x + Math.cos(a) * rr - (f.nr % 2) * 4, F.y + Math.sin(a) * rr, (hoyde3d(F.x + u.cx, F.y + u.cy) - u.h0) * R.EX + F.h + Math.sin(nå + f.nr) * 2);
        d.rotation.set(0, 0, a + (F.v > 0 ? Math.PI : 0)); d.scale.set(1.2, 1.2, 1 + Math.sin(nå * 9 + f.fase) * 2.5); d.updateMatrix(); liv.fuglMesh[0].setMatrixAt(k, d.matrix); });
      liv.fuglMesh[0].count = liv.fugler.length; liv.fuglMesh[0].instanceMatrix.needsUpdate = true; }
    if (liv.røyk) { const p = liv.røyk.punkter.geometry.attributes.position;
      liv.røyk.alder.forEach((a, k) => { a = (a + dt) % 10; liv.røyk.alder[k] = a; const [x, y, z] = liv.røyk.piper[Math.floor(k / 8)]; p.setXYZ(k, x + a * .35, y + a * .15 + Math.sin(a + k) * .3, z + a * .55); });
      p.needsUpdate = true; }
  });
})();
