// Vakt for pakka «spillform» (natt 18. nov): flyt (spol, kø, flere lag), spillform (regler, scenario, utpost-plan, etterspill, ukas
// oppdrag), krigsmål og seierskortet. Setter alt tilbake. Kjøres av sjekk.js: kjør(pg, profil) -> { ok, tekst, data }.
module.exports = { navn: 'spillform: flyt, scenarier, seier og tap', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms));
    const før = { tid, tempo, valgt, modus, kam: { ...kam }, fart: (document.querySelector('.knapper [id^=sp].på') || {}).id || 'sp1', regler: JSON.stringify(OppstartSpill.tilstand().regler || null), penger: OppstartSpill.tilstand().penger,
      flytTest: FlytSpill.test, scTest: ScenarioSpill.test, strTest: StrategiSpill.test, bilder: ScenarioSpill.bilder().length, maal: [...MaalSpill.ferdige()], strategi: localStorage.getItem('riksbrudd-strategi'), spillform: localStorage.getItem('riksbrudd-spillform'), ettersp: localStorage.getItem('riksbrudd-etterspill') };
    const på3 = typeof på3d !== 'undefined' && på3d;
    try {
      ut.finnes = !!(window.Flyt && window.FlytSpill && window.Scenario && window.ScenarioSpill && window.SPILLREGLER && document.getElementById('nesteh'));
      // ---- køordre ----
      const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && levende(e)), s0 = { x: s.x, y: s.y, sti: s.sti, steg: s.steg, seg: s.seg, prog: s.prog, timer: s.timerIgjen, nedgravd: s.nedgravd, graver: s.graver };
      s.sti = null; await ordre(s, s.x + 260, s.y + 60, true); ut.marsj = !!s.sti;
      ut.kø1 = FlytSpill.giOrdre(s, s.x + 500, s.y + 300, true) && s.kø && s.kø.length === 1;
      valgt = s; visPanel(); ut.knapper = [...document.querySelectorAll('#handl button')].map(b => b.textContent).filter(t => /Legg til|Tøm køen|Velg alle/.test(t)).length;
      ut.tekst = (document.getElementById('psub').textContent.match(/kø: 1 punkt/) || [])[0] || '';
      // framme ved første punkt: neste i køen tas
      s.x = s.sti[s.sti.length - 1][0]; s.y = s.sti[s.sti.length - 1][1]; s.sti = null; sim(.001); await vent(50); for (let i = 0; i < 60 && s.planlegger; i++) await vent(100);
      ut.kø2 = !s.kø && !!s.sti && s.køSiste === true;
      // en vanlig ordre tømmer køen
      FlytSpill.giOrdre(s, s.x + 100, s.y, true); ut.køFør = s.kø ? s.kø.length : 0; s.sti = null; s.kø = null; s.køSiste = false; s.køSlutt = null;
      // ---- hendelser og spoling ----
      const b0 = FlytSpill.bilde(); ut.bilde = b0.lag >= 1 && typeof b0.dag === 'number';
      const t0 = tid; ut.spol = FlytSpill.spol() && tempo === 600 && FlytSpill.spoler(); document.getElementById('sp1').click(); ut.avbrutt = !FlytSpill.spoler() && tempo === 1; tid = t0;
      // ---- flere lag ----
      const egne = ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e)); ut.egne = egne.length;
      if (egne.length > 1) { ut.gruppe = FlytSpill.velg(egne.slice(0, 2)) === 2 && document.getElementById('flytgruppe').classList.contains('på'); FlytSpill.velg([]); ut.opphevet = !document.getElementById('flytgruppe').classList.contains('på'); } else { ut.gruppe = ut.opphevet = true; }
      Object.assign(s, { x: s0.x, y: s0.y, sti: s0.sti, steg: s0.steg, seg: s0.seg, prog: s0.prog, timerIgjen: s0.timer, nedgravd: s0.nedgravd, graver: s0.graver, siktSkitten: true });
      // ---- spillreglene ----
      const S = OppstartSpill.tilstand(); S.regler = { vanskelighet: 'hard', utfordringer: ['ingenRadio', 'ingenKjøp', 'tåkeland'], scenario: 'tre' }; const r = ScenarioSpill.settRegler();
      const fi = ENHETER.find(e => e.side !== 'blå');
      ut.hard = r.faktor.fiende === 1.3 && window.SPILLREGLER.har('ingenRadio') && KROKER.ild.reduce((v, h) => v * h(fi, s), 1) > KROKER.ild.reduce((v, h) => v * h(s, fi), 1) * 0 && Math.abs(r.faktor.penger - .6) < 1e-9;
      const L = LeirSpill.tilstand(), tre = L.lager.tre; ut.ingenKjøp = !!Leir.kjøpMateriale(L, 'tre', 1, OppstartSpill.betal).feil && L.lager.tre === tre && S.penger === før.penger;
      const sx = s.x; s.x = S.leir.x + 5000; ut.ingenRadio = !KROKER.kanOrdre.every(f => f(s)); s.x = S.leir.x + 300; ut.radioNær = KROKER.kanOrdre.every(f => f(s)); s.x = sx;
      const sc = ScenarioSpill.scenario(); ut.scenario = !!sc && sc.status === 'pågår' && /0 av 3/.test(sc.tekst);
      LeirSpill.fane('mål'); const m = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'), åpen = m.classList.contains('på'); if (!åpen) lk.click(); LeirSpill.fane('mål'); await vent(60);
      ut.meny = !!document.getElementById('scenariolinje') && !!document.getElementById('ukelinje') && !!document.getElementById('flytauto'); LeirSpill.fane('bygg'); if (!åpen) lk.click();
      S.regler = JSON.parse(før.regler) || undefined; if (!S.regler) delete S.regler; ScenarioSpill.settRegler();
      ut.vanlig = window.SPILLREGLER.vanskelighet === 'vanlig' && !window.SPILLREGLER.har('ingenKjøp') && window.SPILLREGLER.faktor.fiende === 1;
      // ---- tap av leiren: planen (ingenting flyttes) ----
      const p = await ScenarioSpill.tapLeiren({ prøve: true }); ut.utpost = !!p && Math.hypot(p.sted.x - S.leir.x, p.sted.y - S.leir.y) > 500 && /utpost|trukket|slått dere ned/.test(p.tekst) && S.penger === før.penger && !localStorage.getItem('riksbrudd-flytt');
      // ---- etterspill ----
      ScenarioSpill.test = true; const n0 = ScenarioSpill.bilder().length; ScenarioSpill.taBilde(); tid += 200; ScenarioSpill.taBilde(); tid = før.tid;
      if (!på3) { ut.etterspill = ScenarioSpill.etterspill() && document.getElementById('etterspill').classList.contains('på') && ScenarioSpill.etterspillVis(1) >= 0; skitten = true; await vent(80); ScenarioSpill.etterspillLukk(); ut.etterLukket = !document.body.classList.contains('etterspill'); } else { ut.etterspill = ScenarioSpill.bilder().length > n0; ut.etterLukket = true; }
      ScenarioSpill.bilder().length = n0;
      // ---- ukas oppdrag ----
      const o = ScenarioSpill.uke(); ScenarioSpill.ukeStart(); const us = ScenarioSpill.ukeStatus(); ut.uke = !!o.tekst && !!us && !us.ferdig && /RB-/.test(ScenarioSpill.ukeDel()) && /gyldig/.test(ScenarioSpill.ukeSammenlign('tull')); ScenarioSpill.ukeAvbryt();
      // ---- krigsmål og seierskortet ----
      ut.maal = Maal.ALLE.length === 18 && MaalSpill.stilling().alle === (MaalSpill.stilling().krigÅpen ? 18 : 14);
      StrategiSpill.seierKort(.62); const kort = document.getElementById('krigkort'); ut.seier = kort.classList.contains('på') && kort.querySelectorAll('button').length >= 3 && /Større region/.test(kort.textContent); kort.classList.remove('på');
      ut.venner = typeof SpilletSpill.venner === 'function' && Array.isArray(SpilletSpill.minStilling().byer);
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 400); }
    // tilbake
    FlytSpill.test = før.flytTest; ScenarioSpill.test = før.scTest; StrategiSpill.test = før.strTest; tid = før.tid; valgt = før.valgt; modus = før.modus; Object.assign(kam, før.kam); ScenarioSpill.kortLukk();
    for (const [k, v] of [['riksbrudd-strategi', før.strategi], ['riksbrudd-spillform', før.spillform], ['riksbrudd-etterspill', før.ettersp]]) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
    const kn = document.getElementById(før.tempo === 0 ? 'sp0' : før.fart); if (tempo !== før.tempo && kn) { if (før.tempo === 0) { if (tempo > 0) kn.click(); } else kn.click(); } if (tempo !== før.tempo) tempo = før.tempo;
    document.getElementById('flytkort').classList.remove('på'); visPanel(); skitten = true;
    return ut;
  });
  const krav = ['finnes', 'marsj', 'kø1', 'kø2', 'bilde', 'spol', 'avbrutt', 'gruppe', 'opphevet', 'hard', 'ingenKjøp', 'ingenRadio', 'radioNær', 'scenario', 'meny', 'vanlig', 'utpost', 'etterspill', 'etterLukket', 'uke', 'maal', 'seier', 'venner'];
  const mangler = krav.filter(k => !d[k]); if (!(d.knapper >= 2)) mangler.push('knapper'); if (!d.tekst) mangler.push('tekst'); if (d.feil) mangler.push('feil: ' + d.feil);
  return { ok: !mangler.length, tekst: mangler.length ? 'mangler: ' + mangler.join(', ') : 'kø, spoling, gruppe, regler, scenario, utpost, etterspill, ukas oppdrag, krigsmål og seierskort virker', data: d };
} };
