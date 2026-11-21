// Vakt for pakka «morgen» (runde 8, 20. nov natt): morgenmøtet (spill/morgen.js + morgen-visning.js).
// Prøver: kortet kommer med 2–3 valg + «Ingen endring i dag» når maten er lav (jakt/kjøp/rasjoner), «Send to på jakt» sender to ut
// (borte, arbeider ikke), den store beslutningen (nabogården) kommer som steg 2 og «Ta inn to» gir to nye i gjengen, neste morgen er
// jegerne hjemme med mat og kortet sier «I går: …», og en dagsvirkning (fridag/ekstra skift) virker gjennom SamfunnSpill.valg til neste morgen.
// Setter alt tilbake: folket (samme personer, oppgaver, helse, borte), mat, moral, frø, kassa, lageret, dieselen, dagboka, morgenmøtets
// lagring og MorgenSpill.test.
// RUNDE 13 (kritiker G/H): møtet kommer aldri to ganger samme dag eller bakover (klokka litt før 06:00 etter omlasting), tapene i lagene
// står med navn, ⏭ står stille mens møtet venter (spillermodus), handelsmannen kl. 14 kjøper det som er avtalt, og alle valgene synes
// uten rulling når rapporten er lang (foldet sammen).
module.exports = {
  navn: 'morgenmøtet (valg hver morgen)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = { feil: [] }, $ = id => document.getElementById(id), krev = (b, t) => { if (!b) ut.feil.push(t); return !!b; };
      if (!window.Morgen || !window.MorgenSpill || !MorgenSpill.tilstand() || !window.FolkSpill || !FolkSpill.tilstand() || !window.LeirSpill || !LeirSpill.tilstand()) { ut.feil.push('mangler moduler eller spill'); return ut; }
      const F = FolkSpill.tilstand(), L = LeirSpill.tilstand(), S = OppstartSpill.tilstand(), DB = window.DagbokSpill && DagbokSpill.tilstand();
      const før = { personer: F.personer.slice(), felt: F.personer.map(p => [p, p.oppgave, p.helse, p.borte, p.morgen]), mat: F.mat, moral: F.moral, frø: F.frø, neste: F.neste, penger: S.penger, lager: JSON.stringify(L.lager), diesel: L.drivstoff,
        morgen: localStorage.getItem('riksbrudd-morgen'), dagbokLS: localStorage.getItem('riksbrudd-dagbok'), dagbok: DB ? DB.liste.slice() : null, test: MorgenSpill.test, oppTest: window.OpplaeringSpill ? OpplaeringSpill.test : undefined };
      // kort fra tidligere vakter som står oppe, får stå (kortet står da i kortkøen) – vi trykker på knappene uansett
      const knapper = () => [...document.querySelectorAll('#morgenkort .mvalg button')];
      const klikk = rx => { const b = knapper().find(q => rx.test(q.textContent)); if (b) b.click(); return !!b; };
      const tidFør = tid, tempoFør = tempo;
      try {
        MorgenSpill.test = true;
        // lite mat: to rasjoner igjen, så kortet har matvalgene; minst seks arbeidsføre
        F.mat = 2; for (const p of F.personer) { p.helse = Math.max(p.helse, 1); delete p.borte; }
        const r1 = MorgenSpill.morgen(true, { stor: 'nabo' }), K = MorgenSpill.tilstand().kort;
        krev(r1 && K && !K.ferdig, 'ingen morgenkort');
        const valg = K ? K.valg.map(v => v.id) : []; ut.valg = valg.join(',');
        krev(valg.length >= 2 && valg.length <= 3, 'ikke 2–3 valg: ' + ut.valg);
        krev(valg.includes('jakt') && (valg.includes('kjøp') || valg.includes('rasjon')), 'lite mat gir ikke jakt og kjøp/rasjoner: ' + ut.valg);
        krev(K && K.stor && K.stor.id === 'nabo', 'den store beslutningen (nabogården) kom ikke');
        ut.åpen = MorgenSpill.åpen(); krev(ut.åpen || (window.Kortkø && Kortkø.venter().some(q => q.id === 'morgenkort')), 'kortet står ikke oppe og venter ikke i køen');
        if (!ut.åpen) MorgenSpill.vis();
        krev(knapper().length === valg.length + 1 && knapper().some(b => /Ingen endring i dag/.test(b.textContent)), 'knappene: ' + knapper().map(b => b.textContent.slice(0, 20)).join(' | '));
        // «Send to på jakt og fiske»
        const n0 = F.personer.filter(p => !p.borte).length; krev(klikk(/^Send to på jakt/), 'ingen jaktknapp');
        const borte = F.personer.filter(p => p.borte && p.morgen === 'jakt'); ut.borte = borte.map(p => p.navn).join(', ');
        krev(borte.length === 2 && borte.every(p => !FolkRegler.arbeidsfør(p)) && F.personer.filter(p => !p.borte).length === n0 - 2, 'jakta sendte ikke to ut: ' + ut.borte);
        // steg 2: nabogården
        krev(MorgenSpill.tilstand().kort.steg === 1 && !!document.querySelector('#morgenkort .mstor'), 'steg 2 (viktig beslutning) vises ikke');
        const nf = F.personer.length, mf = F.mat; krev(klikk(/^Ta inn to av dem/), 'ingen «Ta inn to»');
        krev(F.personer.length === nf + 2 && F.mat === mf + 4, `nabogården: folk ${nf} -> ${F.personer.length}, mat ${mf} -> ${F.mat}`);
        krev(MorgenSpill.tilstand().kort.ferdig && !$('morgenkort').classList.contains('på'), 'kortet lukkes ikke etter steg 2');
        // neste morgen: jegerne er hjemme med mat, rapporten sier hvordan det gikk
        // (lav moral, så kortet tilbyr fridag – en dagsvirkning)
        F.moral = 30; const mat1 = F.mat, r2 = MorgenSpill.morgen(true), K2 = MorgenSpill.tilstand().kort;
        krev(borte.every(p => !p.borte && !p.morgen), 'jegerne kom ikke hjem');
        krev(F.mat > mat1, `jakta ga ikke mat (${mat1} -> ${F.mat})`);
        ut.igår = (r2 && r2.igår || []).join(' '); krev(/jakt og fiske med \d+ rasjoner/.test(ut.igår), 'ingen rapport om jakta: ' + ut.igår);
        krev(K2 && K2.rapport.some(t => /^I går: .*jakt/.test(t)) && /I går:/.test($('morgenkort').textContent || ''), 'kortet sier ikke «I går: …»');
        krev(!K2.stor, 'stor beslutning to dager på rad');
        // en dagsvirkning: fridag eller ekstra skift (moralen avgjør hvilken som tilbys); ellers ingen endring
        const dv = K2.valg.find(v => v.id === 'fri' || v.id === 'skift');
        if (dv) { krev(klikk(dv.id === 'fri' ? /^Fridag for alle/ : /^Ekstra skift/), 'ingen knapp for ' + dv.id); const v = MorgenSpill.virkning(); ut.virkning = `${dv.id}: tempo ${v.tempo}, moral ${v.moral}`;
          krev(v.tempo !== 1 && v.moral !== 0, 'dagsvirkningen mangler: ' + ut.virkning);
          if (window.SamfunnSpill && SamfunnSpill.valg) { const o = FolkSpill.valg(); ut.valgTempo = o.tempoFaktor; krev(dv.id === 'fri' ? o.tempoFaktor < 1 : o.tempoFaktor > 1, 'SamfunnSpill.valg gir ikke tempoet videre til folket: ' + o.tempoFaktor); } }
        else krev(klikk(/Ingen endring i dag/), 'ingen «Ingen endring»');
        krev(!$('morgenkort').classList.contains('på'), 'kortet står igjen');
        // morgenen etter: virkningen er borte, og «Ingen endring» lukker
        MorgenSpill.morgen(true); krev(MorgenSpill.virkning().tempo === 1 && MorgenSpill.virkning().moral === 0, 'dagsvirkningen varer mer enn en dag');
        krev(klikk(/Ingen endring i dag/) && !$('morgenkort').classList.contains('på'), '«Ingen endring i dag» lukker ikke kortet');
        ut.ferdig = true;
        // ---- RUNDE 13 ----
        const tid0 = tid, MS = MorgenSpill.tilstand();
        // (1) omlasting rett før 06:00: klokka står bak dagen som alt er holdt – ingen nytt møte, verken for gårsdagen eller i dag igjen
        const dagNå = MS.dag, kortFør = MS.kort; tid = (dagNå - 1) * 1440 - 2;
        krev(MorgenSpill.morgen(false) === null && MorgenSpill.tilstand().kort === kortFør && MorgenSpill.tilstand().dag === dagNå, 'møtet kom for gårsdagen da klokka sto bak (omlasting før 06:00)');
        tid = (dagNå - 1) * 1440 + 5; krev(MorgenSpill.morgen(false) === null && MorgenSpill.tilstand().kort === kortFør, 'samme dag fikk møtet en gang til');
        tid = tid0; ut.dag = true;
        // (2) tapene i lagene med navn (en falt, lagføreren såret)
        const lag = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.leirvakt && Array.isArray(e.menn) && e.menn.length >= 3);
        if (krev(lag, 'fant ikke noe eget lag med minst tre mann')) { const hp = lag.menn.map(m => m.hp), l = lag.leder || 0, a = lag.menn[(l + 1) % lag.menn.length];
          try { for (const m of lag.menn) m.hp = 1; MorgenSpill.tapSteg(true); a.hp = 0; lag.menn[l].hp = .5; MorgenSpill.tapSteg(true);
            MorgenSpill.morgen(true); const r = MorgenSpill.tilstand().kort.rapport.find(t => /^Tap i lagene/.test(t)) || ''; ut.tap = r;
            krev(r.includes(lag.navn) && r.includes(a.navn + ' falt') && r.includes(lag.menn[l].navn + ' (lagfører) ble såret'), 'tapene står ikke med navn: ' + r);
            krev(!MorgenSpill.tilstand().kort.rapport.some(t => /Et rolig døgn/.test(t)), '«Et rolig døgn» står sammen med tapene');
          } finally { lag.menn.forEach((m, i) => { m.hp = hp[i]; }); MorgenSpill.tapSteg(true); MorgenSpill.tilstand().tap = []; } }
        // (3) liggende telefon: en lang rapport foldes, og alle valgene synes uten rulling
        const K3 = MorgenSpill.tilstand().kort; for (let i = 0; i < 14; i++) K3.rapport.push('I går: en lang linje som fyller kortet – speiderne så røverne samle seg nord for leiren, og de fant mat, tre og stål.');
        MorgenSpill.lukk(); MorgenSpill.vis(); const kk = $('morgenkort');
        if (kk.classList.contains('på') && kk.getClientRects().length) { const kr = kk.getBoundingClientRect(); ut.foldet = MorgenSpill.foldet();
          krev([...kk.querySelectorAll('.mvalg button')].every(b => b.getBoundingClientRect().bottom <= kr.bottom + 1), 'valgene må rulles fram (foldet: ' + ut.foldet + ')');
          krev(ut.foldet && !!kk.querySelector('.msum button'), 'den lange rapporten ble ikke foldet sammen'); ut.fold = true; }
        else ut.fold = 'kortet sto ikke oppe (annet kort i køen)';
        // (4) ⏭ mens møtet venter (spillermodus): tiden står
        if (kk.classList.contains('på') && kk.getClientRects().length && $('nesteh')) { const t1 = tid, før4 = tempo; $('nesteh').click(); await new Promise(r => setTimeout(r, 400));
          krev(tid === t1 && tempo === 0 && MorgenSpill.fartVenter() === 'nesteh', `⏭ spolte mens møtet ventet (tid ${t1} -> ${tid}, fart ${tempo})`); MorgenSpill.glemFart(); tempo = før4; ut.spol = true; }
        else ut.spol = 'kortet sto ikke oppe';
        krev(klikk(/Ingen endring i dag/), 'ingen «Ingen endring» (runde 13)'); if (MorgenSpill.tilstand().kort.steg === 1) knapper().pop().click(); MorgenSpill.glemFart();
        // (5) handelsmannen kl. 14 henter det avtalte treet og betaler
        L.lager.tre = 30; MorgenSpill.morgen(true, { stor: 'handel' }); klikk(/Ingen endring i dag/);
        const legg = knapper().find(b => /^Legg av \d+ m³ tre/.test(b.textContent)); if (krev(legg, 'handelsmannen kom ikke med «Legg av … m³ tre»')) { legg.click();
          const h = MorgenSpill.tilstand().handel; krev(h && h.vare === 'tre' && h.mengde > 0, 'ingen avtale med handelsmannen');
          if (h) { const p0 = S.penger, t0 = L.lager.tre; tid = h.kl + 1; MorgenSpill.handelSteg(); tid = tid0;
            ut.handel = `${t0 - L.lager.tre} m³ for ${S.penger - p0} kr`; krev(L.lager.tre === t0 - h.mengde && S.penger === p0 + h.pris && !MorgenSpill.tilstand().handel, 'handelsmannen handlet ikke: ' + ut.handel); } }
        tid = tid0; ut.r13 = true;
      } catch (e) { ut.feil.push('unntak: ' + e.message); }
      finally {
        tid = tidFør; tempo = tempoFør; MorgenSpill.glemFart();
        MorgenSpill.lukk(); MorgenSpill.test = før.test;
        F.personer = før.personer; for (const [p, o, h, b, m] of før.felt) { p.oppgave = o; p.helse = h; if (b === undefined) delete p.borte; else p.borte = b; if (m === undefined) delete p.morgen; else p.morgen = m; }
        F.mat = før.mat; F.moral = før.moral; F.frø = før.frø; F.neste = før.neste; S.penger = før.penger; L.lager = JSON.parse(før.lager); L.drivstoff = før.diesel;
        if (DB && før.dagbok) { DB.liste.length = 0; DB.liste.push(...før.dagbok); }
        if (før.dagbokLS === null) localStorage.removeItem('riksbrudd-dagbok'); else localStorage.setItem('riksbrudd-dagbok', før.dagbokLS);
        if (før.morgen === null) localStorage.removeItem('riksbrudd-morgen'); else localStorage.setItem('riksbrudd-morgen', før.morgen); MorgenSpill.start(); MorgenSpill.lukk();
        if (LeirSpill.lagre) LeirSpill.lagre(); ut.tilbake = F.personer.length === før.personer.length && !F.personer.some(p => p.morgen);
      }
      return ut; });
    const krav = ['ferdig', 'tilbake', 'virkning', 'dag', 'r13'], mangler = krav.filter(k => !d[k]), feil = (d.feil || []).concat(mangler.map(k => 'ikke prøvd: ' + k));
    return { ok: !feil.length, tekst: feil.length ? `${profil}: ${feil.join('; ')}` : `${profil}: kortet med ${d.valg}, to på jakt (${d.borte}), nabogården ga to nye, neste morgen «${(d.igår || '').slice(0, 70)}»` + (d.virkning ? `, ${d.virkning}` : '') + ` · R13: dag ok, ${d.tap ? 'tap med navn' : 'tap ikke prøvd'}, fold ${d.fold}, ⏭ ${d.spol}, handel ${d.handel}`, data: d };
  },
};
