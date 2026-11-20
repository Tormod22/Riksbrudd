// Test av spill/tallrekke.js (runde 9): Rekke gir de samme tallene som en vanlig liste gjort om til Float32Array/indeks, også når
// plassen kommer fra lageret med gamle tall i seg, og lageret holder seg under grensa. Selvtest: en feil med vilje blir sett.
'use strict';
const T = require('../../site/dovre-fliser/spill/tallrekke.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL:', t); } };
let f = 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
const likT = (a, b) => { if (a.constructor !== b.constructor || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false; return true; };
// tall som er vanskelige å runde (32 bit), negative, store, NaN og -0
const tall = () => { const r = rnd(); return r < .02 ? NaN : r < .04 ? -0 : r < .3 ? (rnd() - .5) * 1e6 + rnd() / 3 : r < .6 ? rnd() * 1e-3 : (rnd() - .5) * 4000; };
function prøv(n, med) {
  const l = [], R = new T.Rekke('F');
  for (let i = 0; i < n; i++) { const v = tall(), k = (i % 4);
    if (k === 0) { l.push(v); R.push(v); } else if (k === 1) { const w = tall(), z = tall(); l.push(v, w, z); R.p3(v, w, z); }
    else if (k === 2) { const w = tall(); l.push(v, w); R.p2(v, w); } else { const L = [v, tall(), tall(), tall()].slice(0, 1 + (i % 4)); l.push(...L); R.pushL(L); }
    if (med && i % 97 === 0) ok(R.length === l.length, 'length underveis'); }
  ok(R.length === l.length, 'length ' + n);
  const a = R.ferdig(), b = new Float32Array(l);
  return likT(a, b);
}
for (const n of [0, 1, 5, 4095, 4096, 4097, 9000, 70000, 300000]) ok(prøv(n, true), 'Float32 likt for ' + n);
// lageret: plassen brukes om igjen (og gamle tall blir ikke med)
const før = T.STAT.gjenbrukt;
for (let k = 0; k < 6; k++) ok(prøv(50000 + k * 1000, false), 'likt etter gjenbruk ' + k);
ok(T.STAT.gjenbrukt > før, 'lageret ble brukt om igjen (' + (T.STAT.gjenbrukt - før) + ')');
ok(T.lager().MB <= T.REGLER.lager / 1048576 + .01, 'lageret under grensa: ' + JSON.stringify(T.lager()));
// indekser: Uint16 når største ≤ 65535, ellers Uint32 – som three.js setIndex(liste)
for (const maks of [10, 65535, 65536, 200000]) {
  const l = [], R = new T.Rekke('U'); for (let i = 0; i < 20000; i++) { const v = Math.floor(rnd() * maks); l.push(v); R.push(v); } l.push(maks); R.push(maks);
  const a = R.ferdigIndeks(), Ty = maks > 65535 ? Uint32Array : Uint16Array; ok(likT(a, new Ty(l)), 'indeks ' + maks + ' ' + a.constructor.name);
}
ok(new T.Rekke('U').ferdigIndeks().constructor === Uint16Array, 'tom indeks = Uint16Array');
// av (Rekke.på = false): vanlige lister, samme svar
T.Rekke.på = false; ok(prøv(20000, true), 'av: likt'); { const R = new T.Rekke('U'); R.push(1, 70000); ok(likT(R.ferdigIndeks(), new Uint32Array([1, 70000])), 'av: indeks'); } T.Rekke.på = true;
// slipp: plassen tilbake, rekka er tom
{ const R = new T.Rekke('F'); R.p3(1, 2, 3); R.slipp(); ok(R.length === 0 && R.a === null, 'slipp'); }
// lerretspunkter: samme størrelse fra lageret
{ const a = T.taPunkter(4096); T.giPunkter(a); const b = T.taPunkter(4096); ok(a === b, 'punktene brukes om igjen'); const c = T.taPunkter(4096); ok(c !== b, 'to i bruk samtidig er ulike'); }
// navn: rekka starter i størrelsen samme navn endte på sist (rundet opp til toerpotens), og tallene er de samme
{ const R = new T.Rekke('F', 'prøve'); const l = []; for (let i = 0; i < 70000; i++) { R.push(i / 3); l.push(i / 3); } ok(likT(R.ferdig(), new Float32Array(l)), 'navn: likt');
  ok(T.STØRRELSE.get('prøve') === 70000, 'navn: størrelsen huskes'); const Q = new T.Rekke('F', 'prøve'); Q.p3(1, 2, 3); ok(Q.a.length >= 70000 && Q.a.length === 131072, 'navn: starter stort nok (' + Q.a.length + ')'); ok(likT(Q.ferdig(), new Float32Array([1, 2, 3])), 'navn: tallene like'); }
// SELVTEST: en rekke som ikke runder til 32 bit, blir sett
{ const l = [0.1, 1 / 3], a = new Float64Array(l); ok(!likT(new Float32Array(a), a), 'selvtest: Float64 er ikke Float32'); const R = new T.Rekke('F'); R.push(0.1); R.a[0] = 0.2; ok(!likT(R.ferdig(), new Float32Array([0.1])), 'selvtest: endret tall blir sett'); }
console.log(feil ? `${feil} FEIL` : 'test_tallrekke: alt ok', JSON.stringify(T.STAT));
process.exit(feil ? 1 : 0);
