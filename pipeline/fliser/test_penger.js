// Test: node pipeline/fliser/test_penger.js – reglene i spill/penger-visning.js (Penger inn, hogstlaget velger selv, kontoen)
const P = require('../../site/dovre-fliser/spill/penger-visning.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const leir = { x: 1000, y: 2000 }, K = P.kandidater(leir);
ok(K.length === P.REGLER.hogst.ringer.length * P.REGLER.hogst.vinkler, 'kandidater: en ring per avstand, like mange punkter i hver');
ok(K.every((k, i) => i === 0 || K[i - 1].ring <= k.ring) && Math.abs(Math.hypot(K[0].x - leir.x, K[0].y - leir.y) - 70) < 1, 'kandidater: nærmeste ring først (70 m)');
ok(Math.max(...K.map(k => Math.hypot(k.x - leir.x, k.y - leir.y))) <= 1501, 'kandidater: aldri lenger ut enn 1,5 km');
// velgFelt: første ring med god skog vinner, ellers det beste over minstegrensa
const p = (ring, skog) => ({ x: ring, y: 0, ring, skog });
ok(P.velgFelt([p(0, .1), p(0, .3), p(1, .9), p(2, 1)]).ring === 1, 'velgFelt: nærmeste ring med god skog (ikke den beste lenger ute)');
ok(P.velgFelt([p(0, .5), p(0, .8)]).skog === .8, 'velgFelt: det beste punktet i ringen');
ok(P.velgFelt([p(0, .1), p(1, .25), p(2, .3)]).ring === 1, 'velgFelt: uten god skog – nærmeste over minstegrensa');
ok(P.velgFelt([p(0, .05), p(1, .1)]) === null, 'velgFelt: ingen skog gir null');
// kontoen: inn og ut per døgn
let k = P.konto(null, 40e6, 1); k = P.konto(k, 35e6, 1); k = P.konto(k, 36e6, 1);
ok(k.inn === 1e6 && k.ut === 5e6 && k.dag === 1, 'konto: inn og ut i dag');
k = P.konto(k, 37e6, 2); ok(k.før && k.før.inn === 1e6 && k.før.ut === 5e6 && k.inn === 1e6 && k.ut === 0, 'konto: ny dag – i går huskes, i dag teller på nytt');
k = P.konto(k, 37e6, 5); ok(k.før === null, 'konto: hopp over flere døgn – ingen «i går»');
// linjene
const kr = v => Math.round(v) + ' kr';
const L = P.linjer({ oppdrag: [{ navn: 'Hent forsyninger', meter: 900, retning: 'nord', kr: 7e5 }, { navn: 'Ta en røverpost', meter: 2500, retning: 'sør', kr: 2.4e6 }], hogst: { folk: 1, felt: null, trePris: 15000 }, tettsteder: { antall: 0 }, lager: { tre: 12 } }, kr);
ok(L.map(l => l.id).join() === 'oppdrag,hogst,salg,region,røvere', 'linjer: oppdrag, hogst, salg, tettsteder og røvere');
ok(/2 venter/.test(L[0].tekst) && /900 m mot nord/.test(L[0].tekst) && /2400000 kr/.test(L[0].tekst), 'linjer: nærmeste oppdrag og det best betalte');
ok(/leter etter skog/.test(L[1].tekst) && /12 m³ tre/.test(L[2].tekst), 'linjer: hogstlaget leter, og tre på lager kan selges');
const L2 = P.linjer({ oppdrag: [], hogst: { folk: 0 }, tettsteder: { antall: 2, kr: 230000 }, lager: {} }, kr);
ok(/ingen akkurat nå/.test(L2[0].tekst) && /ingen på hogst/.test(L2[1].tekst) && /2 er deres/.test(L2[3].tekst) && /230000 kr/.test(L2[3].tekst), 'linjer: uten oppdrag, uten hogst, med tettsteder');
console.log(feil ? feil + ' FEIL' : 'alle pengetestene ok'); process.exit(feil ? 1 : 0);
