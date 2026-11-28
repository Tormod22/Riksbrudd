// Test av reglene i spill/trinn.js (fase Ø0: de fire trinnene Overleve → Leverandør → Makt i regionen → Konsern).
// Kjør: node pipeline/fliser/test_trinn.js
'use strict';
const T = require('../../site/dovre-fliser/spill/trinn.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
{ const R = T.regn({}); ok(R.nr === 1 && R.trinn.id === 'overleve', 'et nytt spill står på trinn 1 Overleve');
  ok(R.neste && R.neste.nr === 2 && R.mangler.length === 2, 'to krav mangler til Leverandør');
  ok(R.steg && /første kontrakten/.test(R.steg.tekst) && R.steg.om === 'kontrakt', 'neste steg er den første kontrakten (' + (R.steg && R.steg.tekst) + ')'); }
{ const R = T.regn({ levert: 1, bygg: 1 }); ok(R.nr === 1 && R.steg.om === 'leir' && /2 bygg til/.test(R.steg.tekst), 'kontrakten levert, men for få bygg: bygg to til (' + R.steg.tekst + ')'); }
{ const R = T.regn({ levert: 1, bygg: 3, nivå: 1 }); ok(R.nr === 2 && R.trinn.navn === 'Leverandør', 'første kontrakt og tre bygg gir trinn 2'); ok(R.steg && R.steg.id === 'nivå', 'deretter: nivået'); }
{ const R = T.regn({ levert: 5, bygg: 6, nivå: 3, tettsteder: 0 }); ok(R.nr === 2 && R.steg.id === 'tettsteder' && /Få et tettsted/.test(R.steg.tekst), 'nivå 3 uten tettsted: et tettsted på laget'); }
{ const R = T.regn({ levert: 5, bygg: 6, nivå: 3, tettsteder: 1 }); ok(R.nr === 3 && R.trinn.id === 'makt', 'nivå 3 og ett tettsted gir Makt i regionen'); }
{ const R = T.regn({ levert: 12, bygg: 9, nivå: 4, tettsteder: 3 }); ok(R.nr === 4 && !R.neste && !R.steg && R.krav.length === 0, 'nivå 4 og tre tettsteder gir Konsern, siste trinn'); }
{ const R = T.regn({ levert: 0, bygg: 9, nivå: 4, tettsteder: 3 }); ok(R.nr === 1, 'trinnene tas i rekkefølge: uten levert kontrakt er du på trinn 1 uansett'); }
{ const R = T.regn({ levert: 5, bygg: 6, nivå: 3, tettsteder: 0 }, 3); ok(R.nr === 3 && R.regnet === 2, 'et trinn dere har nådd, mister dere ikke (husket 3, regnet 2)'); }
{ const R = T.regn({ levert: 1, bygg: 3 }, 9); ok(R.nr === 4, 'et husket trinn over 4 holdes på 4'); }
{ const R = T.regn({ levert: '2', bygg: NaN, nivå: null }); ok(R.nr === 1 && R.steg.id === 'bygg', 'rare tall tåles'); }
ok(T.tekst(T.regn({ levert: 1, bygg: 3 })) === 'Trinn 2 av 4 · Leverandør – et selskap folk stoler på', 'teksten om trinnet');
ok(T.REGLER.TRINN.map(t => t.navn).join(' → ') === 'Overleve → Leverandør → Makt i regionen → Konsern', 'de fire trinnene fra planen');
console.log(feil ? feil + ' FEIL' : 'alle testene for trinn.js er ok'); process.exit(feil ? 1 : 0);
