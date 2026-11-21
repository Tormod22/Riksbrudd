// Test av spill/trussel-lagring.js (runde 5): et angrep som er i gang, lagres og leses tilbake (node pipeline/fliser/test_trussel_lagring.js)
const TL = require('../../site/dovre-fliser/spill/trussel-lagring.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL:', t); } else console.log('ok  ', t); };
const lag = (navn, raid, x, y, ekstra = {}) => Object.assign({ navn, side: 'rød', raid, x, y, leder: 0, menn: [{ navn: 'A', rolle: 'rifle', hp: 1 }, { navn: 'B', rolle: 'rifle', hp: .4 }, { navn: 'C', rolle: 'mg', hp: 0 }], sti: [[x, y], [x + 50, y + 60]] }, ekstra);
const a = lag('Røvere 3.1', 3, 1000.04, 2000.06, { fra: { x: 2400, y: 1900 }, inne: 47.26, bytte: null });
const b = lag('Røvere 3.2', 3, 1100, 2100, { trekker: true, trekkerFra: 1234.4, bytte: { penger: 400000, lager: { tre: 2.5, betong: 0, stål: 1 }, diesel: 30, mat: 6 } });
const c = lag('Røvere 2.1', -2, 3000, 2500, { trekker: true });
const egen = { navn: 'Tropp 1', stridFør: { ild: 'fri', underlegen: 'trekk', tap: 3, fram: 'nei', bev: 'standard' }, forsvar: { x: 10.04, y: 20, voll: 3 } };
const d = TL.pakk({ aktiv: 3, tid: 4321.7, lag: [a, b, c, { navn: 'uten menn' }], egne: [egen, { navn: 'Tropp 2' }] });
ok(d.versjon === TL.VERSJON && d.aktiv === 3 && d.tid === 4322, 'versjon, bølge og tid');
ok(d.lag.length === 3, 'tre lag (laget uten menn er tatt ut)');
ok(d.lag[0].inne === 47.3 && d.lag[0].fra.x === 2400 && d.lag[0].x === 1000 && d.lag[0].menn.length === 3, 'sted, tid inne, der de kom fra og mennene');
ok(Array.isArray(d.lag[0].mål) && d.lag[0].mål[0] === 1050, 'målet for marsjen');
ok(d.lag[1].trekker && d.lag[1].trekkerFra === 1234 && d.lag[1].bytte.penger === 400000 && d.lag[1].bytte.lager.tre === 2.5 && !('betong' in d.lag[1].bytte.lager), 'byttet de har tatt');
const tekst = JSON.stringify(d);
const r = TL.fraJSON(tekst, 3, { tid: 4400 });
ok(r && r.lag.length === 3, 'leses tilbake for samme bølge');
ok(r.egne.length === 1 && r.egne[0].stridFør.underlegen === 'trekk' && r.egne[0].forsvar.x === 10 && r.egne[0].forsvar.voll === 3, 'egne lag i forsvar: reglene fra før og plassen');
ok(TL.fraJSON(tekst, 4, { tid: 4400 }) === null, 'en annen bølge gir null');
ok(TL.fraJSON(tekst, 0) === null, 'ingen bølge gir null');
ok(TL.fraJSON(tekst, 3, { tid: 4322 + 3 * 1440 }) === null, 'for gammelt (tre døgn) gir null');
ok(TL.fraJSON(tekst, 3, { tid: 4280 }) !== null && TL.fraJSON(tekst, 3, { tid: 100 }) === null, 'litt bak klokka går (verden lagret litt før), et nytt spill på samme sted (klokka på 100) gir null');
ok(TL.fraJSON('{ikke json', 3) === null && TL.fraJSON(null, 3) === null, 'ødelagt gir null');
ok(TL.fraJSON(JSON.stringify(TL.pakk({ aktiv: 3, tid: 10, lag: [c] })), 3) === null, 'bare lag fra en gammel bølge gir null');
ok(TL.fraJSON(JSON.stringify({ ...d, lag: d.lag.map(q => ({ ...q, side: 'blå' })) }), 3) === null, 'egne lag leses aldri som røvere');
// tilbake på et nytt lag (som nyttLag gir)
const s = { navn: 'Røvere 3.2', x: 0, y: 0, side: 'rød', menn: [{ navn: 'X', rolle: 'rifle', hp: 1 }], leder: 0 };
TL.brukEn(s, r.lag[1]);
ok(s.raid === 3 && s.x === 1100 && s.trekker === true && s.flykter === false && s.menn.length === 3 && s.menn[1].hp === .4, 'laget settes som det var');
ok(s.bytte && s.bytte.diesel === 30 && s.bytte.mat === 6, 'byttet følger med');
ok(Array.isArray(s.målLagret) && s.målLagret[0] === 1150 && s.sti === null, 'står stille med målet husket');
ok(TL.rensBytte({ penger: -5, lager: { tre: 'x', '<b>': 3 }, diesel: NaN }).penger === 0 && Object.keys(TL.rensBytte({ lager: { '<b>': 3 } }).lager).length === 0, 'byttet renses');
// (runde 13) tida for neste bølge og anslaget lagres
{ const TL = require('../../site/dovre-fliser/spill/trussel-lagring'), A2 = require('assert');
  const d = TL.pakk({ aktiv: 0, tid: 1000, lag: [], egne: [], neste: 1900, bølge: 2 });
  A2.strictEqual(TL.neste(d, { tid: 1100, bølge: 2 }), 1900, 'tida holdes fast etter omlasting');
  A2.strictEqual(TL.neste(d, { tid: 1950, bølge: 2 }), 1970, 'passert tid: bølgen kommer snart');
  A2.strictEqual(TL.neste(d, { tid: 1100, bølge: 3 }), null, 'en annen bølge'); A2.strictEqual(TL.neste({ ...d, aktiv: 2 }, { tid: 1100, bølge: 2 }), null, 'ikke midt i et angrep');
  A2.strictEqual(TL.neste({ ...d, neste: 1100 + 4 * 1440 }, { tid: 1100, bølge: 2 }), null, 'urimelig langt fram');
  const d2 = TL.pakk({ aktiv: 3, tid: 50, lag: [], egne: [], anslag: { id: 'r3', v: 42.25, t: 50, minNær: 1234.4, sett: true } });
  A2.deepStrictEqual(d2.anslag, { id: 'r3', v: 42.3, t: 50, minNær: 1234, sett: true }); A2.strictEqual(TL.rensAnslag({ id: 'r3', v: 'x', t: 1 }), null);
  console.log('ok   runde 13: neste bølge holdes fast, anslaget lagres'); }
console.log(feil ? `${feil} FEIL` : 'alle tester ok'); process.exit(feil ? 1 : 0);
