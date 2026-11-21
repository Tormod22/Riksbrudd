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
      KampSpill.sjekk(); KampSpill.nullstill(); KampSpill.test = true; FlytSpill.test = true;
      const s = nyttLag('Vaktprøve tropp', L.x + 2400, L.y + 1800, 'blå'), e = nyttLag('Vaktprøve fiende', L.x + 2700, L.y + 1800, 'rød'); ENHETER.push(s, e); nye.push(s, e);
      let hendelser = []; const lytt = ev => hendelser.push(ev.detail); window.addEventListener('riksbrudd-hendelse', lytt);
      tempo = 600; FlytSpill.spol(); await vent(250); e.skyterPå = new Set([s]); await vent(450);
      const vår = h => h.type === 'kontakt' && /Vaktprøve tropp/.test(h.tekst), kh = hendelser.filter(vår); d.kontakt = kh.map(h => h.tekst);
      krev(kh.length === 1, `${kh.length} kamphendelser (skal være én)`); krev(kh[0] && /^⚔ Vaktprøve tropp er i kamp med /.test(kh[0].tekst), 'kampmeldingen navngir ikke laget');
      krev(kh[0] && Number.isFinite(kh[0].x) && Number.isFinite(kh[0].y), 'kamphendelsen har ikke stedet');
      krev(tempo === 1 && !FlytSpill.spoler(), '⏭ stoppet ikke for kampen'); krev(!!document.getElementById('flytvis'), 'stoppkortet mangler «Vis»');
      for (let i = 0; i < 6; i++) { e.skyterPå = new Set(); tid += 8; await vent(120); e.skyterPå = new Set([s]); await vent(120); }
      krev(hendelser.filter(vår).length === 1, 'samme kamp ble meldt flere ganger');
      const ft = FolkRegler.falneTekst([s.menn[0].navn], s.navn); d.falne = ft; krev(/falt for /.test(ft), 'årsaken mangler når noen faller: ' + ft);
      window.removeEventListener('riksbrudd-hendelse', lytt);
      // ---------- røverne: uten syn ingen minutter; sett = stopp med Vis ----------
      if (T) { ForsvarSpill.test = true; const rv = nyttLag('Vaktprøve røver', L.x - 3200, L.y - 900, 'rød'); rv.raid = 97; rv.fra = { x: rv.x, y: rv.y }; rv.startTid = tid; ENHETER.push(rv); nye.push(rv); T.aktiv = 97; ForsvarSpill.vis();
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
      // ---------- (runde 14, kritiker I og J) ----------
      { const E = window.Eskalering, ES = window.EskaleringSpill;
        // 1. motangrepet: «fienden er ved byen nå», og et lag i en varslet gruppe går ikke løs på målet før tidligst-tida
        krev(E && /ved byen nå/.test(E.varselTekst({ fraksjon: 'K', antall: 2, mann: 24, sted: { navn: 'A', x: 0, y: 5000 }, mål: { navn: 'B', eier: 'blå' }, leir: L, om: 400, nær: 300 })), 'varselet sier ikke «fienden er ved byen nå»');
        if (E && ES && ES.S && window.AI && AI.styr) { const S2 = ES.S(), g0 = S2.gruppe.rød, t0 = ES.test; ES.test = true;
          const m = { id: 'vaktprøve-by', navn: 'Vaktprøveby', x: L.x + 3000, y: L.y, eier: 'blå' }, f2 = nyttLag('Vaktprøve motangrep', m.x + 300, m.y, 'rød'); f2.ai = { neste: 1e9 }; nye.push(f2);
          S2.gruppe.rød = { mål: m, lag: [f2.navn], behov: 10, sted: { x: m.x + 4000, y: m.y, navn: null }, fase: 'samler', start: tid, angripFra: tid + 360, tidligst: tid + 400, side: 'rød', varslet: true };
          try { const o = AI.styr(f2, { hva: 'angrip', x: m.x + 200, y: m.y, tekst: 'angriper' }); d.motangrep = o; krev(o && o.hva !== 'angrip', 'laget i den varslede gruppa angrep før tidligst-tida');
            f2.beskuttTid = tid; const o2 = AI.styr(f2, { hva: 'angrip', x: m.x + 200, y: m.y, tekst: 'angriper' }); krev(!o2 || o2.hva === 'angrip', 'et beskutt lag fikk ikke forsvare seg'); }
          finally { S2.gruppe.rød = g0; ES.test = t0; } }
        // 2. alarmen: en egen observasjon for 100 min siden står som «sist sett … kl. HH:MM»
        if (T) { ForsvarSpill.test = true; const r2 = nyttLag('Vaktprøve røver 2', L.x, L.y + 3500, 'rød'); r2.raid = 96; r2.fra = { x: r2.x, y: r2.y }; r2.startTid = tid - 120; r2.sett = { x: r2.x, y: r2.y, tid: tid - 100 }; ENHETER.push(r2); T.aktiv = 96;
          const st2 = ForsvarSpill.status(); d.sist = st2 && st2.tekst; krev(st2 && /^sist sett 3,5 km N kl\. \d\d:\d\d/.test(st2.tekst), 'banneret bruker ikke observasjonen: ' + (st2 && st2.tekst));
          // 4. rapporten kommer tidligst 2 spillminutter etter «kampen har begynt»
          const K14 = ForsvarSpill.kamp14; K14.kampStart.set('r96', tid); ForsvarSpill.slutt({ nr: 96, utfall: 'slått' });
          const n0 = loggLinjer.filter(l => /Bølge 96/.test(l)).length; krev(n0 === 0 && K14.ventRapport.has('r96'), '«slått tilbake» kom samme minutt som «kampen har begynt»');
          tid += K14.KAMP.minst + .5; if (!(tempo > 0)) tempo = 1; for (let i = 0; i < 40 && K14.ventRapport.has('r96'); i++) await vent(100); d.vent = K14.ventRapport.has('r96');
          // (21. nov) står spillet stille (et kort eller møte fra en annen vakt venter), går ikke simuleringen – da spør vi igjen etter 2 min
          if (K14.ventRapport.has('r96')) ForsvarSpill.slutt({ nr: 96, utfall: 'slått' });
          krev(loggLinjer.some(l => /Bølge 96/.test(l)), 'rapporten kom ikke etter 2 spillminutter'); K14.kampStart.delete('r96'); ForsvarSpill.lukkRapport(); T.aktiv = før.aktiv; const j2 = ENHETER.indexOf(r2); if (j2 >= 0) ENHETER.splice(j2, 1); }
        // 3. raidanslaget: samme tid etter F5 og aldri «under 1 min» før de er på vei
        if (window.TrusselLagring) { const p = TrusselLagring.pakk({ aktiv: 0, tid: 100, lag: [], egne: [], neste: 900, bølge: 2 }); krev(TrusselLagring.neste(p, { tid: 895, bølge: 2 }) === 900, 'tida for neste bølge flyttes etter omlasting'); }
        krev(Forsvar.utTekst && !/under 1 min/.test(Forsvar.utTekst(.3)), 'brikka sier «under 1 min» før røverne er på vei');
        // 5. bølge 2 på «Vanlig» er større enn bølge 1
        const TR = window.Spillet && Spillet.Trussel; if (TR) { const o5 = { soldater: 8, tunge: 0, dag: 1, faktor: 1 }, n1 = TR.lagFor(1, o5), m1 = TR.menn(1, 8, n1, 1), n2 = TR.lagFor(2, o5), m2 = TR.menn(2, 8, n2, 1);
          d.bølger = [n1 + '×' + m1, n2 + '×' + m2]; krev(n2 * m2 > n1 * m1 && n2 >= 2, `bølge 2 (${n2} × ${m2}) er ikke større enn bølge 1 (${n1} × ${m1})`); }
        // 6. patruljen i fredstid: egen tekst, ikke «fienden er i sikte»
        { const p6 = nyttLag('Vaktprøve patrulje', L.x + 600, L.y, 'rød'); p6.ai = { neste: 1e9 }; ENHETER.push(p6); nye.push(p6); const ser6 = e => e === p6; KROKER.ser.push(ser6);
          try { const b6 = FlytSpill.bilde(); d.fred = { fred: b6.fred, fiender: b6.fiender }; krev(b6.fred >= 1, 'patruljen i fredstid telles ikke');
            const h6 = (window.Flyt || window.FlytRegler || {}).hendelser; if (h6) { const hh = h6({ ...b6, fred: 0, alarm: false }, { ...b6, alarm: false }); d.fredH = hh.map(h => h.tekst); krev(hh.some(h => /fredstid, angriper ikke/.test(h.tekst)) && !hh.some(h => /fienden er i sikte/.test(h.tekst)), 'patruljen gir «fienden er i sikte»'); } }
          finally { const j = KROKER.ser.indexOf(ser6); if (j >= 0) KROKER.ser.splice(j, 1); } }
        // 7. andre siders kamper uten «fienden»
        { const a7 = nyttLag('Vaktprøve rød', L.x, L.y, 'rød'), b7 = nyttLag('Vaktprøve grønn', L.x, L.y, 'grønn'); const t7 = KampSpill.andre(a7, b7, L.x + 5000, L.y); d.andre = t7; krev(/ og .* sloss/.test(t7) && !/fienden/.test(t7), 'andre siders kamp: ' + t7); }
      }
    } catch (x) { feil.push('feil: ' + String(x && x.stack || x).slice(0, 240)); }
    finally {
      if (toggle) { delete document.body.classList.toggle; document.body.classList.remove('gaar'); }
      for (const b of prøveKnapper) b.remove(); const i = KROKER.ser.indexOf(serF); if (i >= 0) KROKER.ser.splice(i, 1);
      for (const q of nye) { const j = ENHETER.indexOf(q); if (j >= 0) ENHETER.splice(j, 1); }
      { const KT = window.KrigSpill && KrigSpill.T ? KrigSpill.T() : null; if (KT && Array.isArray(KT.etter)) for (let j = KT.etter.length - 1; j >= 0; j--) if (/^Vaktprøve/.test(KT.etter[j].navn || '')) KT.etter.splice(j, 1); }
      if (T) { T.aktiv = før.aktiv; T.bølge = før.bølge; T.nesteSpill = før.neste; }
      if (ForsvarSpill.erSatt() && !før.satt) ForsvarSpill.opphev(false);
      try { if (før.angrep === null) localStorage.removeItem('riksbrudd-angrep'); else localStorage.setItem('riksbrudd-angrep', før.angrep); } catch (x) { /* uten lagring */ }
      KampSpill.nullstill(); KampSpill.test = før.kt; ForsvarSpill.test = før.ft; FlytSpill.test = før.flt; tid = før.tid;
      if (FlytSpill.spoler()) FlytSpill.spol(); tempo = før.tempo; const fart = document.getElementById(før.tempo === 0 ? 'sp0' : 'sp1'); if (fart && før.tempo <= 1 && tempo !== før.tempo) fart.click();
      document.getElementById('flytkort').className = før.flytkort; Object.assign(kam, før.kam);
      if (før.logg) { loggLinjer.length = 0; loggLinjer.push(...før.logg); } ForsvarSpill.vis(); skitten = true; }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : 'én kamp per ildkamp med lag, fiende og sted, Vis, årsak, anslag uten minutter når ingen ser, stopp ved «sett», lagring og banner uten overlapp ok; runde 14: motangrep holdes til tidligst-tida, sist sett med klokkeslett, rapport etter 2 min, bølge 2 større, patrulje i fredstid, andre siders kamper', data: d };
  }),
};
