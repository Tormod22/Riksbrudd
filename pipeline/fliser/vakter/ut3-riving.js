'use strict';
// VAKT for pakka «riving» (fase B3 i docs/plan-selskap-okonomi.md: rive og åpne husene i kartet, del for del – spill/husendring.js og
// spill/husendring-visning.js). Testsiden har ingen husdata, så vakta legger inn to prøvehus nær leiren (Plantegning2D.prøvehus):
//  - en lett vegg rives: jobb for folk på «riving» med planker, og når arbeidet er gjort er veggen revet og plankene i lageret,
//  - en bærende vegg: byggelaget sier fra (kommandoen avvises med advarselen), «gjør det likevel» gir ras i 2. etasje,
//  - ny dør i en bærende vegg med bjelke: stålet tas fra lageret, og døra står med bjelke når arbeidet er gjort,
//  - endringene er der etter ny lasting (loggen lest på nytt, modellen laget fra det loggen husker om huset),
//  - i 2D: valgt vegg gir raden med «Riv veggen» i etasjevelgeren.
// Alt settes tilbake (lageret, folket, ressursene, loggen, prøvehusene, kameraet, farten).
module.exports = {
  navn: 'riving og åpninger i husene (B3)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, P2 = window.Plantegning2D, HE = window.HusEndring, HR = window.HusEndringRegler, RS = window.Ressurser;
      ok(P2 && HE && HR && RS && window.RessursSpill, 'Plantegning2D/HusEndring/Ressurser mangler (husendring*.js lastes rett etter plantegning-visning.js)');
      if (!(P2 && HE && HR && RS && window.RessursSpill)) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms)), NØ = P2.NØKKEL, i1 = 990901, i2 = 990902;
      const S0 = OppstartSpill.tilstand(), lx = S0.leir.x, ly = S0.leir.y, L = LeirSpill.tilstand(), F = FolkSpill.tilstand();
      const i3d = typeof på3d !== 'undefined' && på3d;
      const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, logg: localStorage.getItem(NØ), R: RS.tilJSON(RessursSpill.tilstand()), lager: Object.assign({}, L.lager), tempo,
        folk: F.personer.map(p => [p.id, p.oppgave, p.helse]), fokus: P2.S.fokus, etasje: P2.S.etasje };
      const rekt = (x, y) => [[x, y], [x + 12, y], [x + 12, y + 8], [x, y + 8]];
      const Pv1 = rekt(lx + 70, ly + 45), Pv2 = rekt(lx + 70, ly - 60), e1 = { i: i1, t: 0, h: 9 }, e2 = { i: i2, t: 0, h: 9 };
      // et husarbeid gjøres ferdig: ressursenes steg med tre på riving, så visningen fører endringene (KROKER.sim)
      const ferdig = async () => { const R = RessursSpill.tilstand(); for (let k = 0; k < 20 && R.jobber.some(j => j.endringer); k++) RS.steg(R, 30, { arbeidere: () => 3, leir: { x: lx, y: ly }, leggInn: (t, v) => Leir.leggInn(L, t, v) });
        for (let k = 0; k < 40 && (R.husFerdig || []).length; k++) await vent(50); return !(R.husFerdig || []).length; };
      try {
        if (typeof tempo !== 'undefined' && !(tempo > 0)) tempo = 1;
        RessursSpill.sett(RS.ny());
        F.personer.slice(0, 3).forEach(p => { p.oppgave = 'riving'; });
        L.lager.stål = 3; L.lager.tre = 1;
        P2.prøvehus(Pv1, e1); P2.prøvehus(Pv2, e2); P2.nyttHus(Pv1, e1, 0); P2.nyttHus(Pv2, e2, 0);
        const m1 = P2.modell(i1), et1 = m1.etasjer.find(q => q.n === 1);
        const lett = et1.vegger.find(w => w.type === 'skille' && !w.bærende), bær = et1.vegger.filter(w => w.type === 'skille' && w.bærende);
        ok(lett && bær.length >= 2, 'prøvehuset har ikke lette og bærende skillevegger');
        // 2D: trykk på veggen gir raden med «Riv veggen»
        if (!i3d) {
          P2.seInn({ Pv: Pv1, e: e1 }); for (let k = 0; k < 40; k++) { await vent(100); if (P2.S.nær.some(h => h.i === i1 && h.klar)) break; }
          skitten = true; await vent(300);
          const h = P2.hus(i1), X = h.o[0] + (lett.a[0] + lett.b[0]) / 2, Y = h.o[1] + (lett.a[1] + lett.b[1]) / 2;
          let brukt = false; for (const f of KROKER.trykk) { if (f(X, Y)) { brukt = true; break; } }
          await vent(150); const rad = document.getElementById('plan2d').innerText; ut.rad = rad.split('\n').slice(-3).join(' | ');
          ok(brukt && HE.S.valgt && HE.S.valgt.del === 'vegg' && /Riv veggen/.test(rad), 'trykk på veggen ga ikke raden med «Riv veggen»: ' + ut.rad);
          HE.velg(null);
        }
        // 1. lett vegg: jobb med planker, ferdig = revet og plankene i lageret
        const tre0 = L.lager.tre, s1 = HE.send({ hus: i1, e: 1, del: 'vegg', id: lett.id, he: 'riv' });
        const j1 = RessursSpill.tilstand().jobber.find(j => j.endringer);
        ok(s1.ok && j1 && j1.type === 'riving' && j1.mat.tre > .05, 'riving av en lett vegg ga ingen jobb med planker: ' + (s1.feil || JSON.stringify(j1 && j1.mat)));
        ok(await ferdig(), 'husarbeidet ble ikke ført i loggen');
        ok(P2.modell(i1).etasjer.find(q => q.n === 1).vegger[lett.id].tilstand === 'revet', 'den lette veggen er ikke revet');
        ut.planker = Math.round((L.lager.tre - tre0) * 100) / 100; ok(ut.planker > .05, 'plankene kom ikke i lageret');
        // 2. bærende: den første halvdelen holder; den andre gir advarsel, og «gjør det likevel» gir ras
        HE.send({ hus: i1, e: 1, del: 'vegg', id: bær[0].id, he: 'riv' }); await ferdig();
        const s2 = HE.send({ hus: i1, e: 1, del: 'vegg', id: bær[1].id, he: 'riv' }); ut.advarsel = s2.feil;
        ok(!s2.ok && /bærende vegg\. Uten bjelke raser .*m²/.test(s2.feil || ''), 'byggelaget sa ikke fra om raset: ' + s2.feil);
        const s3 = HE.send({ hus: i1, e: 1, del: 'vegg', id: bær[1].id, he: 'riv', likevel: true }); ok(s3.ok, '«gjør det likevel» ble avvist: ' + s3.feil);
        await ferdig();
        const m1b = P2.modell(i1); ut.rast = m1b.etasjer.find(q => q.n === 2).dekke.felt.filter(f => f.tilstand === 'rast').length;
        ok(ut.rast > 0, 'ingenting raste i 2. etasje');
        // 3. ny dør i en bærende vegg, med bjelke over
        const m2 = P2.modell(i2), b2 = m2.etasjer.find(q => q.n === 1).vegger.find(w => w.type === 'skille' && w.bærende), stål0 = L.lager.stål;
        const s4 = HE.send({ hus: i2, e: 1, del: 'vegg', id: b2.id, t: 1.5, he: 'dør' }); ok(s4.ok, 'ny dør med bjelke ble avvist: ' + s4.feil);
        ok(L.lager.stål < stål0, 'bjelken tok ikke stål fra lageret'); await ferdig();
        const dør = P2.modell(i2).etasjer.find(q => q.n === 1).åpninger.find(o => o.ny && o.vegg === b2.id);
        ok(dør && dør.bjelke && dør.type === 'dør', 'døra i den bærende veggen står ikke (med bjelke)');
        // 4. etter ny lasting: loggen lest på nytt, modellene laget fra det loggen husker om husene
        P2.HUS.delete(i1); P2.HUS.delete(i2); P2.lesInn();
        const h1 = HE.husFor(i1), h2 = HE.husFor(i2);
        ut.lagret = (P2.logg().hus[i1] || []).length + (P2.logg().hus[i2] || []).length;
        ok(h1 && h1.m.etasjer.find(q => q.n === 1).vegger[lett.id].tilstand === 'revet' && h1.m.etasjer.find(q => q.n === 2).dekke.felt.some(f => f.tilstand === 'rast'), 'veggen/raset er ikke der etter ny lasting');
        ok(h2 && h2.m.etasjer.find(q => q.n === 1).åpninger.some(o => o.ny && o.bjelke), 'døra er ikke der etter ny lasting');
        ok(JSON.parse(localStorage.getItem(NØ) || '{}').hus[i1].length >= 3, 'endringene er ikke lagret i «riksbrudd-bygninger»');
        // 5. etasje for etasje: andelen som står igjen
        ok(HR.andelIgjen(h1.m) === 1 && HR.etasjerOvenfra(h1.m).length >= 2, 'etasjene ovenfra mangler');
      } catch (er) { ut.feil.push('unntak: ' + er.message); }
      // tilbake
      if (før.logg == null) localStorage.removeItem(NØ); else localStorage.setItem(NØ, før.logg);
      RessursSpill.sett(RS.fraJSON(før.R) || RS.ny());
      for (const k of Object.keys(L.lager)) if (!(k in før.lager)) delete L.lager[k]; Object.assign(L.lager, før.lager);
      for (const [id, o, h] of før.folk) { const p = F.personer.find(q => q.id === id); if (p) { p.oppgave = o; p.helse = h; } }
      P2.fjernPrøve(i1); P2.fjernPrøve(i2); P2.lesInn(); HE.velg(null); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; P2.S.valgt = null;
      tempo = før.tempo; kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; P2.visVelger();
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `planker ${r.planker} m³, advarsel «${r.advarsel}», ${r.rast} dekkefelt rast, ${r.lagret} endringer lagret og lest igjen`, data: r };
  },
};
