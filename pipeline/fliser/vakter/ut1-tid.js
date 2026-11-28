// Vakt for pakka «tid» (G2 og G3 del 1, 28. nov – docs/natt/ut1-tid.md): «Spol til …» (FlytSpill.spol(mål) via TidaSpill.spolTil)
// går i 600× og stopper av seg selv når en byggejobb er ferdig; et annet fartsvalg avbryter; «Pause av seg selv» ved «folk står
// fast» setter spillet på pause; tidslinja viser hendelsene (PC); panelet «Spol til» har valgene; statistikken samler en prøve, lukker
// et døgn og tegner grafene (StatistikkSpill.graf). Setter alt tilbake: penger, lager, byggene, folkenes oppgaver, tida, farten,
// valgene i «riksbrudd-tida» og statistikken.
module.exports = {
  navn: 'tid (spol til, pause, tidslinje, statistikk)',
  kjør: async (pg, profil) => pg.evaluate(async (profil) => {
    const feil = [], d = {}, vent = ms => new Promise(r => setTimeout(r, ms)), krev = (b, t) => { if (!b) feil.push(t); };
    if (!window.Tida || !window.TidaSpill || !window.FlytSpill || !FlytSpill.spolMål || !window.Statistikk || !window.StatistikkSpill || !window.LeirSpill || !window.KOMMANDO) return { ok: false, tekst: 'Tida, TidaSpill, FlytSpill.spolMål, Statistikk, StatistikkSpill, LeirSpill eller KOMMANDO mangler' };
    const S = OppstartSpill.tilstand(), L = LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand();
    if (!S || !S.leir || !L) return { ok: false, tekst: 'ingen leir' };
    const før = { penger: S.penger, lager: JSON.stringify(L.lager || {}), bygg: (L.bygg || []).map(b => b.id), tid, tempo, fart: (document.querySelector('.knapper [id^=sp].på') || {}).id || 'sp1',
      valg: localStorage.getItem('riksbrudd-tida'), stat: JSON.stringify(StatistikkSpill.tilstand()), bok: window.PengerSpill && PengerSpill.tilstand() ? JSON.stringify(PengerSpill.tilstand().B || null) : null, oppg: F ? F.personer.map(p => p.oppgave) : null, test: [FlytSpill.test, TidaSpill.test] };
    const klikk = id => { const b = document.getElementById(id); if (b) b.click(); };
    try {
      // ---------- reglene ----------
      const o = TidaSpill.øyeblikk();
      krev(Number.isFinite(o.tid) && Array.isArray(o.jobber) && Array.isArray(o.kontrakter), 'TidaSpill.øyeblikk() gir ikke bildet');
      krev(Tida.valg(o).some(v => v.id === 'morgen'), '«Spol til» mangler morgenen');
      // ---------- spol til morgenen: 600× og et mål; et annet fartsvalg avbryter ----------
      klikk('sp1'); await vent(50);
      krev(TidaSpill.spolTil('morgen'), 'spolTil(morgen) startet ikke');
      await vent(150); d.morgen = { tempo, mål: FlytSpill.spolMål() };
      krev(tempo === 600 && /morgen/.test(String(FlytSpill.spolMål())), 'spol til morgenen går ikke i 600× med mål: ' + JSON.stringify(d.morgen));
      klikk('sp1'); await vent(50); krev(!FlytSpill.spolMål() && !FlytSpill.spoler(), 'et annet fartsvalg avbrøt ikke «Spol til»');
      // ---------- spol til byggingen er ferdig: stopper selv ----------
      KOMMANDO({ type: 'kjøpMateriale', materiale: 'stål', mengde: 4, stille: true });
      let r = null; for (const [dx, dy] of [[-55, 45], [75, 75], [-90, -45], [120, -20], [-20, 140], [150, 120]]) { r = KOMMANDO({ type: 'bygg', bygg: { type: 'solcelle', x: S.leir.x + dx, y: S.leir.y + dy, ret: 0 }, stille: true }); if (r && r.ok) break; }
      krev(r && r.ok, 'prøvebygget ble ikke bestilt: ' + JSON.stringify(r && r.feil));
      const jobb = TidaSpill.øyeblikk().jobber.length; krev(jobb > 0, 'prøvebygget gir ingen byggejobb');
      krev(Tida.valg(TidaSpill.øyeblikk()).some(v => v.id === 'bygg'), '«Spol til» mangler «Byggingen er ferdig»');
      const t0 = tid; krev(TidaSpill.spolTil('bygg'), 'spolTil(bygg) startet ikke');
      for (let i = 0; i < 80 && FlytSpill.spolMål(); i++) await vent(250);
      const st = FlytSpill.sistStopp(); d.bygg = { min: Math.round(tid - t0), tempo, stopp: st && st.liste.map(h => h.tekst).join(', '), spolTil: st && st.spolTil };
      krev(!FlytSpill.spolMål() && tempo <= 1, '«Spol til byggingen» stoppet ikke av seg selv: ' + JSON.stringify(d.bygg));
      krev(st && st.spolTil && /ferdig/.test(d.bygg.stopp || ''), 'stoppet ikke fordi bygget ble ferdig: ' + JSON.stringify(d.bygg));
      // ---------- panelet og tidslinja ----------
      TidaSpill.åpne(); await vent(80);
      const p = document.getElementById('spoltil'); d.panel = [...p.querySelectorAll('[data-spol]')].map(b => b.getAttribute('data-spol'));
      krev(p.getClientRects().length > 0 && d.panel.includes('morgen'), 'panelet «Spol til» vises ikke med valgene: ' + d.panel);
      krev(p.querySelectorAll('[data-pause]').length === 3, 'panelet mangler de tre pausevalgene'); TidaSpill.lukk();
      TidaSpill.settTidslinje(true); await vent(700); d.linje = TidaSpill.linje();
      const linjeVis = getComputedStyle(document.getElementById('tidslinje')).display !== 'none';
      if (profil === 'PC') krev(linjeVis && d.linje.some(t => /Morgenmøtet/.test(t)), 'tidslinja vises ikke på PC: ' + d.linje);
      else krev(!linjeVis, 'tidslinja står øverst på telefon (skal bare være i panelet)');
      TidaSpill.settTidslinje(false);
      // ---------- pause av seg selv: folk står fast ----------
      // (ut2) i en full kjøring kan tidligere vakter ha latt byggejobber stå uten byggere (da er «står fast» alt sant, og ingenting
      // endrer seg), og jobbtavla (spill/jobber.js) kan fordele folkene på nytt midt i prøven. Derfor: tavla fordeler ikke under prøven,
      // to arbeidsføre settes på «bygg» først, og vi venter til bildet sier «ikke fast» før alle får fri.
      // Byggelagene regnes av leirens egne folk (L.folk, Leir.folkLag). Etter en omlasting i en tidligere vakt kan FolkSpill.tilstand() være et
      // annet objekt enn L.folk – da bruker vi L.folk (det er den leir.js leser).
      const FF = L.folk && Array.isArray(L.folk.personer) ? L.folk : F, oppgFF = FF ? FF.personer.map(q => q.oppgave) : null; d.sammeFolk = FF === F;
      const FR = window.FolkRegler, JS = window.JobberSpill, J0 = JS && JS.tilstand ? JSON.stringify(JS.tilstand()) : null, jl0 = localStorage.getItem('riksbrudd-jobber');
      const af = FF ? FF.personer.filter(q => (FR && FR.arbeidsfør ? FR.arbeidsfør(q) : q.helse >= .4)) : [];
      if (!(L.folk && Array.isArray(L.folk.personer))) d.pause = 'hoppet over: leiren har ingen egne folk (L.folk) – byggelagene regnes da uten folk';
      else if (af.length) {
        if (J0) JS.sett({ ...JSON.parse(J0), auto: false });
        for (const q of af.slice(0, 2)) q.oppgave = 'bygg';
        TidaSpill.test = true; TidaSpill.settPause('fast', true); klikk('sp2'); await vent(50);
        // en byggejobb må finnes: prøv flere plasser (andre vakter kan ha bygget der før)
        KOMMANDO({ type: 'kjøpMateriale', materiale: 'stål', mengde: 2, stille: true }); d.plass = null;
        for (const [dx, dy] of [[60, -50], [-70, -60], [90, 40], [-100, 30], [40, 110], [-40, -120], [130, -90], [-140, 100]]) {
          const q = KOMMANDO({ type: 'bygg', bygg: { type: 'solcelle', x: S.leir.x + dx, y: S.leir.y + dy, ret: 0 }, stille: true }); if (q && q.ok) { d.plass = [dx, dy]; break; } d.byggFeil = q && q.feil; }
        krev(TidaSpill.øyeblikk().jobber.length > 0, 'fant ingen plass til en byggejobb i pauseprøven: ' + d.byggFeil);
        for (let i = 0; i < 20 && TidaSpill.øyeblikk().fast; i++) await vent(100);
        d.førFast = TidaSpill.øyeblikk().fast; await vent(700);
        for (const q of FF.personer) q.oppgave = 'fri';
        for (let i = 0; i < 30 && tempo !== 0; i++) await vent(100);
        d.pause = { tempo, sammeFolk: d.sammeFolk, førFast: d.førFast, jobber: TidaSpill.øyeblikk().jobber.length, fastNå: TidaSpill.øyeblikk().fast, sist: TidaSpill.sistPause() && TidaSpill.sistPause().liste.map(q => q.type) };
        krev(!d.førFast, '«folk står fast» var sant selv med to på «bygg»: ' + JSON.stringify(TidaSpill.øyeblikk()).slice(0, 200));
        krev(tempo === 0 && d.pause.sist && d.pause.sist.includes('fast'), '«Pause ved folk står fast» satte ikke spillet på pause: ' + JSON.stringify(d.pause));
        FF.personer.forEach((q, i) => { q.oppgave = oppgFF[i]; }); TidaSpill.settPause('fast', false); TidaSpill.test = før.test[1];
        if (J0) { JS.sett(JSON.parse(J0)); if (jl0 === null) localStorage.removeItem('riksbrudd-jobber'); else localStorage.setItem('riksbrudd-jobber', jl0); }
      } else d.pause = 'hoppet over: ingen arbeidsføre i leiren';
      // ---------- statistikken ----------
      StatistikkSpill.prøvNå(); const rad = StatistikkSpill.lukkNå();
      d.rad = rad && { d: rad.d, moral: rad.moral, folk: rad.folk, kassa: rad.kassa, bygg: rad.bygg };
      krev(rad && Number.isFinite(rad.folk) && Number.isFinite(rad.kassa), 'statistikken lukket ikke døgnet med folk og kassa: ' + JSON.stringify(d.rad));
      krev(StatistikkSpill.rader().length >= 1, 'statistikken har ingen rader');
      const flate = document.createElement('div'); flate.style.width = '320px'; document.body.appendChild(flate);
      for (const g of Object.keys(Statistikk.GRAFER)) { const svar = StatistikkSpill.graf(flate, g); if (!svar || !svar.ok || !flate.querySelector('canvas')) feil.push('grafen ' + g + ' ble ikke tegnet'); }
      flate.remove();
      StatistikkSpill.åpne('penger'); await vent(80); krev(document.getElementById('statistikk').getClientRects().length > 0, 'panelet «Statistikk» åpnes ikke'); StatistikkSpill.lukk();
    } catch (e) { feil.push('kastet: ' + e.message); }
    finally {
      // tilbake: byggene, lager, penger, folk, tid, fart, valg og statistikken
      L.bygg = (L.bygg || []).filter(b => før.bygg.includes(b.id)); try { L.lager = JSON.parse(før.lager); } catch (e) { /* som det var */ }
      S.penger = før.penger; if (før.bok && PengerSpill.tilstand()) { const P = PengerSpill.tilstand(); P.B = JSON.parse(før.bok); P.sist = før.penger; if (PengerSpill.lagre) PengerSpill.lagre(); } if (F && før.oppg) F.personer.forEach((q, i) => { if (før.oppg[i]) q.oppgave = før.oppg[i]; });
      tid = før.tid; klikk(før.fart); if (før.tempo === 0) klikk('sp0');
      TidaSpill.settPause('fast', false); TidaSpill.settTidslinje(false); TidaSpill.lukk(); StatistikkSpill.lukk();
      if (før.valg === null) localStorage.removeItem('riksbrudd-tida'); else localStorage.setItem('riksbrudd-tida', før.valg);
      const ST = StatistikkSpill.tilstand(), gml = JSON.parse(før.stat); if (ST && gml) { ST.dager = gml.dager; ST.åpen = gml.åpen; StatistikkSpill.lagre(); }
      FlytSpill.test = før.test[0]; TidaSpill.test = før.test[1];
      if (LeirSpill.lagre) LeirSpill.lagre(); skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `spol til bygget stoppet etter ${d.bygg.min} spillminutter («${d.bygg.stopp}»), pause ved folk står fast, ${Object.keys(Statistikk.GRAFER).length} grafer`, data: d };
  }, profil),
};
