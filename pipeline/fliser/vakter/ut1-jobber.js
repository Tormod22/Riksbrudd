// Vakt for pakka «jobber» (28. nov, fase F0: jobbtavla og døgnplanen – spill/jobber.js og jobber-visning.js).
// Prøver kommandoene, at tavla fordeler (vakt og kjøkken først, ingen på bygg uten bestillinger), at en jobb som står fast får en grunn
// i Folk-panelet, døgnplanen (bygg står om natta, arbeider om dagen, «sover» ved personen) og moralen fra nattskift.
// Setter alt tilbake: tavla, oppgavene, tid, testbryteren, lagringen og om Folk-panelet var åpent.
module.exports = {
  navn: 'jobbtavla og døgnplanen (F0)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, JS = window.JobberSpill, JR = window.Jobber, FR = window.FolkRegler;
      if (!JS || !JR || !window.FolkSpill || !FolkSpill.tilstand()) return { mangler: true };
      const F = FolkSpill.tilstand(), J0 = JSON.stringify(JS.tilstand()), opp0 = F.personer.map(p => [p.id, p.oppgave]), tid0 = tid, test0 = JS.test;
      const lager0 = localStorage.getItem('riksbrudd-jobber'), åpen0 = document.getElementById('folkmeny').classList.contains('på');
      const vent = ms => new Promise(r => setTimeout(r, ms)), tell = o => F.personer.filter(p => p.oppgave === o).length;
      try {
        ut.kommandoer = ['jobbPrio', 'jobbAuto', 'jobbDøgn', 'jobbSkift', 'jobbLås', 'jobbUte'].every(t => Kommando.finnes(t));
        // manuelt: tavla står under oppgavene
        JS.sett({}); FolkSpill.åpne(true); await vent(50); FolkSpill.vis();
        ut.manuelt = !!document.getElementById('jobbtavla') && !!document.querySelector('#folkmeny [data-o="bygg"]') && !JS.tilstand().auto;
        // prioritet: tavla tar over og fordeler (her uten bestillinger: ingen på bygg, vakt og kjøkken først)
        const r = KOMMANDO({ type: 'jobbPrio', jobb: 'vakt', prio: 1 }); FolkSpill.vis();
        const bestillinger = Leir.jobber(LeirSpill.tilstand()).length;
        ut.fordelt = r.ok && JS.tilstand().auto && tell('vakt') >= 1 && tell('kjøkken') >= 1 && (bestillinger ? tell('bygg') >= 1 : tell('bygg') === 0) && tell('fri') >= 1;
        ut.erstatter = !document.querySelector('#folkmeny [data-o="bygg"]') && document.querySelectorAll('#jobbtavla .jtrad').length >= 2 && !!document.querySelector('#jobbtavla [data-prio="vakt"]');
        // står fast: alle utelukket fra kjøkkenet
        for (const p of F.personer) KOMMANDO({ type: 'jobbUte', person: p.id, jobb: 'kjøkken', ute: true });
        FolkSpill.vis(); const t = document.getElementById('jobbtavla').textContent;
        ut.fast = tell('kjøkken') === 0 && /Kjøkken står fast: alle er utelukket/.test(t);
        // døgnplanen (i testene bare med JS.test): én på bygg, dagskift; natt 02:00 og dag 09:00
        JS.sett({ auto: false, skift: { bygg: 'dag' } }); JS.test = true; const b = F.personer.find(p => FR.arbeidsfør(p)); b.oppgave = 'bygg';
        tid = 20 * 60; const natt = FR.tempo(F, 'bygg'), nattTekst = JS.nå(b).tekst;
        tid = 27 * 60; const dag = FR.tempo(F, 'bygg'), dagTekst = JS.nå(b).tekst;
        ut.døgn = natt === 0 && dag > 1 && nattTekst === 'sover' && dagTekst === 'arbeider – bygg';
        FolkSpill.vis(); const vf = document.getElementById('visfolk'); if (vf && !/Skjul/.test(vf.textContent)) vf.click();
        ut.person = [...document.querySelectorAll('#folkmeny .person .gjor')].some(e => /arbeider – bygg/.test(e.textContent)); if (vf && /Skjul/.test(document.getElementById('visfolk').textContent)) document.getElementById('visfolk').click();
        // nattskift: døgnet rundt gir litt lavere moral
        JS.sett({ skift: { bygg: 'døgn' } }); F.personer.filter(p => FR.arbeidsfør(p)).slice(0, 3).forEach(p => { p.oppgave = 'bygg'; });
        ut.natt = FolkSpill.grunn().moralTillegg < (window.OverlevSpill ? OverlevSpill.moralTillegg() : 0);
        // i testene uten bryteren: døgnplanen er av (som før)
        JS.test = false; tid = 20 * 60; ut.avITest = FR.tempo(F, 'bygg') > 0;
      } catch (e) { ut.feil = e.message; }
      finally {
        JS.test = test0; tid = tid0; JS.sett(JSON.parse(J0)); const m = new Map(opp0); for (const p of F.personer) if (m.has(p.id)) p.oppgave = m.get(p.id);
        if (lager0 === null) localStorage.removeItem('riksbrudd-jobber'); else localStorage.setItem('riksbrudd-jobber', lager0);
        FolkSpill.åpne(åpen0); if (window.LeirSpill) LeirSpill.lagre();
      }
      ut.tilbake = JSON.stringify(JS.tilstand()) === J0 && F.personer.every(p => opp0.find(q => q[0] === p.id)[1] === p.oppgave) && tid === tid0;
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'JobberSpill eller FolkSpill mangler', data: d };
    const krav = ['kommandoer', 'manuelt', 'fordelt', 'erstatter', 'fast', 'døgn', 'person', 'natt', 'avITest', 'tilbake'];
    const mangler = krav.filter(k => d[k] !== true);
    return { ok: !mangler.length && !d.feil, tekst: mangler.length || d.feil ? 'feilet: ' + mangler.join(', ') + (d.feil ? ' · ' + d.feil : '') : `jobbtavla og døgnplanen virker (${profil})`, data: d };
  },
};
