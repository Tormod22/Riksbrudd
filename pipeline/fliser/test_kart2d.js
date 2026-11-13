// Test av reglene for 2D-kartet (site/dovre-fliser/spill/kart2d.js): målestokk, navnepunkt for tettsteder og åpningsbildet.
// Bruk: node pipeline/fliser/test_kart2d.js
const K = require('../../site/dovre-fliser/spill/kart2d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// målestokken: alltid minst 70 punkter lang, også når hele landet vises (før: «20 km» på 13 punkter ved 1500 m per punkt)
ok(K.skalaMål(1500) === 200000 && K.skalaTekst(K.skalaMål(1500)) === '200 km', 'hele Norge (1500 m per punkt): 200 km');
ok(K.skalaMål(3) === 500 && K.skalaTekst(500) === '500 m' && K.skalaMål(40) === 5000 && K.skalaTekst(5000) === '5 km', '3 m per punkt: 500 m, 40 m per punkt: 5 km');
{ let verst = Infinity, lengst = 0; for (let r = .2; r <= 4000; r *= 1.07) { const px = K.skalaMål(r) / r; verst = Math.min(verst, px); lengst = Math.max(lengst, px); }
  ok(verst >= 70 && lengst < 190, `streken er ${verst.toFixed(0)}–${lengst.toFixed(0)} punkter lang fra 0,2 til 4000 m per punkt`); }

// navnepunkt: midt i en enkel firkant, og inne i flaten når midten av rammen ligger utenfor (hestesko rundt en fjord)
const inni = (deler, x, y) => { let n = 0; for (const a of deler) for (let i = 0, k = a.length - 2; i < a.length; k = i, i += 2) { const yi = a[i + 1], yk = a[k + 1];
  if ((yi > y) !== (yk > y) && x < a[i] + (a[k] - a[i]) * (y - yi) / (yk - yi)) n++; } return n % 2 === 1; };
{ const fk = [[0, 0, 1000, 0, 1000, 1000, 0, 1000]], p = K.navnepunkt(fk, [0, 0, 1000, 1000]);
  ok(Math.abs(p[0] - 500) < 30 && Math.abs(p[1] - 500) < 30, `firkant: navnet midt i (${p.map(Math.round)})`);
  // hestesko: by rundt en fjord som åpner seg mot sør – midten av rammen (5000, 5000) ligger i fjorden
  const sko = [[0, 0, 3000, 0, 3000, 7000, 7000, 7000, 7000, 0, 10000, 0, 10000, 10000, 0, 10000]], bb = [0, 0, 10000, 10000], q = K.navnepunkt(sko, bb);
  ok(!inni(sko, 5000, 5000) && inni(sko, q[0], q[1]), `hestesko rundt en fjord: navnet står på land (${q.map(Math.round)}), ikke i fjorden`);
  // et hull (innsjø) midt i byen: navnet står ikke i hullet
  const hull = [[0, 0, 9000, 0, 9000, 9000, 0, 9000], [3000, 3000, 6000, 3000, 6000, 6000, 3000, 6000]], h = K.navnepunkt(hull, [0, 0, 9000, 9000]);
  ok(inni(hull, h[0], h[1]), 'by med innsjø i midten: navnet står ikke i innsjøen');
  // to deler: navnet står i den største
  const to = [[0, 0, 500, 0, 500, 500, 0, 500], [2000, 0, 8000, 0, 8000, 6000, 2000, 6000]], t = K.navnepunkt(to, [0, 0, 8000, 6000]);
  ok(t[0] > 2000 && inni(to, t[0], t[1]), 'to deler: navnet står i den største');
  const smal = K.navnepunkt([[0, 0, 1, 0, 1, 1]], [0, 0, 0, 0]); ok(smal[0] === 0 && smal[1] === 0, 'flate uten utstrekning: midten av rammen'); }

// åpningsbildet: bred skjerm viser hele området, telefon i høydeformat Sør-Norge (åpning) eller fastlandet (hele landet)
{ const NORGE = [-100000, 6400000, 1150000, 9000000], pc = K.åpning(NORGE, 1400, 900), mob = K.åpning(NORGE, 390, 844), hele = K.åpning(NORGE, 390, 844, 'hele');
  ok(pc.b === NORGE && !pc.smal, 'PC: hele området med Svalbard');
  ok(mob.smal && mob.b[3] <= 7200000 && mob.b[2] <= 400000, 'telefon: åpner med Sør-Norge');
  const m = (å, W, H) => Math.max((å.b[2] - å.b[0]) / W, (å.b[3] - å.b[1]) / (H - 80)) * å.luft;
  ok(m(mob, 390, 844) < 1500 && m({ b: NORGE, luft: 1.05 }, 390, 844) > 3300, `telefon: ${Math.round(m(mob, 390, 844))} m per punkt (før ${Math.round(m({ b: NORGE, luft: 1.05 }, 390, 844))})`);
  const dombås = [193300, 6896300]; ok(dombås[0] > mob.b[0] && dombås[0] < mob.b[2] && dombås[1] > mob.b[1] && dombås[1] < mob.b[3], 'Dombås er med i åpningsbildet på telefon');
  ok(hele.b[3] < 8000000 && hele.b[2] > 1100000 && hele.b[0] < -60000, '«hele landet» på telefon: fastlandet fra Utvær til Vardø, uten Svalbard');
  ok(K.åpning([182016, 6880000, 228000, 6930016], 390, 844).b[0] === 182016, 'et lite område (Dovre) klippes ikke'); }
// fyrtårn: rundt bygg ved havet utenfor tettstedene – ikke en paviljong i en bypark (Bergen 12. nov), ikke en tank, ikke to fyr tett
ok(K.erFyr({ tank: false, hav: true, iBy: false, D: 8, nærFyr: false }), 'rundt bygg ved havet utenfor tettsted: fyr');
ok(!K.erFyr({ tank: false, hav: true, iBy: true, D: 8, nærFyr: false }), 'rundt bygg ved sjøen i et tettsted: ikke fyr');
ok(!K.erFyr({ tank: true, hav: true, iBy: false, D: 8 }) && !K.erFyr({ hav: false, D: 8 }) && !K.erFyr({ hav: true, D: 20 }) && !K.erFyr({ hav: true, D: 8, nærFyr: true }), 'tank, innland, stort bygg og fyr tett ved et annet: ikke fyr');
console.log(feil ? feil + ' feil' : 'alle kart2d-tester ok'); process.exit(feil ? 1 : 0);
