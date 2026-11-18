// Test av grensa i 3D (spill/grense3d.js) med den ekte Rogaland-fila. Kjør: node pipeline/fliser/test_grense3d.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const O = require('../../site/dovre-fliser/spill/omraade.js'), G = require('../../site/dovre-fliser/spill/grense3d.js');
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; };
const R = O.les(JSON.parse(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/data/rogaland.json'), 'utf8')));
const t0 = Date.now(), M = G.maske(R), tid = Date.now() - t0;
ok(M.W % 4 === 0 && Math.max(M.W, M.H) <= G.REGLER.punkter + 4 && M.d.length === M.W * M.H, 'masken har riktig størrelse');
ok(M.ts > 80 && M.ts < 120, 'ca. 100 m per punkt i Rogaland: ' + M.ts.toFixed(1));
ok(M.x0 < R.bb[0] && M.y0 < R.bb[1] && M.x1 > R.bb[2] && M.y1 > R.bb[3], 'masken dekker hele området med luft rundt');
// generatoren gir det samme som alt i ett
const it = G.maskeG(R); let r, steg = 0; while (!(r = it.next()).done) steg++;
ok(steg > 20 && Buffer.compare(Buffer.from(r.value.d), Buffer.from(M.d)) === 0, 'generatoren gir samme maske (' + steg + ' biter)');
// kjente steder
const inne = { Stavanger: [-33500, 6573500], Sandnes: [-31500, 6560000], Haugesund: [-50500, 6628500], Egersund: [-27000, 6515500], Sauda: [20000, 6639000] };
const ute = { Bergen: [-32000, 6735000], Odda: [28500, 6681000], Kristiansand: [88000, 6466000], 'langt til havs': [-200000, 6570000], Oslo: [262000, 6650000] };
for (const [navn, [x, y]] of Object.entries(inne)) ok(G.verdi(M, x, y) > .99 && G.mørke(M, x, y) < .01, navn + ' er lyst');
for (const [navn, [x, y]] of Object.entries(ute)) ok(G.verdi(M, x, y) < .01 && Math.abs(G.mørke(M, x, y) - G.REGLER.mørk) < .01, navn + ' er mørklagt');
// tilfeldige punkter: mer enn 1 km fra grensa er masken som Omraade.inni
let f = 99; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
let langt = 0, galt = 0;
for (let k = 0; k < 4000; k++) {
  const x = M.x0 + rnd() * (M.x1 - M.x0), y = M.y0 + rnd() * (M.y1 - M.y0), d = O.tilGrensa(R, x, y), v = G.verdi(M, x, y), inn = O.inni(R, x, y);
  if (d > 1000) { langt++; if (inn ? v < .98 : v > .02) galt++; }
}
ok(langt > 1000 && galt === 0, `langt fra grensa: ${galt} av ${langt} feil`);
// rett på grensa: midt mellom (myk overgang)
let påG = 0, påMidt = 0;
for (let i = 0; i + 1 < R.P.length; i += 3) { const a = R.P[i], b = R.P[i + 1], x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2, v = G.verdi(M, x, y); påG++; if (v > .1 && v < .9) påMidt++; }
ok(påMidt / påG > .8, `rett på grensa er masken mellom 0,1 og 0,9 i ${påMidt} av ${påG}`);
// overgangen er myk: fra 150 m til 450 m inn går verdien jevnt opp (målt langs en normal ved Sauda mot Hordaland)
{ const i = R.P.findIndex(p => p[1] > 6655000 && p[0] > 10000 && p[0] < 40000), a = R.P[i], b = R.P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L > 50) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, s = O.inni(R, mx + nx * 2000, my + ny * 2000) ? 1 : -1;
    const v = d => G.verdi(M, mx + s * nx * d, my + s * ny * d), rekke = [-900, -450, -150, 0, 150, 450, 900].map(v);
    ok(rekke.every((x, k) => k === 0 || x >= rekke[k - 1] - .02) && rekke[0] < .1 && rekke[6] > .9, 'myk overgang over grensa: ' + rekke.map(x => x.toFixed(2)).join(' ')); } }
// selvtest: en maske med feil (et hull midt i Stavanger) blir funnet av sjekken over
{ const F = { ...M, d: M.d.slice() }, u = Math.floor((-33500 - M.x0) / M.ts), v = Math.floor((6573500 - M.y0) / M.ts); for (let j = v - 3; j <= v + 3; j++) for (let i = u - 3; i <= u + 3; i++) F.d[j * M.W + i] = 0;
  ok(G.verdi(F, -33500, 6573500) < .5, 'selvtest: hullet synes'); }
// grensas biter i et utsnitt ved Sauda (ca. 6 km rundt): noen biter, punkter hver ca. 15 m, alle inne i boksen
{ const bb = [20000 - 6000, 6655000 - 6000, 20000 + 6000, 6655000 + 6000], B = G.biter(R, bb);
  const alle = B.flat(); ok(B.length >= 1 && alle.length > 50, 'grensa ved Sauda: ' + B.length + ' biter, ' + alle.length + ' punkter');
  ok(alle.every(([x, y]) => x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3]), 'alle punktene er i boksen');
  let maks = 0; for (const b of B) for (let k = 1; k < b.length; k++) maks = Math.max(maks, Math.hypot(b[k][0] - b[k - 1][0], b[k][1] - b[k - 1][1]));
  ok(maks <= G.REGLER.strekSteg + 1e-6, 'punktene ligger tett: ' + maks.toFixed(1) + ' m'); }
ok(G.biter(R, [-33500, 6573500, -33400, 6573600]).length === 0, 'ingen grense midt i Stavanger');
// hele ringen i en stor boks: én lukket bit
{ const B = G.biter(R, [M.x0, M.y0, M.x1, M.y1]); ok(B.length === 1, 'hele grensa er én bit'); }
console.log(`ok   grensa i 3D: ${n} sjekker (masken ${M.W} × ${M.H} på ${tid} ms)`);
