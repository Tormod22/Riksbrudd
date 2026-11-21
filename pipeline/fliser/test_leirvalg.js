// Test for spill/leirvalg.js (runde 6): node pipeline/fliser/test_leirvalg.js
const L = require('../../site/dovre-fliser/spill/leirvalg.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
// et vindu på 200 × 200 ruter à 32 m rundt (3200, 3200); fyll(i, j) -> [klasse, høyde, veg]
const vindu = fyll => { const w = 200, h = 200, v = { x0: 0, y0: 6400, r: 32, w, h, H: new Float32Array(w * h), K: new Uint8Array(w * h), V: new Uint8Array(w * h) };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const [k, z, g] = fyll(i, j); v.K[j * w + i] = k; v.H[j * w + i] = z; v.V[j * w + i] = g || 0; } return v; };
// snaufjell overalt, ingen veg (tilfellet fra kritikken: 1575 moh. på Dovre)
const fjell = L.måle(vindu(() => [0, 1575]), 3200, 3200);
ok(fjell.land > 0 && fjell.skog === 0 && fjell.vegM === Infinity && !fjell.sjø, 'snaufjell: ingen skog, ingen veg, ikke sjø');
const vf = L.vurder(fjell, { h: 1575, tregrense: 1100, by: { navn: 'Dombås', m: 9000 } });
ok(vf.advarsler.length === 2 && /Høyfjell/.test(vf.advarsler[0]) && /ingen skog/.test(vf.advarsler[0]) && /Ingen veg/.test(vf.advarsler[1]), 'snaufjell gir høyfjell (uten skog) og ingen veg: ' + vf.advarsler.join(' | '));
// skog i dalen med veg 300 m unna
const dal = L.måle(vindu((i, j) => [i % 2 ? 1 : 5, 500, i === 110 ? 2 : 0]), 3200, 3200);
ok(Math.abs(dal.skog - .5) < .02 && Math.abs(dal.vegM - 304) < 40, `dalen: halvparten skog (${dal.skog.toFixed(2)}), veg ${Math.round(dal.vegM)} m unna`);
const vd = L.vurder(dal, { h: 500, tregrense: 1100, by: { navn: 'Dombås', m: 4000 } });
ok(vd.advarsler.length === 0 && vd.fakta.join(' · ') === 'skog: mye · veg 340 m unna · Dombås 4,0 km', 'godt sted: ingen advarsler, fakta: ' + vd.fakta.join(' · '));
// langt til veg og langt til folk, nesten ingen skog under tregrensen
const myr = L.måle(vindu((i, j) => [6, 600, i === 199 && j === 100 ? 1 : 0]), 3200, 3200);
const vm = L.vurder(myr, { h: 600, tregrense: 1100, by: { navn: 'Dombås', m: 26000 } });
ok(vm.advarsler.length === 3 && /Nesten ingen skog/.test(vm.advarsler[0]) && /3,2 km til nærmeste veg|Ingen veg/.test(vm.advarsler[1]) && /26 km/.test(vm.advarsler[2]), 'myr: ingen skog, langt til veg og folk: ' + vm.advarsler.join(' | '));
// sjø: vann under 3 moh. i nærheten
const kyst = L.måle(vindu(i => (i < 60 ? [3, 0] : [1, 20])), 3200, 3200), innsjø = L.måle(vindu(i => (i < 60 ? [3, 900] : [1, 920])), 3200, 3200);
ok(kyst.sjø && !innsjø.sjø, 'sjø ved kysten, ikke ved en fjellsjø i 900 moh.');
// kaiteksten
ok(L.kaiTekst('Ingen kai innen 10 km – leiren får ingen båter.', false) === '', 'ingen kai og ingen sjø: ingenting sies (Dovre)');
ok(/båter/.test(L.kaiTekst('Ingen kai innen 10 km – leiren får ingen båter.', true)), 'ingen kai, men sjø i nærheten: sies');
ok(/båter, fiske og varer sjøveien/.test(L.kaiTekst('Nærmeste kai: liten (3,9 km) – for langt til å være leirens kai (over 3 km).', true)), 'kaia for langt unna: forklarer hva en kai er godt for');
ok(L.kaiTekst('Nærmeste kai: stor (1,2 km) – leirens egen kai: lasteskip.', true) === 'Nærmeste kai: stor (1,2 km) – leirens egen kai: lasteskip.', 'leirens egen kai: uendret');
ok(L.måle(null, 0, 0).land === 0 && L.vurder(L.måle(null, 0, 0), {}).advarsler.length === 1, 'uten vindu: bare «ingen veg» (ingen feil)');
// (runde 13) over tregrensen med skog nede i dalen: aldri «skog: mye» sammen med «over tregrensen»
{ const dal = L.måle(vindu(i => (i < 120 ? [1, 300] : [0, 1200])), 3200, 3200), v = L.vurder(dal, { h: 1207, tregrense: 1000 }), alt = v.advarsler.concat(v.fakta).join(' · ');
  ok(dal.skog >= L.REGLER.skogMye && /over tregrensen/.test(alt) && !/skog: mye/.test(alt) && /skog: bare nede i dalen/.test(alt), 'over tregrensen, skog i dalen: ' + alt);
  const tom = L.vurder(L.måle(vindu(() => [0, 1300]), 3200, 3200), { h: 1300, tregrense: 1000 }); ok(!tom.fakta.some(f => /^skog/.test(f)) && /ingen skog å hogge/.test(tom.advarsler[0]), 'snaufjell uten skog: bare advarselen'); }
process.exit(feil ? 1 : 0);
