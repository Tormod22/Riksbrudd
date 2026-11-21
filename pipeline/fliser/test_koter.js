// Test av høydekurvene i kartflisene (site/dovre-fliser/kartflis.js, koter): i en bratt li blir de vanlige kurvene ikke til tette
// «striper» (runde 13, kritikk G). Kjør: node pipeline/fliser/test_koter.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = path.join(__dirname, '../../site/dovre-fliser');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const ctx = vm.createContext({ console: { error() {}, log: console.log }, setTimeout, clearTimeout, TextDecoder, Uint8Array, DataView, Promise, Math, Error, TypeError });
ctx.globalThis = ctx; ctx.self = ctx; ctx.window = undefined;
vm.runInContext(fs.readFileSync(path.join(D, 'lib', 'pmtiles-4.3.0.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(D, 'kartflis.js'), 'utf8') + '\n;globalThis.T = { koter, koteAvstand, KOTE_TETT };', ctx);
const { koter, koteAvstand, KOTE_TETT } = ctx.T;
// et falskt lerret som teller strekene per stil (bredde + farge)
function tell(fall, z) { const N = 130, E = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) E[j * N + i] = 500.37 + fall * j;
  const ut = {}; let n = 0, w = 0, f = '';
  const g = { set lineWidth(v) { w = v; }, set strokeStyle(v) { f = v; }, beginPath() { n = 0; }, moveTo() { n++; }, lineTo() {}, stroke() { ut[w + ' ' + f] = n; } };
  koter(g, E, N, z); return ut; }
const sum = (o, f) => Object.entries(o).filter(([k]) => f(k)).reduce((a, [, v]) => a + v, 0);
ok(koteAvstand(0, 5, 5) === 1 && koteAvstand(0, 1, 5) === 5 && koteAvstand(3, 3, 5) === Infinity, 'avstanden mellom kurvene i flisepunkter');
// slak li (0,2 m per flisepunkt på z14: 5 m-kurvene står 25 punkter fra hverandre): alle kurvene, vanlig styrke
{ const t = tell(.2, 14), vanlig = sum(t, k => /^0\.6 /.test(k)), tykk = sum(t, k => /^1\.1 /.test(k)), svak = sum(t, k => /^0\.5 /.test(k));
  ok(vanlig > 0 && tykk > 0 && svak === 0, `slak li: vanlige ${vanlig}, tykke ${tykk}, svake ${svak}`); }
// bratt li (1 m per flisepunkt: kurvene 5 punkter fra hverandre – stripene): bare hver femte, og den tynt
{ const t = tell(1.1, 14), vanlig = sum(t, k => /^0\.6 /.test(k)), tykk = sum(t, k => /^1\.1 /.test(k)), svak = sum(t, k => /^0\.5 /.test(k));
  ok(vanlig > 0 && svak === 0 && tykk === 0, `bratt li: vanlige ${vanlig}, svake ${svak}, tykke ${tykk}`); }
// middels (0,7 m per punkt: 7 punkter): svake kurver
{ const t = tell(.7, 14), vanlig = sum(t, k => /^0\.6 /.test(k)), svak = sum(t, k => /^0\.5 /.test(k));
  ok(vanlig === 0 && svak > 0, `middels bratt: svake ${svak}, vanlige ${vanlig}`); }
// stup: heller ikke de tykke
{ const t = tell(14, 14); ok(sum(t, () => true) === 0, "stup (14 m per punkt): ingen kurver"); }
ok(KOTE_TETT.bort < KOTE_TETT.svak && KOTE_TETT.tykk < KOTE_TETT.bort, 'grensene i rekkefølge');
console.log(feil ? feil + ' feil' : 'alle testene for høydekurvene ok'); process.exit(feil ? 1 : 0);
