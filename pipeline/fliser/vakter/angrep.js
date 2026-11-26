// Vakt for pakka «angrep» (kritikerløkka r1, 26. nov – Ingrid Sæther og Jonas Bakke): «Forsvar leiren» før røverne er på vei heter ikke
// «Øvelse», prognosen («Med dette forsvaret: … sjanse») står i banneret, loggen og banneret sier det samme om når røverne kommer, din karakter
// ute gir en linje med «Gå hjem» som virker, ⏭-beskjeden blir en linje i banneret (ikke et eget kort), første bølge er liten og lett bevæpnet,
// og «Under ild!» dempes i loggen. Setter alt tilbake: lagene, karakteren, tida, farten, forsvaret, røverbølgen og lagringen.
module.exports = {
  navn: 'angrep',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, vent = ms => new Promise(r => setTimeout(r, ms)), krev = (b, t) => { if (!b) feil.push(t); };
    const S = window.OppstartSpill && OppstartSpill.tilstand(), L = S && S.leir;
    if (!window.ForsvarSpill || !ForsvarSpill.prognose || !window.Forsvar || !window.FlytSpill || !window.SpilletSpill || !SpilletSpill.klar || !SpilletSpill.klar() || !L) return { ok: false, tekst: 'ForsvarSpill, FlytSpill, SpilletSpill eller leiren mangler', data: {} };
    const T = SpilletSpill.T(), k = ENHETER.find(e => e.karakter && e.side === 'blå'), $ = id => document.getElementById(id);
    const FLAGG = ['SpilletSpill', 'ForsvarSpill', 'FlytSpill', 'KampSpill'], flagg = FLAGG.map(n => window[n] ? window[n].test : undefined);
    const før = { tid, tempo, kam: { ...kam }, T: { bølge: T.bølge, aktiv: T.aktiv, nesteSpill: T.nesteSpill, nesteEkte: T.nesteEkte, borteFra: T.borteFra }, k: k ? { x: k.x, y: k.y, sti: k.sti } : null,
      lager: Object.keys(localStorage).filter(n => /^riksbrudd-(trussel|angrep)/.test(n)).map(n => [n, localStorage.getItem(n)]), logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null, satt: ForsvarSpill.erSatt(), blå: ENHETER.filter(e => e.side === 'blå').map(e => [e, e.x, e.y, e.sti, e.forsvar, e.strid]) };
    const nye = [];
    try {
      for (const n of FLAGG) if (window[n]) window[n].test = true;
      if (ForsvarSpill.erSatt()) ForsvarSpill.opphev(false);
      // ---------- reglene ----------
      krev(Forsvar.sjanse({ egne: [{ treff: .13, menn: 4, vern: 1 }], fiender: [{ treff: .27, menn: 6 }] }).ord === 'dårlig', 'Forsvar.sjanse: fire mot seks uten vern skal være dårlig');
      krev(Forsvar.umulig(1, 1800) && !Forsvar.umulig(30, 1800), 'Forsvar.umulig: «1 min» på 1,8 km');
      krev(SpilletSpill.FØRSTE && SpilletSpill.FØRSTE.menn <= 4, 'første bølge har ikke et tak på mann');
      // ---------- 1: forsvaret satt før røverne er på vei – ikke «Øvelse» ----------
      const lag = nyttLag('Vaktprøve leiesoldater', L.x + 20, L.y + 10, 'blå'); lag.menn = lag.menn.slice(0, 4); ENHETER.push(lag); nye.push(lag);
      ForsvarSpill.sett(false); ForsvarSpill.vis(); await vent(50);
      d.beredskap = $('alarm').textContent.slice(0, 160); krev(!/Øvelse/.test(d.beredskap), '«Forsvar leiren» før angrepet heter «Øvelse»: ' + d.beredskap);
      krev(/Forsvaret er satt/.test(d.beredskap), 'banneret sier ikke «Forsvaret er satt»'); krev(!ForsvarSpill.øvelse(), 'ForsvarSpill.øvelse() er sann');
      ForsvarSpill.opphev(false);
      ForsvarSpill.sett(true); ForsvarSpill.vis(); krev(/Øvelse/.test($('alarm').textContent), 'en ekte øvelse heter ikke «Øvelse» lenger'); ForsvarSpill.opphev(false);
      // ---------- 2: prognosen ----------
      const P0 = ForsvarSpill.prognose(); d.prognose = P0 && P0.tekst; krev(!!P0 && /^Med dette forsvaret: (god|usikker|dårlig) sjanse/.test(P0.tekst), 'prognosen mangler');
      // ---------- 3: røverne drar ut – loggen og banneret sier det samme, karakteren ute, første bølge liten ----------
      if (k) { k.x = L.x - 900; k.y = L.y + 800; k.sti = null; }
      const lt = loggLinjer.length; await SpilletSpill.angrep(); await vent(200);
      const rv = ENHETER.filter(e => e.raid === T.aktiv); nye.push(...rv); d.røvere = rv.map(e => [e.navn, e.menn.length, e.menn.map(m => m.våpen || m.rolle).slice(0, 4).join(',')]);
      krev(rv.length >= 1, 'ingen røvere kom');
      // (i testene beholder røverlaget alle tolv mann; bevæpningen er lett i første bølge)
      if (T.aktiv === 1) krev(rv.every(e => e.menn.every(m => m.våpen && m.våpen !== 'maskingevær')), 'første bølge har ikke lette våpen');
      const varsel = loggLinjer.find(l => /^Varsel: /.test(l)) || ''; d.varsel = varsel; const st = ForsvarSpill.status(); d.status = st && st.tekst;
      const ord = (/trolig ([^.(]+)/.exec(varsel) || [])[1], ordB = st && (/trolig ([^.(–]+)/.exec(st.tekst) || [])[1];
      krev(!/Ventet om ca\./.test(varsel), 'varselet har fortsatt «Ventet om ca. N min»');
      krev(!st || st.sett || (ord && ordB && ord.replace(/^framme /, '').trim() === ordB.trim()), `loggen og banneret sier ulikt: «${ord}» / «${ordB}»`);
      ForsvarSpill.vis(); await vent(50); const a = $('alarm'); d.banner = a.textContent.slice(0, 300);
      krev(/Med dette forsvaret/.test(a.textContent), 'prognosen står ikke i banneret');
      if (k) { krev(/Du står/.test(a.textContent), 'banneret sier ikke at du står ute'); const g = $('gahjem'); krev(!!g, '«Gå hjem» mangler');
        if (g) { g.click(); await vent(100); for (let i = 0; i < 30 && k.planlegger; i++) await vent(100); const m = k.sti && k.sti[k.sti.length - 1]; krev(!!m && Math.hypot(m[0] - L.x, m[1] - L.y) < 120, '«Gå hjem» sendte ikke karakteren hjem'); } }
      // ---------- 4: ⏭-beskjeden står i banneret, ikke som et eget kort ----------
      FlytSpill.visKort('Vaktprøve stopp', true, null); await vent(50); ForsvarSpill.vis();
      krev(!$('flytkort').classList.contains('på'), 'stoppkortet står som en egen boks mens banneret står'); krev(/⏭ Vaktprøve stopp/.test($('alarm').textContent), '⏭-linja står ikke i banneret');
      // ---------- 5: «Forsvar leiren» mot ekte angrep: aldri «Øvelse» ----------
      ForsvarSpill.sett(false); ForsvarSpill.vis(); krev(!/Øvelse/.test($('alarm').textContent) && !/Avslutt øvelsen/.test($('alarm').textContent), '«Øvelse» under ekte angrep');
      // ---------- 6: loggdempingen ----------
      if (window.LoggDemp && LoggDemp.vurder) { const t1 = '📻 Vaktprøve leiesoldater: Under ild!'; logg(t1); const n1 = loggLinjer.filter(l => l.startsWith(t1)).length; logg(t1); const n2 = loggLinjer.filter(l => l.startsWith(t1)).length;
        krev(n1 === 1 && n2 === 1 && !loggLinjer.some(l => /Vaktprøve leiesoldater: Under ild! \(×/.test(l)), '«Under ild!» dempes ikke'); }
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      if (ForsvarSpill.erSatt()) ForsvarSpill.opphev(false);
      for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
      for (const [e, x, y, sti, fs, sr] of før.blå) { e.x = x; e.y = y; e.sti = sti; if (fs) e.forsvar = fs; else delete e.forsvar; e.strid = sr; e.siktSkitten = true; }
      Object.assign(T, før.T); tid = før.tid; Object.assign(kam, før.kam);
      for (const n of Object.keys(localStorage)) if (/^riksbrudd-(trussel|angrep)/.test(n)) localStorage.removeItem(n); for (const [n, v] of før.lager) localStorage.setItem(n, v);
      if (før.logg) { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
      $('flytkort').classList.remove('på'); FLAGG.forEach((n, i) => { if (window[n]) window[n].test = flagg[i]; });
      if (før.satt) ForsvarSpill.sett(false);
      await vent(1100); ForsvarSpill.vis();
      if (tempo !== før.tempo) { const id = { 0: 'sp0', 1: 'sp1', 10: 'sp2', 60: 'sp3', 600: 'sp4' }[før.tempo]; const b = id && document.getElementById(id); if (b) b.click(); else tempo = før.tempo; }
      skitten = true; }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `angrep: ikke «Øvelse», prognose «${d.prognose}», samme ankomst i logg og banner, «Gå hjem», ⏭ i banneret, loggdemping`, data: d };
  }),
};
