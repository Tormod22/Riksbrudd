// Test av reglene i spill/selskapsbilde.js (fase Ø0: panelet «Selskapet»).
// Kjør: node pipeline/fliser/test_selskapsbilde.js
'use strict';
const B = require('../../site/dovre-fliser/spill/selskapsbilde.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
ok(B.REGLER.FANER.map(f => f.navn).join(',') === 'Oversikt,Produksjon,Kontrakter,Byer,Partnere,Eiere', 'de seks fanene fra planen');
ok(B.REGLER.FANER.filter(f => !f.klar).every(f => f.kommer && f.mer), 'fanene som ikke er klare, sier hva som kommer');
{ const D = { 1: { inn: 1.5e6, ut: 2e5 }, 2: { inn: 0, ut: 3e5 }, 3: { inn: 1e5, ut: 0 } };
  const U = B.uke(n => D[n] || { inn: 0, ut: 0 }, 3); ok(U.inn === 1.6e6 && U.ut === 5e5 && U.netto === 1.1e6 && U.dager === 3, 'ukas resultat fra dag 1 til 3');
  const U2 = B.uke(n => (n < 3 ? { inn: 1e6, ut: 0 } : { inn: 0, ut: 0 }), 10); ok(U2.inn === 0 && U2.dager === 7, 'bare de siste sju døgnene teller (dag 4–10)');
  ok(B.uke(null, 5).netto === 0, 'uten dagbok: null'); ok(B.uke(() => { throw new Error('x'); }, 2).dager === 0, 'feil i dagboka tåles'); }
{ const S = [{ id: 1, navn: 'Otta', folk: 2400, slag: 'tettsted' }, { id: 2, navn: 'Dombås', folk: 1100, slag: 'tettsted' }, { id: 3, navn: 'Jora bru', slag: 'bru' }, { id: 4, navn: 'Lesja', folk: 400, slag: 'tettsted' }];
  const L = B.byer(S, id => ({ 2: 'blå', 1: 'rød' }[id] || null), id => (id === 2 ? 61.4 : null));
  ok(L.length === 3 && L[0].navn === 'Dombås' && L[0].eierNavn === 'Dere' && L[0].loj === 61, 'byene: deres først, med lojalitet; bruene er ikke med');
  ok(L[1].navn === 'Otta' && L[1].eierNavn === 'Ravnsund' && L[2].eierNavn === 'Ingen', 'så etter folketall, med eier'); }
ok(B.viktigste([{ tekst: 'a' }, null, { tekst: '' }, { tekst: 'b' }, { tekst: 'c' }, { tekst: 'd' }]).map(k => k.tekst).join('') === 'abc', 'de tre viktigste, uten tomme');
ok(!B.storliaNå({}, 0) && B.storliaNå({}, 1) && B.storliaNå(null, 2) && !B.storliaNå({ storlia: true }, 3), 'Storlia-kortet: etter første levering, én gang');
{ const T = B.storliaTekst('Fjellvakt', { nr: 1 }); ok(/Storlia Tømmer har hørt om dere/.test(T.tittel) && /Fjellvakt/.test(T.tekst) && /Leverandør/.test(T.neste), 'teksten på kortet peker mot Leverandør'); }
ok(B.kr(1500000) === '1,5 mill. kr' && B.kr(-250000) === '−250 000 kr' && B.kr(40e6) === '40 mill. kr', 'kroner');
// (ut8-kr-penger) driften: summen, de største postene og rådet med et tilbud dere klarer
{ const d = B.drift({ lønn: 240000, diesel: 250000, vedlikehold: 171000, mat: 500 });
  ok(d.sum === 661000 && d.største.map(q => q[0]).join() === 'diesel,lønn,vedlikehold', 'drift: sum og største poster (uten småposter)');
  const t = B.driftTekst(d); ok(/ca\. 661 000 kr i døgnet/.test(t) && /diesel 250 000 kr, lønn 240 000 kr og vedlikehold 171 000 kr/.test(t), 'drift: teksten ' + t);
  const r = B.driftRåd(d, { kontrakt: { tittel: 'Hent legen i Ulvik', kr: 1320000 }, kassa: 2e6 });
  ok(/«Hent legen i Ulvik» gir 1,3 mill\. kr – ca\. 2 døgn med drift/.test(r) && /Diesel er største post/.test(r) && /rekker ca\. 3 døgn/.test(r), 'drift: rådet ' + r);
  ok(/lite oppdrag: «Hent forsyninger»/.test(B.driftRåd(d, { oppdrag: { navn: 'Hent forsyninger', gir: '0,4 mill. kr' }, kassa: 40e6 })), 'drift: et lite oppdrag når ingen kontrakt passer');
  ok(/ingenting/.test(B.driftTekst(B.drift({}))), 'drift: tom leir'); ok(B.ukeNå() === null, 'ukeNå uten dagbok (Node)'); }
console.log(feil ? feil + ' FEIL' : 'alle testene for selskapsbilde.js er ok'); process.exit(feil ? 1 : 0);
