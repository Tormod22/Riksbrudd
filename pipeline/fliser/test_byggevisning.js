// Test av reglene i spill/byggevisning.js (uten DOM): rutesteg, kamerarammen for bygging, tekster.
const B = require('../../site/dovre-fliser/spill/byggevisning.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(B.rutesteg(.1) === 2.5 && B.rutesteg(.3) === 10 && B.rutesteg(2) === 50 && B.rutesteg(10) === 0, 'rutenettet: 2,5 m nær, 10 m, 50 m, ingen langt ute');
const leir = { x: 1000, y: 2000 }, bygg = [{ x: 980, y: 2010 }, { x: 1060, y: 1950 }, { x: 5000, y: 5000 }];
ok(B.ramme({ x: 1000, y: 2000, m: .4 }, 1400, 800, leir, bygg) === null, 'nær nok og leiren i bildet: kameraet står');
const r = B.ramme({ x: 1000, y: 2000, m: 3 }, 1400, 800, leir, bygg);
ok(r && r.m >= .5 && r.m <= .9 && Math.abs(r.x - 1020) < 1 && Math.abs(r.y - 1980) < 1, 'zoomet ut: rammen rundt leiren og byggene (utposten 5 km unna teller ikke)');
const r2 = B.ramme({ x: 9000, y: 9000, m: .3 }, 390, 844, leir, []);
ok(r2 && Math.abs(r2.x - 1000) < 1e-9 && r2.m >= .5 && r2.m <= .9, 'leiren utenfor bildet: kameraet flyttes dit også når det er nært');
// (runde 13) zoomet passe (1 m per punkt) med leiren i bildet: kameraet står (før gikk det inn til 0,2 – 20 m-målestokk)
ok(B.ramme({ x: 1000, y: 2000, m: 1 }, 844, 390, leir, bygg) === null && B.ramme({ x: 1000, y: 2000, m: 1.3 }, 844, 390, leir, bygg).m >= .5, 'zoomen beholdes nær nok; ellers aldri nærmere enn 50 m-målestokk');
ok(B.meter(2) === '2 m' && B.meter(12.84) === '12,8 m' && B.meter(540) === '540 m' && B.meter(2500) === '2,5 km', 'avstander skrives kort');
ok(Math.abs(B.lengde([[0, 0], [3, 4], [3, 14]]) - 15) < 1e-9, 'gjerdets lengde');
ok(B.RING.vakttårn[0] === 150 && B.RING.sandsekkvoll[0] === 15, 'rekkeviddene');
console.log(feil ? feil + ' feil' : 'alle testene for byggevisningen ok'); process.exit(feil ? 1 : 0);
