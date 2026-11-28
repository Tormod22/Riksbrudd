// Test for spill/karaktervern.js (ut9-liv): karakteren som ble tatt ut av lista ved en feil, settes inn igjen. Kjør: node pipeline/fliser/test_karaktervern.js
const KV = require(require('path').join(__dirname, '../../site/dovre-fliser/spill/karaktervern.js'));
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const lag = n => ({ navn: 'Lag ' + n, side: 'blå', menn: [{ hp: 1 }] }), kar = { navn: 'Kari (deg)', side: 'blå', karakter: true, menn: [{ hp: 1 }] };
const E = [lag(1), lag(2), lag(3), kar];
ok(KV.finn(E) === kar && KV.savnet(E, kar) === null, 'karakteren står i lista: ingenting å gjøre');
// feilen: et prøvelag er alt fjernet, og «fjern laget» med indexOf = −1 tar ut det siste laget – karakteren
const prøve = lag('prøve'); E.push(prøve); E.splice(E.indexOf(prøve), 1); E.splice(E.indexOf(prøve), 1);
ok(!E.includes(kar), 'selvtest: splice(indexOf(borte), 1) tar ut karakteren som sto sist');
ok(KV.savnet(E, kar) === kar, 'karakteren er savnet og skal inn igjen');
E.push(KV.savnet(E, kar)); ok(E.includes(kar) && KV.savnet(E, kar) === null, 'satt inn igjen: samme lag');
ok(KV.savnet([lag(1), { ...kar }], kar) === null, 'en annen karakter står der: ikke to');
ok(KV.savnet([lag(1)], null) === null && KV.savnet([lag(1)], lag(2)) === null, 'uten kjent karakter: ingenting');
console.log(feil ? `\n${feil} FEIL` : '\nalle ok'); process.exit(feil ? 1 : 0);
