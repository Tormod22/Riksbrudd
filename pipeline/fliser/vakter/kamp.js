// Vakt for pakka «kamp» (runde 13, 21. nov, kritiker G og H): kampene til lagene dine meldes én gang med lag, fiende og sted, stoppkortet
// har «Vis», de som faller får årsaken, anslaget går ikke baklengs og står uten minutter når ingen ser røverne, «Røverne er sett» stopper ⏭,
// tida for neste bølge og anslaget lagres, og angrepsbanneret ligger ikke oppå husknappene når du går.
// Setter alt tilbake: lagene, tida, farten, lagringen, kartet og bannerets plass.
module.exports = {
  navn: 'kamp',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, vent = ms => new Promise(r => setTimeout(r, ms)), krev = (b, t) => { if (!b) feil.push(t); };
    const S = window.OppstartSpill && OppstartSpill.tilstand(), L = S && S.leir;
    if (!window.KampVarsel || !window.KampSpill || !window.ForsvarSpill || !window.Forsvar || !window.FlytSpill || !L) return { ok: false, tekst: 'KampVarsel, KampSpill, ForsvarSpill, FlytSpill eller leiren mangler', data: {} };
    const T = window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null;
    const før = { tid, tempo, kam: { ...kam }, kt: KampSpill.test, ft: ForsvarSpill.test, flt: FlytSpill.test, aktiv: T ? T.aktiv : 0, bølge: T ? T.bølge : 0, neste: T ? T.nesteSpill : null,
      angrep: localStorage.getItem('riksbrudd-angrep'), logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null, flytkort: document.getElementById('flytkort').className, satt: ForsvarSpill.erSatt() };
    const nye = [], prøveKnapper = [], serF = e => nye.includes(e) && e.raid; let toggle = null;
    try {
      // ---------- reglene ----------
      const K = KampVarsel; let k = null, n = 0; for (let t = 0; t <= 300; t++) { const r = K.steg(k, t % 10 === 0 && t < 200, t, 0, 0); k = r.K; if (r.ny) n++; } krev(n === 1, `skudd hvert 10. min i 3 timer ga ${n} kamper (skal være én)`);
      krev(K.tekst({ lag: 'Speidertropp 1', fiende: 'bygdevernet', sted: 'i Lærdalsøyri', mann: 7 }) === '⚔ Speidertropp 1 er i kamp med bygdevernet i Lærdalsøyri (7 mann)', 'kampteksten');
      const e1 = Forsvar.monoton({ v: 30, t: 0 }, 300, 10, false); krev(e1.v === 20, 'anslaget gikk opp uten at røverne snudde');
      krev(!/\d+ min/.test(Forsvar.når(0, 500)), 'tidsrommet har minutter');
      // ---------- én kamp, melding med sted, Vis, årsak ----------
      KampSpill.test = true; FlytSpill.test = true; KampSpill.nullstill();
      const s = nyttLag('Vaktprøve tropp', L.x + 2400, L.y + 1800, 'blå'), e = nyttLag('Vaktprøve fiende', L.x + 2700, L.y + 1800, 'rød'); ENHETER.push(s, e); nye.push(s, e);
      let hendelser = []; const lytt = ev => hendelser.push(ev.detail); window.addEventListener('riksbrudd-hendelse', lytt);
      tempo = 600; FlytSpill.spol(); await vent(250); e.skyterPå = new Set([s]); await vent(450);
      const kh = hendelser.filter(h => h.type === 'kontakt'); d.kontakt = kh.map(h => h.tekst);
      krev(kh.length === 1, `${kh.length} kamphendelser (skal være én)`); krev(kh[0] && /^⚔ Vaktprøve tropp er i kamp med /.test(kh[0].tekst), 'kampmeldingen navngir ikke laget');
      krev(kh[0] && Number.isFinite(kh[0].x) && Number.isFinite(kh[0].y), 'kamphendelsen har ikke stedet');
      krev(tempo === 1 && !FlytSpill.spoler(), '⏭ stoppet ikke for kampen'); krev(!!document.getElementById('flytvis'), 'stoppkortet mangler «Vis»');
      for (let i = 0; i < 6; i++) { e.skyterPå = new Set(); tid += 8; await vent(120); e.skyterPå = new Set([s]); await vent(120); }
      krev(hendelser.filter(h => h.type === 'kontakt').length === 1, 'samme kamp ble meldt flere ganger');
      const ft = FolkRegler.falneTekst([s.menn[0].navn], s.navn); d.falne = ft; krev(/falt for /.test(ft), 'årsaken mangler når noen faller: ' + ft);
      window.removeEventListener('riksbrudd-hendelse', lytt);
      // ---------- røverne: uten syn ingen minutter; sett = stopp med Vis ----------
      if (T) { ForsvarSpill.test = true; const rv = nyttLag('Røvere 9.1', L.x - 3200, L.y - 900, 'rød'); rv.raid = 9; rv.fra = { x: rv.x, y: rv.y }; rv.startTid = tid; ENHETER.push(rv); nye.push(rv); T.aktiv = 9; ForsvarSpill.vis();
        const st = ForsvarSpill.status(); d.uSett = st && st.tekst; krev(st && !st.sett && /^ikke sett – kommer trolig /.test(st.tekst) && !/\d+ min/.test(st.tekst), 'banneret har minutter uten at noen ser røverne: ' + (st && st.tekst));
        tempo = 600; FlytSpill.spol(); await vent(200); KROKER.ser.push(serF); rv.x = L.x - 1000; rv.y = L.y - 300; await vent(600);
        const sk = FlytSpill.sistStopp(); d.sett = sk && sk.liste.map(h => h.tekst); krev(!!sk && sk.liste.some(h => /røverne er sett/.test(h.tekst)) && tempo === 1, '⏭ stoppet ikke ved «røverne er sett»');
        const m0 = ForsvarSpill.status().min; rv.x -= 120; tid += 1; await vent(50); const m1 = ForsvarSpill.status().min; krev(m1 <= m0 + 1e-6, `anslaget gikk opp (${m0} -> ${m1}) uten at de snudde`);
        // lagringen: anslaget og forsvaret
        ForsvarSpill.sett(false); TrusselLagringSpill.lagre(); const lag = JSON.parse(localStorage.getItem('riksbrudd-angrep') || '{}'); krev(lag.d && lag.d.satt && lag.d.anslag && Number.isFinite(lag.d.anslag.v), 'forsvaret eller anslaget ble ikke lagret');
        // ---------- gåmodus: banneret oppå husknappene ----------
        const cl = document.body.classList, tg = cl.toggle; toggle = tg; cl.toggle = function (c, f) { return c === 'gaar' ? (cl.add('gaar'), true) : tg.call(cl, c, f); }; cl.add('gaar');
        const rekke = document.getElementById('inneknapper');
        if (rekke) { for (const t of ['Se i skapene (1)', 'Sikre huset', 'Gå ut']) { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'min-height:38px;padding:4px 12px'; rekke.appendChild(b); prøveKnapper.push(b); }
          ForsvarSpill.opphev(false); ForsvarSpill.vis(); await vent(60); ForsvarSpill.vis();
          const a = document.getElementById('alarm').getBoundingClientRect(), o = r => !(r.right <= a.left + 1 || r.left >= a.right - 1 || r.bottom <= a.top + 1 || r.top >= a.bottom - 1);
          const treff = prøveKnapper.filter(b => o(b.getBoundingClientRect())).map(b => b.textContent); d.gå = { alarm: [Math.round(a.left), Math.round(a.top), Math.round(a.right), Math.round(a.bottom)], stil: document.getElementById('alarm').style.cssText };
          krev(!treff.length, 'angrepsbanneret ligger oppå ' + treff.join(', '));
          const fk = document.getElementById('forsvarknapp'); if (fk) { const r = fk.getBoundingClientRect(), bt = prøveKnapper.filter(b => { const q = b.getBoundingClientRect(); return !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); }); krev(!bt.length, '«Forsvar leiren» ligger oppå ' + bt.map(b => b.textContent).join(', ')); } } }
      // ---------- neste bølge lagres ----------
      if (T && window.TrusselLagring) { const p = TrusselLagring.pakk({ aktiv: 0, tid: 100, lag: [], egne: [], neste: 900, bølge: 2 }); krev(TrusselLagring.neste(p, { tid: 200, bølge: 2 }) === 900, 'tida for neste bølge holdes ikke fast'); }
    } catch (x) { feil.push('feil: ' + String(x && x.stack || x).slice(0, 240)); }
    finally {
      if (toggle) { delete document.body.classList.toggle; document.body.classList.remove('gaar'); }
      for (const b of prøveKnapper) b.remove(); const i = KROKER.ser.indexOf(serF); if (i >= 0) KROKER.ser.splice(i, 1);
      for (const q of nye) { const j = ENHETER.indexOf(q); if (j >= 0) ENHETER.splice(j, 1); }
      if (T) { T.aktiv = før.aktiv; T.bølge = før.bølge; T.nesteSpill = før.neste; }
      if (ForsvarSpill.erSatt() && !før.satt) ForsvarSpill.opphev(false);
      try { if (før.angrep === null) localStorage.removeItem('riksbrudd-angrep'); else localStorage.setItem('riksbrudd-angrep', før.angrep); } catch (x) { /* uten lagring */ }
      KampSpill.nullstill(); KampSpill.test = før.kt; ForsvarSpill.test = før.ft; FlytSpill.test = før.flt; tid = før.tid;
      if (FlytSpill.spoler()) FlytSpill.spol(); tempo = før.tempo; const fart = document.getElementById(før.tempo === 0 ? 'sp0' : 'sp1'); if (fart && før.tempo <= 1 && tempo !== før.tempo) fart.click();
      document.getElementById('flytkort').className = før.flytkort; Object.assign(kam, før.kam);
      if (før.logg) { loggLinjer.length = 0; loggLinjer.push(...før.logg); } ForsvarSpill.vis(); skitten = true; }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : 'én kamp per ildkamp med lag, fiende og sted, Vis, årsak, anslag uten minutter når ingen ser, stopp ved «sett», lagring og banner uten overlapp ok', data: d };
  }),
};
