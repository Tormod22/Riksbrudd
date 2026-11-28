'use strict';
// ETASJENE I 3D (fase B2, 28. nov). Reglene: spill/etasjer.js. Modellen: spill/bygning.js (den samme som plantegningen i 2D bruker:
// Plantegning2D.nyttHus/modell, med endringsloggen). 1. etasje er fortsatt interiøret fra spill/interior3d.js (Interior.plan), men
// når huset har flere etasjer, får det modellen under byggingen (modellG, i biter): møblene som trappene har tatt bort i modellen,
// tas bort også i 3D (samme 1. etasje i 2D og 3D), og himlingen/gulvet får hull der trappene går (interior3d.js leser pl.hullUV).
// Når du går inn i et slikt hus, bygges de andre etasjene her (i biter, mellom bildene): gulv med trapphull, yttervegger (innsiden)
// med vinduene som hull, skillevegger med døråpninger, himling, møbler (Interior3d.deler), trapper med gelender og stiger, loft
// med skråtak under mønet, kjeller under bakken, og en sperret dør i trapperommet i stengte høyhusetasjer.
// Bare etasjen du står i (og etasjen under, som du ser ned trappa til) vises; etasjene over er skjult (de vises mens du går i trappa).
// Høyden: Interior3d.høyde/påTrapp spør her først (Etasjer.stå: trappa fra den enden som hører til etasjen), og kollisjonen i de
// andre etasjene går gjennom pl.over i Interior.blokkert (Etasjer.blokkert). Hus du ikke går inn i, får bare modellen (ingen nett).
// Tallene er Claudes forslag (BIT).
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), E = () => window.Etasjer, PT = () => window.Plantegning2D;
  // ms = arbeid per bilde, BORT = så langt fra huset før etasjene kastes (m); HALL = klasser uten etasjer (ingen modell)
  const BIT = { ms: 6, BORT: 25, maksModeller: 12 };
  const HALL = { industri: 1, lager: 1, låve: 1, kirke: 1, hangar: 1, terminal: 1, lagerhall: 1 };
  const STAT = { modeller: 0, modellMs: 0, lengst: 0, bygget: 0, byggMs: 0, trekanter: 0 };
  // aktiv = huset du står i: { P, h, m, ox, oy, g0, nett: Map(n -> Mesh), trapp: Mesh, n, jobb }
  let aktiv = null, MAT = null, rafNr = 0;
  const iEtt = it => { let r; while (!(r = it.next()).done); return r.value; };

  // ---------- modellen (under byggingen av interiøret) ----------
  // Plantegning2D-huset for P i 3D-utsnittet u: samme modell som plantegningen (ramme, tak, dør etter hus3d-reglene)
  function hus2d(P, u) {
    const P2 = PT(); if (!P2 || !P.bygg || !window.Plantegning) return null;
    const Pv = P.map(p => [p[0] + u.cx, p[1] + u.cy]), e = { i: P.bygg.i, t: P.bygg.t, h: P.bygg.h, k: P.bygg.k };
    const h = P2.nyttHus(Plantegning.arealS(Pv) < 0 ? Pv.slice().reverse() : Pv, e, P.bygg.tett || 0); return h;
  }
  const brukLogg = h => { const P2 = PT(); if (!h.m0) return null; const L = window.Plantegning ? Plantegning.endringer(P2.logg(), h.i) : []; h.m = L.length && window.Bygning ? Bygning.medEndringer(h.m0, L) : h.m0; return h.m; };
  // gir modellen (bygges i biter med yield), eller null for haller, leirens bygg og bygg uten modell
  function* modellG(R, u, P) {
    if (!P || P.leir || !P.bygg || HALL[P.bygg.kl] || !window.Bygning || !PT()) return null;
    const h = hus2d(P, u); if (!h) return null;
    if (!h.klar && !h.feil) { const t0 = performance.now(), it = Bygning.fraKartG(h.P, h.info); let r, t = t0;
      try { while (!(r = it.next()).done) { const n = performance.now(); STAT.lengst = Math.max(STAT.lengst, n - t); t = n; yield 'etasjer'; } h.m0 = r.value; h.klar = true; }
      catch (e) { h.feil = String(e && e.message || e); console.warn('etasjer:', e); return null; }
      STAT.modeller++; STAT.modellMs += performance.now() - t0; }
    if (!h.klar) return null; return brukLogg(h) && { h, m: h.m };
  }
  // 1. etasje i interiøret = 1. etasje i modellen: møbler trappene har tatt bort, tas bort; hull i himling og gulv der trappene går
  function tilpass(pl, P, u, svar) {
    if (!svar || !svar.m) return; const { h, m } = svar, ox = h.o[0] - u.cx, oy = h.o[1] - u.cy, e1 = E().etasje(m, 1), A = pl.akse;
    P.etasjer = { i: h.i, ox, oy }; if (!e1) return;
    // møblene: modellens møbel nr. k er planens møbel nr. k (Bygning lager etasjen av den samme planen); står de ikke på samme sted,
    // er planene ulike (bygård med trapperom), og da røres ingenting
    const like = pl.møbler.every((q, k) => { const b = e1.møbler.find(w => w.id === k); return !b || (Math.abs(b.x + ox - q.x) < .06 && Math.abs(b.y + oy - q.y) < .06); });
    if (like && m.trapper.length) { const før = pl.møbler.length, ider = new Set(e1.møbler.map(w => w.id)); pl.møbler = pl.møbler.filter((q, k) => ider.has(k)); P.etasjer.fjernet = før - pl.møbler.length; }
    P.etasjer.like = like;
    // ulike planer (bygård med trapperom, sykehjem …): 1. etasje i 3D lages av modellen, så 2D og 3D er like og trappene står fritt
    if (!like) { planFra(pl, e1, ox, oy); P.etasjer.fraModell = true; }
    const flytt = t => Object.assign({}, t, { x: t.x + ox, y: t.y + oy });
    pl.hullUV = { tak: E().trapperVed(m, 1).filter(t => t.fra === 1).map(t => E().trappUV(flytt(t), A)), gulv: E().trapperVed(m, 1).filter(t => t.til === 1).map(t => E().trappUV(flytt(t), A)) };
  }

  // 1. etasje fra modellen i interiørets form (interior.js sin plan): rom (u0–v1 i byggets akser), skillevegger delt rundt
  // døråpningene, døråpningene [x, y, dx, dy, bredde] og møblene; inngangene, omrisset og ytterveggene står som før
  function planFra(pl, e1, ox, oy) {
    const A = pl.akse, Es = E(), uv = (x, y) => [x * A.ux + y * A.uy, x * A.vx + y * A.vy];
    pl.rom = e1.rom.map(r => { const U = r.P.map(p => uv(p[0] + ox, p[1] + oy)); return { u0: Math.min(...U.map(q => q[0])), u1: Math.max(...U.map(q => q[0])), v0: Math.min(...U.map(q => q[1])), v1: Math.max(...U.map(q => q[1])), rolle: r.rolle, areal: r.areal, andel: r.andel || 1 }; });
    const vegger = [], dører = [];
    for (const w of e1.vegger) { if (w.type !== 'skille' || !Es.står(w)) continue; const a = [w.a[0] + ox, w.a[1] + oy], b = [w.b[0] + ox, w.b[1] + oy], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, hull = e1.åpninger.filter(o => o.vegg === w.id && o.type !== 'vindu' && o.tilstand !== 'ødelagt').map(o => [Math.max(0, o.t - o.b / 2), Math.min(L, o.t + o.b / 2), o]).sort((p, q) => p[0] - q[0]);
      let t = 0; for (const [p, q, o] of hull) { if (p > t + .02) vegger.push({ ax: a[0] + ex * t, ay: a[1] + ey * t, bx: a[0] + ex * p, by: a[1] + ey * p }); t = Math.max(t, q);
        if (!o.sperre && o.tilstand !== 'revet') dører.push([a[0] + ex * o.t, a[1] + ey * o.t, ex, ey, o.b]); }
      if (L > t + .02) vegger.push({ ax: a[0] + ex * t, ay: a[1] + ey * t, bx: b[0], by: b[1] }); }
    pl.vegger = vegger; pl.dører = dører;
    pl.møbler = e1.møbler.filter(q => q.tilstand !== 'revet').map(q => ({ type: q.type, x: q.x + ox, y: q.y + oy, a: q.a, b: q.b, d: q.d, h: q.h, sperrer: q.sperrer, f: ((q.id * 2654435761 + pl.i) >>> 0) / 4294967296 }));
    delete pl.naboer; delete pl.bærbare;
  }
  // ---------- nettene ----------
  const FARGE = { gulv: [.6, .46, .31], kjellergulv: [.5, .5, .48], loftgulv: [.52, .4, .27], vegg: [.88, .86, .8], skille: [.84, .83, .77], kjellervegg: [.66, .66, .63],
    himling: [.93, .93, .9], loft: [.56, .43, .3], trapp: [.52, .38, .25], gelender: [.3, .22, .15], sperret: [.42, .3, .18], planke: [.62, .46, .26], stige: [.45, .33, .2] };
  function lag() { return { pos: [], kol: [] }; }
  const tri = (g, a, b, c, f) => { g.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (let k = 0; k < 3; k++) g.kol.push(f[0], f[1], f[2]); };
  const fk = (g, a, b, c, d, f) => { tri(g, a, b, c, f); tri(g, a, c, d, f); };
  const mørk = (f, v) => [f[0] * v, f[1] * v, f[2] * v];
  // en kasse: midt (x, y), retning a, [x0, x1, y0, y1, z0, z1] i egne akser, z0 = gulvet
  function kasse(g, x, y, a, z, [x0, x1, y0, y1, z0, z1], f) {
    const c = Math.cos(a), s = Math.sin(a), p = (lx, ly, lz) => [x + lx * c - ly * s, y + lx * s + ly * c, z + lz];
    const A0 = p(x0, y0, z0), B0 = p(x1, y0, z0), C0 = p(x1, y1, z0), D0 = p(x0, y1, z0), A1 = p(x0, y0, z1), B1 = p(x1, y0, z1), C1 = p(x1, y1, z1), D1 = p(x0, y1, z1);
    fk(g, A1, B1, C1, D1, f); fk(g, A0, B0, B1, A1, mørk(f, .8)); fk(g, B0, C0, C1, B1, mørk(f, .9)); fk(g, C0, D0, D1, C1, mørk(f, .85)); fk(g, D0, A0, A1, D1, mørk(f, .92));
  }
  // flate polygon (omriss i xy) i høyden z, med rette hull (byggets akser A)
  function flate(g, P, A, R, z, f, ned) {
    const Puv = P.map(([x, y]) => [x * A.ux + y * A.uy, x * A.vx + y * A.vy]);
    for (const S of E().hull(Puv, R)) { let T; try { T = THREE.ShapeUtils.triangulateShape(S.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { continue; }
      const xy = p => [p[0] * A.ux + p[1] * A.vx, p[0] * A.uy + p[1] * A.vy, z];
      for (const [a, b, c] of T) if (ned) tri(g, xy(S[a]), xy(S[c]), xy(S[b]), f); else tri(g, xy(S[a]), xy(S[b]), xy(S[c]), f); }
  }
  // en vegg fra a til b (tynn kasse), høyde topp(t) langs veggen (loftet), med åpningene som hull: [{ t, b, ned, h }]
  function vegg(g, a, b, z, tykk, topp, hull, f) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .02) return; const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, nx = -ey * tykk / 2, ny = ex * tykk / 2;
    // delt i biter på høyst 0,6 m (skråtaket) og ved kantene av hvert hull
    const T = [0, L]; for (const o of hull) T.push(Math.max(0, o.t - o.b / 2), Math.min(L, o.t + o.b / 2)); for (let t = .6; t < L; t += .6) T.push(t); T.sort((p, q) => p - q);
    const side = (t0, t1, z0, z1, s, sk) => { const P0 = [a[0] + ex * t0 + nx * s, a[1] + ey * t0 + ny * s], P1 = [a[0] + ex * t1 + nx * s, a[1] + ey * t1 + ny * s];
      fk(g, [P0[0], P0[1], z + z0], [P1[0], P1[1], z + z0], [P1[0], P1[1], z + z1], [P0[0], P0[1], z + z1], mørk(f, sk)); };
    for (let k = 0; k < T.length - 1; k++) { const t0 = T[k], t1 = T[k + 1]; if (t1 - t0 < .01) continue; const tm = (t0 + t1) / 2, h0 = topp(t0), h1 = topp(t1), hm = Math.min(h0, h1);
      const o = hull.find(q => tm > q.t - q.b / 2 && tm < q.t + q.b / 2), bånd = o ? [[0, o.ned], [o.ned + o.h, hm]] : [[0, hm]];
      for (const [z0, z1] of bånd) { if (z1 - z0 < .01) continue; side(t0, t1, z0, z1, 1, .95); side(t0, t1, z0, z1, -1, .88); }
      // toppen på skrå (loftet): en trekant oppå
      if (!o && Math.abs(h0 - h1) > .01) for (const s of [1, -1]) { const P0 = [a[0] + ex * t0 + nx * s, a[1] + ey * t0 + ny * s], P1 = [a[0] + ex * t1 + nx * s, a[1] + ey * t1 + ny * s];
        tri(g, [P0[0], P0[1], z + hm], [P1[0], P1[1], z + hm], h0 > h1 ? [P0[0], P0[1], z + h0] : [P1[0], P1[1], z + h1], mørk(f, .9)); } }
  }
  // en trapp (rett løp med trinn og gelender, eller stige) fra høyden z0 til z1
  function trapp(g, t, ox, oy, z0, z1) {
    const x = t.x + ox, y = t.y + oy, hl = t.l / 2, hb = t.b / 2, rise = z1 - z0;
    if (t.form === 'stige') { for (const s of [-1, 1]) kasse(g, x, y, t.a, z0, [-hl, -hl + .06, s * hb - .03, s * hb + .03, 0, rise + .9], FARGE.stige);
      // stigen står på skrå: vangene som kasser i trinn, trinnene hver 0,28 m
      const n = Math.max(3, Math.round(rise / .28)); for (let k = 1; k <= n; k++) { const f = k / n, u = -hl + t.l * f; kasse(g, x, y, t.a, z0, [u - .03, u + .03, -hb, hb, rise * f - .03, rise * f], FARGE.trapp);
        for (const s of [-1, 1]) kasse(g, x, y, t.a, z0, [u - .03, u + .03, s * hb - .025, s * hb + .025, rise * f - .3, rise * f + .02], FARGE.stige); }
      return; }
    const n = Math.max(3, Math.round(rise / .18)), dl = t.l / n;
    for (let k = 0; k < n; k++) { const u0 = -hl + k * dl; kasse(g, x, y, t.a, z0, [u0, u0 + dl, -hb, hb, Math.max(0, rise * k / n - .25), rise * (k + 1) / n], k % 2 ? FARGE.trapp : mørk(FARGE.trapp, .93)); }
    // gelender: stolper og en håndlist som følger trappa
    for (const s of [-1, 1]) { for (let k = 0; k <= n; k += 3) { const u = -hl + k * dl; kasse(g, x, y, t.a, z0, [u - .025, u + .025, s * hb - .025, s * hb + .025, rise * k / n, rise * k / n + .9], FARGE.gelender); }
      const c = Math.cos(t.a), sn = Math.sin(t.a), p = (u, v, z) => [x + u * c - v * sn, y + u * sn + v * c, z0 + z];
      fk(g, p(-hl, s * hb, .86), p(hl, s * hb, rise + .86), p(hl, s * hb, rise + .94), p(-hl, s * hb, .94), FARGE.gelender); }
  }
  // én etasje (ikke 1.): gulv, vegger, himling/skråtak, møbler; stengte etasjer får en sperret dør ved trappa
  function* etasjeG(m, et, ox, oy, g0) {
    const g = lag(), A = m.akse, Es = E(), z = g0 + et.z, P = m.P.map(p => [p[0] + ox, p[1] + oy]), flytt = t => Object.assign({}, t, { x: t.x + ox, y: t.y + oy });
    const opp = Es.trapperVed(m, et.n).filter(t => t.fra === et.n), ned = Es.trapperVed(m, et.n).filter(t => t.til === et.n);
    const Ao = { ux: A.ux, uy: A.uy, vx: A.vx, vy: A.vy };
    flate(g, P, Ao, ned.map(t => Es.trappUV(flytt(t), Ao)), z + .005, et.kjeller ? FARGE.kjellergulv : et.loft ? FARGE.loftgulv : FARGE.gulv, false); yield 'gulv';
    const loftTopp = (x, y) => Es.loftHøyde(m, x - ox, y - oy);
    for (const w of et.vegger) { if (!Es.står(w)) continue; const a = [w.a[0] + ox, w.a[1] + oy], b = [w.b[0] + ox, w.b[1] + oy], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .02) continue;
      const hull = et.åpninger.filter(o => o.vegg === w.id).map(o => ({ t: o.t, b: o.b, ned: o.type === 'vindu' ? o.ned : 0, h: o.tilstand === 'revet' ? 99 : o.type === 'vindu' ? o.h : (et.stengt ? 0 : o.h) })).filter(o => o.h > 0);
      // åpningen der en trapp møter en skillevegg (Etasjer.trappÅpninger)
      if (w.type === 'skille') for (const q of Es.trappÅpninger(m, et.n, w)) hull.push({ t: q.t, b: q.b, ned: 0, h: Math.min(2.1, et.takhøyde - .1) });
      // ytterveggen: innsiden (3 cm inn) i hele etasjehøyden; skilleveggene i takhøyden
      const ytter = w.type !== 'skille', ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, inn = ytter ? .08 : 0, ai = [a[0] - ey * inn, a[1] + ex * inn], bi = [b[0] - ey * inn, b[1] + ex * inn];
      const topp = et.loft ? t => Math.max(.05, loftTopp(ai[0] + ex * t, ai[1] + ey * t)) : () => (ytter ? et.høyde : et.takhøyde);
      vegg(g, ai, bi, z, ytter ? .06 : (w.tykk || .1), topp, hull, et.kjeller ? FARGE.kjellervegg : ytter ? FARGE.vegg : FARGE.skille); }
    yield 'vegger';
    if (et.loft) {
      // skråtaket: to halvdeler (delt langs mønet), hver en flate som stiger fra raftet til mønet
      const vm = (A.v0 + A.v1) / 2, Puv = m.P.map(([x, y]) => [x * A.ux + y * A.uy, x * A.vx + y * A.vy]);
      for (const halv of [Es.hull(Puv, [{ u0: -1e5, u1: 1e5, v0: vm, v1: 1e5 }]), Es.hull(Puv, [{ u0: -1e5, u1: 1e5, v0: -1e5, v1: vm }])]) for (const S of halv) {
        let T; try { T = THREE.ShapeUtils.triangulateShape(S.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { continue; }
        const xyz = p => { const x = p[0] * A.ux + p[1] * A.vx, y = p[0] * A.uy + p[1] * A.vy; return [x + ox, y + oy, z + Math.max(.05, Es.loftHøyde(m, x, y)) - .02]; };
        for (const [a, b, c] of T) tri(g, xyz(S[a]), xyz(S[c]), xyz(S[b]), FARGE.loft); }
      // sperrene: en mørk stripe hver 0,6 m langs mønet
      for (let uu = A.u0 + .3; uu < A.u1 - .2; uu += .6) for (const s of [-1, 1]) { const v0 = vm, v1 = s > 0 ? A.v1 - .05 : A.v0 + .05, pt = v => { const x = uu * A.ux + v * A.vx, y = uu * A.uy + v * A.vy; return [x + ox, y + oy, z + Math.max(.05, Es.loftHøyde(m, x, y)) - .05]; };
        const a = pt(v0), b = pt(v1), dx = A.ux * .04, dy = A.uy * .04; fk(g, [a[0] - dx, a[1] - dy, a[2]], [a[0] + dx, a[1] + dy, a[2]], [b[0] + dx, b[1] + dy, b[2]], [b[0] - dx, b[1] - dy, b[2]], mørk(FARGE.loft, .7)); }
    } else {
      // himlingen med hull for trappene opp, og «sjakten» rundt hullet opp til gulvet over
      const over = m.etasjer[m.etasjer.indexOf(et) + 1], zOver = over ? g0 + over.z : z + et.høyde;
      flate(g, P, Ao, opp.map(t => Es.trappUV(flytt(t), Ao)), z + et.takhøyde, FARGE.himling, true);
      for (const t of opp) { const r = Es.trappUV(flytt(t), Ao), c = [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]].map(([uu, v]) => [uu * A.ux + v * A.vx, uu * A.uy + v * A.vy]);
        for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; fk(g, [a[0], a[1], z + et.takhøyde], [b[0], b[1], z + et.takhøyde], [b[0], b[1], zOver], [a[0], a[1], zOver], mørk(FARGE.himling, .8)); } }
    }
    yield 'himling';
    // møblene (Interior3d.deler gir kassene; egne for loftets og kjellerens ting)
    const D = window.Interior3d && Interior3d.deler, EGNE = { flyttekasse: [.66, .52, .36], kiste: [.4, .28, .16], skrot: [.45, .42, .38], fyrkjele: [.35, .36, .38], tønne: [.3, .4, .3] };
    let nM = 0;
    for (const q of et.møbler) { if (q.tilstand === 'revet') continue; const x = q.x + ox, y = q.y + oy;
      if (EGNE[q.type] || !D) { kasse(g, x, y, q.a, z, [-q.b / 2, q.b / 2, -q.d / 2, q.d / 2, 0, q.h], q.tilstand === 'hel' ? (EGNE[q.type] || [.5, .5, .5]) : [.3, .2, .15]);
        if (q.type === 'skrot') kasse(g, x + .2, y - .1, q.a + .6, z, [-.3, .3, -.2, .2, q.h, q.h + .25], [.5, .3, .2]); }
      else { const mm = { type: q.type, b: q.b, d: q.d, h: q.h, f: ((q.id * 2654435761) >>> 0) / 4294967296 }; let K; try { K = D(mm); } catch (e) { K = []; }
        for (const k of K) kasse(g, x, y, q.a, z, [k[0], k[1], k[2], k[3], k[4], k[5]], k[6] || [.5, .5, .5]); }
      if (++nM % 6 === 0) yield 'møbler'; }
    // stengt etasje (høyhus): en sperret dør ved hver trapp – planker på kryss
    if (et.stengt) for (const t of Es.trapperVed(m, et.n)) { const c = Math.cos(t.a), s = Math.sin(t.a), vx = -s, vy = c;
      for (const ende of [t.fra === et.n ? -1 : 1]) { const d = t.l / 2 + Es.REGLER.stengtRepos - .1, x = t.x + ox + c * d * ende, y = t.y + oy + s * d * ende, a = Math.atan2(vy, vx);
        kasse(g, x, y, a, z, [-.6, .6, -.05, .05, 0, 2.1], FARGE.sperret); for (const [z0, v] of [[.5, .5], [1.3, -.5]]) kasse(g, x, y, a + v, z + z0, [-.75, .75, -.08, -.05, 0, .14], FARGE.planke); } }
    return g;
  }
  function nett(g) {
    if (!g.pos.length) return null; const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.kol, 3)); geo.computeVertexNormals();
    if (!MAT) MAT = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x201e1b });
    const me = new THREE.Mesh(geo, MAT); me.userData.kilde = 'etasjer3d'; STAT.trekanter += g.pos.length / 9; return me;
  }
  // alle etasjene og trappene i huset du står i, i biter
  function* byggG(R, a) {
    const t0 = performance.now(), { m, ox, oy, g0 } = a, Es = E();
    // trappene først (de trengs straks), så etasjene nærmest deg
    const g = lag(); for (const t of m.trapper) { if (!Es.står(t)) continue; const lo = Es.etasje(m, t.fra), hi = Es.etasje(m, t.til); if (lo && hi) trapp(g, t, ox, oy, g0 + lo.z, g0 + hi.z); yield 'trapp'; }
    a.trapp = nett(g); if (a.trapp) R.scene.add(a.trapp);
    const rekke = m.etasjer.filter(e => e.n !== 1).sort((p, q) => Math.abs(p.n - a.n) - Math.abs(q.n - a.n));
    for (const et of rekke) { const gg = yield* etasjeG(m, et, ox, oy, g0); const me = nett(gg); if (me) { me.userData.etasje = et.n; R.scene.add(me); a.nett.set(et.n, me); } synlig(a); yield 'etasje'; }
    STAT.bygget++; STAT.byggMs += performance.now() - t0; a.ferdig = true;
  }
  function kast(R) { const a = aktiv; if (!a) return; for (const me of [a.trapp, ...a.nett.values()]) { if (!me) continue; if (R && R.scene) R.scene.remove(me); me.geometry.dispose(); }
    if (a.P && a.P.inne) delete a.P.inne.over; aktiv = null; settEtasje2D(null, 1); }
  // hvilke etasjer som vises: din og den under; den over mens du står i trappa
  function synlig(a) { const på = a.trappNå !== null && a.trappNå !== undefined, Es = E(), t = på ? a.m.trapper.find(q => q.id === a.trappNå) : null;
    for (const [n, me] of a.nett) me.visible = n === a.n || n === forrige(a, a.n) || (t && (n === t.fra || n === t.til));
    // interiøret i 1. etasje (interior3d) vises når du er i 1. etasje, i kjelleren eller i 2.
    for (const o of window.Interior3d && Interior3d.aktive ? Interior3d.aktive() : []) if (o.plan === a.P.inne) for (const me of o.nett) me.visible = Math.abs(a.n) <= 2 || (t && (t.fra === 1 || t.til === 1));
    void Es; }
  const forrige = (a, n) => { const k = a.m.etasjer.findIndex(e => e.n === n); return k > 0 ? a.m.etasjer[k - 1].n : null; };

  // ---------- karakterens etasje (felles med 2D: Etasjer2D.S) ----------
  function settEtasje2D(a, n, p) { const S = window.Etasjer2D && Etasjer2D.S; if (!S) return; if (!a) { if (S.hus !== null && !S.gang && aktivFra3d) { S.hus = null; S.n = 1; S.p = null; aktivFra3d = false; } return; }
    S.hus = a.h.i; S.n = n; S.p = p; aktivFra3d = true; }
  let aktivFra3d = false;
  const lokal = (a, x, y) => [x - a.ox, y - a.oy];
  // HØYDEN der du står (gange.js via Interior3d.høyde): null = som før (1. etasje / ute)
  function høyde(x, y) { const a = aktiv; if (!a) return null; if (!Interior.inni(a.P, x, y)) return null; const [mx, my] = lokal(a, x, y), r = E().stå(a.m, a.n, mx, my);
    if (!r || (a.n === 1 && r.trapp === null)) return null; return a.g0 + r.z; }
  function påTrapp(x, y) { const a = aktiv; if (!a || !Interior.inni(a.P, x, y)) return false; const [mx, my] = lokal(a, x, y), r = E().stå(a.m, a.n, mx, my); return !!r && r.trapp !== null; }
  // kollisjonen (Interior.blokkert -> pl.over): i 1. etasje bare trappene, ellers hele etasjen
  function sperrer(x, y) { const a = aktiv; if (!a) return undefined; const [mx, my] = lokal(a, x, y), Es = E();
    if (a.n === 1) return Es.trappSperrer(a.m, 1, mx, my) ? true : Es.iKorridor(a.m, 1, mx, my) && !yttervegg(a, x, y) ? false : undefined; return Es.blokkert(a.m, a.n, mx, my); }
  const yttervegg = (a, x, y) => Interior.avstKant(a.P, x, y) < .25;

  // ---------- hver ramme ----------
  let meldt = null;
  function ramme(R) {
    if (!R.fot || !R.ut || !window.Interior3d || !E()) { if (aktiv) kast(R); return; }
    const k = window.Gange && Gange.kropp ? Gange.kropp() : null, x = k ? k.x : R.bane.x, y = k ? k.y : R.bane.y;
    if (aktiv && (aktiv.u !== R.ut || !aktiv.P.inne || (!Interior.inni(aktiv.P, x, y) && Interior.avstKant(aktiv.P, x, y) > BIT.BORT))) kast(R);
    if (!aktiv) { const P = Interior3d.inne(x, y); if (!P || !P.etasjer || !P.inne) return; const h = PT() && PT().hus(P.etasjer.i), m = h && h.m; if (!m || m.etasjer.length < 2) return;
      aktiv = { P, h, m, u: R.ut, ox: P.etasjer.ox, oy: P.etasjer.oy, g0: P.inne.gulv, nett: new Map(), trapp: null, n: 1, trappNå: null, jobb: null, ferdig: false };
      aktiv.jobb = byggG(R, aktiv); P.inne.over = sperrer; planlegg(); }
    const a = aktiv; if (!Interior.inni(a.P, x, y)) { if (a.n !== 1) { a.n = 1; synlig(a); } a.trappNå = null; settEtasje2D(null, 1); return; }
    const [mx, my] = lokal(a, x, y), r = E().stå(a.m, a.n, mx, my), før = a.n;
    if (r) { a.n = r.n; a.trappNå = r.trapp; }
    if (a.n !== før || a.trappNå !== a.sistTrapp) { a.sistTrapp = a.trappNå; synlig(a); }
    if (a.n !== før) { const et = E().etasje(a.m, a.n); if (et && meldt !== a.h.i + ':' + a.n && typeof logg === 'function') { meldt = a.h.i + ':' + a.n; logg(et.stengt ? `${et.navn}: trapperommet er sperret.` : `Du er i ${E().navn(et)}.`); } }
    settEtasje2D(a, a.n, { x: mx, y: my });
  }
  function planlegg() { if (rafNr || !aktiv || !aktiv.jobb) return; rafNr = requestAnimationFrame(() => { rafNr = 0; const R = r3(), a = aktiv; if (!R || !a || !a.jobb) return; const frist = performance.now() + BIT.ms;
    try { for (;;) { const s = a.jobb.next(); if (s.done) { a.jobb = null; break; } if (performance.now() >= frist) break; } } catch (e) { console.warn('etasjer i 3D:', e); a.jobb = null; }
    planlegg(); }); }
  if (typeof KROKER !== 'undefined' && KROKER.ramme3d) KROKER.ramme3d.push(R => { try { ramme(R); } catch (e) { console.warn('etasjer i 3D:', e); } });

  // ---------- leting i den etasjen du står i (knappen ved de andre inne-knappene) ----------
  let knapp = null;
  function knappSteg() {
    if (!knapp) { knapp = document.createElement('button'); knapp.id = 'etasjeknapp'; knapp.type = 'button'; knapp.style.cssText = 'display:none';
      knapp.className = ''; const rad = document.getElementById('inneknapper'); (rad || document.body).appendChild(knapp);
      knapp.addEventListener('click', ev => { ev.preventDefault(); const a = aktiv, E2 = window.Etasjer2D; if (!a || !E2) return; const hh = E2.husAv(a.h.i); if (!hh) return;
        if (E2.erLett(hh, a.n)) E2.let2d(hh, a.n, true); else E2.let2d(hh, a.n); }); }
    const a = aktiv, E2 = window.Etasjer2D, hh = a && E2 ? E2.husAv(a.h.i) : null;
    let t = ''; if (a && hh && a.n !== 1 && a.trappNå === null && r3() && R3.fot) { const et = E().etasje(a.m, a.n);
      if (et && !et.stengt) { const j = E2.S.leter; t = j ? `Leter … ${Math.max(0, Math.ceil(j.sek - (performance.now() - j.start) / 1000))} s` : !E2.erLett(hh, a.n) ? `Let gjennom ${E().navn(et)}` : E2.rest(hh, a.n) && window.LeteSpill && LeteSpill.plassTil(E2.rest(hh, a.n)) ? 'Hent det som ligger igjen' : ''; } }
    if (knapp.textContent !== t) knapp.textContent = t; knapp.style.display = t ? 'block' : 'none';
    if (t) { knapp.style.cssText = 'display:block;min-height:40px;padding:5px 16px;background:rgba(28,23,15,.92);border:1px solid #c9b26a;color:#f0e2b0;font:inherit;font-size:15px;cursor:pointer;pointer-events:auto'; }
  }
  setInterval(() => { try { knappSteg(); } catch (e) { /* ingen knapp */ } }, 300);

  window.Etasjer3d = { BIT, STAT, modellG, tilpass, høyde, påTrapp, sperrer, aktiv: () => aktiv, etasje: P => (aktiv && (!P || P === aktiv.P) ? aktiv.n : 1),
    // vakta: hele byggingen nå (uten å vente på bildene)
    ferdig: () => { const a = aktiv; if (a && a.jobb) { iEtt(a.jobb); a.jobb = null; } return !!(a && a.ferdig); },
    nett: () => (aktiv ? [...aktiv.nett.entries()].map(([n, me]) => ({ n, synlig: me.visible, trekanter: me.geometry.attributes.position.count / 3 })) : []),
    kast: () => kast(r3()), knapp: () => knapp, steg: () => { const R = r3(); if (R) ramme(R); } };
})();
