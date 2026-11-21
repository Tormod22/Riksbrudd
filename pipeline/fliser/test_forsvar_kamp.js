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
