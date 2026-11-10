// Test av spill/dyr.js: hvor dyrene kan være, flokkene står fast per blokk, flokken holder sammen, går ikke i vann, og flykter.
const Dyr = require('../../site/dovre-fliser/spill/dyr.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const s = (o) => ({ moh: 1200, klasse: 2, årstid: 'sommer', x: 195000, y: 6895000, kant: false, gård: false, ...o });
ok(Dyr.kanVære('sau', s({})), 'sau på heia 1200 moh. om sommeren');
ok(!Dyr.kanVære('sau', s({ årstid: 'vinter' })), 'ingen sau om vinteren');
ok(!Dyr.kanVære('sau', s({ moh: 1500 })), 'ingen sau over 1400 moh.');
ok(!Dyr.kanVære('sau', s({ klasse: 1 })), 'ingen sau i skogen');
ok(!Dyr.kanVære('sau', s({ klasse: 3 })), 'ingen sau i vann');
ok(!Dyr.kanVære('sau', s({ klasse: 5, moh: 650 })) && Dyr.kanVære('sau', s({ klasse: 5, moh: 650, gård: true })), 'sau på innmark bare nær gården');
ok(Dyr.kanVære('ku', s({ klasse: 5, moh: 650, gård: true })) && !Dyr.kanVære('ku', s({ klasse: 5, moh: 650, gård: true, årstid: 'høst' })), 'ku på innmark om sommeren, ikke om høsten');
ok(!Dyr.kanVære('rein', s({ moh: 900 })) && Dyr.kanVære('rein', s({ moh: 1400, årstid: 'vinter' })) && Dyr.kanVære('rein', s({ moh: 1600, klasse: 4 })), 'rein på høyfjellet året rundt (ikke under 1100 moh.)');
ok(Dyr.kanVære('moskus', s({ x: 205000, y: 6921000, moh: 1300 })) && !Dyr.kanVære('moskus', s({ x: 190000, y: 6895000, moh: 1300 })), 'moskus ved Snøhetta, ikke ved Dombås');
ok(!Dyr.kanVære('moskus', s({ x: 205000, y: 6921000, moh: 1300, klasse: 4 })), 'moskus ikke på snøen');
ok(Dyr.kanVære('elg', s({ klasse: 1, moh: 700, kant: true })) && !Dyr.kanVære('elg', s({ klasse: 1, moh: 700 })), 'elg i skogkanten');
// faste flokker per blokk
const a = Dyr.flokkIBlokk('sau', 650, 22983), b = Dyr.flokkIBlokk('sau', 650, 22983);
ok(JSON.stringify(a) === JSON.stringify(b), 'samme flokk i samme blokk');
let n = 0; const str = []; for (let i = 0; i < 2000; i++) { const f = Dyr.flokkIBlokk('sau', i, 7); if (f) { n++; str.push(f.n); } }
ok(n > 450 && n < 750, `andel blokker med sauer ca. 30 % (${(n / 20).toFixed(1)} %)`);
ok(Math.min(...str) >= 5 && Math.max(...str) <= 30, `flokkene har 5–30 sauer (${Math.min(...str)}–${Math.max(...str)})`);
ok(Dyr.blokker('rein', [0, 0, 2199, 1099]).length === 2, 'blokkene dekker området');
// flokken holder sammen, og ingen går ut i vannet (en innsjø: x > 80)
const rnd = Dyr.tilfeldig(7), lovlig = (x, y) => x < 80;
const F = Dyr.nyFlokk('sau', 0, 0, 20, rnd, lovlig);
let iVann = 0, maksUt = 0, beite = 0, tell = 0;
for (let t = 0; t < 3000; t++) { Dyr.steg(F, .2, rnd, { lovlig });
  for (const d of F.dyr) { if (d.x >= 80) iVann++; maksUt = Math.max(maksUt, Math.hypot(d.x - F.x, d.y - F.y)); if (d.t === 'beite') beite++; tell++; } }
ok(F.dyr.length === 20, 'alle 20 sauene er med');
ok(iVann === 0, 'ingen sau gikk ut i vannet');
ok(maksUt < 60, `flokken holder sammen (lengst fra midten ${maksUt.toFixed(0)} m)`);
ok(beite / tell > .45, `sauene beiter mesteparten av tiden (${Math.round(beite / tell * 100)} %)`);
ok(Math.hypot(F.x, F.y) < Dyr.ARTER.sau.vandre + 40, `flokken blir i området (${Math.hypot(F.x, F.y).toFixed(0)} m fra start)`);
// flukt: en person 15 m unna -> sauene løper og kommer lenger unna
const F2 = Dyr.nyFlokk('sau', 0, 0, 10, rnd), p = [F2.x + 15, F2.y];
const d0 = Math.hypot(F2.x - p[0], F2.y - p[1]); let løp = false;
for (let t = 0; t < 40; t++) { Dyr.steg(F2, .1, rnd, { fare: [p] }); if (F2.dyr.every(d => d.t === 'løp')) løp = true; }
ok(løp, 'sauene løper når noen kommer nær');
ok(Math.hypot(F2.x - p[0], F2.y - p[1]) > d0 + 5, `sauene kom lenger unna (${d0.toFixed(0)} -> ${Math.hypot(F2.x - p[0], F2.y - p[1]).toFixed(0)} m)`);
const F3 = Dyr.nyFlokk('rein', 0, 0, 30, rnd); let r = false; for (let t = 0; t < 10; t++) { Dyr.steg(F3, .1, rnd, { fare: [[150, 0]] }); r = r || F3.redd > 0; }
ok(r, 'reinen flykter allerede på 150 m');
const F4 = Dyr.nyFlokk('sau', 0, 0, 10, rnd); for (let t = 0; t < 10; t++) Dyr.steg(F4, .1, rnd, { fare: [[200, 0]] });
ok(F4.redd <= 0, 'sauene bryr seg ikke om noen 200 m unna');
const F5 = Dyr.nyFlokk('sau', 0, 0, 10, rnd); for (let t = 0; t < 10; t++) Dyr.steg(F5, .1, rnd, { fare: [[30, 0, .5]] });
ok(F5.redd <= 0, 'på huk kan du gå nærmere (30 m)');
const F6 = Dyr.nyFlokk('sau', 0, 0, 10, rnd); for (let t = 0; t < 10; t++) Dyr.steg(F6, .1, rnd, { skudd: [[250, 0]] });
ok(F6.redd > 0, 'skudd 250 m unna skremmer sauene');
console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
