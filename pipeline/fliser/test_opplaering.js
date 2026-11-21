// Test av reglene i spill/opplaering.js (uten DOM): node pipeline/fliser/test_opplaering.js
const O = require('../../site/dovre-fliser/spill/opplaering.js'); let feil = 0;
const ok = (b, t) => { if (!b) { feil++; console.log('FEIL ' + t); } else console.log('ok   ' + t); };
const tomt = { leirÅpnet: false, brakker: 0, folkÅpnet: false, påBygg: 0, tropper: 0, går: false, matDøgn: 5, forsvarSatt: false, angrep: false, skadet: 0 };
let T = O.tom();
ok(O.STEG.length === 9 && O.neste(T).id === 'leir' && O.nr(T) === 1, 'ni steg, første er å åpne Leir');
ok(O.oppdater(T, tomt).length === 0 && O.neste(T).id === 'leir', 'ingenting gjort: står på første steg');
ok(O.oppdater(T, { ...tomt, brakker: 1 }).length === 0, 'et senere steg gjort teller ikke før de foran er tatt');
ok(O.oppdater(T, { ...tomt, leirÅpnet: true, brakker: 1 }).join() === 'leir,brakke' && O.neste(T).id === 'bygg2', 'to steg på rad blir ferdige samtidig');
ok(O.oppdater(T, { ...tomt, påBygg: 3 }).length === 0, 'to på bygg teller først når Folk er åpnet');
ok(O.hopp(T) === 'bygg2' && O.neste(T).id === 'tropp' && O.nr(T) === 4, 'hopp over går til neste steg');
const T2 = O.fra(O.til(Object.assign(T, { leir: '1,2' })));
ok(T2.leir === '1,2' && T2.gjort.join() === 'leir,brakke' && T2.hoppet.join() === 'bygg2', 'lagring og lesing gir samme tilstand');
ok(O.fra('tull').gjort.length === 0 && O.fra('{"gjort":["finnesikke","leir"]}').gjort.join() === 'leir', 'ødelagt lagring og ukjente steg tåles');
O.oppdater(T, { ...tomt, tropper: 1, går: true });
ok(!O.ferdig(T) && O.neste(T).id === 'tropp2', 'runde 4: etter de fem første kommer «Lag en tropp til»');
ok(O.oppdater(T, { ...tomt, tropper: 2, matDøgn: 2 }).join() === 'tropp2' && O.neste(T).id === 'mat', 'to tropper: steget er gjort; mat til to døgn er ikke nok');
ok(O.oppdater(T, { ...tomt, tropper: 2, matDøgn: 3, forsvarSatt: true, angrep: false, skadet: 0 }).join() === 'mat,forsvar' && O.neste(T).id === 'reparer', 'mat til tre døgn og forsvaret satt (også en øvelse)');
ok(O.oppdater(T, { ...tomt, angrep: false, skadet: 0 }).length === 0 && O.oppdater(T, { ...tomt, angrep: true, skadet: 2 }).length === 0, 'reparasjon: ikke ferdig før et angrep er over og byggene er reparert');
O.oppdater(T, { ...tomt, angrep: true, skadet: 0 });
ok(O.ferdig(T) && O.neste(T) === null && O.nr(T) === 9, 'alle steg tatt: ferdig');
{ const g = O.fra('{"leir":"1,2","gjort":["leir","brakke","bygg2","tropp","gaa"],"slutt":true}'), n = O.fra('{"leir":"1,2","gjort":["leir"]}'), v2 = O.fra(O.til(O.fra('{"v":2,"gjort":["leir","brakke","bygg2","tropp","gaa"],"slutt":true}')));
  ok(O.ferdig(g) && g.hoppet.join() === 'tropp2,mat,forsvar,reparer' && !O.ferdig(n) && O.neste(v2).id === 'tropp2', 'en opplæring som alt var ferdig og lukket, får ikke de nye stegene; en som pågår, får dem'); }
ok(O.STEG.every(s => s.tittel && s.tekst.length > 20 && s.tekst.length < 170), 'alle steg har kort tekst');
// RUNDE 8 (kritiker C og D): steg 6 holder med én tropp + to på vakt, reparasjonen vises bare når noe er skadet, et steg som står lenge legges sammen
{ const T6 = O.fra('{"leir":"1,2","gjort":["leir","brakke","bygg2","tropp","gaa"]}'), s6 = O.neste(T6);
  ok(s6.id === 'tropp2' && O.oppdater(T6, { ...tomt, tropper: 1, påVakt: 1 }).length === 0 && O.oppdater(T6, { ...tomt, tropper: 1, påVakt: 2, matDøgn: 0 }).join() === 'tropp2', 'steg 6: én tropp og to på vakt holder, én på vakt gjør ikke');
  ok(/Bygg/.test(s6.tekst) && /Rekrutter/.test(s6.tekst) && s6.kort && s6.kort.length < 120, 'steg 6 sier at to skal bygge og hvordan du får folk (kort tekst på telefon)');
  const rep = O.STEG.find(s => s.id === 'reparer'); ok(!O.vises(rep, { ...tomt, skadet: 0 }) && O.vises(rep, { ...tomt, skadet: 1 }) && O.vises(O.STEG[0], tomt) && !O.vises(null, tomt), 'reparasjonen vises bare når noe er skadet');
  const fra = { ms: 1000, tid: 600 }; ok(!O.lenge(fra, { ms: 1000 + O.LENGE.ms - 1, tid: 600 + O.LENGE.min - 1 }) && O.lenge(fra, { ms: 1000 + O.LENGE.ms + 1, tid: 600 }) && O.lenge(fra, { ms: 2000, tid: 600 + O.LENGE.min + 1 }) && !O.lenge(null, fra), 'et steg som står lenge (ekte tid eller spilltid) legges sammen'); }
// RUNDE 13: steg 6 godkjennes med to på Vakt alene, og kravet står med tallene
{ const s = O.STEG.find(q => q.id === 'tropp2'); ok(s.ferdig({ tropper: 0, påVakt: 2 }) && s.ferdig({ tropper: 2, påVakt: 0 }) && !s.ferdig({ tropper: 1, påVakt: 1 }), 'steg 6: to på Vakt ELLER to tropper');
  ok(O.krav(s, { tropper: 1, påVakt: 1 }) === 'Nå: 1 på Vakt (trenger 2) – eller 1 tropp (trenger 2)' && O.krav(s, { tropper: 1, påVakt: 1 }, true) === '1/2 på vakt', 'steg 6: kravet står konkret');
  ok(O.krav(O.STEG.find(q => q.id === 'bygg2'), { påBygg: 1, folkÅpnet: true }) === 'På Bygg: 1 av 2' && O.krav(O.STEG[0], {}) === '', 'krav for «Sett to på bygg», tomt for steg uten tall'); }
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
