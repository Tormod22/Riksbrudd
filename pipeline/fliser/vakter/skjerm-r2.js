// VAKT «skjerm-r2» (kritikerløkka 26. nov, runde 2 – Jonas Bakke på telefon 390 × 844 og Ingrid Sæther på PC 1400 × 860):
//  - mens et kort venter på svar, er de andre overleggene borte på telefon (body.kortvent: banneret, Neste-lappen, panelene), og et trykk
//    i topplinja åpner ikke noe panel bak kortet (skjermlag.js)
//  - én pauselinje: stripa «⏭ Svar på kortet først …» (#flytkort) blir borte når pauselappen under kortet står (PC og telefon)
//  - flisa øverst heter «Tall ▾» (telefon) / «Flere tall» (PC), ikke «Mer» eller «+7 tall» (spillhud.js)
//  - bare én fane lyser i bunnmenyen/kommandolinja
//  - store kjøp (fra 3 mill. kr) må bekreftes i banneret før pengene trekkes (leir-visning.js)
//  - navnene i kartet står helt på skjermen (kantene er hindringer for Etikett, kompakt.js)
//  - varslene nede til venstre ligger ikke under Neste-lappen (kompakt.js)
// Setter alt tilbake (testbryterne, kortet, plasseringen, pengene, kameraet).
module.exports = { navn: 'skjerm r2: ett overlegg om gangen, én pauselinje, «Tall ▾», én fane, bekreft store kjøp, navn inne', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    const synlig = id => { const e = $(id); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const tlf = document.body.classList.contains('kort'); ut.tlf = tlf;
    const st0 = window.Skjermlag ? Skjermlag.test : undefined, lt0 = window.LeirSpill ? LeirSpill.test : undefined, kam0 = { x: kam.x, y: kam.y, m: kam.m };
    const S0 = window.OppstartSpill && OppstartSpill.tilstand(), kr0 = S0 ? S0.penger : null;
    const L0 = window.LeirSpill && LeirSpill.tilstand(), bygg0 = new Set(L0 ? L0.bygg.map(b => b.id) : []);
    try {
      // (1) kort som venter: ett overlegg om gangen (telefon) og én pauselinje (alle)
      const m = $('morgenkort');
      if (window.Skjermlag && m && !m.classList.contains('på') && !synlig('hendelse') && !synlig('samfunnkort')) {
        Skjermlag.test = true; const html = m.innerHTML, fart = typeof tempo !== 'undefined' ? tempo : 1;
        m.innerHTML = '<h3>Morgenmøtet</h3><p>Prøve fra vakta.</p><button type="button">Valg</button>'; m.classList.add('på');
        const f = $('flytkort'), fhtml = f ? f.innerHTML : '', fpå = f && f.classList.contains('på');
        if (f) { f.innerHTML = '<span>⏭ <b>Svar på kortet først – spillet står på pause til du svarer.</b></span>'; f.classList.add('på'); }
        await vent(400);
        ut.kortvent = document.body.classList.contains('kortvent');
        krev(!f || !f.classList.contains('på'), 'stripa «Svar på kortet først» står fortsatt ved siden av pauselappen');
        if (tlf) {
          krev(ut.kortvent, 'body.kortvent mangler mens morgenmøtet venter (telefon)');
          krev(!synlig('nestelapp'), 'Neste-lappen står mens et kort venter (telefon)');
          const lm = $('leirmeny'), var0 = lm && lm.classList.contains('på'), kasse = [...document.querySelectorAll('.stats > div')].find(d => d.dataset.s === 'sPenger');
          if (kasse && !var0) { kasse.click(); await vent(250); krev(!(lm && lm.classList.contains('på')), 'trykk på kassa åpnet Leir bak kortet'); if (lm && lm.classList.contains('på') && $('leirknapp')) $('leirknapp').click(); }
        }
        m.classList.remove('på'); m.innerHTML = html; if (f) { f.innerHTML = fhtml; f.classList.toggle('på', !!fpå); }
        await vent(400); krev(!document.body.classList.contains('kortvent'), 'body.kortvent står etter at kortet er borte');
        if (typeof tempo !== 'undefined' && tempo !== fart) { const b = $(fart > 0 ? 'sp1' : 'sp0'); if (b) b.click(); tempo = fart; }
      } else ut.kortHoppet = true;
      // (2) flisa øverst og én aktiv fane
      if (window.SpillHud) { SpillHud.oppdater(); const n = SpillHud.mer().navn || ''; ut.tallNavn = n;
        if (SpillHud.mer().antall > 0) krev(!/^Mer\b|^\+\d/.test(n.trim()), `flisa øverst heter «${n}» (skal være «Tall ▾» / «Flere tall»)`);
        const bar = [$('kommando'), $('mkom')].find(e => e && e.classList.contains('på'));
        if (bar) { const på = [...bar.querySelectorAll('button.på')].filter(b => b.getClientRects().length).map(b => b.dataset.k); ut.faner = på; krev(på.length <= 1, `${på.length} faner lyser samtidig (${på})`); } }
      // (3) store kjøp må bekreftes
      if (window.LeirSpill && S0 && LeirSpill.startPlassering && !LeirSpill.plassering() && LeirSpill.totalPris('kontrollrom') >= 3e6) {
        LeirSpill.test = true; LeirSpill.startPlassering('kontrollrom'); await LeirSpill.trykk(S0.leir.x + 60, S0.leir.y - 50);
        const finn = () => [...document.querySelectorAll('#byggvalg button')].find(b => /^(Bygg her|Kjøp materialene)/.test(b.textContent));
        for (let i = 0; i < 25 && !finn(); i++) await vent(100);
        const kn = finn(); if (!kn) ut.banner = ($('byggvalg') || {}).innerText;
        if (kn) { kn.click(); await vent(150); ut.spør = !!$('byggja'); krev(!!$('byggja'), 'kontrollrommet (over 3 mill. kr) ble bestilt uten bekreftelse');
          krev(OppstartSpill.tilstand().penger === kr0, 'pengene ble trukket før bekreftelsen'); } else ut.ingenByggknapp = true;
        LeirSpill.avbryt(); }
      // (4) navnene står på skjermen (2D)
      if (window.Etikett && typeof på3d !== 'undefined' && !på3d && S0) { kam.m = 60; kam.x = S0.leir.x + (VW / 2 - 40) * kam.m; kam.y = S0.leir.y; skitten = true; await vent(700);
        const ute = Etikett.tegnet().filter(L => L.ramme[0] < 0 || L.ramme[0] + L.ramme[2] > VW + 1); ut.navn = Etikett.tegnet().length;
        krev(!ute.length, `navn utenfor skjermen: ${ute.map(L => L.t).join(', ')}`); }
      // (5) varslene og Neste-lappen
      if (synlig('nestelapp') && synlig('varsler')) { const l = $('nestelapp').getBoundingClientRect();
        const over = [...$('varsler').children].filter(c => c.getClientRects().length).some(c => { const r = c.getBoundingClientRect(); return r.right > l.left && r.left < l.right && r.bottom > l.top + 1 && r.top < l.bottom; });
        krev(!over, 'et varsel ligger under Neste-lappen'); }
    } finally {
      if (window.Skjermlag && st0 !== undefined) Skjermlag.test = st0; if (window.LeirSpill) LeirSpill.test = lt0;
      if (window.LeirSpill && LeirSpill.plassering && LeirSpill.plassering()) LeirSpill.avbryt();
      { const L1 = window.LeirSpill && LeirSpill.tilstand(); if (L1 && window.KOMMANDO) for (const b of L1.bygg.slice()) if (!bygg0.has(b.id)) KOMMANDO({ type: 'riv', bygg: b.id }); }
      kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; skitten = true;
      const S1 = window.OppstartSpill && OppstartSpill.tilstand(); if (S1 && kr0 !== null && S1.penger !== kr0) { if (S1.penger < kr0) OppstartSpill.gi(kr0 - S1.penger); else OppstartSpill.betal(S1.penger - kr0); }
    }
    return ut; });
  return { ok: d.feil.length === 0, tekst: d.feil.length ? d.feil.join(' · ') : `ok (${profil}: kortvent ${d.kortvent}, flis «${d.tallNavn}», faner ${JSON.stringify(d.faner)}, spør ${d.spør}, ${d.navn} navn)`, data: d };
} };
