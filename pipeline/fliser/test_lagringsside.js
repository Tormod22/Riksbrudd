// Test for spill/lagringsside.js (hver side sitt lagrede spill, runde 7): node pipeline/fliser/test_lagringsside.js
'use strict';
const LS = require('../../site/dovre-fliser/spill/lagringsside.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// sidene og endingene
ok(LS.side('/dovre-fliser') === 'dovre' && LS.side('/dovre-fliser/') === 'dovre' && LS.side('/norge') === 'norge' && LS.side('/norge/') === 'norge' && LS.side('/rogaland') === 'rogaland', 'adressen gir siden');
ok(LS.side('/') === 'dovre' && LS.side('') === 'dovre' && LS.side('/norgeX') === 'dovre', 'ukjente adresser regnes som Dovre-siden (som før)');
ok(LS.tilRå('riksbrudd-k1', 'norge') === 'riksbrudd-k1@norge' && LS.tilRå('riksbrudd-k1', 'dovre') === 'riksbrudd-k1' && LS.tilRå('riksbrudd-k1@norge', 'norge') === 'riksbrudd-k1@norge', 'endingen legges til én gang');
ok(LS.tilRå('riksbrudd-k1@rogaland', 'norge') === 'riksbrudd-k1@rogaland' && LS.tilRå('annet', 'norge') === 'annet', 'andre siders nøkler og fremmede nøkler røres ikke');
ok(LS.egen('riksbrudd-k2', 'dovre') && !LS.egen('riksbrudd-k2@norge', 'dovre') && LS.egen('riksbrudd-k2@norge', 'norge') && !LS.egen('riksbrudd-k2', 'norge') && !LS.egen('x', 'dovre'), 'hvilken side en nøkkel hører til');
ok(JSON.stringify(LS.hvem('riksbrudd-maal@rogaland')) === '{"navn":"riksbrudd-maal","side":"rogaland"}', 'hvem() gir navnet uten ending');

// hva som er spill og hva som er innstillinger
ok(LS.erSpill('riksbrudd-k2', '{"bygg":[]}') && LS.erSpill('riksbrudd-maal', '{"leir":"1,2","ferdige":[]}'), 'JSON-objekter er spill');
ok(!LS.erSpill('riksbrudd-filter', 'vhs') && !LS.erSpill('riksbrudd-lyd', 'på') && !LS.erSpill('riksbrudd-ukjent', '1'), 'enkle verdier er innstillinger');
ok(!LS.erSpill('riksbrudd-maler', '[{"a":1}]') && !LS.erSpill('riksbrudd-leirdeler', '{"a":true}') && !LS.erSpill('riksbrudd-flyt', '{"auto":true}'), 'kjente innstillinger i JSON følger ikke med');
ok(!LS.erSpill('riksbrudd-plass-1', '{"a":1}') && !LS.erSpill('riksbrudd-k1-utkast', '{"steg":2}') && !LS.erSpill('riksbrudd-sider', '"x"') && !LS.erSpill('riksbrudd-flytt', '{}'), 'lagringsplassene og utkastet er ikke en del av spillet');
ok(!LS.erSpill('riksbrudd-k2', 'ikke json') && !LS.erSpill('riksbrudd-k2@norge', '{}') && !LS.erSpill('annet', '{}'), 'ødelagt verdi, ending eller fremmed nøkkel');

// delingen av det gamle felles spillet
const k1 = (x, y) => JSON.stringify({ versjon: 1, ferdig: true, leir: { x, y }, karakter: {}, fraksjon: { navn: 'Har' } });
const dovreSpill = { 'riksbrudd-k1': k1(196400, 6898900), 'riksbrudd-k2': '{"bygg":[1]}', 'riksbrudd-filter': 'vhs', 'riksbrudd-k1-utkast': '{"steg":2}', 'riksbrudd-k1@rogaland': k1(15607, 6622779) };
let p = LS.delPlan(dovreSpill);
ok(p && p.merke && p.fjern.length === 0, 'leir på Dovre: ingenting tas bort');
ok(p.kopier.length === 3 && p.kopier.every(([fra, til]) => til === fra + '@norge') && !p.kopier.some(([fra]) => /rogaland|utkast/.test(fra)), '/norge får en kopi av spillet og innstillingene (ikke Rogaland, ikke utkastet)');
const norgeSpill = { 'riksbrudd-k1': k1(15607, 6622779), 'riksbrudd-k2': '{"bygg":[1]}', 'riksbrudd-verden': '{"leir":{"x":15607,"y":6622779}}', 'riksbrudd-lyd': 'på' };
p = LS.delPlan(norgeSpill);
ok(p.kopier.length === 4 && p.fjern.length === 3 && !p.fjern.includes('riksbrudd-lyd'), 'leir utenfor Dovre: spillet flyttes til /norge, innstillingene blir');
ok(LS.delPlan({ ...norgeSpill, 'riksbrudd-sider': '2026-11-20' }) === null, 'delingen gjøres bare én gang');
p = LS.delPlan({ ...norgeSpill, 'riksbrudd-k1@norge': k1(1, 2) });
ok(p.kopier.length === 0 && p.fjern.length === 0, 'har /norge alt et spill, røres ingenting');
p = LS.delPlan({ 'riksbrudd-lyd': 'av' });
ok(p.kopier.length === 1 && p.fjern.length === 0, 'bare innstillinger: kopieres, ingenting tas bort');
p = LS.delPlan({});
ok(p && p.merke && !p.kopier.length && !p.fjern.length, 'tom lagring: bare merket settes');
ok(LS.leirAv(JSON.stringify({ ferdig: false, leir: { x: 1, y: 2 } })) === null && LS.leirAv('x') === null, 'et uferdig eller ødelagt spill har ingen leir');
ok(LS.påDovre({ x: 196400, y: 6898900 }) && !LS.påDovre({ x: 15607, y: 6622779 }), 'Dovre-rammen');

// selvtest (årsak H): en plan som feilaktig flytter et Dovre-spill, skal fanges
const feilPlan = { ...LS.delPlan(dovreSpill) }; feilPlan.fjern = ['riksbrudd-k1'];
ok(feilPlan.fjern.length !== LS.delPlan(dovreSpill).fjern.length, 'selvtest: en feil plan skiller seg fra den riktige');

console.log(feil ? `${feil} FEIL` : 'alle ok'); process.exit(feil ? 1 : 0);
