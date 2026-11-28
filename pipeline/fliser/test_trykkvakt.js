// Test for spill/trykkvakt.js (klikk som ikke forsvinner når panelene tegnes på nytt): node pipeline/fliser/test_trykkvakt.js
// Byttingen i ekte DOM (Trykkvakt.bytt) prøves av vakta pipeline/fliser/vakter/ut8-kr-telefon.js.
const T = require('../../site/dovre-fliser/spill/trykkvakt.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
// en liten falsk node: merke, attributter og tekst
const node = (tag, at = {}, tekst = '') => ({ tagName: tag, textContent: tekst, attributes: Object.entries(at).map(([name, value]) => ({ name, value })) });
const a = node('BUTTON', { id: 'lokktillegg', class: 'på' }, 'Gi lønnstillegg (35 000 kr)');
const b = node('BUTTON', { id: 'lokktillegg' }, ' Gi  lønnstillegg (35 000 kr) ');
const c = node('BUTTON', { id: 'lokktillegg' }, 'Gi lønnstillegg (36 000 kr)');
ok(T.likKnapp(a, b), 'samme knapp tegnet på nytt (ny klasse, annen luft i teksten) regnes som lik');
ok(!T.likKnapp(a, c), 'en knapp med et annet beløp er ikke lik (klikket skal ikke gå til et annet tilbud)');
ok(!T.likKnapp(a, a), 'en knapp er ikke «lik» seg selv (da gikk klikket fram som vanlig)');
const s1 = node('BUTTON', { 'data-søker': '1' }, 'Ansett'), s2 = node('BUTTON', { 'data-søker': '2' }, 'Ansett');
ok(!T.likKnapp(s1, s2), 'to «Ansett» for ulike søkere (data-felt) er ikke like');
ok(T.ident(node('DIV', { 'data-søker': '1', class: 'x' })) !== T.ident(node('DIV', { 'data-søker': '2', class: 'x' })), 'boksene til to søkere har ulik ident (byttes helt, beholdes ikke)');
ok(T.ident(node('DIV', { class: 'x' })) === T.ident(node('DIV', { class: 'y' })), 'klasse og stil teller ikke i identen');
ok(T.REGLER.hold >= 200 && T.REGLER.hold <= 600, 'panelet venter ' + T.REGLER.hold + ' ms etter at fingeren slapp');
ok(T.nøkkel(null) === '' && !T.likKnapp(null, a), 'tomme noder gir ingen treff');
console.log(feil ? `${feil} FEIL` : 'Alle tester ok'); process.exit(feil ? 1 : 0);
