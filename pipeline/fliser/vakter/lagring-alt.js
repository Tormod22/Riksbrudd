// VAKT «lagring av alt» (R16-E, 22. nov): det som ikke ble lagret før – en kjøreordre for et kjøretøy, et minefelt, en drone, en
// enhet i bestilling på basen og røverne i et angrep som er i gang – lagres, og er der når siden lastes på nytt.
// Vakta lager tingene på testsiden, lagrer, og åpner SAMME side i en ny fane (samme localStorage), der spillet lastes på nytt fra
// lagringen. Så sjekkes fanen, den lukkes, og alt på testsiden og i localStorage settes tilbake slik det var.
module.exports = {
  navn: 'lagring av alt',
  kjør: async (pg) => {
    const før = await pg.evaluate(async () => {
      const ut = { feil: [] };
      if (!window.Lagring || !window.LagringSpill || !window.OppstartSpill || !OppstartSpill.tilstand() || !OppstartSpill.tilstand().leir) { ut.feil.push('spillet er ikke satt opp'); return ut; }
      const L = OppstartSpill.tilstand().leir, vent = ms => new Promise(r => setTimeout(r, ms));
      // ta vare på alle spillnøklene (rått) og det som endres på siden
      const rå = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^riksbrudd-/.test(k)) rå[k] = localStorage.getItem(k); }
      window.__lagringAltFør = { rå, mf: (window.MINEFELT || []).slice(), dr: (window.DRONER || []).slice(), kø: OLJE.BASER[0] ? OLJE.BASER[0].kø.slice() : null, enheter: ENHETER.slice() };
      // 1) kjøreordre: et eget kjøretøy kjører mot Dombås sentrum (ekte rute når vegnettet finnes, ellers en rute laget her). Målet må ligge
      //    ved en annen vegnode enn kjøretøyet: en rute med bare ett punkt gir NaN i Kjoretoy.steg (kjent feil i spill/kjoretoy.js).
      // (lastebilkolonnen styres av økonomien – spill/okonomi-visning.js – og settes ut på nytt av den; en speiderbil eller stridsvogn brukes)
      const egne = (window.KJORETOY || []).filter(q => q.side === 'blå' && !q.oppdrag && q.antall > 0), k = egne.find(q => q.type !== 'lastebil') || egne[0];
      if (k) { window.__lagringAltFør.kj = { k, x: k.x, y: k.y, sti: k.sti, retning: k.retning };
        const gammel = k.sti; k.sti = null; try { await kjørTil(k, 193200, 6896300); } catch (e) { /* uten vegnett */ }
        if (!k.sti || k.sti === gammel || k.sti.P.length < 4) { ut.feil.push('fikk ikke kjøreordre (vegnettet mangler?)'); return ut; }
        const P = k.sti.P; ut.kjMål = [P[P.length - 2], P[P.length - 1]]; ut.kjNavn = k.navn; }
      // 2) minefelt og drone
      if (window.MINEFELT && window.Feltarbeid) { MINEFELT.push(Feltarbeid.nyttMinefelt({ x: L.x + 300, y: L.y + 200, side: 'blå', navn: 'Minefelt Vakt' })); ut.mine = true; }
      if (window.DRONER && window.Enheter) { DRONER.push(Enheter.nyDrone({ navn: 'Drone Vakt', x: L.x + 100, y: L.y, mål: [L.x + 2000, L.y + 1500] })); ut.drone = true; }
      // 3) en enhet i bestilling på basen
      const b = OLJE.BASER[0]; if (b) { b.kø.push({ type: 'lag', igjen: 1234, total: 3600 }); ut.base = b.navn; }
      // 4) et angrep som er i gang: bølge 9 med ett røverlag ved leiren
      if (window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() && window.TrusselLagringSpill) {
        const T = SpilletSpill.T(); window.__lagringAltFør.T = { aktiv: T.aktiv, bølge: T.bølge };
        const rv = nyttLag('Røvere 9.1', L.x + 900, L.y + 300, 'rød'); rv.raid = 9; rv.fra = { x: L.x + 2500, y: L.y + 800 }; rv.startTid = tid; ENHETER.push(rv);
        T.aktiv = 9; T.bølge = 9; TrusselLagringSpill.lagre();
        const id = Math.round(L.x) + ',' + Math.round(L.y); localStorage.setItem('riksbrudd-trussel', JSON.stringify({ leir: id, d: { ...T } })); ut.angrep = true; }
      // lagre alt (også K1, så den nye fanen laster dette spillet)
      // testsiden går videre mens fanen lastes: den skal ikke lagre over (kolonnen kan bli framme imens, og da er ordren borte)
      window.__lagringAltFør.aktiv = LagringSpill.aktiv(); LagringSpill.av(false); OppstartSpill.lagre(); ut.lagret = LagringSpill.lagre(); LagringSpill.av(true);
      try { const d = JSON.parse(localStorage.getItem(LagringSpill.NØKKEL)); ut.felt = { minefelt: (d.minefelt || []).length, droner: (d.droner || []).length, baser: (d.baser || []).length, kjMål: !!(d.kjøretøy || []).find(q => q.mål) }; } catch (e) { ut.feil.push('lagringen kan ikke leses'); }
      await vent(50); return ut;
    });
    let etter = null, feilet = '';
    if (!før.feil.length) {
      const p2 = await pg.context().newPage();
      const err = []; p2.on('pageerror', e => err.push(e.message));
      try {
        // røverne kommer bare tilbake i testene når dette er satt før skriptene lastes (spill/trussel-lagring.js)
        await p2.addInitScript(() => { window.TRUSSEL_LAGRING_TEST = true; });
        await p2.goto(pg.url()); await p2.waitForFunction(() => window.LagringSpill && LagringSpill.aktiv(), null, { timeout: 30000 });
        await p2.evaluate(() => { if (window.AI) AI.på = false; });
        // fortsettOrdre kjører 1,5 s etter lesingen, og røverne får ordren etter 1,5 s
        await p2.waitForTimeout(2500);
        etter = await p2.evaluate(async ([navn]) => {
          const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms));
          const k = (window.KJORETOY || []).find(q => q.navn === navn);
          for (let i = 0; i < 80 && k && !k.sti && k.målLagret === undefined; i++) await vent(100);
          for (let i = 0; i < 80 && k && !k.sti; i++) await vent(100);
          ut.kj = !!k; ut.kjSti = !!(k && k.sti); ut.kjMål = k && k.sti ? [k.sti.P[k.sti.P.length - 2], k.sti.P[k.sti.P.length - 1]] : null;
          ut.mine = (window.MINEFELT || []).some(f => f.navn === 'Minefelt Vakt' && f.ladninger > 0);
          ut.drone = (window.DRONER || []).some(d => d.navn === 'Drone Vakt' && d.igjen > 0);
          const b = OLJE.BASER[0]; ut.kø = b ? b.kø.some(j => j.type === 'lag' && j.total === 3600 && j.igjen <= 1234) : false;
          ut.røvere = ENHETER.some(e => e.raid === 9 && e.navn === 'Røvere 9.1' && levende(e));
          ut.kjInfo = k ? { målLagret: k.målLagret || null, oppdrag: !!k.oppdrag, x: Math.round(k.x), y: Math.round(k.y) } : null;
          ut.logg = (typeof loggLinjer !== 'undefined' ? loggLinjer : []).slice(0, 6).map(l => String(l.tekst || l).slice(0, 120));
          ut.aktiv = window.SpilletSpill && SpilletSpill.T ? SpilletSpill.T().aktiv : null;
          // fanen skal ikke skrive over testsidens lagring når den lukkes
          LagringSpill.av(true); return ut;
        }, [før.kjNavn]);
      } catch (e) { feilet = String(e && e.message).slice(0, 200); }
      finally { if (err.length) feilet += ' feil i fanen: ' + err.slice(0, 3).join(' | '); await p2.close(); }
    }
    // sett alt tilbake på testsiden
    await pg.evaluate(() => {
      const F = window.__lagringAltFør; if (!F) return; delete window.__lagringAltFør;
      if (window.MINEFELT) { MINEFELT.length = 0; MINEFELT.push(...F.mf); } if (window.DRONER) { DRONER.length = 0; DRONER.push(...F.dr); }
      if (F.kø && OLJE.BASER[0]) OLJE.BASER[0].kø = F.kø;
      if (F.kj) { const { k, x, y, sti, retning } = F.kj; k.x = x; k.y = y; k.sti = sti; k.retning = retning; k.framme = false; delete k.målLagret; }
      ENHETER.length = 0; ENHETER.push(...F.enheter);
      if (F.T && window.SpilletSpill) { const T = SpilletSpill.T(); T.aktiv = F.T.aktiv; T.bølge = F.T.bølge; }
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && /^riksbrudd-/.test(k) && !(k in F.rå)) localStorage.removeItem(k); }
      for (const [k, v] of Object.entries(F.rå)) localStorage.setItem(k, v);
      LagringSpill.av(!F.aktiv); skitten = true;
    });
    const e = etter || {}, nær = (a, b) => a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 60;
    const ok = !før.feil.length && !feilet && før.lagret && e.kj && e.kjSti && nær(e.kjMål, før.kjMål) && e.mine && e.drone && e.kø && (!før.angrep || (e.røvere && e.aktiv === 9));
    return { ok, data: { før, etter, feilet },
      tekst: `etter omlasting i ny fane: kjøreordre ${e.kjSti ? 'planlagt på nytt' : 'MANGLER'}, minefelt ${!!e.mine}, drone ${!!e.drone}, bestilling på basen ${!!e.kø}, røverne i bølge 9 ${!!e.røvere}` };
  },
};
