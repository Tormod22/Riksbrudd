// VAKT for pakka «gå» (runde 6, 19. nov – kritikken): «Gå hit / Reis hit» når kameraet ser langt fra karakteren, «Gå inn»-knappen og
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
          d.reise = { min: +(tid - t0).toFixed(1), avstand: Math.round(Math.hypot(kar.x - mål[0], kar.y - mål[1])), går: !!R.fot, fart: (document.querySelector('#sp0.på, #sp1.på, #sp2.på, #sp3.på, #sp4.på') || {}).id };
          krev(R.fot && d.reise.min >= 1 && d.reise.avstand < 70 && d.reise.fart === før.fart, 'reisen: ' + JSON.stringify(d.reise));
        } else d.valg = ['(karakteren står utenfor utsnittet – valget og reisen ikke prøvd)'];
      } finally {
        Gange.test = false; if (kort) { kort.remove(); Kortkø.ferdig('gaavaktkort'); }
        if (hus) for (const n of hus.nøkler) { const A = R.hindre.get(n), q = A ? A.indexOf(hus.o) : -1; if (q >= 0) A.splice(q, 1); }
        if (Gange.reiser()) await vent(1500); Gange.lukkValg(); if (R.fot && !gikk) Gange.stopp(); else if (!R.fot && gikk) Gange.start();
        Interior3d.oppdater(true); if (karFør) { kar.x = karFør.x; kar.y = karFør.y; kar.sti = null; } tid = før.tid;
        if (før.fart && (document.querySelector('#sp0.på, #sp1.på, #sp2.på, #sp3.på, #sp4.på') || {}).id !== før.fart) document.getElementById(før.fart).click();
        // kameraet tilbake der det var (i kartets meter: utsnittet kan ha byttet underveis)
        if (!gikk) { b.x = bane.X - R.ut.cx; b.y = bane.Y - R.ut.cy; b.avst = bane.avst; b.yaw = bane.yaw; b.pitch = bane.pitch; } skitten = true;
      }
      return d;
    });
    const ok = !data.feil.length;
    return { ok, tekst: ok ? `gå: ${data.i3d ? `valget «${(data.valg || [])[0]}», reisen ${data.reise ? data.reise.min : '?'} min, «${data.dørknapp}» → inne, Esc lukker sekken, kortet venter` : 'uten 3D: regler'}, været «${(data.vær || []).join('» → «')}», varselet ${JSON.stringify(data.varsel)}` : data.feil.join('; '), data };
  },
};
