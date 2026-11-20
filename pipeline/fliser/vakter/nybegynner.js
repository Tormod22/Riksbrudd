// Vakt for pakka «nybegynner» (runde 8, 20. nov natt): det kritikerne C og D fant om folk, tropper og opplæringen for en ny spiller.
// (1) troppforslagene lar to bli igjen og bygge, teksten følger antallet, og «Opprett» advarer når leiren mister byggerne;
// (2) «Oppløs troppen» står i lagpanelet (to trykk) og «Send hjem og oppløs» når troppen er ute (en ny ordre avbryter);
// (3) «Ingen bygger» i Leir-menyen og «Sett to på Bygg» / «Ring etter arbeidere»; (4) opplæringen: steg 6 holder med en tropp og to på
// vakt, steg 9 venter usynlig til noe er skadet, «Senere» og angrep legger ruta sammen, og på telefon viker den for paneler.
// Setter alt tilbake: folket (personer, oppgaver, neste id), kassa, lagene, leirens bygg og lager, opplæringen og lagringen av den.
module.exports = {
  navn: 'nybegynner (tropper, folk og opplæring)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = { feil: [], ms: {} }, t0 = performance.now(), merk = n => { ut.ms[n] = Math.round(performance.now() - t0); }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id), krev = (b, t) => { if (!b) ut.feil.push(t); return !!b; };
      if (!window.Tropper || !window.TropperSpill || !window.FolkSpill || !FolkSpill.tilstand() || !window.OpplaeringSpill || !window.LeirSpill || !LeirSpill.tilstand()) { ut.feil.push('mangler moduler eller spill'); return ut; }
      const F = FolkSpill.tilstand(), L = LeirSpill.tilstand(), S = OppstartSpill.tilstand(), leir = S.leir;
      const før = { personer: JSON.parse(JSON.stringify(F.personer)), neste: F.neste, moral: F.moral, penger: S.penger, enheter: ENHETER.slice(), valgt: typeof valgt !== 'undefined' ? valgt : null, bygg: L.bygg.slice(), lager: JSON.stringify(L.lager),
        frø: typeof frø !== 'undefined' ? frø : null, opp: localStorage.getItem('riksbrudd-opplaering'), oppAv: localStorage.getItem('riksbrudd-opplaering-av'), oppSammen: localStorage.getItem('riksbrudd-opplaering-sammen'), oppTest: OpplaeringSpill.test, loggN: typeof loggLinjer !== 'undefined' ? loggLinjer.length : 0 };
      try {
        // ---------- (1) reglene og forslagene ----------
        krev(typeof Tropper.behold === 'function' && typeof Tropper.advarsler === 'function' && /^Seks /.test(Tropper.malTekst('storm', 6)), 'reglene for forslagene mangler');
        // seks arbeidsføre, to på «bygg» (som hos kritiker D etter speidertroppen)
        const mal = F.personer[0] || { navn: 'X', alder: 30, yrke: 'bonde', ferd: {}, helse: 1, lojal: .7, seng: false };
        F.personer = ['frakt', 'kjøkken', 'bygg', 'bygg', 'hogst', 'vakt'].map((o, i) => ({ ...JSON.parse(JSON.stringify(mal)), id: 9000 + i, navn: 'Prøve ' + (i + 1), oppgave: o, helse: 1, ferd: { ...(mal.ferd || {}), bygg: o === 'bygg' ? 1.3 : .9, vakt: 1 } }));
        TropperSpill.åpne();
        const kort = [...document.querySelectorAll('#tropppanel [data-mal]')].map(b => b.innerText.replace(/\s+/g, ' '));
        ut.forslag = kort.join(' | '); krev(kort.length === 4 && kort.every(t => /\((4)\)/.test(t) && /\bFire\b/.test(t)), 'forslagene sier ikke (4) og «Fire …» med seks igjen: ' + ut.forslag);
        document.querySelector('#tropppanel [data-mal=vakt]').click(); const v = TropperSpill.valg().valgte;
        krev(v.length === 4 && !v.includes(9002) && !v.includes(9003), 'Vaktlag tar byggerne: ' + v.join(','));
        krev(!!$('troppbehold') && /Prøve 3/.test($('troppbehold').textContent), 'forslagene sier ikke hvem som blir igjen');
        krev(!$('troppadvar') && /^Opprett troppen/.test($('troppopprett').textContent), 'advarsel uten grunn');
        // alle seks: advarsel og «Opprett likevel»
        for (const r of document.querySelectorAll('#tropppanel .p[data-person]')) if (!r.classList.contains('på')) r.click();
        for (const r of document.querySelectorAll('#tropppanel .p[data-person]')) if (!r.classList.contains('på')) r.click();
        krev(!!$('troppadvar') && /tom/.test($('troppadvar').textContent) && /likevel/.test($('troppopprett').textContent), 'ingen advarsel når alle seks går');
        const fj = [...document.querySelectorAll('#tropppanel button')].find(b => b.textContent === 'Fjern alle'); if (fj) fj.click(); TropperSpill.lukk(); ut.forslagOk = true; merk('forslag');
        // ---------- (2) oppløs fra lagpanelet ----------
        const n0 = F.personer.length, s = TropperSpill.opprett([9000, 9001], 'Vaktprøve', 'standard', null).lag; krev(!!s && F.personer.length === n0 - 2, 'troppen ble ikke laget');
        if (s) { s.x = leir.x + 30; s.y = leir.y + 20; valgt = s; visPanel();
          const k = $('opplosknapp'); krev(k && /^Oppløs troppen/.test(k.textContent) && getComputedStyle(k).display !== 'none', 'ingen synlig «Oppløs troppen» i lagpanelet');
          if (k) { k.click(); const k2 = $('opplosknapp'); krev(k2 && /^Bekreft/.test(k2.textContent) && ENHETER.includes(s), 'første trykk oppløser uten å spørre'); if (k2) k2.click(); }
          krev(!ENHETER.includes(s) && F.personer.length === n0, 'troppen ble ikke oppløst (folk ' + F.personer.length + ' av ' + n0 + ')'); ut.oppløs = !ENHETER.includes(s); }
        // send hjem: ute -> knappen, marsj hjem, oppløses ved leiren; en ny ordre avbryter
        const ider = F.personer.slice(0, 2).map(p => p.id), s2 = TropperSpill.opprett(ider, 'Uteprøve', 'standard', null).lag;
        if (s2) { s2.x = leir.x + 1800; s2.y = leir.y + 600; valgt = s2; visPanel(); const k = $('opplosknapp');
          krev(k && /Send hjem og oppløs/.test(k.textContent) && getComputedStyle(k).display !== 'none', 'ingen «Send hjem og oppløs» når troppen er ute');
          if (k) k.click(); krev(s2.hjemOppløs === true, 'troppen fikk ikke beskjed om å gå hjem');
          KROKER.kanOrdre.forEach(f => f(s2)); krev(!s2.hjemOppløs, 'en ny ordre avbryter ikke oppløsingen'); s2.hjemOppløs = true;
          s2.sti = null; s2.x = leir.x + 40; s2.y = leir.y + 10; const n = TropperSpill.hjemSteg(); krev(n === 1 && !ENHETER.includes(s2), 'troppen ble ikke oppløst da den kom hjem'); ut.hjem = n === 1; }
        merk('oppløs');
        // ---------- (3) ingen bygger ----------
        for (const p of F.personer) p.oppgave = 'fri'; let jobb = null;
        if (!Leir.jobber(L).length) { L.lager = { ...L.lager, tre: 999, betong: 999, stål: 999 }; const r = Leir.bygg(L, { type: 'brakke', x: leir.x + 60, y: leir.y - 40 }, () => true); jobb = r && r.bygg; }
        if (Leir.jobber(L).length) { const m = $('leirmeny'), lk = $('leirknapp'), åpen0 = m && m.classList.contains('på'); if (!åpen0 && LeirSpill.visMeny) { if (lk) lk.click(); } if (LeirSpill.visMeny) LeirSpill.visMeny();
          const b = document.querySelector('#leirmeny .ingenbygger'); krev(!!b && /Ingen på «bygg»/.test(b.textContent) && !!$('hjelpbygg'), 'Leir-menyen sier ikke fra om at ingen bygger');
          if ($('hjelpbygg')) $('hjelpbygg').click(); krev(F.personer.filter(p => p.oppgave === 'bygg').length === 2, '«Sett to på Bygg» setter ikke to på bygg');
          if (!åpen0 && lk && m.classList.contains('på')) lk.click(); ut.ingenBygger = true; }
        // tom gjeng: «Ring etter arbeidere» henter to på «bygg» (nødrekrutteringen)
        F.personer = []; const r2 = FolkSpill.hjelpBygg(); krev(r2.nye === 2 && F.personer.length === 2 && F.personer.every(p => p.oppgave === 'bygg'), 'tom gjeng: fikk ikke to arbeidere på bygg (' + JSON.stringify(r2) + ')');
        merk('ingenBygger');
        // ---------- (4) opplæringen ----------
        if (OpplaeringSpill.av()) OpplaeringSpill.slå(true); OpplaeringSpill.test = true; OpplaeringSpill.nullstill(); localStorage.removeItem('riksbrudd-opplaering-sammen');
        const T = () => OpplaeringSpill.tilstand(), sett = id => OpplaeringSpill.tilSteg(id);
        sett('tropp2'); OpplaeringSpill.kjør(); const st6 = Opplaering.neste(T()); krev(st6.id === 'tropp2' && /Vakt/.test(st6.tekst) && /Bygg/.test(st6.tekst), 'steg 6 har ikke den nye teksten');
        const dekket = ['gaar', 'ikontrollrom', 'ikamera', 'foto'].some(k => document.body.classList.contains(k)) || ['panel', 'stridpanel', 'byggvalg', 'hendelse', 'hjelp'].some(id => $(id) && $(id).getClientRects().length);
        if (!dekket) { krev(OpplaeringSpill.vises() && !OpplaeringSpill.foldet(), 'steg 6 vises ikke');
          const se = $('oppsenere'); krev(!!se, 'ingen «Senere»'); if (se) { se.click(); krev(OpplaeringSpill.foldet() && $('opplaering').classList.contains('sammen'), '«Senere» legger ikke ruta sammen'); }
          const pl = $('oppfold'); if (pl) { pl.click(); krev(!OpplaeringSpill.foldet(), '+ henter ikke steget fram igjen'); }
          OpplaeringSpill.angrepTest = true; OpplaeringSpill.kjør(); krev(OpplaeringSpill.foldet(), 'opplæringen legges ikke sammen under angrep'); OpplaeringSpill.angrepTest = undefined; OpplaeringSpill.kjør(); krev(!OpplaeringSpill.foldet(), 'opplæringen kommer ikke tilbake etter angrepet');
          // telefon: med Folk åpent én linje (teksten skjult), med lagpanelet åpent helt borte
          if (document.body.classList.contains('kort')) { FolkSpill.åpne(true); OpplaeringSpill.kjør(); const t = $('opplaering').querySelector('.t');
            krev($('opplaering').classList.contains('liten') && document.body.classList.contains('oppliten') && (!t || getComputedStyle(t).display === 'none'), 'telefon: ruta legger seg ikke sammen over Folk'); FolkSpill.åpne(false); OpplaeringSpill.kjør(); ut.telefon = true; } }
        // steg 9 venter usynlig til noe er skadet (ingen ✓-kø: oppdatert direkte)
        sett('reparer'); OpplaeringSpill.kjør(); const b9 = OpplaeringSpill.bilde();
        const n9 = Opplaering.neste(T()); if (b9.skadet === 0 && n9 && n9.id === 'reparer' && !OpplaeringSpill.gjort().length) { krev(!OpplaeringSpill.vises(), 'steg 9 vises uten skadde bygg'); ut.steg9 = true; }
        merk('opplæring');
      } catch (e) { ut.feil.push('unntak: ' + e.message); }
      finally {
        // tilbake: folket, kassa, lagene, leiren, opplæringen
        TropperSpill.lukk(); if (før.frø !== null) frø = før.frø; F.personer = før.personer; F.neste = før.neste; F.moral = før.moral; S.penger = før.penger; ENHETER.length = 0; ENHETER.push(...før.enheter); for (const e of ENHETER) delete e.hjemOppløs;
        L.bygg.length = 0; L.bygg.push(...før.bygg); L.lager = JSON.parse(før.lager); valgt = før.valgt; if (valgt && ENHETER.includes(valgt)) visPanel(); else if (window.lukkPanel) lukkPanel();
        OpplaeringSpill.angrepTest = undefined; OpplaeringSpill.test = før.oppTest;
        for (const [k, v] of [['riksbrudd-opplaering', før.opp], ['riksbrudd-opplaering-av', før.oppAv], ['riksbrudd-opplaering-sammen', før.oppSammen]]) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
        OpplaeringSpill.last(); OpplaeringSpill.kjør(); if (LeirSpill.lagre) LeirSpill.lagre(); skitten = true; ut.tilbake = F.personer.length === før.personer.length;
      }
      return ut; });
    const krav = ['forslagOk', 'oppløs', 'hjem', 'tilbake'], mangler = krav.filter(k => !d[k]), feil = (d.feil || []).concat(mangler.map(k => 'ikke prøvd: ' + k));
    return { ok: !feil.length, tekst: feil.length ? `${profil}: ${feil.join('; ')}` : `${profil}: forslagene lar to bygge (${(d.forslag || '').split(' | ')[2] || ''}), advarsel før Opprett, Oppløs (to trykk) og Send hjem i lagpanelet` + `${d.ingenBygger ? ', «Ingen bygger» i Leir-menyen' : ''}, Ring etter arbeidere, opplæringen (steg 6, Senere, angrep${d.telefon ? ', telefon' : ''}${d.steg9 ? ', steg 9 venter' : ''})`, data: d };
  },
};
