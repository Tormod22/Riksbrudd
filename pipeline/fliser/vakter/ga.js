// VAKT for pakka «gå» (runde 6, 19. nov – kritikken; runde 8, 20. nov: styrespaken, «Gå inn i huset» fra kartet, pila mot inngangen,
// banneret på én linje, byggeplassen og leirens ting i 3D): «Gå hit / Reis hit» når kameraet ser langt fra karakteren, «Gå inn»-knappen og
// døra som trekker deg mot midten, Esc som lukker det som er åpent før den går ut av førsteperson, kort som venter mens du går, været
// i 3D som følger toppstripa («Klart → regn» i overgangen) og maskinvarevarselet (lite, i hjørnet, én gang).
// Uten 3D prøves reglene, været, Esc-sjekken og varselet; med 3D også valget, reisen, døra og kortene. Alt settes tilbake.
module.exports = {
  navn: 'gå (gå hit, døra, Esc, kort, vær, varsel)',
  kjør: async (pg, profil) => {
    const data = await pg.evaluate(async () => {
      const d = { feil: [] }, krev = (b, t) => { if (!b) d.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
      if (!window.Gaavalg || !window.Gange || !window.VaerSpill) { d.feil.push('Gaavalg, Gange eller VaerSpill mangler'); return d; }
      const G = Gaavalg, før = { tid, vær: JSON.stringify(VaerSpill.S), varsel: localStorage.getItem('riksbrudd-grafikkvarsel'), fart: (document.querySelector('#sp0.på, #sp1.på, #sp2.på, #sp3.på, #sp4.på') || {}).id };
      const kar = ENHETER.find(e => e.karakter), karFør = kar ? { x: kar.x, y: kar.y } : null;
      // 1. reglene
      krev(G.valg(30).type === 'her' && G.valg(800).type === 'spør' && G.valg(G.REGLER.maks + 1).type === 'forLangt', 'Gaavalg.valg: her/spør/forLangt stemmer ikke');
      // 2. været: statuslinja sier «Klart → regn» i første halvdel av overgangen, og 3D-kopien følger reglene utenfor 3D
      try {
        const S = VaerSpill.S; Vaer.låsVær(S, 'auto'); S.vær = 'klart'; S.fra = null; S.fraVær = null; S.til = tid; Vaer.steg(S, tid, (() => { let n = 0; return () => (n++ === 1 ? .6 : .5); })());
        const nytt = S.vær; VaerSpill.oppdater(); const tekst1 = document.getElementById('sVaer').textContent;
        S.start = tid - S.varighet * .7; VaerSpill.oppdater(); const tekst2 = document.getElementById('sVaer').textContent;
        d.vær = [tekst1, tekst2]; krev(nytt !== 'klart' && /→/.test(tekst1) && !/→/.test(tekst2), `statuslinja under overgangen: «${tekst1}» / «${tekst2}»`);
        const i3d = typeof på3d !== 'undefined' && på3d && R3 && R3.ut; if (!i3d) krev(Math.abs(VAER.sky - VAER.regel.sky) < 1e-9 && Math.abs(VAER.regn - VAER.regel.regn) < 1e-9, '3D-kopien av været følger ikke reglene i 2D');
      } finally { Object.keys(VaerSpill.S).forEach(k => delete VaerSpill.S[k]); Object.assign(VaerSpill.S, JSON.parse(før.vær)); VaerSpill.straks(); }
      // 3. maskinvarevarselet: lite, ute av midten, husket
      try {
        localStorage.removeItem('riksbrudd-grafikkvarsel'); KVAL.programvareVarsel(); const v = document.getElementById('grafikkvarsel');
        krev(!!v, 'maskinvarevarselet kom ikke'); if (v) { const r = v.getBoundingClientRect(); d.varsel = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
          krev(r.width <= 320 && !(r.left < innerWidth / 2 && r.right > innerWidth / 2 && r.top < innerHeight / 2 && r.bottom > innerHeight / 2), 'maskinvarevarselet er stort eller ligger midt i bildet'); v.remove(); }
        KVAL.programvareVarsel(); krev(!document.getElementById('grafikkvarsel'), 'maskinvarevarselet kom igjen etter at det var vist');
      } finally { if (før.varsel === null) localStorage.removeItem('riksbrudd-grafikkvarsel'); else localStorage.setItem('riksbrudd-grafikkvarsel', før.varsel); const v = document.getElementById('grafikkvarsel'); if (v) v.remove(); }
      // 4. Esc-sjekken ser sekken
      if (window.UtstyrSpill && UtstyrSpill.klar && UtstyrSpill.klar()) { const å = UtstyrSpill.erÅpen(); UtstyrSpill.åpne(true); krev(Gange.noeÅpent(), 'Gange.noeÅpent() ser ikke den åpne sekken'); UtstyrSpill.åpne(å); }
      krev(!!(window.Kortkø && Kortkø.gåVent), 'kortkøen er ikke koblet til gåmodus');
      // RUNDE 8: styrespaken bare nede til venstre (kritikerens drag midt på telefonskjermen skal snu deg)
      krev(!G.erSpak(150, 450, 390, 844) && G.erSpak(90, 724, 390, 844), 'Gaavalg.erSpak: drag midt på telefonskjermen ble styrespak');
      // RUNDE 8: trykk på et bygg i kartet gir «Gå inn i huset» (Dovre-siden har ingen husdata: finnBygg byttes ut med et prøvehus en stund)
      if (typeof finnBygg === 'function' && typeof visByggVed === 'function' && kar) {
        const fb = finnBygg, X = kar.x + 300, Y = kar.y, Pk = [[X - 5, Y - 4], [X + 5, Y - 4], [X + 5, Y + 4], [X - 5, Y + 4]];
        try { window.finnBygg = async () => ({ o: { e: { i: 4246, t: 0, h: 6 } }, P: Pk }); await visByggVed(X, Y);
          const kn = document.getElementById('gaainnknapp'), lapp = document.querySelector('#panel .gaainn'); d.innKnapp = kn ? kn.textContent : '(ingen knapp)';
          krev(!!kn && /^Gå inn i huset \(ca\. \d+ min til fots\)/.test(kn.textContent) && !!lapp && /innside/.test(lapp.textContent), 'panelet for et bygg har ikke «Gå inn i huset»: ' + d.innKnapp);
        } finally { window.finnBygg = fb; const l = document.getElementById('lukk'); if (l && document.getElementById('panel').classList.contains('på')) l.click(); }
      }
      // RUNDE 8: byggeplassen i trinn (reglene) og den nye leirens ting
      if (window.Byggeplass) { const B = Byggeplass, a = B.stadium(.01), b = B.stadium(.5); krev(a.stikker && !b.stikker && b.reisverk === 1 && b.tak > 0 && b.stillas, 'Byggeplass.stadium: trinnene stemmer ikke');
        krev(B.leirting(3, .4, null).filter(t => t.type === 'telt').length === 3, 'Byggeplass.leirting: ikke tre telt i en ny leir'); } else d.feil.push('Byggeplass (spill/byggeplass3d.js) mangler');
      // 5. i 3D: valget, reisen, døra, Esc og kortene
      for (let q = 0; q < 50 && typeof på3d !== 'undefined' && på3d && R3 && R3.bygger; q++) await vent(200);
      const i3d = typeof på3d !== 'undefined' && på3d && R3 && R3.ut && !R3.bygger; d.i3d = !!i3d;
      if (!i3d || !kar) return d;
      const R = R3, u = R.ut, b = R.bane, bane = { X: u.cx + b.x, Y: u.cy + b.y, avst: b.avst, yaw: b.yaw, pitch: b.pitch }, gikk = !!R.fot; let hus = null, kort = null;
      try {
        // (rekkefølgen: døra, Esc og kortene uten pauser rett etter at du begynner å gå – et nytt utsnitt kan bli satt inn ved neste bilde –,
        // så valget og reisen til slutt)
        if (!R.fot) Gange.start();
        const U = R.ut, k = Gange.kropp(), x0 = Math.round(k.x) - 5, y0 = Math.round(k.y) + 3;
        // døra: et prøvehus foran deg (dør mot sør); du står 2,5 m ute og 0,45 m til siden
        const P = [[x0, y0], [x0 + 10, y0], [x0 + 10, y0 + 8], [x0, y0 + 8]]; P.bygg = { i: 4244, t: 0, h: 6, kl: 'hus' };
        P.dør = { x: x0 + 5, y: y0, ux: 1, uy: 0, w: 1, hh: 2.1, z0: (hoyde3d(U.cx + x0 + 5, U.cy + y0 + 4, U) - U.h0) * R.EX };
        hus = { o: { P }, nøkler: [] };
        for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + 10) / 20); a++) for (let q = Math.floor(y0 / 20); q <= Math.floor((y0 + 8) / 20); q++) { const n = a + ',' + q; if (!R.hindre.has(n)) R.hindre.set(n, []); R.hindre.get(n).push(hus.o); hus.nøkler.push(n); }
        const sett = (x, y) => { R.bane.x = x; R.bane.y = y; const kr = Gange.kropp(); kr.x = x; kr.y = y; kr.vx = kr.vy = 0; kr.z = (hoyde3d(U.cx + x, U.cy + y, U) - U.h0) * R.EX; R.fot.a = 0; R.fot.pitch = 0; };
        sett(x0 + 5.45, y0 - 2.5); for (let q = 0; q < 12; q++) Interior3d.oppdater(true); Gange.oppdaterKnapper();
        const kn = document.getElementById('dorknapp'); d.dørknapp = kn.classList.contains('på') ? kn.textContent : '(skjult)';
        krev(!!P.inne && kn.classList.contains('på') && kn.textContent === 'Gå inn', '«Gå inn» kom ikke ved døra: ' + d.dørknapp);
        kn.click(); for (let q = 0; q < 90 && Gange.dørHjelp(); q++) Gange.kamera(R, .06);
        const ki = Gange.kropp(); d.inne = !!Interior3d.inne(ki.x, ki.y); d.innePos = [+(ki.x - x0).toFixed(2), +(ki.y - y0).toFixed(2)]; krev(d.inne, '«Gå inn» førte deg ikke inn: ' + JSON.stringify(d.innePos));
        Gange.oppdaterKnapper(); d.utknapp = kn.classList.contains('på') ? kn.textContent : '(skjult)'; krev(d.utknapp === 'Gå ut', 'inne kom ikke «Gå ut»: ' + d.utknapp);
        // Esc med sekken åpen: sekken lukkes, du går fortsatt
        if (window.UtstyrSpill && UtstyrSpill.klar && UtstyrSpill.klar()) { UtstyrSpill.åpne(true);
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); d.esc = { går: !!R.fot, sekk: UtstyrSpill.erÅpen() };
          krev(d.esc.går && !d.esc.sekk, 'Esc med sekken åpen: ' + JSON.stringify(d.esc)); }
        // et kort som kommer mens du går, venter; varselet øverst; Gange.visKort() viser det (i testene bare med Gange.test)
        Gange.test = true;
        const el = document.createElement('div'); el.id = 'gaavaktkort'; el.style.display = 'none'; document.body.appendChild(el); kort = el;
        const vis = () => { if (!Kortkø.ta('gaavaktkort', false, vis)) { el.classList.remove('på'); Kortkø.be('gaavaktkort', vis, { tittel: 'Prøve' }); return; } el.classList.add('på'); };
        vis(); Gange.oppdaterKnapper(); d.kort = { vist: el.classList.contains('på'), varsel: document.getElementById('gaakort').classList.contains('på') };
        krev(!d.kort.vist && d.kort.varsel, 'kortet kom opp mens du gikk, eller varselet manglet: ' + JSON.stringify(d.kort));
        Gange.visKort(); krev(el.classList.contains('på'), 'Gange.visKort() viste ikke kortet');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); krev(!!R.fot, 'Esc med et åpent kort tok deg ut av førsteperson');
        Gange.test = false; kort.remove(); Kortkø.ferdig('gaavaktkort'); kort = null;
        for (const n of hus.nøkler) { const A = R.hindre.get(n), q = A ? A.indexOf(hus.o) : -1; if (q >= 0) A.splice(q, 1); } hus = null;
        // RUNDE 8: dra for å se rundt midt på skjermen (som kritikeren på telefonen: fra x 38 % til 77 % i høyde 53 %) snur deg
        { const c3 = document.getElementById('c3'), a0 = R.fot.a, ev = (type, x, y) => ({ type, target: c3, clientX: x, clientY: y, pointerId: 77, pointerType: 'touch', movementX: 0, movementY: 0 });
          Gange.peker(ev('pointerdown', innerWidth * .38, innerHeight * .53)); for (let k = 1; k <= 5; k++) Gange.peker(ev('pointermove', innerWidth * (.38 + k * .078), innerHeight * .53)); Gange.peker(ev('pointerup', innerWidth * .77, innerHeight * .53));
          d.snudd = +((a0 - R.fot.a) * 180 / Math.PI).toFixed(0); krev(Math.abs(d.snudd) > 20, 'dra med fingeren midt på skjermen snudde deg ikke: ' + d.snudd + '°'); R.fot.a = a0;
          if (R3.snuPr) { R3.snuPr = false; R3.målPr = undefined; } }
        // RUNDE 8: angrepsbanneret er én linje mens du går
        { const al = document.getElementById('alarm'), gaar = document.body.classList.contains('gaar'); document.body.classList.add('gaar');
          if (al) { const før2 = [al.className, al.innerHTML]; al.innerHTML = '<span><b>Angrep: ett røverlag fra sør</b> <small>ikke sett ennå · ventet om ca. 203 min (anslag) – vakttårn og kameraer ser dem før</small></span><button>Forsvar leiren</button><button class="rolig">Vis</button>'; al.classList.add('på');
            const h = al.getBoundingClientRect().height; d.banner = Math.round(h); al.className = før2[0]; al.innerHTML = før2[1]; krev(h < 46, 'angrepsbanneret er ' + Math.round(h) + ' px høyt mens du går (skal være én linje)'); }
          if (!gaar) document.body.classList.remove('gaar'); }
        // RUNDE 8: pila mot inngangen – et prøvehus 20 m bak deg med døra mot deg
        { const k2 = Gange.kropp(), x1 = Math.round(k2.x) - 5, y1 = Math.round(k2.y) - 28, P2 = [[x1, y1], [x1 + 10, y1], [x1 + 10, y1 + 8], [x1, y1 + 8]]; P2.bygg = { i: 4247, t: 0, h: 6, kl: 'hus' };
          P2.dør = { x: x1 + 5, y: y1 + 8, ux: 1, uy: 0, w: 1, hh: 2.1, z0: (hoyde3d(U.cx + x1 + 5, U.cy + y1 + 4, U) - U.h0) * R.EX }; hus = { o: { P: P2 }, nøkler: [] };
          for (let a = Math.floor(x1 / 20); a <= Math.floor((x1 + 10) / 20); a++) for (let q = Math.floor(y1 / 20); q <= Math.floor((y1 + 8) / 20); q++) { const n = a + ',' + q; if (!R.hindre.has(n)) R.hindre.set(n, []); R.hindre.get(n).push(hus.o); hus.nøkler.push(n); }
          R.fot.a = 0; Gange.oppdaterPil(); const pil = Gange.inngangPil(); d.pil = pil ? pil.tekst + ' ' + (pil.rel * 180 / Math.PI).toFixed(0) + '°' : '(ingen)';
          krev(!!pil && pil.vis && /^Inngang \d+ m/.test(pil.tekst) && Math.abs(Math.abs(pil.rel) - Math.PI) < .4, 'pila mot inngangen bak deg: ' + d.pil);
          // «Gå inn i huset»: du settes foran døra og går inn av deg selv
          // (bare når utsnittet ikke må bygges på nytt for å gå her – ellers forsvinner prøvehuset med det gamle utsnittet)
          const X2 = U.cx + x1 + 5, Y2 = U.cy + y1 + 4, S1 = typeof utsnittS === 'function' ? utsnittS(1000) : U.S, kanInn = R.ut === U && !R.bygger && Math.hypot(x1 + 5, y1 + 4) <= U.S * .45 && S1 <= U.S * 1.6 && S1 >= U.S * .45;
          if (kanInn) { Gange.stopp(); Gange.gåInn({ i: 4247, P: P2.map(([x, y]) => [U.cx + x, U.cy + y]), mx: X2, my: Y2 });
          for (let q = 0; q < 100 && (Gange.venter() || !R.fot); q++) await vent(100);
          for (let q = 0; q < 40 && Gange.innVenter(); q++) { Interior3d.oppdater(true); Gange.oppdaterKnapper(); await vent(60); }
          for (let q = 0; q < 120 && Gange.dørHjelp(); q++) Gange.kamera(R, .06);
          const k3 = Gange.kropp(); d.gåInn = { går: !!R.fot, inne: !!(k3 && Interior3d.inne(k3.x, k3.y) === P2) }; krev(d.gåInn.går && d.gåInn.inne, '«Gå inn i huset» førte deg ikke inn: ' + JSON.stringify(d.gåInn)); }
          else d.gåInn = '(ikke prøvd: utsnittet må bygges på nytt for å gå her)';
          for (const n of hus.nøkler) { const A = R.hindre.get(n), q = A ? A.indexOf(hus.o) : -1; if (q >= 0) A.splice(q, 1); } hus = null; Interior3d.oppdater(true); }
        // RUNDE 8: byggeplassen i 3D har grunnmur på bakken og reiser seg (ikke en flat plate), og den nye leiren har ting rundt flaggstanga
        if (window.Byggeplass && window.MODELLER) { const geo = p => { const g = Byggeplass.byggeplassGeo([-3.1, 3.1, -6.1, 6.1], 4.6, p, false); g.computeBoundingBox(); const r = { z0: g.boundingBox.min.z, z1: g.boundingBox.max.z, n: g.attributes.position.count / 3 }; g.dispose(); return r; };
          const g1 = geo(.01), g5 = geo(.5), g9 = geo(.9); d.byggeplass = [g1, g5, g9].map(q => `${q.z1.toFixed(1)} m/${Math.round(q.n)}`).join(' → ');
          krev(Math.abs(g5.z0) < .05 && g1.z1 < 1.2 && g5.z1 > 3 && g9.z1 > 3.5 && g5.n > 200, 'byggeplassen i 3D: ' + d.byggeplass);
          const S0 = window.OppstartSpill && OppstartSpill.tilstand(), iU0 = S0 && S0.leir && Math.abs(S0.leir.x - R.ut.cx) < R.ut.S - 30 && Math.abs(S0.leir.y - R.ut.cy) < R.ut.S - 30;
          if (iU0) { let telt = 0, bål = 0; R.scene.traverse(o => { if (o.userData && o.userData.leirting === 'telt') telt++; if (o.userData && o.userData.leirting === 'bål') bål++; }); d.leirting = { telt, bål };
            krev(bål === 1 && telt >= 1, 'leiren i 3D mangler telt og bål: ' + JSON.stringify(d.leirting)); } }
        Gange.stopp();
        // valget: kameraet ser 90 m fra karakteren (bare når karakteren står i utsnittet)
        const V = R.ut, iUt = Math.abs(kar.x - V.cx) < V.S * .8 && Math.abs(kar.y - V.cy) < V.S * .8;
        if (iUt) {
          b.x = kar.x - V.cx + 90; b.y = kar.y - V.cy; Gange.startValg();
          const knapper = [...document.querySelectorAll('#gaavalg button')].map(e => e.textContent); d.valg = knapper;
          krev(Gange.valgÅpen() && /^Reis hit \(ca\. \d+ min til fots\)/.test(knapper[0] || '') && knapper.some(t => /^Gå her/.test(t)), 'valget «Reis hit / Gå her» kom ikke');
          // Esc lukker valget
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); krev(!Gange.valgÅpen() && !R.fot, 'Esc lukket ikke valget');
          // reisen: karakteren går dit og spilltiden går (farten settes tilbake)
          b.x = kar.x - V.cx + 90; b.y = kar.y - V.cy; const t0 = tid, mål = [kar.x + 90, kar.y]; Gange.startValg(); document.querySelector('#gaavalg button').click();
          for (let q = 0; q < 80 && !R.fot; q++) await vent(100);
          for (let q = 0; q < 150 && !R.fot && Gange.venter(); q++) await vent(200);
          d.reise = { min: +(tid - t0).toFixed(1), avstand: Math.round(Math.hypot(kar.x - mål[0], kar.y - mål[1])), går: !!R.fot, fart: (document.querySelector('#sp0.på, #sp1.på, #sp2.på, #sp3.på, #sp4.på') || {}).id };
          krev(R.fot && d.reise.min >= 1 && d.reise.avstand < 70 && d.reise.fart === før.fart, 'reisen: ' + JSON.stringify(d.reise));
        } else d.valg = ['(karakteren står utenfor utsnittet – valget og reisen ikke prøvd)'];
      } finally {
        Gange.test = false; if (kort) { kort.remove(); Kortkø.ferdig('gaavaktkort'); }
        if (hus) for (const n of hus.nøkler) { const A = R.hindre.get(n), q = A ? A.indexOf(hus.o) : -1; if (q >= 0) A.splice(q, 1); }
        if (Gange.reiser()) await vent(1500); if (Gange.venter()) for (let q = 0; q < 100 && Gange.venter(); q++) await vent(200); Gange.lukkValg(); if (R.fot && !gikk) Gange.stopp(); else if (!R.fot && gikk) Gange.start();
        Interior3d.oppdater(true); if (karFør) { kar.x = karFør.x; kar.y = karFør.y; kar.sti = null; } tid = før.tid;
        if (før.fart && (document.querySelector('#sp0.på, #sp1.på, #sp2.på, #sp3.på, #sp4.på') || {}).id !== før.fart) document.getElementById(før.fart).click();
        // kameraet tilbake der det var (i kartets meter: utsnittet kan ha byttet underveis)
        if (!gikk) { b.x = bane.X - R.ut.cx; b.y = bane.Y - R.ut.cy; b.avst = bane.avst; b.yaw = bane.yaw; b.pitch = bane.pitch; } skitten = true;
      }
      return d;
    });
    const ok = !data.feil.length;
    return { ok, tekst: ok ? `gå: ${data.i3d ? `valget «${(data.valg || [])[0]}», reisen ${data.reise ? data.reise.min : '?'} min, «${data.dørknapp}» → inne, Esc lukker sekken, kortet venter, snudd ${data.snudd}° med fingeren, banneret ${data.banner} px, pila «${data.pil}», «Gå inn i huset» ${JSON.stringify(data.gåInn)}, byggeplassen ${data.byggeplass}, leiren ${JSON.stringify(data.leirting || '-')}` : 'uten 3D: regler'}, panelknappen «${data.innKnapp}», været «${(data.vær || []).join('» → «')}», varselet ${JSON.stringify(data.varsel)}` : data.feil.join('; '), data };
  },
};
