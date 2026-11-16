// Mål (site/dovre-fliser/spill/maal.js): hva som er nådd, kapittel og neste mål
const M = require('../../site/dovre-fliser/spill/maal.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const F = new Set(), T = { bygg: {}, diesel: 0, strøm: false, folk: 10, tre: 0, hogd: 0, revet: 0, tettsteder: 0 };
ok(M.vurder(T, F).length === 0 && M.stilling(F).kapittel === 0 && M.stilling(F).neste.id === 'brakke', 'nytt spill: ingen mål nådd, neste er brakka');
T.bygg.brakke = 1; ok(M.vurder(T, F).join() === 'brakke' && M.stilling(F).neste.id === 'tank' && M.stilling(F).gjort === 1, 'brakke bygget: neste er dieseltanken');
T.bygg.drivstofftank = 1; ok(M.vurder(T, F).length === 0, 'tank uten diesel teller ikke');
T.diesel = 500; T.strøm = true; T.tre = 25; ok(M.vurder(T, F).sort().join() === 'lager,strøm,tank' && M.stilling(F).kapittel === 1 && M.stilling(F).navn === 'Få oversikt', 'første kapittel ferdig: videre til «Få oversikt»');
T.bygg.brakke = 0; T.tre = 0; ok(M.vurder(T, F).length === 0 && F.has('brakke') && F.has('lager'), 'et nådd mål forblir nådd (brakka revet, lageret brukt)');
T.inne = true; T.går = true; ok(M.vurder(T, F).sort().join() === 'gå,inne' && M.stilling(F).kapittel === 1, 'mål i senere kapitler kan nås i forveien');
for (const m of M.ALLE) F.add(m.id); ok(M.stilling(F).kapittel === -1 && M.stilling(F).neste === null && M.stilling(F).totalt === M.ALLE.length, 'alt nådd');
ok(new Set(M.ALLE.map(m => m.id)).size === M.ALLE.length && M.ALLE.every(m => m.tekst && m.hjelp), 'alle mål har egen id, tekst og hjelp (' + M.ALLE.length + ')');
ok(M.vurder({}, new Set()).length === 0, 'tomt øyeblikksbilde gir ingen mål og ingen feil');
console.log(feil ? feil + ' FEIL' : 'alle måltestene ok'); process.exit(feil ? 1 : 0);
