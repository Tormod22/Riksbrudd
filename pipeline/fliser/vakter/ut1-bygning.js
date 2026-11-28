'use strict';
// VAKT for pakka «bygning» (fase B0 i docs/plan-selskap-okonomi.md: én modell for alle bygg). Ingenting vises på skjermen ennå,
// så vakta prøver bare reglene i siden: Bygning finnes (lastet rett etter interior.js), fraKart gir riktig antall etasjer for prøvehus
// (hus 9 m med saltak = to etasjer og loft, bygård 18 m flatt = seks, høyhus 60 m = 22 der bare 1–6 og den øverste har innhold),
// alle rom nås, samme hus gir samme modell, interior.js er uendret etterpå, og en endring (riv en yttervegg) gir ras og materialer.
// Selvtest: en modell der en dør er murt igjen med vilje, skal gi rom som ikke nås. Endrer ingenting i spillet.
module.exports = {
  navn: 'byggemodellen (etasjer, vegger, trapper, ras)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(() => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, B = window.Bygning, I = window.Interior;
      ok(B && B.fraKart && B.endre && B.medEndringer && B.fraByggesett, 'window.Bygning mangler (skal lastes rett etter interior.js)');
      if (!B || !B.fraKart) return ut;
      const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], t0 = performance.now();
      const hus = B.fraKart(rekt(10, 8), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' }), by = B.fraKart(rekt(24, 13), { i: 5, kl: 'leil', h: 18, tak: 'flatt' }), høy = B.fraKart(rekt(20, 14), { i: 9, kl: 'leil', h: 60, tak: 'flatt' });
      ut.ms = Math.round((performance.now() - t0) / 3);
      const th = B.telle(hus), tb = B.telle(by), åpne = høy.etasjer.filter(e => !e.stengt && !e.kjeller).map(e => e.n).join(',');
      ut.etasjer = [th.etasjer + (th.loft ? '+loft' : ''), tb.etasjer, B.telle(høy).etasjer + ' (' + åpne + ')'];
      ok(th.etasjer === 2 && th.loft, 'hus 9 m med saltak skal ha to etasjer og loft: ' + ut.etasjer[0]);
      ok(tb.etasjer === 6, 'bygård 18 m skal ha seks etasjer: ' + tb.etasjer);
      ok(B.telle(høy).etasjer === 22 && åpne === '1,2,3,4,5,6,22', 'høyhus 60 m: ' + ut.etasjer[2]);
      for (const m of [hus, by]) for (const q of B.nås(m)) ok(!q.uten.length, m.kl + ' etasje ' + q.n + ': ' + q.uten.length + ' rom nås ikke');
      ok(JSON.stringify(B.fraKart(rekt(10, 8), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' })) === JSON.stringify(hus), 'samme hus gir ikke samme modell');
      ok(I && I.TYPER.hus.romsett === 'bolig' && !I.ROMSETT.bygning_oppe, 'interior.js er endret etter fraKart');
      // en endring: riv en yttervegg i 1. etasje -> veggen over raser, materialer
      const m = B.kopi(hus), e1 = m.etasjer.find(e => e.n === 1), s = B.endre(m, { e: 1, del: 'vegg', id: e1.vegger.find(w => w.type === 'ytter').id, gjør: 'riv' });
      ut.ras = s.ras.length; ok(s.ok && s.ras.some(q => q.e === 2) && s.materialer.tre > 0, 'riving av en yttervegg ga ikke ras/materialer: ' + JSON.stringify(s).slice(0, 120));
      ok(JSON.stringify(Object.assign(B.medEndringer(hus, m.endringer), { svar: undefined })) === JSON.stringify(Object.assign(B.kopi(m), { svar: undefined })), 'medEndringer gir ikke samme bygg');
      // selvtest: mur igjen dørene i skilleveggene i 1. etasje -> noen rom nås ikke
      const feilM = B.kopi(hus), f1 = feilM.etasjer.find(e => e.n === 1); f1.åpninger = f1.åpninger.filter(o => o.type !== 'dør' || f1.vegger[o.vegg].type === 'ytter');
      ut.selvtest = B.nås(feilM).find(q => q.n === 1).uten.length; ok(ut.selvtest > 0, 'selvtesten fant ikke rommene bak de igjenmurte dørene');
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : 'etasjer ' + (r.etasjer || []).join(' / ') + ', ' + r.ms + ' ms per hus, ras ved riving: ' + r.ras + ' deler, selvtest: ' + r.selvtest + ' rom uten vei', data: r };
  },
};
