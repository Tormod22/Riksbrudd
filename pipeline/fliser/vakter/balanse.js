// Vakt for pakka «balanse» (natt til 18. nov): reglene for røverbølgene, byttet, startkostnadene og den lette starten.
// Endrer ingenting i spillet (leser bare reglene og tilstanden).
module.exports = {
  navn: 'balanse',
  kjør: async (pg, profil) => pg.evaluate(() => {
    const feil = [], T = window.Trussel, M = window.Marked, LB = window.Leir;
    if (!T || !M || !LB) return { ok: false, tekst: 'Trussel, Marked eller Leir mangler', data: {} };
    // bølgene: aldri flere lag enn dagen og soldatene tilsier
    if (T.lagFor(9, { soldater: 40, dag: 0 }) !== 1) feil.push('første døgn: mer enn ett røverlag');
    if (T.lagFor(9, { soldater: 6, dag: 9 }) !== 1) feil.push('seks soldater: mer enn ett røverlag');
    if (T.lagFor(9, { soldater: 40, dag: 6 }) !== 3) feil.push('dag 7 med 40 soldater: ikke tre lag');
    // byttet dekker skader, ikke mer
    if (!(T.belønning(1) <= 5e5 && T.belønning(40) <= 1.5e6)) feil.push('røverbyttet er for stort');
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
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `bølger, bytte og startkostnader ok (fire bygg + diesel: ${Math.round(kr / 1e5) / 10} mill. kr)`, data: { kr, mat, tunge } };
  }),
};
