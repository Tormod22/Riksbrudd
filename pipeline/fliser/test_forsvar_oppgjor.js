// Test av spill/forsvar-oppgjor.js (runde 5): døgnoppgjøret om morgenen (node pipeline/fliser/test_forsvar_oppgjor.js)
const O = require('../../site/dovre-fliser/spill/forsvar-oppgjor.js');
let feil = 0; const ok = (b, t, x) => { if (!b) { feil++; console.log('FEIL:', t, x || ''); } else console.log('ok  ', t, x ? '– ' + x : ''); };
const før = { bølge: 2, aktiv: 0, herjet: 0, friske: 8, såret: 0, falne: 0, slåttUt: 0, bygg: [{ id: 1, navn: 'Brakke', hp: .4 }, { id: 2, navn: 'Aggregat', hp: 1 }, { id: 3, navn: 'Vakttårn', hp: 1 }, { id: 4, navn: 'Lagertelt', hp: 1 }], hus: 3, folk: 6, mat: 30, matDøgn: 5 };
const rolig = O.tekst(før, { ...før });
ok(rolig.hendte === 0 && /rolig døgn/.test(rolig.tekst), 'ingenting skjedde', rolig.tekst);
const nå = { bølge: 3, aktiv: 0, herjet: 0, friske: 5, såret: 2, falne: 1, slåttUt: 1, bygg: [{ id: 2, navn: 'Aggregat', hp: .7 }, { id: 3, navn: 'Vakttårn', hp: 1 }], hus: 5, folk: 5, mat: 12, matDøgn: 1.5 };
const r = O.tekst(før, nå);
ok(/^Siste døgn: Bølge 3 slått tilbake/.test(r.tekst), 'bølgen slått tilbake', r.tekst);
ok(/2 nye sårede, 1 falt/.test(r.tekst) && /Ett lag er slått ut/.test(r.tekst), 'sårede, falne og lag');
ok(/Brakke ødelagt/.test(r.tekst) && !/Lagertelt/.test(r.tekst) && /1 bygg skadet/.test(r.tekst), 'brakka (skadet før) ødelagt, lagerteltet (helt) revet nevnes ikke, aggregatet skadet');
ok(/2 hus gjennomsøkt/.test(r.tekst) && /1 har dratt/.test(r.tekst), 'hus og folk');
ok(/Mat til 1,5 døgn – kjøp eller skaff mat/.test(r.tekst), 'maten med råd når den er lav');
const h = O.tekst({ ...før, bølge: 3, aktiv: 3 }, { ...før, bølge: 4, aktiv: 4, herjet: 1, matDøgn: null });
ok(/herjet i leiren og tok et bytte/.test(h.tekst) && /Bølge 4 pågår/.test(h.tekst) && !/slått tilbake/.test(h.tekst) && !/Mat til/.test(h.tekst), 'herjet, ny bølge pågår, uten mat (dagboka har den)', h.tekst);
ok(O.tekst(null, nå) === null, 'uten bilde fra i går: ingenting');
console.log(feil ? `${feil} FEIL` : 'alle tester ok'); process.exit(feil ? 1 : 0);
