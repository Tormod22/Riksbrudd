'use strict';
// VAKT for «fabrikkbygg» (ut10, 28. nov – brukeren: «Lag det som ikke er bygget»: industribygg i kartet skal kunne tas over som fabrikk).
// (1) Et prøvehus (industri, bransje tømmer, 34 × 20 m) 300 m fra leiren: plantegningen har knappen «Ta i bruk som fabrikk»; trykket
//     (gjennom kommandolaget) betaler istandsettingen og legger sagbruk + flishogger i leiren ved møblene i hallen, merket med husets nummer.
// (2) Med tømmer og folk går saga i fabrikkbygget (Produksjon.steg) og lager planker; fanen Produksjon har «Fabrikkbygg»; kartet tegner
//     «Din fabrikk»; lagringen (riksbrudd-fabrikkbygg) har huset.
// (3) Selvtester: et bryggeri får ingen knapp (forklaring: lager eller verksted), et sagbruk 2,5 km unna er for langt unna.
// (4) «Gi opp fabrikken» tar maskinene bort. (5) I 3D: maskinlivet tar med fabrikkmaskinene som går (MaskinerSpill.kilder).
// Setter alt tilbake: prøvehusene, pengene, byggene, lageret, lagringen, kameraet.
module.exports = {
  navn: 'ut10-fabrikkbygg (industribygg tatt i bruk som fabrikk)',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
      const FB = window.Fabrikkbygg, FS = window.FabrikkbyggSpill, P2 = window.Plantegning2D, PR = window.Produksjon;
      if (!FB || !FS || !P2 || !PR || !window.LeirSpill) { ut.feil.push('Fabrikkbygg/FabrikkbyggSpill/Plantegning2D mangler'); return ut; }
      const l = LeirSpill.tilstand(), S = OppstartSpill.tilstand(); if (!l || !S) { ut.feil.push('ingen leir'); return ut; }
      const før = { ider: new Set(l.bygg.map(b => b.id)), lager: JSON.stringify(l.lager), penger: S.penger, kam: { x: kam.x, y: kam.y, m: kam.m }, fokus: P2.S.fokus, etasje: P2.S.etasje, D: JSON.stringify(FS.tilstand()), lagret: localStorage.getItem(FS.NØKKEL) };
      const i3d = typeof på3d !== 'undefined' && på3d, prøve = [];
      const hus = async (i, dx, dy, ind) => { const x = S.leir.x + dx, y = S.leir.y + dy, Pv = [[x, y], [x + 34, y], [x + 34, y + 20], [x, y + 20]], e = { i, t: 6, h: 8, ind };
        P2.prøvehus(Pv, e); prøve.push(i); if (!P2.hus(i)) P2.nyttHus(Pv, e, 0); if (!i3d) P2.seInn({ Pv, e });
        for (let k = 0; k < 80; k++) { await vent(150); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; } if (P2.modell) P2.modell(i); skitten = true; await vent(700); return { Pv, e }; };
      const rad = () => { const el = document.getElementById('fbrad'); return el ? el.textContent : null; };
      try {
        // (3) selvtester: bryggeri og for langt unna
        await hus(990991, 260, -60, 13); const V13 = FS.vurder(990991); ut.bryggeri = V13.v && V13.v.feil;
        ok(V13.v && !V13.v.ok && /lager eller verksted/.test(V13.v.feil), 'bryggeriet ble godtatt som fabrikk: ' + JSON.stringify(V13.v));
        await hus(990992, 2500, 0, 1); const Vf = FS.vurder(990992); ut.langt = Vf.v && Vf.v.feil; ok(Vf.v && !Vf.v.ok && /for langt/.test(Vf.v.feil), 'et sagbruk 2,5 km unna ble godtatt: ' + JSON.stringify(Vf.v));
        // (1) sagbruket 300 m unna
        const { Pv } = await hus(990993, 300, 40, 1); ut.radFør = i3d ? '(3D)' : rad();
        if (!i3d) ok(ut.radFør && /Ta i bruk som fabrikk/.test(ut.radFør), 'plantegningen har ikke knappen: ' + ut.radFør);
        const V = FS.vurder(990993); ut.pris = V.I; const penger0 = OppstartSpill.tilstand().penger;
        const kn = !i3d && document.querySelector('[data-fb="ta"][data-hus="990993"]'); if (kn) kn.click(); else FS.kjør({ type: 'fabrikkbygg', hus: 990993 });
        await vent(300);
        const M = l.bygg.filter(b => b.fabrikk === 990993); ut.maskiner = M.map(b => [b.type, Math.round(b.x - Pv[0][0]), Math.round(b.y - Pv[0][1]), b.igjen]);
        ok(M.length === 2 && M[0].type === 'fb_sagbruk' && M[1].type === 'fb_flishogger', 'maskinene kom ikke i leiren: ' + JSON.stringify(ut.maskiner));
        ok(M.every(b => b.x > Pv[0][0] && b.x < Pv[1][0] && b.y > Pv[0][1] && b.y < Pv[2][1]), 'maskinene står ikke inne i bygget: ' + JSON.stringify(ut.maskiner));
        ut.betalt = penger0 - OppstartSpill.tilstand().penger; ok(Math.abs(ut.betalt - V.I.kr) < 1, `istandsettingen kostet ${ut.betalt} (ventet ${V.I.kr})`);
        // (2) drift
        if (M[0]) { l.lager.tømmer = 10; const t0 = l.lager.tre || 0, s = PR.steg(PR.ny(), l, 60, { kraft: 4 }).status[M[0].id]; ut.drift = { tekst: s && s.tekst, planker: Math.round(((l.lager.tre || 0) - t0) * 100) / 100 };
          ok(s && s.går && ut.drift.planker > 1, 'saga i fabrikkbygget går ikke: ' + JSON.stringify(ut.drift)); }
        ut.fane = /Fabrikkbygg/.test(window.ProduksjonSpill ? ProduksjonSpill.html() : ''); ok(ut.fane, 'fanen Produksjon mangler «Fabrikkbygg»');
        ut.lagret = /990993/.test(localStorage.getItem(FS.NØKKEL) || ''); ok(ut.lagret, 'fabrikken er ikke lagret');
        { const D0 = JSON.stringify(FS.tilstand()); FS.lesInn(); ut.lestInn = JSON.stringify(FS.tilstand()) === D0; ok(ut.lestInn, 'lagringen leses ikke inn igjen likt'); }
        if (!i3d) { const n0 = FS.tegnet(); kam.x = Pv[0][0] + 17; kam.y = Pv[0][1] + 10; kam.m = Math.min(kam.m, 1); skitten = true; await vent(800); ut.kart = FS.tegnet() - n0; ok(ut.kart > 0, 'kartet tegner ikke «Din fabrikk»'); }
        // (5) maskinlivet i 3D tar med fabrikkmaskinene som går
        if (window.MaskinerSpill && window.ProduksjonSpill) { const gS = ProduksjonSpill.status; try { ProduksjonSpill.status = () => Object.fromEntries(M.map(b => [b.id, { går: true }])); MaskinerSpill.prøve(null);
          ut.liv = MaskinerSpill.kilder().filter(k => /^fb_/.test(k.type)).map(k => k.type); } finally { ProduksjonSpill.status = gS; }
          ok(ut.liv.includes('fb_sagbruk'), 'maskinlivet tar ikke med saga i fabrikkbygget: ' + JSON.stringify(ut.liv)); }
        // (4) gi opp
        FS.kjør({ type: 'fabrikkbygg', hus: 990993, slipp: true }); ut.etterSlipp = l.bygg.filter(b => b.fabrikk === 990993).length; ok(ut.etterSlipp === 0 && !FS.tilstand().hus[990993], '«Gi opp» tok ikke bort maskinene');
      } catch (e) { ut.feil.push('feil: ' + e.message); }
      finally {
        for (const i of prøve) P2.fjernPrøve(i);
        for (let k = l.bygg.length - 1; k >= 0; k--) if (!før.ider.has(l.bygg[k].id)) l.bygg.splice(k, 1);
        l.lager = JSON.parse(før.lager); const nå = OppstartSpill.tilstand().penger; if (nå < før.penger) OppstartSpill.gi(før.penger - nå); else if (nå > før.penger) OppstartSpill.betal(nå - før.penger);
        const D = FS.tilstand(); for (const k of Object.keys(D.hus)) delete D.hus[k]; Object.assign(D.hus, JSON.parse(før.D).hus); if (før.lagret === null) localStorage.removeItem(FS.NØKKEL); else localStorage.setItem(FS.NØKKEL, før.lagret);
        P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; if (LeirSpill.lagre) LeirSpill.lagre();
      }
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `knapp «${(r.radFør || '').slice(0, 70)}», maskiner ${JSON.stringify(r.maskiner)}, betalt ${r.betalt}, drift ${JSON.stringify(r.drift)}, kart ${r.kart}, liv ${JSON.stringify(r.liv)}; bryggeri: «${r.bryggeri}»`, data: r };
  },
};
