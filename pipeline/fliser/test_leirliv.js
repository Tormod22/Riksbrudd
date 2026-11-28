// Test for spill/leirliv.js (ut9-liv): stilling, røyk, lys i vinduene, plassene for småting og hundene. Kjør: node pipeline/fliser/test_leirliv.js
const path = require('path');
const LL = require(path.join(__dirname, '../../site/dovre-fliser/spill/leirliv.js'));
const Leir = require(path.join(__dirname, '../../site/dovre-fliser/spill/leir.js'));
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// stilling
ok(LL.stilling({ inne: 'brakke', sover: true, hva: 'søvn' }, 'bygg', 'brakke') === 'ligger', 'sover i brakka: ligger i køya');
ok(LL.stilling({ inne: 'kjøkken', hva: 'mat' }, 'bygg', 'kjøkken') === 'sitter', 'spiser i kjøkkenet: sitter ved bordet');
ok(LL.stilling({ inne: null, hva: 'mat' }, 'bygg', null) === '', 'spiser ved bålet: står');
ok(LL.stilling({ inne: 'vakttårn', hva: 'arbeid' }, 'vakt', 'vakttårn', true) === 'kikkert', 'vakta i tårnet: kikkert');
ok(LL.stilling({ går: true, hva: 'arbeid' }, 'bygg', null) === 'planker', 'byggelaget på vei: planker');
ok(LL.stilling({ går: true, hva: 'arbeid' }, 'frakt', null) === 'kasse', 'frakt på vei: kasse');
ok(LL.stilling({ går: false, hva: 'arbeid' }, 'bygg', null) === '', 'byggelaget som står: ingenting å bære');
ok(LL.stilling({ inne: 'sykestue', sover: true, hva: 'søvn' }, 'stell', 'sykestue') === '', 'sover ikke i køye utenfor brakka');

// røyk
ok(LL.røyk('kjøkken', 7.5) === 1 && LL.røyk('kjøkken', 12) === 1 && LL.røyk('kjøkken', 18) === 1, 'kjøkkenpipa ryker ved måltidene');
ok(LL.røyk('kjøkken', 21) === .5 && LL.røyk('kjøkken', 3) === 0 && LL.røyk('kjøkken', 14.5) === 0, 'svakere om kvelden, ingenting om natta og midt på dagen');
ok(LL.røyk('fyrkjele', 22) > 0 && LL.røyk('fyrkjele', 3) > 0 && LL.røyk('fyrkjele', 12) === 0 && LL.røyk('fyrkjele', 12, true) === 1, 'fyrkjelen ryker kveld og natt, og når den brenner');
ok(LL.røyk('lagertelt', 18, false, true) === 0, 'lagerteltet har ingen pipe');

// lys i vinduene
ok(!LL.lys('brakke', 20, .05), 'dagslys: ingen lys');
ok(LL.lys('brakke', 20, .6) && !LL.lys('brakke', 2, .9), 'brakka lyser om kvelden og slukker ved leggetid');
ok(LL.lys('sykestue', 2, .9) && LL.lys('sykestue', 3, .9), 'sykestua lyser hele natta');
ok(!LL.lys('brakke', 20, .6, false), 'bygg under arbeid lyser ikke');
ok(!LL.lys('solcelle', 20, .9), 'bygg uten vinduer lyser ikke');
const vin = LL.vinduer('brakke');
ok(vin.length === 10, 'brakka får vinduer på begge langsider og i endene (' + vin.length + ')');
ok(vin.every(v => Math.abs(v.lx) <= 3.2 && Math.abs(v.ly) <= 6.2 && v.z > 1 && v.z < 2.6), 'vinduene står på veggen (modellen er 6 × 12 m)');
ok(LL.vinduer('solcelle').length === 0, 'bygg uten vinduer: ingen');
ok(LL.vinduPå('sykestue', 3, 1) && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].some(k => !LL.vinduPå('brakke', 1, k)), 'noen vinduer i brakka er mørke, sykestua lyser i alle');
ok(LL.røyk('brakke', 22, false, true) > 0 && LL.røyk('brakke', 22, false, false) === 0, 'brakkeovnen ryker om kvelden bare når det er kaldt');
// (ut9-liv2) flere bygg med lys, lyskasteren
ok(LL.vinduer('kontrollrom').length === 18 && LL.vinduer('kjøkken').length === 1 && LL.vinduer('vakttårn').length === 1, 'kontrollrom 18 vinduer, kjøkkenets luke, lykta i tårnet');
ok(LL.vinduer('kontrollrom').every(v => Math.abs(v.lx) <= 4.7 && Math.abs(v.ly) <= 6.2 && v.z > 1 && v.z < 5), 'kontrollrommets vinduer står på veggene (9 × 12 m)');
ok(LL.vinduPå('kjøkken', 5, 0) && LL.lys('kjøkken', 20, .8) && !LL.lys('kjøkken', 2, .9), 'kjøkkenluka lyser om kvelden, ikke midt på natta');
ok(LL.lys('vakttårn', 3, .9) && LL.lys('kontrollrom', 3, .9), 'vakttårnet og kontrollrommet lyser hele natta');
{ const a = LL.lyskaster(.9, 0, 1), b = LL.lyskaster(.9, LL.REGLER.lyskaster.periode / 4, 1), d = LL.lyskaster(.05, 3, 1);
  ok(a.på && b.på && Math.abs(a.vinkel - b.vinkel) > .3 && Math.abs(b.vinkel) <= LL.REGLER.lyskaster.sveip + 1e-9, 'lyskasteren feier om natta');
  ok(!d.på, 'lyskasteren er av om dagen'); }
// småting: aldri inni et bygg, aldri oppå hverandre
const bygg = [
  { id: 1, type: 'brakke', x: 0, y: 0, ret: 0, ferdig: true, fot: Leir.BYGG.brakke.fot },
  { id: 2, type: 'brakke', x: 14, y: 0, ret: .4, ferdig: true, fot: Leir.BYGG.brakke.fot },
  { id: 3, type: 'lagertelt', x: 0, y: 20, ret: 0, ferdig: false, fot: Leir.BYGG.lagertelt.fot },
  { id: 4, type: 'vakttårn', x: -12, y: 4, ret: 0, ferdig: true, fot: Leir.BYGG.vakttårn.fot },
];
const hj = b => Leir.hjørner(b), ting = LL.småting(bygg, hj);
ok(ting.filter(t => t.k === 'snor').length === 2, 'vasketøy ved begge brakkene (' + ting.filter(t => t.k === 'snor').length + ')');
ok(ting.filter(t => t.bygg === 3).length >= 3, 'kasser og verktøy ved byggeplassen (' + ting.filter(t => t.bygg === 3).length + ')');
ok(!ting.some(t => t.bygg === 4), 'ingenting ved et ferdig vakttårn');
const polys = bygg.map(hj);
ok(ting.every(t => polys.every(P => LL.avstPoly(P, t.x, t.y) >= t.r)), 'ingen ting står inni eller inntil et bygg');
ok(ting.every((a, i) => ting.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r)), 'ingen ting oppå hverandre');
// fritt() fra visningen (vann, hus i kartet) respekteres: alt sperret -> ingenting
ok(LL.småting(bygg, hj, () => false).length === 0, 'sperret grunn: ingen småting');
// samme leir gir samme plasser
ok(JSON.stringify(LL.småting(bygg, hj)) === JSON.stringify(ting), 'samme leir gir samme plasser');

// hundene
ok(LL.antallHunder(3) === 0 && LL.antallHunder(6) === 1 && LL.antallHunder(20) === 2, 'én hund fra 6 personer, to fra 16');
{ let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, leir = { x: 0, y: 0 };
  const h = LL.nyHund(0, leir), friF = (x, y) => polys.every(P => LL.avstPoly(P, x, y) > .5);
  let gikk = 0, maks = 0, iBygg = 0;
  for (let k = 0; k < 4000; k++) { const x0 = h.x, y0 = h.y; LL.hundSteg(h, .25, { leir, h: 12, folk: [[5, 5], [-3, 8]], bygg: bygg.map(b => [b.x, b.y]), fri: friF, rnd });
    gikk += Math.hypot(h.x - x0, h.y - y0); maks = Math.max(maks, Math.hypot(h.x, h.y)); if (!friF(h.x, h.y)) iBygg++; }
  ok(gikk > 100, 'hunden rusler rundt om dagen (' + Math.round(gikk) + ' m)');
  ok(maks <= LL.REGLER.hund.radius + 1, 'hunden holder seg i leiren (' + maks.toFixed(1) + ' m)');
  ok(iBygg === 0, 'hunden går aldri inn i et bygg');
  for (let k = 0; k < 400; k++) LL.hundSteg(h, .25, { leir, h: 1, folk: [], bygg: [], fri: friF, rnd });
  ok(h.ligger === 1 && Math.hypot(h.x, h.y) < 14 && friF(h.x, h.y), 'om natta ligger hunden ved bålet, utenfor byggene (' + h.x.toFixed(1) + ', ' + h.y.toFixed(1) + ')');
}

// selvtest: en feil med vilje skal fanges (et punkt midt i brakka er inni)
ok(LL.avstPoly(polys[0], 0, 0) < 0, 'selvtest: et punkt inni brakka regnes som inni');

console.log(feil ? `\n${feil} FEIL` : '\nalle ok'); process.exit(feil ? 1 : 0);
