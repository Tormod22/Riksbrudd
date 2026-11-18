// Test av reglene i spill/opplaering.js (uten DOM): node pipeline/fliser/test_opplaering.js
const O = require('../../site/dovre-fliser/spill/opplaering.js'); let feil = 0;
const ok = (b, t) => { if (!b) { feil++; console.log('FEIL ' + t); } else console.log('ok   ' + t); };
const tomt = { leirÅpnet: false, brakker: 0, folkÅpnet: false, påBygg: 0, tropper: 0, går: false };
let T = O.tom();
ok(O.STEG.length === 5 && O.neste(T).id === 'leir' && O.nr(T) === 1, 'fem steg, første er å åpne Leir');
ok(O.oppdater(T, tomt).length === 0 && O.neste(T).id === 'leir', 'ingenting gjort: står på første steg');
ok(O.oppdater(T, { ...tomt, brakker: 1 }).length === 0, 'et senere steg gjort teller ikke før de foran er tatt');
ok(O.oppdater(T, { ...tomt, leirÅpnet: true, brakker: 1 }).join() === 'leir,brakke' && O.neste(T).id === 'bygg2', 'to steg på rad blir ferdige samtidig');
ok(O.oppdater(T, { ...tomt, påBygg: 3 }).length === 0, 'to på bygg teller først når Folk er åpnet');
ok(O.hopp(T) === 'bygg2' && O.neste(T).id === 'tropp' && O.nr(T) === 4, 'hopp over går til neste steg');
const T2 = O.fra(O.til(Object.assign(T, { leir: '1,2' })));
ok(T2.leir === '1,2' && T2.gjort.join() === 'leir,brakke' && T2.hoppet.join() === 'bygg2', 'lagring og lesing gir samme tilstand');
ok(O.fra('tull').gjort.length === 0 && O.fra('{"gjort":["finnesikke","leir"]}').gjort.join() === 'leir', 'ødelagt lagring og ukjente steg tåles');
O.oppdater(T, { ...tomt, tropper: 1, går: true });
ok(O.ferdig(T) && O.neste(T) === null && O.nr(T) === 5, 'alle steg tatt: ferdig');
ok(O.STEG.every(s => s.tittel && s.tekst.length > 20 && s.tekst.length < 170), 'alle steg har kort tekst');
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
