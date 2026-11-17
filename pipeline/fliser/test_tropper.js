// Regeltest for spill/tropper.js: node pipeline/fliser/test_tropper.js
const T = require('../../site/dovre-fliser/spill/tropper'), assert = require('assert');
const p = (navn, vakt, stell, helse = 1) => ({ id: navn.length, navn, alder: 30, yrke: 'bonde', ferd: { vakt, stell, bygg: 1 }, oppgave: 'bygg', helse, lojal: .8 });
assert.ok(T.opprett([p('A', 1, 1)], 'x').feil, 'én person er ingen tropp'); assert.ok(T.opprett(Array.from({ length: 13 }, (_, i) => p('P' + i, 1, 1)), 'x').feil);
const folk = [p('Svak', .7, .8), p('Best', 1.4, .9), p('Lege', .9, 1.5), p('Grei', 1.0, .7), p('Såret', 1.1, .8, .5)], t = T.opprett(folk, 'Min tropp');
assert.strictEqual(t.menn.length, 5); assert.strictEqual(t.menn[0].navn, 'Best', 'den beste på vakt leder'); assert.strictEqual(t.menn[0].rolle, 'lagfører'); assert.strictEqual(t.menn.find(m => m.rolle === 'sanitet').navn, 'Lege', 'den beste på stell blir sanitet');
assert.strictEqual(t.menn.find(m => m.navn === 'Såret').hp, .5, 'en skadet person er såret i troppen'); assert.ok(t.menn.every(m => m.person && m.person.navn === m.navn)); assert.strictEqual(new Set(t.menn.map(m => m.navn)).size, 5);
assert.strictEqual(T.opprett(folk.slice(0, 2), 'to').menn.some(m => m.rolle === 'sanitet'), false, 'ingen sanitet i en tropp på to');
// oppløsning: falne kommer ikke hjem, sårede kommer hjem med lav helse, soldater uten persondata får en
t.menn[1].hp = 0; t.menn[2].hp = .5; t.menn.push({ navn: 'Gammel soldat', rolle: 'rifle', hp: 1, loy: .9 }); const hjem = T.oppløs(t, ['bygg', 'vakt', 'fri']);
assert.strictEqual(hjem.length, 5); assert.ok(!hjem.some(q => q.navn === t.menn[1].navn)); assert.strictEqual(hjem.find(q => q.navn === t.menn[2].navn).helse, .35); assert.ok(hjem.every(q => q.oppgave === 'fri' && q.id === undefined));
const gs = hjem.find(q => q.navn === 'Gammel soldat'); assert.ok(gs.ferd.vakt === 1.2 && gs.ferd.bygg === .9);
// kjøretøy
const bil = { type: 'speiderbil', antall: 1, navn: 'Speiderbil 1' }, last = { type: 'lastebil', antall: 2, navn: 'Kolonne' };
assert.strictEqual(T.plass(bil), 4); assert.strictEqual(T.plass(last), 24); assert.strictEqual(T.plass({ type: 'stridsvogn', antall: 1 }), 0);
assert.ok(/plass/.test(T.ombordFeil({ menn: t.menn }, bil, 10))); assert.strictEqual(T.ombordFeil({ menn: t.menn.slice(0, 3) }, bil, 10), null); assert.ok(/langt/.test(T.ombordFeil({ menn: t.menn.slice(0, 3) }, bil, 200))); assert.ok(/frakter alt/.test(T.ombordFeil({ menn: t.menn.slice(0, 3) }, bil, 10, true)));
assert.ok(/kjører/.test(T.ombordFeil({ menn: t.menn.slice(0, 3) }, { ...bil, sti: [1] }, 10)));
// FOLK OG UTSTYR (17. nov): forslag, priser, våpen mann for mann, utstyr
{ const P = [{ id: 1, navn: 'A', ferd: { vakt: 1.4 }, oppgave: 'bygg', helse: 1 }, { id: 2, navn: 'B', ferd: { vakt: 1.3 }, oppgave: 'fri', helse: 1 }, { id: 3, navn: 'C', ferd: { vakt: 1.45 }, oppgave: 'kjøkken', helse: .4 }, { id: 4, navn: 'D', ferd: { vakt: .8 }, oppgave: 'vakt', helse: 1 }, { id: 5, navn: 'E', ferd: { vakt: .8 }, oppgave: 'bygg', helse: 1 }];
  assert.deepStrictEqual(T.foreslå(P, 3), [2, 1, 4], 'ledige og friske foran, syke sist: ' + T.foreslå(P, 3)); assert.deepStrictEqual(T.foreslå(P, 0), []); assert.strictEqual(T.foreslå(P, 9).length, 5);
  assert.strictEqual(T.pris(['rifle', 'maskingevær', 'presisjonsrifle', 'tull'], ['kikkert', 'ammo', 'tull']), 150000 + 80000 + 150000 + 100000, 'pris'); assert.strictEqual(T.pris([], []), 0);
  assert.deepStrictEqual(T.mister(P.slice(0, 5)), { bygg: 2, kjøkken: 1, vakt: 1 }, 'hva leiren mister');
  const lag = T.opprett(P.slice(0, 4), 'X'); T.utrust(lag, { 1: 'maskingevær', 2: 'hagle', 9: 'pistol' }); const v = Object.fromEntries(lag.menn.map(m => [m.person.id, m.valgt]));
  assert.ok(v[1] === 'maskingevær' && v[2] === 'hagle' && v[3] === undefined, 'våpen mann for mann: ' + JSON.stringify(v));
  // sanitetsutstyr: krever utstyret, en frisk sanitet, seks timer og en såret
  lag.menn[0].hp = .5; assert.strictEqual(T.pleie(lag, 10), false, 'uten utstyr'); lag.utstyr = { sanitet: true }; assert.strictEqual(T.pleie(lag, 3), false, 'for tidlig'); assert.strictEqual(T.pleie(lag, 6), true, 'en såret blir kampklar'); assert.strictEqual(lag.menn[0].hp, 1);
  assert.strictEqual(T.pleie(lag, 6), false, 'ingen sårede'); lag.menn[0].hp = .5; lag.menn.find(m => m.rolle === 'sanitet').hp = 0; assert.strictEqual(T.pleie(lag, 6), false, 'uten sanitet');
  for (const [id, M] of Object.entries(T.MALER)) { assert.ok(M.n >= T.R.min && M.n <= T.R.maks && M.våpen.every(w => T.VÅPEN[w]) && M.utstyr.every(u => T.UTSTYR[u]), 'malen ' + id); } }
console.log('ok   tropper: sammensetning, roller, oppløsning og plass i kjøretøy');
