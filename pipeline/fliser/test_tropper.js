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
console.log('ok   tropper: sammensetning, roller, oppløsning og plass i kjøretøy');
