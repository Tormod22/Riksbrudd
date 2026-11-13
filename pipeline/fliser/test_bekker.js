// Test av bekkereglene (site/dovre-fliser/spill/bekker.js) og datafila (site/dovre-fliser/data/bekker.json).
// Bruk: node pipeline/fliser/test_bekker.js
const fs = require('fs'), path = require('path');
const Bekker = require('../../site/dovre-fliser/spill/bekker.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// les: delta-koding tilbake til meter
const B0 = Bekker.les({ x0: 1000, y0: 2000, linjer: [[0, 2, 0, 10, 20, 5, 0, 0, 5], [1, 5, -1, 4000, 4000, 100, 0]], navn: ['Testbekken'] });
ok(B0.linjer.length === 2, 'to linjer lest');
ok(JSON.stringify(B0.linjer[0].P) === '[[1010,2020],[1015,2020],[1015,2025]]', 'punktene stemmer');
ok(B0.linjer[0].navn === 'Testbekken' && B0.linjer[1].navn === null, 'navn');
ok(Bekker.i(B0, [1000, 2000, 1100, 2100]).length === 1 && Bekker.i(B0, [4900, 5900, 5200, 6100]).length === 1, 'oppslag i område');
ok(Bekker.i(B0, [0, 0, 500, 500]).length === 0, 'ingen utenfor');
// bredde: større orden bredere, brede elver bredere enn bekker
ok(Bekker.bredde({ type: 0, orden: 1 }) < Bekker.bredde({ type: 0, orden: 3 }) && Bekker.bredde({ type: 0, orden: 3 }) < Bekker.bredde({ type: 1, orden: 3 }), 'bredde etter orden');
ok(Bekker.bredde({ type: 0, orden: 1 }) >= .5 && Bekker.bredde({ type: 0, orden: 4 }) <= 3.5, 'bekk 0,5–3 m');
// punkter: tettere enn steg
const P = Bekker.punkter([[0, 0], [10, 0]], 2); ok(P.length === 6 && P[5][0] === 10, 'punkt hver 2 m');
// fall og skum: flat bekk uten skum, bratt med skum
const flat = Bekker.fall([[0, 0, 0], [2, 0, 0], [4, 0, .02], [6, 0, .04]]), bratt = Bekker.fall([[0, 0, 0], [2, 0, -.8], [4, 0, -1.6], [6, 0, -2.4]]);
ok(Bekker.skum(flat[1]) === 0, 'flat: ingen skum'); ok(Bekker.skum(bratt[1]) > .9, 'bratt (40 %): skum');
ok(Math.abs(Bekker.avstand([[0, 0], [10, 0]], 5, 3) - 3) < 1e-9, 'avstand til linjen');

// klipp: linjen deles der testen slår til (kulvert, elv som alt er vannflate i kartet); korte stumper tas bort
{ const L = [[0, 0], [100, 0]], iVann = (x, y) => x > 30 && x < 60 || x > 66 && x < 90;
  ok(Bekker.klipp(L, () => false) === null, 'klipp: ingenting kuttet gir null');
  const k = Bekker.klipp(L, iVann, 2); ok(k.length === 3 && k[0][k[0].length - 1][0] === 30 && k[1][0][0] === 60 && k[2][0][0] === 90, 'klipp: bitene utenfor vannet står igjen');
  ok(k.every(b => b.every(([x, y]) => !iVann(x, y))), 'klipp: ingen punkter i vannet');
  const k2 = Bekker.klipp(L, iVann, 2, 8); ok(k2.length === 2 && k2[1][0][0] === 90, 'klipp: stumpen på 6 m mellom to vannflater tas bort');
  ok(Bekker.klipp(L, () => true).length === 0, 'klipp: hele linjen i vannet gir ingen biter'); }
// nettHøyde: samme trekanter som PlaneGeometry (a-b-d og b-c-d) i et nett som er tett i midten
{ const M = 5, A = .5, S = 100, g = t => t * (A + (1 - A) * t * t), z = [];
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { const x = S * g(-1 + 2 * i / (M - 1)), y = S * g(1 - 2 * j / (M - 1)); z.push(x, y, 2 * x - 3 * y + 7); }
  let maks = 0; for (let k = 0; k < 300; k++) { const x = Math.sin(k) * 99, y = Math.cos(k * 1.7) * 99; maks = Math.max(maks, Math.abs(Bekker.nettHøyde(z, M, A, S, x, y) - (2 * x - 3 * y + 7))); }
  ok(maks < 1e-6, 'nettHøyde: plan flate gjengis eksakt i det skjeve nettet');
  // en topp i punkt c (i = 1, j = 1 i ruta (0, 0)): bare trekanten b-c-d (nede til høyre) løftes
  const z2 = z.map((v, n) => (n % 3 === 2 ? 0 : v)); z2[(1 * M + 1) * 3 + 2] = 10;
  const xm = (S * g(-1) + S * g(-.5)) / 2, ym = (S * g(1) + S * g(.5)) / 2, dx = (S * g(-.5) - S * g(-1)) * .3, dy = (S * g(1) - S * g(.5)) * .3;
  ok(Bekker.nettHøyde(z2, M, A, S, xm - dx, ym + dy) === 0 && Bekker.nettHøyde(z2, M, A, S, xm + dx, ym - dy) > 0, 'nettHøyde: diagonalen deler ruta som i three.js'); }
// datafila
const fil = path.join(__dirname, '..', '..', 'site', 'dovre-fliser', 'data', 'bekker.json');
ok(fs.statSync(fil).size < 2e6, 'datafila under 2 MB (' + (fs.statSync(fil).size / 1e6).toFixed(2) + ' MB)');
const d = JSON.parse(fs.readFileSync(fil)), B = Bekker.les(d);
ok(B.linjer.length > 1000, B.linjer.length + ' bekker og elver');
ok(B.linjer.every(l => l.P.every(([x, y]) => x >= 182016 && x <= 228000 && y >= 6880000 && y <= 6930016)), 'alle innenfor Dovre-området');
ok(B.linjer.some(l => l.type === 1 && l.orden >= 5), 'brede elver (Lågen) er med');
// kulvert: ingen små bekker midt i en veg (data/fliser/veger.json)
const veger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'fliser', 'veger.json'))), BR = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 };
const rute = new Map(); for (const v of veger) for (const [x, y] of v.p) { const k = Math.floor(x / 50) + ',' + Math.floor(y / 50); if (!rute.has(k)) rute.set(k, new Set()); rute.get(k).add(v); }
let iVeg = 0, sjekket = 0;
for (const l of B.linjer) { if (l.type !== 0 || l.orden > 3) continue;
  for (const [x, y] of Bekker.punkter(l.P, 1)) { sjekket++;
    for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const v of rute.get((Math.floor(x / 50) + a) + ',' + (Math.floor(y / 50) + c)) || [])
      if (Bekker.avstand(v.p, x, y) < BR[v.c] / 2 - .3) { iVeg++; break; } } }
ok(iVeg / sjekket < .001, `kulvert: ${iVeg} av ${sjekket} bekkepunkt ligger i vegbanen`);
console.log(feil ? feil + ' feil' : 'alle bekketester ok'); process.exit(feil ? 1 : 0);
