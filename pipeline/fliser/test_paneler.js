// Test av reglene i spill/paneler.js (uten DOM): node pipeline/fliser/test_paneler.js
const P = require('../../site/dovre-fliser/spill/paneler.js'); let feil = 0;
const ok = (b, t) => { if (!b) { feil++; console.log('FEIL ' + t); } else console.log('ok   ' + t); };
ok(P.plass('leirmeny') === 'venstre' && P.plass('verdenpanel') === 'høyre' && P.plass('personkort') === 'midt' && P.plass('finnesikke') === null, 'panelene har hver sin plass');
ok(P.viker('region', ['leirmeny', 'karakterark', 'region'], false).join() === 'leirmeny', 'PC: et nytt panel til venstre lukker det som sto til venstre, ikke det til høyre');
ok(P.viker('sjopanel', ['leirmeny', 'verdenpanel', 'personkort', 'sjopanel'], false).join() === 'verdenpanel', 'PC: høyre viker for høyre');
ok(P.viker('sjopanel', ['leirmeny', 'verdenpanel', 'personkort', 'sjopanel'], true).join() === 'leirmeny,verdenpanel', 'telefon: venstre og høyre er samme plass, kortet i midten står');
ok(P.viker('personkort', ['leirmeny', 'evpanel', 'personkort'], true).join() === 'evpanel', 'kortene i midten viker bare for hverandre');
ok(P.viker('hvasomhelst', ['leirmeny'], false).length === 0, 'et ukjent panel lukker ingenting');
const alle = Object.values(P.PLASS).flat(); ok(new Set(alle).size === alle.length, 'ingen panel står på to plasser');
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
