// Test for spill/etikett.js (navn som ikke ligger oppå hverandre): node pipeline/fliser/test_etikett.js
const E = require('../../site/dovre-fliser/spill/etikett.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const overlapp = (a, b, w) => Math.abs(a[0] - b[0]) < w && Math.abs(a[1] - b[1]) < E.LINJE - 1e-9;
// fem navn på samme sted (lagene rundt leiren sett langt ute): alle får hver sin linje oppover
E.nullstill(); const ys = []; for (let i = 0; i < 5; i++) ys.push(E.plass(200, 300, 90, -1));
ok(ys[0] === 300 && E.overlapp() === 0 && ys.every((y, i) => y === 300 - i * E.LINJE), 'fem navn på samme sted stables oppover: ' + ys.join(', '));
// navn under symbolet flyttes nedover
E.nullstill(); const a = E.plass(100, 100, 80, 1), b = E.plass(100, 104, 60, 1);
ok(a === 100 && b > a && b - a >= E.LINJE - 4 - 1e-9 && b === 104 + E.LINJE, 'navn under symbolet flyttes nedover: ' + a + ', ' + b);
// navn langt fra hverandre røres ikke; naboer som så vidt overlapper sideveis, flyttes
E.nullstill(); const p1 = E.plass(100, 100, 80), p2 = E.plass(400, 100, 80), p3 = E.plass(170, 100, 80);
ok(p1 === 100 && p2 === 100 && p3 === 100 - E.LINJE, 'bare navn som overlapper flyttes: ' + [p1, p2, p3].join(', '));
// kjøretøyene i 3D sto 45 m fra hverandre med lange navn: ingen to navn overlapper etterpå
E.nullstill(); const navn = [[1056, 560, 120], [1100, 560, 80], [1150, 560, 75], [1200, 560, 130]].map(([x, y, w]) => [x, E.plass(x, y, w), w]);
let par = 0; for (let i = 0; i < navn.length; i++) for (let j = i + 1; j < navn.length; j++) if (overlapp(navn[i], navn[j], (navn[i][2] + navn[j][2]) / 2)) par++;
ok(par === 0, 'fire kjøretøynavn tett i tett: ingen overlapper (' + navn.map(n => n[1]).join(', ') + ')');
// nullstill tømmer, og det er et tak på hvor langt et navn flyttes
E.nullstill(); ok(E.antall() === 0, 'nullstill tømmer lista');
for (let i = 0; i < 40; i++) E.plass(0, 0, 50); ok(E.plass(0, 0, 50) >= -E.MAKS * E.LINJE, 'et navn flyttes høyst ' + E.MAKS + ' linjer');
ok(E.overlapp() > 0, 'overlapp() teller navnene som ikke fikk plass (' + E.overlapp() + ' par)');
// et navn som alt er tegnet (infrastrukturen) meldes inn med merk(): neste navn på samme sted flyttes unna
E.nullstill(); E.merk([100 - 30, 200 - 8, 60, 16]); const yUnna = E.plass(100, 205, 50);
ok(yUnna < 205 && E.overlapp() === 0, 'et lagnavn oppå et infrastrukturnavn flyttes unna (y ' + yUnna + ')');

// RUNDE 6: utsatt plassering etter viktighet (fiender > valgt > egne lag > kjøretøy > bygg/steder)
const lapp = (t, x, y, prio, retning = -1, w = 80) => ({ t, x, y, w, h: E.LINJE, retning, prio, nr: 0 });
{ // to navn på samme sted: det viktigste står der det skulle, det andre flyttes
  const a = lapp('Vaktlaget', 200, 300, 3), b = lapp('Kari (deg)', 200, 300, 3), f = lapp('Røvere', 200, 300, 6); [a, b, f].forEach((L, i) => { L.nr = i; });
  E.plasser([a, b, f], []); ok(f.vis && f.px === 200 && f.py === 300, 'fienden får plassen sin først (' + f.px + ', ' + f.py + ')');
  ok(a.vis && b.vis && !(a.px === b.px && a.py === b.py) && a.py !== 300, 'de egne lagene flyttes unna fienden og hverandre'); }
{ // et merke (flagget) skyver navnet bort: merket ligger øverst
  const L = lapp('Leiren til Jærvernet', 200, 282, 2, -1, 120); E.plasser([L], [{ r: [201, 262, 30, 20], prio: 9, tekst: false }]);
  const r = E.ramme(L.px, L.py, L.w, L.h), over = r[0] < 231 && 201 < r[0] + r[2] && r[1] < 282 && 262 < r[1] + r[3];
  ok(L.vis && !over, 'navnet går utenom flagget (' + L.px + ', ' + L.py + ')'); }
{ // mange navn på samme punkt (/norge, 200 km-zoom): ingen lang søyle – de som ikke får plass innen to linjer, skjules
  const ls = []; for (let i = 0; i < 9; i++) ls.push(Object.assign(lapp('Lag ' + i, 700, 400, 3), { nr: i })); E.plasser(ls, []);
  const vist = ls.filter(L => L.vis), maks = Math.max(...vist.map(L => Math.abs(L.py - 400)));
  ok(vist.length >= 3 && vist.length < 9 && maks <= 2 * E.LINJE + 40, `${vist.length} av 9 vises, høyst ${maks} px fra plassen (ingen søyle)`);
  const flere = vist.reduce((a, L) => a + L.flere, 0); ok(flere === 9 - vist.length, `de skjulte telles som «+${flere}» ved navnene som står`); }
{ // bygg/steder skjules når det ikke er plass; de viktigste (fiender) står likevel, oppå kartnavn men ikke oppå merker
  const kart = [{ r: [0, 0, 2000, 2000], prio: .5, tekst: true }], s = lapp('Brakke', 300, 300, 1, 1), fi = lapp('Røvere', 300, 300, 6);
  E.plasser([s, fi], kart); ok(!s.vis && fi.vis && !fi.tvunget, 'et sted skjules under kartnavn, fienden står oppå kartnavnet'); }
{ // tekst() i en ramme: svarer NaN og tegnes av tegnAlle med fargen tegneren satte etterpå
  const tegnet = [], g = { font: '600 13px "Cormorant Garamond",serif', textAlign: 'center', textBaseline: 'alphabetic', globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    measureText: t => ({ width: t.length * 7 }), fillText(t, x, y) { tegnet.push(['fyll', t, x, y, this.fillStyle, this.font]); }, strokeText(t, x, y) { tegnet.push(['strek', t, x, y, this.strokeStyle]); }, save() {}, restore() {} };
  E.nullstill(); const y = E.tekst(g, '0 t olje', 100, 100, 1); g.lineWidth = 3; g.strokeStyle = '#111'; g.strokeText('0 t olje', 100, y); g.fillStyle = '#f0d79a'; g.fillText('0 t olje', 100, y);
  ok(Number.isNaN(y) && tegnet.length === 0, 'i en ramme tegnes navnet ikke med en gang');
  E.tegnAlle(g); const f = tegnet.filter(q => q[0] === 'fyll');
  ok(f.length >= 2 && f.every(q => q[4] === '#f0d79a') && f.some(q => q[1] === '0' && !/Cormorant/.test(q[5])) && tegnet.some(q => q[0] === 'strek' && q[4] === '#111'),
    'tegnAlle tegner med tegnerens farger, og sifrene i en skrift med vanlige tall (' + f.map(q => q[1] + '|' + q[5].split('px')[1].trim().slice(0, 18)).join(', ') + ')');
  ok(!E.aktiv(), 'rammen er ferdig etter tegnAlle');
  E.regel(t => (t === 'skjul meg' ? false : undefined)); E.nullstill(); E.tekst(g, 'skjul meg', 10, 10, 1); E.tekst(g, 'vis meg', 10, 10, 1); g.fillText('vis meg', 10, NaN); tegnet.length = 0; E.tegnAlle(g);
  ok(!tegnet.some(q => q[1] === 'skjul meg') && tegnet.some(q => /vis/.test(q[1])), 'en regel kan skjule et navn'); }
// (runde 8) to fiendelag på nesten samme sted, omringet av merker og andre navn: lappene legges ikke oppå hverandre – den ene slås sammen («+1»)
{ const L = []; for (let i = 0; i < 12; i++) L.push({ t: 'egen' + i, x: 100 + (i % 3) * 10, y: 40 + Math.floor(i / 3) * 15, w: 60, h: 15, retning: -1, prio: 3, nr: i });
  L.push({ t: 'Kystalliansens 3. lag · nå', x: 100, y: 100, w: 140, h: 15, retning: 1, prio: 6, nr: 20 }, { t: 'Kystalliansens 4. lag · nå', x: 110, y: 100, w: 140, h: 15, retning: 1, prio: 6, nr: 21 });
  const H = []; for (let k = -8; k <= 8; k++) H.push({ r: [0, 100 + k * 15 - 12, 300, 14], prio: 9, tekst: false });
  E.plasser(L, H); const vis = L.filter(q => q.vis && q.prio === 6), over = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  ok(vis.length >= 1 && !vis.some((a, i) => vis.some((b, j) => j > i && over(a.ramme, b.ramme))) && vis.reduce((a, q) => a + q.flere, 0) + vis.length === 2, 'to fiendelag nær hverandre: ingen lapper oppå hverandre, den ene står som «+1»'); }
// (runde 12) én skrift i kartet: sans-serif blir kartets skrift (litt større, minst halvfet), andre skrifter er som før
{ const K = E.kartFont; ok(/Cormorant/.test(K('11px sans-serif')) && /^600 12\.6px/.test(K('11px sans-serif')), '«11px sans-serif» blir kartets skrift: ' + K('11px sans-serif'));
  ok(/^bold 15px .*Cormorant/.test(K('bold 13px sans-serif')) && /^italic 600 /.test(K('italic 12px Arial')), 'fet og kursiv beholdes: ' + K('bold 13px sans-serif') + ' / ' + K('italic 12px Arial'));
  ok(K('600 13px "Cormorant Garamond", serif') === '600 13px "Cormorant Garamond", serif' && K('12px Georgia, serif') === '12px Georgia, serif', 'skrifter med seriffer røres ikke'); }
// (runde 13, kritikk G) lag og kjøretøy ved leiren blir én lapp «Leiren: 3 lag, 1 kjøretøy ›»; fiender, det valgte og ting langt unna røres ikke
{ const hvem = t => (/^Lag/.test(t) ? 'lag' : /^Bil/.test(t) ? 'kjøretøy' : null), S = { x: 400, y: 300, hvem };
  const L = [['Lag 1', 400, 284], ['Lag 2', 420, 290], ['Kari (deg)', 0, 0], ['Lag 3', 390, 270], ['Bil 1', 380, 300], ['Lag fjern', 700, 284], ['Røvere', 405, 284]].map(([t, x, y], i) => ({ t, x, y, w: 60, h: 15, retning: -1, prio: /Røvere/.test(t) ? 6 : 3, nr: i }));
  const r = E.samle(L, S); ok(r && r.n.lag === 3 && r.n.kjøretøy === 1 && r.inne.every(q => q.samlet) && !L.find(q => q.t === 'Lag fjern').samlet && !L.find(q => q.t === 'Røvere').samlet,
    'samle: tre lag og ett kjøretøy ved leiren, ikke laget langt unna eller fienden: ' + (r && JSON.stringify(r.n)));
  ok(E.samleTekst(r.n) === 'Leiren: 3 lag, 1 kjøretøy ›' && E.samleTekst({ lag: 2, kjøretøy: 0 }) === 'Leiren: 2 lag ›', 'teksten: ' + E.samleTekst(r.n));
  ok(E.samle(L.slice(0, 1), S) === null && E.samle(L, null) === null, 'ett lag alene eller uten leir: ingen samling');
  // i en ramme: navnene ved leiren tegnes ikke, samlelappen står, og ingenting ligger oppå hverandre
  const tegnet = [], g = { font: '600 13px serif', textAlign: 'center', textBaseline: 'alphabetic', globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    measureText: t => ({ width: t.length * 7 }), fillText(t, x, y) { tegnet.push(t); }, strokeText() {}, save() {}, restore() {} };
  E.nullstill(); E.samleSted(S); for (const q of L) { const y = E.tekst(g, q.t, q.x, q.y, -1, q.prio); g.fillText(q.t, q.x, y); } E.tegnAlle(g);
  const tekst = tegnet.join(''); ok(/Leiren: 3 lag, 1 kjøretøy/.test(tekst) && !/Lag 1/.test(tekst) && /Røvere/.test(tekst) && /Lag fjern/.test(tekst) && E.overlapp() === 0 && E.samling() && E.samling().n.alle === 4,
    'i rammen: én samlelapp, fienden og laget langt unna står, ingen overlapp (' + E.tegnet().map(n => n.t).join(' | ') + ')'); }
process.exit(feil ? 1 : 0);
