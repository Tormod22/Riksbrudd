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
  }),
};
