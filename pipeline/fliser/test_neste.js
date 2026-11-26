// Test av reglene i spill/neste.js (løkka r1: én prioritert liste for Neste-lappen og «Nå» i Leir → Mål).
// Kjør: node pipeline/fliser/test_neste.js
'use strict';
const N = require('../../site/dovre-fliser/spill/neste.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
const k = (slag, tekst, x) => ({ slag, tekst, ...(x || {}) });
{ const L = N.sorter([k('mål', 'Bygg en brakke'), k('tilbud', 'Velg en kontrakt'), k('opplæring', 'Mer forsvar før dag 4'), k('tråd', 'Send troppen til Otta'), k('scenario', 'Ta Otta')]);
  ok(L.map(q => q.slag).join(',') === 'tråd,opplæring,scenario,tilbud,mål', 'rekkefølgen: første kontrakt, opplæring, scenario, tilbud, mål (' + L.map(q => q.slag).join(',') + ')'); }
{ const L = N.sorter([k('opplæring', 'Ha mat til tre døgn'), k('kontrakt', 'Hold Kvam', { igjen: 120 })]);
  ok(L[0].slag === 'kontrakt' && L[0].navn === 'Kontrakt', 'en kontrakt med kort frist går foran opplæringen'); }
{ const L = N.sorter([k('opplæring', 'Ha mat til tre døgn'), k('kontrakt', 'Hold Kvam', { igjen: 2000 })]);
  ok(L[0].slag === 'opplæring', 'en kontrakt med lang frist står etter opplæringen'); }
{ const L = N.sorter([k('opplæring', 'Ha mat til tre døgn', { utsatt: true }), k('tilbud', 'Velg en kontrakt'), k('mål', 'Bygg kontrollrommet')]);
  ok(L.map(q => q.slag).join(',') === 'tilbud,opplæring,mål', 'et utsatt opplæringssteg synker under tilbudene'); }
{ const L = N.sorter([k('angrep', 'Røverne angriper'), k('tråd', 'Ta kontrakten')]); ok(L[0].slag === 'angrep', 'et angrep står alltid først'); }
{ const L = N.sorter([k('opplæring', 'Ha mat til tre døgn'), k('mål', 'Ha mat til tre døgn.')]); ok(L.length === 1 && L[0].slag === 'opplæring', 'samme tekst fra to systemer står én gang'); }
{ const L = N.sorter([null, k('mål', ''), ...Array.from({ length: 10 }, (_, i) => k('mål', 'Mål ' + i))]); ok(L.length === N.REGLER.maks, 'tomme kilder tas bort, høyst ' + N.REGLER.maks + ' linjer'); }
console.log(feil ? feil + ' FEIL' : 'alle testene for neste.js er ok'); process.exit(feil ? 1 : 0);
