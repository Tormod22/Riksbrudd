// Test for spill/kjeder.js (ut6-kjeder, fase Ø9) og de nye maskinene i spill/produksjon.js: stein -> pukk, korn -> mel, olje -> diesel …
'use strict';
const path = require('path'), SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const K = require(SP + '/kjeder.js'), PR = require(SP + '/produksjon.js'), Leir = require(SP + '/leir.js'), { Marked } = require(SP + '/spillet.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// en leir med én maskin av typen, ferdig bygget, med lager
function leir(type, lager) { const L = Leir.ny(); Object.assign(L.lager, lager); L.bygg.push({ id: 1, type, x: 0, y: 0, r: 0, igjen: 0, hp: 1, nivå: 1 }); return L; }
const kjør = (L, timer, kraft = 9) => { const P = PR.ny(); let s; for (let i = 0; i < timer * 6; i++) s = PR.steg(P, L, 10, { kraft, mangler: new Set() }); return { P, s }; };

// alle maskinene finnes i begge tabellene, med folk/strøm som i bygget
for (const t of ['steinbrudd', 'steinknuser', 'betongblander', 'fiskemottak', 'mølle', 'raffineri', 'smie']) {
  const B = Leir.BYGG[t], M = PR.REGLER.maskiner[t]; ok(B && M && B.maskin && -B.kw === M.kw, `${t}: bygg og maskin stemmer (${M && M.kw} kW, ${M && M.folk} folk)`);
  ok(PR.REGLER.rekkefølge.includes(t), `${t}: står i rekkefølgen`); ok(!/m³ [a-z]* *→/.test('') && PR.oppskrift(t).length > 5, `${t}: oppskrift «${PR.oppskrift(t)}»`);
}
// planens tall (kapittel 4.2)
ok(PR.REGLER.maskiner.steinknuser.folk === 2 && Leir.BYGG.steinknuser.kw === -20 && Leir.BYGG.steinknuser.pris === 5e6, 'steinknuser: 2 folk, 20 kW, 5 mill. (planen)');
ok(PR.REGLER.maskiner.raffineri.folk === 4 && Leir.BYGG.raffineri.kw === -40 && Leir.BYGG.raffineri.pris === 18e6, 'raffineri: 4 folk, 40 kW, 18 mill. (planen)');
ok(Leir.BYGG.fiskemottak.pris === 7e6 && Leir.BYGG.mølle.pris === 3e6 && Leir.BYGG.smie.pris === 2.5e6, 'fiskemottak 7, mølle 3, smie 2,5 mill. (planen)');

// steinknuseren lager pukk av stein
{ const L = leir('steinknuser', { stein: 10 }), { s } = kjør(L, 2); ok(L.lager.pukk > 3.5 && L.lager.pukk < 3.7 && Math.abs(L.lager.stein - 6) < .01, `steinknuseren: 2 t gir ${PR.nf(L.lager.pukk, 2)} m³ pukk av 4 m³ stein`); ok(s.status[1].går, 'steinknuseren går'); }
{ const L = leir('steinknuser', {}), { s } = kjør(L, 1); ok(!s.status[1].går && s.status[1].tekst === 'tom for stein', `uten stein: «${s.status[1].tekst}»`); }
// steinbruddet trenger ingen råvare
{ const L = leir('steinbrudd', {}); kjør(L, 2); ok(Math.abs(L.lager.stein - 3) < .01, `steinbruddet: 2 t gir ${PR.nf(L.lager.stein, 2)} m³ stein uten råvare`); }
// betongblanderen: pukk + sement -> betong
{ const L = leir('betongblander', { pukk: 4, sement: 2 }); kjør(L, 2); ok(Math.abs(L.lager.betong - 1) < .01 && Math.abs(L.lager.sement - 1.6) < .01, 'betongblanderen: 2 t gir 1 m³ betong av 0,8 m³ pukk og 0,4 t sement'); }
{ const L = leir('betongblander', { pukk: 4 }), { s } = kjør(L, 1); ok(!s.status[1].går && /pukk og sement/.test(s.status[1].tekst), `uten sement: «${s.status[1].tekst}»`); }
// mølla lager mel av korn
{ const L = leir('mølle', { korn: 5 }); kjør(L, 2); ok(Math.abs(L.lager.mel - 1) < .01 && Math.abs(L.lager.korn - 3.8) < .01, `mølla: 2 t gir ${PR.nf(L.lager.mel, 2)} t mel av 1,2 t korn`); }
// raffineriet lager diesel av olje (liter i L.lager.diesel – visningen flytter den til tanken)
{ const L = leir('raffineri', { olje: 2 }); kjør(L, 2); ok(Math.abs(L.lager.diesel - 40) < .1 && Math.abs(L.lager.olje - 1.5) < .01, `raffineriet: 2 t gir ${PR.nf(L.lager.diesel, 0)} l diesel av 0,5 t olje`);
  ok(PR.merke('raffineri', { går: true, drift: 1 }) === '20 l/t', `merket over raffineriet: «${PR.merke('raffineri', { går: true, drift: 1 })}»`);
  L.drivstoff = 100; const m = K.dieselTilTank(L, 120); ok(m === 20 && L.drivstoff === 120 && Math.abs(L.lager.diesel - 20) < .1, 'dieselen går i tanken så langt den rekker'); }
// fiskemottaket og smia
{ const L = leir('fiskemottak', { fisk: 3 }); kjør(L, 1, 3); ok(Math.abs(L.lager.frossenfisk - .7) < .01, 'fiskemottaket: 1 t gir 0,7 t frossen fisk'); }
{ const L = leir('smie', { skrap: 2 }); kjør(L, 2); ok(Math.abs(L.lager.stål - .3) < .01 && Math.abs(L.lager.deler - .06) < .01, 'smia: 2 t gir 0,3 t stål og 0,06 t deler av 1 t skrap'); }
// færre folk = saktere
{ const L = leir('raffineri', { olje: 2 }); kjør(L, 2, 2); ok(Math.abs(L.lager.diesel - 20) < .1, 'raffineriet med 2 av 4 folk går halvt så fort'); }

// plassreglene
const bakke = (x, y) => Math.hypot(x, y) * .2, flatt = () => 300;
ok(K.steinPlass(bakke, 0, 0).ok && !K.steinPlass(flatt, 0, 0).ok, 'steinbruddet: ved fjell ja, på flat mark nei');
ok(/fjell/.test(K.plassFeil('steinbrudd', { x: 0, y: 0 }, { høyde: flatt }) || ''), 'steinbruddet på flat mark gir en forklaring');
ok(/fryselager/.test(K.plassFeil('fiskemottak', { x: 0, y: 0 }, { fryselager: false }) || ''), 'fiskemottaket uten fryselager');
ok(/kai/.test(K.plassFeil('fiskemottak', { x: 0, y: 0 }, { fryselager: true, kai: () => null }) || ''), 'fiskemottaket uten kai');
ok(K.plassFeil('fiskemottak', { x: 0, y: 0 }, { fryselager: true, kai: () => ({ d: 50 }) }) === null, 'fiskemottaket ved kai med fryselager');
ok(/verksted/.test(K.plassFeil('smie', { x: 0, y: 0 }, { harVerksted: false }) || '') && K.plassFeil('smie', {}, { harVerksted: true }) === null, 'smia trenger et verksted');
ok(K.plassFeil('steinbrudd', { x: 0, y: 0 }, {}) === null, 'uten kartdata slipper bygget gjennom');
// kroken i leir.js
{ const L = Leir.ny(); Leir.kanByggeEkstra = (l, b) => (b.type === 'smie' ? 'nei' : null); ok(Leir.kanBygge(L, { type: 'smie', x: 0, y: 0, r: 0 }) === 'nei' && Leir.kanBygge(L, { type: 'mølle', x: 0, y: 0, r: 0 }) === null, 'Leir.kanByggeEkstra brukes i kanBygge'); Leir.kanByggeEkstra = null; }

// korn, mel, olje, sesong
{ const k = K.korn(2, 24, 0, 'sommer'); ok(k.tonn === 6 && k.kr === 24000, 'korn: to byer gir 6 t i døgnet om sommeren for 24 000 kr'); ok(K.korn(2, 24, 10, 'sommer').tonn === 2, 'korn: lageret fylles bare opp til 12 t'); ok(K.korn(0, 24, 0, 'sommer').tonn === 0, 'korn: ingen avtale, ingen korn'); ok(K.korn(1, 24, 0, 'høst').tonn > K.korn(1, 24, 0, 'vinter').tonn, 'korn: mer om høsten enn om vinteren'); }
{ const m = K.melTilMat(2, 0, 10, 1, 1); ok(Math.abs(m.mel - .25) < 1e-9 && Math.abs(m.rasjoner - 1.5) < 1e-9, 'kjøkkenet: 0,25 t mel i timen = 1,5 rasjoner'); ok(K.melTilMat(2, 100, 10, 1, 1).mel === 0, 'kjøkkenet bruker ikke mel når maten rekker'); ok(K.melTilMat(2, 0, 10, 0, 1).mel === 0, 'uten kjøkken: ingen mat av melet'); }
ok(K.oljeTilLeir(100, 1, 60) === 2 && K.oljeTilLeir(.5, 0, 60) === .5 && K.oljeTilLeir(100, 5, 60) === 0, 'olje fra basen fyller opp til 3 t');
ok(K.sesong('hogst', 'vinter') > 1 && K.sesong('fisk', 'høst') > K.sesong('fisk', 'sommer') && K.sesong('ved', 'vinter') > K.sesong('ved', 'sommer') && K.sesong('hogst', 'x') === 1, 'sesongene: hogst om vinteren, fisk om høsten, ved dyr i kulda');
ok(Math.abs(K.fiskFraFangst(10, 'høst') - 2.6) < 1e-9 && Math.abs(K.skrapFraRiving(5) - 2) < 1e-9, 'fisk fra fangsten og skrap fra riving');

// pukk til grusvegen
{ const a = K.vegPukk(100, 50), b = K.vegPukk(100, 6), c = K.vegPukk(100, 0); ok(Math.abs(a.pukk - 15) < 1e-9 && a.kr === 300000, 'vegen: 100 m bruker 15 m³ pukk og blir 300 000 kr billigere');
  ok(Math.abs(b.pukk - 6) < 1e-9 && b.kr === 120000 && c.kr === 0, 'vegen: delvis rabatt når pukken ikke rekker, ingen uten pukk'); }
// markedet: de nye varene, og de gamle trekker terningen som før
{ const r = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }), M1 = Marked.ny(), A = r();
  for (let i = 0; i < 5; i++) Marked.steg(M1, A); const neste = A();
  // samme følge med bare de gamle varene (KVARER tas ikke med i trekket)
  let s = 7; const B = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 5 * Marked.VARER.length; i++) B();
  ok(Math.abs(neste - B()) < 1e-12, 'markedet: de nye varene trekker ikke fra terningen');
  ok(Marked.KVARER.every(v => Marked.LAGER[v] && Marked.ENHET[v] && Marked.KJØPER[v] > 0 && Marked.erMateriale(v) && Leir.MATERIALER[v]), 'markedet: hylle, enhet, kjøper og materiale for alle de nye varene');
  ok(Marked.pris(M1, 'pukk', 7000) > 3000 && Marked.kan(M1, 'stein', 5) === 5, 'markedet: pris og hylle for pukk og stein');
  Marked.sesong = v => (v === 'ved' ? 1.4 : 1); const p = Marked.pris(M1, 'ved', 12000); Marked.sesong = null; ok(p > Marked.pris(M1, 'ved', 12000) * 1.3, 'markedet: Marked.sesong gjør veden dyrere'); }

// SELVTEST (årsak H): en feil med vilje – mølla uten ut – skal oppdages
{ const ut = PR.REGLER.maskiner.mølle.ut; PR.REGLER.maskiner.mølle.ut = {}; const L = leir('mølle', { korn: 5 }); kjør(L, 2); PR.REGLER.maskiner.mølle.ut = ut; ok(!(L.lager.mel > .5), 'selvtest: en mølle uten mel blir oppdaget'); }
console.log(feil ? `${feil} FEIL i test_kjeder` : 'Alle testene for kjeder.js er ok'); process.exit(feil ? 1 : 0);
