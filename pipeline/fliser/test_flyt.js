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
ok(F.stopper(h, 'spol').map(q => q.type).sort().join() === 'alarm,bygg,dag,kontakt,tettsted', 'spolingen stopper for alt unntatt et nådd mål (runde 8)');
// runde 8: bare det som krever spilleren stopper ⏭ – flom/ras langt unna og toget som er framme gjør det ikke
ok(F.stopper([{ type: 'natur', tekst: 'flom' }, { type: 'tog', tekst: 'toget er framme' }, { type: 'mål', tekst: 'et mål er nådd' }], 'spol').length === 0, 'natur, tog og mål stopper ikke spolingen');
ok(['kort', 'alarm', 'brann', 'båt', 'fanger', 'annet', 'framme', 'tapt'].every(t => F.stopper([{ type: t, tekst: t }], 'spol').length === 1), 'kort, alarm, brann, båt, fanger, annet, framme og tap stopper fortsatt');
ok(F.REGLER.fiendeNær > 0 && F.REGLER.huskSett >= 90, 'fienden i sikte bare nær, og huskes lenger');
ok(F.stopper(h, 'auto').map(q => q.type).sort().join() === 'alarm,bygg,kontakt', 'auto-stopp bare for alarm, kontakt og bygg');
ok(F.stopper(F.hendelser(B({ marsj: { A: true } }), B({})), 'auto').length === 0, 'auto-stopp ikke når et lag er framme');
h = F.hendelser(B({ alarm: true, byggTall: 4 }), B({ alarm: true, byggTall: 3 }));
ok(h.some(q => q.type === 'alarm' && /ødelagt/.test(q.tekst)), 'et bygg som blir borte under et angrep, stopper spolingen');
ok(F.hendelser(B({ alarm: true, skadd: 0 }), B({ alarm: true, skadd: 1 })).some(q => /hardt skadet/.test(q.tekst)), 'et hardt skadet bygg under et angrep stopper spolingen');
h = F.hendelser(B({ alarm: true, marsj: { A: true }, strid: 0, fiender: 1 }), B({ alarm: true, marsj: {}, strid: 2, fiender: 3 }));
ok(!h.some(q => q.type === 'framme' || q.type === 'kontakt'), 'midt i et angrep stopper ikke hvert lag som er framme eller i ildkamp');
ok(F.hendelser(B({ alarm: true, lag: 2 }), B({ alarm: true, lag: 1 })).some(q => q.type === 'tapt'), 'et lag som slås ut midt i et angrep, stopper fortsatt');
ok(F.hendelser(B({ marsj: { A: true } }), B({ marsj: {} })).some(q => q.type === 'framme'), 'utenom angrep stopper et lag som er framme som før');
ok(F.hendelser(B({ byggTall: 4 }), B({ byggTall: 3 })).length === 0, 'riving uten angrep stopper ingenting');
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
// runde 6: ferdig bygg senker bare til 10×, fienden til 1×; et nytt ferdig bygg innen to spilltimer senker ikke igjen
ok(F.autoFart([{ type: 'bygg' }]) === 'sp2' && F.autoFart([{ type: 'kontakt' }]) === 'sp1' && F.autoFart([{ type: 'bygg' }, { type: 'alarm' }]) === 'sp1', 'auto: bygg ned til 10×, fiende og alarm til 1×');
ok(F.hviler([{ type: 'bygg' }], { bygg: 100 }, 150).length === 0 && F.hviler([{ type: 'bygg' }], { bygg: 100 }, 230).length === 1 && F.hviler([{ type: 'alarm' }], { alarm: 100 }, 101).length === 1, 'auto: et nytt ferdig bygg innen to spilltimer senker ikke farten igjen (alarm alltid)');
console.log(feil ? feil + ' FEIL' : 'alle flyttestene ok'); process.exit(feil ? 1 : 0);
