// Test for spill/avis.js (ut6-kjeder): lokalavisa hver morgen.
'use strict';
const A = require('../../site/dovre-fliser/spill/avis.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const saker = [{ slag: 'marked', tekst: 'Markedet: pukk opp 12 %' }, { slag: 'by', tekst: 'Dombås har inngått handelsavtale med dere' }, { slag: 'vær', tekst: 'Snø i fjellet i natt' }, { slag: 'produksjon', tekst: 'Steinknuseren laget 30 m³ pukk i går' }, { slag: 'angrep', tekst: 'Røverne ble slått tilbake ved leiren' }];
const a = A.lag(saker, 4, '1,2');
ok(a.tittel === 'Røverne ble slått tilbake ved leiren.', `tittelen er den største saken: «${a.tittel}»`);
ok(a.linjer.length === 3 && a.linjer.some(l => /^Byene:|^Bygdene:/.test(l)), 'tre notiser med innledning');
ok(/^Fjellposten, dag 4: /.test(a.tekst) && A.linje(a).startsWith('Fjellposten: '), 'navnet og dagen står først');
ok(JSON.stringify(A.lag(saker, 4, '1,2')) === JSON.stringify(a), 'samme dag gir samme avis');
ok(!/Markedet: Markedet/.test(a.tekst), 'ikke «Markedet:» to ganger');
const r = A.lag([], 2, 'x'); ok(r.tittel && r.linjer.length === 0 && A.REGLER.rolig.includes(r.tittel), `rolig dag: «${r.tittel}»`);
ok(A.lag([{ slag: 'by', tekst: 'A' }, { slag: 'by', tekst: 'A' }], 3).linjer.length === 0, 'samme sak bare én gang');
const L = A.fraLogg(['Kjøpte 10 m³ planker.', 'Brann i lagerteltet!', 'Røverne angriper fra nord.']); ok(L.length === 2 && L[0].slag === 'ulykke' && L[1].slag === 'angrep', 'saker fra loggen: ulykke og angrep');
// SELVTEST (årsak H): uten vekter faller tittelen på en annen sak
{ const v = A.REGLER.vekt.angrep; A.REGLER.vekt.angrep = 0.1; const b = A.lag(saker, 4, '1,2'); A.REGLER.vekt.angrep = v; ok(b.tittel !== a.tittel, 'selvtest: vektene bestemmer tittelen'); }
console.log(feil ? `${feil} FEIL i test_avis` : 'Alle testene for avis.js er ok'); process.exit(feil ? 1 : 0);
