// Vakt for pakka «morgen» (runde 8, 20. nov natt): morgenmøtet (spill/morgen.js + morgen-visning.js).
// Prøver: kortet kommer med 2–3 valg + «Ingen endring i dag» når maten er lav (jakt/kjøp/rasjoner), «Send to på jakt» sender to ut
// (borte, arbeider ikke), den store beslutningen (nabogården) kommer som steg 2 og «Ta inn to» gir to nye i gjengen, neste morgen er
// jegerne hjemme med mat og kortet sier «I går: …», og en dagsvirkning (fridag/ekstra skift) virker gjennom SamfunnSpill.valg til neste morgen.
// Setter alt tilbake: folket (samme personer, oppgaver, helse, borte), mat, moral, frø, kassa, lageret, dieselen, dagboka, morgenmøtets
// lagring og MorgenSpill.test.
module.exports = {
  navn: 'morgenmøtet (valg hver morgen)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = { feil: [] }, $ = id => document.getElementById(id), krev = (b, t) => { if (!b) ut.feil.push(t); return !!b; };
      if (!window.Morgen || !window.MorgenSpill || !MorgenSpill.tilstand() || !window.FolkSpill || !FolkSpill.tilstand() || !window.LeirSpill || !LeirSpill.tilstand()) { ut.feil.push('mangler moduler eller spill'); return ut; }
      const F = FolkSpill.tilstand(), L = LeirSpill.tilstand(), S = OppstartSpill.tilstand(), DB = window.DagbokSpill && DagbokSpill.tilstand();
      const før = { personer: F.personer.slice(), felt: F.personer.map(p => [p, p.oppgave, p.helse, p.borte, p.morgen]), mat: F.mat, moral: F.moral, frø: F.frø, neste: F.neste, penger: S.penger, lager: JSON.stringify(L.lager), diesel: L.drivstoff,
        morgen: localStorage.getItem('riksbrudd-morgen'), dagbok: DB ? DB.liste.slice() : null, test: MorgenSpill.test, oppTest: window.OpplaeringSpill ? OpplaeringSpill.test : undefined };
      // kort fra tidligere vakter som står oppe, får stå (kortet står da i kortkøen) – vi trykker på knappene uansett
      const knapper = () => [...document.querySelectorAll('#morgenkort button')];
      const klikk = rx => { const b = knapper().find(q => rx.test(q.textContent)); if (b) b.click(); return !!b; };
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
      } catch (e) { ut.feil.push('unntak: ' + e.message); }
      finally {
        MorgenSpill.lukk(); MorgenSpill.test = før.test;
        F.personer = før.personer; for (const [p, o, h, b, m] of før.felt) { p.oppgave = o; p.helse = h; if (b === undefined) delete p.borte; else p.borte = b; if (m === undefined) delete p.morgen; else p.morgen = m; }
        F.mat = før.mat; F.moral = før.moral; F.frø = før.frø; F.neste = før.neste; S.penger = før.penger; L.lager = JSON.parse(før.lager); L.drivstoff = før.diesel;
        if (DB && før.dagbok) { DB.liste.length = 0; DB.liste.push(...før.dagbok); }
        if (før.morgen === null) localStorage.removeItem('riksbrudd-morgen'); else localStorage.setItem('riksbrudd-morgen', før.morgen); MorgenSpill.start(); MorgenSpill.lukk();
        if (LeirSpill.lagre) LeirSpill.lagre(); ut.tilbake = F.personer.length === før.personer.length && !F.personer.some(p => p.morgen);
      }
      return ut; });
    const krav = ['ferdig', 'tilbake', 'virkning'], mangler = krav.filter(k => !d[k]), feil = (d.feil || []).concat(mangler.map(k => 'ikke prøvd: ' + k));
    return { ok: !feil.length, tekst: feil.length ? `${profil}: ${feil.join('; ')}` : `${profil}: kortet med ${d.valg}, to på jakt (${d.borte}), nabogården ga to nye, neste morgen «${(d.igår || '').slice(0, 70)}»` + (d.virkning ? `, ${d.virkning}` : ''), data: d };
  },
};
