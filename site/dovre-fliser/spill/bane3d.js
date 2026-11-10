'use strict';
// Jernbanen i 3D (utsnitt S ≤ 2200): pukkbane med sviller, to skinner og på elektriske baner kontaktledningsmaster hver ~60 m
// med utligger og kontakttråd. Sporene kommer fra utveg-flisene (OpenStreetMap, lag «bane», z11) som kartet bruker.
// Høyden glattes langs linjen; biter der terrenget går langt over/under den jevne profilen (tunnel, bru, dyp skjæring) og
// biter i vann tegnes ikke. Reglene øverst er uten DOM og THREE (test: pipeline/fliser/test_bane3d.js).
(function () {
  const STEG = 4;   // meter mellom punktene langs sporet
  const Regler = {
    // punkt hver STEG meter langs linjen P [[x, y], …]
    tett(P, steg = STEG) {
      const ut = [P[0]];
      for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / steg));
        for (let k = 1; k <= n; k++) ut.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
      return ut;
    },
    // glidende snitt over ±r punkter (endene med det som finnes)
    glatt(g, r) {
      const ut = new Array(g.length);
      for (let i = 0; i < g.length; i++) { let s = 0, n = 0; for (let k = Math.max(0, i - r); k <= Math.min(g.length - 1, i + r); k++) { s += g[k]; n++; } ut[i] = s / n; }
      return ut;
    },
    // glidende median over ±r punkter (en kort ås eller dal drar ikke profilen med seg)
    median(g, r) {
      const ut = new Array(g.length);
      for (let i = 0; i < g.length; i++) { const v = g.slice(Math.max(0, i - r), Math.min(g.length, i + r + 1)).sort((a, b) => a - b); ut[i] = v[v.length >> 1]; }
      return ut;
    },
    // høyden sporet tegnes i (z) og hvilke punkt som skal med (ok): jernbanen stiger sjelden mer enn 2–3 %, så der terrenget avviker
    // mer enn «grense» meter fra profilen (median over ±80 m, så jevnet), er det tunnel, bru eller dyp skjæring: da tegnes ikke sporet
    profil(g, ivann = () => false, grense = 4) {
      const r = Math.round(80 / STEG), p = Regler.glatt(Regler.median(g, r), r >> 1), z = Regler.glatt(g, Math.round(14 / STEG));
      const ok = g.map((h, i) => Math.abs(h - p[i]) < grense && !ivann(i));
      return { z: z.map((h, i) => Math.max(h, g[i] - .05)), ok };
    },
    // sammenhengende biter av ok-punkt (minst «min» punkt)
    biter(ok, min = 4) {
      const ut = []; let a = -1;
      for (let i = 0; i <= ok.length; i++) { if (i < ok.length && ok[i]) { if (a < 0) a = i; } else if (a >= 0) { if (i - a >= min) ut.push([a, i - 1]); a = -1; } }
      return ut;
    },
    // elektrisk bane? Normalspor er elektrisk i Norge (Dovrebanen, Raumabanen, Bergensbanen …) unntatt de store dieselbanene:
    // Nordlandsbanen (nord for Trondheim, utenom Ofotbanen ved Narvik) og Rørosbanen (Østerdalen). Claudes anslag (OSM-flisene
    // har ikke merket «electrified»).
    elektrisk(t, x, y) {
      if (t === 1) return false;
      if (y > 7060000 && !(x > 560000 && y > 7580000)) return false;
      if (x > 290000 && x < 345000 && y > 6760000 && y < 6960000) return false;
      return true;
    },
  };
  if (typeof module !== 'undefined') { module.exports = Regler; return; }
  window.Bane3dRegler = Regler;

  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let mesh = [];
  window.Bane3d = { spor: () => (r3() && r3().ut && r3().ut.baner) || [], mesh: () => mesh };

  // ---------- sporene fra utveg-flisene ----------
  KROKER.bygg3d.push(async u => {
    u.baner = [];
    if (u.S > 2200 || !VIS.bane || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.utveg) return;
    const z = 11, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), fl = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('utveg', z, x, y).then(t => [x, y, t]));
    const vann = u.vann && u.vann.getContext ? (() => { try { const W = u.vann.width; return { W, d: u.vann.getContext('2d').getImageData(0, 0, W, W).data }; } catch (e) { return null; } })() : null;
    const iVann = (x, y) => { if (!vann) return false; const i = Math.floor((x + u.S) / (2 * u.S) * vann.W), j = Math.floor((u.S - y) / (2 * u.S) * vann.W);
      return i >= 0 && j >= 0 && i < vann.W && j < vann.W && vann.d[(j * vann.W + i) * 4] > 127; };
    const baner = [];
    for (const [x, y, t] of await Promise.all(fl)) {
      if (!t || !t.bane) continue; const mx = G.x0 + x * sp, my = G.y0 - y * sp, e = t.bane.ext || 4096;
      for (const o of t.bane.obj) for (const d of o.deler) {
        const P = Regler.tett(d.map(([a, b]) => [mx + a / e * sp - u.cx, my - b / e * sp - u.cy]))
          .filter(p => Math.abs(p[0]) < u.S - 6 && Math.abs(p[1]) < u.S - 6);
        if (P.length < 4) continue;
        const g = P.map(([a, b]) => (hoyde3d(a + u.cx, b + u.cy, u) - u.h0) * R3.EX);
        const { z: zz, ok } = Regler.profil(g, i => iVann(P[i][0], P[i][1]));
        // hopp over punkt som henger sammen dårlig (flisutklipp i kanten av utsnittet)
        for (let i = 1; i < P.length; i++) if (Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) > STEG * 3) ok[i] = false;
        const el = Regler.elektrisk(o.e.t | 0, P[P.length >> 1][0] + u.cx, P[P.length >> 1][1] + u.cy);
        for (const [a, b] of Regler.biter(ok)) baner.push({ P: P.slice(a, b + 1).map((p, k) => [p[0], p[1], zz[a + k]]), el });
      }
    }
    u.baner = baner;
    if (!baner.length) return;
    // ingen trær, steiner, busker eller gress på banen (4 m fra midten)
    const W = 1024, m = new Uint8Array(W * W), celle = 2 * u.S / W, r = 4, rc = Math.ceil(r / celle);
    for (const b of baner) for (const [px, py] of b.P) { const ci = Math.floor((px + u.S) / celle), cj = Math.floor((u.S - py) / celle);
      for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const a2 = ci + di, b2 = cj + dj; if (a2 < 0 || b2 < 0 || a2 >= W || b2 >= W) continue; m[b2 * W + a2] = 1; } }
    const på = (x, y) => { const i = Math.floor((x + u.S) / celle), j = Math.floor((u.S - y) / celle); return i >= 0 && j >= 0 && i < W && j < W && m[j * W + i] === 1; };
    u.påBane = på;
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) if (!på(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.trær) for (const k in u.trær) u.trær[k] = sil(u.trær[k]);
    if (u.smått) { if (u.smått.stein) u.smått.stein = sil(u.smått.stein); if (u.smått.busk) u.smått.busk = sil(u.smått.busk); }
    if (u.bunn && u.bunn.gress) { const B = u.bunn; for (let j = 0; j < B.W; j++) for (let i = 0; i < B.W; i++) { if (på(-u.S + (i + .5) / B.W * 2 * u.S, u.S - (j + .5) / B.W * 2 * u.S)) B.gress[j * B.W + i] = 0; } }
  });

  // ---------- tekstur: pukk på sidene (u 0–0,25), pukk med sviller på toppen (u 0,25–1) ----------
  let tex = null;
  function pukkTekstur() {
    if (tex) return tex;
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'), im = g.createImageData(128, 128); let f = 11;
    const rnd = () => (f = (f * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let q = 0; q < 128 * 128; q++) { const v = 132 + (rnd() - .5) * 80; im.data[q * 4] = v; im.data[q * 4 + 1] = v - 3; im.data[q * 4 + 2] = v - 6; im.data[q * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    // to sviller per tekstur (v = 1,2 m): brune betongsviller med skygge
    for (const y of [10, 74]) { g.fillStyle = 'rgba(20,18,15,.5)'; g.fillRect(40, y + 2, 82, 30); g.fillStyle = '#4b4239'; g.fillRect(38, y, 84, 28); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(38, y, 84, 4); }
    tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8; return tex;
  }

  // ---------- nettene ----------
  function fjern(R) { for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); if (m.material.dispose) m.material.dispose(); } mesh = []; }
  function lag(u, R) {
    const pukk = { pos: [], uv: [], idx: [] }, skinne = { pos: [], idx: [] }, mastPos = [], tråd = [];
    // tverrsnitt: (avstand fra midten, høyde over bakken, u)
    const SNITT = [[-2.6, -.25, 0], [-1.7, .35, .25], [1.7, .35, 1], [2.6, -.25, 0]];
    for (const b of u.baner) {
      const P = b.P, n0 = pukk.pos.length / 3; let L = 0;
      for (let i = 0; i < P.length; i++) {
        const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, p = P[i];
        if (i) L += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
        for (const [a, h, uu] of SNITT) { pukk.pos.push(p[0] + nx * a, p[1] + ny * a, p[2] + h); pukk.uv.push(uu, L / 1.2); }
        // skinnene: 1,435 m sporvidde, profil 7 cm bred og 15 cm høy oppå svillene
        for (const s of [-.75, .75]) for (const [a, h] of [[-.035, .35], [-.035, .5], [.035, .5], [.035, .35]]) skinne.pos.push(p[0] + nx * (s + a), p[1] + ny * (s + a), p[2] + h);
        // master hver ~60 m på høyre side
        if (b.el && i % 15 === 7) mastPos.push([p[0] - nx * 3.2, p[1] - ny * 3.2, p[2] - .3, Math.atan2(ny, nx)]);
        if (b.el && i) { const o2 = P[i - 1]; tråd.push(o2[0], o2[1], o2[2] + 5.9, p[0], p[1], p[2] + 5.9); }
      }
      // 3 bånd mellom de 4 punktene i snittet
      for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 3; k++) { const a = n0 + i * 4 + k, c2 = a + 4; pukk.idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
      const s0 = skinne.pos.length / 3 - P.length * 8;
      for (let i = 0; i < P.length - 1; i++) for (let s = 0; s < 2; s++) for (let k = 0; k < 3; k++) { const a = s0 + i * 8 + s * 4 + k, c2 = a + 8; skinne.idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
    }
    const geo = (pos, idx, uv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    const mp = new THREE.Mesh(geo(pukk.pos, pukk.idx, pukk.uv), new THREE.MeshLambertMaterial({ map: pukkTekstur(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }));
    const ms = new THREE.Mesh(geo(skinne.pos, skinne.idx), new THREE.MeshPhongMaterial({ color: 0x8c8a86, specular: 0x666666, shininess: 40, side: THREE.DoubleSide }));
    mesh.push(mp, ms);
    if (mastPos.length) {
      // mast (stålbjelke 7 m) + utligger inn over sporet + isolator; samlet til én geometri, så én InstancedMesh
      const deler = [[new THREE.BoxGeometry(.25, .25, 9), [0, 0, 2.5]], [new THREE.BoxGeometry(3.6, .1, .12), [1.7, 0, 6.6]], [new THREE.BoxGeometry(3.4, .06, .06), [1.65, 0, 6.0]], [new THREE.BoxGeometry(.08, .08, .7), [3.25, 0, 6.25]]];
      const pos = [], idx = [];
      for (const [g, [x, y, z]] of deler) { g.translate(x, y, z); const gi = g.toNonIndexed(), a = gi.attributes.position.array, n = pos.length / 3; for (let k = 0; k < a.length; k++) pos.push(a[k]); for (let k = 0; k < a.length / 3; k++) idx.push(n + k); g.dispose(); gi.dispose(); }
      const mg = geo(pos, idx), im = new THREE.InstancedMesh(mg, new THREE.MeshLambertMaterial({ color: 0x5d6064 }), mastPos.length), d = new THREE.Object3D();
      mastPos.forEach(([x, y, z, v], k) => { d.position.set(x, y, z); d.rotation.set(0, 0, v); d.updateMatrix(); im.setMatrixAt(k, d.matrix); });
      im.instanceMatrix.needsUpdate = true; mesh.push(im);
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(tråd, 3));
      mesh.push(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: .8 })));
    }
    for (const m of mesh) { m.name = 'bane3d'; R.scene.add(m); }
  }
  KROKER.sett3d.push((u, R) => { fjern(R); if (u.baner && u.baner.length) lag(u, R); });
})();
