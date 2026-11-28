/* Riksbrudd – HYLLENE OG SKAPENE I LEIREN, 3D OG 2D (28. nov, ut9-mobler; brukeren: «et skikkelig lagringssystem med hyller som kan lagre
 * for eksempel peanøttsmør, alt slags mulig småting og hverdagslige ting» og «flere forskjellige hyller»).
 * Lagringen og reglene er spill/tinglager.js (LAGRING), byggesettets deler spill/byggesett.js (bs_trehylle … bs_tønnestativ), og hvordan
 * tingene ser ut på en hylle spill/hyller.js (Hyller.varer). Her:
 *  - Hyller3d.bygg(Bg, d, T2, z0, f): modellen av hylla/skapet i byggesettets nett (kalles fra tinglager-visning.js sin bygg3d, som
 *    byggesett-visning.js kaller via FabrikkSpill.bygg3d) – med tingene som står der nå: fyllingen og kategoriene fra tinglageret.
 *    Åpne hyller viser tingene; lukkede skap (kjøleskap, frys, kiste) er lukket.
 *  - Hyller3d.tegn2d(g, d, b, typ): eget symbol per hylletype i plantegningen (b = ruta på skjermen).
 *  - 3D lages på nytt (Byggesett.lag3d) når fyllingen på en hylle har endret seg et trinn (Hyller.trinn: tideler), sjekkes hvert 2. s.
 * Ingen nye lys, ingen egne materialer: alt går i byggesettets nett «farge» (hjørnefarger). Mål og farger er Claudes forslag.
 */
(function () {
  'use strict';
  const HY = window.Hyller; if (!HY) return;
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  // Claudes forslag
  const F = { hvit: hex('#d9dcd6'), grå: hex('#8a9094'), mørk: hex('#33373a'), tre: hex('#8f6c46'), lystTre: hex('#b9986a'), mørktre: hex('#5d4429'), stål: hex('#646b70'),
    galv: hex('#a9aeb1'), rød: hex('#b8382f'), blå: hex('#3f6178'), pall: hex('#a7865a'), glass: hex('#b9cfd6'), lys: hex('#eef3f2'), papp: hex('#a8875c') };
  const frø = d => ((((d && d.id) || 1) * 0.6180339887) % 1 + 1) % 1;
  // fyllingen og kategoriene på plassen (tinglagerets stabler for 'b' + byggets id)
  function innhold(d, typ) {
    const TS = window.TinglagerSpill, T = TS && TS.T && TS.T(), TL = window.Tinglager, Ti = window.Ting; if (!T || !TL || !Ti) return { fyll: 0, kat: [] };
    const D = TL.LAGRING[typ]; return HY.innhold(T, 'b' + d.id, D ? D.liter : 400, Ti.TING);
  }

  function bygg(Bg, d, T2, z0, f) {
    const BS = window.ByggesettRegler, U = BS.U, { boks, z3, gx, gy } = Bg, typ = T2.ting, z = z3(z0 + (d.n || 0) * BS.H), R = BS.ruter(d);
    const i0 = Math.min(...R.map(c => c[0])), j0 = Math.min(...R.map(c => c[1])), [w, h] = BS.fotRuter(d), cx = gx + (i0 + w / 2) * U, cy = gy + (j0 + h / 2) * U;
    const lx = (d.r || 0) % 2 === 0, ux = lx ? 1 : 0, uy = lx ? 0 : 1, sg = (d.r || 0) & 2 ? -1 : 1, px = -uy * sg, py = ux * sg;
    const l = (lx ? w : h) * U, b = (lx ? h : w) * U, s = Math.max(.15, f), ferdig = f >= .999;
    // en kasse i delens akser: x langs (−l/2 … l/2), y på tvers (fronten er +y), z fra gulvet (ganget med byggegraden)
    const K = (x0, x1, y0, y1, a, e, c) => boks('farge', c, cx + ux * (x0 + x1) / 2 + px * (y0 + y1) / 2, cy + uy * (x0 + x1) / 2 + py * (y0 + y1) / 2, ux, uy, Math.max(.01, x1 - x0), Math.max(.01, y1 - y0), z + a * s, z + e * s);
    const inn = ferdig ? innhold(d, typ) : { fyll: 0, kat: [] }, fr = frø(d);
    const varer = (o, tak) => { if (!(inn.fyll > 0)) return; for (const q of HY.varer(Object.assign({ fyll: inn.fyll, kat: inn.kat, f: fr }, o))) if (!tak || q[5] <= tak) K(q[0], q[1], q[2], q[3], q[4], q[5], q[6]); };
    const paller = o => { if (!(inn.fyll > 0)) return; for (const q of HY.paller(Object.assign({ fyll: inn.fyll, kat: inn.kat, f: fr }, o))) K(q[0], q[1], q[2], q[3], q[4], q[5], q[6]); };
    // en åpen reol: stolper (hver ~1,6 m), hyller på nivåene, bakplate (valgfri) og tingene
    const reol = (L, yc, dy, nv, H, cs, ch, o = {}) => {
      const n = Math.max(1, Math.round(L / 1.6)); for (let k = 0; k <= n; k++) { const x = -L / 2 + k * L / n; for (const y of [yc - dy / 2, yc + dy / 2 - .04]) K(x - .02, x + .02, y, y + .04, 0, H, cs); }
      for (const q of nv) K(-L / 2, L / 2, yc - dy / 2, yc + dy / 2, q - .03, q, ch); K(-L / 2, L / 2, yc - dy / 2, yc + dy / 2, H - .03, H, ch);
      if (o.bak) K(-L / 2, L / 2, yc - dy / 2, yc - dy / 2 + .02, 0, H, o.bak);
      varer({ l: L - .08, d: dy - .06, y0: yc - dy / 2 + .03, nivåer: nv, hv: o.hv || Math.max(.15, (nv[1] || H) - nv[0] - .06) });
    };
    const O = HY.OPPSETT[typ];
    // (ut9-mobler3) et lukket skap du har åpnet i lagerpanelet (Vis bare denne plassen) står åpent, med tingene synlige
    const TS = window.TinglagerSpill, åpen = ferdig && !!(TS && TS.plass && TS.plass() === 'b' + d.id);
    switch (typ) {
      case 'hyllereol': reol(l - .2, 0, .6, O.nivåer, 2.1, F.stål, F.lystTre, { hv: .42 }); return;
      case 'trehylle': reol(Math.min(1.1, l - .1), -b / 2 + .3, .34, O.nivåer, 2.0, F.tre, F.tre, { bak: F.mørktre }); return;
      case 'stålreol': reol(l - .2, 0, .55, O.nivåer, 2.1, F.galv, F.galv, { hv: .36 }); return;
      case 'smalhylle': reol(.5, -b / 2 + .25, .28, O.nivåer, 1.8, F.hvit, F.hvit, { bak: F.hvit }); return;
      case 'vitrine': { const L = Math.min(1, l - .15), yb = -b / 2 + .12, dy = .38;
        K(-L / 2, L / 2, yb, yb + dy, 0, .86, F.tre); K(-L / 2, L / 2, yb, yb + .02, .86, 1.95, F.tre); for (const x of [-L / 2, L / 2 - .04]) K(x, x + .04, yb, yb + dy, .86, 1.95, F.tre);
        K(-L / 2, L / 2, yb, yb + dy, 1.92, 1.97, F.tre); for (const q of [1.22, 1.56]) K(-L / 2 + .04, L / 2 - .04, yb + .02, yb + dy - .03, q - .02, q, F.glass);
        K(-.01, .01, yb + dy - .02, yb + dy, .86, 1.92, F.tre); K(-L / 2 + .04, L / 2 - .04, yb + dy - .015, yb + dy - .005, 1.9, 1.92, F.tre);
        varer({ l: L - .1, d: dy - .08, y0: yb + .03, nivåer: [.86, 1.22, 1.56], hv: .28 }); return; }
      case 'kjøkkenhylle': { const L = Math.min(1, l - .15), yb = -b / 2 + .1; K(-L / 2, L / 2, yb, yb + .55, 0, .86, F.hvit); K(-L / 2 - .02, L / 2 + .02, yb, yb + .58, .86, .9, F.mørk);
        K(-L / 2, L / 2, yb, yb + .02, .9, 1.95, F.lystTre); for (const q of O.nivåer) K(-L / 2, L / 2, yb + .02, yb + .2, q - .02, q, F.lystTre);
        varer({ l: L - .06, d: .17, y0: yb + .02, nivåer: O.nivåer, hv: .2 }); varer({ l: L - .2, d: .3, y0: yb + .15, nivåer: [.9], hv: .25, maks: 5 }); return; }
      case 'kjølereol': { const L = l - .2, yb = -b / 2 + .15, dy = .7; K(-L / 2, L / 2, yb, yb + .06, 0, 2, F.hvit); for (const x of [-L / 2, L / 2 - .05]) K(x, x + .05, yb, yb + dy, 0, 2, F.hvit);
        K(-L / 2, L / 2, yb, yb + dy, 0, .22, F.hvit); K(-L / 2, L / 2, yb, yb + .35, 1.78, 2, F.hvit); K(-L / 2 + .05, L / 2 - .05, yb + .3, yb + .34, 1.74, 1.78, F.lys);
        for (const q of O.nivåer.slice(1)) K(-L / 2 + .05, L / 2 - .05, yb + .06, yb + dy - .08, q - .02, q, F.grå); K(-L / 2, L / 2, yb + dy - .03, yb + dy, .22, .32, F.blå);
        varer({ l: L - .14, d: dy - .16, y0: yb + .08, nivåer: O.nivåer, hv: .3 }); return; }
      case 'hjørnehylle': { const x0 = -l / 2 + .08, y0 = -b / 2 + .08, e = .5; K(x0, x0 + .04, y0, y0 + .04, 0, 1.9, F.tre); K(x0 + e - .04, x0 + e, y0, y0 + .04, 0, 1.9, F.tre); K(x0, x0 + .04, y0 + e - .04, y0 + e, 0, 1.9, F.tre);
        for (const q of O.nivåer) K(x0, x0 + e, y0, y0 + e, q - .02, q, F.lystTre); K(x0, x0 + e, y0, y0 + e, 1.88, 1.9, F.lystTre);
        varer({ l: e - .06, d: e - .1, y0: y0 + .04, nivåer: O.nivåer, hv: .24 }); return; }
      case 'tønnestativ': { const L = l - .3; for (const x of [-L / 2, L / 2 - .1]) { K(x, x + .1, -.45, .45, 0, .25, F.mørktre); K(x, x + .1, -.45, -.35, .25, .55, F.mørktre); K(x, x + .1, .35, .45, .25, .55, F.mørktre); }
        const n = inn.fyll > 0 ? Math.max(1, Math.round(inn.fyll * 3)) : 0;
        for (let k = 0; k < 3; k++) { const x = -L / 2 + .15 + k * (L - .3) / 3, wx = (L - .3) / 3 - .06, full = k < n, c = full ? F.tre : F.lystTre;
          K(x, x + wx, -.36, .36, .25, .95, c); for (const y of [-.25, .2]) K(x - .01, x + wx + .01, y, y + .05, .24, .96, F.mørk); if (full) K(x + wx / 2 - .03, x + wx / 2 + .03, .36, .42, .32, .38, F.stål); } return; }
      case 'verktøyskap': { const L = Math.min(1, l - .15), yb = -b / 2 + .1; K(-L / 2, L / 2, yb, yb + .5, 0, .9, F.rød); for (let k = 0; k < 4; k++) K(-L / 2 + .03, L / 2 - .03, yb + .5, yb + .51, .06 + k * .21, .24 + k * .21, hex('#c9483f'));
        K(-L / 2, L / 2, yb, yb + .04, .9, 1.95, F.grå); K(-L / 2, L / 2, yb, yb + .12, 1.9, 1.95, F.rød);
        // verktøyet henger på tavla over skuffene (så mange som fyllingen sier)
        const n = Math.round(inn.fyll * 8), V = [F.rød, F.stål, F.mørk, hex('#d8b23a')]; for (let k = 0; k < n; k++) { const x = -L / 2 + .1 + (k % 4) * (L - .2) / 4, q = 1.05 + Math.floor(k / 4) * .4, ww = .05 + (k % 3) * .05;
          K(x, x + ww, yb + .04, yb + .08, q, q + .14 + (k % 2) * .12, V[(k + Math.floor(fr * 4)) % 4]); } return; }
      case 'arkivskap': { const L = Math.min(.9, l - .2), yb = -b / 2 + .1; K(-L / 2, L / 2, yb, yb + .6, 0, 1.3, F.grå);
        for (let k = 0; k < 4; k++) { const q = .05 + k * .31; K(-L / 2 + .03, L / 2 - .03, yb + .6, yb + .615, q, q + .28, hex('#9aa0a4')); K(-.08, .08, yb + .615, yb + .63, q + .2, q + .23, F.mørk); }
        // permer og esker oppå når skapet har noe i seg
        varer({ l: L - .1, d: .5, y0: yb + .05, nivåer: [1.3], hv: .3, maks: 8 }); return; }
      case 'medisinskap': { K(-.3, .3, -.2, .2, 0, 1.25, F.hvit); K(-.28, .28, .2, .21, .05, 1.2, F.glass); for (const q of [.4, .8]) K(-.27, .27, -.18, .18, q - .02, q, F.hvit);
        K(-.04, .04, .21, .22, .95, 1.15, F.rød); K(-.11, .11, .21, .22, 1.01, 1.09, F.rød); varer({ l: .5, d: .3, y0: -.17, nivåer: [.06, .4, .8], hv: .3 }); return; }
      case 'verktøytavle': { K(-l / 2 + .1, l / 2 - .1, -.12, .12, 0, .85, F.mørktre); K(-l / 2 + .15, l / 2 - .15, -.12, -.06, .85, 1.95, F.tre);
        varer({ l: l - .4, d: .2, y0: -.05, nivåer: [.85], hv: .2, maks: 6 });
        const n = Math.round(inn.fyll * 10), V = [F.rød, F.stål, F.mørk, hex('#d8b23a')]; for (let k = 0; k < n; k++) { const x = -l / 2 + .3 + (k % 5) * (l - .6) / 5, q = 1.1 + Math.floor(k / 5) * .4;
          K(x, x + .05 + (k % 3) * .05, -.06, -.02, q, q + .14 + (k % 2) * .1, V[(k + Math.floor(fr * 4)) % 4]); } return; }
      case 'garderobe': { const L = Math.min(1, l - .15), yb = -b / 2 + .08, dy = .6; K(-L / 2, L / 2, yb, yb + .02, 0, 2, F.tre); for (const x of [-L / 2, L / 2 - .03]) K(x, x + .03, yb, yb + dy, 0, 2, F.tre);
        K(-L / 2, L / 2, yb, yb + dy, 1.96, 2, F.tre); K(-L / 2, L / 2, yb, yb + dy, 0, .06, F.tre); K(-L / 2, L / 2, yb, yb + dy, 1.62, 1.65, F.tre); K(-L / 2 + .03, L / 2 - .03, yb + dy / 2 - .01, yb + dy / 2 + .01, 1.5, 1.52, F.stål);
        // to dører: den ene lukket, den andre står åpen ut til siden
        K(-L / 2, 0, yb + dy - .02, yb + dy, .06, 1.96, F.lystTre); K(L / 2, L / 2 + .02, yb + dy, yb + dy + L / 2, .06, 1.96, F.lystTre);
        const n = Math.round(inn.fyll * 6), KL = HY.KAT.klær.farger; for (let k = 0; k < n; k++) { const x = -L / 2 + .08 + k * (L - .16) / 6; K(x, x + .1, yb + .1, yb + dy - .08, .7 + (k % 2) * .1, 1.5, KL[(k + Math.floor(fr * 5)) % KL.length]); }
        varer({ l: L - .1, d: dy - .1, y0: yb + .04, nivåer: [1.65], hv: .28, maks: 4 }); return; }
      case 'pallplass': { for (const x of [-l / 2 + .1, -l / 2 + 1.3]) { if (x + 1.1 > l / 2) continue; for (const xx of [x, x + .5, x + 1]) K(xx, xx + .1, -.5, .5, 0, .14, F.pall); K(x, x + 1.1, -.5, .5, .1, .14, F.pall); }
        paller({ l: l - .1, d: 1, nivåer: [.14], hv: 1 }); return; }
      case 'pallreol': { for (const a of [-.5, .5]) for (const c of [-.5, .5]) K(a * (l - .2) - .05, a * (l - .2) + .05, c * (b - .2) - .05, c * (b - .2) + .05, 0, 3.2, F.blå);
        for (const q of [.15, 1.2, 2.25]) K(-l / 2 + .05, l / 2 - .05, -b / 2 + .05, b / 2 - .05, q, q + .08, hex('#d0782a'));
        for (const q of [.23, 1.28, 2.33]) { if (!(inn.fyll > 0)) break; for (const x of [-l / 2 + .25, .1]) if (x + 1.1 < l / 2) K(x, x + 1.1, -.4, .4, q, q + .14, F.pall); }
        paller({ l: l - .5, d: b - .4, nivåer: [.37, 1.42, 2.47], hv: .75 }); return; }
      // lukkede skap: som før, men litt finere
      case 'kjøleskap': if (åpen) { K(-.35, .35, -.35, -.31, 0, 1.85, F.hvit); for (const x of [-.35, .31]) K(x, x + .04, -.35, .3, 0, 1.85, F.hvit); K(-.35, .35, -.35, .3, 0, .08, F.hvit); K(-.35, .35, -.35, .3, 1.78, 1.85, F.hvit);
          for (const q of [.45, .85, 1.25]) K(-.31, .31, -.31, .28, q - .015, q, F.glass); K(.31, .35, .3, .98, .02, 1.83, F.lys); varer({ l: .58, d: .55, y0: -.3, nivåer: [.08, .45, .85, 1.25], hv: .3 }); return; }
        K(-.35, .35, -.35, .32, 0, 1.85, F.hvit); K(-.34, .34, .32, .35, .02, 1.12, F.lys); K(-.34, .34, .32, .35, 1.14, 1.83, F.lys); K(.26, .29, .35, .38, .8, 1.05, F.grå); K(.26, .29, .35, .38, 1.2, 1.45, F.grå); return;
      case 'frysboks': if (åpen) { K(-.52, .52, -.35, .35, .04, .5, F.hvit); for (const y of [-.35, .3]) K(-.52, .52, y, y + .05, .5, .84, F.hvit); for (const x of [-.52, .47]) K(x, x + .05, -.35, .35, .5, .84, F.hvit);
          K(-.53, .53, -.4, -.36, .84, 1.5, F.lys); varer({ l: .95, d: .6, y0: -.3, nivåer: [.5], hv: .3 }); return; }
        K(-.52, .52, -.35, .35, .04, .84, F.hvit); K(-.53, .53, -.36, .36, .84, .9, F.lys); K(-.45, -.3, .36, .39, .76, .82, F.grå); K(-.5, .5, -.33, .33, 0, .04, F.mørk); return;
      case 'kjølerom': K(-l / 2 + .05, l / 2 - .05, -b / 2 + .05, b / 2 - .05, 0, 2.4, F.hvit); K(-.45, .45, b / 2 - .05, b / 2 - .02, .05, 2.05, F.lys); K(.3, .36, b / 2 - .02, b / 2 + .04, 1, 1.25, F.stål);
        K(-l / 2 + .05, l / 2 - .05, -b / 2 + .05, b / 2 - .05, 2.4, 2.45, F.grå); K(-l / 2 + .2, -l / 2 + .8, -.3, .3, 2.45, 2.75, F.grå); return;
      case 'kiste': if (åpen) { K(-.45, .45, -.25, .25, 0, .06, F.mørktre); for (const y of [-.25, .21]) K(-.45, .45, y, y + .04, .06, .42, F.mørktre); for (const x of [-.45, .41]) K(x, x + .04, -.25, .25, .06, .42, F.mørktre);
          K(-.47, .47, -.31, -.27, .42, .96, F.tre); varer({ l: .82, d: .42, y0: -.21, nivåer: [.06], hv: .3 }); return; }
        K(-.45, .45, -.25, .25, 0, .42, F.mørktre); K(-.47, .47, -.27, .27, .42, .52, F.tre); for (const x of [-.32, .28]) K(x, x + .04, -.27, .27, 0, .53, F.mørk); K(-.05, .05, .27, .29, .34, .44, F.stål); return;
      case 'tønne': if (åpen) { K(-.31, .31, -.31, .31, 0, .9, F.blå); K(-.28, .28, -.28, .28, .9, .92, F.mørk); K(.33, .37, -.31, .31, 0, .64, F.blå); varer({ l: .5, d: .5, y0: -.25, nivåer: [.62], hv: .28, maks: 6 }); return; }
        K(-.31, .31, -.31, .31, 0, .92, F.blå); K(-.33, .33, -.33, .33, .3, .34, F.mørk); K(-.33, .33, -.33, .33, .64, .68, F.mørk); return;
    }
    return false;
  }

  // ---------- 2D: eget symbol per hylletype i plantegningen (b = ruta på skjermen; retningen fra d.r) ----------
  const FARGE2D = { trehylle: '#8f6c46', stålreol: '#8f979b', vitrine: '#7a5a3a', kjøkkenhylle: '#b9986a', kjølereol: '#d9e2e4', verktøyskap: '#a8423a', arkivskap: '#7c8286', smalhylle: '#c9c3b4',
    hjørnehylle: '#8f6c46', tønnestativ: '#5d4429' };
  function tegn2d(g, d, b, typ) {
    if (!FARGE2D[typ]) return false; const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(b.w, b.h), langsX = (d.r || 0) % 2 === 0;
    g.fillStyle = '#1b1712'; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1;
    const linjer = (n, c, w = 1) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); for (let k = 1; k < n; k++) { const t = k / n; if (langsX) { g.moveTo(b.x + b.w * t, b.y + 2); g.lineTo(b.x + b.w * t, b.y + b.h - 2); } else { g.moveTo(b.x + 2, b.y + b.h * t); g.lineTo(b.x + b.w - 2, b.y + b.h * t); } } g.stroke(); };
    const fyll = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeRect(x + .5, y + .5, w - 1, h - 1); };
    const smal = (a) => (langsX ? [b.x + 1, b.y + b.h * (1 - a), b.w - 2, b.h * a - 1] : [b.x + 1, b.y + 1, b.w * a, b.h - 2]);
    switch (typ) {
      case 'trehylle': fyll(...smal(.45), FARGE2D[typ]); linjer(4, 'rgba(240,226,176,.6)'); break;
      case 'stålreol': fyll(b.x + 1, b.y + 1, b.w - 2, b.h - 2, FARGE2D[typ]); linjer(5, 'rgba(30,34,36,.7)'); g.strokeStyle = 'rgba(30,34,36,.7)'; g.beginPath(); if (langsX) { g.moveTo(b.x + 2, cy); g.lineTo(b.x + b.w - 2, cy); } else { g.moveTo(cx, b.y + 2); g.lineTo(cx, b.y + b.h - 2); } g.stroke(); break;
      case 'vitrine': fyll(...smal(.5), FARGE2D[typ]); { const [x, y, w, h] = smal(.5); g.fillStyle = '#b9cfd6'; g.fillRect(x + w * .18, y + h * .2, w * .64, h * .6); } break;
      case 'kjøkkenhylle': fyll(...smal(.5), FARGE2D[typ]); g.fillStyle = '#7a3b2a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(b.x + b.w * (.25 + k * .25), cy, Math.max(1.2, r * .08), 0, 6.283); g.fill(); } break;
      case 'kjølereol': fyll(b.x + 1, b.y + 1, b.w - 2, b.h - 2, FARGE2D[typ]); g.fillStyle = '#3f6178'; if (langsX) g.fillRect(b.x + 2, b.y + b.h * .62, b.w - 4, b.h * .14); else g.fillRect(b.x + b.w * .62, b.y + 2, b.w * .14, b.h - 4); linjer(4, 'rgba(63,97,120,.6)'); break;
      case 'verktøyskap': fyll(...smal(.5), FARGE2D[typ]); g.strokeStyle = '#e8d9b0'; g.lineWidth = Math.max(1, r * .08); g.beginPath(); g.moveTo(cx - r * .22, cy + r * .22); g.lineTo(cx + r * .18, cy - r * .18); g.stroke();
        g.beginPath(); g.arc(cx + r * .2, cy - r * .2, r * .1, 0, 6.283); g.stroke(); break;
      case 'arkivskap': fyll(...smal(.6), FARGE2D[typ]); linjer(4, 'rgba(25,28,30,.8)'); break;
      case 'smalhylle': fyll(...smal(.3), FARGE2D[typ]); linjer(3, 'rgba(60,50,40,.6)'); break;
      case 'hjørnehylle': g.fillStyle = FARGE2D[typ]; g.beginPath(); g.moveTo(b.x + 1, b.y + b.h - 1); g.lineTo(b.x + 1, b.y + b.h * .45); g.lineTo(b.x + b.w * .55, b.y + b.h - 1); g.closePath(); g.fill(); g.stroke(); break;
      case 'tønnestativ': g.fillStyle = '#7a5a3a'; for (let k = 0; k < 3; k++) { const x = langsX ? b.x + b.w * (k + .5) / 3 : cx, y = langsX ? cy : b.y + b.h * (k + .5) / 3; g.beginPath(); g.arc(x, y, Math.max(2, r * (langsX ? Math.min(.4, b.w / b.h / 6.5) : Math.min(.4, b.h / b.w / 6.5))), 0, 6.283); g.fill(); g.stroke(); } break;
    }
    return true;
  }

  // ---------- 3D på nytt når fyllingen har endret seg et trinn (Byggesett.lag3d) ----------
  let sistTrinn = '';
  function trinnNøkkel() { const TS = window.TinglagerSpill, T = TS && TS.T && TS.T(), TL = window.Tinglager, Ti = window.Ting; if (!T || !TL || !TS.plasser) return '';
    const ut = [TS.plass ? 'å' + (TS.plass() || '') : '']; for (const P of TS.plasser()) { if (!P.bygg) continue; ut.push(P.id + ':' + HY.trinn(HY.innhold(T, P.id, P.liter, Ti.TING).fyll)); } return ut.join(','); }
  setInterval(() => { try { const R = typeof R3 !== 'undefined' ? R3 : null; if (!R || !R.ut || !window.THREE || R.bygger || !window.Byggesett || !Byggesett.lag3d) return;
    const n = trinnNøkkel(); if (n === sistTrinn) return; const før = sistTrinn; sistTrinn = n; if (før) { Byggesett.lag3d(); if (typeof skitten !== 'undefined') skitten = true; } } catch (e) { /* 3D ikke klart */ } }, 2000);

  // (ut9-mobler3) ÅPNE SKAP I HUSENE: når lutpanelet (spill/lut-visning.js) viser et lukket skap, settes window.MØBEL_ÅPEN = { i, type, k, fyll },
  // og interiøret i det bygget lages på nytt (Interior3d.bygOm) med døra åpen og tingene synlige (spill/interior3d.js). Lukkes panelet, lukkes døra.
  const LUKKET = { kjøleskap: 1, skap: 1, garderobe: 1, tønne: 1, fryseboks: 1 };
  let sistÅpen = '', sistLeir = '';
  function åpentNå() { const LS = window.LutSpill; if (!LS || !LS.erÅpen || !LS.erÅpen() || !LS.aktiv) return null; const c = LS.aktiv(); if (!c || !LUKKET[c.type] || !c.nk) return null;
    // nøkkelen er «bygg:type:nr» (spill/mobler.js) – nr er nummeret blant like møbler i planen
    const [si, , sk] = String(c.nk).split(':'), i = +si, k = +sk; if (!isFinite(i) || !isFinite(k)) return null; const n = c.B && typeof c.B === 'object' ? Object.keys(c.B.t || c.B).length : 2; return { i, type: c.type, k, fyll: Math.min(1, .15 + n * .15) }; }
  setInterval(() => { try { const I3 = window.Interior3d; if (!I3 || !I3.bygOm) return;
    const å = åpentNå(), n = å ? `${å.i}:${å.type}:${å.k}:${å.fyll}` : ''; if (n !== sistÅpen) { const før = window.MØBEL_ÅPEN; window.MØBEL_ÅPEN = å; sistÅpen = n; if (før && (!å || før.i !== å.i)) I3.bygOm(før.i); if (å) I3.bygOm(å.i); }
    // leirens bygg med interiør: lag det på nytt når tingene i leiren har endret seg et trinn
    const P = (I3.aktivP ? I3.aktivP() : []).filter(q => q.leir && q.bygg); const ln = P.map(q => { const v = I3.leirVarer(q); return q.bygg.i + ':' + (v ? HY.trinn(v.fyll) + v.kat.map(x => x.kat).join('') : ''); }).join(',');
    if (ln !== sistLeir) { const før = sistLeir; sistLeir = ln; if (før) for (const q of P) I3.bygOm(q.bygg.i); } } catch (e) { /* 3D ikke klart */ } }, 600);

  window.Hyller3d = { åpentNå, bygg, tegn2d, innhold, trinnNøkkel, F, FARGE2D };
})();
