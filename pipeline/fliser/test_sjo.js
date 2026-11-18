// Regeltest for spill/sjo.js (båter, ruter over sjøen, havner, fiske, sperringer). Kjør: node pipeline/fliser/test_sjo.js
const S = require('../../site/dovre-fliser/spill/sjo.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL: ' + t); } };
// et lite sjøkart 40 × 30 ruter på 100 m: vann overalt, en halvøy fra toppen ned til rad 20 i kolonne 18–21, og en liten innsjø uten utløp
function kart() { const w = 40, h = 30, v = { x0: 0, y0: 3000, r: 100, w, h, K: new Uint8Array(w * h).fill(3) };
  for (let j = 0; j <= 20; j++) for (let i = 18; i <= 21; i++) v.K[j * w + i] = 1;
  for (let j = 24; j < 30; j++) for (let i = 30; i < 40; i++) v.K[j * w + i] = 1;
  v.K[27 * w + 35] = 3; return v; }
const v = kart(), mid = (i, j) => [v.x0 + (i + .5) * 100, v.y0 - (j + .5) * 100];
// rett linje over åpent vann
let r = S.rute(v, ...mid(2, 2), ...mid(10, 6)); ok(r.sti && r.sti.length === 2, 'rett linje gir to punkter');
// rundt halvøya: ruta er lengre enn luftlinja og går aldri over land
const a = mid(5, 5), b = mid(34, 5); r = S.rute(v, ...a, ...b); ok(r.sti && r.meter > Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.15, 'ruta går rundt halvøya');
const M = S.sjøkart(v); let påLand = 0; for (let q = 1; q < r.sti.length; q++) { const p0 = r.sti[q - 1], p1 = r.sti[q], n = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 20); for (let s = 0; s <= n; s++) { const x = p0[0] + (p1[0] - p0[0]) * s / n, y = p0[1] + (p1[1] - p0[1]) * s / n; if (!M[Math.floor((v.y0 - y) / 100) * v.w + Math.floor(x / 100)]) påLand++; } }
ok(påLand === 0, 'ruta holder seg i vann (' + påLand + ' punkter på land)');
// kai på land snappes til nærmeste vann
r = S.rute(v, ...mid(5, 5), ...mid(19, 21)); ok(r.sti, 'mål rett ved land snappes til vann'); r = S.rute(v, ...mid(5, 5), ...mid(19, 5), { snapp: 50 }); ok(r.feil === 'mål', 'mål midt inne på land: feil «mål»');
// innsjø uten utløp: ingen rute
r = S.rute(v, ...mid(5, 5), ...mid(35, 27)); ok(r.feil === 'land', 'innsjøen nås ikke: ' + JSON.stringify(r.feil));
// sperring i sundet under halvøya (rad 21–29, kolonne 18–21): 900 m bredt -> to minefelt stenger
const sp = [{ x: 2000, y: 3000 - 2350, r: 300 }, { x: 2000, y: 3000 - 2800, r: 300 }]; r = S.rute(v, ...a, ...b, { sperringer: sp }); ok(r.feil === 'sperret', 'sperret sund gir «sperret»: ' + JSON.stringify(r.feil || 'rute'));
r = S.rute(v, ...a, ...b, { sperringer: [sp[0]] }); ok(r.sti && !r.sti.some(p => Math.hypot(p[0] - sp[0].x, p[1] - sp[0].y) < 250), 'ett minefelt: ruta går utenom');
// seilas
const T = S.ny(), kai = { x: a[0], y: a[1], i: 7, størrelse: 'liten' }; let penger = 3e6; const betal = k => (penger >= k ? (penger -= k, true) : false);
ok(S.kjøp(T, 'lekter', kai, betal).feil, 'lekter passer ikke ved liten kai'); const kj = S.kjøp(T, 'sjark', kai, betal); ok(kj.båt && penger === 1e6, 'sjark kjøpt'); ok(S.kjøp(T, 'sjark', kai, betal).feil, 'ikke råd til en til'); ok(S.kjøp(T, 'ferje', { ...kai, størrelse: 'stor' }, betal).feil, 'ferje kan ikke kjøpes');
const bt = kj.båt; r = S.rute(v, bt.x, bt.y, ...b); S.settRute(bt, r.sti, 9); ok(bt.kai === -1 && bt.sti, 'underveis'); let min = 0, fr = null; while (!fr && min < 5000) { fr = S.steg(bt, 1); min++; }
ok(fr === 'framme' && bt.kai === 9 && Math.hypot(bt.x - b[0], bt.y - b[1]) < 1, 'framme ved kaia'); ok(Math.abs(min - r.meter / 4.5 / 60) < 2, 'tiden stemmer med farten: ' + min + ' min');
// last
const haug = { tre: 30, betong: 5, stål: 0, drivstoff: 500, rasjoner: 40 }; const tatt = S.lastOm(bt, haug); ok(Math.abs(S.lastVekt(bt.last) - 20) < 1e-6 && tatt.tre === 20 && haug.tre === 10, 'lasterommet fylles til taket'); const av = S.loss(bt); ok(av.tre === 20 && S.lastVekt(bt.last) === 0, 'lossing tømmer båten');
// havner
S.havnSteg(T, [{ id: 'a', folk: 500 }, { id: 'b', folk: 20000 }], 7 * 1440); ok(Math.abs(T.havner.a.tre - 20) < 1e-6 && Math.abs(T.havner.b.tre - 40) < 1e-6, 'en uke gir ukesmengden (×2 for store byer)');
S.havnSteg(T, [{ id: 'a', folk: 500 }], 100 * 1440); ok(Math.abs(T.havner.a.tre - 80) < 1e-6, 'haugen har et tak'); const lv = S.havnLandeveg(T, ['a']); ok(Math.abs(lv.tre - 40) < 1e-6 && T.havner.a.tre === 0, 'landevegen gir halvparten');
// fiske
bt.fisker = true; ok(Math.abs(S.fangst(bt, 60, { vind: 3, årstid: 'vår' }) - 1.5) < 1e-9, 'sjark fisker 1,5 rasjoner i timen'); ok(S.fangst(bt, 60, { vind: 20 }) === 0, 'ingen fangst i storm'); bt.sti = [[0, 0], [1, 1]]; ok(S.fangst(bt, 60, {}) === 0, 'ingen fangst underveis'); bt.sti = null;
// om bord og ild
ok(S.ombordFeil({ x: bt.x + 100, y: bt.y }, bt, 0) === null && S.ombordFeil({ x: bt.x + 900, y: bt.y }, bt, 0) && S.ombordFeil({ x: bt.x, y: bt.y }, bt, 1), 'om bord: avstand og plass');
ok(S.ild({ påBåt: bt }, {}, 0) < 1 && S.ild({}, { påBåt: bt }, 0) < 1 && S.ild({ landgang: 30 }, {}, 10) > 1 && S.ild({}, { landgang: 30 }, 10) < 1 && S.ild({ landgang: 30 }, {}, 40) === 1, 'ildfaktorer');
// sperringer og lagring
penger = 2e6; ok(S.leggMiner(T, 100, 100, betal).sperring && penger === 5e5, 'miner koster'); ok(S.iSperring(T, 150, 150) && !S.iSperring(T, 900, 900), 'iSperring'); const n0 = T.båter.length; ok(S.senk(T, bt).sperring && T.båter.length === n0 - 1 && T.sperringer.length === 2, 'senket båt blir vrak');
ok(S.rydd(T, T.sperringer[1].id, betal).feil && !S.rydd(T, T.sperringer[0].id, betal).feil && T.sperringer.length === 1, 'miner ryddes, vrak ikke');
const b2 = S.nyBåt(T, 'småbåt', 10, 20, 3); b2.last.tre = 2; b2.lag = ['Lag 1']; const T2 = S.fraJSON(JSON.parse(JSON.stringify(S.tilJSON(T)))); ok(T2.båter.length === 1 && T2.båter[0].last.tre === 2 && T2.båter[0].kai === 3 && T2.båter[0].lag[0] === 'Lag 1' && T2.sperringer.length === 1 && T2.neste === T.neste, 'lagring fram og tilbake');
ok(S.nivå(5000).zv === 9 && S.nivå(30000).zv === 8 && S.nivå(100000).zv === 7, 'detaljnivå etter avstand'); ok(S.passer('lekter', 'middels') && !S.passer('ferje', 'middels') && S.passer('småbåt', 'liten'), 'kaistørrelse');
// stort kart: tid
{ const w = 1600, h = 1600, V = { x0: 0, y0: h * 128, r: 128, w, h, K: new Uint8Array(w * h).fill(3) }; for (let j = 100; j < 1500; j++) for (let i = 790; i < 810; i++) V.K[j * w + i] = 1; const t0 = Date.now(), R = S.rute(V, 1000, 100000, 200000, 100000); ok(R.sti && Date.now() - t0 < 4000, 'stort kart på under 4 s (' + (Date.now() - t0) + ' ms)'); }
console.log(feil ? feil + ' feil' : 'test_sjo: alt i orden'); process.exit(feil ? 1 : 0);
