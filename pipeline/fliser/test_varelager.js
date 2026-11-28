// Test for spill/varelager.js (G4 – varer med plass): node pipeline/fliser/test_varelager.js
const Leir = require('../../site/dovre-fliser/spill/leir.js');
const VL = require('../../site/dovre-fliser/spill/varelager.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let penger = 1e9; const betal = p => (p <= penger ? (penger -= p, true) : false), gi = p => { penger += p; };
const L = Leir.ny(), V = VL.ny(), leir = { x: 0, y: 0 };
VL.koble(Leir, l => (l === L ? V : null));
const stemmer = t => { const a = VL.avvik(L, V); ok(!a.length, 'summen stemmer: ' + t + (a.length ? ' ' + JSON.stringify(a) : '')); };
const nyBygg = (type, x, y, o = {}) => { const b = { id: L.neste++, type, x, y, ret: 0, nivå: 1, hp: 1, igjen: 0, totalt: 60, pris: Leir.BYGG[type].pris, ...o }; L.bygg.push(b); return b; };

// gammelt spill: tall uten enheter fordeles første gang
L.lager.tre = 13; L.lager.tømmer = 5; L.drivstoff = 0;
VL.avstem(Leir, L, V); stemmer('gammelt lager fordelt');
ok(V.e.filter(u => u.v === 'tre').length === 7 && V.e.every(u => u.p === 'ute'), 'uten lagerbygg: 13 m³ planker = 7 paller ute (6 hele + 1 halv)');
ok(V.e.filter(u => u.v === 'tømmer').length === 3, '5 m³ tømmer = 3 hauger');

// innlegg, kjøp, salg, uttak, trekk – summen stemmer hver gang (Leir.varer er koblet)
Leir.leggInn(L, 'stål', 4.3); stemmer('leggInn');
Leir.kjøpMateriale(L, 'betong', 7, betal); stemmer('kjøp');
Leir.selgMateriale(L, 'tre', 3, gi); stemmer('salg');
ok(Leir.uttak(L, 'tre', 2.5) === 2.5, 'uttak gir det som ble tatt'); stemmer('uttak');
Leir.oppgrader; const r = Leir.harMat(L, { betong: 2 }); ok(r, 'har betong');
// trekk via bygg (materialene til et vakttårn)
const før = L.lager.betong; Leir.kjøpMateriale(L, 'tre', 30, betal); Leir.kjøpMateriale(L, 'stål', 10, betal);
const rb = Leir.bygg(L, { type: 'vakttårn', x: 200, y: 200 }, betal, {}, {}); ok(rb.bygg || rb.feil, 'bygg: ' + (rb.feil || 'ok')); stemmer('bygg trekker materialer');
// direkte skriving (slik produksjon.js og folk.js gjør) rettes av neste avstemming
L.lager.flis = 9.5; L.lager.tre -= 1; VL.avstem(Leir, L, V); stemmer('direkte skriving avstemt');
L.drivstoff = 650; VL.avstem(Leir, L, V); stemmer('diesel'); ok(V.e.filter(u => u.v === 'diesel').length === 4, '650 l = 4 fat');

// lagertelt: nye varer legges inne, uttak tas ute først
const telt = nyBygg('lagertelt', 30, 0);
Leir.leggInn(L, 'tre', 6); stemmer('leggInn med lagertelt');
const inneTre = () => VL.sum(V, 'tre', u => u.p === 'b' + telt.id), uteTre = () => VL.sum(V, 'tre', u => u.p === 'ute');
ok(inneTre() >= 6 - 1e-9, 'de nye plankene havnet i lagerteltet (' + inneTre() + ' inne, ' + uteTre() + ' ute)');
const u0 = uteTre(); Leir.uttak(L, 'tre', 1); ok(Math.abs(uteTre() - (u0 - 1)) < 1e-6, 'uttak tar det som ligger ute først'); stemmer('uttak med telt');
// (ut9-liv) rydderen bar en bestemt enhet: den flyttes, ikke den første som ligger ute
{ const kan = VL.ryddbare(Leir, L, V, 100).filter(q => q.fra === 'ute'), ute = V.e.filter(u => kan.some(q => q.id === u.id)), sist = ute[ute.length - 1];
  if (ute.length >= 2) { const n1 = VL.rydd(Leir, L, V, 1, sist.id); ok(n1 === 1 && sist.p !== 'ute' && ute[0].p === 'ute', 'rydd med «først» flytter enheten rydderen bar (' + ute.length + ' ute)'); stemmer('rydd først'); }
  else ok(false, 'prøven trenger minst to enheter ute (' + ute.length + ')'); }
// rydding bærer det som ligger ute, inn
const n = VL.rydd(Leir, L, V, 100); ok(n > 0 && VL.sum(V, 'tre', u => u.p === 'ute') < 1e-6, 'rydding bærer plankene inn (' + n + ' enheter)'); stemmer('etter rydding');
ok(VL.rydd(Leir, L, V, 100) === 0, 'ingenting mer å rydde');

// sone: teltet bare for tømmer – plankene bæres ut, tømmeret inn
ok(VL.settSone(Leir, L, V, telt.id, 'tømmer').ok, 'sone satt');
ok(VL.settSone(Leir, L, V, telt.id, 'diesel').feil, 'diesel kan ikke være sone i et telt');
VL.avstem(Leir, L, V); ok(VL.sum(V, 'tre', u => u.p === 'b' + telt.id) < 1e-6, 'plankene er ute etter sonebyttet'); stemmer('sone');
VL.rydd(Leir, L, V, 100); ok(VL.sum(V, 'tømmer', u => u.p === 'b' + telt.id) > 0 && VL.sum(V, 'tre', u => u.p === 'b' + telt.id) < 1e-6, 'tømmeret bæres inn, ikke plankene');
VL.settSone(Leir, L, V, telt.id, null);
// to telt: det merket for planker får plankene først
const telt2 = nyBygg('lagertelt', 60, 0); VL.settSone(Leir, L, V, telt2.id, 'tre'); Leir.leggInn(L, 'tre', 4);
ok(VL.sum(V, 'tre', u => u.p === 'b' + telt2.id) >= 4 - 1e-9, 'nye planker til teltet merket for planker'); stemmer('to telt');

// kapasitet: et telt tar 100 av hver vare, resten ute; lagerplassen i leir.js er som før
L.lager.betong = 0; VL.avstem(Leir, L, V); L.lager.betong = 230; VL.avstem(Leir, L, V);
ok(VL.sum(V, 'betong', u => u.p === 'b' + telt.id) <= 100 + 1e-9 && VL.sum(V, 'betong', u => u.p === 'b' + telt2.id) <= 100 + 1e-9 && VL.sum(V, 'betong', u => u.p === 'ute') >= 30 - 1e-9, 'betong: 100 i hvert telt, resten ute');
stemmer('kapasitet'); L.lager.betong = 7; VL.avstem(Leir, L, V); stemmer('ned igjen');
ok(Leir.lagerplass(L) === Leir.GRUNNLAGER + 200, 'lagerplassen i leir.js er uendret: ' + Leir.lagerplass(L));

// reservering: bare én kan reservere, hent bare av den som reserverte
const e1 = V.e.find(u => u.v === 'tømmer');
ok(VL.reserver(V, e1.id, 'bærer A').ok, 'A reserverer');
ok(VL.reserver(V, e1.id, 'bærer B').feil, 'B kan ikke reservere samme enhet');
ok(VL.hent(V, e1.id, 'bærer B').feil, 'B kan ikke hente den');
ok(VL.reserver(V, e1.id, 'bærer A').ok, 'A kan reservere igjen (samme)');
const h = VL.hent(V, e1.id, 'bærer A'); ok(h.ok && e1.p === 'bæres', 'A henter: enheten bæres'); stemmer('mens den bæres');
ok(VL.hent(V, e1.id, 'bærer A').feil, 'kan ikke hentes to ganger');
ok(VL.lever(Leir, L, V, e1.id, 'b' + telt.id).ok && e1.p === 'b' + telt.id && !e1.r, 'A leverer i teltet'); stemmer('levert');
// enhet som forsvinner: den som skulle hente, får beskjed og finner en ny
const e2 = V.e.find(u => u.v === 'tømmer' && u.p === 'ute') || V.e.find(u => u.v === 'tømmer'); VL.reserver(V, e2.id, 'bærer C');
const tf = VL.sum(V, 'tømmer'); L.lager.tømmer = 0; VL.avstem(Leir, L, V, { grunn: 'stjålet' });
const bs = VL.beskjeder(V, 'bærer C'); ok(bs.length === 1 && bs[0].grunn === 'stjålet', 'C får beskjed: ' + JSON.stringify(bs)); ok(!VL.beskjeder(V, 'bærer C').length, 'beskjeden er lest');
ok(!VL.finnNy(V, 'tømmer'), 'ingen tømmer igjen å finne'); L.lager.tømmer = tf; VL.avstem(Leir, L, V); ok(VL.finnNy(V, 'tømmer', 'bærer C'), 'ny tømmerhaug funnet');
stemmer('etter tap');
// bruk
const e3 = V.e.find(u => u.v === 'tre'); const m3 = e3.m; ok(VL.bruk(L, V, e3.id) === m3, 'bruk tar enheten ut'); stemmer('bruk');

// røvere stjeler bare det som ligger ute
const telt3 = nyBygg('lagertelt', 90, 0); L.lager.stål = 0; VL.avstem(Leir, L, V); L.lager.stål = 20; VL.avstem(Leir, L, V);
VL.settSone(Leir, L, V, telt.id, null); VL.settSone(Leir, L, V, telt2.id, null);
ok(VL.sum(V, 'stål', u => u.p === 'ute') < 1e-6, 'alt stålet ligger inne');
const uteNå = VL.ute(Leir, L, V); ok(!(uteNå.stål > 0), 'ute(): ingen stål ute');
L.lager.stål += 160 + 140 + 100; VL.avstem(Leir, L, V);
const ute2 = VL.ute(Leir, L, V), inne2 = VL.sum(V, 'stål') - (ute2.stål || 0);
ok(ute2.stål > 0, 'overfylt: ' + ute2.stål + ' t stål ute');
const st = VL.stjel(Leir, L, V, { stål: ute2.stål + 50 }, true); ok(Math.abs(st.stål - ute2.stål) < 1e-6, 'tyvene får bare det som lå ute (' + st.stål + ')');
ok(Math.abs(VL.sum(V, 'stål') - inne2) < 1e-6, 'det som lå inne, er urørt'); stemmer('etter tyveri');
ok(V.tapt.stjålet && V.tapt.stjålet.stål > 0, 'tyveriet er notert');

// slitasje i regn bare ute
L.lager.ved = 0; VL.avstem(Leir, L, V); VL.settSone(Leir, L, V, telt.id, 'tre'); VL.settSone(Leir, L, V, telt2.id, 'tre'); VL.settSone(Leir, L, V, telt3.id, 'tre');
L.lager.ved = 10; VL.avstem(Leir, L, V); const inneTre0 = VL.sum(V, 'tre', u => VL.inne(Leir, L, V, u));
const sl = VL.slitasje(Leir, L, V, 1, 600); ok(sl.ved > 0 && Math.abs(sl.ved - 10 * (1 - 0) * .005 * 10) < .2, 'ved ute slites i regn: ' + (sl.ved || 0).toFixed(3) + ' m³ på 10 t');
ok(Math.abs(VL.sum(V, 'tre', u => VL.inne(Leir, L, V, u)) - inneTre0) < 1e-6, 'plankene inne slites ikke'); stemmer('slitasje');
ok(!Object.keys(VL.slitasje(Leir, L, V, .1, 600)).length, 'yr under grensen sliter ikke');

// brann i et lagerbygg tar det som kan brenne der
const P = u => VL.punkt(Leir, L, V, u, leir), iTelt = (x, y) => Math.hypot(x - telt.x, y - telt.y) < 6;
VL.rydd(Leir, L, V, 500); const treITelt = VL.sum(V, 'tre', u => u.p === 'b' + telt.id); L.lager.betong = 0; VL.avstem(Leir, L, V);
const br = VL.brann(Leir, L, V, iTelt, P); ok(treITelt > 0 && Math.abs((br.tapt.tre || 0) - treITelt) < 1e-6, 'brannen tok plankene i teltet (' + (br.tapt.tre || 0) + ')');
ok(!V.e.some(u => u.p === 'b' + telt.id && VL.REGLER.brenner[u.v]), 'ingenting brennbart igjen i teltet'); stemmer('brann');
// revet bygg: enhetene ligger igjen ute
const før2 = VL.sum(V, 'tre'); L.bygg = L.bygg.filter(b => b !== telt2); VL.avstem(Leir, L, V); ok(Math.abs(VL.sum(V, 'tre') - før2) < 1e-6 && !V.e.some(u => u.p === 'b' + telt2.id), 'revet telt: plankene ligger ute'); stemmer('revet');
// punkt: enhetene inne i teltet ligger innenfor fotavtrykket
VL.settSone(Leir, L, V, telt3.id, 'betong'); Leir.leggInn(L, 'betong', 9);
const iT3 = V.e.filter(u => u.p === 'b' + telt3.id).map(P); ok(iT3.length && iT3.every(q => Math.abs(q.x - telt3.x) < 4.4 && Math.abs(q.y - telt3.y) < 3.9) && Math.abs(telt3.x - telt.x) > 10, 'enhetene i teltet tegnes inne i teltet');
ok(V.e.filter(u => u.p === 'ute').map(P).every(q => q && Number.isFinite(q.x)), 'alle ute har plass i kartet');
// lagring
const V2 = VL.fraJSON(JSON.parse(JSON.stringify(VL.tilJSON(V)))); ok(V2.e.length === V.e.length && !VL.avvik(L, V2).length && V2.soner[telt3.id] === 'betong', 'lagring: likt etter tilJSON/fraJSON');
ok(VL.fraJSON(null).e.length === 0 && VL.fraJSON({ e: [[1, 'gull', 3]] }).e.length === 0, 'ugyldige data gir tomt varelager');
// tilfeldige endringer: summen stemmer alltid
let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); let alleOk = true;
for (let i = 0; i < 400; i++) { const k = VL.VARER[Math.floor(rnd() * 7)], a = rnd();
  if (k === 'diesel') L.drivstoff = Math.max(0, Math.round(L.drivstoff + (rnd() - .5) * 600));
  else if (a < .35) Leir.leggInn(L, k, rnd() * 20); else if (a < .6) Leir.uttak(L, k, rnd() * 15); else if (a < .7) Leir.selgMateriale(L, k, rnd() * 5, gi);
  else if (a < .8) L.lager[k] = Math.max(0, (L.lager[k] || 0) + (rnd() - .5) * 9); else if (a < .9) VL.rydd(Leir, L, V, 3); else VL.stjel(Leir, L, V, { [k]: rnd() * 4 }, true);
  VL.avstem(Leir, L, V); if (VL.avvik(L, V).length) { alleOk = false; console.log('  avvik etter steg', i, JSON.stringify(VL.avvik(L, V))); break; } }
ok(alleOk, '400 tilfeldige endringer: summen stemmer hver gang');
ok(V.e.every(u => u.m > 0 && u.m <= VL.REGLER.enhet[u.v].str + 1e-9), 'ingen enhet er tom eller større enn sin størrelse');
const ider = V.e.map(u => u.id); ok(new Set(ider).size === ider.length, 'enhetene har unike id-er');
// selvtest: en feil med vilje skal fanges
V.e[0].m += 1; ok(VL.avvik(L, V).length === 1, 'selvtest: avvik() finner en enhet som er endret med vilje'); V.e[0].m -= 1;

console.log(feil ? `\n${feil} FEIL` : '\nalle ok'); process.exit(feil ? 1 : 0);
