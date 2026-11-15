'use strict';
// Interiør i 3D (brukeren 15. nov: «Alle bygg skal ha interiør, og en skal kunne gå inn i dem»). Reglene står i spill/interior.js.
// Mens du går (Gå), får byggene innen 30 m et interiør: gulv, himling, innervegger, vinduer, møbler og en åpen dør. Det lages ett
// bygg om gangen (høyst hvert kvarte sekund) og tas bort igjen når du er over 50 m unna, så det koster lite – også på telefon.
// hus3d i index.html legger døra og klassen på omrisset, og her får omrisset planen sin («inne»), som hindring3d bruker for
// vegger, døråpning og møbler. Gulvet og trappa foran døra hentes av gange.js herfra.
// Bare første etasje. Vinduene er lyse flater (du ser ikke ut gjennom dem), og døra ser lukket ut utenfra til du er nær.
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const NÆR = 30, BORT = 50, MAKS = 10;
  const aktive = new Map();   // omriss P -> { plan, nett, lys }
  let forU = null, sist = 0, lysMat = null, mat = null;
  // farger
  const GULV = { hus: [.52, .4, .27], hytte: [.5, .37, .24], leil: [.55, .45, .33], kontor: [.42, .44, .47], skole: [.6, .55, .45], sykehus: [.66, .7, .68], butikk: [.72, .7, .66],
    industri: [.5, .5, .49], lager: [.52, .52, .5], låve: [.42, .34, .24], uthus: [.48, .47, .45], kirke: [.45, .33, .24], hangar: [.5, .5, .5], terminal: [.62, .62, .6] };
  const VEGG = { hus: [.86, .83, .76], hytte: [.72, .58, .4], leil: [.88, .87, .83], kontor: [.85, .86, .86], skole: [.87, .84, .72], sykehus: [.86, .9, .88], butikk: [.88, .87, .84],
    industri: [.66, .67, .68], lager: [.7, .7, .68], låve: [.5, .37, .25], uthus: [.56, .45, .33], kirke: [.9, .88, .82], hangar: [.68, .7, .72], terminal: [.85, .86, .87] };
  const UTEN_VINDU = { låve: 1, uthus: 1, lager: 1, hangar: 1 };
  const TRE = [.5, .36, .22], LYST_TRE = [.72, .58, .4], HVIT = [.9, .9, .88], GRÅ = [.55, .56, .57], MØRK = [.2, .2, .22], STÅL = [.62, .64, .66];
  const STOFF = [[.35, .4, .5], [.5, .3, .28], [.4, .45, .35], [.55, .5, .42], [.3, .32, .36], [.6, .45, .3]];

  // Delene i et møbel: kasser [x0, x1, y0, y1, z0, z1, farge] i meter i møbelets egne akser (x langs bredden, y fra ryggen −d/2 til fronten +d/2)
  function deler(m) {
    const b = m.b / 2, d = m.d / 2, h = m.h, f = STOFF[Math.floor(m.f * STOFF.length) % STOFF.length], K = [];
    const k = (x0, x1, y0, y1, z0, z1, c) => K.push([x0, x1, y0, y1, z0, z1, c]);
    const bein = (z, c = MØRK, t = .05) => { for (const sx of [-1, 1]) for (const sy of [-1, 1]) k(sx * (b - t) - t / 2, sx * (b - t) + t / 2, sy * (d - t) - t / 2, sy * (d - t) + t / 2, 0, z, c); };
    switch (m.type) {
      case 'sofa': k(-b, b, -d, d, .12, .42, f); k(-b, b, -d, -d + .22, .42, h, f); k(-b, -b + .18, -d, d, .42, .62, f); k(b - .18, b, -d, d, .42, .62, f); break;
      case 'lenestol': k(-b, b, -d, d, .12, .42, f); k(-b, b, -d, -d + .2, .42, h, f); k(-b, -b + .14, -d, d, .42, .6, f); k(b - .14, b, -d, d, .42, .6, f); break;
      case 'salongbord': k(-b, b, -d, d, h - .05, h, LYST_TRE); bein(h - .05, LYST_TRE); break;
      case 'tvbenk': k(-b, b, -d, d, 0, h, MØRK); k(-b * .75, b * .75, -.04, .02, h + .05, h + .7, [.06, .06, .08]); k(-.15, .15, -.1, .1, h, h + .05, MØRK); break;
      case 'bokhylle': case 'hylle': k(-b, b, -d, -d + .03, 0, h, TRE); k(-b, -b + .03, -d, d, 0, h, TRE); k(b - .03, b, -d, d, 0, h, TRE);
        for (let z = .05; z < h; z += .38) { k(-b, b, -d, d, z, z + .03, TRE); if (z + .3 < h) k(-b + .06, b - .06 - m.f * .3, -d + .05, d - .06, z + .03, z + .26, STOFF[Math.floor(z * 7 + m.f * 5) % STOFF.length]); } break;
      case 'spisebord': case 'pult': case 'kateter': case 'arbeidsbenk': { const c = m.type === 'arbeidsbenk' ? [.4, .32, .22] : LYST_TRE; k(-b, b, -d, d, h - .05, h, c); bein(h - .05, m.type === 'arbeidsbenk' ? STÅL : c, .06);
        if (m.type === 'pult') { k(-.25, .25, -.1, 0, h, h + .35, [.08, .08, .1]); k(b - .5, b - .1, -d, d, .1, h - .05, c); }
        if (m.type === 'arbeidsbenk') { k(-b + .1, -b + .5, -.15, .15, h, h + .25, [.7, .2, .15]); k(-b, b, -d, d, .15, .2, c); } break; }
      case 'stol': case 'kontorstol': k(-b, b, -d, d, .4, .46, m.type === 'stol' ? LYST_TRE : MØRK); k(-b, b, -d, -d + .05, .46, h, m.type === 'stol' ? LYST_TRE : MØRK);
        if (m.type === 'stol') bein(.4, LYST_TRE, .04); else k(-.04, .04, -.04, .04, 0, .4, STÅL); break;
      case 'plante': k(-.16, .16, -.16, .16, 0, .32, [.6, .36, .25]); k(-.2, .2, -.2, .2, .32, h, [.2, .42, .2]); break;
      case 'teppe': k(-b, b, -d, d, 0, .02, f); break;
      case 'kjøkkenbenk': k(-b, b, -d, d, 0, h - .04, HVIT); k(-b, b, -d, d + .02, h - .04, h, [.3, .3, .32]); k(-b, b, -d, -d + .34, 1.45, 2.15, HVIT); k(-.3, .3, -.2, .15, h, h + .02, STÅL); break;
      case 'kjøleskap': k(-b, b, -d, d, 0, h, HVIT); k(b - .06, b - .03, d, d + .03, .9, 1.5, STÅL); break;
      case 'komfyr': k(-b, b, -d, d, 0, h, HVIT); k(-b + .04, b - .04, -d + .04, d - .04, h, h + .01, MØRK); k(-b, b, -d, -d + .3, 1.5, 1.7, STÅL); break;
      case 'seng': case 'dobbeltseng': case 'sykeseng': { const s = m.type === 'sykeseng'; k(-b, b, -d, d, s ? .3 : .12, s ? .45 : .3, s ? STÅL : TRE); k(-b + .03, b - .03, -d + .05, d - .03, s ? .45 : .3, h, HVIT);
        k(-b + .03, b - .03, -d + .75, d - .03, h, h + .06, f); k(-b, b, -d, -d + .05, 0, h + .45, s ? STÅL : TRE);
        for (const x of m.type === 'dobbeltseng' ? [-b / 2, b / 2] : [0]) k(x - .28, x + .28, -d + .1, -d + .5, h, h + .1, HVIT); if (s) bein(.3, STÅL); break; }
      case 'nattbord': k(-b, b, -d, d, 0, h, TRE); k(-.07, .07, -.07, .07, h, h + .28, [.9, .85, .6]); break;
      case 'skap': case 'arkivskap': k(-b, b, -d, d, 0, h, m.type === 'skap' ? HVIT : GRÅ); k(-.01, .01, d, d + .01, .1, h - .1, MØRK); break;
      case 'toalett': k(-b * .8, b * .8, -d, -d + .2, 0, .8, HVIT); k(-b * .8, b * .8, -d + .2, d, 0, h - .05, HVIT); k(-b * .85, b * .85, -d + .18, d, h - .05, h, HVIT); break;
      case 'vask': k(-b, b, -d, d, .55, h, HVIT); k(-.08, .08, -d, -d + .12, 0, .55, HVIT); k(-b * .8, b * .8, -d, -d + .03, 1.2, 1.8, [.7, .8, .85]); break;
      case 'dusj': k(-b, b, -d, d, 0, .06, HVIT); k(-b, -b + .02, -d, d, .06, h, [.75, .85, .88]); k(-.03, .03, -d, -d + .05, 1, h, STÅL); break;
      case 'skohylle': k(-b, b, -d, d, .15, .18, TRE); k(-b, b, -d, d, h - .03, h, TRE); k(-b + .1, -b + .35, -d + .04, d - .04, .18, .3, MØRK); k(.05, .3, -d + .04, d - .04, .18, .32, [.4, .25, .15]); break;
      case 'knagger': k(-b, b, -d, -d + .03, 1.55, 1.65, TRE); k(-b + .15, -b + .5, -d + .03, d + .08, .9, 1.6, STOFF[Math.floor(m.f * 6)]); k(.1, .45, -d + .03, d + .06, 1, 1.6, MØRK); break;
      case 'skranke': k(-b, b, -d, d, 0, h - .04, LYST_TRE); k(-b - .03, b + .03, -d - .03, d + .03, h - .04, h, HVIT); break;
      case 'benk': case 'kirkebenk': case 'seterad': { const c = m.type === 'seterad' ? [.25, .3, .4] : TRE; k(-b, b, -d + .1, d, .4, .46, c); k(-b, b, -d, -d + .1, .2, h, c); k(-b, -b + .06, -d, d, 0, .5, c); k(b - .06, b, -d, d, 0, .5, c); break; }
      case 'skolepult': k(-b, b, -d + .25, d, h - .04, h, LYST_TRE); k(-b + .05, -b + .09, -d + .3, d - .05, 0, h - .04, STÅL); k(b - .09, b - .05, -d + .3, d - .05, 0, h - .04, STÅL);
        k(-.2, .2, -d - .2, -d + .2, .42, .46, [.3, .4, .55]); k(-.2, .2, -d - .2, -d - .16, .46, .82, [.3, .4, .55]); break;
      case 'tavle': k(-b, b, -d, d, .9, .9 + h, [.14, .26, .2]); k(-b, b, -d, d + .04, .86, .9, LYST_TRE); break;
      case 'reol': case 'pallereol': { const c = m.type === 'reol' ? HVIT : [.85, .45, .1]; for (const sx of [-1, 1]) for (const sy of [-1, 1]) k(sx * b - (sx > 0 ? .06 : 0), sx * b + (sx > 0 ? 0 : .06), sy * d - (sy > 0 ? .06 : 0), sy * d + (sy > 0 ? 0 : .06), 0, h, m.type === 'reol' ? GRÅ : [.15, .3, .6]);
        const dz = m.type === 'reol' ? .42 : 1.3; for (let z = m.type === 'reol' ? .12 : .1, n = 0; z < h - .2; z += dz, n++) { k(-b, b, -d, d, z, z + .05, c);
          const hv = Math.min(dz - .12, m.type === 'reol' ? .28 : .95); for (let x = -b + .08, j = 0; x < b - .3; x += m.type === 'reol' ? .42 : 1.3, j++) if ((j * 7 + n * 3 + Math.floor(m.f * 9)) % 5) k(x, x + (m.type === 'reol' ? .34 : 1.1), -d + .06, d - .06, z + .05, z + .05 + hv * (.6 + ((j + n) % 3) * .2), m.type === 'reol' ? STOFF[(j + n * 2) % 6] : [.66, .52, .34]); } break; }
      case 'kasse': k(-b, b, -d, d, 0, h - .1, GRÅ); k(-b, b * .4, -d + .1, d - .1, h - .1, h - .08, MØRK); k(b * .55, b * .95, -.15, .15, h - .1, h + .25, MØRK); break;
      case 'kjøledisk': k(-b, b, -d, d, 0, .75, HVIT); k(-b, b, -d, -d + .1, .75, h, HVIT); k(-b + .05, b - .05, -d + .1, d - .05, .75, .9, [.75, .85, .9]); break;
      case 'pall': k(-b, b, -d, d, 0, .14, LYST_TRE); k(-b + .04, b - .04, -d + .04, d - .04, .14, h * (.6 + m.f * .4), [.66, .52, .34]); break;
      case 'maskin': k(-b, b, -d, d, 0, h * .55, [.25, .42, .35]); k(-b * .6, b * .2, -d * .7, d * .5, h * .55, h, [.3, .5, .42]); k(b * .4, b * .9, -d * .3, d * .3, h * .55, h * .8, [.85, .7, .1]); break;
      case 'tønne': k(-b, b, -d, d, 0, h, m.f > .5 ? [.2, .3, .5] : [.5, .2, .15]); break;
      case 'høyball': k(-b, b, -d, d, 0, h, [.78, .66, .32]); break;
      case 'bås': k(-b, -b + .08, -d, d, 0, h, TRE); k(b - .08, b, -d, d, 0, h, TRE); k(-b, b, -d, -d + .08, 0, h, TRE); k(-b, b, -d + .2, -d + .7, .5, .75, GRÅ); break;
      case 'traktor': k(-b * .7, b * .7, -d * .2, d * .9, .7, 1.4, [.75, .15, .1]); k(-b * .75, b * .75, -d * .9, -d * .1, .8, h, [.75, .15, .1]); k(-b * .6, b * .6, -d * .85, -d * .15, 1.5, 2.2, [.6, .72, .78]);
        for (const sx of [-1, 1]) { k(sx * b - (sx > 0 ? .45 : 0), sx * b + (sx > 0 ? 0 : .45), -d * .95, -d * .15, 0, 1.5, MØRK); k(sx * b * .9 - (sx > 0 ? .25 : 0), sx * b * .9 + (sx > 0 ? 0 : .25), d * .45, d * .9, 0, .85, MØRK); } break;
      case 'bil': { const c = STOFF[Math.floor(m.f * 6)]; k(-b, b, -d, d, .3, .85, c); k(-b * .9, b * .9, -d * .55, d * .35, .85, h, [.55, .65, .72]); k(-b * .88, b * .88, -d * .5, d * .3, h - .06, h, c);
        for (const sx of [-1, 1]) for (const sy of [-.62, .62]) k(sx * b - (sx > 0 ? .2 : 0), sx * b + (sx > 0 ? 0 : .2), sy * d - .32, sy * d + .32, 0, .62, MØRK); break; }
      case 'vedstabel': for (let z = 0; z < h; z += .16) k(-b, b, -d, d, z, z + .14, z * 6 % 2 > 1 ? [.6, .45, .3] : [.52, .38, .24]); break;
      case 'alter': k(-b, b, -d, d, 0, h, HVIT); k(-b - .05, b + .05, -d - .05, d + .05, h, h + .04, [.6, .12, .14]); k(-.04, .04, -.04, .04, h + .04, h + .8, [.8, .68, .3]); k(-.25, .25, -.04, .04, h + .5, h + .58, [.8, .68, .3]); break;
      case 'prekestol': k(-b, b, -d, d, 0, .5, TRE); k(-b, b, -d, -d + .06, .5, h, TRE); k(-b, -b + .06, -d, d, .5, h, TRE); k(b - .06, b, -d, d, .5, h, TRE); break;
      case 'fly': k(-.6, .6, -d, d * .8, .9, 2, HVIT); k(-b, b, -.7, .5, 1.8, 1.95, HVIT); k(-1.6, 1.6, -d, -d + .9, 1.6, 1.7, HVIT); k(-.06, .06, -d, -d + 1, 1.7, h + .3, [.75, .15, .1]);
        k(-.1, .1, d * .8, d * .8 + .05, .5, 2.4, MØRK); for (const sx of [-1.2, 1.2]) k(sx - .1, sx + .1, -.3, .1, 0, .9, MØRK); k(-.1, .1, d * .5, d * .6, 0, .9, MØRK); break;
      case 'verktøyvogn': k(-b, b, -d, d, .12, h, [.7, .15, .12]); k(-b - .02, b + .02, -d - .02, d + .02, h, h + .03, MØRK); break;
      default: k(-b, b, -d, d, 0, h, GRÅ);
    }
    return K;
  }

  function bygg(R, u, P) {
    const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX, D = P.dør;
    // døra må ligge på omrisset (saltakshus tegnes som et rettet rektangel): flytt den til nærmeste kant
    let best = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1.4) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, w = Math.min(D.w, L * .7), t = Math.max(w / 2 + .1, Math.min(L - w / 2 - .1, (D.x - a[0]) * ex + (D.y - a[1]) * ey)), x = a[0] + ex * t, y = a[1] + ey * t, av = Math.hypot(x - D.x, y - D.y);
      if (!best || av < best.av) best = { av, x, y, ux: ex, uy: ey, w }; }
    if (!best) return null;
    const pl = Interior.plan(P, { i: P.bygg.i, kl: P.bygg.kl, h: P.bygg.h, dør: best }), I = pl.inngang;
    let maks = -Infinity, mx = 0, my = 0; for (const [x, y] of P) { maks = Math.max(maks, terr(x, y)); mx += x; my += y; } maks = Math.max(maks, terr(mx / P.length, my / P.length));
    // gulvet ligger over det høyeste terrenget under bygget (ellers stikker bakken opp gjennom gulvet); trappa foran døra er lang nok
    // til at du kan gå opp (høyst 0,6 m stigning per meter), og høyst 3,5 m høy
    const ute0 = terr(I.x + I.nx * 1.5, I.y + I.ny * 1.5); pl.gulv = Math.min(Math.max(maks + .08, D.z0 + .05), ute0 + 3.5);
    pl.trapp = Math.max(1.5, Math.min(6, (pl.gulv - ute0) / .6)); const ute = terr(I.x + I.nx * pl.trapp, I.y + I.ny * pl.trapp);
    const g0 = pl.gulv, tak = pl.tak, pos = [], kol = [], lpos = [];
    const tri = (a, b, c, f) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (let i = 0; i < 3; i++) kol.push(f[0], f[1], f[2]); };
    const fk = (a, b, c, d, f) => { tri(a, b, c, f); tri(a, c, d, f); };
    // en kasse i møbelets akser: midt (x, y), retning a
    const kasse = (x, y, a, [x0, x1, y0, y1, z0, z1, f]) => { const c = Math.cos(a), s = Math.sin(a), p = (lx, ly, z) => [x + lx * c - ly * s, y + lx * s + ly * c, g0 + z];
      const A = p(x0, y0, z0), B = p(x1, y0, z0), C = p(x1, y1, z0), E = p(x0, y1, z0), A1 = p(x0, y0, z1), B1 = p(x1, y0, z1), C1 = p(x1, y1, z1), E1 = p(x0, y1, z1), m = f.map(v => v * .86), n = f.map(v => v * .93);
      fk(A1, B1, C1, E1, f); fk(A, B, B1, A1, m); fk(B, C, C1, B1, n); fk(C, E, E1, C1, m); fk(E, A, A1, E1, n); };
    // gulv og himling
    const kl = pl.kl, gf = GULV[kl] || GULV.hus, vf = VEGG[kl] || VEGG.hus, T = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), []);
    for (const [a, b, c] of T) { tri([P[a][0], P[a][1], g0], [P[b][0], P[b][1], g0], [P[c][0], P[c][1], g0], gf); tri([P[a][0], P[a][1], g0 + tak], [P[c][0], P[c][1], g0 + tak], [P[b][0], P[b][1], g0 + tak], [.9, .9, .88]); }
    // ytterveggenes innside (3 cm innenfor veggen), med åpning ved inngangen og vinduer som lyse flater
    const dørH = Math.min(tak - .1, Math.max(2, D.hh || 2.1)), hjørner = pl.vegger.flatMap(v => [[v.ax, v.ay], [v.bx, v.by]]);
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, ix = -ey * .03, iy = ex * .03, pt = (t, z, inn = 1) => [a[0] + ex * t + ix * inn, a[1] + ey * t + iy * inn, g0 + z];
      const stykke = (t0, t1, z0, z1) => { if (t1 - t0 > .01) fk(pt(t0, z0), pt(t1, z0), pt(t1, z1), pt(t0, z1), vf); };
      const td = (I.x - a[0]) * ex + (I.y - a[1]) * ey, avD = Math.abs((I.x - a[0]) * ey - (I.y - a[1]) * ex), harDør = avD < .05 && td > 0 && td < L && Math.abs(ex * I.ux + ey * I.uy) > .99;
      if (harDør) { const p = Math.max(0, td - I.w / 2), q = Math.min(L, td + I.w / 2); stykke(0, p, 0, tak); stykke(q, L, 0, tak); stykke(p, q, dørH, tak);
        // døråpningen lyser som dagen utenfor, og dørbladet står åpent inn i rommet
        lpos.push(...pt(p, 0, .5), ...pt(q, 0, .5), ...pt(q, dørH, .5), ...pt(p, 0, .5), ...pt(q, dørH, .5), ...pt(p, dørH, .5));
        if (I.w < 2.4) kasse(a[0] + ex * p - ey * .04, a[1] + ey * p + ex * .04, Math.atan2(ey, ex) + 1.75, [0, Math.min(1, I.w) - .05, -.02, .02, 0, dørH - .05, TRE]); }
      else stykke(0, L, 0, tak);
      if (UTEN_VINDU[kl] || L < 2.6) continue;
      const n = Math.max(1, Math.floor(L / 3.2)), kirke = kl === 'kirke', z0 = kirke ? 1.2 : kl === 'butikk' ? .5 : .9, z1 = Math.min(tak - .25, kirke ? 4.5 : kl === 'butikk' ? 2.6 : 2.1), bw = kl === 'butikk' ? 2 : 1.1;
      for (let j = 0; j < n; j++) { const t = L * (j + .5) / n; if (harDør && Math.abs(t - td) < I.w / 2 + bw / 2 + .3) continue;
        const X = a[0] + ex * t, Y = a[1] + ey * t; if (hjørner.some(h => Math.hypot(h[0] - X, h[1] - Y) < bw / 2 + .25)) continue;
        lpos.push(...pt(t - bw / 2, z0, 1.6), ...pt(t + bw / 2, z0, 1.6), ...pt(t + bw / 2, z1, 1.6), ...pt(t - bw / 2, z0, 1.6), ...pt(t + bw / 2, z1, 1.6), ...pt(t - bw / 2, z1, 1.6));
        // karm
        for (const [p0, p1, q0, q1] of [[t - bw / 2 - .05, t + bw / 2 + .05, z0 - .05, z0], [t - bw / 2 - .05, t + bw / 2 + .05, z1, z1 + .05], [t - bw / 2 - .05, t - bw / 2, z0, z1], [t + bw / 2, t + bw / 2 + .05, z0, z1], [t - .02, t + .02, z0, z1]])
          fk(pt(p0, q0, 2), pt(p1, q0, 2), pt(p1, q1, 2), pt(p0, q1, 2), HVIT); }
    }
    // skilleveggene: 10 cm tykke
    const sf = vf.map(v => v * .95);
    for (const v of pl.vegger) { const L = Math.hypot(v.bx - v.ax, v.by - v.ay); kasse((v.ax + v.bx) / 2, (v.ay + v.by) / 2, Math.atan2(v.by - v.ay, v.bx - v.ax), [-L / 2, L / 2, -.05, .05, 0, tak, sf]); }
    // trapp foran døra når gulvet ligger over bakken: trinn på ca. 18 cm, så langt ut som pl.trapp
    if (pl.gulv - ute > .12) { const n = Math.max(1, Math.round((pl.gulv - ute) / .18)), a = Math.atan2(I.uy, I.ux), dl = pl.trapp / n;
      for (let j = 0; j < n; j++) kasse(I.x + I.nx * dl * (j + .5), I.y + I.ny * dl * (j + .5), a, [-I.w / 2 - .1, I.w / 2 + .1, -dl / 2, dl / 2, ute - g0 - .4, (ute - g0) + (pl.gulv - ute) * (1 - (j + .5) / n), GRÅ]); }
    // møblene
    for (const m of pl.møbler) for (const K of deler(m)) kasse(m.x, m.y, m.a, K);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3)); geo.computeVertexNormals();
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x24221e });
    if (!lysMat) lysMat = new THREE.MeshBasicMaterial({ color: 0xcfe0ee, side: THREE.DoubleSide, fog: false });
    const nett = new THREE.Mesh(geo, mat); nett.userData.interior = true; R.scene.add(nett);
    let lys = null; if (lpos.length) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3)); lys = new THREE.Mesh(lg, lysMat); R.scene.add(lys); }
    return { plan: pl, nett, lys, trekanter: pos.length / 9 };
  }
  function fjern(R, P) { const o = aktive.get(P); if (!o) return; for (const m of [o.nett, o.lys]) if (m) { R.scene.remove(m); m.geometry.dispose(); } delete P.inne; aktive.delete(P); }
  function tøm(R) { for (const P of [...aktive.keys()]) fjern(R, P); forU = null; }
  const avstand = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, Interior.avstSeg(x, y, a[0], a[1], b[0], b[1])); } return Interior.inni(P, x, y) ? 0 : d; };

  function oppdater(R, tving) {
    const u = R.ut;
    if (!R.fot || !u || !u.hus || !R.hindre) { if (aktive.size) tøm(R); return; }
    if (forU !== u) { tøm(R); forU = u; }
    const nå = performance.now(); if (!tving && nå - sist < 250) return; sist = nå;
    const x = R.bane.x, y = R.bane.y;
    for (const [P] of [...aktive]) if (avstand(P, x, y) > BORT) fjern(R, P);
    // dagslyset i vinduene og døråpningen følger himmelen
    if (lysMat && R.scene.fog) lysMat.color.copy(R.scene.fog.color).lerp(new THREE.Color(1, 1, 1), .25);
    // nærmeste bygg uten interiør innen NÆR (rutenettet på 20 m fra hindringer())
    let best = null, bd = NÆR; const sett = new Set();
    for (let a = Math.floor((x - NÆR) / 20); a <= Math.floor((x + NÆR) / 20); a++) for (let c = Math.floor((y - NÆR) / 20); c <= Math.floor((y + NÆR) / 20); c++)
      for (const o of R.hindre.get(a + ',' + c) || []) { const P = o.P; if (!P || sett.has(P) || aktive.has(P) || !P.dør || !P.bygg || P.utenInne) continue; sett.add(P); const d = avstand(P, x, y); if (d < bd) { bd = d; best = P; } }
    if (!best) return;
    if (aktive.size >= MAKS) { let lengst = null, ld = bd; for (const [P] of aktive) { const d = avstand(P, x, y); if (d > ld) { ld = d; lengst = P; } } if (!lengst) return; fjern(R, lengst); }
    let o = null; try { o = bygg(R, u, best); } catch (e) { console.warn('interiør:', e); }
    if (!o) { best.utenInne = true; return; }
    aktive.set(best, o); best.inne = o.plan;
  }
  KROKER.ramme3d.push(R => oppdater(R));
  // Høyden du står på inne og på trappa foran døra (ellers null)
  function høyde(x, y, terreng) { for (const [, o] of aktive) { const h = Interior.høyde(o.plan, x, y, terreng); if (h !== null) return h; } return null; }
  const påTrapp = (x, y) => { for (const [, o] of aktive) if (Interior.påTrapp(o.plan, x, y)) return true; return false; };
  const inne = (x, y) => { for (const [P] of aktive) if (Interior.inni(P, x, y)) return P; return null; };
  window.Interior3d = { høyde, inne, påTrapp, oppdater: tving => r3() && oppdater(R3, tving), aktive: () => [...aktive.values()], antall: () => aktive.size, deler,
    // til vakten: alle interiørene nå – rom, møbler, trekanter, og om inngangen er fri
    sjekk: () => [...aktive.values()].map(o => ({ kl: o.plan.kl, rom: o.plan.rom.length, møbler: o.plan.møbler.length, trekanter: o.trekanter, gulv: o.plan.gulv, inngang: o.plan.inngang, fri: !Interior.blokkert(o.plan, o.plan.inngang.inn[0], o.plan.inngang.inn[1]) })) };
})();
