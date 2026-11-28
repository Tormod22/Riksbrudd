// VAKT «ut2-seier» (28. nov; docs/plan-selskap-okonomi.md 14.6): tre veier til seier (spill/seier.js + seier-visning.js)
//  - reglene med prøvedata: makt fra Strategi sin stilling, penger mot målet og rivalene, gjenoppbygging (strøm, bruer, lojalitet, tid)
//  - i spillet: SeierSpill.bilde() har alle tre veiene for alle tre sidene; med tre prøvetettsteder (når INFRA finnes) teller gjenoppbyggingen dem
//  - «Tre veier til seier» står i Selskapet → Oversikt med tre målere
//  - avslutningen kommer IKKE av seg selv i testene; med SeierSpill.test = true kommer den når en vei nås (penger med lavt mål her),
//    har avis, tall og «Spill videre» / «Nytt spill», og «Spill videre» lukker den, lagrer seieren og starter tida igjen
//  - krigskartets seierkort (StrategiSpill.seierKort) viser nå det nye kortet (med «Større region» som før)
// Setter alt tilbake: «riksbrudd-seier», REGLER, testflagget, prøvetettstedene, panelet og tempoet.
module.exports = { navn: 'ut2-seier: tre veier til seier og avslutningen', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms));
    const SE = window.Seier, SS = window.SeierSpill, $ = id => document.getElementById(id);
    krev(SE && SS && window.Strategi, 'Seier, SeierSpill eller Strategi mangler'); if (ut.feil.length) return ut;
    const lagretFør = localStorage.getItem(SS.NØKKEL), testFør = SS.test, P0 = { ...SE.REGLER.penger }, tempo0 = typeof tempo !== 'undefined' ? tempo : null;
    const nye = [], T0 = typeof TETTSTEDER !== 'undefined' ? new Map(TETTSTEDER) : null;
    try {
      // ---------- reglene med prøvedata ----------
      const byer = [{ id: 1, folk: 6000 }, { id: 2, folk: 3000 }, { id: 3, folk: 1000 }], eier = { 1: 'blå', 2: 'rød', 3: null };
      const st = Strategi.stilling(byer, id => eier[id]), D = 1440;
      krev(SE.makt(st, 'blå', 5 * D, Strategi.REGLER).nådd && Math.abs(SE.makt(st, 'rød', 5 * D, Strategi.REGLER).fremdrift - .5) < 1e-6, 'makt: 60 % gir seier, 30 % er halvveis');
      krev(!SE.makt(st, 'blå', D, Strategi.REGLER).nådd, 'makt: for tidlig skal ikke gi seier');
      const p = SE.penger({ blå: 125e6, rød: 30e6, grønn: 20e6 }, 'blå', 5 * D); krev(!p.nådd && Math.abs(p.fremdrift - .5) < 1e-6, 'penger: 125 av 250 mill. skal være 50 %');
      krev(SE.penger({ blå: 260e6, rød: 300e6, grønn: 0 }, 'rød', 5 * D).nådd && !SE.penger({ blå: 260e6, rød: 300e6, grønn: 0 }, 'blå', 5 * D).nådd, 'penger: den største vinner, også en rival');
      const g = [{ id: 'a', navn: 'A', folk: 3000, eier: 'blå', strøm: true, ødelagt: 0, loj: 70, holdtFra: 0 }, { id: 'b', navn: 'B', folk: 2000, eier: 'blå', strøm: true, ødelagt: 0, loj: 60, holdtFra: 0 },
        { id: 'c', navn: 'C', folk: 1000, eier: 'blå', strøm: true, ødelagt: 0, loj: 60, holdtFra: 0 }, { id: 'd', navn: 'D', folk: 14000, eier: null, strøm: true, ødelagt: 0, loj: null, holdtFra: null }];
      krev(SE.gjenoppbygging(g, 'blå', { tid: 8 * D }).nådd, 'gjenoppbygging: tre gode tettsteder skal gi seier');
      const g2 = SE.gjenoppbygging(g.map(b => (b.id === 'a' ? { ...b, ødelagt: 1 } : b)), 'blå', { tid: 8 * D }); krev(!g2.nådd && g2.ok === 2 && g2.fremdrift > 0 && g2.fremdrift < 1, 'gjenoppbygging: en sprengt bru skal stoppe seieren');
      krev(!SE.gjenoppbygging(g.map(b => (b.id === 'b' ? { ...b, strøm: false } : b)), 'blå', { tid: 8 * D }).nådd, 'gjenoppbygging: uten strøm skal stoppe seieren');

      // ---------- i spillet ----------
      SS.test = false;
      const L = OppstartSpill.tilstand().leir;
      if (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && T0) {
        const nyBy = (id, dx, dy, folk) => { const x = L.x + dx, y = L.y + dy, r = 300; return { lag: 'tettsted', e: { id, navn: 'Vakt ' + id, folk }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; };
        nye.push(nyBy('s2a', 4000, 1000, 900), nyBy('s2b', -3000, 2000, 800), nyBy('s2c', 1000, -3500, 700)); INFRA.tettsted.push(...nye);
        for (const b of nye) TETTSTEDER.set(b.e.id, { eier: 'blå', inntar: null });
      } else ut.utenTettsteder = true;
      const B = SS.bilde(); krev(B && B.A && ['blå', 'rød', 'grønn'].every(s => ['makt', 'penger', 'gjenoppbygging'].every(v => B.A[s][v] && Number.isFinite(B.A[s][v].fremdrift))), 'SeierSpill.bilde mangler en side eller en vei');
      if (B) { ut.fremdrift = Object.fromEntries(['makt', 'penger', 'gjenoppbygging'].map(v => [v, Math.round(B.A.blå[v].fremdrift * 100)])); ut.verdi = Math.round(B.verdi.blå.sum / 1e6);
        // (ut6-fiksd) med børsen (ut5-bors) er verdien børsverdien: den følger stemningen (brutte kontrakter fra vaktene før senker den) og
        // ukas netto, og kan da være under kassa. Da sjekkes at seieren bruker børsverdien; uten børsen som før (verdien ≥ kassa).
        const bø = window.BorsSpill && BorsSpill.seierInn ? BorsSpill.seierInn() : null;
        if (bø) krev(B.verdi.blå.sum > 0 && Math.abs(B.verdi.blå.sum - bø.verdier.blå) < 1, 'selskapets verdi er ikke børsverdien (' + B.verdi.blå.sum + ' mot ' + bø.verdier.blå + ')');
        else krev(B.verdi.blå.sum >= OppstartSpill.tilstand().penger, 'selskapets verdi er mindre enn kassa');
        if (nye.length) { krev(B.A.blå.gjenoppbygging.holdt >= 3, 'gjenoppbyggingen teller ikke prøvetettstedene (' + B.A.blå.gjenoppbygging.holdt + ')');
          krev(B.A.blå.makt.andel > 0, 'makt: stillingen har ikke prøvetettstedene'); } }
      // Selskapet → Oversikt
      if (window.SelskapetSpill) { SelskapetSpill.vis(true, 'oversikt'); await vent(150); const P = $('selskapet');
        krev(P && /Tre veier til seier/.test(P.textContent) && P.querySelectorAll('.seier3 .sv').length === 3 && P.querySelectorAll('.seier3 .mlr').length === 3, 'Oversikt har ikke tre målere for seier');
        SelskapetSpill.vis(false); }
      // ikke av seg selv i testene
      SE.REGLER.penger.mål = 1; SE.REGLER.penger.tidligst = 0; SS.takt(); await vent(50);
      krev(!SS.erÅpen(), 'avslutningen kom av seg selv i testene');
      // med test = true kommer den (penger: målet er satt ned)
      const tidFør = typeof tempo !== 'undefined' ? tempo : 0; if (tidFør === 0 && $('sp1')) $('sp1').click();
      SS.test = true; SS.takt(); await vent(100); const k = $('krigkort');
      krev(SS.erÅpen() && k && k.classList.contains('på') && k.classList.contains('avslutning'), 'avslutningen kom ikke når en vei ble nådd');
      if (k) { const t = k.textContent; ut.overskrift = (k.querySelector('h2') || {}).textContent;
        krev(/Regionsavisa/.test(t) && /Penger/.test(t) && /Dager/.test(t) && /Kontrakter levert/.test(t) && /Falne/.test(t) && k.querySelector('[data-valg="videre"]') && k.querySelector('[data-valg="nytt"]'), 'avslutningen mangler avis, tall eller knappene');
        { const a = k.querySelector('.avis'); if (a) { const r = a.getBoundingClientRect(); krev(r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, 'avslutningen står utenfor skjermen'); } }
        krev(typeof tempo === 'undefined' || tempo === 0, 'spillet sto ikke stille under avslutningen');
        k.querySelector('[data-valg="videre"]').click(); await vent(80); }
      krev(!SS.erÅpen() && !(k && k.classList.contains('på')), '«Spill videre» lukket ikke avslutningen');
      krev(typeof tempo === 'undefined' || tempo > 0, '«Spill videre» startet ikke tida igjen');
      { let lag = null; try { lag = JSON.parse(localStorage.getItem(SS.NØKKEL)); } catch (e) { lag = null; }
        krev(lag && lag.seire && lag.seire.some(q => q.side === 'blå' && q.vei === 'penger' && q.valg === 'videre'), 'seieren ble ikke lagret'); }
      SS.takt(); await vent(50); krev(!SS.erÅpen(), 'samme seier kom en gang til');
      SS.test = false;
      // krigskartets seierkort er byttet ut med det nye
      if (window.StrategiSpill && StrategiSpill.seierKort) { StrategiSpill.seierKort(.62); await vent(50);
        krev(k.classList.contains('avslutning') && /Større region/.test(k.textContent) && /Spill videre/.test(k.textContent), 'krigskartets seierkort er ikke det nye');
        SS.lukk('videre'); }
      if (tidFør === 0 && typeof tempo !== 'undefined' && tempo > 0 && $('sp0')) $('sp0').click();
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally {
      Object.assign(SE.REGLER.penger, P0); SS.test = testFør; if (SS.erÅpen()) SS.lukk('videre');
      { const k = $('krigkort'); if (k) k.classList.remove('på', 'avslutning'); }
      for (const b of nye) { const i = INFRA.tettsted.indexOf(b); if (i >= 0) INFRA.tettsted.splice(i, 1); TETTSTEDER.delete(b.e.id); }
      if (T0) for (const [id, v] of T0) if (!TETTSTEDER.has(id)) TETTSTEDER.set(id, v);
      if (tempo0 !== null && typeof tempo !== 'undefined' && tempo !== tempo0) { if (tempo0 === 0 && $('sp0')) $('sp0').click(); }
      if (lagretFør === null) localStorage.removeItem(SS.NØKKEL); else localStorage.setItem(SS.NØKKEL, lagretFør); SS.lesPåNytt();
      if (window.SelskapetSpill) SelskapetSpill.vis(false);
    }
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? `tre veier ok (blå: makt ${d.fremdrift && d.fremdrift.makt} %, penger ${d.fremdrift && d.fremdrift.penger} %, gjenoppbygging ${d.fremdrift && d.fremdrift.gjenoppbygging} %; verdi ${d.verdi} mill.)${d.utenTettsteder ? ' – uten tettsteder i kartet' : ''}, avslutningen «${d.overskrift}» kom og «Spill videre» lagret` : d.feil.join('; '), data: d };
} };
