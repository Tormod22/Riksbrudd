'use strict';
// VAKT for pakka «maskiner» (ut9, 28. nov – brukeren: «flere forskjellige maskiner til industri … korrekt innredning»).
// (1) Reglene i siden (spill/maskiner.js + industri.js + interior.js): alle bransjene får en produksjonslinje med minst to maskiner,
//     kassemodellene er byttet ut (knuseren, filetmaskinen … har mange deler), ingen maskin i linja står i en døråpning (friInngang
//     tar ingen av dem), og gangveien fra døra til midten av hallen er fri. Selvtest: en maskin lagt med vilje i døråpningen skal fanges.
// (2) Maskinlivet (spill/maskiner-visning.js): MaskinerSpill.kilder() gir bare maskiner som går (ProduksjonSpill.status), ikke de som står.
// (3) Plantegningen (2D): et prøvehus av type sagbruk tegner maskinsymbolene (MaskinerSpill.tegnet2d).
// (4) I 3D (når 3D er på): et prøvebygg av type stein får knuserne i hallen innenfor trekantgrensen, og en sagbenk som går får et sagblad
//     som roterer (matrisen endres mellom to bilder); står den, er bladet borte.
// Setter alt tilbake: prøvehusene, kameraet, fokuset, gangen, tempo og funksjonene som ble byttet ut for prøven.
module.exports = {
  navn: 'maskiner (industrimaskiner, linjer, symboler og liv)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, M = window.Maskiner, I = window.Industri, In = window.Interior, MS = window.MaskinerSpill;
      ok(M && I && In && MS, 'Maskiner/MaskinerSpill mangler (maskiner.js før industri.js, maskiner-visning.js etter industri-visning.js)');
      if (!M || !I || !In || !MS) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms));
      // (1) reglene
      const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], P0 = rekt(34, 20), dør = { x: 17, y: 0, ux: 1, uy: 0, w: 4 };
      const plan = (ind, i) => In.plan(P0, { i, kl: 'industri', h: 9, ind, dør });
      const linje = pl => pl.møbler.filter(m => m.linje !== undefined);
      const uten = [], iDør = [], stengt = []; ut.linjer = {};
      // i døråpningen: fotavtrykket går inn i åpningen eller 0,9 m rett innenfor
      const iÅpning = (pl, m) => { const c = Math.cos(m.a), s = Math.sin(m.a); return (pl.innganger || [pl.inngang]).some(q => { const ss = [], dd = [];
        for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = m.x + a * m.b / 2 * c - b * m.d / 2 * s, y = m.y + a * m.b / 2 * s + b * m.d / 2 * c; ss.push((x - q.x) * q.ux + (y - q.y) * q.uy); dd.push(-((x - q.x) * q.nx + (y - q.y) * q.ny)); }
        return Math.min(...ss) < q.w / 2 - .05 && Math.max(...ss) > -q.w / 2 + .05 && Math.min(...dd) < .9 && Math.max(...dd) > 0; }); };
      for (const ind of I.ALLE) { if (ind === 11) continue; const pl = plan(ind, 4100 + ind), L = linje(pl); ut.linjer[ind] = L.map(m => m.type).join(',');
        if (L.length < 2) uten.push(ind);
        const før = L.length; In.friInngang(pl); if (linje(pl).length !== før || linje(pl).some(m => iÅpning(pl, m))) iDør.push(ind);
        // gangveien: fra innsiden av døra og 6 m rett inn er ingenting som sperrer
        const q = pl.inngang; for (let t = .2; t < 6; t += .25) { const x = q.inn[0] - q.nx * t, y = q.inn[1] - q.ny * t; if (In.blokkert(pl, x, y)) { stengt.push(ind + '@' + t.toFixed(1)); break; } } }
      ok(!uten.length, 'bransjer uten produksjonslinje: ' + uten.join(', '));
      ok(!iDør.length, 'maskiner i linja står i døråpningen: ' + iDør.join(', '));
      ok(!stengt.length, 'gangveien inn fra døra er stengt: ' + stengt.join(', '));
      { const deler = t => { const Mm = I.MASKINER[t]; const K = []; I.deler({ type: t, b: Mm[0], d: Mm[1], h: Mm[2], f: .3 }, (...a) => K.push(a)); return K.length; };
        ut.deler = Object.fromEntries(['knuser', 'filetmaskin', 'barkemaskin', 'kantpresse', 'gjæringstank'].map(t => [t, deler(t)]));
        ok(Object.values(ut.deler).every(n => n >= 8), 'kassemodellene er ikke byttet ut: ' + JSON.stringify(ut.deler)); }
      // selvtest: en maskin lagt med vilje midt i døråpningen skal fanges av sjekken over
      { const pl = plan(1, 4101), m = linje(pl)[0]; if (m) { const k = Object.assign({}, m, { x: pl.inngang.inn[0], y: pl.inngang.inn[1] }); ut.selvtest = iÅpning(pl, k); ok(ut.selvtest, 'selvtest: maskinen i døråpningen ble ikke sett'); } }
      // (2) kildene til maskinlivet: bare maskiner som går
      { const gL = window.LeirSpill && LeirSpill.tilstand, gS = window.ProduksjonSpill && ProduksjonSpill.status;
        if (gL && gS) { let går = true; const b = { id: 99881, type: 'bs_sagbenk_1', x: 1000, y: 2000, ret: 0, bs: { n: 0 } };
          try { LeirSpill.tilstand = () => ({ bygg: [b] }); ProduksjonSpill.status = () => ({ 99881: { går } }); MS.prøve(null);
            const a = MS.kilder(); går = false; const c = MS.kilder(); ut.kilder = [a.length, c.length];
            ok(a.length === 1 && a[0].liv.some(d => d.del === 'blad' && d.x > 1) && c.length === 0, 'maskinlivet følger ikke om maskinen går: ' + JSON.stringify(ut.kilder));
          } finally { LeirSpill.tilstand = gL; ProduksjonSpill.status = gS; } } else ut.kilder = 'ikke prøvd (LeirSpill/ProduksjonSpill mangler)'; }
      // (3) plantegningen
      const P2 = window.Plantegning2D, i3d = typeof på3d !== 'undefined' && på3d;
      if (P2 && !i3d) { const S0 = OppstartSpill.tilstand(), lx = S0 && S0.leir ? S0.leir.x : kam.x, ly = S0 && S0.leir ? S0.leir.y : kam.y, i = 990951;
        const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, fokus: P2.S.fokus, etasje: P2.S.etasje }, x = lx + 150, y = ly + 80, Pv = [[x, y], [x + 34, y], [x + 34, y + 20], [x, y + 20]], e = { i, t: 6, h: 9, ind: 1 };
        try { P2.prøvehus(Pv, e); if (!P2.hus(i)) P2.nyttHus(Pv, e, 0); P2.seInn({ Pv, e }); for (let k = 0; k < 80; k++) { await vent(150); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; }
          MS.nullstill2d(); skitten = true; for (let k = 0; k < 20 && !MS.tegnet2d(); k++) { await vent(150); skitten = true; } ut.symboler = MS.tegnet2d();
          ok(ut.symboler >= 3, 'plantegningen tegnet ikke maskinsymbolene (' + ut.symboler + ')');
        } finally { P2.fjernPrøve(i); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; } }
      else ut.symboler = i3d ? 'ikke prøvd (3D er på)' : 'ikke prøvd (Plantegning2D mangler)';
      // (4) i 3D
      if (i3d && typeof R3 !== 'undefined' && R3 && R3.ut && R3.hindre && window.Interior3d && window.Gange) {
        const R = R3, u = R.ut, varPå = !!R.fot, lagt = [], bane0 = { x: R.bane.x, y: R.bane.y }, tempo0 = tempo;
        try {
          if (!R.fot) Gange.start();
          const x0 = 170, y0 = 64, w = 34, h = 20, P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
          P.bygg = { i: 990952, t: 6, h: 9, kl: 'industri', ind: 5, X: u.cx + x0 + w / 2, Y: u.cy + y0 + h / 2 };
          P.dør = { x: x0 + w / 2, y: y0, ux: 1, uy: 0, w: 4, hh: 4.2, z0: (hoyde3d(u.cx + x0 + w / 2, u.cy + y0 + 4, u) - u.h0) * R.EX };
          const o = { P }; for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + w) / 20); a++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + h) / 20); c++) { const k = a + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
          R.bane.x = x0 + w / 2; R.bane.y = y0 - 4; const kr = Gange.kropp(); kr.x = R.bane.x; kr.y = R.bane.y;
          for (let k = 0; k < 20 && !P.inne; k++) Interior3d.oppdater(true);
          const pl = P.inne; ok(!!pl, '3D: prøvebygget fikk ikke interiør');
          if (pl) { const t = new Set(pl.møbler.map(m => m.type)), s = Interior3d.sjekk().find(q => q.kl === 'industri' && q.møbler === pl.møbler.length) || {};
            ut.i3d = { linje: linje(pl).map(m => m.type), trekanter: s.trekanter };
            ok(t.has('knuser') && t.has('transportbånd') && linje(pl).length >= 3, '3D: steinhallen mangler knuserlinja: ' + JSON.stringify(ut.i3d));
            // grensen er Claudes forslag: et hus har 9000 (sjekk.js), en hall på 680 m² med maskiner høyst 40 000
            ok(s.trekanter > 0 && s.trekanter < 40000, '3D: hallen har ' + s.trekanter + ' trekanter (grensen er 40 000)'); }
          // sagbladet som går
          tempo = tempo0 > 0 ? tempo0 : 1; MS.prøve([{ id: 1, type: 'bs_sagbenk', X: u.cx + R.bane.x + 6, Y: u.cy + R.bane.y - 6, a: 0, n: 0, liv: M.LIV.bs_sagbenk }, { id: 2, type: 'transportbånd', X: u.cx + R.bane.x + 9, Y: u.cy + R.bane.y - 6, a: 0, n: 0, liv: M.LIV.transportbånd }]);
          await vent(900); const m1 = MS.matrise(0); await vent(500); const m2 = MS.matrise(0), T1 = MS.tall(); ut.liv = { blad: T1.blad, knast: T1.knast, endret: !!(m1 && m2 && m1.some((v, j) => Math.abs(v - m2[j]) > 1e-4)) };
          ok(T1.blad === 1 && T1.knast > 0 && ut.liv.endret, '3D: sagbladet/båndet går ikke: ' + JSON.stringify(ut.liv));
          // (ut9-maskiner2) maskinlyden: hørbar nær en maskin som går, borte når den står
          if (MS.lyd) { ut.liv.lyd = Math.round(MS.lyd().nivå * 1000) / 1000; ok(ut.liv.lyd > 0, '3D: ingen maskinlyd nær sagbenken som går'); }
          MS.prøve([]); await vent(800); ut.liv.stopp = MS.tall().blad; ok(ut.liv.stopp === 0, '3D: bladet er der når maskinen står');
          if (MS.lyd) { ut.liv.lydStopp = MS.lyd().nivå; ok(ut.liv.lydStopp === 0, '3D: maskinlyden fortsetter når maskinen står'); }
        } finally {
          MS.prøve(null); tempo = tempo0; for (const [k, o] of lagt) { const L = R.hindre.get(k), j = L.indexOf(o); if (j >= 0) L.splice(j, 1); }
          R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varPå) Gange.stopp(); Interior3d.oppdater(true);
        }
      } else ut.i3d = 'ikke prøvd (3D er av)';
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `linjer i ${Object.keys(r.linjer || {}).length} bransjer, modellene ${JSON.stringify(r.deler)}, selvtest ${r.selvtest}` +
      `, kilder ${JSON.stringify(r.kilder)}, symboler ${r.symboler}` + (r.i3d && r.i3d.linje ? `, 3D: ${r.i3d.linje.join(' → ')} (${r.i3d.trekanter} trekanter), blad ${JSON.stringify(r.liv)}` : ', 3D ikke prøvd'), data: r };
  },
};
