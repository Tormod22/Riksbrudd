// Test av reglene i spill/loggdemp.js (runde 8: like meldinger slås sammen, rutine og vær holdes tilbake, tips bare første gang).
// Kjør: node pipeline/fliser/test_loggdemp.js
const D = require('../../site/dovre-fliser/spill/loggdemp.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
// en liten logg som i index.html: vurder -> fjern gammel linje -> legg øverst
function logg() { const L = [], d = D.lag(); return { L, d, inn(t, nå) { const r = d.vurder(t, L, nå); if (!r) return null; if (r.fjern >= 0) L.splice(r.fjern, 1); L.unshift(r.tekst); L.length = Math.min(L.length, 6); return r; } }; }

// 1: samme melding fire ganger blir én linje med ×4
{ const g = logg(); for (let i = 0; i < 4; i++) g.inn('Kamp om Bryne: ingen tar tettstedet mens begge sider er der.', 100 + i * 10);
  ok(g.L.length === 1 && g.L[0] === 'Kamp om Bryne: ingen tar tettstedet mens begge sider er der. (×3)', 'fire like blir én linje med «(×3)» (×4 vises ikke på nytt): ' + g.L.join(' | ')); }
// (løkka r1) gjentakelser mellom trinnene (2, 3, 5, 10, 25 …) flyttes ikke øverst igjen: 22 like gir bare fem visninger
{ const g = logg(); let vist = 0; g.inn('Noe annet skjedde.', 0);
  for (let i = 0; i < 22; i++) if (g.inn('Leiesoldater 1: Under ild!', 1 + i)) vist++;
  ok(vist === 5 && g.L[0] === 'Leiesoldater 1: Under ild! (×10)' && g.L.length === 2, '22 like: vist 5 ganger (1, ×2, ×3, ×5, ×10), ikke 22: ' + vist + ' | ' + g.L.join(' | ')); }
// (løkka r1, kritiker I: «Speidertropp 1 har lastet nødlageret. (×22)») samme hendelse bare én gang per døgn
{ const g = logg(); const t = 'Speidertropp 1 har lastet nødlageret. Gi troppen ordre hjem til leiren – da betaler Bygdelaget.';
  const r = [g.inn(t, 0), g.inn(t, 0.5), g.inn(t, 300), g.inn(t, 1500)].map(x => (x ? 1 : 0)).join('');
  ok(r === '1001' && !/×/.test(g.L[0]), 'nødlageret lastet: én gang per døgn (' + r + ')'); }
{ const g = logg(); g.inn('Ravnsunds lastebil er under ild fra fienden (20 m)!', 5); g.inn('Noe annet.', 6); g.inn('Ravnsunds lastebil er under ild fra fienden (35 m)!', 7);
  ok(g.L.length === 2 && g.L[0] === 'Ravnsunds lastebil er under ild fra fienden (35 m)! (×2)' && g.L[1] === 'Noe annet.', 'tallene regnes ikke med, nyeste tekst øverst'); }
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
// R2-løkka: statusmeldinger om ett lag gjentas ikke («planlegger rute … (×10)», «er framme. (×5)»), men et annet lag meldes
{ const g = logg(); let n = 0; for (let i = 0; i < 10; i++) if (g.inn('Speidertropp 1: planlegger rute …', i * 5)) n++;
  ok(n === 1 && !g.L.some(l => /×/.test(l)), `«planlegger rute …» ti ganger på 45 min: vist ${n} gang, uten ×n`);
  ok(!!g.inn('Speidertropp 2: planlegger rute …', 50), 'et annet lag meldes'); let f = 0; for (let i = 0; i < 5; i++) if (g.inn('Speidertropp 1 er framme.', 60 + i * 20)) f++;
  ok(f === 1, `«er framme» fem ganger: vist ${f} gang`); ok(!!g.inn('Speidertropp 1 er framme.', 60 + 4 * 20 + 200), 'etter en lang pause meldes det igjen'); }
{ const d = D.lag(); ok(d.vurder('Motstanderne samler styrker de første 3 døgnene og tar ingen tettsteder ennå.', [], 10, true) === null, 'etter omlasting: «Motstanderne samler styrker …» står ikke på nytt'); }
// (kritikerløkka r3) avlyttinger fra radiomasten innen en time står på én linje med antallet
{ const g = logg(); g.inn('Radiomasten fanget opp samband: Røvere 1 skal angripe leiren. Omtrentlig sted er merket i kartet.', 100);
  g.inn('Noe annet.', 101); g.inn('Radiomasten fanget opp samband: Ravnsund 2 flytter mot Dombås. Omtrentlig sted er merket i kartet.', 120);
  g.inn('Radiomasten fanget opp samband: Mosevakt 1 graver seg ned. Omtrentlig sted er merket i kartet.', 150);
  const r = g.L.filter(l => /Radiomasten/.test(l));
  ok(r.length === 1 && /\(3 ganger siste time\) – sist: Mosevakt 1/.test(r[0]), 'tre avlyttinger på en time: én linje: ' + g.L.join(' | '));
  g.inn('Radiomasten fanget opp samband: Røvere 2 går hjem. Omtrentlig sted er merket i kartet.', 200);
  ok(/^Radiomasten fanget opp samband: Røvere 2 går hjem\./.test(g.L[0]), 'neste time: ny linje uten antall: ' + g.L[0]); }
// (r3) handelsruta: et skifte meldes først når det har stått i 90 min, og blaff fram og tilbake meldes ikke
{ const g = logg(); ok(g.inn('Handelsruta fra Gjøvik er truet: fiender i nærheten. Bare halvparten kommer fram – sett et lag til å vokte ruta.', 100) === null, 'truet holdes tilbake først');
  ok(g.inn('Handelsruta fra Gjøvik er åpen igjen.', 130) === null && g.d.modne(400).length === 0, 'åpen igjen etter 30 min: ingenting meldes (blaff)');
  g.inn('Handelsruta fra Gjøvik er STENGT av fiender. Ingenting kommer fram.', 500);
  ok(g.d.modne(560).length === 0, 'STENGT: ikke meldt etter 60 min'); const m = g.d.modne(600);
  ok(m.length === 1 && /STENGT/.test(m[0]), 'STENGT meldes når det har stått i 90 min'); ok(!!g.inn(m[0], 600), '… og slipper gjennom loggen');
  ok(g.inn('Handelsruta fra Gjøvik er STENGT av fiender. Ingenting kommer fram.', 700) === null && g.d.modne(900).length === 0, 'samme tilstand igjen: meldes ikke på nytt');
  g.inn('Handelsruta fra Gjøvik er åpen igjen.', 1000); ok(g.d.modne(1100).length === 1, 'åpen igjen meldes når den har stått'); }
console.log(feil ? feil + ' FEIL' : 'alle tester ok'); process.exit(feil ? 1 : 0);
