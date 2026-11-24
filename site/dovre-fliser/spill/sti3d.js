'use strict';
// STIER I 3D (R19-5, brukeren med bilder fra en fjelltur: «smal sti langs stupet, malt merking på stein og trær, vaier på utsatte
// steder»). Stiene kommer fra utveg-flisene (OpenStreetMap, lag «sti», z11; pipeline/fliser/utveg.py), som jernbanen i bane3d.js.
// I utsnitt med S ≤ 2200: et smalt slitt bånd av jord og stein som følger terrengnettet (ikke i vann eller hus), traktorveger som to
// hjulspor, og på MERKEDE ruter (e.m = 1) rød T med hvit kant på steiner og trær omtrent hvert 50.–100. m, varder på snaufjellet
// (over tregrensen), og vaier på stolper der stien er vanskelig (sac_scale ≥ 3) og det er bratt ned på siden. Trær, busker og
// steiner ryddes langs stien. Når du går på stien, går det litt fortere (Sti3d.fart i gange.js).
// Reglene øverst er uten DOM og THREE (test: pipeline/fliser/test_sti3d.js). Alle tall er Claudes forslag.
(function () {
  const REGLER = {
    steg: 3,                 // m mellom punktene langs stien
    bredde: { sti: .7, traktor: 2.6, utydelig: .45 },   // m bredde på båndet (utydelig = trail_visibility dårlig eller alpint)
    merke: { snitt: 70, min: 45 },   // m: i snitt én T per 70 m, aldri nærmere enn 45 m
    tre: { fra: 1.3, til: 5 },       // m: T males på et tre så nær stien (ellers på en stein)
    rydd: { sti: 1.1, traktor: 2.2 },   // m fra midten der trær, busker og steiner tas bort
    utsatt: { fall: 1.05, fallVanskelig: .75, sidevei: 4, min: 4 },   // fall per meter ned på siden (over «sidevei» m) for vaier; minst 4 punkt på rad
    fart: { sti: 1.15, traktor: 1.2 },  // gangfart på stien mot terrenget ellers
    maksPunkt: { pc: 30000, mobil: 12000 },
  };
  const hash = (a, b, c = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const Regler = {
    REGLER, hash,
    // punkt hver «steg» meter langs linjen P [[x, y], …]
    tett(P, steg = REGLER.steg) {
      const ut = [P[0]];
      for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / steg));
        for (let k = 1; k <= n; k++) ut.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
      return ut;
    },
    // klipper linjen til boksen [x0, y0, x1, y1] (flisene har en kant som overlapper naboflisen – ellers kom stien to ganger der)
    klipp(P, b) {
      const [x0, y0, x1, y1] = b, inni = p => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1, ut = []; let cur = null;
      const kant = (a, c) => { let t0 = 0, t1 = 1; const dx = c[0] - a[0], dy = c[1] - a[1];
        for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
          if (p === 0) { if (q < 0) return null; continue; } const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
        return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]; };
      for (let i = 1; i < P.length; i++) {
        const s = kant(P[i - 1], P[i]); if (!s) { if (cur) { ut.push(cur); cur = null; } continue; }
        if (!cur) cur = [s[0]]; cur.push(s[1]);
        if (!inni(P[i])) { ut.push(cur); cur = null; }
      }
      if (cur) ut.push(cur);
      return ut.filter(d => d.length >= 2);
    },
    // båndets bredde for en sti med egenskapene e { t, m, s, v }
    bredde(e) { return e.t ? REGLER.bredde.traktor : (e.v | 0) >= 3 || (e.s | 0) >= 4 ? REGLER.bredde.utydelig : REGLER.bredde.sti; },
    // utsatt: fall per meter ned på siden (venstre/høyre, målt «sidevei» meter ut) mot stiens egen høyde g0
    utsatt(g0, gV, gH, s) {
      const fall = Math.max(g0 - gV, g0 - gH) / REGLER.utsatt.sidevei;
      return fall > ((s | 0) >= 3 ? REGLER.utsatt.fallVanskelig : REGLER.utsatt.fall);
    },
    // hvor på stien merkene står (indekser i P): fast etter stedet i kartet (X, Y = verdens meter), i snitt hvert REGLER.merke.snitt m
    merker(PW) {
      const ut = []; let sist = -1e9, L = 0;
      for (let i = 0; i < PW.length; i++) {
        if (i) L += Math.hypot(PW[i][0] - PW[i - 1][0], PW[i][1] - PW[i - 1][1]);
        if (L - sist < REGLER.merke.min) continue;
        const [X, Y] = PW[i];
        if (hash(Math.floor(X / 5), Math.floor(Y / 5), 7) < REGLER.steg / (REGLER.merke.snitt - REGLER.merke.min) || L - sist > REGLER.merke.snitt * 1.6) { ut.push(i); sist = L; }
      }
      return ut;
    },
    // biter av sammenhengende sanne punkt (minst «min»)
    biter(ok, min = 2) {
      const ut = []; let a = -1;
      for (let i = 0; i <= ok.length; i++) { if (i < ok.length && ok[i]) { if (a < 0) a = i; } else if (a >= 0) { if (i - a >= min) ut.push([a, i - 1]); a = -1; } }
      return ut;
    },
    // rutenett med stibitene, så «står jeg på stien?» og «er treet i stien?» blir raskt: linjer = [{ P: [[x, y], …], w }]
    rutenett(linjer, celle = 12) {
      const m = new Map(), k = (i, j) => i * 100003 + j;
      for (const l of linjer) for (let i = 1; i < l.P.length; i++) {
        const a = l.P[i - 1], b = l.P[i], s = [a[0], a[1], b[0], b[1], l.w, l.t | 0], r = l.w / 2 + 3;
        for (let gi = Math.floor((Math.min(a[0], b[0]) - r) / celle); gi <= Math.floor((Math.max(a[0], b[0]) + r) / celle); gi++)
          for (let gj = Math.floor((Math.min(a[1], b[1]) - r) / celle); gj <= Math.floor((Math.max(a[1], b[1]) + r) / celle); gj++) { const n = k(gi, gj); let L = m.get(n); if (!L) m.set(n, L = []); L.push(s); }
      }
      return { m, celle, k };
    },
    // avstand fra punktet til nærmeste stikant (negativ = på stien) og stiens type; null når ingen sti er nær
    nærmest(R, x, y) {
      if (!R) return null; const L = R.m.get(R.k(Math.floor(x / R.celle), Math.floor(y / R.celle))); if (!L) return null; let best = null;
      for (const [ax, ay, bx, by, w, t] of L) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, f = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const d = Math.hypot(x - ax - dx * f, y - ay - dy * f) - w / 2; if (!best || d < best.d) best = { d, t }; }
      return best;
    },
    // gangfarten: 1 utenfor stien, litt raskere på den (en halv meter slingringsmonn)
    fart(R, x, y) { const n = Regler.nærmest(R, x, y); return n && n.d < .5 ? (n.t ? REGLER.fart.traktor : REGLER.fart.sti) : 1; },
  };
  if (typeof module !== 'undefined') { module.exports = Regler; return; }
  window.Sti3dRegler = Regler;

  let mesh = [];
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  window.Sti3d = {
    stier: () => (r3() && r3().ut && r3().ut.stier) || [],
    merker: () => (r3() && r3().ut && r3().ut.stiMerker) || [],
    mesh: () => mesh,
    // gange.js: fart der du står (x, y relativt til utsnittets midte)
    fart: (u, x, y) => (u && u.stiRute ? Regler.fart(u.stiRute, x, y) : 1),
    på: (u, x, y) => { const n = u && u.stiRute ? Regler.nærmest(u.stiRute, x, y) : null; return !!n && n.d < .5; },
  };

  // ---------- stiene fra utveg-flisene ----------
  KROKER.bygg3d.push(async u => {
    u.stier = []; u.stiMerker = []; u.stiVaier = []; u.stiRute = null;
    if (u.S > 2200 || VIS.sti === false || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.utveg) return;
    const z = 11, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), fl = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('utveg', z, x, y).then(t => [x, y, t]));
    // vannmasken (samme form som i bane3d.js og gange.js)
    const vann = u.vann && u.vann.getContext ? (u.vannData && u.vannData.d ? u.vannData : (() => { try { const W = u.vann.width; return (u.vannData = { W, d: u.vann.getContext('2d').getImageData(0, 0, W, W).data }); } catch (e) { return null; } })()) : null;
    const iVann = (x, y) => { if (!vann) return false; const i = Math.floor((x + u.S) / (2 * u.S) * vann.W), j = Math.floor((u.S - y) / (2 * u.S) * vann.W);
      return i >= 0 && j >= 0 && i < vann.W && j < vann.W && vann.d[(j * vann.W + i) * 4] > 127; };
    const iHus = (x, y) => typeof nærHus === 'function' && u.hus && nærHus(u, x, y);
    const mobil = VW < 900, maks = mobil ? REGLER.maksPunkt.mobil : REGLER.maksPunkt.pc;
    const kand = [];
    for (const [x, y, t] of await Promise.all(fl)) {
      if (!t || !t.sti) continue; const mx = G.x0 + x * sp, my = G.y0 - y * sp, e = t.sti.ext || 4096;
      // flisens egen rute (relativt til utsnittet) – resten av linjen ligger også i naboflisen
      const boks = [mx - u.cx, my - sp - u.cy, mx + sp - u.cx, my - u.cy];
      for (const o of t.sti.obj) for (const d of o.deler) for (const del of Regler.klipp(d.map(([a, b]) => [mx + a / e * sp - u.cx, my - b / e * sp - u.cy]), boks)) {
        const P = Regler.tett(del).filter(p => Math.abs(p[0]) < u.S - 4 && Math.abs(p[1]) < u.S - 4);
        if (P.length >= 2) kand.push({ P, e: o.e, d: Math.min(...P.map(p => Math.hypot(p[0], p[1]))) });
      }
    }
    // nærmest midten først til taket
    kand.sort((a, b) => a.d - b.d); let n = 0;
    const stier = [];
    for (const k of kand) {
      if (n > maks) break;
      if (typeof børPuste === 'function' && børPuste()) await pust();
      const ok = k.P.map(([a, b]) => !iVann(a, b) && !iHus(a, b));
      for (const [a, b] of Regler.biter(ok)) { const P = k.P.slice(a, b + 1); stier.push({ P, e: k.e, w: Regler.bredde(k.e), t: k.e.t | 0 }); n += P.length; }
    }
    u.stier = stier;
    if (!stier.length) return;
    u.stiRute = Regler.rutenett(stier);
    // ryddes: trær, busker og steiner i stien (nærmeste stikant innen rydd − halv bredde)
    const iStien = (x, y) => { const q = Regler.nærmest(u.stiRute, x, y); return !!q && q.d < (q.t ? REGLER.rydd.traktor - REGLER.bredde.traktor / 2 : REGLER.rydd.sti - REGLER.bredde.sti / 2); };
    const sil = (data, s = 5) => { const ut = []; for (let k = 0; k < data.length; k += s) if (!iStien(data[k], data[k + 1])) for (let q = 0; q < s; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.trær) for (const k in u.trær) u.trær[k] = sil(u.trær[k]);
    if (u.smått) { if (u.smått.stein) u.smått.stein = sil(u.smått.stein); if (u.smått.busk) u.smått.busk = sil(u.smått.busk); }
    // merkene på de merkede rutene: tre innen 1,3–5 m (nærmeste), ellers stein; over tregrensen annenhver varde
    const trær = []; if (u.trær) for (const k in u.trær) { const d = u.trær[k]; for (let q = 0; q < d.length; q += 5) trær.push([d[q], d[q + 1], d[q + 3] || 8]); }
    const treRute = new Map(); for (const t of trær) { const kk = Math.floor(t[0] / 8) + ',' + Math.floor(t[1] / 8); let L = treRute.get(kk); if (!L) treRute.set(kk, L = []); L.push(t); }
    const nærTre = (x, y) => { let best = null, bd = REGLER.tre.til; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const t of treRute.get((Math.floor(x / 8) + i) + ',' + (Math.floor(y / 8) + j)) || []) {
      const d = Math.hypot(t[0] - x, t[1] - y); if (d < bd && d > REGLER.tre.fra) { bd = d; best = t; } } return best; };
    const tregrense = (Y, X) => (window.Vegetasjon && Vegetasjon.tregrense ? Vegetasjon.tregrense(Y, X) : 1100);
    const merker = [];
    for (const s of stier) {
      if (!s.e.m) continue;
      const PW = s.P.map(p => [p[0] + u.cx, p[1] + u.cy]);
      for (const i of Regler.merker(PW)) {
        const p = s.P[i], q = s.P[Math.min(s.P.length - 1, i + 1)], o = s.P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        const [X, Y] = PW[i], side = hash(Math.floor(X), Math.floor(Y), 3) < .5 ? 1 : -1, moh = hoyde3d(X, Y, u);
        const fjell = moh > tregrense(Y, X);
        const tre = fjell ? null : nærTre(p[0], p[1]);
        if (tre) { merker.push({ type: 'tre', x: tre[0], y: tre[1], mot: Math.atan2(p[1] - tre[1], p[0] - tre[0]), h: tre[2] }); continue; }
        const sx = p[0] + nx * side * (s.w / 2 + .9), sy = p[1] + ny * side * (s.w / 2 + .9);
        if (iVann(sx, sy) || iHus(sx, sy)) continue;
        merker.push({ type: fjell && hash(Math.floor(X / 3), Math.floor(Y / 3), 11) < .55 ? 'varde' : 'stein', x: sx, y: sy, mot: Math.atan2(-ny * side, -nx * side), r: .8 + hash(Math.floor(X), Math.floor(Y), 5) * .5 });
      }
    }
    u.stiMerker = merker;
  });

  // ---------- teksturer: båndet (u 0–0,5 sti, 0,5–1 traktorveg; kantene tones ut) og T-merket ----------
  let tex = null, tTex = null;
  function båndTekstur() {
    if (tex) return tex;
    const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H); let f = 29;
    const rnd = () => (f = (f * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const q = (j * W + i) * 4, u = (i + .5) / W, traktor = u >= .5, v = traktor ? (u - .5) * 2 : u * 2;
      // sti: slitt midt, tonet ut mot kantene; traktorveg: to hjulspor med gress i midten
      let a = traktor ? Math.max(0, 1 - Math.abs(Math.abs(v - .5) - .3) / .16) : Math.max(0, 1 - Math.abs(v - .5) / .5);
      a = Math.min(1, a * 1.7) * (.75 + rnd() * .25);
      const st = rnd() < .06, br = st ? 128 + rnd() * 40 : 92 + rnd() * 30;
      im.data[q] = br; im.data[q + 1] = br * .86; im.data[q + 2] = br * .66; im.data[q + 3] = Math.round(255 * a);
    }
    g.putImageData(im, 0, 0);
    tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8; return tex;
  }
  // rød T med hvit kant (generisk turmerke)
  function tTekstur() {
    if (tTex) return tTex;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const T = (k, farge) => { g.fillStyle = farge; g.fillRect(8 - k, 10 - k, 48 + 2 * k, 13 + 2 * k); g.fillRect(25 - k, 10 - k, 14 + 2 * k, 46 + 2 * k); };
    T(5, '#f3efe6'); T(0, '#c3261c');
    tTex = new THREE.CanvasTexture(c); tTex.anisotropy = 4; return tTex;
  }

  // ---------- nettene ----------
  function fjern(R) { for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); if (m.material.dispose) m.material.dispose(); } mesh = []; }
  function samle(deler) {
    const pos = [];
    for (const [g, [x, y, z], [sx, sy, sz]] of deler) { g.scale(sx, sy, sz); g.translate(x, y, z); const gi = g.index ? g.toNonIndexed() : g, a = gi.attributes.position.array; for (let k = 0; k < a.length; k++) pos.push(a[k]); if (gi !== g) gi.dispose(); g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }
  function lag(u, R) {
    const zf = (x, y) => (typeof nettHoyde === 'function' ? nettHoyde(u, x, y) : (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R.EX);
    const pos = [], uv = [], idx = [], stolper = [], vaier = [];
    for (const s of u.stier) {
      const P = s.P, n0 = pos.length / 3, u0 = s.t ? .5 : 0; let L = 0;
      const utsatt = [];
      for (let i = 0; i < P.length; i++) {
        const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, p = P[i];
        if (i) L += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
        // tre punkt på tvers: venstre kant, midten, høyre kant (teksturen toner ut kantene)
        for (const [a, uu] of [[-.5, 0], [0, .25], [.5, .5]]) { const x = p[0] + nx * a * s.w * 1.25, y = p[1] + ny * a * s.w * 1.25; pos.push(x, y, zf(x, y) + .05); uv.push(u0 + uu, L / 3); }
        if (!s.t) { const sv = Regler.REGLER.utsatt.sidevei, g0 = zf(p[0], p[1]); utsatt.push(Regler.utsatt(g0, zf(p[0] + nx * sv, p[1] + ny * sv), zf(p[0] - nx * sv, p[1] - ny * sv), s.e.s)); }
      }
      for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 2; k++) { const a = n0 + i * 3 + k, c2 = a + 3; idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
      // VAIER: på strekk som er utsatte minst «min» punkt på rad, på oppsiden av stien (stolpe hvert punkt, 3 m)
      for (const [a, b] of Regler.biter(utsatt, Regler.REGLER.utsatt.min)) {
        let forrige = null;
        for (let i = a; i <= b; i++) {
          const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, p = P[i];
          const opp = zf(p[0] + nx * 3, p[1] + ny * 3) >= zf(p[0] - nx * 3, p[1] - ny * 3) ? 1 : -1, x = p[0] + nx * opp * (s.w / 2 + .35), y = p[1] + ny * opp * (s.w / 2 + .35), z = zf(x, y);
          stolper.push([x, y, z]);
          if (forrige) { const [fx, fy, fz] = forrige; for (let k = 0; k < 4; k++) { const t0 = k / 4, t1 = (k + 1) / 4, h = t => 1 - .12 * 4 * t * (1 - t);
            vaier.push(fx + (x - fx) * t0, fy + (y - fy) * t0, fz + (z - fz) * t0 + h(t0), fx + (x - fx) * t1, fy + (y - fy) * t1, fz + (z - fz) * t1 + h(t1)); } }
          forrige = [x, y, z];
        }
      }
    }
    u.stiVaier = stolper;
    if (idx.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      mesh.push(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: båndTekstur(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
    }
    // merkene: steiner, varder og T-er (InstancedMesh, én per slag)
    const M = u.stiMerker || [], d = new THREE.Object3D(), farge = new THREE.Color();
    const steiner = M.filter(m => m.type === 'stein'), varder = M.filter(m => m.type === 'varde'), tPos = [];
    if (steiner.length) {
      const im = new THREE.InstancedMesh(samle([[new THREE.IcosahedronGeometry(1, 0), [0, 0, .12], [.42, .36, .3]]]), new THREE.MeshLambertMaterial({ color: 0xffffff }), steiner.length);
      steiner.forEach((m, k) => { d.position.set(m.x, m.y, zf(m.x, m.y)); d.rotation.set(0, 0, m.mot); d.scale.setScalar(m.r); d.updateMatrix(); im.setMatrixAt(k, d.matrix);
        farge.setRGB(.5, .49, .46).multiplyScalar(.85 + Regler.hash(k, 1) * .3); im.setColorAt(k, farge);
        tPos.push([m.x + Math.cos(m.mot) * .4 * m.r, m.y + Math.sin(m.mot) * .4 * m.r, zf(m.x, m.y) + .2 * m.r, m.mot, .26 * m.r]); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; mesh.push(im);
    }
    if (varder.length) {
      // varden: steiner stablet til ca. 1,2 m, smalere oppover
      const deler = [[0, .2, .55, .5, .3], [.05, .5, .45, .42, .26], [-.04, .78, .36, .33, .22], [.02, 1.02, .25, .24, .17], [0, 1.18, .14, .13, .1]].map(([x, z, a, b, c]) => [new THREE.IcosahedronGeometry(1, 0), [x, 0, z], [a, b, c]]);
      const im = new THREE.InstancedMesh(samle(deler), new THREE.MeshLambertMaterial({ color: 0xffffff }), varder.length);
      varder.forEach((m, k) => { d.position.set(m.x, m.y, zf(m.x, m.y) - .05); d.rotation.set(0, 0, m.mot); d.scale.setScalar(.85 + Regler.hash(k, 2) * .35); d.updateMatrix(); im.setMatrixAt(k, d.matrix);
        farge.setRGB(.55, .54, .5).multiplyScalar(.85 + Regler.hash(k, 3) * .25); im.setColorAt(k, farge);
        const sk = .85 + Regler.hash(k, 2) * .35; tPos.push([m.x + Math.cos(m.mot) * .5 * sk, m.y + Math.sin(m.mot) * .5 * sk, zf(m.x, m.y) + .5 * sk, m.mot, .24]); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; mesh.push(im);
    }
    for (const m of M) if (m.type === 'tre') { const r = Math.max(.14, Math.min(.32, (m.h || 8) * .02)); tPos.push([m.x + Math.cos(m.mot) * (r + .02), m.y + Math.sin(m.mot) * (r + .02), zf(m.x, m.y) + 1.45, m.mot, .24]); }
    if (tPos.length) {
      const pg = new THREE.PlaneGeometry(1, 1); pg.rotateY(Math.PI / 2); pg.rotateX(0);
      const im = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ map: tTekstur(), alphaTest: .5, side: THREE.DoubleSide }), tPos.length);
      tPos.forEach(([x, y, z, a, s], k) => { d.position.set(x, y, z); d.rotation.set(0, 0, a); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(k, d.matrix); });
      im.instanceMatrix.needsUpdate = true; mesh.push(im);
    }
    if (stolper.length) {
      const cg = new THREE.CylinderGeometry(.022, .028, 1.1, 5); cg.rotateX(Math.PI / 2); cg.translate(0, 0, .5);
      const im = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0x4a4c50 }), stolper.length);
      stolper.forEach(([x, y, z], k) => { d.position.set(x, y, z); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); im.setMatrixAt(k, d.matrix); });
      im.instanceMatrix.needsUpdate = true; mesh.push(im);
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(vaier, 3));
      mesh.push(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x303236 })));
    }
    for (const m of mesh) { m.name = 'sti3d'; R.scene.add(m); }
  }
  KROKER.sett3d.push((u, R) => { fjern(R); if (u.stier && u.stier.length) lag(u, R); });
})();
