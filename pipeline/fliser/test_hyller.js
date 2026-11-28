// Test av spill/hyller.js – tingene på hyllene (ut9-mobler). Kjør: node pipeline/fliser/test_hyller.js
const H = require('../../site/dovre-fliser/spill/hyller.js');
const Ting = require('../../site/dovre-fliser/spill/ting.js');
const TL = require('../../site/dovre-fliser/spill/tinglager.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL:', t); } };

// 1) ingen ting -> ingen klosser; full hylle -> mange, men under taket
ok(H.varer({ l: 1.2, d: .4, nivåer: [.1, .5], hv: .3, fyll: 0, f: .3 }).length === 0, 'tom hylle skal ikke ha klosser');
const full = H.varer({ l: 1.2, d: .4, nivåer: [.1, .5, .9, 1.3, 1.7], hv: .34, fyll: 1, f: .42, kat: [{ kat: 'mat', andel: 1 }] });
ok(full.length >= 10 && full.length <= H.REGLER.maksIAlt, 'full hylle: ' + full.length + ' klosser');
// 2) mer fylling -> flere klosser (stort sett)
const n = f => H.varer({ l: 1.8, d: .5, nivåer: [.1, .52, .94, 1.36, 1.78], hv: .36, fyll: f, f: .77 }).length;
ok(n(.2) < n(.6) && n(.6) <= n(1), 'fyllingen styrer antallet: ' + [n(.2), n(.6), n(1)]);
// 3) klossene står innenfor hylla og på nivåene, under neste nivå
for (const f of [.11, .5, .93]) for (const q of H.varer({ l: 1.2, d: .34, nivåer: [.08, .48, .88], hv: .34, fyll: 1, f })) {
  ok(q[0] >= -.6 - 1e-9 && q[1] <= .6 + 1e-9, 'innenfor i lengden ' + q.slice(0, 2));
  ok(q[2] >= -.17 - 1e-9 && q[3] <= .17 + 1e-9, 'innenfor i dybden ' + q.slice(2, 4));
  ok([.08, .48, .88].includes(q[4]) && q[5] - q[4] <= .34 + 1e-9, 'står på et nivå og under neste');
}
// 4) fast per møbel: samme f gir samme klosser
ok(JSON.stringify(H.varer({ l: 1, d: .3, nivåer: [.1, .5], hv: .3, fyll: .7, f: .5 })) === JSON.stringify(H.varer({ l: 1, d: .3, nivåer: [.1, .5], hv: .3, fyll: .7, f: .5 })), 'samme møbel skal gi samme ting');
// 5) fargene følger kategorien
const kl = H.varer({ l: 1.2, d: .4, nivåer: [.1, .5, .9], hv: .3, fyll: 1, f: .2, kat: [{ kat: 'klær', andel: 1 }] });
ok(kl.length > 0 && kl.every(q => H.KAT.klær.farger.some(c => c === q[6])), 'klær har klærnes farger');
// 6) forlatte hus: noen hyller er tomme, de fleste har noe – fast per møbel
let tomme = 0, tomB = 0; for (let i = 0; i < 1000; i++) { if (H.husFyll(i / 1000 + .0004) === 0) tomme++; if (H.husFyll(i / 1000 + .0004, true) === 0) tomB++; }
ok(tomme > 120 && tomme < 330, 'tomme hyller i hus: ' + tomme + ' av 1000');
ok(tomB > tomme, 'butikkene er plyndret oftere (' + tomB + ' mot ' + tomme + ')');
ok(H.husFyll(.31) === H.husFyll(.31), 'husFyll fast');
ok(H.husKat('hylle', 'bad')[0].kat === 'hygiene' && H.husKat('krydderhylle', 'stue')[0].kat === 'mat', 'husKat følger rom og møbel');
// 7) innhold fra tinglageret
const T = TL.ny(); const Ps = TL.plasser({ BYGG: { bs_trehylle_1: { tingLager: 'trehylle' } }, ferdig: () => true }, { bygg: [{ id: 1, type: 'bs_trehylle_1' }] }, {});
TL.legg(T, Ps, 'peanøttsmør', 10, 0); TL.legg(T, Ps, 'hammer', 2, 0);
const inn = H.innhold(T, 'b1', 250, Ting.TING);
ok(inn.fyll > 0 && inn.fyll < 1 && inn.kat.length === 2 && Math.abs(inn.kat.reduce((s, q) => s + q.andel, 0) - 1) < 1e-9, 'innhold: ' + JSON.stringify(inn));
ok(H.trinn(0) === 0 && H.trinn(.01) === 1 && H.trinn(1) === 10, 'trinn');
// 8) alle oppsettene har en lagringstype i tinglageret
for (const k of Object.keys(H.OPPSETT)) ok(TL.LAGRING[k], 'oppsett uten lagringstype: ' + k);
// 9) de nye hyllene tar det de skal (kjøkkenhylla tar ikke verktøy, tønnestativet tar vann, vitrinen tar ikke mat)
const P1 = TL.plasser({ BYGG: { a: { tingLager: 'kjøkkenhylle' }, b: { tingLager: 'tønnestativ' }, c: { tingLager: 'vitrine' } }, ferdig: () => true }, { bygg: [{ id: 1, type: 'a' }, { id: 2, type: 'b' }, { id: 3, type: 'c' }] }, { ute: false });
const T2 = TL.ny();
ok(TL.legg(T2, P1, 'hammer', 1, 0, { utenUte: true }).length === 0, 'kjøkkenhylla tar ikke hammer');
ok(TL.legg(T2, P1, 'flaskevann', 4, 0, { utenUte: true }).some(q => q.p === 'b2'), 'vann går i tønnestativet');
ok(TL.legg(T2, [P1[2]], 'peanøttsmør', 1, 0, { utenUte: true }).length === 0, 'vitrinen tar ikke mat');
// 10) paller
const pl = H.paller({ l: 2.4, d: 1, nivåer: [.23, 1.31, 2.39], hv: .8, fyll: .5, f: .6 });
ok(pl.length >= 4 && pl.length <= 40 && pl.every(q => q[0] >= -1.2 && q[1] <= 1.2 && q[2] >= -.5 && q[3] <= .5), 'paller: ' + pl.length + ' kartonger');
ok(H.paller({ l: 2.4, d: 1, nivåer: [.23, 1.31, 2.39], hv: .8, fyll: 1, f: .6 }).length > pl.length, 'full pallreol har flere kartonger');
// selvtest: en hylle som setter tingene over neste nivå skal fanges av punkt 3
{ const q = [0, .1, 0, .1, .08, .08 + .5]; ok(!(q[5] - q[4] <= .34), 'selvtest'); }
if (feil) { console.log(feil + ' feil'); process.exit(1); } else console.log('alle hylletestene ok');
