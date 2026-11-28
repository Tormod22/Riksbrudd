// Test for spill/husvern.js (B6: kamp med vegger) og spill/overtak.js (B7: ta over et hus).
// Kjør: node pipeline/fliser/test_husvern.js
const B = require('../../site/dovre-fliser/spill/bygning.js');
global.Bygning = B;
const HV = require('../../site/dovre-fliser/spill/husvern.js');
const OT = require('../../site/dovre-fliser/spill/overtak.js');
let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (L, D) => [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]];
const midt = m => { let x = 0, y = 0; for (const p of m.P) { x += p[0]; y += p[1]; } return [x / m.P.length, y / m.P.length]; };

// et trehus (bolig, 12 × 8 m, 9 m: to etasjer) og et kontorbygg i betong (16 × 12 m, 13 m)
const tre = B.fraKart(rekt(12, 8), { i: 5101, t: 0, h: 9, tett: 5 });
const bet = B.fraKart(rekt(16, 12), { i: 5102, t: 2, h: 13, tett: 30 });
const yt = (m, n) => HV.etasje(m, n).vegger.filter(w => w.type === 'ytter' || w.type === 'gavl');
ok(yt(tre, 1).every(w => w.stoff === 'tre') && yt(bet, 1).every(w => w.stoff === 'betong'), 'stoffene: trehuset tre, kontoret betong');

// et sted på en yttervegg uten åpning (størst avstand til åpningene): { w, s, p (på veggen), inn (0,6 m inne), ut (60 m ute) }
function tett(m) { const e = HV.etasje(m, 1); let best = null;
  for (const w of yt(m, 1)) { const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); for (let s = .8; s < L - .8; s += .2) { const fri = Math.min(...e.åpninger.filter(o => o.vegg === w.id).map(o => Math.abs(o.t - s) - o.b / 2), 99); if (!best || fri > best.fri) best = { w, s, fri, L }; } }
  const { w, s, L } = best, ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, p = [w.a[0] + ux * s, w.a[1] + uy * s]; let nx = uy, ny = -ux; if (HV.inni(m.P, p[0] + nx * .6, p[1] + ny * .6)) { nx = -nx; ny = -ny; }
  return { w, s, p, ux, uy, inn: [p[0] - nx * .6, p[1] - ny * .6], ut: [p[0] + nx * 60, p[1] + ny * 60] }; }
// 1. vern per vegg: et lag midt i huset mot en skytter 80 m unna – betong tar mer enn tre, og ute er det ingen vern
const S = [0, 80], vt = HV.vernSnitt(tre, 1, HV.punkterRundt(tre, 0, 0), S), vb = HV.vernSnitt(bet, 1, HV.punkterRundt(bet, 0, 0), S);
ok(vt.faktor < 1 && vt.faktor > .3 && vt.vegger.length >= 1, `trehus: veggene tar ${HV.prosent(vt.andel)} (${vt.vegger.length} vegger i linja)`);
const tt = tett(tre), tb = tett(bet), lt = HV.vern(tre, 1, tt.inn, tt.ut), lb = HV.vern(bet, 1, tb.inn, tb.ut);
ok(lb.faktor < lt.faktor && lt.vegger.length === 1 && lb.vegger.length === 1, `bak én yttervegg: betong tar ${HV.prosent(lb.andel)}, tre ${HV.prosent(lt.andel)}`);
ok(vb.faktor < 1, `kontoret i snitt (mange vinduer): ${HV.prosent(vb.andel)}`);
ok(vb.andel <= HV.REGLER.maks + 1e-9, 'aldri mer enn taket for vern');
const ute = HV.vern(tre, 1, [0, 30], S); ok(ute.faktor === 1 && !ute.vegger.length, 'ute (utenfor huset, ingen vegg i linja): ingen vern');
ok(/i huset: veggene tar \d+ %/.test(HV.vernTekst(vt)), 'teksten: ' + HV.vernTekst(vt));
// skuddet gjennom et vindu tar nesten ingenting
const e1 = HV.etasje(tre, 1), vin = e1.åpninger.find(o => o.type === 'vindu' && (e1.vegger[o.vegg].type === 'ytter'));
if (vin) { const w = e1.vegger[vin.vegg], L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, nx = uy, ny = -ux;
  const p = [w.a[0] + ux * vin.t, w.a[1] + uy * vin.t], inn = [p[0] - nx * .5, p[1] - ny * .5], ut = [p[0] + nx * 60, p[1] + ny * 60], inn2 = [p[0] + nx * .5, p[1] + ny * .5], ut2 = [p[0] - nx * 60, p[1] - ny * 60];
  const T = HV.inni(tre.P, inn[0], inn[1]) ? inn : inn2, Sk = T === inn ? ut : ut2, g = HV.gjennom(e1, T, Sk);
  ok(g.length === 1 && g[0].åpning === vin.id && g[0].stopp < .1, `gjennom vinduet: ${g.length} kryss, stopp ${g[0] && g[0].stopp}`);
  // planker over vinduet gir vern igjen
  const k = B.kopi(tre); B.endre(k, { e: 1, del: 'åpning', id: vin.id, gjør: 'barrikader' }); const g2 = HV.gjennom(HV.etasje(k, 1), T, Sk);
  ok(g2[0].stopp > g[0].stopp + .2, `planker over vinduet: stopp ${g2[0].stopp}`);
} else ok(false, 'fant et vindu i ytterveggen');
// skadet vegg tar mindre; kjeller tar nesten alt
const ks = B.kopi(tre), w0 = yt(tre, 1)[0]; const sv = B.endre(ks, { e: 1, del: 'vegg', id: w0.id, gjør: 'skad' });
ok(sv.ok && HV.etasje(ks, 1).vegger[w0.id].tilstand === 'skadet' && HV.veggStopp(HV.etasje(ks, 1).vegger[w0.id]) < HV.veggStopp(w0), 'skadet vegg tar mindre');
const sv3 = B.endre(ks, { e: 1, del: 'vegg', id: w0.id, gjør: 'skad' }); ok(sv3.ok && HV.etasje(ks, 1).vegger[w0.id].tilstand === 'ødelagt' && !HV.står(HV.etasje(ks, 1).vegger[w0.id]), 'skadet to ganger: ødelagt (står ikke)');
const kj = tre.etasjer.find(e => e.kjeller) || bet.etasjer.find(e => e.kjeller);
if (kj) { const m = tre.etasjer.includes(kj) ? tre : bet; const v = HV.vern(m, kj.n, [0, 0], S); ok(v.kjeller && v.faktor < .2, 'kjelleren: ' + HV.vernTekst(v)); }

// 2. vedvarende ild mot trehuset: vinduet knuses / veggen skades først etter flere runder
const sl = new Map(); let runder = 0, endr = []; const kk = B.kopi(tre);
for (; runder < 200 && !endr.some(d => d.del === 'vegg'); runder++) { const r = HV.slit(kk, 1, tt.inn, tt.ut, 12, sl, 'h'); for (const d of r) { endr.push(d); B.endre(kk, d); } }
ok(endr.some(d => d.gjør === 'skad') && runder > 3, `trevegg skadet etter ${runder} runder (${endr.length} endringer)`);
const sb = new Map(); let eb = []; for (let r = 0; r < 60; r++) eb.push(...HV.slit(bet, 1, tb.inn, tb.ut, 12, sb, 'b'));
ok(!eb.some(d => d.del === 'vegg'), 'betongvegg slites ikke av skudd');

// 3. granat og sprengstoff
const lett = e1.vegger.find(w => w.type === 'skille' && !w.bærende && w.stoff === 'tre');
if (lett) { const q = [(lett.a[0] + lett.b[0]) / 2, (lett.a[1] + lett.b[1]) / 2], k = B.kopi(tre), r = HV.smell(k, 1, q[0] + .3, q[1] + .3, 'granat');
  ok(r.endringer.length === 1 && r.endringer[0].gjør === 'riv' && r.endringer[0].id === lett.id, 'granat: river den lette veggen (' + r.tekst + ')');
  const s = B.endre(k, r.endringer[0]); ok(s.ok && !HV.står(HV.etasje(k, 1).vegger[lett.id]), 'veggen er revet i modellen'); }
else ok(false, 'fant en lett skillevegg');
{ const k = B.kopi(bet), e = HV.etasje(k, 1), { w, p, ux, uy } = tb;
  const g = HV.smell(k, 1, p[0], p[1], 'granat'); ok(g.endringer.length === 1 && g.endringer[0].gjør === 'skad', 'granat mot betong: bare skadet (' + g.tekst + ')');
  const r = HV.smell(k, 1, p[0], p[1], 'sprengstoff'); const d = r.endringer[0];
  ok(w.bærende && d && d.del === 'åpning' && d.type === 'hull', 'sprengstoff mot bærende vegg: hull (' + r.tekst + ')');
  const sv2 = B.endre(k, d); const o = sv2.ok && e.åpninger[sv2.id];
  ok(o && o.type === 'hull' && o.tilstand === 'ødelagt' && o.ny, 'hullet står i modellen som åpning (ødelagt)');
  // gjentatt sprengstoff: til slutt rives veggen
  let n = 0, rev = false; for (; n < 12 && !rev; n++) { const t = HV.smell(k, 1, p[0] + ux * n * 2.2, p[1] + uy * n * 2.2, 'sprengstoff'); for (const q of t.endringer) { const s = B.endre(k, q); if (q.gjør === 'riv' && q.del === 'vegg' && s.ok) rev = true; } }
  ok(rev, `gjentatt sprengstoff river den bærende veggen (${n} smell)`);
  // modellen med endringene på nytt gir samme hus (endringsloggen virker)
  const re = B.medEndringer(bet, k.endringer); ok(re.svar.every(s => s.ok), 'endringsloggen spilles av på nytt uten feil (' + k.endringer.length + ' endringer)'); }

// 4. inngangen: barrikadene forsinker fienden
{ const k = B.kopi(tre), I0 = HV.inngang(k); ok(I0.åpne >= 1 && I0.forsinkelse === HV.REGLER.inntak.åpen, `åpne dører: forsinkelse ${I0.forsinkelse} min`);
  const e = HV.etasje(k, 1); for (const q of I0.innganger) if (q.id !== undefined) B.endre(k, { e: 1, del: 'åpning', id: q.id, gjør: 'barrikader' });
  const I1 = HV.inngang(k); ok(I1.åpne === 0 && I1.svake === 0 && I1.forsinkelse > I0.forsinkelse + 3, `alt barrikadert: ${I1.sperret} sperret, forsinkelse ${I1.forsinkelse} min`);
  const v = HV.veiInn(k, 0, 50); ok(!!v && v.sperre, 'veien inn er en barrikade');
  // en knust rute (ikke barrikadert) åpner huset igjen
  const vi = e.åpninger.find(o => o.type === 'vindu' && o.sperre); B.endre(k, { e: 1, del: 'åpning', id: vi.id, gjør: 'åpne' }); B.endre(k, { e: 1, del: 'åpning', id: vi.id, gjør: 'riv' });
  const I2 = HV.inngang(k); ok(I2.åpne === 1 && I2.forsinkelse === HV.REGLER.inntak.åpen && HV.veiInn(k, 0, 50).type === 'vindu', 'knust vindu: fienden går inn der'); }

// 5. sikt fra etasjene
ok(HV.sikt(tre, 1) === 1 && HV.sikt(tre, 2) > 1 && HV.sikt(bet, 3) > HV.sikt(bet, 2), `sikt: 1. ${HV.sikt(tre, 1)}, 2. ${HV.sikt(tre, 2)}, 3. ${HV.sikt(bet, 3)}`);
ok(HV.etasjeHøyde(tre, 2) > 2 && HV.etasjeHøyde(tre, 1) === 0, 'høyden i 2. etasje: ' + HV.etasjeHøyde(tre, 2) + ' m');
ok(HV.etasjer(bet).length >= 3, 'etasjene i kontoret: ' + HV.etasjer(bet).map(e => e.n).join(' '));

// 6. B7 ta over et hus: senger og lager
{ const s = OT.senger(tre), l = OT.lager(tre, 'lager'), lk = OT.lager(tre, 'kaserne'), sk = OT.senger(tre, 'kaserne');
  ok(s >= 1, 'bolig: ' + s + ' senger'); ok(sk >= s, 'som kaserne: ' + sk + ' plasser');
  ok(l > lk && l > 5, `som lager: ${l} m³ lagerplass (kaserne ${lk})`);
  ok(OT.kanTaOver(1500).ok && !OT.kanTaOver(OT.REGLER.maksAvstand + 1).ok, 'avstanden: innen ' + OT.REGLER.maksAvstand + ' m');
  ok(OT.BRUK.utpost && OT.BRUK.lager && OT.BRUK.verksted && OT.BRUK.kaserne, 'brukene: ' + Object.keys(OT.BRUK).join(', '));
  const L = OT.lesLogg(JSON.stringify({ v: 1, leir: '1,2', hus: { 7: { bruk: 'lager' } } }), '1,2'); ok(L.hus[7].bruk === 'lager', 'lagringen leses for samme leir');
  ok(!OT.lesLogg(JSON.stringify({ v: 1, leir: '1,2', hus: { 7: { bruk: 'lager' } } }), '3,4').hus[7], 'en annen leir får tom liste');
  const sum = OT.sum({ 1: { bruk: 'kaserne', senger: 4, lager: 2 }, 2: { bruk: 'lager', senger: 1, lager: 30 } }); ok(sum.senger === 5 && sum.lager === 32, 'summen: ' + JSON.stringify(sum)); }

console.log(feil ? feil + ' FEIL' : 'alt ok'); process.exit(feil ? 1 : 0);
