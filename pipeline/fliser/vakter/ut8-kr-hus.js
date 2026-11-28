'use strict';
// VAKT for pakka «ut8-kr-hus» (kritikeren Jonas Bakke, telefon, 28. nov: husvinduet ble stående, loftet var en mørk flate uten rom,
// letingen på loftet talte ikke, «Gå her» satte ham utenfor huset og inne i en trestamme).
// Testsiden har ingen husdata, så vakta legger inn et prøvehus (Plantegning2D.prøvehus) ved leiren og prøver:
//  1. HUSVINDUET (#plan2d): «Se inn» viser det, med ×; × lukker det (og det blir lukket); et trykk på huset åpner det igjen; når kartet
//     flyttes bort fra huset, forsvinner det og fokuset slippes; et panel som står oppe (Leir-menyen), skjuler det (Plantegning2D.test);
//     på telefon (smal skjerm) er det én rad – «Ta over huset» ligger bak «Mer», og «Mer» viser den.
//  2. LOFTET tegnes med gulvbord (et punkt der du kan stå oppreist er treets farge, ikke den mørke flaten) og navnet «Loft».
//  3. LETINGEN i en annen etasje teller i LeteSpill.antall() (det «Din historie», målene og Deg teller).
//  4. «GÅ HER»: står karakteren inne i huset i 2D (Etasjer2D), gir Gange.iHus2d huset og etasjen (så «Gå» starter inne); og en høy bjørk
//     sperrer 1 m fra midten av stammen (hindring3d: stammen er så tykk som treet er høyt), et lite tre ikke.
// Selvtest: med kartet langt unna huset skal vinduet ikke vises (ellers ser vakta ingenting).
// Alt settes tilbake (kameraet, fokuset, karakteren, letingen, panelene). Med 3D på prøves bare 3 og 4.
module.exports = {
  navn: 'husvinduet, loftet, leting i alle etasjer og «Gå her» inne i huset (ut8-kr-hus)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, P2 = window.Plantegning2D, PT = window.Plantegning, E2 = window.Etasjer2D;
      ok(P2 && PT && E2 && window.Gange, 'Plantegning2D/Plantegning/Etasjer2D/Gange mangler');
      if (!P2 || !PT || !E2) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms)), i = 990888, i3d = typeof på3d !== 'undefined' && på3d, V = document.getElementById('plan2d');
      const S0 = OppstartSpill.tilstand(), lx = S0 && S0.leir ? S0.leir.x : kam.x, ly = S0 && S0.leir ? S0.leir.y : kam.y;
      const k = window.Spill2D && Spill2D.karakter ? Spill2D.karakter() : null;
      const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, fokus: P2.S.fokus, etasje: P2.S.etasje, lukket: P2.S.lukket, test: P2.test, k: k ? { x: k.x, y: k.y } : null,
        ls: localStorage.getItem('riksbrudd-etasjer'), e2: { hus: E2.S.hus, n: E2.S.n, p: E2.S.p } };
      const x = lx + 130, y = ly + 75, Pv = [[x, y], [x + 13, y], [x + 13, y + 9], [x, y + 9]], e = { i, t: 0, h: 8.5 };
      const leirÅpen = () => { const m = document.getElementById('leirmeny'); return !!m && m.getClientRects().length > 0; };
      try {
        P2.prøvehus(Pv, e);
        if (!P2.hus(i)) P2.nyttHus(Pv, e, 0);
        const m = P2.modell(i), loft = m && m.etasjer.find(q => q.loft);
        ut.etasjer = m ? m.etasjer.map(q => q.kjeller ? 'K' : q.loft ? 'L' : String(q.n)).join(' ') : '';
        ok(!!loft, 'prøvehuset fikk ikke noe loft: ' + ut.etasjer);
        if (!i3d) {
          // ---------- 1: husvinduet ----------
          P2.seInn({ Pv, e });
          for (let q = 0; q < 80; q++) { await vent(120); const h = P2.hus(i); if (h && h.klar && P2.S.nær.some(n => n.i === i)) break; }
          skitten = true; await vent(300); P2.visVelger(); await vent(50);
          ok(V.classList.contains('på'), '«Se inn» viste ikke husvinduet');
          const x1 = document.getElementById('plan2dlukk'); ok(!!x1, 'husvinduet har ingen ×');
          if (x1) { x1.click(); await vent(50); ok(!V.classList.contains('på') && P2.S.lukket === i, '× lukket ikke husvinduet (på: ' + V.classList.contains('på') + ', lukket: ' + P2.S.lukket + ')');
            P2.visVelger(); ok(!V.classList.contains('på'), 'husvinduet kom tilbake av seg selv etter ×'); }
          // trykk på huset åpner det igjen
          let brukt = false; for (const f of KROKER.trykk) { if (f(x + 6.5, y + 4.5)) { brukt = true; break; } }
          await vent(50); P2.visVelger(); ok(brukt && V.classList.contains('på'), 'trykk på huset åpnet ikke husvinduet igjen');
          // telefon: én rad, «Mer» viser resten
          if (innerWidth <= 700) {
            const rader = () => [...V.children].filter(r => r.classList.contains('rad') && getComputedStyle(r).display !== 'none').length;
            ut.raderFør = rader(); ok(ut.raderFør === 1, `på telefon skal husvinduet være én rad (var ${ut.raderFør})`);
            const mer = V.querySelector('[data-h=mer]'); ok(!!mer && getComputedStyle(mer).display !== 'none', 'ingen «Mer» på telefon');
            if (mer) { mer.click(); await vent(50); ut.raderEtter = rader(); ok(ut.raderEtter > 1 && /Ta over|Riv/.test(V.innerText), '«Mer» viste ikke resten: ' + ut.raderEtter);
              V.querySelector('[data-h=mer]').click(); await vent(30); }
          }
          // et panel som står oppe, skjuler vinduet (spilleren; Plantegning2D.test)
          if (window.LeirSpill && document.getElementById('leirknapp')) {
            P2.test = true; const var0 = leirÅpen(); if (!var0) document.getElementById('leirknapp').click(); await vent(350); P2.visVelger();
            ut.underLeir = V.classList.contains('på'); ok(!ut.underLeir, 'husvinduet sto oppe sammen med Leir-menyen');
            if (!var0 && leirÅpen()) document.getElementById('leirknapp').click(); await vent(350); P2.visVelger();
            ok(V.classList.contains('på'), 'husvinduet kom ikke tilbake da Leir-menyen ble lukket'); P2.test = før.test;
          }
          // ---------- 2: loftet ----------
          P2.S.etasje = loft ? loft.n : 1; kam.m = Math.min(kam.m, .06); skitten = true; await vent(400);
          const t = (P2.S.tegnet || []).find(q => q.i === i); ut.loft = t;
          ok(t && t.n === (loft && loft.n) && t.navn >= 1, 'loftet ble ikke tegnet med navn: ' + JSON.stringify(t));
          const h = P2.hus(i);
          if (h && h.m && h.m.akse) { const A = h.m.akse, um = (A.u0 + A.u1) / 2 + (A.u1 - A.u0) * .3, vm = (A.v0 + A.v1) / 2 + (A.v1 - A.v0) * .12;
            const X = h.o[0] + um * A.ux + vm * A.vx, Y = h.o[1] + um * A.uy + vm * A.vy, c = document.getElementById('c'), d = c.width / c.clientWidth;
            const px = c.getContext('2d').getImageData(Math.round(((X - kam.x) / kam.m + VW / 2) * d), Math.round((VH / 2 - (Y - kam.y) / kam.m) * d), 1, 1).data;
            ut.loftFarge = [px[0], px[1], px[2]]; ok(px[0] > 55 && px[0] > px[2] + 20, 'loftsgulvet er ikke tegnet (fargen ' + ut.loftFarge + ' – den mørke flaten?)'); }
          P2.S.etasje = 1;
          // ---------- selvtest og «flytt kartet bort» ----------
          kam.x += 600; skitten = true; await vent(300); P2.visVelger();
          ok(!V.classList.contains('på'), 'husvinduet står oppe med kartet 600 m unna huset'); ok(!P2.S.fokus, 'fokuset på huset ble ikke sluppet da kartet ble flyttet bort');
          kam.x -= 600;
        }
        // ---------- 3: leting i en annen etasje teller ----------
        if (loft && window.LeteSpill) { const n0 = LeteSpill.antall(); E2.S.lett[window.Etasjer ? Etasjer.nøkkel(i, loft.n) : i + ':' + loft.n] = 1; ut.lett = [n0, LeteSpill.antall()];
          ok(LeteSpill.antall() === n0 + 1, 'letingen på loftet teller ikke i LeteSpill.antall(): ' + ut.lett); }
        // ---------- 4: «Gå her» inne i huset ----------
        if (k && loft) { k.x = x + 6.5; k.y = y + 4.5; E2.S.hus = i; E2.S.n = loft.n; E2.S.p = { x: 0, y: 0 }; const ih = Gange.iHus2d ? Gange.iHus2d(k) : null; ut.iHus = ih && { i: ih.i, n: ih.n };
          ok(ih && ih.i === i && ih.n === loft.n, '«Gå her» ser ikke at karakteren er på loftet: ' + JSON.stringify(ut.iHus));
          k.x = x - 30; const ute = Gange.iHus2d ? Gange.iHus2d(k) : 1; ok(ute === null, '«Gå her» tror karakteren er inne når den står ute'); }
        if (typeof hindringer === 'function' && typeof hindring3d === 'function') {
          const rute = hindringer({ hus: { omriss: [] }, trær: { løv: [100, 100, 0, 20, 1, 200, 100, 0, 4, 1] } });
          ut.stamme = [hindring3d(101, 100, rute), hindring3d(101.3, 100, rute), hindring3d(200.7, 100, rute), hindring3d(200.4, 100, rute)];
          ok(ut.stamme[0] && !ut.stamme[1] && !ut.stamme[2] && ut.stamme[3], 'stammene sperrer feil (bjørk 20 m: 1 m / 1,3 m; tre 4 m: 0,7 m / 0,4 m): ' + ut.stamme);
        }
      } finally {
        P2.test = før.test; P2.fjernPrøve(i); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; P2.S.lukket = før.lukket; P2.S.valgt = null;
        if (før.ls === null) localStorage.removeItem('riksbrudd-etasjer'); else localStorage.setItem('riksbrudd-etasjer', før.ls); E2.les();
        E2.S.hus = før.e2.hus; E2.S.n = før.e2.n; E2.S.p = før.e2.p;
        if (før.k && k) { k.x = før.k.x; k.y = før.k.y; k.sti = []; }
        kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; P2.visVelger();
      }
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `etasjer ${r.etasjer}; loft ${r.loft ? 'tegnet, farge ' + r.loftFarge : '-'}; leting ${r.lett || '-'}; Gå her ${JSON.stringify(r.iHus)}; stammer ${r.stamme}`, data: r };
  },
};
