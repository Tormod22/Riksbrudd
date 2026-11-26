// Vakt for «spill i 2D» (brukeren 26. nov: hele spillet skal kunne spilles i kartet, 3D er et valg; spill/spill2d.js).
// Sjekker: 3D av/på i ☰ (knappen borte, slå3d åpner ikke 3D), leting i et hus fra kartet (funnet huskes, panelet står, målet «inne»),
// gangen i kartet teller i historien og målet «Gå selv», sikring/hvile/søvn ved et hus, snarefelle fra karakterens panel og felte
// fiender fra kampen i kartet. Setter alt tilbake (lett-lista, tilfluktene, fellene, 3D-valget, karakterens plass).
module.exports = {
  navn: 'spill i 2D (alt i kartet, 3D er et valg)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms)), S2 = window.Spill2D, LS = window.LeteSpill, ES = window.EventyrSpill, OS = window.OverlevSpill;
      if (!S2 || !LS || !ES || !OS || !OppstartSpill.tilstand() || !LeirSpill.tilstand()) return { mangler: true };
      const kar = ENHETER.find(e => e.karakter && levende(e)); if (!kar) return { mangler: true, hva: 'karakter' };
      const var3d = typeof på3d !== 'undefined' && på3d, k0 = { x: kar.x, y: kar.y, sti: kar.sti }, av0 = S2.uten3d(), L = LeirSpill.tilstand(), tre0 = L.lager.tre || 0, tf0 = OS.T().length, fe0 = ES.feller().length, t0 = ES.tellere();
      const I = UtstyrSpill.tilstand(), felle0 = I.ting.felle;
      try {
        // 1. 3D av: knappen borte, og slå3d åpner ikke 3D
        if (typeof på3d !== 'undefined' && på3d) await slå3d(false);
        S2.sett3d(true); const v3 = document.getElementById('v3d'); ut.av = document.body.classList.contains('uten3d') && v3 && v3.getClientRects().length === 0 && window.UTEN_3D === true;
        await slå3d(true); ut.åpnerIkke = !på3d; ut.menyKnapp = !!document.getElementById('vis-3d') && document.getElementById('vis-3d').classList.contains('av');
        S2.sett3d(false); ut.på = !document.body.classList.contains('uten3d') && v3.getClientRects().length > 0;
        // 2. leting fra kartet: et prøvehus der karakteren står
        kar.sti = null; const X = kar.x + 12, Y = kar.y, i = 8700001, P = [[X - 5, Y - 4], [X + 5, Y - 4], [X + 5, Y + 4], [X - 5, Y + 4]];
        const h = S2.husFra({ P, o: { e: { i, t: 7, h: 5 } } }); ut.klasse = h.kl === 'butikk';
        ut.starter = S2.let2d(h) && !!S2.jobb() && document.getElementById('let2d').classList.contains('på');
        S2.jobb().start -= 60000; for (let n = 0; n < 30 && S2.jobb(); n++) await vent(100);
        ut.lett = LS.lett().has(i) && Array.isArray(LS.lett().get(i)) && Math.abs(LS.lett().get(i)[0] - X) < 1;
        await vent(1200); ut.panel = LS.funnÅpent();
        MaalSpill.sjekk(true); const T = MaalSpill.bilde ? MaalSpill.bilde() : null; ut.inne = !T || !!T.inne;
        LS.lukkFunn();
        // 3. gangen i kartet teller (historien og målet)
        const g0 = ES.tellere().gått, r0 = S2.reist(); for (let n = 1; n <= 3; n++) { kar.x = k0.x + n * 30; await vent(1100); }
        ut.gått = ES.tellere().gått - g0 >= 55 && S2.reist() - r0 >= 55;
        kar.x = k0.x + 9000; await vent(1100); const g1 = ES.tellere().gått; kar.x = k0.x; await vent(1100); ut.hopp = ES.tellere().gått === g1;
        // 4. sikre huset, hvile og sove der (i kartet)
        L.lager.tre = Math.max(10, tre0); kar.x = X; kar.y = Y; ut.sikret = OS.sikre2d({ i, x: X, y: Y, kl: h.kl }) && !!OS.tilflukt(i) && ES.tilflukt2d();
        ut.sover = ES.sov2d() && ES.sover(); kar.x = X + 400; for (let n = 0; n < 20 && ES.sover(); n++) await vent(100); ut.våknet = !ES.sover(); kar.x = X;
        // 5. snarefelle fra karakterens panel (et stykke fra leiren)
        const sl = OppstartSpill.tilstand().leir; kar.x = sl.x + 900; kar.y = sl.y; I.ting.felle = 1;
        let H = document.createElement('div'); for (const f of KROKER.lagKnapper) { try { f(kar, H); } catch (e) { /* andre kroker */ } }
        const fk = H.querySelector('#felle2dknapp'); ut.felleKnapp = !!fk && !!H.querySelector('#sov2dkar'); if (fk) fk.click(); for (let n = 0; n < 30 && ES.feller().length === fe0; n++) await vent(100);
        ut.felle = ES.feller().length === fe0 + 1;
        H = document.createElement('div'); for (const f of KROKER.lagKnapper) { try { f(kar, H); } catch (e) { /* andre kroker */ } } ut.sjekkKnapp = !!H.querySelector('#felle2dsjekk');
        // 6. felte fiender i kampen i kartet: karakterlaget skyter, én faller
        const fi = { side: 'rød', menn: [{ hp: 1 }, { hp: 1 }] }, f0 = ES.tellere().felt; for (const f of KROKER.salve) if (f.toString().includes('karakter')) f(kar, fi);
        fi.menn[0].hp = 0; ut.felt = S2.salveSteg() === 1 && ES.tellere().felt === f0 + 1;
      } catch (err) { ut.feil = String(err && err.stack || err).slice(0, 300); }
      // tilbake
      LS.lett().delete(8700001); if (LS.lukkFunn) LS.lukkFunn(); OS.giOpp(8700001); L.lager.tre = tre0; ES.feller().splice(fe0); if (felle0 === undefined) delete I.ting.felle; else I.ting.felle = felle0;
      kar.x = k0.x; kar.y = k0.y; kar.sti = k0.sti; S2.sett3d(av0);
      // 3D var åpent før vakta: åpne det igjen (de neste vaktene trenger det) og vent til utsnittet er bygget
      if (var3d && !på3d) { await slå3d(true); for (let n = 0; n < 1800 && (!på3d || !R3.ut || R3.bygger); n++) await vent(100); }
      ut.tilbake3d = !var3d || (på3d && !!R3.ut);
      ut.tilbake = !LS.lett().has(8700001) && OS.T().length === tf0 && S2.uten3d() === av0;
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'Spill2D/LeteSpill/EventyrSpill/OverlevSpill mangler eller spillet er ikke startet ' + JSON.stringify(d), data: d };
    const krav = ['av', 'åpnerIkke', 'menyKnapp', 'på', 'klasse', 'starter', 'lett', 'panel', 'inne', 'gått', 'hopp', 'sikret', 'sover', 'våknet', 'felleKnapp', 'felle', 'sjekkKnapp', 'felt', 'tilbake', 'tilbake3d'];
    const feil = krav.filter(k => !d[k]); if (d.feil) feil.push('feil: ' + d.feil);
    return { ok: !feil.length, tekst: feil.length ? `${profil}: mangler ${feil.join(', ')}` : `${profil}: 3D av/på (knappen borte, åpner ikke), leting fra kartet (huskes, panelet står, målet «inne»), gangen teller (ikke hopp), sikre/sove/våkne ved huset, snarefelle fra karakteren og felte fiender`, data: d };
  },
};
