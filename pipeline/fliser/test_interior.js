// Interiør: romplan, døråpninger, møbler og kollisjon (site/dovre-fliser/spill/interior.js)
const I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const dør = (P, k, f, w) => { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, w }; };
// alle rom kan nås fra inngangen: flom i et rutenett på 0,25 m der blokkert() er falsk
function nås(pl) {
  const [x0, y0, x1, y1] = pl.bb, s = .2, W = Math.ceil((x1 - x0) / s) + 2, H = Math.ceil((y1 - y0) / s) + 2, sett = new Uint8Array(W * H), kø = [];
  const fri = (i, j) => { const x = x0 + (i - .5) * s, y = y0 + (j - .5) * s; return I.inni(pl.P, x, y) && !I.blokkert(pl, x, y); };
  const i0 = Math.round((pl.inngang.inn[0] - x0) / s + .5), j0 = Math.round((pl.inngang.inn[1] - y0) / s + .5); kø.push([i0, j0]); sett[j0 * W + i0] = 1;
  while (kø.length) { const [i, j] = kø.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const p = i + a, q = j + b; if (p < 0 || q < 0 || p >= W || q >= H || sett[q * W + p] || !fri(p, q)) continue; sett[q * W + p] = 1; kø.push([p, q]); } }
  // hvert rom som ligger inne i omrisset: midten (eller et punkt nær den) er nådd
  let rom = 0, nådd = 0;
  for (const r of pl.rom) { if (r.andel < .5) continue; rom++; const a = pl.akse; let fant = false;
    for (let k = 0; k < 400 && !fant; k++) { const u = r.u0 + (r.u1 - r.u0) * ((k % 20) + .5) / 20, v = r.v0 + (r.v1 - r.v0) * (Math.floor(k / 20) + .5) / 20, x = u * a.ux + v * a.vx, y = u * a.uy + v * a.vy;
      const i = Math.round((x - x0) / s + .5), j = Math.round((y - y0) / s + .5); if (i >= 0 && j >= 0 && i < W && j < H && sett[j * W + i]) fant = true; }
    if (fant) nådd++; }
  return { rom, nådd };
}
// enebolig 10 × 8 m
{ const P = rekt(10, 8), pl = I.plan(P, { i: 42, kl: 'hus', h: 6, dør: dør(P, 0, .5, 1) }), n = nås(pl), roller = pl.rom.map(r => r.rolle);
  ok(pl.rom.length >= 4 && pl.rom.length <= 9, 'hus 80 m²: ' + pl.rom.length + ' rom (' + roller.join(', ') + ')');
  ok(roller.includes('stue') && roller.includes('kjøkken') && roller.includes('soverom') && roller.includes('bad'), 'hus: stue, kjøkken, soverom og bad');
  ok(n.rom === n.nådd, 'hus: alle ' + n.rom + ' rom kan nås fra inngangen (' + n.nådd + ')');
  ok(pl.møbler.some(m => m.type === 'sofa') && pl.møbler.some(m => /seng/.test(m.type)) && pl.møbler.some(m => m.type === 'kjøkkenbenk') && pl.møbler.some(m => m.type === 'toalett'), 'hus: sofa, seng, kjøkkenbenk og toalett (' + pl.møbler.length + ' møbler)');
  ok(pl.møbler.every(m => I.inni(P, m.x, m.y)), 'hus: alle møblene står inne');
  // inngangen: fri rett i døra, vegg ved siden av
  ok(!I.blokkert(pl, 5, 0) && !I.blokkert(pl, 5, -.5) && !I.blokkert(pl, 5, .6) && I.blokkert(pl, 7.5, 0) && I.blokkert(pl, 0, 4) && !I.blokkert(pl, -1, 4), 'hus: døra er åpen, ytterveggene sperrer, ute er fritt');
  const pl2 = I.plan(P, { i: 42, kl: 'hus', h: 6, dør: dør(P, 0, .5, 1) }); ok(JSON.stringify(pl2.møbler) === JSON.stringify(pl.møbler) && JSON.stringify(pl2.vegger) === JSON.stringify(pl.vegger), 'samme bygg gir samme plan');
  pl.gulv = 100.3; ok(I.høyde(pl, 5, 4, () => 100) === 100.3 && Math.abs(I.høyde(pl, 5, -.75, () => 100) - 100.15) < 1e-9 && I.høyde(pl, 5, -3, () => 100) === null && I.høyde(pl, 9, -.75, () => 100) === null, 'gulvet inne, trapp foran døra, terreng ellers');
}
// mange bygg av alle slag og former: alle rom nås, ingen møbler i vegger eller døråpninger
{ const former = { rekt: (w, h) => rekt(w, h), L: (w, h) => [[0, 0], [w, 0], [w, h * .5], [w * .5, h * .5], [w * .5, h], [0, h]], skjev: (w, h) => [[0, 0], [w, 1.5], [w - 1, h + 1], [-1, h - .5]] };
  let bygg = 0, unådd = 0, iVegg = 0, iDør = 0, møbler = 0, uten = 0; const tomme = [];
  for (const kl of Object.keys(I.KLASSE)) for (const [fn, f] of Object.entries(former)) for (let k = 0; k < 12; k++) {
    const stor = /industri|lager|hangar|terminal|skole|sykehus|kirke/.test(kl), w = (stor ? 16 : 5) + (k * 3.7) % (stor ? 40 : 12), h = (stor ? 12 : 4) + (k * 2.3) % (stor ? 22 : 8), P0 = f(w, h), v = k * .37;
    const P = P0.map(([x, y]) => [x * Math.cos(v) - y * Math.sin(v) + 50, x * Math.sin(v) + y * Math.cos(v) - 20]);
    const pl = I.plan(P, { i: 1000 + bygg * 17, kl, h: 4 + k, dør: dør(P, 0, .38, kl === 'uthus' ? 2.6 : 1.2) }), n = nås(pl); bygg++; if (n.rom !== n.nådd) { unådd++; if (process.env.VIS) { const m = pl.møbler; pl.møbler = []; const n2 = nås(pl); pl.møbler = m; console.log('  ', kl, fn, w.toFixed(1), h.toFixed(1), 'rom', n.rom, 'nådd', n.nådd, 'uten møbler nådd', n2.nådd); } }
    møbler += pl.møbler.length; if (!pl.møbler.length) { uten++; tomme.push(kl + '/' + fn + ' ' + w.toFixed(0) + '×' + h.toFixed(0)); }
    for (const m of pl.møbler) { const c = Math.cos(m.a), s = Math.sin(m.a);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = m.x + a * m.b / 2 * .9 * c - b * m.d / 2 * .9 * s, y = m.y + a * m.b / 2 * .9 * s + b * m.d / 2 * .9 * c;
        if (!I.inni(P, x, y) || pl.vegger.some(g => I.avstSeg(x, y, g.ax, g.ay, g.bx, g.by) < .02)) { iVegg++; break; } }
      if (m.sperrer && pl.dører.some(d => Math.hypot(d[0] - m.x, d[1] - m.y) < .35)) iDør++; }
    if (I.blokkert(pl, pl.inngang.inn[0], pl.inngang.inn[1])) iDør++;
  }
  ok(unådd === 0, bygg + ' bygg av ' + Object.keys(I.KLASSE).length + ' slag og tre former: alle rom kan nås (' + unådd + ' bygg med rom som ikke nås)');
  ok(iVegg === 0, 'ingen møbler gjennom vegger eller utenfor (' + iVegg + ')');
  ok(iDør === 0, 'ingen møbler i døråpningene eller rett innenfor inngangen (' + iDør + ')');
  ok(uten <= bygg * .05, møbler + ' møbler i alt; ' + uten + ' bygg uten møbler ' + tomme.slice(0, 6).join(', '));
}
console.log(feil ? feil + ' FEIL' : 'alle interiørtestene ok'); process.exit(feil ? 1 : 0);
