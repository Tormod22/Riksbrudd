// Test av reglene i spill/flyt.js (spol til neste hendelse, kø, flere lag). Kjør: node pipeline/fliser/test_flyt.js
const F = require('../../site/dovre-fliser/spill/flyt.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
const B = o => ({ dag: 1, marsj: {}, navn: ['A', 'B'], lag: 2, strid: 0, fiender: 0, bygg: 0, alarm: false, mål: 0, tettsteder: 0, ...o });
ok(F.hendelser(B({}), B({})).length === 0, 'ingen endring gir ingen hendelser');
let h = F.hendelser(B({ marsj: { A: true } }), B({}));
ok(h.length === 1 && h[0].type === 'framme' && /A er framme/.test(h[0].tekst), 'lag framme');
ok(F.hendelser(B({ marsj: { A: true } }), B({ navn: ['B'], lag: 1 })).every(q => q.type !== 'framme'), 'et lag som er borte, er ikke «framme»');
h = F.hendelser(B({}), B({ alarm: true, bygg: 1, dag: 2, mål: 1, fiender: 1, tettsteder: 1 }));
ok(['alarm', 'kontakt', 'bygg', 'tettsted', 'mål', 'dag'].every(t => h.some(q => q.type === t)), 'alarm, kontakt, bygg, tettsted, mål og ny dag meldes');
ok(F.stopper(h, 'spol').length === h.length, 'spolingen stopper for alle');
ok(F.stopper(h, 'auto').map(q => q.type).sort().join() === 'alarm,bygg,kontakt', 'auto-stopp bare for alarm, kontakt og bygg');
ok(F.stopper(F.hendelser(B({ marsj: { A: true } }), B({})), 'auto').length === 0, 'auto-stopp ikke når et lag er framme');
ok(F.hendelser(B({ strid: 0 }), B({ strid: 1 }))[0].tekst === 'et lag er i ildkamp', 'ildkamp');
ok(F.hendelser(B({ tettsteder: 2 }), B({ tettsteder: 1 }))[0].tekst === 'du har mistet et tettsted', 'mistet tettsted');
// tid og avstand
ok(F.tidTekst(.02) === 'under 5 min' && F.tidTekst(.5) === '30 min' && F.tidTekst(2.25) === '2 t 15 min' && F.tidTekst(1.99) === '2 t', 'tidTekst');
ok(F.kmTekst(3.24) === '3,2 km' && F.kmTekst(12.6) === '13 km', 'kmTekst');
const a = F.anslag(4000); ok(Math.abs(a.km - 5.2) < 1e-9 && Math.abs(a.timer - 1.3) < 1e-9, 'grovt anslag: 4 km i luftlinje = 5,2 km og 1,3 t');
// kø
const s = { x: 0, y: 0, sti: [[0, 0], [100, 0]], planlegger: false };
ok(F.leggIKø(s, 200, 0) && F.leggIKø(s, 200, 300) && s.kø.length === 2, 'to punkter i køen');
ok(F.køLengde(s) === 400, 'køens lengde regnes fra målet for marsjen som går');
ok(F.nesteIKø(s) === null, 'ingenting tas ut mens laget marsjerer');
s.sti = null; let p = F.nesteIKø(s); ok(p[0] === 200 && p[1] === 0 && s.kø.length === 1 && !s.køSiste, 'første punkt tas ut når laget står');
p = F.nesteIKø(s); ok(p[1] === 300 && s.kø === null && s.køSiste === true, 'siste punkt: køen er tom og køSiste er satt');
const full = { x: 0, y: 0 }; for (let i = 0; i < F.REGLER.køMaks; i++) F.leggIKø(full, i, i); ok(!F.leggIKø(full, 9, 9) && full.kø.length === F.REGLER.køMaks, 'køen har et tak');
F.tømKø(full); ok(full.kø === null && full.køSlutt === null, 'tømKø');
// plasser og ramme
const pl = F.plasser(8, 1000, 2000); ok(pl.length === 8 && pl[0][0] === 1000 && pl[0][1] === 2000, 'første lag får selve målet');
let minst = Infinity; for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) minst = Math.min(minst, Math.hypot(pl[i][0] - pl[j][0], pl[i][1] - pl[j][1]));
ok(minst > 40, 'lagene står ikke oppå hverandre (minst ' + Math.round(minst) + ' m)');
ok(F.plasser(20, 0, 0).every(q => Math.hypot(q[0], q[1]) < 250), 'tjue lag holder seg innen 250 m');
const lag = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 500, y: 0 }];
ok(F.iRamme(lag, 60, 60, -10, -10).length === 2, 'ramme med hjørnene i omvendt rekkefølge');
console.log(feil ? feil + ' FEIL' : 'alle flyttestene ok'); process.exit(feil ? 1 : 0);
