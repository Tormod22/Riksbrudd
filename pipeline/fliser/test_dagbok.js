// Dagbok (site/dovre-fliser/spill/dagbok.js): morgenrapporten
const D = require('../../site/dovre-fliser/spill/dagbok.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(D.dag(0) === 1 && D.dag(1439) === 1 && D.dag(1440) === 2 && D.dag(4000) === 3, 'ny dag hvert døgn fra spillstart');
const r = D.rapport({ dag: 3, folk: 11, moral: 62.4, matDager: 4.52, diesel: 320, dieselBruk: 160, kassa: 98.2e6, kassaFør: 100e6, mål: [3, 14] });
ok(r.tekst === 'Dag 3: 11 personer, moral 62. Mat til 4,5 døgn. Diesel 320 l (rekker ca. 2 døgn). Kassa 98,2 mill. kr (−1,8 mill. kr siste døgn). Mål 3 av 14.' && !r.varsler.length, 'vanlig rapport: ' + r.tekst);
const v = D.rapport({ dag: 9, folk: 4, moral: 20, matDager: 0, diesel: 0, dieselBruk: 50, kassa: 500000, kassaFør: 500000, mål: [14, 14] });
ok(v.varsler.join() === 'Dere er tomme for mat,Tomt for diesel,Moralen er farlig lav' && /^Dere er tomme for mat\. Tomt for diesel\. Moralen er farlig lav! Dag 9/.test(v.tekst) && !/Mål/.test(v.tekst) && /Kassa 500 000 kr\.$/.test(v.tekst), 'varsler først: ' + v.tekst);
const l = D.rapport({ dag: 2, folk: 1, moral: 50, matDager: Infinity, diesel: 0, dieselBruk: 0, kassa: 2e6, kassaFør: null });
ok(l.tekst === 'Dag 2: 1 person, moral 50. Maten dekkes av drivhusene. Kassa 2 mill. kr.', 'drivhus, ingen diesel, én person: ' + l.tekst);
ok(D.rapport({ dag: 2, folk: 5, moral: 50, matDager: 1.2, diesel: 100, dieselBruk: 90, kassa: 1e6, kassaFør: 2.5e6 }).varsler.join() === 'Lite mat,Lite diesel', 'lite mat og lite diesel varsles');
console.log(feil ? feil + ' FEIL' : 'alle dagboktestene ok'); process.exit(feil ? 1 : 0);
