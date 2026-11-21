'use strict';
// Vakt for pakka «by» (runde 15): parkeringsplasser og gågater. Dovre-testsiden har ingen husdata, så vakta prøver reglene i siden med
// et oppdiktet område (Parkering.plan, Gagate.*), tegner dem med 2D-funksjonene fra kartflis.js på et eget lerret og sjekker at
// 3D-modulene finnes. Endrer ingenting i spillet.
module.exports = { navn: 'by: parkering og gågater', kjør: async (pg, profil) => {
  const r = await pg.evaluate(() => {
    const ut = { feil: [] }, F = t => ut.feil.push(t);
    if (typeof Parkering === 'undefined' || typeof Gagate === 'undefined') { F('reglene mangler'); return ut; }
    if (!window.Parkering3d || !window.Gagate3d) F('3D-modulene mangler');
    // parkering: plasser i rader, ikke oppå hverandre, inne i omrisset, felt på 6 m, øy og lykter på en stor plass
    const P = [[0, 0], [90, 0], [90, 40], [0, 40]], pl = Parkering.plan(P, { fyll: .5 });
    ut.plasser = pl.plasser.length; ut.biler = pl.biler.length; ut.lykter = pl.lykter.length; ut.øyer = pl.øyer.length;
    if (pl.plasser.length < 60) F('for få plasser: ' + pl.plasser.length);
    let over = 0; for (let i = 0; i < pl.plasser.length; i++) for (let j = i + 1; j < pl.plasser.length; j++) if (Math.hypot(pl.plasser[i].x - pl.plasser[j].x, pl.plasser[i].y - pl.plasser[j].y) < 2.49) over++;
    if (over) F(over + ' plasser oppå hverandre');
    if (pl.plasser.some(p => !Parkering.inni(P, p.x, p.y))) F('plass utenfor området');
    if (!pl.lykter.length || !pl.øyer.length) F('mangler lykter eller øyer');
    if (!(Parkering.fyll(12, true) > Parkering.fyll(2, true))) F('fyllingsgraden følger ikke klokka');
    // gågate: smal gate med husrekker i et tett sentrum
    const rekt = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], hus = [];
    for (let x = -40; x < 240; x += 16) { hus.push(rekt(x, 6, x + 14, 18)); hus.push(rekt(x, -18, x + 14, -6)); for (const y of [40, 60, -40, -60]) hus.push(rekt(x, y, x + 12, y + 10)); }
    const R = Gagate.husRute(hus), Pg = Array.from({ length: 41 }, (_, i) => [i * 5, 0, 0]), m = Gagate.mål(Pg, R), tett = Gagate.tetthet(R, 100, 0);
    ut.gågate = Gagate.erGågate({ k: 'K', by: true, P: Pg }, m, tett); if (!ut.gågate) F('gågaten ble ikke kjent igjen');
    if (Gagate.erGågate({ k: 'F', by: true, P: Pg }, m, tett)) F('fylkesveg ble gågate');
    const b = Gagate.bredder(m, 3), mb = Gagate.møbler(m, b, () => true, true); ut.møbler = Object.fromEntries(Object.entries(mb).map(([k, v]) => [k, v.length]));
    if (Object.values(mb).some(l => l.some(([x, y]) => Math.abs(y) > 5.9))) F('møbler i husveggen');
    // 2D: tegn plassen og gågaten på et eget lerret (kartflis.js-funksjonene) og sjekk at stripene og steinfargen kom med
    if (typeof parkeringNær === 'function' && typeof tegnGågater === 'function') {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#545350'; g.fillRect(0, 0, 256, 256);
      parkeringNær(g, P.map(([x, y]) => [x / .25, y / .25]), .25, 1);
      const d = g.getImageData(0, 0, 256, 256).data; let hvit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 110 && d[i + 1] > 110) hvit++;
      ut.hvitePunkt = hvit; if (hvit < 200) F('stripene på plassen tegnes ikke i 2D');
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); tegnGågater(g, [{ m, b }], .25, 16);
      const e = g.getImageData(100, 4, 1, 1).data; ut.stein = [...e.slice(0, 3)]; if (e[0] < 120) F('gågaten tegnes ikke i 2D');
    } else F('2D-funksjonene mangler');
    if (typeof R3 !== 'undefined' && R3 && R3.ut && window.Gagate3d) ut.i3d = { gågater: Gagate3d.antall(), parkering: Parkering3d.antall() };
    return ut; });
  return { ok: !r.feil.length, tekst: r.feil.length ? r.feil.join('; ') : `parkering ${r.plasser} plasser/${r.biler} biler/${r.lykter} lykter, gågate kjent igjen, møbler ${JSON.stringify(r.møbler)}`, data: r };
} };
