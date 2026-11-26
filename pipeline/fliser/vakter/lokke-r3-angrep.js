// Vakt for pakka «angrep» (kritikerløkka r3, 26. nov – Jonas Bakke og Ingrid Sæther):
// 1) et røverlag som står utenfor leiren uten å angripe (Trussel.LEI), gir opp – bølgen avsluttes, og laget går sin vei (er ikke borte med
//    en gang); banneret sier ikke «kan være framme» om røvere som alt har vært i leiren;
// 2) varselet i loggen og banneret sier samme tall og samme kant når en bølge drar ut;
// 3) farten senkes ikke før røverne er sett, og bare én gang per angrep (flyt.js);
// 4) prognosen sier «god sjanse til å holde leiren» med tapene;
// 5) kampen om en by dere holder står i banneret #bykamp med «Vis» og tapene, og byen gir ingen rekrutter under kampen.
// Setter alt tilbake: lagene, tida, farten, kassa, moralen, røverbølgen, tettstedene, loggen og lagringen.
module.exports = {
  navn: 'lokke-r3-angrep',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, vent = ms => new Promise(r => setTimeout(r, ms)), krev = (b, t) => { if (!b) feil.push(t); };
    const S = window.OppstartSpill && OppstartSpill.tilstand(), L = S && S.leir, $ = id => document.getElementById(id);
    if (!window.ForsvarSpill || !ForsvarSpill.fase || !window.Spillet || !Spillet.Trussel.LEI || !window.FlytSpill || !window.SpilletSpill || !SpilletSpill.klar || !SpilletSpill.klar() || !L || !window.GarnisonSpill || !GarnisonSpill.bykampSteg)
      return { ok: false, tekst: 'ForsvarSpill.fase, Trussel.LEI, FlytSpill, SpilletSpill, GarnisonSpill.bykampSteg eller leiren mangler', data: {} };
    const T = SpilletSpill.T(), F = window.FolkSpill ? FolkSpill.tilstand() : null;
    const FLAGG = ['SpilletSpill', 'ForsvarSpill', 'FlytSpill', 'GarnisonSpill', 'KampSpill'], flagg = FLAGG.map(n => window[n] ? window[n].test : undefined);
    const O = SpilletSpill.O(), H = SpilletSpill.H();
    const før = { tid, tempo, kam: { ...kam }, penger: S.penger, moral: F ? F.moral : null, T: { ...T }, enh: ENHETER.slice(), blå: ENHETER.filter(e => e.side === 'blå').map(e => [e, e.x, e.y, e.sti, e.forsvar, e.strid, e.skyterPå]),
      tet: new Map(TETTSTEDER), lager: Object.keys(localStorage).filter(n => /^riksbrudd-(trussel|angrep|marked|oppdrag|hendelser)/.test(n)).map(n => [n, localStorage.getItem(n)]),
      logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null, satt: ForsvarSpill.erSatt(), oppdrag: O && O.liste ? O.liste.slice() : null, hÅpen: H ? H.åpen : null };
    const fart = id => { const b = $(id); if (b) b.click(); }; let nyBy = null, lagetInfra = false;
    try {
      for (const n of FLAGG) if (window[n]) window[n].test = true;
      if (ForsvarSpill.erSatt()) ForsvarSpill.opphev(false);
      if (ForsvarSpill.lukkRapport) ForsvarSpill.lukkRapport();
      // ---------- 4: prognosen ----------
      { const p = Forsvar.sjanse({ egne: [{ treff: 1, menn: 4, vern: .5 }], fiender: [{ treff: .6, menn: 4 }] }); d.prognose = p.tekst;
        krev(p.ord === 'god' && /holde leiren/.test(p.tekst) && /tap/.test(p.tekst), 'prognosen «god» sier ikke «holde leiren … regn med tap»: ' + p.tekst); }
      // ---------- 2: varselet og banneret sier det samme ----------
      fart('sp0'); await vent(60);
      T.aktiv = 0; T.nesteSpill = T.nesteEkte = Infinity;
      await SpilletSpill.angrep(); await vent(1300);
      const raid = ENHETER.filter(e => e.raid === T.aktiv && T.aktiv > 0), lv = loggLinjer.slice(0, 15).map(l => (typeof l === 'string' ? l : l.t || l.tekst || JSON.stringify(l))).find(l => /Varsel: .* røverlag/.test(l)) || '';
      const st = ForsvarSpill.status(); d.varsel = lv.slice(0, 140); d.banner = st ? st.overskrift : null;
      krev(raid.length > 0 && st, 'SpilletSpill.angrep() satte ikke ut en bølge');
      if (st && lv) { const m = /Varsel: (et|\d+) røverlag .* fra (\S+?) \(/.exec(lv), n = m ? (m[1] === 'et' ? 1 : +m[1]) : NaN;
        krev(n === st.antall, `tallet i varselet (${m && m[1]}) og banneret (${st.antall}) er ulike`); krev(m && m[2] === st.retning, `kanten i varselet (${m && m[2]}) og banneret (${st.retning}) er ulike`); }
      // ---------- 3: farten senkes ikke før de er sett ----------
      krev(!ForsvarSpill.fase().sett, 'fasen sier «sett» før noen har sett røverne');
      fart('sp3'); await vent(100); FlytSpill.settAuto(true);
      window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'alarm', tekst: 'prøve: leiren angripes' } })); await vent(700);
      d.fartFør = tempo; d.kortÅpne = [...document.querySelectorAll('.på')].map(e => e.id).filter(Boolean).join(','); { const q = FlytSpill.sistStopp(); d.stoppFør = q ? q.liste.map(h => h.type + ':' + h.tekst).join(', ') : null; } krev(tempo === 60, `farten ble senket (${tempo}) før røverne var sett`);
      // røverne inne i leiren: sett – farten ned én gang …
      const r1 = raid[0]; r1.x = L.x + 30; r1.y = L.y + 20; r1.sti = null; for (const e of raid.slice(1)) { e.x = L.x + 2400; e.y = L.y; e.sti = null; }
      for (let i = 0; i < 40 && tempo !== 1; i++) await vent(100); d.fartSett = tempo; krev(tempo === 1, `farten ble ikke senket da røverne ble sett (${tempo})`);
      krev(!$('flytkort').classList.contains('på') || !/Senket farten/.test($('flytkort').textContent), 'både kortet og lappen sier at farten ble senket');
      // … og ikke igjen i samme angrep
      fart('sp3'); await vent(150); window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'alarm', tekst: 'prøve: kampen om leiren har begynt', x: L.x, y: L.y } })); await vent(700);
      d.fartEtter = tempo; krev(tempo === 60, `farten ble senket en gang til i samme angrep (${tempo})`);
      fart('sp0'); await vent(60);
      // ---------- 1: røvere som går lei ----------
      // de andre lagene tas bort; det ene står 600 m nordøst, har vært i leiren og har stått stille lenge
      for (const e of raid.slice(1)) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
      r1.x = L.x + 430; r1.y = L.y + 430; r1.sti = null; r1.inne = 12; r1.leiNær = true; r1.skyterPå = new Set(); r1.venterNatt = false;
      const st1 = ForsvarSpill.status(); d.stTekst = st1 ? st1.tekst : null; krev(!st1 || !/kan være framme/.test(st1.tekst), '«kan være framme» om røvere som har vært i leiren: ' + (st1 && st1.tekst));
      r1.stille = Spillet.Trussel.LEI.min + 1; const nr = T.aktiv;
      SpilletSpill.angrepSteg(); d.flykter = !!r1.flykter; krev(r1.flykter, 'røverlaget som sto stille lenge, ga ikke opp');
      SpilletSpill.angrepSteg(); d.aktivEtter = T.aktiv; krev(T.aktiv === 0, 'bølgen ble ikke avsluttet da det siste laget ga opp');
      krev(ENHETER.includes(r1) && r1.raid === -nr && (r1.sti || r1.planlegger), 'laget som ga opp, gikk ikke sin vei (borte med en gang eller står)');
      krev(!ForsvarSpill.angrep(), 'banneret regner fortsatt laget som gikk sin vei, som angriper');
      // ---------- 5: kampen om en by ----------
      // et prøvetettsted 5 km øst for leiren (Dovre-testsiden har ikke alltid tettstedene lastet), tas bort igjen
      // (uten INFRA – testsiden uten kartlageret – lages en liten INFRA med bare prøvebyen, og den tas bort igjen)
      if (typeof INFRA !== 'undefined' && !INFRA) { INFRA = {}; for (const k of ['felt', 'tettsted', 'magasin', 'ror', 'ferje', 'tunnel', 'dam', 'bru', 'ferjekai', 'kraft', 'olje', 'kai']) INFRA[k] = []; lagetInfra = true; }
      if (typeof INFRA !== 'undefined' && INFRA && !INFRA.tettsted) INFRA.tettsted = [];
      const by = typeof INFRA !== 'undefined' && INFRA ? (() => { const x = L.x + 5000, y = L.y, r = 300; return { lag: 'tettsted', e: { id: 'vr3by' + Date.now(), navn: 'Vaktby', folk: 2000 }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; })() : null;
      if (by) { INFRA.tettsted.push(by); nyBy = by; }
      if (!by) d.by = 'ingen INFRA'; else {
        TETTSTEDER.set(by.e.id, { eier: 'blå', inntar: null }); const cx = (by.bb[0] + by.bb[2]) / 2, cy = (by.bb[1] + by.bb[3]) / 2;
        const vår = nyttLag('Vaktprøve garnison', cx, cy, 'blå'), deres = nyttLag('Vaktprøve angriper', cx + 40, cy, 'rød'); ENHETER.push(vår, deres);
        vår.skyterPå = new Set([deres]); deres.skyterPå = new Set([vår]);
        krev(GarnisonSpill.kampOm(by, 'blå'), 'kampOm: skudd i byen regnes ikke som kamp om byen');
        // (alt i byen skjer uten pauser, så målene – «ta kontroll over et tettsted» – ikke ser den lånte byen)
        GarnisonSpill.bykampSteg(); deres.menn[0].hp = 0; vår.menn[0].hp = .5; GarnisonSpill.bykampSteg();
        const bk = $('bykamp'); d.bykamp = bk ? bk.textContent.slice(0, 200) : null;
        krev(bk && bk.classList.contains('på') && /Angrep på/.test(bk.textContent), 'banneret for kampen om byen står ikke');
        krev(bk && /1 falt/.test(bk.textContent) && /1 såret/.test(bk.textContent), 'banneret viser ikke tapene (1 falt hos dem, 1 såret hos oss)');
        const vis = $('bykampvis'); krev(!!vis, 'banneret har ingen «Vis»'); kam.x = L.x; kam.y = L.y; if (vis && !(typeof på3d !== 'undefined' && på3d)) vis.click();
        d.visAvstand = Math.round(Math.hypot(kam.x - cx, kam.y - cy)); if (!(typeof på3d !== 'undefined' && på3d)) krev(d.visAvstand < 400, '«Vis» flyttet ikke kartet til byen');
        // ingen rekrutter mens det er kamp: forsterkningen står stille
        const f0 = vår.forsterkning || 0, n0 = vår.menn.length, t0 = tid; vår.forsterkning = 5; for (let i = 0; i < 3; i++) for (const k of KROKER.sim) { try { k(1); } catch (e) { /* andre kroker */ } }
        d.rekrutter = vår.menn.length - n0; krev(vår.menn.length === n0, `${vår.menn.length - n0} rekrutter gikk inn i laget midt i kampen om byen`); vår.forsterkning = f0; tid = t0;
        for (const e of [vår, deres]) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
        TETTSTEDER.delete(by.e.id); GarnisonSpill.bykampSteg(); }
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      if (ForsvarSpill.erSatt()) ForsvarSpill.opphev(false);
      ENHETER.length = 0; ENHETER.push(...før.enh);
      for (const [e, x, y, sti, fs, sr, sk] of før.blå) { e.x = x; e.y = y; e.sti = sti; if (fs) e.forsvar = fs; else delete e.forsvar; e.strid = sr; e.skyterPå = sk; e.siktSkitten = true; }
      for (const k of Object.keys(T)) if (!(k in før.T)) delete T[k]; Object.assign(T, før.T); tid = før.tid; Object.assign(kam, før.kam);
      if (S) S.penger = før.penger; if (F && før.moral !== null) F.moral = før.moral;
      TETTSTEDER.clear(); for (const [k, v] of før.tet) TETTSTEDER.set(k, v); if (nyBy) { const i = INFRA.tettsted.indexOf(nyBy); if (i >= 0) INFRA.tettsted.splice(i, 1); } if (lagetInfra) INFRA = null;
      if (O && O.liste && før.oppdrag) O.liste.splice(0, O.liste.length, ...før.oppdrag); if (H) H.åpen = før.hÅpen;
      for (const n of Object.keys(localStorage)) if (/^riksbrudd-(trussel|angrep|marked|oppdrag|hendelser)/.test(n)) localStorage.removeItem(n); for (const [n, v] of før.lager) localStorage.setItem(n, v);
      if (før.logg) { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
      if (ForsvarSpill.lukkRapport) ForsvarSpill.lukkRapport(); $('flytkort').classList.remove('på'); { const g = $('fartgrunn'); if (g) g.classList.remove('på'); }
      if (GarnisonSpill.bykampSteg) GarnisonSpill.bykampSteg();
      FLAGG.forEach((n, i) => { if (window[n]) window[n].test = flagg[i]; });
      if (før.satt) ForsvarSpill.sett(false);
      await vent(1100); ForsvarSpill.vis();
      { const id = { 0: 'sp0', 1: 'sp1', 10: 'sp2', 60: 'sp3', 600: 'sp4' }[før.tempo]; const b = id && $(id); if (b && tempo !== før.tempo) b.click(); else if (!b) tempo = før.tempo; }
      skitten = true; }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `angrep r3: røvere som går lei avslutter bølgen, samme tall og kant, én nedbremsing, ærlig prognose, bykampen med Vis og tap`, data: d };
  }),
};
