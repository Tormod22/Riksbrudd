'use strict';
// Liv i 3D (nær kameraet, utsnitt S ≤ 2200): ekte veger med asfalt og oppmerking, fortau med kantstein i tettstedene,
// biltrafikk, folk som går på fortauene, fugler, røyk fra pipene og vind i trærne.
// Kroker i index.html: KROKER.bygg3d (henter vegene), KROKER.sett3d (lager nettene), KROKER.ramme3d (beveger alt hver ramme).
(function () {
  const BREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 }, LØFT = { E: .16, R: .15, F: .14, K: .13, P: .12, S: .11 };
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let liv = null, sist = 0;

  // ---------- vegene fra vektorflisene (z13, ca. 2 m) ----------
  // Reglene ligger i spill/veg.js (uten DOM): vegene klippes til flisen og skjøtes til hele veger, gang- og sykkelvegene skilles ut
  // (u.gangveger), biter i tunnel tas bort, og vegbanen legges flatt på tvers i høyden til det høyeste punktet under den.
  // u.veger er bilvegene: kategori k, vegtype t (1 svingefelt, 2 rampe, 3 rundkjøring), by, halv bredde w, punktene P med høyde og
  // «åpen» (enden står i en tunnelportal eller ved kanten av utsnittet). Punkter på en bru får et fjerde tall (spill/infra3d.js).
  const tunnelLinjer = u => { const ut = []; if (!u.infra) return ut;
    for (const o of u.infra) if (o.lag === 'tunnel') for (const d of o.deler) { const P = []; for (let i = 0; i < d.length; i += 2) P.push([d[i] - u.cx, d[i + 1] - u.cy]); if (P.length > 1) ut.push(Veg.tunnel(P)); }
    return ut; };
  KROKER.bygg3d.push(async u => {
    if (u.S > 2200 || !VIS.veg) return;
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), rå = [];
    const fl = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('vektor', z, x, y).then(t => [x, y, t]));
    const byer = INFRA && INFRA.tettsted && window.Garnison ? INFRA.tettsted.filter(t => t.bb[2] > u.cx - u.S && t.bb[0] < u.cx + u.S && t.bb[3] > u.cy - u.S && t.bb[1] < u.cy + u.S) : [];
    for (const [x, y, t] of await Promise.all(fl)) {
      if (!t || !t.veg) continue; const mx = G.x0 + x * sp - u.cx, my = G.y0 - y * sp - u.cy, e = t.veg.ext;
      for (const o of t.veg.obj) { const k = o.e.k; if (!BREDDE[k] || o.e.t === 4) continue;
        for (const d of o.deler) for (const P of Veg.klipp(d.map(([a, b]) => [mx + a / e * sp, my - b / e * sp]), mx, my - sp, mx + sp, my)) rå.push({ k, g: o.e.g ? 1 : 0, t: o.e.t || 0, P });
      }
    }
    // hele veger med jevne kurver og punkt hver ~2,5 m; eldre fliser uten vegtype: gjett gang- og sykkelveger og svingefelt
    const hele = Veg.skjøt(rå).map(v => ({ ...v, P: Veg.jevn(v.P) }));
    u.vegtype = rå.some(v => v.g || v.t); if (!u.vegtype) Veg.gjett(hele); else Veg.kanal(hele);
    // rundkjøringene (midtpunkt, radius, halv bredde) – kantstein rundt midtøya og vikelinjer lages i lagVeger
    u.rundt = Veg.rundkjøringer(hele).map(r => ({ x: r.x, y: r.y, r: r.r, w: r.w, k: r.k }));
    const tun = VIS.infra ? tunnelLinjer(u) : [], iBy = (x, y) => byer.some(b => Garnison.inni(b, x + u.cx, y + u.cy)), zf = (x, y) => nettHoyde(u, x, y);
    const veger = [], gang = [];
    for (const v of hele) { const w = Veg.halv(v);
      for (const T of Veg.utenTunnel(v.P, tun)) {
        // klipp ved kanten av utsnittet (utenfor finnes ikke terreng), del opp i biter som ligger inne
        const biter = []; let bit = [], fra = 0;
        T.P.forEach((p, i) => { if (Math.abs(p[0]) < u.S - 4 && Math.abs(p[1]) < u.S - 4) { if (!bit.length) fra = i; bit.push(p); } else { if (bit.length > 1) biter.push([bit, fra]); bit = []; } });
        if (bit.length > 1) biter.push([bit, fra]);
        for (const [B, i0] of biter) {
          // i tettsted eller ikke (prøves hver 10. m); et skifte kortere enn 25 m teller ikke
          const by = B.map((p, i) => i % 4 ? null : iBy(p[0], p[1])); for (let i = 0; i < by.length; i++) if (by[i] === null) by[i] = by[i - (i % 4)];
          for (let i = 0; i < by.length;) { let j = i; while (j < by.length && by[j] === by[i]) j++; if (j - i < 10 && i > 0) by.fill(by[i - 1], i, j); i = j; }
          const h = Veg.høyder(B, w, zf);
          for (let i = 0; i < B.length;) { let j = i; while (j < B.length && by[j] === by[i]) j++; const til = Math.min(B.length, j + 1);
            if (til - i > 1) (v.g ? gang : veger).push({ k: v.k, g: v.g, t: v.t, by: !!by[i], w, P: B.slice(i, til).map(([a, b], q) => [a, b, h[i + q] + LØFT[v.k]]),
              åpen: [i === 0 && (i0 > 0 || T.kutt[0]), til === B.length && (i0 + B.length < T.P.length || T.kutt[1])] });
            i = j; }
        }
      }
    }
    u.veger = veger; u.gangveger = gang;
    const alle = veger.concat(gang);
    // vegmaske (1024 × 1024): ingen stein, busker, trær eller gress i vegbanen og på fortauet
    const W = 1024, m = new Uint8Array(W * W), celle = 2 * u.S / W;
    // 1 = grus (P/S), 2 = asfalt/fortau (E/R/F/K og gang- og sykkelveger) – lyd.js lar fottrinnene knase på grus
    for (const v of alle) { const r = v.w + (v.by && Veg.vanlig(v) ? 2.6 : v.t === 3 ? 2 : .8), rc = Math.ceil(r / celle), kode = v.g || 'ERFK'.includes(v.k) ? 2 : 1;
      for (let i = 1; i < v.P.length; i++) { const [ax, ay] = v.P[i - 1], [bx, by] = v.P[i], l = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(l / celle));
        for (let s2 = 0; s2 <= n; s2++) { const x = ax + (bx - ax) * s2 / n, y = ay + (by - ay) * s2 / n, ci = Math.floor((x + u.S) / celle), cj = Math.floor((u.S - y) / celle);
          for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const a2 = ci + di, b2 = cj + dj; if (a2 < 0 || b2 < 0 || a2 >= W || b2 >= W || (di * di + dj * dj) * celle * celle > r * r) continue; if (m[b2 * W + a2] < kode) m[b2 * W + a2] = kode; } } } }
    const påVeg = (x, y) => { const i = Math.floor((x + u.S) / celle), j = Math.floor((u.S - y) / celle); return i >= 0 && j >= 0 && i < W && j < W && m[j * W + i] > 0; };
    u.påVeg = påVeg;
    u.vegType = (x, y) => { const i = Math.floor((x + u.S) / celle), j = Math.floor((u.S - y) / celle); return i >= 0 && j >= 0 && i < W && j < W && m[j * W + i] === 2 ? 'asfalt' : 'grus'; };
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) if (!påVeg(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.smått) { u.smått.stein = sil(u.smått.stein); u.smått.busk = sil(u.smått.busk); }
    if (u.trær) for (const k in u.trær) u.trær[k] = sil(u.trær[k]);
    if (u.bunn) { const B = u.bunn; for (let j = 0; j < B.W; j++) for (let i = 0; i < B.W; i++) { const x = -u.S + (i + .5) / B.W * 2 * u.S, y = u.S - (j + .5) / B.W * 2 * u.S; if (påVeg(x, y)) B.gress[j * B.W + i] = 0; } }
    // gatelysene følger de ferdige vegene: aldri i en vegbane, på en gangveg, i et kryss, i et hus eller i vann
    u.lys = null;
    if (byer.length) { const ru = Veg.rute(alle), nr = new Map(alle.map((v, i) => [v, i])), vann = window.Infra3d && Infra3d.iVann;
      const L = Veg.lykter(veger, { ru, nr: v => nr.get(v), kryss: Veg.finnKryss(veger), ok: (x, y) => !(u.hus && u.hus.omriss && nærHus(u, x, y)) && !(vann && vann(u, x, y)) }), ut = [];
      for (let q = 0; q < L.length; q += 3) ut.push(L[q], L[q + 1], zf(L[q], L[q + 1]), L[q + 2]);
      if (ut.length) u.lys = new Float32Array(ut); }
  });

  // ---------- teksturer ----------
  const tekst = {};
  function vegTekstur(type) {
    if (tekst[type]) return tekst[type];
    const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d'), im = g.createImageData(128, 512); let f = 7 + type.length;
    const rnd = () => (f = (f * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, grus = type === 'grus' || type === 'grusflate', fortau = type === 'fortau';
    for (let q = 0; q < 128 * 512; q++) { const n = rnd(), base = type === 'skulder' ? [128, 118, 100] : grus ? [118, 104, 82] : fortau ? [150, 148, 142] : type === 'gs' ? [78, 70, 68] : type === 'fylling' ? [86, 88, 62] : [62, 63, 65], v = (n - .5) * (grus || type === 'skulder' ? 46 : 18);
      im.data[q * 4] = base[0] + v; im.data[q * 4 + 1] = base[1] + v; im.data[q * 4 + 2] = base[2] + v; im.data[q * 4 + 3] = 255; }
    // dobbel oppløsning (128 × 512); tegningen under er i de gamle enhetene (64 × 256)
    g.putImageData(im, 0, 0); g.scale(2, 2);
    if (type === 'asfalt') { g.fillStyle = '#e8e6df'; g.fillRect(3, 0, 3, 256); g.fillRect(58, 0, 3, 256); g.fillStyle = '#d9b43a'; g.fillRect(30, 0, 4, 64); }   // kantlinjer + gul midtlinje 3 m av 12
    if (type === 'rampe') { g.fillStyle = '#e8e6df'; g.fillRect(3, 0, 3, 256); g.fillRect(58, 0, 3, 256); }   // rampe: bare kantlinjer
    if (type === 'kommunal') { g.fillStyle = 'rgba(40,40,42,.5)'; g.fillRect(14, 0, 8, 256); g.fillRect(42, 0, 8, 256); }   // hjulspor
    if (fortau) { g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 64, 2); g.fillStyle = '#bdbab2'; g.fillRect(0, 0, 6, 256); }   // fuger + kantstein
    // småstein med skygge, så grusen ser skarp ut nær (brukeren 12. nov: «bakken ser blurry ut på nært hold»)
    // (12. nov: steinene var 8–28 cm og så ut som brostein; nå mest 1–4 cm grus med noen få større, lavere kontrast)
    if (grus || type === 'skulder') for (let k = 0; k < 5200; k++) { const x = rnd() * 64, y = rnd() * 256, stor = rnd() < .04, r = stor ? .6 + rnd() * .5 : .18 + rnd() * .38, l = 92 + rnd() * 70;
      g.fillStyle = 'rgba(40,34,26,.35)'; g.beginPath(); g.ellipse(x + .25, y + .35, r, r * .75, 0, 0, 6.283); g.fill();
      g.fillStyle = `rgb(${l + 8},${l + 1},${l - 10})`; g.beginPath(); g.ellipse(x, y, r, r * (.55 + rnd() * .35), rnd() * 3, 0, 6.283); g.fill(); }
    if (type === 'grus') { g.fillStyle = 'rgba(70,90,40,.35)'; g.fillRect(28, 0, 8, 256); }   // gress i midten
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
  // Kanten utenfor vegbanen: fra a meter fra midtlinjen (i vegens høyde + løft) og «bredde» meter ut. Der bakken ligger lavere enn
  // vegen (fylling i en skråning), går kanten skrått ned til bakken (1 : 1,5), så vegen ikke svever. bareFall: bare der den svever.
  // Skulderen (flat) legges i «ut»; fyllingen (skråningen) i «fyll» med jord- og gressfarge – før var hele kilen lys grus og sto
  // som brune flak ved gangvegene og rundkjøringen (14. nov).
  function kant(P, sd, a, bredde, løft, ut, zf, bareFall, fyll) {
    let L = 0, forrige = -1, forrigeF = -1; const F = fyll || ut;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * sd, ny = dx / l * sd;
      if (i) L += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
      const zi = p[2] + løft, x0 = p[0] + nx * (a + bredde), y0 = p[1] + ny * (a + bredde), fall = p[3] ? 0 : zi - zf(x0, y0);
      if (bredde > 0 && !bareFall) { const n0 = ut.pos.length / 3; ut.pos.push(p[0] + nx * a, p[1] + ny * a, zi, x0, y0, zi); ut.uv.push(0, L / 12, 1, L / 12);
        if (forrige >= 0) ut.idx.push(forrige, n0, forrige + 1, forrige + 1, n0, n0 + 1); forrige = n0; }
      if (fall > (bareFall ? .25 : .12)) { const e = Math.min(6, fall * 1.5), x1 = x0 + nx * e, y1 = y0 + ny * e, z1 = Math.min(zi, zf(x1, y1) + .02), n0 = F.pos.length / 3;
        F.pos.push(x0, y0, zi, x1, y1, z1); F.uv.push(0, L / 12, 1, L / 12); if (forrigeF >= 0) F.idx.push(forrigeF, n0, forrigeF + 1, forrigeF + 1, n0, n0 + 1); forrigeF = n0; }
      else forrigeF = -1;
    }
  }
  const tom = () => ({ pos: [], uv: [], idx: [] });
  function lagVeger(u, R) {
    const grupper = { fylling: tom(), skulder: tom(), gs: tom(), grus: tom(), kommunal: tom(), asfalt: tom(), rampe: tom(), kryss: tom(), fortau: tom() };
    const gang = u.gangveger || [], alle = u.veger.concat(gang), ru = Veg.rute(alle), zf = (x, y) => nettHoyde(u, x, y);
    const kryss = Veg.finnKryss(u.veger); u.kryss = kryss; u.vegRute = { ru, alle };
    u.veger.forEach((v, li) => {
      // ramper, svingefelt og ringen i en rundkjøring: asfalt med hvite kantlinjer, uten midtlinje
      const w = v.w, type = v.t ? 'rampe' : 'ERF'.includes(v.k) ? 'asfalt' : v.k === 'K' ? 'kommunal' : 'grus';
      // rette strekk i jevn stigning trenger ikke et punkt hver 2,5 m (Veg.tynn): vegene var 142 000 av 640 000 trekanter ved Dombås
      bånd(Veg.tynn(v.P), -w, w, 0, grupper[type], false);
      if (!Veg.vanlig(v) || !'ERFK'.includes(v.k)) { for (const sd of [1, -1]) kant(v.P, sd, w, 0, -.02, grupper.skulder, zf, true, grupper.fylling); return; }
      if (v.by && 'RFK'.includes(v.k)) for (const sd of [1, -1]) {
        // fortauet stopper ved kryssene og der det ville ligget på en annen veg eller gang- og sykkelveg; korte rester (under 6 m) droppes
        const biter = []; let b = [];
        v.P.forEach((p, i) => { const q = v.P[Math.min(v.P.length - 1, i + 1)], o = v.P[Math.max(0, i - 1)], l = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1, x = p[0] - (q[1] - o[1]) / l * sd * (w + 1), y = p[1] + (q[0] - o[0]) / l * sd * (w + 1);
          if (kryss.nær(p[0], p[1], 2.2) || ru.klaring(x, y, li, 10) < 1.1) { if (b.length > 1) biter.push(b); b = []; } else b.push(p); });
        if (b.length > 1) biter.push(b);
        for (const B of biter) { if (Veg.lengde(B) < 6) continue; bånd(Veg.tynn(B), sd * w, sd * (w + 2), .15, grupper.fortau, true); kant(B, sd, w + 2, 0, .13, grupper.skulder, zf, true, grupper.fylling); }
      } else { const Pt = Veg.tynn(v.P, .06, .05, 7.5); for (const sd of [1, -1]) kant(Pt, sd, w, .8, -.04, grupper.skulder, zf, false, grupper.fylling); }
    });
    // gang- og sykkelvegene: smal asfalt uten oppmerking (gangfeltene, t = 5, er striper og ikke asfalt)
    for (const v of gang) if (v.t !== 5) { bånd(Veg.tynn(v.P), -v.w, v.w, 0, grupper.gs, false); for (const sd of [1, -1]) kant(v.P, sd, v.w, 0, -.02, grupper.skulder, zf, true, grupper.fylling); }
    // rundkjøringene: en brolagt kant med kantstein rundt midtøya (høyden følger ringens vegbane)
    for (const rk of u.rundt || []) { const ri = rk.r - rk.w, ap = Math.max(.8, Math.min(1.6, ri * .25)); if (ri < 3 || Math.abs(rk.x) > u.S - 30 || Math.abs(rk.y) > u.S - 30) continue;
      const ringP = []; for (const v of u.veger) if (v.t === 3) for (const p of v.P) if (Math.abs(Math.hypot(p[0] - rk.x, p[1] - rk.y) - rk.r) < 3) ringP.push(p);
      if (ringP.length < 6) continue;
      const n = Math.max(16, Math.round(2 * Math.PI * ri / 1.5)), C = [];
      for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI, x = rk.x + Math.cos(a) * ri, y = rk.y + Math.sin(a) * ri; let best = ringP[0], bd = Infinity;
        for (const p of ringP) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = p; } } C.push([x, y, best[2]]); }
      bånd(C, 0, ap, .12, grupper.fortau, true); }
    vegutstyr(u, R, kryss, ru);
    // rekkefølgen når flater ligger oppå hverandre: skulder nederst, så gangveg, grus, kommunal veg, asfalt, svingefelt og fortau øverst
    const OFF = { fylling: -1.5, skulder: -2, gs: -3, grus: -3.5, kommunal: -4, asfalt: -5, rampe: -5, kryss: -6, fortau: -7 };
    for (const [type, ut] of Object.entries(grupper)) { const m = nett(ut, type, OFF[type]); if (m) { R.scene.add(m); liv.mesh.push(m); } }
    // kryssene: asfalt uten oppmerking langs hver arm (grusveger møtes på grus), og fotgjengerfeltene som hvite striper
    const flate = tom(), grusflate = tom(), felt = { pos: [], idx: [] };
    for (const n of kryss) Veg.kryssFlate(n, u.veger, n.armer.some(a => 'ERFK'.includes(a.k)) ? flate : grusflate);
    for (const [ut, type] of [[flate, 'kryss'], [grusflate, 'grusflate']]) { const m = nett(ut, type, -10); if (m) { R.scene.add(m); liv.mesh.push(m); } }
    // gangfeltene fra NVDB (t = 5): stripene der gangfeltet ligger i en vegbane. Uten vegtype i dataene: felt ved kryssene i tettstedene.
    u.gangfelt = [];
    if (u.vegtype) { for (const v of gang) { if (v.t !== 5) continue;
        const bil = li => li < u.veger.length, inne = v.P.map(p => { const b = ru.nærmest(p[0], p[1], 5, bil); return !!b && b.d < alle[b.li].w; });
        for (let i = 0; i < inne.length;) { if (!inne[i]) { i++; continue; } let j = i; while (j + 1 < inne.length && inne[j + 1]) j++;
          const a = v.P[i], b = v.P[j], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (l > 2) { Veg.striper(a[0], a[1], (b[0] - a[0]) / l, (b[1] - a[1]) / l, l, 3, Math.max(a[2], b[2]) + .05, felt); u.gangfelt.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }); }
          i = j + 1; } } }
    else for (const f of Veg.gangfelt(kryss)) { Veg.striper(f.x + f.dy * f.w, f.y - f.dx * f.w, -f.dy, f.dx, 2 * f.w, 3, f.z + .05, felt); u.gangfelt.push({ x: f.x, y: f.y }); }
    // vikelinjer: der en veg går inn i en rundkjøring, en rad hvite merker tvers over innkjøringsfeltet (ikke over utkjøringen)
    for (const n of kryss) { if (!n.armer.some(a => a.t === 3)) continue;
      let rk = null, rd = Infinity; for (const r of u.rundt || []) { const d = Math.hypot(r.x - n.x, r.y - n.y); if (d < rd) { rd = d; rk = r; } }
      if (!rk || rd > rk.r + 8) continue;
      // (tx, ty): kjøreretningen i ringen (mot klokka) der armen møter den
      const tx = -(n.y - rk.y) / (rd || 1), ty = (n.x - rk.x) / (rd || 1);
      for (const a of n.armer) { if (a.t === 3 || !'ERFK'.includes(a.k)) continue; const med = a.dx * tx + a.dy * ty; if (med > .25) continue;
        // enveis innkjøring: hele bredden; tovegs arm: halvdelen til venstre sett utover (de som kjører inn mot ringen)
        const hel = med < -.25, lx = -a.dy, ly = a.dx, fra = hel ? -a.w + .15 : .1, lang = (hel ? 2 * a.w : a.w) - (hel ? .3 : .2), x0 = a.x + lx * fra, y0 = a.y + ly * fra, z = a.z + .05;
        // merker på 0,5 × 0,6 m med 0,25 m mellomrom
        for (let m = 0; m + .5 <= lang + 1e-6; m += .75) { const n0 = felt.pos.length / 3;
          for (const [q, h] of [[m, -.3], [m + .5, -.3], [m + .5, .3], [m, .3]]) felt.pos.push(x0 + lx * q + a.dx * h, y0 + ly * q + a.dy * h, z);
          felt.idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3); } } }
    if (felt.idx.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(felt.pos, 3)); g.setIndex(felt.idx); g.computeVertexNormals();
      const mg = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xecebe5, polygonOffset: true, polygonOffsetFactor: -12, polygonOffsetUnits: -12, side: THREE.DoubleSide }));
      R.scene.add(mg); liv.mesh.push(mg); }
  }

  // Rekkverk langs E- og R-veg og brøytestikker (oransje topp) hver 25. meter langs de vanlige vegene utenfor tettstedene.
  // Ingenting i kryssene eller der det ville stått i en annen vegbane eller på en gang- og sykkelveg (klaring under 0,4 m).
  function vegutstyr(u, R, kryss, ru) {
    const stolper = [], stikker = [], skinne = tom();
    u.veger.forEach((v, li) => {
      if (v.by || !Veg.vanlig(v) || !'ERFK'.includes(v.k)) return; const w = v.w, fri = (x, y) => ru.klaring(x, y, li, 8) > .4;
      let L = 0, nesteStikk = 12, nesteStolpe = 0, bit = [];
      const slutt = () => { if (bit.length > 1) bånd(bit, w + .85, w + .85, 0, skinne, false); bit = []; };
      for (let i = 1; i < v.P.length; i++) {
        const a = v.P[i - 1], b = v.P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!l) continue; const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, ret = Math.atan2(b[1] - a[1], b[0] - a[0]);
        for (; nesteStikk < L + l; nesteStikk += 25) { const f = (nesteStikk - L) / l, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f;
          if (kryss.nær(x, y, 2)) continue;
          for (const sd of [-1, 1]) if (fri(x + nx * sd * (w + 1.1), y + ny * sd * (w + 1.1))) stikker.push(x + nx * sd * (w + 1.1), y + ny * sd * (w + 1.1), z - .1, ret); }
        if ('ER'.includes(v.k)) { for (; nesteStolpe < L + l; nesteStolpe += 4) { const f = (nesteStolpe - L) / l, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f;
            if (kryss.nær(x, y, 3) || !fri(x + nx * (w + .9), y + ny * (w + .9))) continue;
            stolper.push(x + nx * (w + .9), y + ny * (w + .9), z - .1, ret); }
          // skinnen: der stolpene står
          if (kryss.nær(a[0], a[1], 3) || !fri(a[0] + nx * (w + .9), a[1] + ny * (w + .9))) slutt(); else bit.push([a[0], a[1], a[2] + .45]); }
        L += l;
      }
      slutt();
    });
    // skinnen: en loddrett stripe (0,3 m høy) langs høyre side
    if (skinne.pos.length) { for (let k = 0; k < skinne.pos.length; k += 6) skinne.pos[k + 5] -= .3; const m = nett(skinne, 'fortau', -1); m.material.color.setRGB(.75, .77, .8); R.scene.add(m); liv.mesh.push(m); }
    // stolpene og brøytestikkene ligger i ruter (ruteNett i index.html): bare rutene i synsfeltet og nærmere enn 380 m tegnes
    const lag = (data, deler) => { const n = data.length / 4; if (!n) return; for (const [g, farge] of deler) {
      const gr = ruteNett(R, n, (k, o) => { o.position.set(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]); o.rotation.set(0, 0, data[k * 4 + 3]); }, g, new THREE.MeshLambertMaterial({ color: farge }), { celle: 160, maks: 380 });
      liv.mesh.push(...gr.mesh); } };
    lag(stolper, [[kasse(0, 0, 0, .1, .1, .75), 0x8a8d90]]);
    lag(stikker, [[kasse(0, 0, 0, .05, .05, 1.6), 0x2a2a2a], [kasse(0, 0, 1.6, .055, .055, .35), 0xe8641c]]);
  }

  // ---------- trafikk og folk ----------
  function velgLinjer(u, krav, liste) { return (liste || u.veger).filter(krav).map(v => { const D = [0]; for (let i = 1; i < v.P.length; i++) D.push(D[i - 1] + Math.hypot(v.P[i][0] - v.P[i - 1][0], v.P[i][1] - v.P[i - 1][1])); return { ...v, D, L: D[D.length - 1] }; }).filter(v => v.L > 80); }
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
    const veg = velgLinjer(u, v => 'ERFK'.includes(v.k) && Veg.vanlig(v));
    // ender i en tunnelportal eller ved kanten av utsnittet: bilen kommer inn igjen et annet slikt sted i stedet for å snu
    liv.åpne = []; for (const v of veg) for (const e of [0, 1]) if (v.åpen && v.åpen[e]) liv.åpne.push([v, e]);
    if (veg.length) {
      const hjul = []; for (const [x, y] of [[1.35, .82], [1.35, -.82], [-1.35, .82], [-1.35, -.82]]) { const g = new THREE.CylinderGeometry(.33, .33, .22, 10); g.translate(x, y, .33); hjul.push(g); }
      liv.bilMesh = instanser(R, [[samle([kasse(0, 0, .3, 4.4, 1.78, .62), kasse(-.25, 0, 1.45, 2.2, 1.6, .08), kasse(1.55, 0, .88, 1.2, 1.7, .12)])], [kasse(-.25, 0, .9, 2.3, 1.66, .55), 0x1f262e], [samle(hjul), 0x101010]], mob ? 12 : 32);
      liv.biler = Array.from({ length: mob ? 12 : 32 }, () => { const v = veg[Math.floor(rnd() * veg.length)]; return { v, s: rnd() * v.L, dir: rnd() < .5 ? 1 : -1, fart: (v.k === 'K' ? 8 : 13) + rnd() * 5, farge: BILFARGER[Math.floor(rnd() * BILFARGER.length)] }; });
      liv.biler.forEach((b, k) => { liv.bilMesh[0].setColorAt(k, new THREE.Color(...b.farge)); });
      // frontlys og baklys (lyser om kvelden, spill/natt3d.js gir mørket) og lyskjegler på vegen foran bilen
      const n = liv.biler.length, front = samle([kasse(2.21, .6, .5, .05, .32, .13), kasse(2.21, -.6, .5, .05, .32, .13)]), bak = samle([kasse(-2.21, .62, .55, .05, .28, .12), kasse(-2.21, -.62, .55, .05, .28, .12)]);
      const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.Float32BufferAttribute([2.3, -.9, .08, 16, -3.2, .08, 16, 3.2, .08, 2.3, -.9, .08, 16, 3.2, .08, 2.3, .9, .08], 3));
      kg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
      const kc = document.createElement('canvas'); kc.width = 64; kc.height = 32; const kgx = kc.getContext('2d'); for (let x = 0; x < 64; x++) for (let y = 0; y < 32; y++) {
        const a = Math.pow(1 - x / 64, 1.4) * Math.sin(Math.PI * (y + .5) / 32) ** 2; kgx.fillStyle = `rgba(255,240,200,${a.toFixed(3)})`; kgx.fillRect(x, y, 1, 1); }
      const lag = (g, mat) => { const m = new THREE.InstancedMesh(g, mat, n); m.frustumCulled = false; m.count = 0; R.scene.add(m); liv.mesh.push(m); liv.bilMesh.push(m); return m; };
      liv.lys = { front: lag(front, new THREE.MeshBasicMaterial({ color: 0xb4b4ae })), bak: lag(bak, new THREE.MeshBasicMaterial({ color: 0x700e0a })),
        kjegle: lag(kg, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(kc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 })) };
      liv.lys.kjegle.material.userData.egetKart = true;
    }
    // folk på fortauene i tettstedene: klær i tilfeldige farger
    const gate = velgLinjer(u, v => v.by && 'RFK'.includes(v.k) && Veg.vanlig(v)).concat(velgLinjer(u, v => v.by && v.t !== 5, u.gangveger || []));
    if (gate.length) {
      const bein = samle([kasse(0, .1, 0, .14, .14, .84), kasse(0, -.1, 0, .14, .14, .84)]), kropp = kasse(0, 0, .84, .26, .42, .62), hode = new THREE.SphereGeometry(.11, 10, 8); hode.translate(0, 0, 1.6);
      const hår = new THREE.SphereGeometry(.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2); hår.rotateX(Math.PI / 2); hår.translate(-.01, 0, 1.62);
      liv.folkMesh = instanser(R, [[bein, 0x2a2c33], [kropp], [hode, 0xd2a888], [hår, 0x3a2a1c]], mob ? 16 : 45);
      const KLÆR = [[.6, .12, .1], [.15, .25, .45], [.85, .78, .6], [.25, .35, .2], [.2, .2, .22], [.7, .55, .2], [.5, .5, .55], [.35, .15, .35]];
      liv.folk = Array.from({ length: mob ? 16 : 45 }, () => { const v = gate[Math.floor(rnd() * gate.length)]; return { v, s: rnd() * v.L, dir: rnd() < .5 ? 1 : -1, fart: 1.1 + rnd() * .5, side: v.g ? .6 : v.w + .9, gs: !!v.g, fase: rnd() * 6 }; });
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
      liv.røyk.punkter.material.userData.egetKart = true;
      liv.røyk.punkter.frustumCulled = false; R.scene.add(liv.røyk.punkter); liv.mesh.push(liv.røyk.punkter);
    }
    // vind i trærne: toppen svaier litt, hvert tre i sin egen takt
    liv.vind = [];
    for (const m of R.treMesh || []) if (m.geometry === TREGEO.gran || m.geometry === TREGEO['løv']) {
      // vinden (spill/vind3d.js): svaiingen og takten følger vindfarten, og trærne heller med vinden
      m.material.onBeforeCompile = sh => { sh.uniforms.uTid = { value: 0 }; Object.assign(sh.uniforms, Vind3d.U()); liv.vind.push(sh);
        sh.vertexShader = Vind3d.DEKL + 'uniform float uTid;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float vh = max(0.0, transformed.z), fx = instanceMatrix[3].x, fy = instanceMatrix[3].y;
          transformed.x += sin(uVindT * 1.3 + fx * .05 + fy * .07) * .035 * uVindK * vh * vh; transformed.y += cos(uVindT * 1.1 + fx * .06) * .02 * uVindK * vh * vh;`)
          .replace('#include <project_vertex>', Vind3d.prosjekt(1)); };
      m.material.needsUpdate = true;
    }
  }
  // teksturene som lages på nytt for hvert utsnitt (lyskjegle, røyk) frigjøres med materialet; de andre teksturene er felles og beholdes
  function fjern(R) { if (liv) for (const m of liv.mesh) { R.scene.remove(m); m.geometry.dispose(); if (m.material.userData.egetKart && m.material.map) m.material.map.dispose(); m.material.dispose(); } liv = { mesh: [] }; }
  KROKER.sett3d.push((u, R) => { fjern(R); if (u.veger && u.veger.length) lagVeger(u, R); if (u.S <= 2200) startLiv(u, R.ut === u ? R : R); });

  // ---------- hver ramme ----------
  let d = null;
  KROKER.ramme3d.push(R => {
    if (!liv || !R.ut) return; if (!d) d = new THREE.Object3D(); const nå = performance.now() / 1000, dt = Math.min(.1, nå - (sist || nå)); sist = nå; const u = R.ut;
    for (const sh of liv.vind || []) sh.uniforms.uTid.value = nå;
    const flytt = (liste, mesh, høyde) => liste.forEach((o, k) => {
      o.s += o.fart * dt * o.dir;
      if (o.s > o.v.L || o.s < 0) { const e = o.s < 0 ? 0 : 1;
        if (!høyde && o.v.åpen && o.v.åpen[e] && liv.åpne.length > 1) { const [v2, e2] = liv.åpne[Math.floor(Math.random() * liv.åpne.length)]; o.v = v2; o.s = e2 ? v2.L : 0; o.dir = e2 ? -1 : 1; }
        else { o.s = e ? o.v.L : 0; o.dir = e ? -1 : 1; } }
      const [x, y, z, v] = punkt(o.v, o.s, (o.side || 1.7) * o.dir), bob = høyde ? Math.abs(Math.sin(nå * 7 + (o.fase || 0))) * .04 : 0;
      // z er vegbanens høyde (flat på tvers, løftet opp på bruene av infra3d.js); fortauet ligger 15 cm over
      d.position.set(x, y, z + (høyde && !o.gs ? .17 : .02) + bob); d.rotation.set(0, 0, v + (o.dir < 0 ? Math.PI : 0)); d.scale.set(1, 1, 1); d.updateMatrix();
      for (const m of mesh) m.setMatrixAt(k, d.matrix); });
    if (liv.lys) { const m = window.NATT ? Math.max(0, Math.min(1, (NATT.mørke - .25) / .4)) : 0;
      liv.lys.front.material.color.setRGB(.7 + .3 * m, .7 + .27 * m, .68 + .17 * m); liv.lys.bak.material.color.setRGB(.44 + .56 * m, .055 + .07 * m, .04 + .05 * m);
      liv.lys.kjegle.visible = m > .01; liv.lys.kjegle.material.opacity = m * .42; }
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
  // kryssene kan også finnes av andre moduler (spill/gate3d.js: benker og søppelkasser ved fotgjengerfeltene)
  // Vegbanen eller brudekket under et punkt (Gå-modus går oppå dem): høyden, eller null når punktet ikke ligger på en veg eller bru.
  function dekke(u, x, y) {
    let z = null;
    if (u.vegRute) { const b = u.vegRute.ru.nærmest(x, y, 6); if (b) { const v = u.vegRute.alle[b.li]; if (b.d < v.w + .3) { const p = v.P[b.i - 1], q = v.P[b.i]; z = p[2] + (q[2] - p[2]) * b.f; } } }
    for (const m of u.bruer3d || []) { if (x < m.bb[0] || x > m.bb[2] || y < m.bb[1] || y > m.bb[3]) continue;
      const pr = Bruer.projiser(m.P2, x, y); if (pr.d < m.W / 2 && pr.s > 0 && pr.s < m.L && !(m.sprengt && pr.s > m.L * Bruer.GAP[0] && pr.s < m.L * Bruer.GAP[1])) { const zb = m.zPå(pr.s) + .03; if (z === null || zb > z) z = zb; } }
    return z;
  }
  window.Liv3d = { finnKryss: v => Veg.finnKryss(v), dekke };
})();
