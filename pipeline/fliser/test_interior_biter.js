// Interiøret i biter (20. nov natt): Interior.planG steg for steg gir samme plan som Interior.plan, store haller deles i mange steg,
// og nærKant svarer som avstKant < g. (site/dovre-fliser/spill/interior.js)
const I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let f = 11; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
const former = (w, h) => [[[0, 0], [w, 0], [w, h], [0, h]], [[0, 0], [w, 0], [w, h * .55], [w * .6, h * .55], [w * .6, h], [0, h]],
  (() => { const P = []; for (let k = 0; k < 24; k++) { const v = k / 24 * 6.283, r = 1 + .12 * Math.sin(v * 3); P.push([w / 2 + Math.cos(v) * w / 2 * r, h / 2 + Math.sin(v) * h / 2 * r]); } return P; })()];
let n = 0, ulik = 0, stegMaks = 0;
for (const kl of Object.keys(I.KLASSE)) for (let s = 0; s < 6; s++) { const w = 4 + rnd() * (s > 3 ? 90 : 25), h = 4 + rnd() * (s > 3 ? 50 : 16);
  for (const P of former(w, h)) { const a = P[0], b = P[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = .2 + rnd() * .6;
    const info = { i: Math.floor(rnd() * 1e6), kl, h: 4 + rnd() * 10, dør: { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, w: 1 + rnd() * 2 }, senger: kl === 'brakke' ? 8 : 0 };
    const A = JSON.stringify(I.plan(P, info)), it = I.planG(P, info); let r, steg = 0; while (!(r = it.next()).done) steg++;
    n++; if (JSON.stringify(r.value) !== A) ulik++; stegMaks = Math.max(stegMaks, steg); } }
ok(ulik === 0, `planG steg for steg = plan for ${n} bygg (${ulik} ulike)`);
ok(stegMaks > 30, `de største byggene deles i mange steg (høyst ${stegMaks})`);
// en stor lagerhall: rutenettet gir yield underveis
{ const P = [[0, 0], [80, 0], [80, 40], [0, 40]], it = I.planG(P, { i: 77, kl: 'lager', h: 9, dør: { x: 40, y: 0, ux: 1, uy: 0, w: 3 } }); const navn = new Set(); let r, k = 0; while (!(r = it.next()).done) { navn.add(r.value); k++; }
  ok(navn.has('rutenett') && navn.has('rom') && k > 5, `lagerhall 80 × 40 m: ${k} steg (${[...navn].join(', ')})`); ok(r.value.møbler.length > 10, 'lagerhallen har møbler (' + r.value.møbler.length + ')'); }
// nærKant = avstKant < g
{ let ulikK = 0, sanne = 0; const P = [[0, 0], [10, 0], [10, 3], [4, 3], [4, 8], [0, 8]];
  for (let k = 0; k < 20000; k++) { const x = rnd() * 14 - 2, y = rnd() * 12 - 2, g = rnd() * .6, a = I.avstKant(P, x, y) < g, b = I.nærKant(P, x, y, g); if (a !== b) ulikK++; if (a) sanne++; }
  ok(ulikK === 0 && sanne > 100, `nærKant svarer som avstKant < g (${ulikK} ulike, ${sanne} sanne)`); }
// inniR / nærKantR (rutenettet på omrisset) = inni / nærKant for store omriss med mange hjørner, også rett ved kantene
{ let ulikI = 0, ulikK = 0, inne = 0;
  for (let h = 0; h < 30; h++) { const n = 12 + Math.floor(rnd() * 140), w = 10 + rnd() * 120, hh = 8 + rnd() * 70, P = [];
    for (let q = 0; q < n; q++) { const v = q / n * 6.283, r = 1 + .25 * Math.sin(v * (2 + h % 5)) * rnd(); P.push([w / 2 + Math.cos(v) * w / 2 * r, hh / 2 + Math.sin(v) * hh / 2 * r]); }
    for (let k = 0; k < 6000; k++) { let x, y; if (k % 3 === 0) { const e = Math.floor(rnd() * n), a = P[e], b = P[(e + 1) % n], t = rnd(), d = (rnd() - .5) * .5; x = a[0] + (b[0] - a[0]) * t + d; y = a[1] + (b[1] - a[1]) * t - d; }
      else { x = -5 + rnd() * (w * 1.4 + 10); y = -5 + rnd() * (hh * 1.4 + 10); }
      const a = I.inni(P, x, y); if (a !== I.inniR(P, x, y)) ulikI++; if (a) inne++; for (const g of [.05, .1, .15, .3]) if (I.nærKant(P, x, y, g) !== I.nærKantR(P, x, y, g)) ulikK++; } }
  ok(ulikI === 0 && ulikK === 0 && inne > 1000, `inniR = inni og nærKantR = nærKant for 180 000 punkter i 30 store omriss (${ulikI} / ${ulikK} ulike, ${inne} inne)`); }
// selvtest: en endret plan blir sett av sammenligningen
{ const P = [[0, 0], [10, 0], [10, 8], [0, 8]], info = { i: 42, kl: 'hus', h: 6, dør: { x: 5, y: 0, ux: 1, uy: 0, w: 1 } }, A = I.plan(P, info), B = I.plan(P, info); B.møbler[0].x += .01;
  ok(JSON.stringify(A) !== JSON.stringify(B), 'selvtest: et flyttet møbel blir sett'); }
console.log(feil ? feil + ' FEIL' : 'alle testene for interiøret i biter ok'); process.exit(feil ? 1 : 0);
