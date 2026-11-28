'use strict';
// VAKT for pakka «kampvegger» (fase B6 «Kamp med vegger» og B7 «Ta over hus» i docs/plan-selskap-okonomi.md – spill/husvern.js,
// spill/overtak.js og spill/husvern-visning.js). Testsiden har ingen husdata, så vakta legger inn to prøvehus nær leiren
// (Plantegning2D.prøvehus): en bolig i tre og et leilighetsbygg i mur. Den prøver:
//  - vernet: et lag bak en murvegg tar færre treff (faktoren fra KROKER.ild) enn bak en trevegg, og bak en trevegg færre enn ute,
//  - sprengstoff mot en vegg lager et hull (endringsloggen har en åpning av typen «hull»),
//  - barrikadene forsinker fienden som stormer huset (inntaksforsinkelsen før og etter planker),
//  - 2. etasje gir lengre sikt (KROKER.sikt og øynene),
//  - et overtatt hus gir senger og lager i leiren (Leir.plasser og Leir.lagerplass), og kan gis opp igjen.
// Alt settes tilbake (lagene, lageret, loggene, prøvehusene, kameraet, HusvernSpill.test).
module.exports = {
  navn: 'kamp med vegger og ta over hus (B6, B7)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, P2 = window.Plantegning2D, HS = window.HusvernSpill, HV = window.HusVern, OT = window.Overtak;
      ok(P2 && HS && HV && OT, 'Plantegning2D/HusvernSpill/HusVern/Overtak mangler (husvern*.js og overtak.js lastes rett etter husendring-visning.js)');
      if (!(P2 && HS && HV && OT)) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms)), i1 = 990951, i2 = 990952;
      const S0 = OppstartSpill.tilstand(), lx = S0.leir.x, ly = S0.leir.y, L = LeirSpill.tilstand();
      const blå = ENHETER.find(s => s.side === 'blå' && !s.karakter && levende(s)), rød = ENHETER.find(s => s.side !== 'blå' && Array.isArray(s.menn));
      ok(blå && rød, 'fant ikke et blått og et fiendtlig lag'); if (!(blå && rød)) return ut;
      const lag0 = [blå, rød].map(s => ({ s, x: s.x, y: s.y, sti: s.sti, her: s.her, øy: s.øyneEkstra, etg: s.husEtasje, hp: s.menn.map(m => m.hp), ut: s.slattUtMeldt }));
      const kar = window.SpilletSpill && SpilletSpill.K ? SpilletSpill.K() : null, karHp = kar ? kar.hp : null;
      const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, logg: localStorage.getItem(P2.NØKKEL), ot: localStorage.getItem(HS.NØKKEL), lager: Object.assign({}, L.lager), test: HS.test, vis: HS.S.visVern };
      const rekt = (x, y, a, b) => [[x, y], [x + a, y], [x + a, y + b], [x, y + b]];
      const Pv1 = rekt(lx + 90, ly + 60, 12, 8), Pv2 = rekt(lx + 90, ly - 90, 18, 10), e1 = { i: i1, t: 0, h: 9 }, e2 = { i: i2, t: 10, h: 12 };
      const midt = Pv => [Pv.reduce((s, p) => s + p[0], 0) / Pv.length, Pv.reduce((s, p) => s + p[1], 0) / Pv.length];
      const ild = (a, b) => KROKER.ild.reduce((v, h) => v * h(a, b), 1);
      try {
        HS.test = true;
        P2.prøvehus(Pv1, e1); P2.prøvehus(Pv2, e2); P2.nyttHus(Pv1, e1, 0); P2.nyttHus(Pv2, e2, 0);
        const m1 = P2.modell(i1), m2 = P2.modell(i2);
        ok(m1 && m2, 'prøvehusene fikk ingen modell'); if (!(m1 && m2)) return ut;
        ut.stoff = [m1, m2].map(m => m.etasjer.find(e => e.n === 1).vegger.find(w => w.type === 'ytter').stoff);
        // en solid flekk på den lengste ytterveggen mot sør (minst mulig vindu): laget står like innenfor, fienden 80 m ute
        const plass = (Pv, i) => { const h = P2.hus(i), e = HV.etasje(h.m, 1); let best = null;
          for (const w of e.vegger) { if (w.type !== 'ytter') continue; const Lw = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
            for (let s = .8; s < Lw - .8; s += .2) { const fri = Math.min(99, ...e.åpninger.filter(o => o.vegg === w.id).map(o => Math.abs(o.t - s) - o.b / 2)); if (!best || fri > best.fri) best = { w, s, fri, Lw }; } }
          const { w, s, Lw } = best, ux = (w.b[0] - w.a[0]) / Lw, uy = (w.b[1] - w.a[1]) / Lw, p = [h.o[0] + w.a[0] + ux * s, h.o[1] + w.a[1] + uy * s]; let nx = uy, ny = -ux;
          if (HV.inni(Pv, p[0] + nx * .7, p[1] + ny * .7)) { nx = -nx; ny = -ny; }
          return { inn: [p[0] - nx * 1.2, p[1] - ny * 1.2], ute: [p[0] + nx * 80, p[1] + ny * 80], vegg: p }; };
        const q1 = plass(Pv1, i1), q2 = plass(Pv2, i2);
        const still = (s, p) => { s.x = p[0]; s.y = p[1]; s.sti = null; };
        // ute: ingen hus
        still(blå, [lx + 300, ly + 300]); still(rød, [lx + 300, ly + 380]); HS.plasser(); const fUte = ild(rød, blå); ok(!blå.hus, 'laget ute står i et hus?');
        still(blå, q1.inn); still(rød, q1.ute); HS.plasser(); ok(blå.hus && blå.hus.i === i1, 'laget ble ikke regnet inne i trehuset'); const fTre = ild(rød, blå), vTre = HS.vernFor(rød, blå);
        still(blå, q2.inn); still(rød, q2.ute); HS.plasser(); ok(blå.hus && blå.hus.i === i2, 'laget ble ikke regnet inne i murhuset'); const fMur = ild(rød, blå), vMur = HS.vernFor(rød, blå);
        ut.treff = { ute: +fUte.toFixed(3), tre: +fTre.toFixed(3), mur: +fMur.toFixed(3), vernTre: vTre && Math.round(vTre.andel * 100), vernMur: vMur && Math.round(vMur.andel * 100) };
        ok(fMur < fTre && fTre < fUte, 'treffene: mur skal gi færre enn tre, og tre færre enn ute: ' + JSON.stringify(ut.treff));
        const tekst = KROKER.lagTekst.map(h => h(blå)).filter(Boolean).join(' · '); ut.tekst = tekst; ok(/i huset: veggene tar \d+ %/.test(tekst), 'lagteksten sier ikke «i huset: veggene tar …»: ' + tekst);
        // 2. etasje: lengre sikt og øyne høyere
        still(blå, midt(Pv1)); HS.plasser(); const s1 = KROKER.sikt.reduce((v, f) => v * f(blå), 1);
        const kr = HS.kjør({ type: 'husEtasje', lag: KOMMANDO.nid(blå), n: 2 }); const s2 = KROKER.sikt.reduce((v, f) => v * f(blå), 1);
        ut.sikt = { e1: +s1.toFixed(2), e2: +s2.toFixed(2), øyne: blå.øyneEkstra };
        ok(kr.ok && blå.hus.n === 2 && s2 > s1 && blå.øyneEkstra > 2, '2. etasje gir ikke lengre sikt: ' + JSON.stringify(ut.sikt) + ' ' + (kr.feil || ''));
        // sprengstoff mot murveggen: hull i endringsloggen
        const sm = HS.smellVed(q2.vegg[0], q2.vegg[1], 'sprengstoff', 1), lg = P2.logg().hus[i2] || [];
        ut.spreng = sm && sm.tekst; ok(lg.some(d => d.del === 'åpning' && d.type === 'hull'), 'sprengstoff laget ikke hull: ' + JSON.stringify(lg) + ' ' + (sm && sm.tekst));
        ok(P2.modell(i2).etasjer.find(e => e.n === 1).åpninger.some(o => o.type === 'hull' && o.tilstand === 'ødelagt'), 'hullet står ikke i modellen');
        // i 3D: din egen granat (BakkekampSpill.smell -> Effekter3d.eksplosjon) mot trehusets vegg setter spor i loggen
        if (typeof på3d !== 'undefined' && på3d && window.BakkekampSpill && BakkekampSpill.smell) { const n0 = (P2.logg().hus[i1] || []).length;
          BakkekampSpill.smell(q1.vegg[0], q1.vegg[1]); const n1 = (P2.logg().hus[i1] || []).length; ut.granat3d = n1 - n0;
          ok(n1 > n0, 'granaten i 3D satte ingen spor i trehuset'); }
        // barrikadene forsinker inntaket: fienden 40 m fra trehuset med laget inne
        still(blå, midt(Pv1)); blå.husEtasje = 1; HS.plasser(); const c1 = midt(Pv1); still(rød, [c1[0], c1[1] + 40]);
        rød.sti = ['vakt']; HS.S.inntak.clear(); HS.inntakSteg(); const k = blå.hus.k + '>' + rød.navn, f0 = HS.S.inntak.get(k) && HS.S.inntak.get(k).f;
        L.lager.tre = (L.lager.tre || 0) + 2; const m1n = P2.modell(i1), ute1 = HV.inngang(m1n).innganger.filter(q => q.id !== undefined);
        for (const q of ute1) P2.endre({ hus: i1, e: 1, del: 'åpning', id: q.id, gjør: 'barrikader' });
        HS.S.inntak.clear(); HS.inntakSteg(); const f1 = HS.S.inntak.get(k) && HS.S.inntak.get(k).f;
        ut.inntak = { før: f0, etter: f1, sperret: HV.inngang(P2.modell(i1)).sperret };
        ok(Number.isFinite(f0) && Number.isFinite(f1) && f1 > f0 + 3, 'barrikadene forsinker ikke inntaket: ' + JSON.stringify(ut.inntak));
        // ta over trehuset som kaserne og murhuset som lager
        // (ut8-kr-penger) overtaket koster nå (istandsetting) – kassa settes tilbake etter prøven
        const p0 = Leir.plasser(L), l0 = Leir.lagerplass(L), kr0 = OppstartSpill.tilstand().penger;
        const a = HS.kjør({ type: 'husOvertak', hus: i1, bruk: 'kaserne' }), b = HS.kjør({ type: 'husOvertak', hus: i2, bruk: 'lager' });
        const p1 = Leir.plasser(L), l1 = Leir.lagerplass(L); ut.overtak = { senger: p1 - p0, lager: Math.round((l1 - l0) * 10) / 10, svar: a.svar };
        ok(a.ok && b.ok && p1 > p0 && l1 > l0, 'et overtatt hus gir ikke senger/lager: ' + JSON.stringify(ut.overtak) + ' ' + (a.feil || '') + ' ' + (b.feil || ''));
        ok(!!JSON.parse(localStorage.getItem(HS.NØKKEL) || '{}').hus[i1], 'overtaket er ikke lagret');
        // for langt unna: avvist
        const Pv3 = rekt(lx + 9000, ly, 10, 8), e3 = { i: 990953, t: 0, h: 6 }; P2.prøvehus(Pv3, e3); P2.nyttHus(Pv3, e3, 0); P2.modell(e3.i);
        const c = HS.kjør({ type: 'husOvertak', hus: e3.i, bruk: 'utpost' }); ok(!c.ok && /for langt/.test(c.feil || ''), 'et hus 9 km unna ble tatt over'); P2.fjernPrøve(e3.i);
        HS.kjør({ type: 'husOvertak', hus: i1, slipp: true }); HS.kjør({ type: 'husOvertak', hus: i2, slipp: true });
        { const d = kr0 - OppstartSpill.tilstand().penger; if (d > 0) OppstartSpill.gi(d); }
        ok(Leir.plasser(L) === p0 && Math.abs(Leir.lagerplass(L) - l0) < .01, 'senger/lager gikk ikke tilbake etter «Gi opp huset»');
        // plantegningen viser raden med vern og «Ta over huset» (bare i 2D)
        if (!(typeof på3d !== 'undefined' && på3d)) { P2.seInn({ Pv: Pv1, e: e1 }); for (let n = 0; n < 30; n++) { await vent(100); if (P2.S.nær.some(h => h.i === i1 && h.klar)) break; }
          skitten = true; await vent(300); P2.visVelger(); const t = (document.getElementById('plan2d') || {}).textContent || ''; ut.rad = t.split('\n').slice(-3).join(' | ');
          ok(/Vern:/.test(t) && /Ta over huset som/.test(t) && /Kaserne/.test(t), 'plantegningen viser ikke vern og «Ta over huset»: ' + ut.rad); }
      } catch (e) { ut.feil.push('unntak: ' + (e && e.stack || e)); }
      finally {
        if (kar && karHp !== null) kar.hp = karHp;
        for (const q of lag0) { q.s.menn.forEach((m, k) => { m.hp = q.hp[k]; }); q.s.slattUtMeldt = q.ut; q.s.x = q.x; q.s.y = q.y; q.s.sti = q.sti; q.s.her = q.her; delete q.s.hus; delete q.s.husVern; if (q.øy === undefined) delete q.s.øyneEkstra; else q.s.øyneEkstra = q.øy; if (q.etg === undefined) delete q.s.husEtasje; else q.s.husEtasje = q.etg; q.s.siktSkitten = true; }
        HS.S.inntak.clear(); HS.S.slit.clear(); HS.S.visVern = før.vis; HS.test = før.test;
        P2.fjernPrøve(i1); P2.fjernPrøve(i2); P2.S.fokus = null;
        if (før.logg === null) localStorage.removeItem(P2.NØKKEL); else localStorage.setItem(P2.NØKKEL, før.logg); P2.lesInn();
        if (før.ot === null) localStorage.removeItem(HS.NØKKEL); else localStorage.setItem(HS.NØKKEL, før.ot); HS.lesInn();
        for (const k of Object.keys(L.lager)) if (!(k in før.lager)) delete L.lager[k]; Object.assign(L.lager, før.lager);
        kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; if (P2.visVelger) P2.visVelger();
      }
      return ut;
    });
    return { ok: !r.feil.length, tekst: r.feil.length ? r.feil.join('; ') : `vern ${JSON.stringify(r.treff)}, sikt ${JSON.stringify(r.sikt)}, inntak ${JSON.stringify(r.inntak)}, overtak ${JSON.stringify(r.overtak)}`, data: r };
  },
};
