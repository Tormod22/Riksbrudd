// Test av reglene i spill/loggdemp.js (runde 8: like meldinger slås sammen, rutine og vær holdes tilbake, tips bare første gang).
// Kjør: node pipeline/fliser/test_loggdemp.js
const D = require('../../site/dovre-fliser/spill/loggdemp.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
// en liten logg som i index.html: vurder -> fjern gammel linje -> legg øverst
function logg() { const L = [], d = D.lag(); return { L, d, inn(t, nå) { const r = d.vurder(t, L, nå); if (!r) return null; if (r.fjern >= 0) L.splice(r.fjern, 1); L.unshift(r.tekst); L.length = Math.min(L.length, 6); return r; } }; }

// 1: samme melding fire ganger blir én linje med ×4
{ const g = logg(); for (let i = 0; i < 4; i++) g.inn('Kamp om Bryne: ingen tar tettstedet mens begge sider er der.', 100 + i * 10);
  ok(g.L.length === 1 && g.L[0] === 'Kamp om Bryne: ingen tar tettstedet mens begge sider er der. (×4)', 'fire like blir én linje med «(×4)»: ' + g.L.join(' | ')); }
{ const g = logg(); g.inn('Kystalliansens lastebil er under ild fra fienden (20 m)!', 5); g.inn('Noe annet.', 6); g.inn('Kystalliansens lastebil er under ild fra fienden (35 m)!', 7);
  ok(g.L.length === 2 && g.L[0] === 'Kystalliansens lastebil er under ild fra fienden (35 m)! (×2)' && g.L[1] === 'Noe annet.', 'tallene regnes ikke med, nyeste tekst øverst'); }
{ const g = logg(); g.inn('Kamp om Bryne: ingen tar tettstedet mens begge sider er der.', 0); g.inn('Kamp om Bryne: ingen tar tettstedet mens begge sider er der.', 500);
  ok(g.L.length === 2 && !/×/.test(g.L[0]), 'etter vinduet (' + D.REGLER.vindu + ' min) er det en ny melding'); }
ok(D.nøkkel('Brakke bestilt: 4 mill. kr, 1,7 t byggetid.') === D.nøkkel('Brakke bestilt: 5 mill. kr, 2 t byggetid. (×2)'), 'nøkkelen ser bort fra tall og ×n');
// 2: rutine
{ const g = logg(); const a = g.inn('Du drikker deg utørst i leiren.', 0), b = g.inn('Du drikker deg utørst i leiren.', 300), c = g.inn('Du spiser i leiren (én rasjon av leirens mat).', 400), e = g.inn('Du drikker deg utørst i leiren.', 1500);
  ok(a && !b && !c && e, 'egen mat og drikke høyst én gang per døgn'); }
{ const g = logg(); const t = m => 'Hogstlaget fant skog ' + m + ' m sørøst for leiren og har begynt å hogge (gir ca. 22,5 m³ tre). Folk på «Frakt» bærer treet til leiren. Vil du velge stedet selv: Leir → Lager → «Hogst …».';
  const a = g.inn(t(450), 0), b = g.inn('Hogstfeltet er hogd: 21,5 m³ tre.', 200), c = g.inn(t(600), 360), e = g.inn(t(1000), 600);
  ok(a && /Vil du velge/.test(a.tekst) && /Frakt/.test(a.tekst), 'første hogstmelding med tips og forklaring');
  ok(!b && !c, 'hogst holdes tilbake innen ' + D.REGLER.RUTINE[1].hver + ' min');
  ok(e && !/Vil du velge/.test(e.tekst) && !/Frakt/.test(e.tekst) && /^Hogstlaget fant skog 1000 m/.test(e.tekst), 'senere hogstmelding uten tips og uten forklaringen som alt er gitt: ' + (e && e.tekst)); }
// 3: været
{ const g = logg(); const r = [
    g.inn('Det begynner å regne. Sikten er 95 % av vanlig.', 0), g.inn('Det klarner opp. Sikten er 70 % av vanlig.', 60), g.inn('Det skyer over.', 120),
    g.inn('Tåka kommer sigende. Sikten er 40 % av vanlig.', 200), g.inn('Tåka kommer sigende. Sikten er 40 % av vanlig.', 260), g.inn('Det begynner å regne.', 300),
    g.inn('Det klarner opp.', 400), g.inn('Det klarner opp.', 500), g.inn('Det blåser opp til storm.', 900), g.inn('Været: regn.', 901)];
  ok(r.map(x => (x ? 1 : 0)).join('') === '0001001011', 'været: bare tåke/storm/snø og «klarner opp» etter et stort skifte (' + r.map(x => (x ? 1 : 0)).join('') + ')'); }
// 4: tips
{ const g = logg(); const a = g.inn('Tips: åpne «Leir» – øverst står neste mål.', 0), b = g.inn('Tips: åpne «Leir» – øverst står neste mål.', 5000); ok(a && !b, 'et tips alene vises bare første gang'); }
{ const tips = new Set(['Vil du velge stedet selv: Leir → Lager → «Hogst …».']), d = D.lag(D.REGLER, tips);
  const r = d.vurder('Hogstlaget fant skog 70 m nordøst for leiren. Vil du velge stedet selv: Leir → Lager → «Hogst …».', [], 0); ok(r && r.tekst === 'Hogstlaget fant skog 70 m nordøst for leiren.', 'tips som er vist før (lagret), tas bort'); }
// den første setningen tas aldri bort, og setninger med tall står
{ const g = logg(); g.inn('Lageret er fullt. Bygg lagertelt eller containere for å få mer plass.', 0); const r = g.inn('Brakka er ferdig. Bygg lagertelt eller containere for å få mer plass.', 10);
  ok(r && r.tekst === 'Brakka er ferdig.', 'en forklaring som alt er vist, tas bort fra en ny melding'); const s = g.inn('Bygg lagertelt eller containere for å få mer plass.', 20); ok(!!s && !/×/.test(s.tekst) || /×2/.test(s.tekst), 'en melding som bare er forklaringen, står likevel (som første setning)'); }
{ const g = logg(); g.inn('Røvere 1.1 skader brakke i leiren! Dere mistet 3 m³ tre.', 0); const r = g.inn('Røvere 1.2 skader verksted i leiren! Dere mistet 3 m³ tre.', 1); ok(r && /mistet 3/.test(r.tekst), 'setninger med tall tas ikke bort'); }
ok(D.setninger('Det begynner å regne. Sikten er 95 % av vanlig.').length === 2 && D.setninger('Brakke bestilt: 4 mill. kr, 1,7 t byggetid.').length === 1, 'setningene deles riktig (også «4 mill. kr, 1,7 t»)');
ok(logg().d.vurder('', [], 0) === null && logg().d.vurder(null, [], 0) === null, 'tom melding vises ikke');
console.log(feil ? feil + ' FEIL' : 'alle tester ok'); process.exit(feil ? 1 : 0);
