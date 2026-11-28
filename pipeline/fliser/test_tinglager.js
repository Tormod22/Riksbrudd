// Test av lagringen av hverdagsting (site/dovre-fliser/spill/tinglager.js). Kjør: node pipeline/fliser/test_tinglager.js
const TL = require('../../site/dovre-fliser/spill/tinglager.js'), Ting = require('../../site/dovre-fliser/spill/ting.js');
let feil = 0; const ok = (v, t) => { if (!v) { feil++; console.log('FEIL: ' + t); } };
// en enkel leir: lagertelt, hyllereol, kjøleskap, frysboks, medisinskap, verktøytavle, tønne (delene i byggesettet har tingLager)
const Leir = { BYGG: { lagertelt: {}, brakke: {}, bs_hylle_1: { tingLager: 'hyllereol' }, bs_kjøleskap_1: { tingLager: 'kjøleskap' }, bs_frys_1: { tingLager: 'frysboks' },
  bs_medisinskap_1: { tingLager: 'medisinskap' }, bs_verktøytavle_1: { tingLager: 'verktøytavle' }, bs_tønne_1: { tingLager: 'tønne' }, aggregat: {} }, ferdig: b => !(b.igjen > 0) };
const L = { bygg: [{ id: 1, type: 'lagertelt' }, { id: 2, type: 'bs_hylle_1' }, { id: 3, type: 'bs_kjøleskap_1' }, { id: 4, type: 'bs_frys_1' }, { id: 5, type: 'bs_medisinskap_1' },
  { id: 6, type: 'bs_verktøytavle_1' }, { id: 7, type: 'bs_tønne_1' }, { id: 8, type: 'bs_hylle_1', igjen: 1 }, { id: 9, type: 'aggregat' }] };
let strøm = true; const Ps = () => TL.plasser(Leir, L, { strøm: () => strøm });
let P = Ps();
ok(P.length === 8 && P[P.length - 1].id === 'ute' && !P.some(q => q.id === 'b8') && !P.some(q => q.id === 'b9'), 'plassene: ' + P.map(q => q.id));
// tingene havner der de passer
let T = TL.ny();
const r = TL.leggListe(T, P, [{ id: 'peanøttsmør', n: 2 }, { id: 'melk', n: 2 }, { id: 'frossen_fisk', n: 1 }, { id: 'antibiotika', n: 1 }, { id: 'hammer', n: 1 }, { id: 'flaskevann', n: 3 }, { id: 'ullsokker', n: 2 }]);
const hvor = id => r.find(q => q.id === id).p;
ok(hvor('melk') === 'b3' && hvor('frossen_fisk') === 'b4' && hvor('antibiotika') === 'b5' && hvor('hammer') === 'b6' && hvor('flaskevann') === 'b7', 'riktig plass ' + JSON.stringify(r));
ok(['b1', 'b2'].includes(hvor('peanøttsmør')) && ['b1', 'b2'].includes(hvor('ullsokker')), 'tørt på hylla/i teltet');
ok(TL.antall(T, 'peanøttsmør') === 2 && TL.antall(T, 'melk') === 2, 'antall');
// mat i kjøleskap holder lenger enn på hylla, og uten strøm er kjøleskapet bare et skap
{ const A = TL.ny(); TL.legg(A, P, 'melk', 1, 0, { plass: 'b3' }); TL.legg(A, P, 'melk', 1, 0, { plass: 'b2' });
  TL.eld(A, P, 3 * 1440); const kald = A.s.find(s => s.p === 'b3'), varm = A.s.find(s => s.p === 'b2');
  ok(kald && !varm, 'melk på hylla har råtnet etter 3 døgn, i kjøleskapet ikke');
  ok(A.tapt.melk === 1, 'tapt telles'); strøm = false; const P2 = Ps(); ok(P2.find(q => q.id === 'b3').klima === 'tørt', 'uten strøm: tørt'); TL.eld(A, P2, 2 * 1440); strøm = true;
  ok(!A.s.length, 'uten strøm råtner melka'); }
// ute holder kortere: alt tørt × 2,5; klær tåler 60 døgn ute
{ const Pu = [{ id: 'ute', klima: 'ute', liter: Infinity, tar: null, passer: [], navn: 'Ute' }], B = TL.ny(); TL.legg(B, Pu, 'grovbrød', 1); TL.legg(B, Pu, 'ullsokker', 1); TL.legg(B, Pu, 'hammer', 1);
  TL.eld(B, Pu, 2.1 * 1440); ok(!TL.antall(B, 'grovbrød') && TL.antall(B, 'ullsokker') === 1, 'grovbrød ute råtner etter 2 døgn (5 inne)');
  TL.eld(B, Pu, 60 * 1440); ok(!TL.antall(B, 'ullsokker') && TL.antall(B, 'hammer') === 1, 'sokkene ødelagt av fukt, hammeren tåler det'); }
// fullt: resten ute; rydding flytter inn når det blir plass; revet bygg -> stablene flyttes
{ const C = TL.ny(), P1 = P.filter(q => q.id === 'b2' || q.id === 'ute'); TL.legg(C, P1, 'dopapir', 60);
  ok(C.s.some(s => s.p === 'ute') && TL.brukt(C, 'b2') <= 400 + 1e-9 && TL.antall(C, 'dopapir') === 60, 'fullt -> ute ' + TL.brukt(C, 'b2'));
  const P3 = TL.plasser(Leir, { bygg: [{ id: 2, type: 'bs_hylle_1' }, { id: 10, type: 'bs_hylle_1' }] }); ok(TL.rydd(C, P3, 4) >= 1 && TL.antall(C, 'dopapir') === 60 && C.s.some(s => s.p === 'b10'), 'rydding');
  TL.avstem(C, TL.plasser(Leir, { bygg: [{ id: 10, type: 'bs_hylle_1' }] })); ok(!C.s.some(s => s.p === 'b2') && TL.antall(C, 'dopapir') === 60, 'revet hylle -> flyttet'); }
// flytt: tar ikke feil ting, sjekker plass
{ const D = TL.ny(); TL.legg(D, P, 'hammer', 1, 0, { plass: 'b6' }); const s = D.s[0];
  ok(TL.flytt(D, P, s.id, 1, 'b5').feil && TL.flytt(D, P, s.id, 1, 'b2').ok && D.s[0].p === 'b2', 'flytt'); }
// spis: det som går ut først, spises først; rasjonene stemmer
{ const E = TL.ny(); TL.legg(E, P, 'peanøttsmør', 2); TL.legg(E, P, 'melk', 5, 0, { plass: 'b2' }); TL.legg(E, P, 'sjokolade', 3);
  const før = TL.matIAlt(E), s = TL.spis(E, P, 1); ok(Math.abs(s.spist - 1) < 1e-9 && s.åpnet[0].t === 'melk', 'melka på hylla spises først ' + JSON.stringify(s));
  ok(Math.abs(TL.matIAlt(E) - (før - 1)) < 1e-6, 'matIAlt minker med det som ble spist');
  const s2 = TL.spis(E, P, 100); ok(Math.abs(s2.spist - (før - 1)) < 1e-6 && TL.antall(E, 'peanøttsmør') === 0, 'alt spises når det trengs');
  ok(TL.spis(E, P, 1).spist === 0, 'tomt'); }
// medisin: den sterkeste brukes, dosene telles
{ const M = TL.ny(); TL.legg(M, P, 'plaster', 1); TL.legg(M, P, 'antibiotika', 1);
  const m = TL.medisin(M, P, 2, 1440); ok(m.id === 'antibiotika' && m.f === .8 && m.dekning === 1 && TL.antall(M, 'antibiotika') === 0 && M.doser.antibiotika === 5, 'medisin ' + JSON.stringify(m) + JSON.stringify(M.doser));
  ok(TL.medisin(M, P, 0, 60).f === 0, 'ingen syke'); for (let i = 0; i < 3; i++) TL.medisin(M, P, 2, 1440); ok(TL.medisin(M, P, 2, 1440).id === 'plaster', 'plaster når antibiotikaen er brukt'); }
// moral: kaffe brukes opp, kortstokk varer, radio trenger batterier
{ const Mo = TL.ny(); TL.legg(Mo, P, 'kaffe', 1); TL.legg(Mo, P, 'kortstokk', 1); TL.legg(Mo, P, 'radio', 1);
  let m = TL.moral(Mo, P, 10, 60); ok(m.grupper.kaffe.dekning === 1 && m.grupper.kaffe.p === 3 && m.varig.kortstokk.dekning === .6 && m.varig.radio.dekning === 0, 'moral ' + JSON.stringify(m));
  ok(Math.abs(m.sum - (3 + 1.5 * .6)) < 1e-6, 'sum ' + m.sum);
  TL.legg(Mo, P, 'batterier', 1); m = TL.moral(Mo, P, 10, 60); ok(m.varig.radio.dekning === 1 && m.sum <= Ting.REGLER.moralMaks, 'radio med batterier');
  for (let i = 0; i < 70; i++) TL.moral(Mo, P, 10, 60); ok(!TL.antall(Mo, 'kaffe') && !(TL.moral(Mo, P, 10, 60).grupper.kaffe || { dekning: 0 }).dekning, 'kaffen er drukket opp etter ca. 2,5 døgn');
  ok(TL.antall(Mo, 'kortstokk') === 1, 'kortstokken varer'); }
// tempo: hammer til bygg, tak
{ const V = TL.ny(); TL.legg(V, P, 'hammer', 2); let t = TL.tempo(V, 'bygg', 4); ok(Math.abs(t.f - .06) < 1e-9 && t.ting[0] === 'hammer', 'tempo ' + JSON.stringify(t));
  ok(TL.tempo(V, 'bygg', 8).f === .03 && TL.tempo(V, 'hogst', 4).f === 0, 'dekning');
  TL.legg(V, P, 'verktøy', 5); TL.legg(V, P, 'drill', 5); TL.legg(V, P, 'spiker', 5); TL.legg(V, P, 'sag', 5); ok(TL.tempo(V, 'bygg', 4).f === Ting.REGLER.tempoMaks, 'tak');
  TL.legg(V, P, 'motorsag', 1); ok(TL.tempo(V, 'hogst', 1).f === 0, 'motorsag uten bensinkanne'); TL.legg(V, P, 'bensinkanne', 1); ok(TL.tempo(V, 'hogst', 1).f === .15, 'med bensinkanne'); }
// oversikt, snart ut, søk, lagring
{ const O = TL.ny(); TL.legg(O, P, 'peanøttsmør', 2); TL.legg(O, P, 'melk', 1, 6); TL.legg(O, P, 'hammer', 1);
  const ov = TL.oversikt(O, P); ok(ov[0].kat === 'mat' && ov[0].ting.some(t => t.id === 'peanøttsmør' && t.n === 2 && t.plasser.length), 'oversikt');
  ok(TL.oversikt(O, P, 'peanøtt').length === 1 && TL.oversikt(O, P, 'verktøy')[0].kat === 'verktøy', 'søk');
  ok(TL.snartUt(O, P)[0].id === 'melk' && TL.snartUt(O, P).length === 1, 'snart ut');
  const J = TL.fraJSON(JSON.parse(JSON.stringify(TL.tilJSON(O)))); ok(JSON.stringify(TL.tilJSON(J)) === JSON.stringify(TL.tilJSON(O)), 'lagring');
  ok(TL.fraJSON({ s: [[1, 'finnes_ikke', 2, 0, 'ute'], 'tull'] }).s.length === 0 && TL.fraJSON(null).s.length === 0, 'tåler dårlige data');
  ok(TL.påPlass(O, P, 'b3').length === 1 && TL.verdi(O) > 0 && TL.igjenTekst(Infinity) === 'holder', 'påPlass, verdi'); }
// selvtest: med kjøleskapet som om det var en hylle ville melka råtnet like fort – testen over ville sett det
{ const F = TL.ny(), Pf = P.map(q => q.id === 'b3' ? { ...q, klima: 'tørt' } : q); TL.legg(F, Pf, 'melk', 1, 0, { plass: 'b3' }); TL.eld(F, Pf, 3 * 1440); ok(!F.s.length, 'selvtest: feil klima gir råtten melk'); }
console.log(feil ? feil + ' FEIL' : 'alle tinglagertestene ok'); process.exit(feil ? 1 : 0);
