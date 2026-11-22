// Test av felles tilfeldighet (site/dovre-fliser/spill/tilfeldig.js) og at regelmodulene som bruker den, gir samme svar på samme frø.
// Kjør: node pipeline/fliser/test_tilfeldig.js
const T = require('../../site/dovre-fliser/spill/tilfeldig.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekke = (r, n) => Array.from({ length: n }, () => r());
const lik = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- samme frø gir samme rekke, ulike frø ulike rekker ---
ok(lik(rekke(T.lag(42), 50), rekke(T.lag(42), 50)), 'samme frø (tall) gir samme rekke');
ok(lik(rekke(T.lag('Dombås'), 20), rekke(T.lag('Dombås'), 20)), 'samme frø (tekst) gir samme rekke');
ok(!lik(rekke(T.lag(1), 20), rekke(T.lag(2), 20)), 'ulike frø gir ulike rekker');
ok(!lik(rekke(T.lag('a'), 20), rekke(T.lag('b'), 20)), 'ulike tekster gir ulike rekker');

// --- lagre og les midt i en rekke gir samme fortsettelse ---
{ const r = T.lag(7); rekke(r, 33); const t = r.tilstand(); const videre = rekke(r, 40);
  const r2 = T.lag(999).sett(t); ok(lik(rekke(r2, 40), videre), 'tilstand() / sett() midt i rekka gir samme fortsettelse');
  ok(lik(JSON.parse(JSON.stringify({ t })).t, t), 'tilstanden er et vanlig tall som tåler JSON'); }
{ T.nyVerden(5); rekke(T.verden, 17); const t = T.lagre(); const videre = rekke(T.verden, 30);
  T.nyVerden(123); rekke(T.verden, 5); ok(T.les(t) === true, 'les() godtar en lagret tilstand');
  ok(lik(rekke(T.verden, 30), videre), 'verden: lagre() / les() midt i rekka gir samme fortsettelse');
  const før = T.lagre(); ok(T.les(undefined) === false && T.les(null) === false && T.les('tull') === false && T.lagre() === før, 'gamle lagringer uten tilstand endrer ingenting'); }
{ const v = T.verden; T.nyVerden(3); ok(T.verden === v, 'verden er samme funksjon etter nyVerden (moduler som har tatt vare på den, følger med)');
  const a = rekke(T.verden, 10); T.nyVerden(3); ok(lik(rekke(v, 10), a), 'nyVerden(frø) starter rekka på nytt'); }
{ T.nyVerden(); const a = rekke(T.verden, 5); ok(lik(a, rekke(T.lag(1), 5)), 'standardfrøet for verden er 1'); }

// --- fordelingen ---
{ const r = T.lag(2026), n = 200000; let s = 0, min = 1, maks = 0; const bøtter = new Array(10).fill(0);
  for (let i = 0; i < n; i++) { const v = r(); s += v; if (v < min) min = v; if (v > maks) maks = v; bøtter[Math.floor(v * 10)]++; }
  ok(min >= 0 && maks < 1, `alle verdier i [0, 1): min ${min.toFixed(6)}, maks ${maks.toFixed(6)}`);
  ok(Math.abs(s / n - .5) < .005, 'snittet er ca. 0,5: ' + (s / n).toFixed(4));
  ok(bøtter.every(b => Math.abs(b / n - .1) < .005), 'jevnt fordelt på ti bøtter: ' + bøtter.map(b => (b / n * 100).toFixed(1)).join(' ')); }

// --- hjelperne ---
{ const r = T.lag(11), sett = new Set(); let utenfor = 0; for (let i = 0; i < 5000; i++) { const v = T.heltall(3, 8, r); sett.add(v); if (v < 3 || v > 8 || v !== Math.floor(v)) utenfor++; }
  ok(utenfor === 0 && sett.size === 6, 'heltall(3, 8) gir bare 3–8, og alle av dem: ' + [...sett].sort().join(','));
  const liste = ['a', 'b', 'c'], valgt = new Set(); for (let i = 0; i < 300; i++) valgt.add(T.velg(liste, r));
  ok(valgt.size === 3 && [...valgt].every(v => liste.includes(v)), 'velg() tar bare fra lista, og alle blir valgt');
  ok(T.velg([], r) === undefined && T.velg(null, r) === undefined, 'velg() fra tom liste gir undefined');
  let ja = 0; for (let i = 0; i < 20000; i++) if (T.sjanse(.3, r)) ja++;
  ok(Math.abs(ja / 20000 - .3) < .015, 'sjanse(0,3) slår til ca. 30 %: ' + (ja / 200).toFixed(1) + ' %');
  ok(!T.sjanse(0, r) && T.sjanse(1, r), 'sjanse(0) aldri, sjanse(1) alltid');
  T.nyVerden(9); const a = [T.heltall(1, 100), T.velg(liste), T.sjanse(.5)]; T.nyVerden(9); ok(lik(a, [T.heltall(1, 100), T.velg(liste), T.sjanse(.5)]), 'hjelperne bruker verden-strømmen som standard'); }

// --- HELE POENGET: regelmodulene gir samme svar på samme frø (uten at testen gir dem en egen strøm) ---
// været: tusen steg fra samme frø gir samme værhistorie
{ const V = require('../../site/dovre-fliser/spill/vaer.js');
  const kjør = frø => { T.nyVerden(frø); const S = V.ny('høst'), hist = []; for (let t = 0; t < 60 * 24 * 30; t += 30) { V.steg(S, t); hist.push(S.vær); } return { hist, S }; };
  const a = kjør(77), b = kjør(77), c = kjør(78);
  ok(lik(a, b), 'vaer.js: samme frø gir samme vær i 30 døgn (' + new Set(a.hist).size + ' slags vær)');
  ok(!lik(a.hist, c.hist), 'vaer.js: et annet frø gir et annet vær'); }
// morgenmøtet: dagens valg og utfallet
{ const M = require('../../site/dovre-fliser/spill/morgen.js');
  const s = { dag: 5, folk: 10, arbeidsføre: 10, frie: 2, mat: 10, matDøgn: 1.2, moral: 40, penger: 4e6, matPris: 3000, trePris: 100000, lager: { tre: 20 }, diesel: 200, dieselPlass: 1000,
    dieselPris: 3000, røverTimer: null, bølge: 0, post: null, sted: 'Dombås', årstid: 'sommer' };
  const kjør = frø => { T.nyVerden(frø); const ut = []; for (let i = 0; i < 20; i++) { ut.push(M.dagensValg({ ...s, dag: 2 + i }).map(v => v.id)); ut.push(M.storBeslutning({ ...s, dag: 2 + i })); } return JSON.stringify(ut); };
  ok(kjør(5) === kjør(5), 'morgen.js: samme frø gir samme valg og beslutninger i 20 døgn'); }
// brann (verden.js): samme frø gir samme brann
{ const V = require('../../site/dovre-fliser/spill/verden.js');
  const sommer = { årstid: 'sommer', vær: 'klart', vind: { fart: 6, retning: 1 } }, skog = () => 1;
  const kjør = frø => { T.nyVerden(frø); const B = V.nyBrann(); V.tenn(B, 0, 0, 0); let nye = 0; for (let t = 10; t <= 120; t += 10) nye += V.brannSteg(B, t, 10, sommer, 1, skog).nye; return JSON.stringify(B) + '|' + nye; };
  const a = kjør(31); ok(a === kjør(31), 'verden.js: samme frø gir samme brann (' + a.split('|')[1] + ' nye branner)');
  ok(a !== kjør(32), 'verden.js: et annet frø gir en annen brann'); }
// oppstart: tilfeldig portrett
{ const O = require('../../site/dovre-fliser/spill/oppstart.js');
  const kjør = frø => { T.nyVerden(frø); return JSON.stringify([O.tilfeldigPortrett(), O.tilfeldigPortrett(), O.tilfeldigPortrett()]); };
  ok(kjør(4) === kjør(4), 'oppstart.js: samme frø gir samme tilfeldige portretter');
  ok(kjør(4) !== kjør(40), 'oppstart.js: et annet frø gir andre portretter'); }
// kameravakta: falske klipp (vær og dyr) kommer likt
{ const K = require('../../site/dovre-fliser/spill/kameravakt.js');
  const kam = [{ id: 7, x: 0, y: 0, r: 300, nivå: 1 }];
  const kjør = frø => { T.nyVerden(frø); const S = K.ny(), ut = []; for (let t = 0; t < 600; t++) { const u = K.steg(S, kam, [], t, 1, { tempo: 0 }); ut.push(u.nye.map(q => q.hva + '@' + t)); } return JSON.stringify(ut); };
  ok(kjør(8) === kjør(8), 'kameravakt.js: samme frø gir de samme klippene i 10 timer');
  ok(kjør(8) !== kjør(80), 'kameravakt.js: et annet frø gir andre klipp'); }
// lagring: feltet rng lagres og leses, og gamle lagringer uten feltet virker
{ const LG = require('../../site/dovre-fliser/spill/lagring.js');
  T.nyVerden(12); rekke(T.verden, 9); const t = T.lagre(), videre = rekke(T.verden, 10);
  const d = LG.fraJSON(JSON.stringify(LG.pakk({ tid: 10, leir: { x: 1, y: 2 }, rng: t })), { x: 1, y: 2 });
  ok(d && d.rng === t, 'lagring.js: rng lagres og leses');
  T.nyVerden(1); T.les(d.rng); ok(lik(rekke(T.verden, 10), videre), 'lagring.js: rekka fortsetter likt etter lagre -> les');
  const gammel = { ...LG.pakk({ tid: 10, leir: { x: 1, y: 2 } }) }; delete gammel.rng;
  const g = LG.fraJSON(JSON.stringify(gammel), { x: 1, y: 2 }); ok(g && g.rng === null && g.tid === 10, 'lagring.js: gammel lagring uten rng virker (rng = null)'); }

console.log(feil ? `${feil} FEIL` : 'Alle testene for tilfeldig.js er ok');
process.exit(feil ? 1 : 0);
