// Test av reglene i spill/paneler.js (uten DOM): node pipeline/fliser/test_paneler.js
const P = require('../../site/dovre-fliser/spill/paneler.js'); let feil = 0;
const ok = (b, t) => { if (!b) { feil++; console.log('FEIL ' + t); } else console.log('ok   ' + t); };
ok(P.plass('leirmeny') === 'venstre' && P.plass('stridpanel') === 'høyre' && P.plass('personkort') === 'midt' && P.plass('finnesikke') === null, 'panelene har hver sin plass');
ok(P.viker('region', ['leirmeny', 'stridpanel', 'region'], false).join() === 'leirmeny', 'PC: et nytt panel til venstre lukker det som sto til venstre, ikke det til høyre');
ok(P.viker('sekk', ['leirmeny', 'stridpanel', 'personkort', 'sekk'], false).join() === 'stridpanel', 'PC: høyre viker for høyre');
ok(P.viker('sjopanel', ['leirmeny', 'verdenpanel', 'personkort', 'sjopanel'], true).join() === 'leirmeny,verdenpanel', 'telefon: venstre og høyre er samme plass, kortet i midten står');
ok(P.viker('personkort', ['leirmeny', 'evpanel', 'personkort'], true).join() === 'evpanel', 'kortene i midten viker bare for hverandre');
ok(P.viker('hvasomhelst', ['leirmeny'], false).length === 0, 'et ukjent panel lukker ingenting');
ok(P.plass('panel') === 'venstre' && P.viker('panel', ['folkmeny', 'stridpanel', 'panel'], false).join() === 'folkmeny', 'lagpanelet står til venstre: Folk viker når et lag velges (de lå oppå hverandre)');
ok(P.viker('leirmeny', ['panel', 'leirmeny'], false).join() === 'panel', 'Leir-menyen lukker lagpanelet');
ok(P.plass('flytgruppe') === 'venstre' && P.viker('flytgruppe', ['folkmeny', 'flytgruppe'], false).join() === 'folkmeny' && P.plass('forklaring') === 'høyre', 'gruppa av lag står nede til venstre, tegnforklaringen til høyre');
const alle = Object.values(P.PLASS).flat(); ok(new Set(alle).size === alle.length, 'ingen panel står på to plasser');
// RUNDE 6: alt fra bunnmenyen til venstre (Leir, Folk, Tropper, Krig, Deg, Region, Verden, Sjø), det som hører til et panel til høyre
ok(['leirmeny', 'folkmeny', 'tropppanel', 'krig', 'karakterark', 'region', 'verdenpanel', 'sjopanel'].every(id => P.plass(id) === 'venstre') && ['stridpanel', 'sekk', 'krigpanel', 'forklaring'].every(id => P.plass(id) === 'høyre'), 'runde 6: bunnmenyen åpner til venstre, tilleggspanelene til høyre');
ok(P.viker('karakterark', ['tropppanel', 'sekk', 'karakterark'], false).join() === 'tropppanel', 'runde 6: Deg lukker Tropper (samme plass), ikke sekken');
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
