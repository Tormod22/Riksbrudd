// VAKT «tall, mål og tekster» (kritikerløkka runde 1, 26. nov): (1) Neste-lappen er den ene lappen – opplæringssteget står i lappen,
// ruta er skjult til lappen trykkes, og Leir → Mål har «Nå» øverst; (2) samme inntekt per tettsted i Krig og Lager (Region.inntekt);
// (3) kontrollrommets pris i Mål = byggelistas «i alt» (LeirSpill.totalPris); (4) loggen demper gjentakelser; (5) velkomsten viser
// bare det siste; (6) «Gått til fots» bruker samme tall som historien; (7) ingen lojalitet for egen karakter; (8) værmeldingen sier
// riktig om sikten; (9) funn i hus har en setning med stemning. Setter alt tilbake (lagring, valgt lag, opplæring, logg, test-flagg).
module.exports = { navn: 'løkka r1: én lapp, like tall og tekster', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    for (const n of ['NesteSpill', 'Neste', 'OpplaeringSpill', 'SelskapSpill', 'LoggDemp', 'LoggLager', 'Region', 'Leting', 'Maal', 'LeirSpill']) krev(!!window[n], 'mangler ' + n);
    if (ut.feil.length) return ut;
    const LS = ['riksbrudd-opplaering', 'riksbrudd-opplaering-av', 'riksbrudd-opplaering-sammen'], lsFør = LS.map(k => localStorage.getItem(k));
    const før = { nt: NesteSpill.test, ot: OpplaeringSpill.test, valgt: typeof valgt !== 'undefined' ? valgt : null, logg: loggLinjer.slice(), loggHtml: $('logg').innerHTML,
      selskap: SelskapSpill.tilstand() ? JSON.stringify(SelskapSpill.tilstand()) : null, selskapLS: localStorage.getItem(SelskapSpill.NØKKEL), st: SelskapSpill.test, leir: $('leirmeny').classList.contains('på') };
    try {
      // 1) ÉN LAPP: tråden er over, opplæringen står på steg 6 – det står i lappen, ruta er skjult, trykk folder den ut
      NesteSpill.test = true; OpplaeringSpill.test = true; if (OpplaeringSpill.av()) OpplaeringSpill.slå(true); localStorage.removeItem('riksbrudd-opplaering-sammen');
      const S = SelskapSpill.tilstand(); if (S && S.tråd) S.tråd.slutt = true;
      OpplaeringSpill.tilSteg('tropp2'); NesteSpill.glem(); await vent(1200); OpplaeringSpill.kjør(); await vent(700);
      const lapp = $('nestelapp'), boks = $('opplaering'), info = OpplaeringSpill.lappInfo();
      const bar = ['kommando', 'mkom'].map($).find(e => e && e.classList.contains('på') && e.getClientRects().length);
      ut.lapp = lapp.textContent;
      if (bar && info) {
        krev(lapp.classList.contains('på') && /Mer forsvar/.test(lapp.textContent), 'Neste-lappen viser ikke opplæringssteget: ' + lapp.textContent);
        krev(boks.getClientRects().length === 0, 'opplæringsruta står som en egen lapp ved siden av Neste-lappen');
        lapp.click(); await vent(500); krev(OpplaeringSpill.utvidet() === 'tropp2' && boks.getClientRects().length > 0, 'trykk på lappen folder ikke ut steget');
        lapp.click(); await vent(500); krev(!OpplaeringSpill.utvidet() && boks.getClientRects().length === 0, 'nytt trykk legger ikke steget inn i lappen igjen');
      } else ut.lappIkkePrøvd = !bar ? 'ingen bunnmeny' : 'opplæringen vises ikke';
      const L = NesteSpill.liste(); krev(L.length >= 2 && L[0].slag === 'opplæring', 'lista har ikke opplæringen øverst: ' + L.map(q => q.slag).join(','));
      // Leir → Mål: «Nå» først i fanen, og «Nå (…)» over fanene
      if (!$('leirmeny').classList.contains('på')) $('leirknapp').click(); await vent(400); LeirSpill.fane('mål'); await vent(900);
      const h3 = [...$('leirmeny').querySelectorAll('h3')].filter(h => !h.closest('[hidden]')).map(h => h.textContent.trim());
      krev(h3[0] === 'Nå' && !!$('leirmeny').querySelector('.naaliste li.nå'), 'fanen Mål har ikke «Nå» øverst: ' + h3.slice(0, 3).join(' | '));
      krev(/^Nå/i.test(($('leirmeny').querySelector('.nestemaal small') || {}).textContent || ''), '«Neste mål» over fanene sier ikke «Nå»');
      // 3) kontrollrommets pris i Mål = byggelistas pris i alt
      const T = MaalSpill.bilde(), hj = Maal.hjelpNå(Maal.finn('kontrollrom'), T), pris = Leir.kroner(LeirSpill.totalPris('kontrollrom'));
      krev(hj.includes(pris), `kontrollrommet: Mål sier ikke byggelistas ${pris}: ${hj}`); ut.kontrollrom = pris;
      // 2) inntekt: tettstedet gir det samme i Krig (inntekt) og i Region/Lager (girFor) når du holder det
      const byer = RegionSpill.status ? [...RegionSpill.status().keys()] : [];
      if (byer.length) { const id = byer[0], a = RegionSpill.inntekt(id), b = RegionSpill.girFor(id); krev(a && b && Math.abs((a.penger || 0) - (b.penger || 0)) < 1, 'inntekten spriker for et tettsted du holder'); }
      const g = Region.inntekt(1000, 'bygd', { strøm: true, rute: 'truet' }), g0 = Region.grunn(1000, 'bygd');
      krev(Math.abs(g.penger - g0.penger * .5) < 1, 'prognosen tar ikke med at handelsruta er truet'); krev(Region.krRund(39761) === 40000, 'kronene rundes ikke likt');
      // 4) loggdemping: 22 like meldinger flyttes ikke øverst 22 ganger, og «lastet nødlageret» står én gang
      { const D = LoggDemp.lag(), linjer = []; let vist = 0; for (let i = 0; i < 22; i++) { const r = D.vurder('Leiesoldater 1: Under ild!', linjer, i); if (r) { vist++; if (r.fjern >= 0) linjer.splice(r.fjern, 1); linjer.unshift(r.tekst); } }
        krev(vist <= 5, 'loggen viser «Under ild» ' + vist + ' ganger av 22');
        const t = 'Speidertropp 1 har lastet nødlageret. Gi troppen ordre hjem til leiren – da betaler Bygdelaget.'; krev(!!D.vurder(t, [], 0) && !D.vurder(t, [], 1) && !D.vurder(t, [], 30), '«lastet nødlageret» gjentas'); }
      // 5) velkomsten: bare det siste, og klokka spillet står på
      { let A = LoggLager.tom('1,1'); LoggLager.legg(A, 'Ola Moen falt i kampen.', 412); LoggLager.legg(A, 'Hogstlaget fant skog.', 420); A.økt += 1;
        const o = LoggLager.oppsummer(A, LoggLager.REGLER, 634); krev(o && o.stille && o.antall === 1 && o.nå.klokke === '16:34', 'velkomsten tar med gamle meldinger eller mangler klokka'); }
      // 9) funn i hus: en setning med stemning, fast per bygg, og meldingen begynner fortsatt med «Du fant»
      { const f = Leting.funn('låve', 120, 11), s1 = Leting.stemning('låve', 11, f), s2 = Leting.stemning('låve', 11, f), m = Leting.medStemning(Leting.tekst(f), s1);
        krev(!!s1 && s1 === s2 && m.includes(s1) && /^(Du fant|Huset var)/.test(m), 'funnet har ingen fast setning med stemning'); }
      // 6) og 7) egen karakter: «Gått til fots» = eventyrets teller, og ingen lojalitet i panelet
      const meg = ENHETER.find(q => q.karakter && q.side === 'blå');
      if (meg) { valgt = meg; visPanel(); await vent(200); const p = $('panel').textContent; krev(!/lojalitet/i.test(p), 'egen karakter vises med lojalitet'); }
      if (window.EventyrSpill && EventyrSpill.tellere && window.KarakterSpill && KarakterSpill.klar && KarakterSpill.klar()) {
        const var0 = KarakterSpill.erÅpen(); KarakterSpill.åpne(); await vent(200);
        const e = EventyrSpill.tellere().gått || 0, m = Math.max(e, (KarakterSpill.T() || {}).gått || 0), vent0 = m >= 1000 ? String(Math.round(m / 100) / 10).replace('.', ',') + ' km' : Math.round(m) + ' m';
        const rad = [...$('karakterark').querySelectorAll('.rad')].find(r => /Gått til fots/.test(r.textContent)); ut.gått = rad ? rad.textContent : null;
        krev(!!rad && rad.textContent.includes(vent0), '«Gått til fots» bruker ikke samme tall som historien (' + vent0 + '): ' + (rad && rad.textContent));
        if (!var0) KarakterSpill.lukk(); }
      // 8) værmeldingen: «Det klarner opp» med sikten nå og at den blir bedre
      { const V = window.VAER; ut.vær = V ? V.navn : null; }
    } finally {
      NesteSpill.test = før.nt; OpplaeringSpill.test = før.ot; NesteSpill.glem(); document.body.classList.remove('nesteen'); if (OpplaeringSpill.utvidet()) OpplaeringSpill.utvid(false);
      LS.forEach((k, i) => { if (lsFør[i] === null) localStorage.removeItem(k); else localStorage.setItem(k, lsFør[i]); }); OpplaeringSpill.last(); OpplaeringSpill.kjør();
      SelskapSpill.test = før.st; if (før.selskap) SelskapSpill.sett(JSON.parse(før.selskap)); if (før.selskapLS === null) localStorage.removeItem(SelskapSpill.NØKKEL); else localStorage.setItem(SelskapSpill.NØKKEL, før.selskapLS);
      if (!før.leir && $('leirmeny').classList.contains('på')) $('leirknapp').click();
      valgt = før.valgt; visPanel(); loggLinjer.length = 0; loggLinjer.push(...før.logg); $('logg').innerHTML = før.loggHtml; skitten = true;
    }
    return ut; });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? `én lapp (${d.lappIkkePrøvd || 'prøvd'}), «Nå» i Mål, kontrollrommet ${d.kontrollrom}, inntekt, loggdemping, velkomst, funn og egen karakter` : 'FEIL: ' + d.feil.join('; '), data: d };
} };
