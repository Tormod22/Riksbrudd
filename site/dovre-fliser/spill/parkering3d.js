'use strict';
// Parkeringsplassene i 3D (brukeren 21. nov: «smarte systemer for parkeringsplasser»). Reglene i spill/parkering.js (uten DOM).
// Fra hus-flisene (z13, lag «anlegg», a 6 = OpenStreetMap amenity=parking på bakken): hvite striper mellom plassene, kantstein rundt
// plassen og øyene, gress og trær på øyene, lyktestolper (u.lys – tennes om kvelden som gatelysene), innkjøring i asfalt mot nærmeste
// veg, handlevognskur ved butikkene og parkerte biler (u.hus.biler – samme bilmodell som ved husene), flere på dagtid ved butikker.
// Asfalten selv ligger i kartet i bakken (kartflis.js anlegg()). Billig: instanser, og bare plassene innen NÆR m fra midten av utsnittet.
// Kroker: KROKER.bygg3d (plan, biler, lykter, trær), KROKER.sett3d (stripene, kantstein, øyer, skur, innkjøring).
(function () {
  // Claudes forslag: bare plasser innen så mange meter fra midten, og tak på antall plasser per utsnitt (PC / mobil)
  const R_PARK = { NÆR: 900, TAK_PC: 3000, TAK_MOBIL: 1000, LØFT: .04 };
  const mobil = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  let mesh = [];
  const P3 = { planer: [], antall: () => ({ plasser: P3.planer.reduce((s, p) => s + p.pl.plasser.length, 0), biler: P3.planer.reduce((s, p) => s + p.pl.biler.length, 0), plassene: P3.planer.length }) };

  KROKER.bygg3d.push(async u => {
    u.parkering = null; P3.planer = [];
    if (u.S > 2200 || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.hus || typeof Parkering === 'undefined') return;
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), omr = [], butikker = [], sett = new Set();
    const fl = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('hus', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]));
    for (const [x, y, t] of await Promise.all(fl)) {
      if (!t) continue; const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096, lok = ([p, q]) => [minx + p * k - u.cx, maxy - q * k - u.cy];
      // butikkene (type 7 eller en kjede): midten av omrisset
      if (t.hus) for (const o of t.hus.obj) { if (!(o.e.t === 7 || o.e.k) || !o.deler[0]) continue; const d = o.deler[0]; let sx = 0, sy = 0; for (const p of d) { const [a, b] = lok(p); sx += a; sy += b; } butikker.push({ x: sx / d.length, y: sy / d.length, k: o.e.k || 0 }); }
      if (!t.anlegg) continue;
      for (const o of t.anlegg.obj) { if (o.e.a !== 6) continue;
        for (const d of o.deler) { if (d.length < 4) continue; const P = d.slice(0, -1).map(lok);
          let sx = 0, sy = 0; for (const p of P) { sx += p[0]; sy += p[1]; } sx /= P.length; sy /= P.length;
          // samme plass kan ligge i to fliser (klippet): én gang per midtpunkt (avrundet til 3 m)
          const n = Math.round(sx / 3) + ',' + Math.round(sy / 3); if (sett.has(n)) continue; sett.add(n);
          if (Math.hypot(sx, sy) > R_PARK.NÆR || Math.abs(sx) > u.S - 40 || Math.abs(sy) > u.S - 40) continue; omr.push({ P, sx, sy }); } }
    }
    if (!omr.length) return;
    omr.sort((a, b) => Math.hypot(a.sx, a.sy) - Math.hypot(b.sx, b.sy));
    const veger = (u.veger || []).filter(v => 'ERFK'.includes(v.k)).map(v => ({ P: v.P, w: v.w }));
    const time = typeof tid !== 'undefined' && typeof TIME !== 'undefined' ? (6 + tid / TIME) % 24 : 12, tak = mobil() ? R_PARK.TAK_MOBIL : R_PARK.TAK_PC;
    const biler = [], lys = [], trær = [], zf = (x, y) => typeof nettHoyde === 'function' ? nettHoyde(u, x, y) : (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX;
    let antall = 0;
    for (const { P, sx, sy } of omr) {
      if (børPuste()) await pust();
      // nærmeste butikk innen 120 m fra midten av plassen
      let bk = null, bd = 120; for (const b of butikker) { const d = Math.hypot(b.x - sx, b.y - sy); if (d < bd) { bd = d; bk = b; } }
      const vNær = veger.filter(v => v.P.some(p => Math.abs(p[0] - sx) < 160 && Math.abs(p[1] - sy) < 160));
      const pl = Parkering.plan(P, { veger: vNær, butikk: bk, fyll: Parkering.fyll(time, !!bk), frø: 1 });
      if (!pl.plasser.length && !pl.lykter.length) continue;
      antall += pl.plasser.length; if (antall > tak) break;
      P3.planer.push({ pl, P, butikk: bk });
      for (const b of pl.biler) biler.push(b.x, b.y, zf(b.x, b.y), b.ret, b.farge);
      for (const l of pl.lykter) lys.push(l.x, l.y, zf(l.x, l.y), l.ret);
      for (const t of pl.trær) trær.push(t.x, t.y, zf(t.x, t.y) + .12, 6.5 + t.s * 3, t.s);
    }
    // bilene i samme liste som bilene ved husene (småting 'bil' i sett3d), lyktene i gatelysene, trærne blant løvtrærne
    if (u.hus && biler.length) { const g = u.hus.biler || new Float32Array(0), a = new Float32Array(g.length + biler.length); a.set(g); a.set(biler, g.length); u.hus.biler = a; }
    if (lys.length) { const g = u.lys || new Float32Array(0), a = new Float32Array(g.length + lys.length); a.set(g); a.set(lys, g.length); u.lys = a; }
    if (trær.length && u.trær) { const g = u.trær.løv || new Float32Array(0), a = new Float32Array(g.length + trær.length); a.set(g); a.set(trær, g.length); u.trær.løv = a; }
    // det sett3d trenger (små tall: striper, kanter, skur – ikke omrissene)
    const striper = [], kant = [], øyer = [], kur = [], inn = [];
    const kantBit = (a, b, h, w) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 5));
      for (let i = 0; i < n; i++) { const p = [a[0] + (b[0] - a[0]) * (i + .5) / n, a[1] + (b[1] - a[1]) * (i + .5) / n]; kant.push(p[0], p[1], zf(p[0], p[1]), Math.atan2(b[1] - a[1], b[0] - a[0]), L / n, h, w); } };
    for (const { pl, P } of P3.planer) {
      for (const [ax, ay, bx, by] of pl.linjer) { const mx = (ax + bx) / 2, my = (ay + by) / 2; striper.push(mx, my, Math.max(zf(ax, ay), zf(bx, by), zf(mx, my)) + R_PARK.LØFT, Math.atan2(by - ay, bx - ax), Math.hypot(bx - ax, by - ay)); }
      // kantstein langs omrisset, unntatt der innkjøringen er
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length];
        if (pl.inn) { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = ((pl.inn.x - a[0]) * dx + (pl.inn.y - a[1]) * dy) / l2, d = Math.hypot(a[0] + dx * t - pl.inn.x, a[1] + dy * t - pl.inn.y);
          if (d < .5 && t > 0 && t < 1) { const L = Math.sqrt(l2), h = pl.inn.bredde / 2 / L; if (t - h > 0) kantBit(a, [a[0] + dx * (t - h), a[1] + dy * (t - h)], .12, .15); if (t + h < 1) kantBit([a[0] + dx * (t + h), a[1] + dy * (t + h)], b, .12, .15); continue; } }
        kantBit(a, b, .12, .15); }
      for (const ø of pl.øyer) { const mx = (ø.a[0] + ø.c[0]) / 2, my = (ø.a[1] + ø.c[1]) / 2; øyer.push(mx, my, zf(mx, my), Math.atan2(ø.b[1] - ø.a[1], ø.b[0] - ø.a[0]), ø.u1 - ø.u0, ø.v1 - ø.v0);
        for (const [a, b] of [[ø.a, ø.b], [ø.b, ø.c], [ø.c, ø.d], [ø.d, ø.a]]) kantBit(a, b, .15, .18); }
      for (const k of pl.kur) kur.push(k.x, k.y, zf(k.x, k.y), k.ret);
      if (pl.inn) inn.push([pl.inn.x, pl.inn.y, zf(pl.inn.x, pl.inn.y), pl.inn.tx, pl.inn.ty, zf(pl.inn.tx, pl.inn.ty), pl.inn.bredde]);
    }
    u.parkering = { striper: new Float32Array(striper), kant: new Float32Array(kant), øyer: new Float32Array(øyer), kur: new Float32Array(kur), inn };
  });

  function instans(R, geo, mat, data, per, sett) {
    const n = data.length / per; if (!n) { geo.dispose(); mat.dispose(); return; }
    const m = new THREE.InstancedMesh(geo, mat, n), d = new THREE.Object3D();
    for (let k = 0; k < n; k++) { sett(d, data, k * per); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }
    m.frustumCulled = false; R.scene.add(m); mesh.push(m); return m;
  }
  const boks = (x, y, z, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); return g; };
  KROKER.sett3d.push((u, R) => {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } mesh = [];
    const A = u.parkering; if (!A) return;
    // stripene: hvite, 12 cm brede, flate (litt over asfalten; polygonOffset så de ikke flimrer mot bakken)
    const sg = new THREE.PlaneGeometry(1, .12), hvit = new THREE.MeshLambertMaterial({ color: 0xe8e6de, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    instans(R, sg, hvit, A.striper, 5, (d, D, q) => { d.position.set(D[q], D[q + 1], D[q + 2]); d.rotation.set(0, 0, D[q + 3]); d.scale.set(D[q + 4], 1, 1); });
    // kantstein i lys betong/granitt: litt ned i bakken så den aldri svever
    const kg = new THREE.BoxGeometry(1, 1, 1); kg.translate(0, 0, .5);
    instans(R, kg, new THREE.MeshLambertMaterial({ color: 0xa9a7a0 }), A.kant, 7, (d, D, q) => { d.position.set(D[q], D[q + 1], D[q + 2] - .08); d.rotation.set(0, 0, D[q + 3]); d.scale.set(D[q + 4] + .02, D[q + 6], D[q + 5] + .08); });
    // øyene: gress med jord, 15 cm opp
    const øg = new THREE.BoxGeometry(1, 1, 1); øg.translate(0, 0, .5);
    instans(R, øg, new THREE.MeshLambertMaterial({ color: 0x5f7a3c }), A.øyer, 6, (d, D, q) => { d.position.set(D[q], D[q + 1], D[q + 2] - .1); d.rotation.set(0, 0, D[q + 3]); d.scale.set(D[q + 4] - .3, D[q + 5] - .3, .24); });
    // handlevognskur: stålramme, tak og glassvegger bak og på sidene (4,8 × 2,2 m), med en rad vogner inni
    const ramme = samle([boks(-2.4, -1.1, 0, .08, .08, 2.2), boks(2.4, -1.1, 0, .08, .08, 2.2), boks(-2.4, 1.1, 0, .08, .08, 2.2), boks(2.4, 1.1, 0, .08, .08, 2.2), boks(0, 0, 2.2, 5, 2.5, .1)]);
    instans(R, ramme, new THREE.MeshLambertMaterial({ color: 0x5b6066 }), A.kur, 4, (d, D, q) => { d.position.set(D[q], D[q + 1], D[q + 2]); d.rotation.set(0, 0, D[q + 3]); d.scale.set(1, 1, 1); });
    instans(R, samle([boks(0, 1.1, .2, 4.8, .03, 1.9), boks(-2.4, 0, .2, .03, 2.2, 1.9), boks(2.4, 0, .2, .03, 2.2, 1.9)]), new THREE.MeshLambertMaterial({ color: 0xb8d0d8, transparent: true, opacity: .35, depthWrite: false }), A.kur, 4, (d, D, q) => { d.position.set(D[q], D[q + 1], D[q + 2]); d.rotation.set(0, 0, D[q + 3]); });
    const vogner = []; for (let i = 0; i < 6; i++) vogner.push(boks(-1.6 + i * .55, 0, .35, .5, 1, .55));
    instans(R, samle(vogner), new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }), A.kur, 4, (d, D, q) => { d.position.set(D[q], D[q + 1], D[q + 2]); d.rotation.set(0, 0, D[q + 3]); });
    // innkjøringene: asfalt fra kanten av plassen til vegen (et bånd som følger terrenget i begge ender)
    if (A.inn.length) { const pos = [], idx = [];
      for (const [ax, ay, az, bx, by, bz, w] of A.inn) { const L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L * w / 2, ny = (bx - ax) / L * w / 2, o = pos.length / 3;
        pos.push(ax + nx, ay + ny, az + .03, ax - nx, ay - ny, az + .03, bx + nx, by + ny, bz + .03, bx - nx, by - ny, bz + .03); idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x46453f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.frustumCulled = false; R.scene.add(m); mesh.push(m); }
  });

  // Ledig plass nærmest et punkt i kartet (X, Y i kartets meter): { X, Y, retning } eller null. Kjøretøyene i spillet kan parkere der.
  P3.ledig = (X, Y) => { if (typeof R3 === 'undefined' || !R3.ut) return null; const u = R3.ut; let b = null, bd = Infinity;
    for (const { pl } of P3.planer) { const p = Parkering.ledig(pl, X - u.cx, Y - u.cy); if (p) { const d = Math.hypot(p.x - X + u.cx, p.y - Y + u.cy); if (d < bd) { bd = d; b = p; } } }
    if (!b) return null; b.opptatt = true; return { X: b.x + u.cx, Y: b.y + u.cy, retning: b.ret }; };
  P3.REGLER = R_PARK;
  window.Parkering3d = P3;
})();
