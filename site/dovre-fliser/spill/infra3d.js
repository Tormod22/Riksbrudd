'use strict';
// Bruer og ferjekaier i 3D (brukeren 10. nov: «bruer skal se pent ut i 3D, ferjekaier skal se realistiske ut»).
// Regler (brutype, dekkprofil, søyler, kaiens retning): spill/bruer.js. Kroker i index.html: KROKER.bygg3d (modellene), KROKER.sett3d (nettene).
// Bruene følger vegens linje (vektorflisene z13), bredde etter vegkategori, asfalt med oppmerking, kantbjelke og rekkverk, landkar i hver
// ende og søyler helt ned til bakken. Typer: platebru, bjelkebru, buebru (betongbue over juv), hengebru (tårn og kabler) og jernbanebru
// i stål-fagverk. Vegene i liv3d.js løftes opp på dekket (bilene kjører over brua); en sprengt bru får gap i midten (S5).
// Ferjekaiene: kai i betong med fendere, ferjeleie (klaff ned mot vannet med løftetårn), ledevegger, oppstillingsplass med felt,
// venterom, lyktestolper og en ferje som ligger til kai.
(function () {
  const B = () => window.Bruer;
  const F = {
    betong: [.70, .69, .66], betongLys: [.78, .77, .74], betongMørk: [.52, .51, .49], asfalt: [.26, .265, .275], stål: [.66, .68, .7],
    fagverk: [.30, .34, .33], kabel: [.2, .21, .22], gummi: [.06, .06, .06], ballast: [.42, .39, .35], skinne: [.35, .33, .3],
    gul: [.86, .7, .16], skrog: [.11, .14, .2], hvit: [.9, .9, .88], vindu: [.12, .16, .2], bildekk: [.36, .37, .38], rød: [.68, .14, .12],
    vegg: [.84, .8, .7], tak: [.2, .2, .22], lykt: [.95, .9, .7]
  };
  const BILER = [[.7, .1, .1], [.15, .2, .45], [.85, .85, .85], [.1, .1, .1], [.5, .52, .55], [.2, .4, .25]];

  // ---------- byggeklosser (trekanter uten indeks, farge per hjørne) ----------
  const ny = () => ({ pos: [], kol: [] });
  function tri(G, a, b, c, k) { G.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (let i = 0; i < 3; i++) G.kol.push(k[0], k[1], k[2]); }
  function kvad(G, a, b, c, d, k) { tri(G, a, b, c, k); tri(G, a, c, d, k); }
  // kloss: fire hjørner nede og fire oppe (samme rekkefølge rundt)
  function kloss(G, nede, oppe, k, kTopp, bunn) {
    kvad(G, oppe[0], oppe[1], oppe[2], oppe[3], kTopp || k);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; kvad(G, nede[i], nede[j], oppe[j], oppe[i], k); }
    if (bunn) kvad(G, nede[3], nede[2], nede[1], nede[0], k);
  }
  // boks: midt i (x, y), lengde l langs (ex, ey), bredde w på tvers, fra z0 til z1
  function boks(G, x, y, ex, ey, l, w, z0, z1, k, kTopp) {
    const nx = -ey, ny2 = ex, h = l / 2, v = w / 2, c = [[-h, -v], [h, -v], [h, v], [-h, v]].map(([a, b]) => [x + ex * a + nx * b, y + ey * a + ny2 * b]);
    kloss(G, c.map(p => [p[0], p[1], z0]), c.map(p => [p[0], p[1], z1]), k, kTopp, z0 > -1e8);
  }
  // rør mellom to punkter (n sider), med lokk i enden q
  function rør(G, p, q, r, n, k, lokk) {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], l = Math.hypot(...d) || 1; d[0] /= l; d[1] /= l; d[2] /= l;
    const opp = Math.abs(d[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
    let e1 = [d[1] * opp[2] - d[2] * opp[1], d[2] * opp[0] - d[0] * opp[2], d[0] * opp[1] - d[1] * opp[0]]; const l1 = Math.hypot(...e1); e1 = e1.map(v => v / l1);
    const e2 = [d[1] * e1[2] - d[2] * e1[1], d[2] * e1[0] - d[0] * e1[2], d[0] * e1[1] - d[1] * e1[0]];
    const ring = (o, a) => [o[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * r, o[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * r, o[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * r];
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832; kvad(G, ring(p, a0), ring(p, a1), ring(q, a1), ring(q, a0), k); if (lokk) tri(G, q, ring(q, a0), ring(q, a1), k); }
  }
  const syl = (G, x, y, z0, z1, r, n, k) => rør(G, [x, y, z0], [x, y, z1], r, n, k, true);
  const stang = (G, p, q, t, k) => rør(G, p, q, t * .7, 4, k, false);

  // ---------- teksturer ----------
  const tekst = {};
  function tekstur(type) {
    if (tekst[type]) return tekst[type];
    const c = document.createElement('canvas'); c.width = 64; c.height = type === 'plass' ? 64 : 256; const g = c.getContext('2d'), im = g.createImageData(c.width, c.height); let f = 11 + type.length;
    const rnd = () => (f = (f * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let q = 0; q < c.width * c.height; q++) { const v = (rnd() - .5) * 18, b = type === 'gs' ? [78, 70, 68] : [62, 63, 65]; im.data[q * 4] = b[0] + v; im.data[q * 4 + 1] = b[1] + v; im.data[q * 4 + 2] = b[2] + v; im.data[q * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    // kantlinjer og gul stiplet midtlinje (3 m av 12) som vegene i liv3d.js
    if (type === 'veg') { g.fillStyle = '#e8e6df'; g.fillRect(3, 0, 3, 256); g.fillRect(58, 0, 3, 256); g.fillStyle = '#d9b43a'; g.fillRect(30, 0, 4, 64); }
    // oppstillingsplassen: hvit linje mellom feltene, og pilene/tallene som små lyse merker
    if (type === 'plass') { g.fillStyle = '#e6e4dc'; g.fillRect(0, 0, 3, 64); g.fillStyle = 'rgba(230,228,220,.55)'; g.fillRect(28, 20, 8, 3); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return (tekst[type] = t);
  }
  // teksturbånd langs en linje D (punkter med x, y, nx, ny, s, z), fra a til b meter på tvers
  function bånd(T, D, a, b, løft, z = d => d.z) {
    const n0 = T.pos.length / 3;
    for (const d of D) { T.pos.push(d.x + d.nx * a, d.y + d.ny * a, z(d) + løft, d.x + d.nx * b, d.y + d.ny * b, z(d) + løft); T.uv.push(0, d.s / 12, 1, d.s / 12); }
    for (let i = 0; i < D.length - 1; i++) { const a0 = n0 + i * 2; T.idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); }
  }
  // sveip: et «profil» fra a til b meter på tvers langs D, fra zb(d) opp til zt(d): topp, begge sider og bunn
  function sveip(G, D, a, b, zt, zb, kTopp, kSide, utenBunn) {
    for (let i = 0; i < D.length - 1; i++) {
      const p = D[i], q = D[i + 1], P = (d, o, z) => [d.x + d.nx * o, d.y + d.ny * o, z];
      kvad(G, P(p, a, zt(p)), P(q, a, zt(q)), P(q, b, zt(q)), P(p, b, zt(p)), kTopp);
      kvad(G, P(p, a, zb(p)), P(q, a, zb(q)), P(q, a, zt(q)), P(p, a, zt(p)), kSide);
      kvad(G, P(p, b, zt(p)), P(q, b, zt(q)), P(q, b, zb(q)), P(p, b, zb(p)), kSide);
      if (!utenBunn) kvad(G, P(p, b, zb(p)), P(q, b, zb(q)), P(q, a, zb(q)), P(p, a, zb(p)), kSide);
    }
    // endeflatene
    for (const d of [D[0], D[D.length - 1]]) { const P = (o, z) => [d.x + d.nx * o, d.y + d.ny * o, z]; kvad(G, P(a, zb(d)), P(b, zb(d)), P(b, zt(d)), P(a, zt(d)), kSide); }
  }

  // ---------- hjelpere for utsnittet ----------
  const zLok = (u, x, y) => (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX;
  const iVann = (u, x, y) => { if (!u.vann) return false; const W = u.vann.width, i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W);
    if (i < 0 || j < 0 || i >= W || j >= W) return false; if (!u.vannData) u.vannData = u.vann.getContext('2d').getImageData(0, 0, W, W).data; return u.vannData[(j * W + i) * 4] > 127; };
  // punkt s meter langs D (interpolert)
  function påD(D, s) {
    let i = 1; while (i < D.length - 1 && D[i].s < s) i++;
    const a = D[i - 1], b = D[i], f = Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s || 1))), m = {};
    for (const k of ['x', 'y', 'z', 'g', 'nx', 'ny', 'ex', 'ey']) m[k] = a[k] + (b[k] - a[k]) * f; m.s = s; return m;
  }
  const delD = (D, s0, s1) => [påD(D, s0), ...D.filter(d => d.s > s0 + .05 && d.s < s1 - .05), påD(D, s1)];

  // ---------- vegene ved bruene (vektorflisene z13, uten utjevning) ----------
  async function vegLinjer(u, bruer) {
    const z = 13, sp = span(z), sett = new Set(), linjer = [];
    for (const o of bruer) { const [x0, y0, x1, y1] = flisområde([o.bb[0] - 30, o.bb[1] - 30, o.bb[2] + 30, o.bb[3] + 30], z); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sett.add(x + ',' + y); }
    const fl = await Promise.all([...sett].map(k => { const [x, y] = k.split(',').map(Number); return hentFlis('vektor', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]); }));
    for (const [x, y, t] of fl) { if (!t || !t.veg) continue; const mx = G.x0 + x * sp, my = G.y0 - y * sp, e = t.veg.ext;
      for (const o of t.veg.obj) for (const d of o.deler) linjer.push({ k: o.e.k, P: d.map(([a, b]) => [mx + a / e * sp - u.cx, my - b / e * sp - u.cy]) }); }
    return linjer;
  }

  // ---------- bruene ----------
  function bruModell(u, o, del, linjer) {
    const R = B(), bru = []; for (let i = 0; i < del.length; i += 2) bru.push([del[i] - u.cx, del[i + 1] - u.cy]);
    const lin = o.e.type === 2 ? (bru.length > 1 ? { P: R.delLinje(bru, 0, R.lengde(bru)), k: null, veg: false } : null) : R.finnLinje(bru, linjer, o.e.lengde);
    if (!lin || lin.P.length < 2) return null;
    if (lin.P.some(([x, y]) => Math.abs(x) > u.S - 12 || Math.abs(y) > u.S - 12)) return null;
    // punktene langs brua med retning, normal og terrenghøyde
    const D = []; let s = 0;
    lin.P.forEach((p, i) => { if (i) s += Math.hypot(p[0] - lin.P[i - 1][0], p[1] - lin.P[i - 1][1]);
      const q = lin.P[Math.min(lin.P.length - 1, i + 1)], r = lin.P[Math.max(0, i - 1)], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1;
      D.push({ x: p[0], y: p[1], s, ex: dx / l, ey: dy / l, nx: -dy / l, ny: dx / l, g: zLok(u, p[0], p[1]) }); });
    const L = s; if (L < 3) return null;
    const type = o.e.type, k = lin.k || (type === 1 ? 'G' : type === 2 ? 'J' : 'F');
    const kjør = type === 1 ? 1.5 : type === 2 ? 2.4 : R.VEGBREDDE[k] / 2, W = 2 * kjør + (type === 1 ? .8 : type === 2 ? 1.6 : 2.2);
    const zt = R.profil(D.map(d => d.g), D.map(d => d.s), type === 2 ? 1.4 : 1.1); D.forEach((d, i) => { d.z = zt[i]; });
    const maksK = Math.max(...D.map(d => d.z - d.g));
    const tPlate = type === 2 ? .9 : .55, dBjelke = Math.max(.8, Math.min(2.2, L / 22)), zb = D.map(d => d.z - tPlate - dBjelke);
    const bue = R.bue(D.map(d => d.s), D.map(d => d.g), zb);
    const sort = R.velgType({ lengde: L, klaring: maksK, type, bueMulig: !!bue });
    const sprengt = !!(window.INFRA_TILSTAND && INFRA_TILSTAND.has('bru:' + o.e.id));
    const bb = [Math.min(...D.map(d => d.x)) - W, Math.min(...D.map(d => d.y)) - W, Math.max(...D.map(d => d.x)) + W, Math.max(...D.map(d => d.y)) + W];
    return { id: o.e.id, navn: o.e.navn, type, k, veg: lin.veg, sort, D, L, W, kjør, tPlate, dBjelke: sort === 'plate' ? 0 : sort === 'henge' ? 1.2 : dBjelke, maksK, bue, sprengt,
      stykker: R.stykker(L, sprengt), søyler: [], bb, P2: D.map(d => [d.x, d.y]), zPå: s2 => påD(D, s2).z };
  }

  function byggBru(u, m, G, T) {
    const R = B(), { D, L, W, kjør, tPlate } = m, h = W / 2, dB = m.dBjelke, iGap = s => m.sprengt && s > L * R.GAP[0] && s < L * R.GAP[1];
    const bunnUnder = (x, y, ex, ey, r) => Math.min(zLok(u, x, y), zLok(u, x + ex * r, y + ey * r), zLok(u, x - ex * r, y - ey * r), zLok(u, x - ey * r, y + ex * r), zLok(u, x + ey * r, y - ex * r)) - .4;
    for (const [s0, s1] of m.stykker) {
      const P = delD(D, s0, s1);
      // dekket: asfalt (ballast på jernbane) oppå, betong på sidene og under
      sveip(G, P, -h, h, d => d.z, d => d.z - tPlate, m.type === 2 ? F.ballast : F.asfalt, F.betong);
      if (m.type === 2) { for (const o of [-.75, .75]) sveip(G, P, o - .05, o + .05, d => d.z + .18, d => d.z, F.skinne, F.skinne, true); }
      else bånd(T[m.type === 1 ? 'gs' : 'ERF'.includes(m.k) ? 'veg' : 'plain'], P, -kjør, kjør, .025);
      // bjelkene under dekket (to kassebjelker på vegbru, én på gangbru)
      if (dB > 0 && m.sort !== 'fagverk') for (const o of W > 6 ? [-h * .5, h * .5] : [0]) sveip(G, P, o - Math.min(1.6, W * .18), o + Math.min(1.6, W * .18), d => d.z - tPlate, d => d.z - tPlate - dB, F.betongMørk, F.betongMørk);
      // kantbjelken (litt lysere betong, går ned forbi dekket) og rekkverket på begge sider
      if (m.sort !== 'fagverk') for (const sd of [-1, 1]) {
        const a = sd < 0 ? -h : h - .5, b = sd < 0 ? -h + .5 : h;
        sveip(G, P, a, b, d => d.z + .3, d => d.z - tPlate - .25, F.betongLys, F.betongLys);
        const o = sd * (h - .25);
        sveip(G, P, o - .05, o + .05, d => d.z + 1.12, d => d.z + 1.0, F.stål, F.stål);
        sveip(G, P, o - .03, o + .03, d => d.z + .68, d => d.z + .6, F.stål, F.stål);
        for (let s = s0 + 1; s < s1 - .5; s += 2.5) { const d = påD(D, s); boks(G, d.x + d.nx * o, d.y + d.ny * o, d.ex, d.ey, .1, .1, d.z + .3, d.z + 1.0, F.stål); }
      } else for (const sd of [-1, 1]) sveip(G, P, sd * h - .25, sd * h + .25, d => d.z + .25, d => d.z - tPlate, F.fagverk, F.fagverk);
    }
    // søyler (bjelkebru og fagverk): to runde søyler med tverrbjelke på brede bruer, én skive på smale; helt ned i bakken/vannet
    if (m.sort === 'bjelke' || m.sort === 'fagverk') {
      for (const s of R.søyler(L, s2 => { const d = påD(D, s2); return d.z - tPlate - dB - d.g; }, m.maksK)) {
        if (iGap(s)) continue; const d = påD(D, s), topp = d.z - tPlate - dB;
        const r = .55 + Math.min(.5, (topp - d.g) * .02), xs = W > 7 && m.sort !== 'fagverk' ? [-h * .5, h * .5] : [0];
        boks(G, d.x, d.y, d.nx, d.ny, Math.max(2.2, W * .86), 1.5, topp - 1, topp, F.betong);
        for (const o of xs) { const x = d.x + d.nx * o, y = d.y + d.ny * o, bunn = bunnUnder(x, y, d.ex, d.ey, r * 1.6);
          if (xs.length > 1 || m.sort !== 'fagverk') syl(G, x, y, bunn, topp - .9, r, 10, F.betong); else boks(G, x, y, d.nx, d.ny, W * .7, 1.6, bunn, topp - .9, F.betong);
          if (iVann(u, x, y)) syl(G, x, y, bunn, d.g + .5, r * 1.6, 10, F.betongMørk);
          m.søyler.push({ x, y, bunn, topp: topp - .9, g: zLok(u, x, y) }); }
      }
    }
    // landkar i hver ende: betongblokk under dekkenden som går ned i terrenget, med vingemurer langs sidene
    for (const [s, ut] of [[0, -1], [L, 1]]) {
      const d = påD(D, s), ex = d.ex * ut, ey = d.ey * ut, topp = d.z - tPlate - (m.sort === 'plate' ? 0 : dB);
      let bunn = Infinity; for (let t = 0; t <= 9; t += 1.5) bunn = Math.min(bunn, påD(D, Math.max(0, Math.min(L, s - ut * t))).g);
      for (let t = 0; t <= 4; t += 1) bunn = Math.min(bunn, zLok(u, d.x + ex * t, d.y + ey * t));
      bunn -= .6;
      boks(G, d.x + ex * .4, d.y + ey * .4, ex, ey, 3.8, W + .8, bunn, topp, F.betong);
      for (const sd of [-1, 1]) { const o = sd * (h - .25), x = d.x + d.nx * o + ex * 1.3, y = d.y + d.ny * o + ey * 1.3; boks(G, x, y, ex, ey, 2.6, .5, Math.min(bunn, zLok(u, x, y) - .5), Math.max(zLok(u, x, y) + .2, d.z - .4), F.betongLys); }
      m.søyler.push({ x: d.x, y: d.y, bunn, topp, g: Math.min(zLok(u, d.x, d.y), bunn + .6), landkar: true });
    }
    // buebru: betongbuen fra fotpunktene opp til like under dekket, med søyler opp til dekket hver 7. meter
    if (m.sort === 'bue' && m.bue) {
      const b = m.bue, sp = b.s1 - b.s0, zA = s => { const f = (s - b.s0) / sp, base = b.z0 + (b.z1 - b.z0) * f; return base + (b.topp - base) * 4 * f * (1 - f); };
      const tykk = s => { const f = Math.abs(2 * (s - b.s0) / sp - 1); return 1.1 + 1.1 * f * f; };
      const A = delD(D, b.s0, b.s1).map(d => ({ ...d, z: zA(d.s) })), tett = [];
      for (let i = 0; i < A.length - 1; i++) { tett.push(A[i]); const n = Math.ceil((A[i + 1].s - A[i].s) / 2); for (let j = 1; j < n; j++) { const q = påD(D, A[i].s + (A[i + 1].s - A[i].s) * j / n); q.z = zA(q.s); tett.push(q); } }
      tett.push(A[A.length - 1]);
      const biter = m.sprengt ? [tett.filter(d => d.s < L * R.GAP[0]), tett.filter(d => d.s > L * R.GAP[1])] : [tett];
      for (const bit of biter) if (bit.length > 1) for (const o of W > 6 ? [-h * .55, h * .55] : [0]) sveip(G, bit, o - .9, o + .9, d => d.z, d => d.z - tykk(d.s), F.betong, F.betong);
      for (const [s, z] of [[b.s0, b.z0], [b.s1, b.z1]]) { const d = påD(D, s); boks(G, d.x, d.y, d.ex, d.ey, 4, W * .9, z - 2, z + .8, F.betongMørk); m.søyler.push({ x: d.x, y: d.y, bunn: z - 2, topp: z + .8, g: zLok(u, d.x, d.y), bue: true }); }
      for (let s = b.s0 + 7; s < b.s1 - 4; s += 7) { if (iGap(s)) continue; const d = påD(D, s), za = zA(s), topp = d.z - tPlate - dB; if (topp - za < .8) continue;
        for (const o of W > 6 ? [-h * .55, h * .55] : [0]) boks(G, d.x + d.nx * o, d.y + d.ny * o, d.ex, d.ey, .7, .7, za - .3, topp, F.betong); }
    }
    // hengebru: to tårn, hovedkabler i parabel og hengestenger hver 8. meter
    if (m.sort === 'henge') {
      const tårnVed = (fra, ret) => { for (let t = 0; t < L * .3; t += 4) { const d = påD(D, fra + ret * t); if (d.z - d.g > m.maksK * .5) return Math.max(L * .04, t); } return L * .2; };
      // tårnene der dalen/fjorden begynner (hovedspennet over hele vannet), hengestenger mellom kabelen og dekket
      const Ht = Math.max(25, L * .1), sT = [tårnVed(0, 1), L - tårnVed(L, -1)], topp = s => påD(D, s).z + Ht;
      for (const s of sT) { if (iGap(s)) continue; const d = påD(D, s);
        for (const sd of [-1, 1]) { const o = sd * (h + 1), x = d.x + d.nx * o, y = d.y + d.ny * o, bunn = bunnUnder(x, y, d.ex, d.ey, 2.5); boks(G, x, y, d.ex, d.ey, 2.4, 2, bunn, d.z + Ht, F.betong); m.søyler.push({ x, y, bunn, topp: d.z + Ht, g: zLok(u, x, y), tårn: true }); }
        for (const z of [d.z - tPlate - 1.2, d.z + Ht * .55, d.z + Ht - 1.5]) boks(G, d.x, d.y, d.nx, d.ny, W + 2.4, 1.8, z - 1.4, z, F.betong); }
      const kabel = s => { if (s <= sT[0]) return påD(D, 0).z + 1 + (topp(sT[0]) - påD(D, 0).z - 1) * Math.pow(s / sT[0], 1.3); if (s >= sT[1]) return påD(D, L).z + 1 + (topp(sT[1]) - påD(D, L).z - 1) * Math.pow((L - s) / (L - sT[1]), 1.3);
        const f = (s - sT[0]) / (sT[1] - sT[0]), lav = påD(D, (sT[0] + sT[1]) / 2).z + 2.2; return lav + (topp(sT[0]) - lav) * (2 * f - 1) ** 2; };
      for (const sd of [-1, 1]) { const o = sd * (h + .6); let forrige = null;
        for (let s = 0; s <= L + .01; s += Math.min(8, L / 40)) { const d = påD(D, s), p = [d.x + d.nx * o, d.y + d.ny * o, kabel(s)];
          if (forrige && !(iGap(s) && iGap(s - 8))) stang(G, forrige, p, .55, F.kabel); forrige = p;
          if (s > 2 && s < L - 2 && !iGap(s) && p[2] - d.z > 2) stang(G, [p[0], p[1], d.z + .3], p, .12, F.kabel); } }
    }
    // fagverk (jernbanebru i stål): over- og undergurt, stendere og diagonaler på hver side, avstivning på toppen
    if (m.sort === 'fagverk') {
      const Ht = Math.min(7, 4 + L * .025), n = Math.max(2, Math.round(L / 6)), node = (i, sd, opp) => { const d = påD(D, L * i / n), o = sd * h; return [d.x + d.nx * o, d.y + d.ny * o, d.z + (opp ? Ht : 0)]; };
      const ok = (i, j) => !iGap(L * (i + j) / 2 / n);
      for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
        if (ok(i, i + 1)) stang(G, node(i, sd, 0), node(i + 1, sd, 0), .5, F.fagverk);
        if (i > 0 && i < n - 1 && ok(i, i + 1)) stang(G, node(i, sd, 1), node(i + 1, sd, 1), .5, F.fagverk);
        if (i > 0 && ok(i, i)) stang(G, node(i, sd, 0), node(i, sd, 1), .3, F.fagverk);
        if (!ok(i, i + 1)) continue;
        if (i === 0) stang(G, node(0, sd, 0), node(1, sd, 1), .5, F.fagverk); else if (i === n - 1) stang(G, node(n - 1, sd, 1), node(n, sd, 0), .5, F.fagverk);
        else if (i < n / 2) stang(G, node(i, sd, 1), node(i + 1, sd, 0), .3, F.fagverk); else stang(G, node(i, sd, 0), node(i + 1, sd, 1), .3, F.fagverk);
      }
      for (let i = 1; i < n; i++) if (ok(i, i)) { stang(G, node(i, -1, 1), node(i, 1, 1), .3, F.fagverk); if (i < n - 1 && ok(i, i + 1)) stang(G, node(i, -1, 1), node(i + 1, 1, 1), .2, F.fagverk); }
    }
    // sprengt: dekkendene henger ned i gapet, og betongbiter ligger på bakken under
    if (m.sprengt) {
      let f = (m.id % 997) + 3; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
      for (const [s, ret] of [[L * R.GAP[0], 1], [L * R.GAP[1], -1]]) { const d = påD(D, s), ex = d.ex * ret, ey = d.ey * ret, l = Math.min(5, L * .1), fall = l * .55;
        const c = [[0, -h], [l, -h], [l, h], [0, h]].map(([a, b]) => [d.x + ex * a + d.nx * b, d.y + ey * a + d.ny * b]), z = (i, t) => d.z - (i === 1 || i === 2 ? fall : 0) - t;
        kloss(G, c.map((p, i) => [p[0], p[1], z(i, tPlate)]), c.map((p, i) => [p[0], p[1], z(i, 0)]), F.betong, F.asfalt, true); }
      for (let i = 0; i < 9; i++) { const d = påD(D, L * (R.GAP[0] + (R.GAP[1] - R.GAP[0]) * rnd())), o = (rnd() - .5) * W * 1.4, x = d.x + d.nx * o, y = d.y + d.ny * o, g = zLok(u, x, y), a = rnd() * 6.28;
        boks(G, x, y, Math.cos(a), Math.sin(a), 1.5 + rnd() * 3, 1 + rnd() * 2, g - .4, g + .3 + rnd() * .9, rnd() < .5 ? F.betong : F.betongMørk); }
    }
  }

  // Vegene fra liv3d.js som går over en bru løftes opp på dekket; i gapet på en sprengt bru tas de bort (vegen deles i to).
  // Ferjesambandene ligger også i vegnettet: vegbiter som går mer enn 30 m over vann (uten bru) tas bort, så ingen veg ligger på fjorden.
  function løftVeger(u) {
    if (!u.veger) return;
    const R = B(), ut = [];
    for (const v of u.veger) {
      let bit = [];
      const våt = v.P.map(p => iVann(u, p[0], p[1])), sjø = våt.map(() => false);
      for (let i = 0; i < våt.length;) { if (!våt[i]) { i++; continue; } let j = i; while (j < våt.length && våt[j]) j++; if (j - i >= 12) for (let k = i; k < j; k++) sjø[k] = true; i = j; }
      for (let i = 0; i < v.P.length; i++) {
        const p = v.P[i], q = v.P[Math.min(i + 1, v.P.length - 1)], o = v.P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1; let borte = false, påBru = false;
        for (const m of u.bruer3d) {
          if (p[0] < m.bb[0] || p[0] > m.bb[2] || p[1] < m.bb[1] || p[1] > m.bb[3]) continue;
          const pr = R.projiser(m.P2, p[0], p[1]); if (pr.d > m.W / 2 + .5 || pr.s < .2 || pr.s > m.L - .2 || Math.abs(pr.ex * dx / l + pr.ey * dy / l) < .85) continue;
          if (m.sprengt && pr.s > m.L * R.GAP[0] - 1 && pr.s < m.L * R.GAP[1] + 1) { borte = true; break; }
          p[2] = m.zPå(pr.s) + .08; m.løftet = (m.løftet || 0) + 1; påBru = true;
        }
        if (sjø[i] && !påBru) borte = true;
        if (borte) { if (bit.length > 1) ut.push({ ...v, P: bit }); bit = []; } else bit.push(p);
      }
      if (bit.length > 1) ut.push(bit.length === v.P.length ? v : { ...v, P: bit });
    }
    u.veger.length = 0; for (const v of ut) u.veger.push(v);
  }
  // trær som ville stukket opp gjennom brua tas bort
  function ryddTrær(u) {
    if (!u.trær) return; const R = B();
    for (const n of Object.keys(u.trær)) { const a = u.trær[n]; if (!a || !a.length) continue; const ut = [];
      for (let k = 0; k < a.length; k += 5) { const x = a[k], y = a[k + 1]; let vekk = false;
        for (const m of u.bruer3d) { if (x < m.bb[0] - 4 || x > m.bb[2] + 4 || y < m.bb[1] - 4 || y > m.bb[3] + 4) continue; const pr = R.projiser(m.P2, x, y); if (pr.d < m.W / 2 + 4 && pr.s > -3 && pr.s < m.L + 3) { vekk = true; break; } }
        if (!vekk) for (let q = 0; q < 5; q++) ut.push(a[k + q]); }
      u.trær[n] = new Float32Array(ut); }
  }

  // ---------- ferjekaiene ----------
  function kaiModell(u, o) {
    const R = B(), x0 = o.deler[0][0] - u.cx, y0 = o.deler[0][1] - u.cy; if (Math.abs(x0) > u.S - 160 || Math.abs(y0) > u.S - 160) return null;
    const vann = (x, y) => iVann(u, x, y), ferjer = [];
    for (const f of (INFRA && INFRA.ferje) || []) { if (f.bb[2] < o.deler[0][0] - 500 || f.bb[0] > o.deler[0][0] + 500 || f.bb[3] < o.deler[0][1] - 500 || f.bb[1] > o.deler[0][1] + 500) continue;
      for (const d of f.deler) { const P = []; for (let i = 0; i < d.length; i += 2) P.push([d[i] - u.cx, d[i + 1] - u.cy]); ferjer.push(P); } }
    const ret = R.kaiRetning(x0, y0, ferjer, vann); if (!ret) return null;
    const t = R.vannkant(x0, y0, ret[0], ret[1], vann); if (t === null) return null;
    const fx = ret[0], fy = ret[1], lx = -fy, ly = fx, Qx = x0 + fx * t, Qy = y0 + fy * t, pt = (a, b) => [Qx + fx * a + lx * b, Qy + fy * a + ly * b];
    const gz = (a, b) => { const [x, y] = pt(a, b); return zLok(u, x, y); }, iv = (a, b) => { const [x, y] = pt(a, b); return vann(x, y); };
    const zw = Math.min(gz(14, 0), gz(26, 0), gz(40, 0)), zk = zw + 2.2;
    return { navn: o.e.navn, id: o.e.id, Q: [Qx, Qy], f: [fx, fy], zw, zk, pt, gz, iv, ferje: null };
  }
  // Ferjelengden som får plass ut fra kaien: hele skroget (og 8 m til hver side) må være vann. iv(a, b) i kaiens ramme. 40–72 m, ellers 0.
  function ferjeLengde(iv) { let Lf = 72; while (Lf >= 40 && ![...Array(8)].every((_, i) => iv(23 + Lf * i / 7, 0) && iv(23 + Lf * i / 7, 8) && iv(23 + Lf * i / 7, -8))) Lf -= 8; return Lf >= 40 ? Lf : 0; }
  // Ferja: skrog, bildekk, sidebygg med vinduer, styrehus på brodekket, skorstein, biler på dekket. I en ramme der a går langs ferja
  // (fra a0 til a0 + Lf), b på tvers; K(a0, a1, b0, b1, z0, z1, farge, toppfarge) er en kloss og P3(a, b, z) et punkt i rammen; zw = vannlinja.
  function ferjeModell(G, K, P3, a0, Lf, zw, id) {
    const a1 = a0 + Lf, m = (a0 + a1) / 2, B2 = 7.5, dekk = zw + 1.6;
    const skrog = [[a0 + 3, -B2 + 1], [a1 - 3, -B2 + 1], [a1 - 3, B2 - 1], [a0 + 3, B2 - 1]], topp = [[a0, -B2], [a1, -B2], [a1, B2], [a0, B2]];
    kloss(G, skrog.map(([a, b]) => P3(a, b, zw - 2.2)), topp.map(([a, b]) => P3(a, b, dekk)), F.skrog, F.bildekk, true);
    for (const sd of [-1, 1]) { K(a0 + 1, a1 - 1, sd * B2 - .2, sd * B2 + .2, dekk - .9, dekk + 1.1, F.hvit); K(a0 + 1, a1 - 1, sd * B2 - .22, sd * B2 + .22, dekk - 1.6, dekk - .9, F.rød); }
    for (const sd of [-1, 1]) { K(a0 + 12, a1 - 12, sd * 5, sd * B2, dekk, dekk + 5, F.hvit); K(a0 + 13, a1 - 13, sd * (B2 + .02) - .02, sd * (B2 + .02) + .02, dekk + 3.4, dekk + 4.3, F.vindu); }
    K(m - 8, m + 8, -B2, B2, dekk + 5, dekk + 5.4, F.hvit);
    K(m - 3, m + 3, -4.2, 4.2, dekk + 5.4, dekk + 8.2, F.hvit, F.tak);
    K(m - 3.05, m + 3.05, -4.25, 4.25, dekk + 6.8, dekk + 7.8, F.vindu);
    K(m + 5, m + 7.2, 5.4, 7, dekk + 5, dekk + 10.5, F.hvit); K(m + 5, m + 7.2, 5.4, 7, dekk + 10.5, dekk + 11.3, F.tak);
    stang(G, P3(m, 0, dekk + 8.2), P3(m, 0, dekk + 12), .15, F.stål);
    let f = (id % 991) + 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 7; i++) { const a = a0 + 8 + (i % 4) * 11 + rnd() * 2, b = (Math.floor(i / 4) ? 1 : -1) * 2.2, c = BILER[Math.floor(rnd() * BILER.length)];
      if (a + 4.4 > a1 - 4) continue;
      K(a, a + 4.4, b - .9, b + .9, dekk, dekk + .8, c); K(a + 1.1, a + 3.4, b - .8, b + .8, dekk + .8, dekk + 1.4, F.vindu); }
  }
  // Ferja som egen geometri (spill/ferje3d.js): midt i origo, langs x, vannlinja z = 0. Gir { pos, kol } (trekanter, farge per hjørne).
  function ferjeGeo(Lf, id) {
    const G = ny(), P3 = (a, b, z) => [a, b, z], K = (a0, a1, b0, b1, z0, z1, kf, kt) => { const c = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]]; kloss(G, c.map(([a, b]) => P3(a, b, z0)), c.map(([a, b]) => P3(a, b, z1)), kf, kt, true); };
    ferjeModell(G, K, P3, -Lf / 2, Lf, 0, id | 0); return G;
  }
  function byggKai(u, k, G, T) {
    const { pt, gz, iv, zw, zk } = k, [fx, fy] = k.f, lx = -fy, ly = fx;
    const P3 = (a, b, z) => { const [x, y] = pt(a, b); return [x, y, z]; };
    // en kloss i kaiens ramme: a = ut mot vannet, b = på tvers
    const K = (a0, a1, b0, b1, z0, z1, kf, kt) => { const c = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]]; kloss(G, c.map(([a, b]) => P3(a, b, z0)), c.map(([a, b]) => P3(a, b, z1)), kf, kt, true); };
    const Kz = (a0, a1, b0, b1, z0, z1, kf) => { const c = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]]; kloss(G, c.map(([a, b]) => P3(a, b, z0[0] + (z0[1] - z0[0]) * (a - a0) / (a1 - a0 || 1))), c.map(([a, b]) => P3(a, b, z1[0] + (z1[1] - z1[0]) * (a - a0) / (a1 - a0 || 1))), kf, kf, true); };
    // kaien i betong (front i vannet), pullerter og fendere (bildekk) langs fronten
    K(-6, 6, -16, 16, zw - 1.5, zk, F.betong, F.betongLys);
    K(5.6, 6, -16, 16, zk, zk + .12, F.gul);
    for (const b of [-13, -9, 9, 13]) { const [x, y] = pt(5, b); syl(G, x, y, zk, zk + .6, .22, 8, F.tak); }
    for (let b = -15; b <= 15.01; b += 2.5) { if (Math.abs(b) < 5.5) continue; for (const z of [zk - .9, zk - 2.2]) { if (z < zw + .2) continue; rør(G, P3(6, b, z), P3(6.4, b, z), .48, 8, F.gummi, true); } }
    // ferjeleiet: klaffen fra kaikanten ned mot ferjas bildekk, med sidebjelker; løftetårnet (portal) på to dolphiner i vannet
    const zKlaff = zw + 1.7;
    Kz(6, 22, -4.5, 4.5, [zk - .8, zKlaff - .8], [zk, zKlaff], F.bildekk);
    for (const sd of [-1, 1]) Kz(6, 22, sd > 0 ? 4.5 : -4.8, sd > 0 ? 4.8 : -4.5, [zk, zKlaff], [zk + .9, zKlaff + .9], F.gul);
    const zTopp = zk + 9;
    for (const sd of [-1, 1]) { const [x, y] = pt(21, sd * 6.8); syl(G, x, y, zw - 2.5, zw + 1.4, 1.6, 12, F.betongMørk); boks(G, x, y, fx, fy, 1.2, 1.2, zw + 1.4, zTopp, F.gul);
      k.søyle = k.søyle || []; k.søyle.push({ x, y, bunn: zw - 2.5, g: zLok(u, x, y) }); }
    { const [x, y] = pt(21, 0); boks(G, x, y, lx, ly, 15, 1.4, zTopp - 1.3, zTopp, F.gul); boks(G, x, y, fx, fy, 3, 4, zTopp, zTopp + 2.2, F.hvit, F.tak); }
    for (const sd of [-1, 1]) stang(G, P3(21, sd * 3.5, zTopp - 1.3), P3(21.6, sd * 3.5, zKlaff + .9), .1, F.kabel);
    // ledeveggene: peler med fenderbjelke på hver side av ferja
    for (const sd of [-1, 1]) { for (let a = 24; a <= 48; a += 6) { const [x, y] = pt(a, sd * 8.6); syl(G, x, y, zw - 2.5, zw + 3.2, .45, 8, F.kabel); }
      K(24, 48, sd * 8.6 - .35, sd * 8.6 + .35, zw + 2.4, zw + 3.1, F.gummi); }
    // ferja ved kai (hvis det er vann nok). Ligger kaien i et samband med ferje i rute (spill/ferje3d.js: k.iRute), tegnes den der i stedet.
    const Lf = ferjeLengde(iv);
    if (Lf >= 40) { k.ferje = { a0: 22.6, a1: 22.6 + Lf, Lf }; if (!k.iRute) ferjeModell(G, K, P3, 22.6, Lf, zw, k.id); }
    // oppstillingsplassen: asfalt med hvite linjer mellom feltene, lagt på terrenget (ikke der det er vann)
    const pl = T.plass, A0 = -6, A1 = -66, B0 = -17, B1 = 17, st = 3, na = Math.round((A0 - A1) / st), nb = Math.round((B1 - B0) / st), id = [];
    const zp = (a, b) => { const g = Math.max(gz(a, b), zw + 1) + .18; const t = Math.max(0, Math.min(1, (A0 - a) / 10)); return zk * (1 - t) + g * t; };
    for (let j = 0; j <= na; j++) for (let i = 0; i <= nb; i++) { const a = A0 - j * st, b = B0 + i * (B1 - B0) / nb; pl.pos.push(...P3(a, b, zp(a, b))); pl.uv.push((b - B0) / 3.4, a / 12); id.push(iv(a, b)); }
    const n0 = pl.pos.length / 3 - (na + 1) * (nb + 1);
    for (let j = 0; j < na; j++) for (let i = 0; i < nb; i++) { const q = j * (nb + 1) + i; if (id[q] || id[q + 1] || id[q + nb + 1] || id[q + nb + 2]) continue; pl.idx.push(n0 + q, n0 + q + 1, n0 + q + nb + 1, n0 + q + 1, n0 + q + nb + 2, n0 + q + nb + 1); }
    // venterommet ved plassen, og lyktestolper langs kantene
    if (!iv(-22, 25) && !iv(-30, 25)) { const g = Math.min(gz(-17, 22), gz(-27, 22), gz(-17, 28), gz(-27, 28)), g2 = Math.max(gz(-17, 22), gz(-27, 22), gz(-17, 28), gz(-27, 28));
      K(-27, -17, 22, 28, g - .3, g2 + 3.3, F.vegg, F.tak); K(-26, -18, 21.97, 22.0, g2 + 1.1, g2 + 2.4, F.vindu); K(-27.3, -16.7, 21.7, 28.3, g2 + 3.3, g2 + 3.6, F.tak);
      K(-21.4, -20.2, 21.95, 21.99, g2 - .1, g2 + 2.1, F.rød); }
    for (const a of [-14, -36, -58]) for (const b of [-18.5, 18.5]) { if (iv(a, b)) continue; const [x, y] = pt(a, b), g = gz(a, b); syl(G, x, y, g - .3, g + 8, .12, 6, F.stål);
      const s = Math.sign(b); stang(G, [x, y, g + 8], P3(a, b - s * 1.6, g + 8.1), .08, F.stål); const [x2, y2] = pt(a, b - s * 1.8); boks(G, x2, y2, fx, fy, .5, .3, g + 7.8, g + 8.05, F.lykt); }
  }

  // ---------- krokene ----------
  // Bromodellene for utsnittet u. Med kopi = true endres ikke utsnittet: modellene og en løftet kopi av vegene gis tilbake (testene bruker det).
  async function modeller(u, kopi) {
    const bruer = u.infra.filter(o => o.lag === 'bru'), ms = [];
    const linjer = bruer.length ? await vegLinjer(u, bruer) : [];
    for (const o of bruer) for (const del of o.deler) { const m = bruModell(u, o, del, linjer); if (m) ms.push(m); }
    if (!kopi) return ms;
    const k = { ...u, bruer3d: ms, veger: u.veger ? u.veger.map(v => ({ ...v, P: v.P.map(p => p.slice()) })) : null }; løftVeger(k);
    return { bruer: ms, veger: k.veger };
  }
  KROKER.bygg3d.push(async u => {
    u.bruer3d = []; u.kaier3d = [];
    if (!window.Bruer || !INFRA || !VIS.infra || !u.infra) return;
    u.bruer3d = await modeller(u, false);
    løftVeger(u); ryddTrær(u);
    for (const o of u.infra) if (o.lag === 'ferjekai') { const k = kaiModell(u, o); if (k) u.kaier3d.push(k); }
  });
  let mesh = [];
  KROKER.sett3d.push((u, R) => {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } mesh = []; R.infra3d = mesh;
    if (!u.bruer3d || (!u.bruer3d.length && !u.kaier3d.length)) return;
    const G = ny(), T = { veg: { pos: [], uv: [], idx: [] }, plain: { pos: [], uv: [], idx: [] }, gs: { pos: [], uv: [], idx: [] }, plass: { pos: [], uv: [], idx: [] } };
    for (const m of u.bruer3d) { m.søyler = []; byggBru(u, m, G, T); }
    for (const k of u.kaier3d) byggKai(u, k, G, T);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.kol, 3)); g.computeVertexNormals();
    const hoved = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); hoved.name = 'infra3d'; R.scene.add(hoved); mesh.push(hoved);
    for (const [type, t] of Object.entries(T)) { if (!t.idx.length) continue;
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2)); tg.setIndex(t.idx); tg.computeVertexNormals();
      const tm = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: tekstur(type), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide })); R.scene.add(tm); mesh.push(tm); }
  });
  window.Infra3d = { bruModell, modeller, F, ferjeGeo, ferjeLengde, iVann, zLok };
})();
