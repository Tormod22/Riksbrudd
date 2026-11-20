// Vakt for pakka «leir2d» (runde 7, kritikken 19. nov: «på nær zoom er leiren bare grå bokser»): spill/leir2d.js tegner leirens bygg som
// tak sett ovenfra (form og farge per type, skygge, byggeplass/skade/ruin), over tåka og siktfeltet (f.over i index.html), lagene som folk
// ovenfra på nær zoom, folkene i leiren og feltbilen/helikopteret. Vakten legger inn prøvebygg (ett av hver type og fire tilstander),
// tegner 2D-kartet direkte med tegn() (3D kan være på – da tegnes det skjulte 2D-lerretet), sjekker navnene (Etikett: ingen overlapp
// på 50, 20, 5, 2, 0,5, 0,2 og 0,12 m per punkt, dag og natt) og tida per bilde, og setter alt tilbake: byggene, kameraet, tida,
// kartlyset, valgt lag og Leir2d.av. Lagene og tilfeldighetene (frø) røres ikke.
module.exports = { navn: 'leir2d (leirens bygg ovenfra, figurer og folk på nær zoom i 2D)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(() => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (!window.Leir2d || !window.Leir || !window.LeirSpill || !window.Etikett) return { feil: ['Leir2d/Leir/LeirSpill/Etikett mangler'] };
    const S = OppstartSpill.tilstand(), L = LeirSpill.tilstand(); if (!S || !S.leir || !L) return { feil: ['ingen leir'] };
    const C = S.leir, kam0 = { x: kam.x, y: kam.y, m: kam.m }, tid0 = tid, kl0 = KartLys.test, av0 = Leir2d.av, valgt0 = valgt, neste0 = L.neste, jobb0 = L.nesteJobb, nye = [];
    const mann0 = Leir2d.mann; let menn = 0, sivile = 0;
    try {
      // 1. krokene: byggene over tåka, folkene, feltbilen
      const krok = KROKER.tegn.filter(f => f.over); krev(krok.length >= 2, `for få tegnekroker over tåka (${krok.length})`);
      krev(!!Leir2d.kjørKrok, 'feltbilen/helikopteret er ikke koblet til (kjor.js-kroken ble ikke funnet)');
      // 2. prøvebygg 300 m øst for leiren (fri plass), ett av hver type + byggeplass, kø, skadet og ødelagt
      const X0 = C.x + 300, Y0 = C.y, typer = Object.keys(Leir.BYGG).filter(t => !Leir.BYGG[t].linje && !Leir.BYGG[t].del);
      const ny = (type, dx, dy, o = {}) => { const t = (Leir.BYGG[type].tid || 1) * 60, b = { id: L.neste++, type, x: X0 + dx, y: Y0 + dy, ret: o.ret || 0, igjen: o.p === undefined ? 0 : t * (1 - o.p), totalt: t, pris: 0, mat: {}, nivå: 1, hp: o.hp === undefined ? 1 : o.hp, nr: L.nesteJobb++, arbeid: null, vakt: true };
        L.bygg.push(b); nye.push(b); return b; };
      typer.forEach((t, i) => ny(t, (i % 6) * 32 - 80, Math.floor(i / 6) * 32 - 48, { ret: i * .4 }));
      const bp = ny('brakke', -80, 90, { p: .6 }), kø = ny('brakke', -40, 90, { p: 0 }), sk = ny('sykestue', 0, 90, { hp: .3 }), rn = ny('brakke', 40, 90, { hp: 0 });
      // 3. på et eget lerret: hver type tegnes uten feil, og tilstandene ser forskjellige ut
      const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
      const bilde = (b, m = .1) => { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#2050a0'; g.fillRect(0, 0, 160, 160); Leir2d.ramme(); const ok = Leir2d.bygg(g, { ...b, x: 0, y: 0, ret: 0 }, { sx: X => X / m + 80, sy: Y => 80 - Y / m, m, fraksjon: '#5b7ea8', aktiv: true }); return { ok, d: g.getImageData(0, 0, 160, 160).data }; };
      const ulik = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 16) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; return n; };
      const tom = bilde({ type: '__ingen__' }).d;
      for (const b of nye.slice(0, typer.length)) { let r; try { r = bilde(b); } catch (e) { krev(false, `${b.type}: ${e.message}`); continue; }
        krev(r.ok && ulik(r.d, tom) > 3, `${b.type}: ingenting tegnet`); }
      const ferdig = bilde({ type: 'brakke', igjen: 0, hp: 1 }).d;
      krev(ulik(bilde(bp).d, ferdig) > 20, 'byggeplassen ser lik ut som det ferdige bygget');
      krev(ulik(bilde(kø).d, ferdig) > 20, 'byggeplassen i kø ser lik ut som det ferdige bygget');
      krev(ulik(bilde(rn).d, ferdig) > 20, 'ruinen ser lik ut som det ferdige bygget');
      krev(ulik(bilde(sk).d, bilde({ type: 'sykestue', igjen: 0, hp: 1 }).d) > 5, 'det skadde bygget ser helt ut');
      // kontrollrommets tak er mørkt (svart saltak som i 3D, ikke en lys boks)
      { const d = bilde({ type: 'kontrollrom', igjen: 0, hp: 1 }).d, i = (40 * 160 + 60) * 4; ut.takKontrollrom = [d[i], d[i + 1], d[i + 2]]; krev(d[i] + d[i + 1] + d[i + 2] < 250, `kontrollrommets tak er ikke mørkt (${ut.takKontrollrom})`); }
      // natt (KartLys): mørkere tak og lys i vinduene på bygg med strøm
      KartLys.test = true; tid = Math.floor(tid0 / 1440) * 1440 + 19.5 * 60; const R = Leir2d.ramme(); const natt = bilde({ type: 'brakke', igjen: 0, hp: 1 }).d; KartLys.test = kl0; tid = tid0; Leir2d.ramme();
      { const i = (80 * 160 + 70) * 4; ut.natt = [natt[i] + natt[i + 1] + natt[i + 2], ferdig[i] + ferdig[i + 1] + ferdig[i + 2]]; krev(ut.natt[0] < ut.natt[1] * .85, `taket er ikke mørkere om natta (${ut.natt})`); krev(R.lys > 0, 'ikke lys i vinduene om natta'); }
      // 4. i spillet: tegn() med prøvebyggene gir et annet bilde enn de gamle boksene, og navnene overlapper ikke
      Leir2d.mann = function (g, x, y, r, v, o) { if (o && o.sivil) sivile++; else menn++; return mann0.apply(this, arguments); };
      const les = (x, y, w, h) => { ctx.setTransform(1, 0, 0, 1, 0, 0); return ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), Math.round(w * dpr), Math.round(h * dpr)).data; };
      kam.x = X0; kam.y = Y0; kam.m = .15; Leir2d.av = true; skitten = true; tegn(); const gml = les(VW / 2 - 120, VH / 2 - 120, 240, 240);
      Leir2d.av = false; skitten = true; tegn(); const nyB = les(VW / 2 - 120, VH / 2 - 120, 240, 240);
      krev(ulik(gml, nyB) > 50, 'tegn() bruker ikke den nye tegningen av byggene');
      // tida per bilde ved leiren, med og uten (Leir2d.av)
      const mål = av => { Leir2d.av = av; kam.x = C.x; kam.y = C.y; kam.m = .15; skitten = true; tegn(); const t0 = performance.now(); for (let i = 0; i < 6; i++) { skitten = true; tegn(); } return (performance.now() - t0) / 6; };
      // vekselvis med og uten, og den raskeste av fire runder (maskinen deles med andre: det minste tallet er det riktigste)
      let tG = Infinity, tN = Infinity; for (let k = 0; k < 4; k++) { tG = Math.min(tG, mål(true)); tN = Math.min(tN, mål(false)); } Leir2d.av = false; ut.msPerBilde = { gammel: +tG.toFixed(1), ny: +tN.toFixed(1) };
      krev(tN < tG * 1.5 + 12, `2D-kartet ble tregt med de nye byggene (${tN.toFixed(1)} mot ${tG.toFixed(1)} ms)`);
      // navnene: 50, 20, 5, 2, 0,5, 0,2 og 0,12 m per punkt ved leiren, dag og natt – ingen overlapp, og leirens bygg har navn nær
      ut.navn = {}; const NAVN = Object.values(Leir.BYGG).map(B => B.navn), nærBygg = L.bygg.some(b => !b.vakt && !Leir.BYGG[b.type].linje && !Leir.BYGG[b.type].del && Math.hypot(b.x - C.x, b.y - C.y) < 40);
      for (const natt of [false, true]) { KartLys.test = natt; if (natt) tid = Math.floor(tid0 / 1440) * 1440 + 19.5 * 60;
        for (const m of [50, 20, 5, 2, .5, .2, .12]) { kam.x = C.x; kam.y = C.y; kam.m = m; skitten = true; tegn(); const n = Etikett.tegnet(), o = Etikett.overlapp();
          ut.navn[(natt ? 'natt' : 'dag') + m] = n.length; krev(o === 0, `${o} navn overlapper på ${m} m per punkt${natt ? ' (natt)' : ''}`);
          if (m <= .5 && nærBygg) krev(n.some(q => NAVN.some(v => String(q.t).startsWith(v))), `ingen byggnavn ved leiren på ${m} m per punkt`); }
        KartLys.test = kl0; tid = tid0; }
      // figurene: et eget levende lag i bildet på nær zoom tegnes som folk ovenfra
      const lag = ENHETER.find(s => s.side === 'blå' && !s.karakter && s.menn.some(q => q.hp > 0) && !(KROKER.skjul || []).some(f => f(s)) && !(s.ombord));
      if (lag && !på3d) { menn = 0; kam.x = lag.x; kam.y = lag.y; kam.m = .15; skitten = true; tegn(); krev(menn >= 1, `laget ${lag.navn} ble ikke tegnet som folk (${menn})`); ut.menn = menn; }
      // folkene i leiren (de som arbeider ute)
      sivile = 0; kam.x = C.x; kam.y = C.y; kam.m = .15; skitten = true; tegn(); ut.sivile = sivile;
      const F = window.FolkSpill && FolkSpill.tilstand(); if (F && F.personer && F.personer.some(p => p.oppgave === 'fri' && !p.karantene) && !på3d) krev(sivile >= 1, 'ingen folk i leiren på nær zoom');
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally {
      Leir2d.mann = mann0; for (const b of nye) { const i = L.bygg.indexOf(b); if (i >= 0) L.bygg.splice(i, 1); } L.neste = neste0; L.nesteJobb = jobb0;
      kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; tid = tid0; KartLys.test = kl0; Leir2d.av = av0; valgt = valgt0; Leir2d.ramme(); skitten = true; try { tegn(); } catch (e) { ut.feil.push('tegn etterpå: ' + e.message); }
      krev(!L.bygg.some(b => b.vakt), 'prøvebyggene ble ikke tatt bort');
    }
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? `byggene ovenfra, navn uten overlapp (dag/natt), ${d.msPerBilde ? d.msPerBilde.ny + ' ms per bilde (før ' + d.msPerBilde.gammel + ')' : ''}, ${d.menn || 0} soldater, ${d.sivile || 0} folk` : d.feil.join('; '), data: d };
} };
