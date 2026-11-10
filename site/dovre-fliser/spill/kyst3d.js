'use strict';
// Kysten i 3D (brukeren 12. nov: «legg til flere detaljer i hele Norge»): småbåter (snekke, sjark med styrehus, motorbåt med kabin) fortøyd
// ved kaier og flytebrygger i tettstedene og noen ute på sjøen, flytebrygger, naust med gavlen mot sjøen utenfor tettstedene og bøyer.
// Reglene (hvor ting står) er i spill/kyst.js. Kroker: KROKER.bygg3d (plassering), KROKER.sett3d (nettene), KROKER.ramme3d (båtene gynger).
// Bare når utsnittet er lite (S ≤ 2200). Båtene er InstancedMesh (få trekanter), brygger, naust og bøyer én samlet geometri.
(function () {
  const F = { tre: [.46, .36, .26], ponton: [.2, .21, .22], hvit: [.92, .92, .9], glass: [.1, .13, .17], tak: [.2, .2, .22], dør: [.16, .12, .09],
    naust: [[.52, .15, .11], [.86, .84, .78], [.26, .19, .14]], bøye: [[.75, .12, .1], [.1, .45, .2], [.85, .7, .1]] };
  const tak = () => (typeof VW !== 'undefined' && VW < 900);

  // ---------- plasseringen ----------
  KROKER.bygg3d.push(async u => {
    u.kyst = null;
    if (u.S > 2200 || !window.Kyst || !u.vann) return;
    const W = u.vann.width, d = u.vannData || (u.vannData = u.vann.getContext('2d').getImageData(0, 0, W, W).data);
    const iVann = (x, y) => { const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); return i >= 0 && j >= 0 && i < W && j < W && d[(j * W + i) * 4] > 127; };
    const moh = (x, y) => hoyde3d(x + u.cx, y + u.cy, u);
    const sjø = (x, y) => iVann(x, y) && moh(x, y) < 1;
    const byer = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && window.Garnison ? INFRA.tettsted.filter(t => t.bb[2] > u.cx - u.S && t.bb[0] < u.cx + u.S && t.bb[3] > u.cy - u.S && t.bb[1] < u.cy + u.S) : [];
    const kaier = (u.kaier3d || []).map(k => k.Q);
    const hinder = (x, y) => (u.hus && u.hus.omriss && nærHus(u, x, y)) || (u.påVeg && u.påVeg(x, y)) || kaier.some(q => Math.hypot(q[0] - x, q[1] - y) < 90);
    const k = Kyst.plasser({ S: u.S, cx: u.cx, cy: u.cy, mobil: tak(), sjø, moh, hinder, by: (x, y) => byer.some(b => Garnison.inni(b, x + u.cx, y + u.cy)) });
    // ikke båter oppå ferjekaiene
    k.båter = k.båter.filter(b => !kaier.some(q => Math.hypot(q[0] - b.x, q[1] - b.y) < 90));
    const zs = (x, y) => (Math.min(.3, moh(x, y)) - u.h0) * R3.EX;
    for (const b of k.båter) b.z = zs(b.x, b.y);
    for (const b of k.brygger) b.z = zs(b.x + Math.cos(b.a) * b.L / 2, b.y + Math.sin(b.a) * b.L / 2);
    for (const b of k.bøyer) b.z = zs(b.x, b.y);
    for (const n of k.naust) { let lo = Infinity; for (const [p, q] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) { const x = n.x + Math.cos(n.a) * n.L * p - Math.sin(n.a) * n.B * q, y = n.y + Math.sin(n.a) * n.L * p + Math.cos(n.a) * n.B * q; lo = Math.min(lo, (moh(x, y) - u.h0) * R3.EX); } n.z = lo; }
    // trær og busker der naustene står, tas bort
    const vekk = (x, y) => k.naust.some(n => Math.hypot(n.x - x, n.y - y) < n.L / 2 + 2.5);
    const sil = (a, steg) => { if (!a || !a.length) return a; const ut = []; for (let q = 0; q < a.length; q += steg) if (!vekk(a[q], a[q + 1])) for (let i = 0; i < steg; i++) ut.push(a[q + i]); return ut.length === a.length ? a : Array.isArray(a) ? ut : new Float32Array(ut); };
    if (k.naust.length) { if (u.trær) for (const n of Object.keys(u.trær)) u.trær[n] = sil(u.trær[n], 5); if (u.smått) { u.smått.stein = sil(u.smått.stein, 5); u.smått.busk = sil(u.smått.busk, 5); } }
    u.kyst = k;
  });

  // ---------- byggeklosser ----------
  const ny = () => ({ pos: [], kol: [] });
  function tri(G, a, b, c, k) { G.pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) G.kol.push(k[0], k[1], k[2]); }
  const kvad = (G, a, b, c, d, k) => { tri(G, a, b, c, k); tri(G, a, c, d, k); };
  // boks i en ramme (x, y, retning a): lengde fra l0 til l1 langs, bredde fra b0 til b1 på tvers, høyde z0–z1
  function boks(G, x, y, a, l0, l1, b0, b1, z0, z1, k, kTopp) {
    const c = Math.cos(a), s = Math.sin(a), P = (l, b, z) => [x + c * l - s * b, y + s * l + c * b, z];
    const n = [P(l0, b0, z0), P(l1, b0, z0), P(l1, b1, z0), P(l0, b1, z0)], o = [P(l0, b0, z1), P(l1, b0, z1), P(l1, b1, z1), P(l0, b1, z1)];
    kvad(G, o[0], o[1], o[2], o[3], kTopp || k); for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; kvad(G, n[i], n[j], o[j], o[i], k); }
  }
  // båtskroget i enhetsmål (lengde 1, bredde 1; baugen mot +x), vannlinja z = 0
  function skrog() {
    const G = ny(), dekk = [[-.5, .5, .55], [0, .5, .6], [.28, .4, .7], [.5, 0, .95], [.28, -.4, .7], [0, -.5, .6], [-.5, -.5, .55]];
    const bunn = [[-.48, .32, -.3], [0, .36, -.4], [.28, .2, -.3], [.47, 0, .1], [.28, -.2, -.3], [0, -.36, -.4], [-.48, -.32, -.3]];
    const hv = [1, 1, 1], mørk = [.35, .35, .35];
    for (let i = 0; i < 6; i++) kvad(G, bunn[i], bunn[i + 1], dekk[i + 1], dekk[i], hv);
    kvad(G, bunn[6], bunn[0], dekk[0], dekk[6], hv);
    // rekka (en litt mørkere stripe øverst) og bunnen
    for (let i = 0; i < 6; i++) { const a = dekk[i], b = dekk[i + 1]; kvad(G, [a[0], a[1], a[2] - .08], [b[0], b[1], b[2] - .08], [b[0], b[1], b[2] + .02], [a[0], a[1], a[2] + .02], mørk); }
    tri(G, bunn[1], bunn[0], bunn[6], mørk); tri(G, bunn[1], bunn[6], bunn[5], mørk); tri(G, bunn[1], bunn[5], bunn[2], mørk); tri(G, bunn[2], bunn[5], bunn[4], mørk); tri(G, bunn[2], bunn[4], bunn[3], mørk);
    return G;
  }
  function dekk() {
    const G = ny(), d = [[-.47, .45, .42], [0, .45, .45], [.26, .35, .5], [.44, 0, .6], [.26, -.35, .5], [0, -.45, .45], [-.47, -.45, .42]], m = [0, 0, .45];
    for (let i = 0; i < 6; i++) tri(G, m, d[i + 1], d[i], F.tre); tri(G, m, d[0], d[6], F.tre); return G;
  }
  function hus(kabin) {
    const G = ny();
    if (kabin) { boks(G, 0, 0, 0, -.05, .2, -.32, .32, .4, .95, F.hvit); boks(G, 0, 0, 0, .02, .16, -.28, .28, .95, 1.25, F.glass, F.hvit); }
    else { boks(G, 0, 0, 0, -.2, .05, -.3, .3, .4, 1.35, F.hvit); boks(G, 0, 0, 0, -.19, .04, -.29, .29, 1.35, 1.75, F.glass); boks(G, 0, 0, 0, -.23, .08, -.33, .33, 1.75, 1.88, F.hvit); }
    return G;
  }
  const geo = G => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.kol, 3)); g.computeVertexNormals(); return g; };

  // ---------- nettene ----------
  let mesh = [], båter = null;
  KROKER.sett3d.push((u, R) => {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } mesh = []; båter = null; R.kyst3d = mesh;
    const k = u.kyst; if (!k || (!k.båter.length && !k.naust.length && !k.brygger.length && !k.bøyer.length)) return;
    const mat = () => new THREE.MeshLambertMaterial({ vertexColors: true });
    // båtene: skrog (fargen per båt), dekk, styrehus (sjark) og kabin (motorbåt)
    if (k.båter.length) {
      const del = (G, liste, farget) => { const m = new THREE.InstancedMesh(geo(G), mat(), Math.max(1, liste.length)); m.count = liste.length;
        if (farget) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, liste.length) * 3), 3); liste.forEach((b, i) => m.setColorAt(i, new THREE.Color(...b.farge))); }
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.name = 'kyst3d'; R.scene.add(m); mesh.push(m); return { m, liste }; };
      båter = [del(skrog(), k.båter, true), del(dekk(), k.båter, false), del(hus(false), k.båter.filter(b => b.type === 'sjark'), false), del(hus(true), k.båter.filter(b => b.type === 'motorbåt'), false)];
      gyng(0);
    }
    // brygger, naust og bøyer: én geometri
    const G = ny();
    for (const b of k.brygger) {
      boks(G, b.x, b.y, b.a, 0, b.L, -b.B / 2, b.B / 2, b.z - .25, b.z + .3, F.ponton, F.tre);
      // landgangen fra land ned til brygga
      const c = Math.cos(b.a), s = Math.sin(b.a), lx = b.x - c * 4, ly = b.y - s * 4, zl = Math.max(b.z + .3, (hoyde3d(lx + u.cx, ly + u.cy, u) - u.h0) * R3.EX + .1);
      const P = (l, q, z) => [b.x + c * l - s * q, b.y + s * l + c * q, z]; kvad(G, P(-4, -.6, zl), P(.5, -.6, b.z + .32), P(.5, .6, b.z + .32), P(-4, .6, zl), F.tre);
      // fortøyningspullerter
      for (let l = 3; l < b.L; l += 6.5) for (const q of [-1, 1]) boks(G, b.x, b.y, b.a, l - .12, l + .12, q * b.B / 2 - .12 * q - .12, q * b.B / 2 - .12 * q + .12, b.z + .3, b.z + .6, F.ponton);
    }
    for (const n of k.naust) {
      const kol = F.naust[n.farge], h = 2.3, r = Math.min(2.2, n.B * .45), c = Math.cos(n.a), s = Math.sin(n.a), z0 = n.z - .4, zt = n.z + h + Math.max(0, 0);
      const P = (l, q, z) => [n.x + c * l - s * q, n.y + s * l + c * q, z], L = n.L / 2, B = n.B / 2;
      boks(G, n.x, n.y, n.a, -L, L, -B, B, z0, zt, kol);
      // gavlene (trekanter) og taket: mønet langs lengden, mot sjøen
      for (const l of [-L, L]) tri(G, P(l, -B, zt), P(l, B, zt), P(l, 0, zt + r), kol);
      kvad(G, P(-L - .3, -B - .35, zt - .25), P(L + .3, -B - .35, zt - .25), P(L + .3, 0, zt + r + .05), P(-L - .3, 0, zt + r + .05), F.tak);
      kvad(G, P(-L - .3, 0, zt + r + .05), P(L + .3, 0, zt + r + .05), P(L + .3, B + .35, zt - .25), P(-L - .3, B + .35, zt - .25), F.tak);
      // porten i gavlen mot sjøen
      kvad(G, P(L + .03, -B * .6, n.z), P(L + .03, B * .6, n.z), P(L + .03, B * .6, n.z + h * .85), P(L + .03, -B * .6, n.z + h * .85), F.dør);
    }
    for (const b of k.bøyer) { const kol = F.bøye[b.type];
      for (let i = 0; i < 6; i++) { const a0 = i / 6 * 6.283, a1 = (i + 1) / 6 * 6.283, p = (a, r, z) => [b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, z];
        kvad(G, p(a0, .55, b.z - .3), p(a1, .55, b.z - .3), p(a1, .55, b.z + .5), p(a0, .55, b.z + .5), kol); tri(G, p(a0, .55, b.z + .5), p(a1, .55, b.z + .5), [b.x, b.y, b.z + 1.6], kol); } }
    if (G.pos.length) { const m = new THREE.Mesh(geo(G), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.name = 'kyst3d'; R.scene.add(m); mesh.push(m); }
  });

  // ---------- båtene gynger (ute på sjøen mer enn ved kai) ----------
  const D = { o: null };
  function gyng(t) {
    if (!båter) return; const o = D.o || (D.o = new THREE.Object3D());
    for (const { m, liste } of båter) { for (let i = 0; i < liste.length; i++) { const b = liste[i], a = b.fri ? 1 : .35, f = t * (b.fri ? 1.1 : .8) + b.fase;
        o.position.set(b.x, b.y, b.z + Math.sin(f) * .12 * a); o.rotation.set(Math.sin(f * .9) * .05 * a, Math.sin(f * .7 + 1) * .03 * a, b.a, 'ZYX'); o.scale.set(b.L, b.B, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
      m.instanceMatrix.needsUpdate = true; }
  }
  let sist = 0;
  KROKER.ramme3d.push(R => { if (!båter) return; const t = performance.now() / 1000; if (t - sist < (tak() ? .1 : .05)) return; sist = t; gyng(t); });
  window.Kyst3d = { antall: () => { const k = typeof R3 !== 'undefined' && R3 && R3.ut && R3.ut.kyst; return k ? { båter: k.båter.length, brygger: k.brygger.length, naust: k.naust.length, bøyer: k.bøyer.length } : null; } };
})();
