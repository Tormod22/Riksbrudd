// Test av spill/plantegning.js (fase B1): taket og døra som hus3d, figuren per etasje, barrikaden i loggen.
// Hjelperne (form, rund, harFall, takDeler, hash) hentes ut av kartflis.js, så testen bruker de samme reglene som kartet og 3D.
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = path.join(__dirname, '../../site/dovre-fliser');
const PT = require(D + '/spill/plantegning.js'), B = require(D + '/spill/bygning.js'), Byhus = require(D + '/spill/byhus.js');
let feil = 0, n = 0; const sjekk = (ok, t) => { n++; if (!ok) { feil++; console.log('FEIL: ' + t); } };

// ---------- hjelperne fra kartflis.js ----------
const kilde = fs.readFileSync(D + '/kartflis.js', 'utf8');
function hent(navn, kode = kilde) {
  const i = kode.search(new RegExp('^(function ' + navn + '\\(|const ' + navn + ' =)', 'm')); if (i < 0) throw new Error('fant ikke ' + navn);
  if (kode.startsWith('const', i)) return kode.slice(i, kode.indexOf('\n', i) + 1);
  let d = 0, j = kode.indexOf('{', i); for (; j < kode.length; j++) { if (kode[j] === '{') d++; else if (kode[j] === '}' && --d === 0) break; } return kode.slice(i, j + 1);
}
const ktx = {}; vm.createContext(ktx);
vm.runInContext(['hash', 'saltak', 'harFall', 'rund', 'takDeler', 'form'].map(n2 => hent(n2)).join('\n') + '\nthis.H = { hash, harFall, rund, takDeler, form };', ktx);
const H = Object.assign({}, ktx.H, { Byhus });

// ---------- hus3d sin regel, skrevet ut på nytt her (uavhengig av plantegning.js) ----------
// kopiert fra hus3d i index.html: fall, enkel, veggTopp og den første døra. Endres hus3d, må denne følges med (testen feiler da).
const ih = fs.readFileSync(D + '/index.html', 'utf8');
sjekk(/const rundt = rund\(P, f\), enkel = f\.rekt > \.82 && P\.length <= 10;/.test(ih), 'hus3d: enkel-regelen er som plantegning.js antar');
sjekk(/let fall0 = !rundt && f\.lv > 3 && harFall\(t, f\.areal, h, i, TETT\.get\(i\) \|\| 0\);/.test(ih), 'hus3d: fall0 som plantegning.js antar');
sjekk(/dør\(kl, A\[0\], A\[1\], bunn \+ 1, kl === 'låve' \? \.5 : \.38\);/.test(ih), 'hus3d: døra på saltakshus som plantegning.js antar');
sjekk(/const mans = bs\.tak === 'mansard', raft = topp - \(mans \? 1\.2 : \.8\)/.test(ih), 'hus3d: bygårdens raft som plantegning.js antar');

// ---------- prøvehus ----------
const rekt = (x, y, a, b, v = 0) => { const c = Math.cos(v), s = Math.sin(v); return [[0, 0], [a, 0], [a, b], [0, b]].map(([u, w]) => [x + u * c - w * s, y + u * s + w * c]); };
const L = (x, y) => [[x, y], [x + 14, y], [x + 14, y + 6], [x + 6, y + 6], [x + 6, y + 12], [x, y + 12]];
const hus = [];
let i = 81000;
for (const [t, h] of [[0, 7.5], [0, 5], [11, 4.5], [10, 18], [1, 3.5], [4, 9], [7, 6], [6, 9], [2, 14], [8, 12], [9, 8], [5, 6], [13, 20], [15, 9]])
  for (const [P, f] of [[rekt(200000, 6900000, 12, 8), 'rekt'], [rekt(200100, 6900050, 18, 9, .4), 'skrå'], [L(200200, 6900100), 'L'], [rekt(200300, 6900000, 30, 14), 'stor']])
    for (const tett of [2, 20, 45]) hus.push({ P, e: { i: i++, t, h }, f, tett });

let medTak = 0, saltak = 0, flatt = 0, valm = 0, utenDør = 0, tegnet = 0, tom = 0, totalt = 0, maksMs = 0;
for (const q of hus) {
  const r = PT.info(q.P, q.e, q.tett, 300, H);
  sjekk(r.o.every(Number.isInteger), 'nullpunktet er hele meter');
  sjekk(Math.abs(r.P[0][0] + r.o[0] - q.P[0][0]) < .01, 'lokalt omriss = verden − nullpunkt');
  const T = r.tak; if (T.tak === 'saltak') saltak++; else if (T.tak === 'valm') valm++; else flatt++;
  if (T.rund) continue;
  sjekk(T.vegg > 0 && T.vegg <= q.e.h + .01, `veggen er positiv og ikke over høyden (${q.e.t}/${q.f}: ${T.vegg})`);
  if (!r.info.dør) utenDør++;
  // døra ligger på eller nær omrisset
  if (r.info.dør) { let d = Infinity; for (let k = 0; k < r.P.length; k++) d = Math.min(d, B.avstSeg(r.info.dør.x, r.info.dør.y, ...r.P[k], ...r.P[(k + 1) % r.P.length])); sjekk(d < 1.5, `døra nær omrisset (${d.toFixed(2)})`); }
  const t0 = Date.now(), m = B.fraKart(r.P, r.info); maksMs = Math.max(maksMs, Date.now() - t0);
  sjekk(m.tak.form === T.tak || (T.tak && !['saltak', 'valm', 'flatt'].includes(T.tak)), `modellen har samme tak som hus3d (${m.tak.form} / ${T.tak})`);
  if (T.tak !== 'flatt') medTak++;
  sjekk(Math.abs(m.høyde.vegg - T.vegg) < .02 || T.vegg < 2.3, `modellen har samme vegg som hus3d (${m.høyde.vegg} / ${T.vegg})`);
  // samme hus to ganger = samme modell
  const m2 = B.fraKart(PT.info(q.P, q.e, q.tett, 300, H).P, PT.info(q.P, q.e, q.tett, 300, H).info);
  sjekk(JSON.stringify(m2) === JSON.stringify(m), 'samme hus gir samme modell');
  for (const v of PT.etasjeValg(m)) {
    const F = PT.figur(m, v.n); totalt++;
    if (!F.vegger.length) { tom++; continue; }
    tegnet++;
    sjekk(F.vegger.every(w => w.biter.every(([a, b]) => [a, b].every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])))), 'veggbitene har tall');
    sjekk(F.åpninger.every(o => Number.isFinite(o.x) && Math.abs(Math.hypot(o.nx, o.ny) - 1) < 1e-6), 'åpningene har plass og retning');
    // veggbitene går ikke gjennom åpningene (hullet er tomt)
    for (const o of F.åpninger) { if (o.tilstand === 'revet') continue; const w = F.vegger.find(q2 => q2.id === o.vegg);
      sjekk(!w.biter.some(([a, b]) => B.avstSeg(o.x, o.y, a[0], a[1], b[0], b[1]) < o.b / 2 - .05), 'ingen veggbit midt i en åpning'); }
  }
  const F1 = PT.figur(m, 1);
  sjekk(F1.vegger.some(w => w.bærende), '1. etasje har bærende vegger');
  sjekk(F1.åpninger.some(o => o.type !== 'vindu' && o.ytter), '1. etasje har en ytterdør');
}
sjekk(saltak > 40 && flatt > 40, `både saltak og flate tak (saltak ${saltak}, valm ${valm}, flatt ${flatt})`);
sjekk(utenDør < hus.length * .05, 'nesten alle hus har dør fra hus3d-regelen: ' + utenDør);
sjekk(tegnet > hus.length, `etasjer med vegger: ${tegnet} av ${totalt} (tomme ${tom})`);

// ---------- den samme døra som hus3d: et enkelt saltakshus (rektangel) får døra 0,38 inn på langsiden ----------
{ const P = rekt(0, 0, 12, 8), e = { i: 5, t: 0, h: 7, r: 3 }, T = PT.husTak(P, e, 2, H);
  sjekk(T.tak === 'saltak', 'r 3 gir tak med fall: ' + T.tak);
  sjekk(T.dør && Math.abs(T.dør.x - 12 * .38) < .2 && Math.abs(T.dør.y) < .2, 'døra 0,38 langs langsiden: ' + JSON.stringify(T.dør));
  const F = PT.husTak(P, { i: 5, t: 0, h: 7, r: 1 }, 2, H); sjekk(F.tak === 'flatt' && Math.abs(F.vegg - 7) < .01 && Math.abs(F.dør.x - 6) < .01, 'r 1 gir flatt tak, døra midt på lengste kant'); }

// ---------- barrikaden: loggen gir samme modell ----------
{ const q = hus[0], r = PT.info(q.P, q.e, q.tett, 300, H), m0 = B.fraKart(r.P, r.info), F = PT.figur(m0, 1), vindu = F.åpninger.find(o => o.type === 'vindu');
  sjekk(!!vindu, 'prøvehuset har et vindu');
  const Lg = PT.nyLogg('196400,6898900'); PT.leggTil(Lg, q.e.i, { e: 1, del: 'åpning', id: vindu.id, gjør: 'barrikader', ukjent: 'bort' });
  sjekk(PT.antall(Lg) === 1 && !('ukjent' in PT.endringer(Lg, q.e.i)[0]), 'loggen har én ren endring');
  const lest = PT.lesLogg(JSON.stringify(Lg), '196400,6898900'), annen = PT.lesLogg(JSON.stringify(Lg), '1,2');
  sjekk(PT.antall(lest) === 1 && PT.antall(annen) === 0, 'loggen leses bare for samme leir');
  sjekk(PT.antall(PT.lesLogg('{ødelagt', 'x')) === 0, 'ødelagt lagring gir tom logg');
  const m1 = B.medEndringer(m0, PT.endringer(lest, q.e.i)), o1 = PT.figur(m1, 1).åpninger.find(o => o.id === vindu.id);
  sjekk(o1.sperre === 'planker', 'vinduet er barrikadert etter ny lasting');
  sjekk(PT.figur(m0, 1).åpninger.find(o => o.id === vindu.id).sperre === null, 'kartmodellen er uendret');
  sjekk(PT.planker(vindu) >= PT.REGLER.planker.min, 'planker koster tre: ' + PT.planker(vindu));
  sjekk(PT.finnÅpning(F, vindu.x + .1, vindu.y, .5).id === vindu.id, 'trykk ved vinduet finner det');
  // revet vegg stiplet: figuren melder revet
  const w = F.vegger.find(v => v.type === 'skille' && !v.bærende);
  if (w) { const m2 = B.medEndringer(m0, [{ e: 1, del: 'vegg', id: w.id, gjør: 'riv' }]); sjekk(PT.figur(m2, 1).vegger.find(v => v.id === w.id).revet, 'revet vegg merkes'); } }

console.log(`plantegning: ${hus.length} prøvehus, ${n} sjekker, ${feil} feil (saltak ${saltak}, valm ${valm}, flatt ${flatt}; lengste modell ${maksMs} ms)`);
process.exit(feil ? 1 : 0);
