// VAKT for pakka «lagring» (runde 7, 20. nov natt): hver side sine nøkler, «Lagre og last» (plasser, automatisk kopi, fil) og full lagring.
// Lagrer i plass 1, endrer spillet i localStorage, laster plassen (uten omlasting) og ser at det kom tilbake; fil ut og inn med funksjonene;
// full lagring (LagringSide.simuler) gir melding og rører ikke spillet; panelet på skjermen. Alt i localStorage settes tilbake slik det var.
module.exports = {
  navn: 'lagre og last (lagring)',
  kjør: async (pg, profil) => {
    const data = await pg.evaluate(() => {
      const d = { feil: [] }, krev = (b, t) => { if (!b) d.feil.push(t); };
      if (!window.LagringMeny || !window.LagringSide || !window.Lagring || !Lagring.Plass) { d.feil.push('LagringMeny/LagringSide/Lagring.Plass mangler'); return d; }
      const LS = LagringSide, M = LagringMeny, S = OppstartSpill.tilstand();
      // ta vare på hele lagringen (rått) og tilstanden
      const før = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^riksbrudd-/.test(k)) før[k] = LS.rå.get(k); }
      const varAktiv = !!(window.LagringSpill && LagringSpill.aktiv()), varÅpen = M.erÅpen();
      try {
        krev(S && S.leir, 'ingen leir i testspillet');
        krev(LS.her === 'dovre' && LS.tilRå('riksbrudd-k1') === 'riksbrudd-k1' && LS.tilRå('riksbrudd-k1', 'norge') === 'riksbrudd-k1@norge', 'endingen per side stemmer ikke');
        krev(localStorage.getItem('riksbrudd-k1') === LS.rå.get('riksbrudd-k1'), 'getItem på Dovre-siden skal lese nøkkelen uten ending (som før)');
        // 1) lagre i plass 1
        const r1 = M.lagreHer('1', 'Vakt'); const p1 = M.plass('1');
        krev(r1.ok && p1 && p1.navn === 'Vakt' && p1.nøkler['riksbrudd-k1'] && p1.nøkler['riksbrudd-k2'], 'lagret ikke i plass 1: ' + (r1.feil || ''));
        krev(p1 && !Object.keys(p1.nøkler).some(k => /plass|filter|grafikk|lyd$|maler/.test(k)), 'plassen tok med innstillinger eller andre plasser');
        d.nøkler = p1 ? Object.keys(p1.nøkler).length : 0; d.tegn = p1 ? JSON.stringify(p1).length : 0;
        // 2) endre spillet i lagringen: mindre penger og en nøkkel som ikke fantes
        const k1 = LS.rå.get('riksbrudd-k1'); LS.rå.set('riksbrudd-k1', JSON.stringify({ ...JSON.parse(k1), penger: 1 })); LS.rå.set('riksbrudd-vaktspor', '{"leir":"0,0"}');
        // 3) last plass 1 uten omlasting: plassens nøkler er tilbake, det nye er borte, og spillet med 1 kr ligger i «Automatisk»
        const r2 = M.last('1', { lastInn: false }), a = M.plass('auto');
        krev(r2.ok, 'lastet ikke plass 1: ' + (r2.feil || ''));
        krev(LS.rå.get('riksbrudd-k1') === p1.nøkler['riksbrudd-k1'], 'pengene kom ikke tilbake etter lasting');
        krev(LS.rå.get('riksbrudd-vaktspor') === null, 'en nøkkel som ikke var i plassen, ble ikke tatt bort');
        krev(a && JSON.parse(a.nøkler['riksbrudd-k1']).penger === 1, '«Automatisk» har ikke spillet slik det var før lasting');
        // mens et spill lastes, kan ikke modulene skrive over det
        krev(LS.låst(), 'lagringen er ikke låst etter lasting');
        localStorage.setItem('riksbrudd-k1', 'skrevet over'); krev(LS.rå.get('riksbrudd-k1') === p1.nøkler['riksbrudd-k1'], 'en modul skrev over det som ble lastet inn');
        LS.lås(false); if (window.LagringSpill) LagringSpill.av(false);
        // 4) fil ut og inn (uten ekte fil)
        const t = M.filTekst('1'), h = M.hentFil(t);
        krev(h.d && JSON.stringify(h.d.nøkler) === JSON.stringify(p1.nøkler) && h.d.navn === 'Vakt', 'fila ble ikke lest tilbake likt');
        krev(M.hentFil('ikke json').feil && M.hentFil(t.replace('"side":"dovre"', '"side":"norge"')).feil, 'ødelagt fil / fil fra en annen side ble ikke avvist');
        const nå = M.filTekst('nå'); krev(nå && JSON.parse(nå).nøkler['riksbrudd-k1'], '«Last ned som fil» for spillet nå mangler leiren');
        krev(M.legg('2', h.d).ok && M.plass('2') && M.plass('2').navn === 'Vakt', 'fila ble ikke lagt i plass 2');
        // 5) full lagring: melding, ikke krasj, og spillet røres ikke
        const k1nå = LS.rå.get('riksbrudd-k1'), p3 = JSON.stringify(M.plass('3')); LS.simuler('fullt');
        const r3 = M.lagreHer('3'); d.full = r3.feil; krev(r3.feil && /plass/.test(r3.feil) && JSON.stringify(M.plass('3')) === p3, 'full lagring ga ikke melding');
        krev(M.status().tilstand === 'fullt', 'statusen sier ikke at lagringen er full');
        const r4 = M.last('2', { lastInn: false }); krev(r4.feil && LS.rå.get('riksbrudd-k1') === k1nå && !LS.låst(), 'lasting med full lagring rørte spillet');
        LS.simuler(null);
        // 6) panelet: fire rader, innenfor skjermen, «Slett» spør først
        M.åpne(); const ark = document.querySelector('#lagremeny .ark'), r = ark.getBoundingClientRect();
        d.rader = document.querySelectorAll('#lagremeny .plass[data-plass]').length; krev(d.rader === 4, 'panelet har ikke tre plasser + Automatisk');
        krev(r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && ark.scrollWidth <= ark.clientWidth + 1, 'panelet går utenfor skjermen');
        const kn = q => document.querySelector(`#lagremeny [data-gjør="${q}"][data-plass="2"]`);
        kn('slett').click(); krev(kn('ja-slett') && M.plass('2'), '«Slett» spurte ikke først'); kn('avbryt').click(); krev(M.plass('2'), '«Avbryt» slettet');
        kn('slett').click(); kn('ja-slett').click(); krev(!M.plass('2'), '«Ja, slett» slettet ikke');
        d.status = document.querySelector('#lagremeny .status').textContent; krev(/Lagret \d\d:\d\d/.test(d.status), 'panelet viser ikke «Lagret 12:04»: ' + d.status);
        M.lukk();
        const mk = document.getElementById('lagreknapp'); d.knapp = mk && mk.textContent; krev(mk && /^Lagre og last/.test(mk.textContent) && mk.closest('#lagmeny'), '«Lagre og last» mangler i ☰');
        krev(document.querySelector('[data-k="lagre"]'), '«Lagre» mangler i kommandolinja');
      } catch (e) { d.feil.push('kastet: ' + e.message); }
      finally {
        // sett alt tilbake: lagringen slik den var, låsen, lagringen av verden og panelet
        LS.simuler(null); LS.lås(false); if (!varÅpen) M.lukk();
        if (window.LagringSpill) { if (varAktiv) LagringSpill.av(false); else if (LagringSpill.aktiv()) LagringSpill.av(true); }
        for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && /^riksbrudd-/.test(k) && !(k in før)) LS.rå.del(k); }
        for (const [k, v] of Object.entries(før)) LS.rå.set(k, v);
        let likt = true; for (const [k, v] of Object.entries(før)) if (LS.rå.get(k) !== v) likt = false; krev(likt, 'lagringen ble ikke satt tilbake');
      }
      return d;
    });
    const ok = data.feil.length === 0;
    return { ok, tekst: ok ? `plass lagret (${data.nøkler} nøkler, ${Math.round(data.tegn / 1000)} kB), endret og lastet tilbake, «Automatisk» tok spillet før lasting, fil ut/inn, full lagring gir melding, panelet ${data.rader} rader, ☰ «${data.knapp}»` : data.feil.join('; '), data };
  },
};
