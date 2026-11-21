// Regeltest for spill/forsvar-kamp.js (runde 13): node pipeline/fliser/test_forsvar_kamp.js
const K = require('../../site/dovre-fliser/spill/forsvar-kamp'), assert = require('assert');
// én kamp per sammenhengende ildkamp: skudd hvert 10. min i timevis er ÉN kamp (H: «1× Et lag er i ildkamp over ti ganger»)
let k = null, nye = 0, over = 0;
for (let t = 0; t <= 600; t += 1) { const aktiv = t % 10 === 0 && t <= 400; const r = K.steg(k, aktiv, t, 1, 2); k = r.K; if (r.ny) nye++; if (r.over) over++; }
assert.strictEqual(nye, 1, 'én kamp'); assert.strictEqual(over, 1, 'og den er over etter stillheten'); assert.strictEqual(k, null);
// stille i mer enn «slutt» minutter, så skudd igjen = ny kamp
k = null; nye = 0; for (const t of [0, 5, 5 + K.REGLER.slutt + 1]) { const r = K.steg(k, true, t, 0, 0); k = r.K; if (r.ny) nye++; } assert.strictEqual(nye, 2);
// tekstene
assert.strictEqual(K.tekst({ lag: 'Speidertropp 1', fiende: 'bygdevernet', sted: K.stedTekst({ by: 'Lærdalsøyri', inne: true }), mann: 7 }), '⚔ Speidertropp 1 er i kamp med bygdevernet i Lærdalsøyri (7 mann)');
assert.ok(/ingen radiokontakt/.test(K.tekst({ lag: 'A', fiende: 'røverne', kontakt: false })));
assert.strictEqual(K.stedTekst({ by: 'Vikeså', inne: false }), 'ved Vikeså'); assert.strictEqual(K.stedTekst({ meter: 3200, retning: 'sørvest' }), '3,2 km sørvest for leiren');
assert.strictEqual(K.fiendeTekst({ bygdevern: true }), 'bygdevernet'); assert.strictEqual(K.fiendeTekst({ raid: 2 }), 'røverne'); assert.strictEqual(K.fiendeTekst({ fraksjon: 'Kystalliansen' }), 'Kystalliansen'); assert.strictEqual(K.fiendeTekst(null), 'en fiende dere ikke ser');
assert.strictEqual(K.medÅrsak('Oddvar Aasen (Vaktlaget) er falt.', K.årsak('bygdevernet', 'i Vikeså')), 'Oddvar Aasen (Vaktlaget) falt for bygdevernet i Vikeså.');
assert.strictEqual(K.medÅrsak('Ola og Kari (Tropp 1) har falt.', K.årsak('røverne', '')), 'Ola og Kari (Tropp 1) falt for røverne.');
assert.strictEqual(K.medÅrsak('Noe annet.', 'falt for x'), 'Noe annet.');
assert.ok(/slått ut – 4 falt for bygdevernet/.test(K.sluttTekst({ lag: 'Speidertropp 1', fiende: 'bygdevernet', sted: 'i Lærdalsøyri', falne: 4, slåttUt: true })));
assert.ok(/mistet 2 mann \(falt for røverne\)/.test(K.sluttTekst({ lag: 'T', fiende: 'røverne', falne: 2 })));
console.log('ok   forsvar-kamp: én kamp per ildkamp, navn, fiende, sted og årsak');
// (runde 14, kritiker J) bølge 2 på «Vanlig» har flere mann enn bølge 1
{ const KV = require('../../site/dovre-fliser/spill/forsvar-kamp.js'), S = require('../../site/dovre-fliser/spill/spillet.js'), A = require('assert');
  const TR = (S.Trussel || S), o = s => ({ soldater: s, tunge: 0, dag: 1, faktor: 1 });
  for (const sold of [4, 6, 8, 12]) {
    const n1 = KV.bølgeLag(1, TR.lagFor(1, o(sold)), o(sold)).n, m1 = TR.menn(1, sold, n1, 1);
    const v2 = KV.bølgeLag(2, TR.lagFor(2, o(sold)), o(sold)), m2 = v2.tvunget ? KV.bølgeMenn(TR.menn(2, sold, 1, 1), v2.n) : TR.menn(2, sold, v2.n, 1);
    A.ok(v2.n * m2 > n1 * m1, `bølge 2 (${v2.n} × ${m2}) mot bølge 1 (${n1} × ${m1}) med ${sold} soldater`); A.ok(v2.n >= 2, 'to kanter'); }
  A.strictEqual(KV.bølgeLag(2, 1, { soldater: 4, faktor: .6 }).n, 1, 'Lett som før');
  A.strictEqual(KV.bølgeLag(2, 1, { soldater: 2, faktor: 1 }).n, 1, 'for få soldater: som før');
  A.strictEqual(KV.andreTekst('Folkefronten', 'Kystalliansen', 'ved Vikeså'), 'Folkefronten og Kystalliansen sloss ved Vikeså.'); A.ok(!/fienden/.test(KV.andreTekst('A', 'B', '')));
  console.log('ok   forsvar-kamp (runde 14): bølge 2 er større enn bølge 1, andre siders kamper'); }
