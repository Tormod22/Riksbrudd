'use strict';
// VAKT for pakka «hus2d» (fase B1 i docs/plan-selskap-okonomi.md: husene vises fra byggemodellen, plantegningen i 2D).
// Testsiden har ingen husdata, så vakta legger inn et prøvehus 120 m fra leiren (Plantegning2D.prøvehus) og trykker «Se inn» på det:
//  - plantegningen tegnes (vegger, dører, vinduer, rom; S.tegnet fra tegnekroken) og et punkt på en bærende vegg er lyst i kartet,
//  - taket og døra er de samme som hus3d-regelen gir (Plantegning.husTak) og modellen bygger på dem,
//  - en barrikade på et vindu (kommandoen «husEndre», planker fra leirens lager) lagres i «riksbrudd-bygninger» og vises igjen når
//    modellen lages på nytt fra loggen (som etter ny lasting),
//  - selvtest: loggen for en annen leir gir ingen barrikade.
// Alt settes tilbake (kameraet, lageret, loggen, prøvehuset). Med 3D på prøves bare modellen og loggen (plantegningen er 2D).
module.exports = {
  navn: 'plantegning i 2D (hus fra modellen, barrikader)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, P2 = window.Plantegning2D, PT = window.Plantegning;
      ok(P2 && PT && window.Bygning, 'Plantegning2D/Plantegning/Bygning mangler (lastes rett etter bygning.js)');
      if (!P2 || !PT) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms)), NØ = P2.NØKKEL, i = 990777;
      const S0 = OppstartSpill.tilstand(), lx = S0 && S0.leir ? S0.leir.x : kam.x, ly = S0 && S0.leir ? S0.leir.y : kam.y;
      const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, logg: localStorage.getItem(NØ), fokus: P2.S.fokus, etasje: P2.S.etasje, L: window.LeirSpill && LeirSpill.tilstand() };
      const treFør = før.L && før.L.lager ? før.L.lager.tre : undefined, i3d = typeof på3d !== 'undefined' && på3d;
      const x = lx + 120, y = ly + 60, Pv = [[x, y], [x + 12, y], [x + 12, y + 8.5], [x, y + 8.5]], e = { i, t: 0, h: 7.5 };
      try {
        P2.prøvehus(Pv, e);
        if (!i3d) {
          P2.seInn({ Pv, e });
          for (let k = 0; k < 80; k++) { await vent(150); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; }
          skitten = true; await vent(400); skitten = true; await vent(300);
          const h = P2.hus(i); ok(h && h.klar, 'prøvehuset fikk ingen modell: ' + (h && h.feil));
          const t = (P2.S.tegnet || []).find(q => q.i === i); ut.tegnet = t;
          ok(t && t.vegger >= 4 && t.dører >= 2 && t.vinduer >= 2 && t.rom >= 2, 'plantegningen ble ikke tegnet med vegger, dører og vinduer: ' + JSON.stringify(t));
          ok(document.getElementById('plan2d').classList.contains('på') && /Kjeller|1/.test(document.getElementById('plan2d').textContent), 'etasjevelgeren vises ikke');
          // et punkt midt på en bærende yttervegg er lyst i kartbildet
          if (h && h.m) { const F = PT.figur(h.m, 1), w = F.vegger.find(q => q.bærende && q.biter.length), [a, b] = w.biter.reduce((s, q) => Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) > Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) ? q : s);
            const X = h.o[0] + (a[0] + b[0]) / 2, Y = h.o[1] + (a[1] + b[1]) / 2, c = document.getElementById('c'), d = c.width / c.clientWidth;
            // det lyseste punktet i en rute på 7 × 7 rundt midten av veggen (kantutjevning)
            const id = c.getContext('2d').getImageData(Math.round(((X - kam.x) / kam.m + VW / 2) * d) - 3, Math.round((VH / 2 - (Y - kam.y) / kam.m) * d) - 3, 7, 7).data;
            let best = [0, 0, 0]; for (let k = 0; k < id.length; k += 4) if (id[k] + id[k + 1] + id[k + 2] > best[0] + best[1] + best[2]) best = [id[k], id[k + 1], id[k + 2]];
            // og gulvet midt i et rom er mørkt (kartet kan være mørkere om natta, så vi sammenligner)
            const r0 = F.rom.find(q => q.areal > 6) || F.rom[0], g = c.getContext('2d').getImageData(Math.round(((h.o[0] + r0.x - kam.x) / kam.m + VW / 2) * d), Math.round((VH / 2 - (h.o[1] + r0.y - kam.y) / kam.m) * d), 1, 1).data;
            ut.vegg = best; ut.gulv = [g[0], g[1], g[2]]; ok(best[0] + best[1] + best[2] > g[0] + g[1] + g[2] + 180, 'veggen er ikke lys mot gulvet i kartet: ' + ut.vegg + ' / ' + ut.gulv); }
        }
        if (!P2.hus(i)) P2.nyttHus(Pv, e, 0);
        const h = P2.hus(i), m = P2.modell(i); ok(m && m.etasjer.length >= 1, 'ingen modell');
        // samme tak og dør som hus3d-regelen
        ok(h.info.tak === m.tak.form && Math.abs(h.info.vegg - m.høyde.vegg) < .02, 'modellen har ikke taket fra hus3d-regelen: ' + h.info.tak + '/' + m.tak.form);
        // barrikaden
        const F = PT.figur(m, 1), v = F.åpninger.find(q => q.type === 'vindu' && !q.sperre); ok(!!v, 'prøvehuset har ikke noe vindu');
        if (v && før.L && før.L.lager) {
          før.L.lager.tre = (før.L.lager.tre || 0) + 1; const tre0 = før.L.lager.tre;
          const s = P2.endre({ hus: i, e: 1, del: 'åpning', id: v.id, gjør: 'barrikader' });
          ok(s.ok, 'barrikaden ble avvist: ' + s.feil); ok(Math.abs(tre0 - før.L.lager.tre - PT.planker(v)) < .011, 'plankene ble ikke trukket fra lageret');
          const lagret = JSON.parse(localStorage.getItem(NØ) || 'null'); ok(lagret && lagret.hus[i] && lagret.hus[i].length === 1, 'barrikaden ble ikke lagret'); ok(lagret && lagret.kart && lagret.kart[i] && lagret.kart[i].P.length === 4, 'husets kartdata ble ikke lagret');
          // som etter ny lasting: glem modellen, les loggen og lag modellen på nytt
          P2.HUS.delete(i); P2.lesInn(); P2.nyttHus(PT.åpent(Pv.concat([Pv[0]])), e, 0); const m2 = P2.modell(i), o2 = PT.figur(m2, 1).åpninger.find(q => q.id === v.id);
          ut.sperre = o2 && o2.sperre; ok(o2 && o2.sperre === 'planker', 'barrikaden vises ikke etter ny lasting');
          if (!i3d) { skitten = true; await vent(350); const t2 = (P2.S.tegnet || []).find(q => q.i === i); ok(t2 && t2.sperret === 1, 'barrikaden tegnes ikke: ' + JSON.stringify(t2)); }
          // selvtest: loggen tilhører en annen leir -> ingen barrikade
          const L2 = Object.assign({}, lagret, { leir: '1,2' }); localStorage.setItem(NØ, JSON.stringify(L2)); P2.lesInn();
          const o3 = PT.figur(P2.modell(i), 1).åpninger.find(q => q.id === v.id); ut.selvtest = !o3.sperre; ok(ut.selvtest, 'selvtest: loggen for en annen leir ga barrikade');
        }
      } catch (er) { ut.feil.push('unntak: ' + er.message); }
      // tilbake
      if (før.logg == null) localStorage.removeItem(NØ); else localStorage.setItem(NØ, før.logg);
      P2.fjernPrøve(i); P2.lesInn(); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; P2.S.valgt = null;
      if (før.L && før.L.lager && treFør !== undefined) før.L.lager.tre = treFør;
      kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; P2.visVelger();
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `tegnet ${JSON.stringify(r.tegnet || 'ikke (3D)')}, vegg ${r.vegg || '-'}, barrikade etter lasting: ${r.sperre}, selvtest ok`, data: r };
  },
};
