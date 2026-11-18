// Vakt for pakka «balanse» (natt til 18. nov): reglene for røverbølgene, byttet, startkostnadene og den lette starten.
// Endrer ingenting i spillet (leser bare reglene og tilstanden).
module.exports = {
  navn: 'balanse',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], Sp = window.Spillet || {}, T = Sp.Trussel, M = Sp.Marked, LB = window.Leir;
    if (!T || !M || !LB) return { ok: false, tekst: 'Trussel, Marked eller Leir mangler', data: {} };
    // bølgene: aldri flere lag enn dagen og soldatene tilsier
    if (T.lagFor(9, { soldater: 40, dag: 0 }) !== 1) feil.push('første døgn: mer enn ett røverlag');
    if (T.lagFor(9, { soldater: 6, dag: 9 }) !== 1) feil.push('seks soldater: mer enn ett røverlag');
    if (T.lagFor(9, { soldater: 40, dag: 6 }) !== 3) feil.push('dag 7 med 40 soldater: ikke tre lag');
    // byttet dekker skader, ikke mer
    if (!(T.belønning(1) <= 5e5 && T.belønning(40) <= 1.5e6)) feil.push('røverbyttet er for stort');
    if (!(T.menn && T.menn(1, 8) <= 6 && T.menn(9, 40) === 12)) feil.push('røverlagene i første bølge er for store');
    if (!(T.BALANSE.først.spill >= 12 * 60)) feil.push('første bølge kommer før 12 spilltimer');
    // de fire første byggene med materialer (1,5 × prisen) og 500 l diesel får plass i 40 mill. med margin, og betongen finnes første dag
    const typer = ['brakke', 'aggregat', 'drivstofftank', 'kontrollrom'], mat = { tre: 0, betong: 0, stål: 0 };
    let kr = 500 * LB.DRIVSTOFF.prisPerLiter;
    for (const t of typer) { const B = LB.BYGG[t]; kr += B.pris; for (const [k, v] of Object.entries(B.mat || {})) mat[k] += v; }
    for (const [k, v] of Object.entries(mat)) kr += v * LB.MATERIALER[k].pris * M.PÅSLAG;
    if (kr > 35e6) feil.push(`startbyggene koster ${Math.round(kr / 1e5) / 10} mill. kr`);
    for (const [k, v] of Object.entries(mat)) if (M.LAGER[k].maks < v) feil.push(`hylla for ${k} (${M.LAGER[k].maks}) rommer ikke ${v}`);
    // i testene (webdriver) er starten som før: stridsvogna og rakettartilleriet finnes
    const S = window.OppstartSpill && OppstartSpill.tilstand();
    const tunge = (window.KJORETOY || []).filter(k => k.side === 'blå' && (k.type === 'stridsvogn' || k.type === 'rakettartilleri')).length;
    if (S && !S.lettStart && navigator.webdriver && tunge < 2) feil.push('testspillet mangler stridsvogna eller rakettartilleriet');
    // runde 2: sabotører ikke tidlig, maten har et mål, og en brann i leiren slokkes av folk hjemme og skader byggene gradvis
    const K = window.Krig;
    if (K && K.røverVariant) { if (K.røverVariant(3, 12, 1, 9) !== 'rett' || K.røverVariant(2, 12, 1, 9) !== 'rett' || K.røverVariant(7, 12, 1, 3) !== 'rett') feil.push('sabotører for tidlig');
      if (K.røverVariant(7, 12, 1, 4) !== 'sabotasje') feil.push('sabotørene kommer aldri'); } else feil.push('Krig mangler');
    if (!(window.Maal && Maal.ALLE.some(m => m.id === 'mat'))) feil.push('målet for mat mangler');
    let brann = null; const VS = window.VerdenSpill;
    if (VS && VS.slokkILeiren && S && S.leir) { const V = VS.tilstand(), r = 64, k = Math.floor(S.leir.x / r) + ',' + Math.floor(S.leir.y / r), før = V.brann.brent[k];
      const F = window.FolkSpill && FolkSpill.tilstand(), gamle = F ? F.personer.map(p => p.oppgave) : [];
      if (F && F.personer.length) F.personer.forEach((p, i) => { if (i < 4) p.oppgave = i % 2 ? 'vakt' : 'bygg'; });
      V.brann.celler[k] = { fra: tid, til: tid + 9999 }; let steg = 0; while (V.brann.celler[k] && steg < 24) { VS.slokkILeiren(10); steg++; }
      brann = { slokket: !V.brann.celler[k], steg }; delete V.brann.celler[k]; if (før === undefined) delete V.brann.brent[k]; else V.brann.brent[k] = før; VS.slokkILeiren(10);
      if (F) F.personer.forEach((p, i) => { p.oppgave = gamle[i]; });
      if (!brann.slokket) feil.push('brannen i leiren slokner ikke med fire hjemme');
      if (!(VS.LEIRBRANN.bygg < .5 && VS.LEIRBRANN.grus < 1)) feil.push('brann i leiren: byggene forsvinner eller grusplassen brenner som før'); }
    else feil.push('VerdenSpill.slokkILeiren mangler');
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `bølger, bytte, sabotører, mat og startkostnader ok (fire bygg + diesel: ${Math.round(kr / 1e5) / 10} mill. kr), brann i leiren slokket etter ${brann && brann.steg} × 10 min`, data: { kr, mat, tunge, brann } };
  }).then(async a => { const b = await runde4(pg); const c = await runde5(pg); return { ok: a.ok && b.ok && c.ok, tekst: a.tekst + ' · ' + b.tekst + ' · ' + c.tekst, data: { ...a.data, runde4: b.data, runde5: c.data } }; }),
};

// (runde 5, 18.–19. nov) et angrep som er i gang, lagres og kommer tilbake (TrusselLagringSpill), døgnoppgjøret om morgenen, og at
// hjelpen ikke åpnes av seg selv mens opplæringen går. Alt settes tilbake (lag, bølgen, lagringen, hjelpens merke, testbryterne).
async function runde5(pg) {
  const r = await pg.evaluate(() => {
    const feil = [], d = {}, Sp = window.SpilletSpill, TL = window.TrusselLagringSpill, OS = window.OppgjorSpill, T0 = Sp && Sp.klar && Sp.klar() ? Sp.T() : null, Sx = window.OppstartSpill && OppstartSpill.tilstand();
    if (!Sp || !TL || !T0 || !Sx || !Sx.leir) return { feil: ['SpilletSpill/TrusselLagringSpill mangler'], d };
    const L = Sx.leir, før = { T: JSON.parse(JSON.stringify(T0)), angrep: localStorage.getItem(TL.NØKKEL), hjelp: localStorage.getItem('riksbrudd-hjelp'), enheter: ENHETER.slice(), oppl: window.OpplaeringSpill ? OpplaeringSpill.test : null, hjelpÅpen: document.getElementById('hjelp') && document.getElementById('hjelp').classList.contains('på'),
      blå: ENHETER.filter(e => e.side === 'blå').map(e => [e, e.strid, e.stridFør, e.forsvar]),
      // nyttLag bruker den faste tilfeldighetsrekka (frø i index.html): den settes tilbake, så vaktene etter får de samme lagene som før
      frø: typeof frø === 'number' ? frø : null };
    try {
      // et angrep i gang: to røverlag, det ene har vært inne i leiren en stund og har mistet folk, det andre trekker seg ut med byttet
      const nr = 9101; T0.aktiv = nr; T0.bølge = Math.max(T0.bølge || 0, nr);
      const a = nyttLag('Røvere vakt5.1', L.x + 230, L.y + 20, 'rød'); a.raid = nr; a.fra = { x: L.x + 1800, y: L.y }; a.inne = 33; a.menn[1].hp = .25; a.menn[2].hp = 0; ENHETER.push(a);
      const b = nyttLag('Røvere vakt5.2', L.x - 640, L.y + 15, 'rød'); b.raid = nr; b.trekker = true; b.trekkerFra = tid - 5; b.bytte = { penger: 77000, lager: { tre: 1.5 }, diesel: 8, mat: 2 }; ENHETER.push(b);
      if (!TL.lagre()) feil.push('lagringen av angrepet feilet');
      // «siden lastes på nytt»: lagene borte, så tilbake
      ENHETER.splice(ENHETER.indexOf(a), 1); ENHETER.splice(ENHETER.indexOf(b), 1);
      d.tilbake = TL.tilbake(nr, true);
      const a2 = ENHETER.find(e => e.navn === a.navn && e.raid === nr), b2 = ENHETER.find(e => e.navn === b.navn && e.raid === nr);
      if (d.tilbake !== 2 || !a2 || !b2) feil.push(`røverlagene kom ikke tilbake (${d.tilbake})`);
      else { if (Math.abs(a2.x - a.x) > 1 || a2.inne !== 33 || a2.menn[1].hp !== .25 || a2.menn[2].hp !== 0 || !a2.fra) feil.push('røverlaget kom tilbake, men ikke som det var');
        if (!b2.trekker || !b2.bytte || b2.bytte.penger !== 77000) feil.push('byttet og «trekker seg ut» ble borte'); }
      // en annen bølge (eller ingen) gir ingenting tilbake
      if (TL.tilbake(nr + 1, true) !== 0 || TL.tilbake(nr) !== 0) feil.push('lagringen ga røvere til feil bølge (eller i testene uten test-bryteren)');
      // døgnoppgjøret: et bilde, og teksten etter en bølge som ble slått tilbake
      if (!OS || !window.Oppgjor) feil.push('døgnoppgjøret mangler');
      else { const bi = OS.bilde(); const t = Oppgjor.tekst({ ...bi, bølge: 0, aktiv: 0 }, { ...bi, bølge: 1, aktiv: 0 }); d.oppgjør = t && t.tekst;
        if (!bi || !Array.isArray(bi.bygg) || !/Bølge 1 slått tilbake/.test(d.oppgjør || '')) feil.push('døgnoppgjøret sier ikke at bølgen ble slått tilbake'); }
      // lagene hjemme fyller ammunisjon fra kassa (basen uten olje) og de sårede hviler – mellom angrepene
      const HS = window.HjemmeSpill, s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.leirvakt && !e.ombord && Array.isArray(e.menn) && e.menn.length >= 2 && levende(e));
      if (!HS || !window.Hjemme) feil.push('HjemmeSpill mangler');
      else if (s) { T0.aktiv = 0; for (const e of ENHETER.slice()) if (!før.enheter.includes(e)) ENHETER.splice(ENHETER.indexOf(e), 1); const fiendeR = Hjemme.REGLER.fiende; Hjemme.REGLER.fiende = 0; const fx = [s.x, s.y, s.sti, s.planlegger, s.ammo, s.menn.map(m => m.hp)], B = window.OLJE && OLJE.BASER[0], olje = B ? B.beholdning : 0, p0 = OppstartSpill.tilstand().penger, test = HS.test;
        if (p0 < 2e6) OppstartSpill.gi(2e6); const p1 = OppstartSpill.tilstand().penger;
        try { s.x = L.x + 30; s.y = L.y + 10; s.sti = null; s.planlegger = false; s.ammo = .5; s.menn[0].hp = .5; if (B) B.beholdning = 0; HS.test = true; HS.steg(60);
          d.hjemme = { ammo: Math.round(s.ammo * 100), hp: Math.round(s.menn[0].hp * 100), kr: p1 - OppstartSpill.tilstand().penger };
          if (!(s.ammo > .7 && s.ammo < 1 && d.hjemme.kr > 0)) feil.push('laget hjemme fikk ikke ammunisjon for penger'); if (!(s.menn[0].hp > .5)) feil.push('den sårede hvilte ikke'); }
        finally { HS.test = test; Hjemme.REGLER.fiende = fiendeR; if (B) B.beholdning = olje; [s.x, s.y, s.sti, s.planlegger] = fx; if (fx[4] === undefined) delete s.ammo; else s.ammo = fx[4]; s.menn.forEach((m, i) => { m.hp = fx[5][i]; });
          const diff = p0 - OppstartSpill.tilstand().penger; if (diff > 0) OppstartSpill.gi(diff); else if (diff < 0) OppstartSpill.betal(-diff); s.siktSkitten = true; } }
      // hjelpen åpnes ikke av seg selv mens opplæringen går (første gang)
      if (window.Hjelp && window.OpplaeringSpill) { localStorage.removeItem('riksbrudd-hjelp'); OpplaeringSpill.test = true; const av = OpplaeringSpill.av(); if (av) OpplaeringSpill.slå(true);
        const ferdig = window.Opplaering && Opplaering.ferdig(OpplaeringSpill.tilstand()); d.hjelpFørst = Hjelp.første(); if (d.hjelpFørst && !ferdig) feil.push('hjelpen åpnet seg selv mens opplæringen går'); if (av) OpplaeringSpill.slå(false); }
    } catch (e) { feil.push('kast: ' + e.message); }
    finally {
      for (const e of ENHETER.slice()) if (!før.enheter.includes(e)) ENHETER.splice(ENHETER.indexOf(e), 1);
      for (const k of Object.keys(T0)) delete T0[k]; Object.assign(T0, før.T); if (T0.nesteSpill === null) T0.nesteSpill = Infinity; if (T0.nesteEkte === null) T0.nesteEkte = Infinity;
      if (TL.glem) TL.glem(); if (før.frø !== null) frø = før.frø; for (const [e, st, sf, fs] of før.blå) { e.strid = st; if (sf === undefined) delete e.stridFør; else e.stridFør = sf; if (fs === undefined) delete e.forsvar; else e.forsvar = fs; }
      if (før.angrep === null) localStorage.removeItem(TL.NØKKEL); else localStorage.setItem(TL.NØKKEL, før.angrep);
      if (før.hjelp === null) localStorage.removeItem('riksbrudd-hjelp'); else localStorage.setItem('riksbrudd-hjelp', før.hjelp);
      if (window.OpplaeringSpill) { OpplaeringSpill.test = før.oppl; OpplaeringSpill.kjør(); }
      if (window.Hjelp && !før.hjelpÅpen) Hjelp.vis(false); skitten = true;
    }
    return { feil, d };
  });
  // ordrene til røverne som kom tilbake, sendes etter 1,5 s – lagene er alt fjernet, men vent så ingenting henger igjen
  await pg.waitForTimeout(1700);
  return { ok: !r.feil.length, tekst: r.feil.length ? 'runde 5: ' + r.feil.join('; ') : `runde 5: angrepet lagres og kommer tilbake, ammunisjon og hvile hjemme (${r.d.hjemme ? r.d.hjemme.kr + ' kr' : '–'}), døgnoppgjøret og opplæringen før hjelpen ok`, data: r.d };
}

// (runde 4, 18. nov) røvere som har herjet trekker seg ut med byttet, lagene hjemme går mot røvere i leiren, byggelagene reparerer og
// skadevarselet. Alt med SpilletSpill.test / ForsvarSpill.test = true, og alt settes tilbake (penger, lager, mat, moral, lag, bygg, bølgen).
async function runde4(pg) {
  const r = await pg.evaluate(() => {
    const feil = [], d = {}, Sp = window.SpilletSpill, FS = window.ForsvarSpill, T0 = Sp && Sp.T && Sp.T(), Sx = window.OppstartSpill && OppstartSpill.tilstand();
    if (!Sp || !FS || !T0 || !Sx || !Sx.leir || !FS.motSteg || !Sp.trekkUt) return { feil: ['SpilletSpill/ForsvarSpill (runde 4) mangler'], d };
    const L = Sx.leir, LS = LeirSpill.tilstand(), F = FolkSpill.tilstand(), Tr = Spillet.Trussel;
    const før = { T: JSON.parse(JSON.stringify(T0)), lagret: localStorage.getItem('riksbrudd-trussel'), penger: Sx.penger, lager: { ...LS.lager }, diesel: LS.drivstoff, mat: F ? F.mat : 0, moral: F ? F.moral : 0, opp: F ? F.personer.map(p => [p.oppgave, p.helse]) : [],
      test: [Sp.test, FS.test], bygg: LS.bygg.map(b => [b, b.hp, b.arbeid]), nesteJobb: LS.nesteJobb, enheter: ENHETER.slice(), pos: ENHETER.filter(e => e.side === 'blå').map(e => [e, e.x, e.y, e.sti, e.strid, e.forsvar]) };
    const gi = (b, stop) => { if (b > 0) OppstartSpill.gi(b); };
    try {
      Sp.test = true; FS.test = true; if (F) F.personer.forEach((p, i) => { if (i < 4) { p.oppgave = 'vakt'; p.helse = 1; } else if (i < 8) { p.oppgave = 'bygg'; p.helse = 1; } });
      // PUNKT 1: et røverlag som har vært 45 min inne i leiren, tar byttet og trekker seg ut; bølgen er over uten belønning
      LS.lager.tre = 10; LS.drivstoff = Math.max(LS.drivstoff, 100); if (F) F.mat = Math.max(F.mat, 20);
      const p0 = Sx.penger, nr = 9001, rv = nyttLag('Røvere vakt', L.x + 40, L.y + 10, 'rød'); rv.raid = nr; ENHETER.push(rv); T0.aktiv = nr; rv.inne = Tr.HERJ.min + 1;
      Sp.angrepSteg();
      d.trekker = !!rv.trekker; d.bytte = rv.bytte ? Tr.bytteTekst(rv.bytte) : null; d.tatt = p0 - OppstartSpill.tilstand().penger; d.over = T0.aktiv === 0; d.raidEtter = rv.raid; d.iEnheter = ENHETER.includes(rv);
      if (!d.trekker) feil.push('røverlaget trakk seg ikke ut etter 45 min i leiren'); if (!(d.tatt > 0 && rv.bytte && rv.bytte.lager.tre === 2)) feil.push('byttet ble ikke tatt fra kassa og lageret');
      if (!d.over || d.raidEtter !== -nr || !d.iEnheter) feil.push('bølgen ble ikke over som «herjet» (laget skal gå videre bort)');
      rv.trekkerFra = tid - Tr.HERJ.maksMin - 1; Sp.utSteg(); if (ENHETER.includes(rv)) feil.push('røverlaget som trakk seg ut, ble ikke fjernet');
      // … og et røverlag der halvparten er falt eller såret, gir opp og flykter: bølgen er slått tilbake
      const rv3 = nyttLag('Røvere vakt 3', L.x + 300, L.y, 'rød'); rv3.raid = nr + 2; ENHETER.push(rv3); T0.aktiv = nr + 2; rv3.menn = rv3.menn.slice(0, 8); rv3.leder = 0; for (let i = 4; i < 8; i++) rv3.menn[i].hp = 0;
      Sp.angrepSteg(); d.flykter = !!rv3.flykter && T0.aktiv === 0 && !ENHETER.includes(rv3); if (!d.flykter) feil.push('røverlaget med halvparten ute ga ikke opp');
      // PUNKT 2: røvere inne i leiren – et eget lag 500 m unna som står stille, går mot dem, og Leirvakta tar opp våpen
      const rv2 = nyttLag('Røvere vakt 2', L.x + 50, L.y, 'rød'); rv2.raid = nr + 1; ENHETER.push(rv2); T0.aktiv = nr + 1;
      const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.leirvakt && !e.ombord && levende(e) && !Terreng.slattUt(e.menn));
      if (s) { s.x = L.x - 500; s.y = L.y; s.sti = null; s.planlegger = false; delete s.forsvar; delete s.motMål; }
      FS.motSteg(); d.mot = s ? !!s.motMål && Math.abs(Math.hypot(s.motMål.x - rv2.x, s.motMål.y - rv2.y) - Forsvar.R.mot.avstand) < 1 : null; d.vakt = !!FS.vakt();
      if (s && !d.mot) feil.push('laget hjemme gikk ikke mot røverne i leiren'); if (!d.vakt) feil.push('Leirvakta tok ikke opp våpen');
      T0.aktiv = 0; ENHETER.splice(ENHETER.indexOf(rv2), 1); FS.motFerdig(); FS.opphev(false);
      if (s && s.motMål) feil.push('laget gikk ikke tilbake etter røverne');
      // et lag som trakk seg tilbake av seg selv for over 30 min siden og står 1 km unna uten fiender nær, går hjem
      if (s) { s.x = L.x - 1000; s.y = L.y; s.sti = null; s.planlegger = false; s.egetValg = { hva: 'trakk seg tilbake', grunn: 'vakt', t: tid - 31 };
        const nær = ENHETER.some(e => e.side !== 'blå' && levende(e) && Math.hypot(e.x - s.x, e.y - s.y) < Forsvar.R.hjem.fiende);
        FS.hjemSteg(); d.hjem = s.hjemSendt === s.egetValg.t; if (!d.hjem && !nær) feil.push('laget som trakk seg tilbake, gikk ikke hjem'); delete s.egetValg; delete s.hjemSendt; }
      // PUNKT 3: et skadet bygg repareres av ledige byggelag, og skadevarselet etter angrepet har en knapp
      const b = { id: 9e6, type: 'container', x: L.x + 70, y: L.y + 70, ret: 0, igjen: 0, totalt: 30, pris: 5e5, mat: {}, nivå: 1, hp: .5, nr: 0, arbeid: null };
      LS.bygg.push(b); const p1 = OppstartSpill.tilstand().penger;
      FS.etterAngrep(); const al = document.getElementById('alarm'); d.varsel = al.classList.contains('på') && /bygg er skadet/.test(al.textContent) && !!document.getElementById('reparerknapp');
      if (!d.varsel) feil.push('skadevarselet med «Reparer alle» kom ikke');
      FS.repSteg(true); d.reparerer = !!(b.arbeid && b.arbeid.hva === 'reparer'); d.kostet = p1 - OppstartSpill.tilstand().penger;
      if (!d.reparerer) feil.push(`byggelagene reparerte ikke det skadde bygget (${Leir.byggelag(LS)} byggelag, ${Leir.jobber(LS).length} jobber)`);
      FS.lukkSkade();
    } catch (e) { feil.push('kast: ' + e.message); }
    finally {
      // alt tilbake
      for (const e of ENHETER.slice()) if (!før.enheter.includes(e)) ENHETER.splice(ENHETER.indexOf(e), 1);
      for (const [e, x, y, sti, strid, fsv] of før.pos) { e.x = x; e.y = y; e.sti = sti; e.strid = strid; if (fsv) e.forsvar = fsv; else delete e.forsvar; delete e.motMål; delete e.motHerjer; delete e.motTid; e.siktSkitten = true; }
      LS.bygg = LS.bygg.filter(b => før.bygg.some(q => q[0] === b)); for (const [b, hp, arb] of før.bygg) { b.hp = hp; b.arbeid = arb; } LS.nesteJobb = før.nesteJobb;
      Object.assign(LS.lager, før.lager); LS.drivstoff = før.diesel; if (F) { F.mat = før.mat; F.moral = før.moral; F.personer.forEach((p, i) => { if (før.opp[i]) { p.oppgave = før.opp[i][0]; p.helse = før.opp[i][1]; } }); }
      const diff = før.penger - OppstartSpill.tilstand().penger; if (diff > 0) OppstartSpill.gi(diff); else if (diff < 0) OppstartSpill.betal(-diff);
      for (const k of Object.keys(T0)) delete T0[k]; Object.assign(T0, før.T); if (før.lagret === null) localStorage.removeItem('riksbrudd-trussel'); else localStorage.setItem('riksbrudd-trussel', før.lagret);
      Sp.test = før.test[0]; FS.test = før.test[1]; if (FS.lukkSkade) FS.lukkSkade(); if (LeirSpill.lagre) LeirSpill.lagre(); skitten = true;
      d.pengerTilbake = OppstartSpill.tilstand().penger === før.penger; window.__balanseVakt = før.pos;
    }
    return { feil, d };
  });
  // ordrene over er asynkrone: vent til lagene er ferdige med å planlegge, og stopp dem der de sto
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { for (const [e, x, y, sti] of window.__balanseVakt || []) { e.x = x; e.y = y; e.sti = sti; e.siktSkitten = true; } delete window.__balanseVakt; skitten = true; });
  return { ok: !r.feil.length, tekst: r.feil.length ? 'runde 4: ' + r.feil.join('; ') : `runde 4: herjing (bytte ${r.d.bytte}), røvere som gir opp, mot røverne, Leirvakta, hjem igjen, reparasjon og skadevarsel ok`, data: r.d };
}
