// Test av gatemøblene (site/dovre-fliser/spill/gate.js): busskur, benker, søppelkasser, sykkelstativ, holdeplasskilt og postkasser.
// Kjør: node pipeline/fliser/test_gate.js
const G = require('../../site/dovre-fliser/spill/gate.js');
let feil = 0;
const sjekk = (ok, tekst) => { if (!ok) feil++; console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); };

// Et oppdiktet tettsted (meter fra midten, dx/dy flytter alt, så vi kan teste at samme sted i kartet gir samme ting):
// en riksveg (R) gjennom sentrum langs x, en kommunal veg (K) opp fra den i x = 100 (T-kryss), en privat veg (P) utenfor sentrum med eneboliger,
// en butikk inntil riksvegen og en skole. Bakken er flat (z 0), vegbanen ligger 15 cm over.
function scene(dx = 0, dy = 0) {
  const linje = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 2.5), P = []; for (let i = 0; i <= n; i++) P.push([x0 + (x1 - x0) * i / n - dx, y0 + (y1 - y0) * i / n - dy, .15]); return P; };
  const veger = [{ k: 'R', by: true, P: linje(-700, 0, 94, 0) }, { k: 'R', by: true, P: linje(106, 0, 700, 0) }, { k: 'K', by: true, P: linje(100, 6, 100, 300) },
    { k: 'P', by: false, P: linje(-300, 200, -40, 200) },
    // to smale private veger tett inntil riksvegen (gatemøbler på fortauet der ville stått i kjørebanen på den)
    { k: 'P', by: false, P: linje(-640, 7, -420, 7) }, { k: 'P', by: false, P: linje(-640, -7, -420, -7) }];
  const node = { x: 100 - dx, y: -dy, d: 6, by: true, armer: [{ x: 94 - dx, y: -dy, dx: -1, dy: 0, w: 3.75, k: 'R', by: true, L: 6 }, { x: 106 - dx, y: -dy, dx: 1, dy: 0, w: 3.75, k: 'R', by: true, L: 6 },
    { x: 100 - dx, y: 6 - dy, dx: 0, dy: 1, w: 2.75, k: 'K', by: true, L: 6 }] };
  const kryss = [node]; kryss.nær = (x, y, e) => Math.hypot(x - node.x, y - node.y) < node.d + e;
  const hus = [];
  const rekt = (x, y, bx, by, t, k) => hus.push({ x0: x - bx / 2 - dx, x1: x + bx / 2 - dx, y0: y - by / 2 - dy, y1: y + by / 2 - dy, x: x - dx, y: y - dy, t, k, A: bx * by });
  rekt(0, 20, 20, 14, 7, 3);            // butikk med kjede, 13 m fra vegmidten
  rekt(-300, -40, 40, 20, 9);           // skole
  for (let x = -280; x <= -60; x += 22) rekt(x, 214, 10, 8, 0);   // eneboliger langs P-vegen
  for (let y = 30; y <= 280; y += 25) rekt(115, y, 10, 9, 0);     // eneboliger langs K-vegen
  const ok = (x, y) => !hus.some(h => x > h.x0 - 2.4 && x < h.x1 + 2.4 && y > h.y0 - 2.4 && y < h.y1 + 2.4);
  return { veger, kryss, ok, bygg: hus.map(h => ({ x: h.x, y: h.y, t: h.t, k: h.k, A: h.A })), cx: 500000 + dx, cy: 7000000 + dy, hus };
}
// bakken: flat, men øst for x = 450 (i kartet) ligger riksvegen i en skjæring 3 m under terrenget – der stemmer ikke fortauet med bakken
const bakke = s => (x, y) => (x + s.cx > 500450 ? 3 : 0);
const kjør = (s, tak) => G.plasser(s.veger, { cx: s.cx, cy: s.cy, S: 2000, kryss: s.kryss, bygg: s.bygg, ok: s.ok, bakke: bakke(s), tak });
const s = scene(), ut = kjør(s), P = G.punkter(ut), ant = Object.fromEntries(G.SLAG.map(k => [k, P[k].length / 3]));
console.log('antall', JSON.stringify(ant));

// busskur: minst to langs 1,4 km riksveg, minst 420 m mellom dem, ikke nær krysset, hvert med kilt på begge sider av vegen
const skur = []; for (let q = 0; q < P.skur.length; q += 3) skur.push([P.skur[q], P.skur[q + 1]]);
const minAvst = Math.min(...skur.flatMap((a, i) => skur.slice(i + 1).map(b => Math.hypot(a[0] - b[0], a[1] - b[1]))));
sjekk(skur.length >= 2 && skur.length <= 4 && (skur.length < 2 || minAvst >= G.BUSS_AVSTAND), `busskur: ${skur.length}, minste avstand ${Math.round(minAvst)} m`);
sjekk(skur.every(([x, y]) => Math.hypot(x - 100, y) > 20), 'ingen busskur i krysset');
sjekk(skur.every(([x, y]) => Math.abs(Math.abs(y) - (3.75 + 1.35)) < .05), 'busskurene står på fortauet (midten 1,35 m fra kantsteinen)');
sjekk(ant.skilt >= skur.length * 2 - 1, `holdeplasskilt på begge sider: ${ant.skilt}`);
// busskuret vender den åpne siden mot vegen: modellens +y (−sin r, cos r) peker mot vegmidten
sjekk(ut.skur.length && Array.from({ length: ut.skur.length / 4 }, (_, k) => { const y = ut.skur[k * 4 + 1], r = ut.skur[k * 4 + 3]; return Math.cos(r) * -Math.sign(y) > .99; }).every(Boolean), 'busskurene vender mot vegen');
sjekk(ant.benk >= 3 && ant.søppel >= 4, `benker ${ant.benk} og søppelkasser ${ant.søppel} langs fortauene`);
// sykkelstativ ved butikken og skolen (to ved skolen)
const nærBygg = (x0, y0, r) => { let n = 0; for (let q = 0; q < P.sykkel.length; q += 3) if (Math.hypot(P.sykkel[q] - x0, P.sykkel[q + 1] - y0) < r) n++; return n; };
sjekk(nærBygg(0, 20, 20) >= 1 && nærBygg(-300, -40, 30) >= 2, `sykkelstativ ved butikken ${nærBygg(0, 20, 20)} og skolen ${nærBygg(-300, -40, 30)}`);
sjekk(ant.postkasse >= 4, `postkassestativ ved eneboligene: ${ant.postkasse}`);
// postkassene står ved P/K-vegen, og har 1–3 kasser
const pk = []; for (let q = 0; q < ut.postkasse.length; q += 6) pk.push(ut.postkasse.slice(q, q + 6));
sjekk(pk.every(p => (Math.abs(p[1] - 200) < 4 || Math.abs(p[0] - 100) < 6) && p[4] >= 1 && p[4] <= 3), 'postkassene står ved vegkanten og har 1–3 kasser');

// ingenting på en kjørebane, i/inntil hus, eller oppå hverandre
const VR = G.vegRute(s.veger); let påVeg = 0, iHus = 0, tett = 0; const alle = [];
for (const k of G.SLAG) for (let q = 0; q < P[k].length; q += 3) { const x = P[k][q], y = P[k][q + 1]; if (VR.nær(x, y, 0)) påVeg++; if (!s.ok(x, y)) iHus++; alle.push([x, y, k]); }
for (let i = 0; i < alle.length; i++) for (let j = i + 1; j < alle.length; j++) if (Math.hypot(alle[i][0] - alle[j][0], alle[i][1] - alle[j][1]) < G.RAD[alle[i][2]] + G.RAD[alle[j][2]]) tett++;
sjekk(påVeg === 0 && iHus === 0 && tett === 0, `på kjørebanen ${påVeg}, i/inntil hus ${iHus}, oppå hverandre ${tett}`);
// høyden: på fortauet (vegbanen + 15 cm) eller på bakken, og ingenting på fortauet i skjæringen
sjekk(G.SLAG.every(k => { for (let q = 0; q < P[k].length; q += 3) { const z = P[k][q + 2], b = bakke(s)(P[k][q], P[k][q + 1]); if (!(Math.abs(z - .3) < .01 && b === 0 || Math.abs(z - b) < .01)) return false; } return true; }), 'alt står på fortauet eller bakken (ingenting i skjæringen)');

// samme sted gir samme ting: hele scenen flyttet (utsnittets midte et annet sted) gir de samme kartpunktene
const kart = (u, sc) => G.SLAG.map(k => { const p = G.punkter(u)[k], l = []; for (let q = 0; q < p.length; q += 3) l.push(Math.round(p[q] + sc.cx) + ',' + Math.round(p[q + 1] + sc.cy)); return k + ':' + l.sort().join(' '); }).join('|');
const s2 = scene(37, -11);
sjekk(kart(ut, s) === kart(kjør(s2), s2), 'samme sted i kartet gir samme ting (utsnittet flyttet 37 m / −11 m)');
sjekk(kart(ut, s) === kart(kjør(scene()), s), 'samme svar to ganger');
// taket: busskur og skilt beholdes, resten kuttes
const lite = G.punkter(kjør(s, 8)), n = k => lite[k].length / 3;
sjekk(n('skur') === ant.skur && n('skilt') === ant.skilt && n('benk') + n('søppel') + n('sykkel') + n('postkasse') <= Math.max(0, 8 - n('skur') - n('skilt')), `taket (8): ${JSON.stringify(Object.fromEntries(G.SLAG.map(k => [k, n(k)])))}`);
// uten veger: ingenting
sjekk(G.SLAG.every(k => !G.plasser([], {})[k].length), 'uten veger: ingen gatemøbler');
console.log(feil ? `${feil} FEIL` : 'alt ok');
process.exit(feil ? 1 : 0);
