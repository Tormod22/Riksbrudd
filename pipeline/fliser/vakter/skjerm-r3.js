// VAKT «skjerm-r3» (kritikerløkka 26. nov, runde 3 – Ingrid Sæther på PC 1400 × 860 og Jonas Bakke på telefon 390 × 844):
//  - BYGGELISTA STÅR STILLE: mens et bygg bygges (jobblinja i Leir → Bygg endrer seg hvert sekund), står kortet for Dieseltank på samme sted
//    i over tre sekunder (før: y = 422 og 500 annenhvert halve sekund – ikonet kom etter at lista var tegnet på nytt, og kortene vokste)
//  - kortene i lista byttes ikke ut når bare hodet er endret (samme element før og etter)
//  - loggen: avlyttinger fra radiomasten innen en time blir én linje, og et skifte på handelsruta venter (LoggDemp)
//  - lesepause: 600× og et panel du leser (funnet fra en husleting i 2D) gir 1×, og farten kommer tilbake når det lukkes
//  - funnet fra en husleting i 2D står som dialog i 2D
// Setter alt tilbake (bygget, pengene, farten, menyen, testbryterne).
module.exports = { navn: 'skjerm r3: byggelista står stille, loggen samler, lesepause, funnet i 2D', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    const S0 = OppstartSpill.tilstand(), kr0 = S0 ? S0.penger : null, L0 = LeirSpill.tilstand(), bygg0 = new Set(L0 ? L0.bygg.map(b => b.id) : []);
    const fart0 = (document.querySelector('[id^=sp].på') || {}).id || 'sp1', pt0 = window.Paneler ? Paneler.test : undefined, menyÅpen = $('leirmeny') && $('leirmeny').classList.contains('på');
    try {
      // (1) et bygg i arbeid
      OppstartSpill.gi(30e6); const L = LeirSpill.tilstand();
      for (const [dx, dy] of [[-60, -40], [60, -40], [-60, 50], [70, 60], [0, -80], [100, 0], [-100, 0]]) {
        LeirSpill.startPlassering('brakke'); LeirSpill.trykk(L.midt.x + dx, L.midt.y + dy);
        for (let i = 0; i < 50 && LeirSpill.plassering() && (/Sjekker/.test(LeirSpill.plassering().feil || '') || (!LeirSpill.plassering().feil && !LeirSpill.plassering().kart)); i++) await vent(200);
        const p = LeirSpill.plassering(); if (p && !p.feil) { const kb = [...document.querySelectorAll('button')].find(b => /^Kjøp materialene og bygg/.test(b.textContent)); if (kb) kb.click(); else LeirSpill.bekreft(); break; }
        LeirSpill.avbryt(); }
      if (LeirSpill.plassering()) LeirSpill.avbryt();
      ut.jobber = Leir.jobber(LeirSpill.tilstand()).length; krev(ut.jobber > 0, 'fikk ikke startet et bygg (ingen jobb å måle med)');
      // (2) Leir → Bygg, Dieseltank midt i lista, mål i 3,5 s i 10×
      $('sp2').click(); if (!$('leirmeny').classList.contains('på')) $('leirknapp').click(); LeirSpill.fane('bygg'); await vent(600); if (window.Paneler && Paneler.sjekk) Paneler.sjekk(); await vent(300);
      const kort = () => document.querySelector('#leirmeny .bygg.kort[data-type="drivstofftank"]');
      const k0 = kort(); krev(!!k0, 'fant ikke kortet for Dieseltank');
      if (k0) { k0.scrollIntoView({ block: 'center' }); await vent(200);
        const y = [], hode0 = $('leirmeny').querySelector(':scope > .hode'), jobb0 = [...document.querySelectorAll('#leirmeny .igang')].map(e => e.textContent).join('|');
        for (let i = 0; i < 70; i++) { const k = kort(); y.push(k ? Math.round(k.getBoundingClientRect().top) : -999); await vent(50); }
        const jobb1 = [...document.querySelectorAll('#leirmeny .igang')].map(e => e.textContent).join('|');
        ut.y = [...new Set(y)]; ut.hodetByttet = $('leirmeny').querySelector(':scope > .hode') !== hode0; ut.jobbEndret = jobb0 !== jobb1;
        krev(Math.max(...y) - Math.min(...y) <= 2, `kortet for Dieseltank flyttet seg mens lista ble tegnet på nytt: y = ${ut.y.join(', ')}`);
        krev(kort() === k0, 'kortene i lista ble byttet ut selv om de ikke var endret'); }
      // (3) loggen (reglene på siden)
      { const D = LoggDemp.lag(), L2 = []; const inn = (t, n) => { const r = D.vurder(t, L2, n); if (r) { if (r.fjern >= 0) L2.splice(r.fjern, 1); L2.unshift(r.tekst); } return r; };
        inn('Radiomasten fanget opp samband: Røvere 1 kommer. Omtrentlig sted er merket i kartet.', 0); inn('Radiomasten fanget opp samband: Røvere 2 går. Omtrentlig sted er merket i kartet.', 20);
        krev(L2.filter(l => /Radiomasten/.test(l)).length === 1, 'to avlyttinger på en time ble to linjer');
        krev(inn('Handelsruta fra Dombås er truet: fiender i nærheten.', 100) === null && D.modne(150).length === 0 && D.modne(200).length === 1, 'skiftet på handelsruta ble ikke holdt tilbake til det hadde stått'); }
      // (4) lesepause og funnet i 2D
      if (window.Paneler && window.LeteSpill && !(typeof på3d !== 'undefined' && på3d)) { Paneler.test = true; $('sp4').click(); await vent(300);
        const S = OppstartSpill.tilstand(), X = S.leir.x + 90, Y = S.leir.y + 45, P = [[X - 6, Y - 5], [X + 6, Y - 5], [X + 6, Y + 5], [X - 6, Y + 5]]; P.bygg = { kl: 'hus', i: 990001 };
        const lett0 = new Set(LeteSpill.lett().keys()); LeteSpill.ferdig(P, { X, Y, i2d: true }); await vent(800);
        const f = $('funnpanel'); ut.funn2d = !!f && f.getClientRects().length > 0; krev(ut.funn2d, 'funnet fra husletingen i 2D står ikke som dialog');
        ut.tempoUnder = tempo; krev(tempo === 1, `farten er ${tempo}× mens funnet står oppe i 600× (skal være 1×)`);
        LeteSpill.lukkFunn(); await vent(800); ut.tempoEtter = tempo; krev(tempo === 600, `farten kom ikke tilbake til 600× da funnet ble lukket (${tempo}×)`);
        for (const k of [...LeteSpill.lett().keys()]) if (!lett0.has(k)) LeteSpill.lett().delete(k); }
    } catch (e) { ut.feil.push('unntak: ' + e.message); }
    finally {
      if (window.Paneler) Paneler.test = pt0; if (LeirSpill.plassering()) LeirSpill.avbryt();
      { const L1 = LeirSpill.tilstand(); if (L1 && window.KOMMANDO) for (const b of L1.bygg.slice()) if (!bygg0.has(b.id)) KOMMANDO({ type: 'riv', bygg: b.id }); }
      const S1 = OppstartSpill.tilstand(); if (S1 && kr0 !== null && S1.penger !== kr0) { if (S1.penger < kr0) OppstartSpill.gi(kr0 - S1.penger); else OppstartSpill.betal(S1.penger - kr0); }
      if ($('leirmeny').classList.contains('på') !== !!menyÅpen) $('leirknapp').click(); if ($(fart0)) $(fart0).click();
    }
    return ut; });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `kortet står stille (y ${(d.y || []).join(',')}), hodet byttet ${d.hodetByttet}, funnet i 2D, lesepause ${d.tempoUnder}× → ${d.tempoEtter}×`, data: d };
} };
