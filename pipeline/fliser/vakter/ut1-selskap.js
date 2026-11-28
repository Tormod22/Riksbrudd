// VAKT «ut1-selskap» (fase Ø0, 28. nov; docs/plan-selskap-okonomi.md kapittel 1, 15 og 17):
//  - panelet «Selskapet» (spill/selskapspanel.js): seks faner, Oversikt med navnet, kassa, trinnene (fire, ett uthevet) og «Det viktigste nå»,
//    Kontrakter = kontraktpanelet #selskap lånt inn (og satt tilbake), Byer og de rolige fanene; kommandoknappen «Selskap» og tast S åpner det,
//    og det lukkes når Leir åpnes (ett panel om gangen)
//  - de fire trinnene (spill/trinn.js) og at Neste-lappen kjenner trinnet (spill/neste.js: kilden «trinn»)
//  - kortet «Storlia Tømmer har hørt om dere» kommer etter den første leverte kontrakten (bare med SelskapetSpill.test = true)
// Setter alt tilbake: huskingen i «riksbrudd-selskapet», testflaggene, panelene og kortet.
module.exports = { navn: 'ut1-selskap: panelet Selskapet, trinnene og Storlia-kortet', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms));
    const SP = window.SelskapetSpill, $ = id => document.getElementById(id), vises = e => !!e && e.getClientRects().length > 0;
    krev(SP && window.Trinn && window.Selskapsbilde && window.TrinnSpill, 'SelskapetSpill, Trinn, Selskapsbilde eller TrinnSpill mangler');
    if (ut.feil.length) return ut;
    const huskFør = localStorage.getItem(SP.NØKKEL), testFør = SP.test;
    try {
      // reglene
      krev(Trinn.regn({}).nr === 1 && Trinn.regn({ levert: 1, bygg: 3 }).nr === 2 && Trinn.regn({ levert: 9, bygg: 9, nivå: 4, tettsteder: 3 }).nr === 4, 'Trinn.regn gir feil trinn');
      const R = TrinnSpill.regn(); krev(R && R.nr >= 1 && R.nr <= 4 && R.trinn && R.trinn.navn, 'TrinnSpill.regn virker ikke i spillet');
      // Neste-lappen kjenner trinnet: kilden «trinn» står i lista når den ikke handler om kontraktene som alt har en linje
      const info = TrinnSpill.lappInfo(); ut.steg = info && info.tekst;
      if (info) { const K = NesteSpill.kilder(info.om === 'kontrakt' ? null : SelskapSpill.lapp()); krev(K.some(k => k.slag === 'trinn' && k.tekst === info.tekst), 'Neste-lappen har ikke steget mot neste trinn: ' + K.map(k => k.slag).join(','));
        krev(Neste.REGLER.prio.trinn > Neste.REGLER.prio.mål && Neste.REGLER.prio.trinn < Neste.REGLER.prio.tilbud, 'trinnets prioritet skal ligge mellom tilbud og mål'); }
      // panelet åpnes fra kommandoknappen (samme knapp som før, nå «Selskap» med tast S)
      const T = (window.KOMMANDO_TILLEGG || []).find(q => q.k === 'selskap'); krev(T && T.navn === 'Selskap' && T.tast === 'S', 'kommandoknappen heter ikke «Selskap» med tast S');
      SP.vis(false); if (T) T.trykk(); await vent(120);
      krev(SP.erÅpen() && vises($('selskapet')), 'kommandoknappen åpnet ikke panelet');
      const P = $('selskapet'); SP.velgFane('oversikt'); await vent(60);
      krev(P.querySelectorAll('.sfaner button').length === 6, 'panelet har ikke seks faner');
      krev(P.querySelectorAll('.trinn li').length === 4 && P.querySelectorAll('.trinn li.nå').length === 1, 'Oversikt viser ikke fire trinn med ett uthevet');
      const tekst = P.textContent; krev(/Kassa/.test(tekst) && /Ukas resultat/.test(tekst) && /Nivå/.test(tekst) && /Det viktigste nå/.test(tekst) && /Trinn \d av 4/.test(tekst), 'Oversikt mangler kassa, ukas resultat, nivå, trinn eller «Det viktigste nå»');
      { const r = P.getBoundingClientRect(); krev(r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, 'panelet står utenfor skjermen'); }
      // Kontrakter: kontraktpanelet lånes inn, og settes tilbake når fanen byttes
      SP.velgFane('kontrakter'); await vent(150); const sel = $('selskap');
      krev(sel && sel.closest('#selskapet') && sel.classList.contains('på') && sel.getBoundingClientRect().height > 80, 'Kontrakter viser ikke kontraktpanelet inne i Selskapet');
      SP.velgFane('byer'); await vent(80);
      krev(sel.parentNode === document.body && !sel.classList.contains('på'), 'kontraktpanelet ble ikke satt tilbake');
      krev(P.querySelectorAll('.by').length > 0 || /Ingen tettsteder/.test(P.textContent), 'Byer viser ingenting');
      SP.velgFane('produksjon'); await vent(60); krev(/Sagbruk og maskiner kommer her/.test(P.textContent), 'Produksjon sier ikke hva som kommer');
      // ett panel om gangen: Leir lukker Selskapet
      const lk = $('leirknapp'); if (lk) { lk.click(); await vent(700); krev(!SP.erÅpen(), 'Selskapet sto åpent sammen med Leir-menyen'); if ($('leirmeny') && $('leirmeny').classList.contains('på')) lk.click(); await vent(100); }
      // tast S åpner og lukker
      SP.vis(false); window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' })); await vent(80); const sÅpnet = SP.erÅpen();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' })); await vent(80); krev(sÅpnet && !SP.erÅpen(), 'tast S åpner/lukker ikke Selskapet');
      // Storlia: ikke av seg selv i testene; med test = true kommer kortet etter en levert kontrakt (ventetida er kortet ned her)
      SP.nullstillHusk({ storlia: false }); const S = SelskapSpill.tilstand(), sd = S && S.sider.blå, levFør = sd ? sd.sum.levert : 0, ventFør = Selskapsbilde.REGLER.storlia.vent;
      if (sd) { sd.sum.levert = Math.max(1, levFør); window.dispatchEvent(new CustomEvent('riksbrudd-kontrakt', { detail: { type: 'levert' } })); await vent(1800);
        krev(!$('storliakort'), 'Storlia-kortet kom av seg selv i testene');
        SP.test = true; Selskapsbilde.REGLER.storlia.vent = 0; window.dispatchEvent(new CustomEvent('riksbrudd-kontrakt', { detail: { type: 'levert' } }));
        for (let i = 0; i < 30 && !$('storliakort'); i++) await vent(200);
        const k = $('storliakort'); krev(k && /Storlia Tømmer har hørt om dere/.test(k.textContent) && /Leverandør|leverandør/.test(k.textContent), 'Storlia-kortet kom ikke etter første levering');
        if (k) { k.querySelector('[data-k="åpne"]').click(); await vent(100); krev(SP.erÅpen() && SP.fane() === 'oversikt', '«Åpne Selskapet» på kortet åpnet ikke Oversikt'); }
        krev(SP.husk().storlia === true, 'kortet huskes ikke');
        sd.sum.levert = levFør; Selskapsbilde.REGLER.storlia.vent = ventFør; SP.test = testFør; }
      ut.trinn = Trinn.tekst(TrinnSpill.regn());
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally { SP.vis(false); SP.test = testFør; const k = $('storliakort'); if (k) k.remove();
      if (huskFør === null) localStorage.removeItem(SP.NØKKEL); else localStorage.setItem(SP.NØKKEL, huskFør); SP.lesPåNytt(); }
    return ut;
  });
  return { ok: d.feil.length === 0, tekst: d.feil.length ? d.feil.join('; ') : `panelet, ${d.trinn}, steget «${d.steg || '–'}» og Storlia-kortet virker`, data: d };
} };
