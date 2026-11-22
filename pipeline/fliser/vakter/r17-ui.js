// VAKT for R17-2b (funnene 10, 16, 20, 21 i docs/natt/funn-r16-spilltest.md):
// 10: når farten senkes av seg selv, står grunnen i en lapp ved fartsknappen (og forsvinner når du trykker en fartsknapp);
//     radiokontakt «ingen» forklares med terreng (Kontrollrom.utenKontakt).
// 16: «Gå» trykket mens 3D bygges, huskes (Gange.gåVenter) – prøves bare når 3D er av (vakta slår ikke på 3D).
// 20: et hogstfelt under loggen i 2D gjør loggen nesten gjennomsiktig (#logg.vik).
// 21: oppdaterSikt med sikt NaN gir ingen OffscreenCanvas-feil (siktfeltet prøves igjen senere).
// Alt settes tilbake.
module.exports = {
  navn: 'R17 grensesnitt (fartsgrunn, Gå under bygging, logg viker, sikt uten tall)',
  kjør: async (pg) => {
    const feil = [], lytt = e => feil.push(String(e && e.message || e).slice(0, 200)); pg.on('pageerror', lytt);
    // oppdaterSikt fanger feilen selv og skriver den i konsollen – vakta ser etter den der
    const konsoll = m => { if (m.type() === 'error' && /OffscreenCanvas|unsigned long|drawImage/.test(m.text())) feil.push('konsoll: ' + m.text().slice(0, 160)); }; pg.on('console', konsoll);
    const d = await pg.evaluate(async () => {
      const d = { feil: [] }, krev = (b, t) => { if (!b) d.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
      const fartFør = (document.querySelector('.knapper [id^=sp].på') || {}).id || 'sp1';
      // 10: fartslappen
      try {
        if (window.FlytSpill && FlytSpill.stopp) {
          document.getElementById('sp3').click(); await vent(50);
          FlytSpill.stopp([{ type: 'kontakt', tekst: 'prøvelag er i ildkamp' }], 'auto'); await vent(50);
          const t = FlytSpill.fartGrunn(), l = document.getElementById('fartgrunn'), r = l && l.getBoundingClientRect();
          d.fart = t; krev(/senket til 1×/.test(t) && /ildkamp/.test(t), 'fartslappen sier ikke hvorfor: «' + t + '»');
          krev(r && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth + 1, 'fartslappen er ikke synlig på skjermen');
          FlytSpill.skjulFartGrunn(); krev(!FlytSpill.fartGrunn(), 'fartslappen gikk ikke bort');
        } else d.feil.push('FlytSpill.stopp mangler');
        if (window.Kontrollrom) { const t = Kontrollrom.utenKontakt('hånd', 0, 600); d.radio = t; krev(/terrenget står i veien/.test(t) && /ås|fjell/.test(t), 'radiotekst uten forklaring: ' + t); }
      } finally { const b = document.getElementById(fartFør); if (b) b.click(); }
      // 16: Gå huskes mens 3D bygges (bare reglene: uten 3D finnes ingen bygging å vente på)
      krev(window.Gange && typeof Gange.gåVenter === 'function' && Gange.gåVenter() === false, 'Gange.gåVenter mangler eller står på');
      // 20: loggen viker for et hogstfelt under den (bare PC – på telefon er loggen én linje)
      const i3d = typeof på3d !== 'undefined' && på3d;
      if (!i3d && window.RessursSpill && !document.body.classList.contains('kort')) {
        const R = RessursSpill.tilstand(), kam0 = { ...kam }, lg = document.getElementById('logg'); let lagt = null;
        try {
          for (let i = 0; i < 3; i++) logg('Prøvemelding fra vakta (R17) ' + i + '.');
          await vent(50); const lr = lg.getBoundingClientRect();
          const X = kam.x + ((lr.left + lr.right) / 2 - VW / 2) * kam.m, Y = kam.y - ((lr.top + lr.bottom) / 2 - VH / 2) * kam.m;
          lagt = { id: 'r17-prøve', type: 'hogst', x: X, y: Y, r: 20, gjort: 0, mål: 5, haug: 0 }; R.jobber.push(lagt); skitten = true; await vent(400);
          d.vik = lg.classList.contains('vik'); krev(d.vik, 'loggen viker ikke for hogstfeltet under den');
        } finally { if (lagt) { const i = R.jobber.indexOf(lagt); if (i >= 0) R.jobber.splice(i, 1); } Object.assign(kam, kam0); skitten = true; await vent(300); }
        krev(!lg.classList.contains('vik'), 'loggen står gjennomsiktig etter at feltet er borte');
      }
      // 21: siktfeltet kaster ikke når sikten blir NaN (tidlig i lastingen) – en krok som gir NaN for ett lag
      try { const s = ENHETER.find(e => e.side === 'blå' && levende(e)); if (s) { const x0 = s.x, y0 = s.y, sikt0 = s.sikt, ved0 = s.siktVed;
          const nan = q => (q === s ? NaN : 1); KROKER.sikt.push(nan); let kast = null; try { await oppdaterSikt(s); } catch (e) { kast = e.message; } finally { const i = KROKER.sikt.indexOf(nan); if (i >= 0) KROKER.sikt.splice(i, 1); } s.sikt = sikt0; s.siktVed = ved0; s.siktSkitten = true;
          krev(!kast, 'oppdaterSikt kastet: ' + kast); } } catch (e) { d.feil.push('sikt: ' + e.message); }
      return d;
    });
    await pg.waitForTimeout(200); pg.off('pageerror', lytt); pg.off('console', konsoll);
    if (feil.length) d.feil.push('feil i siden: ' + [...new Set(feil)].join(' | '));
    return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `fartslapp «${(d.fart || '').slice(0, 60)}», logg viker: ${d.vik}`, data: d };
  }
};
