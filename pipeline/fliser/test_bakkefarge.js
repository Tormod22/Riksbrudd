// Test: spill/bakkefarge.js – bakkens farge i 3D (runde 15: «litt for sandaktig, litt for gul»).
const B = require('../../site/dovre-fliser/spill/bakkefarge.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL', t); } else console.log('ok  ', t); };
const H = c => B.hsv(...c);
const etter = (c, d = 0) => B.punkt(c[0], c[1], c[2], [0, 0, 0], B.REGLER, d);
// den gamle regelen (før runde 15), for å se at det som ikke er vegetasjon, er uendret
const gammel = ([R, G, Bl]) => { const l = .3 * R + .59 * G + .11 * Bl; return [(l + (R - l) * 1.15) * 1.1, (l + (G - l) * 1.18) * 1.12, (l + (Bl - l) * 1.15) * 1.1].map(v => Math.max(0, Math.min(255, v))); };
const likt = (a, b, e = .6) => a.every((v, i) => Math.abs(v - b[i]) < e);
// 1. Gul-oliven eng (satellittfargen på Jæren) blir grønnere: tonen opp minst 10°, mer metning, ikke lysere
const eng = [120, 115, 70], e1 = etter(eng);
ok(H(e1)[0] - H(eng)[0] > 10, `eng dreies mot grønt (${H(eng)[0].toFixed(0)}° -> ${H(e1)[0].toFixed(0)}°)`);
ok(H(e1)[1] > H(eng)[1], 'eng får mer metning');
ok(H(e1)[2] <= H(gammel(eng))[2] + .005, 'eng blir ikke lysere enn med den gamle regelen (mindre «sand»)');
// 2. På dyrket mark enda grønnere, men ikke turkis/blågrønn
const e2 = etter(eng, 1);
ok(H(e2)[0] > H(e1)[0] + 4 && H(e2)[0] < 100, `dyrket mark grønnere enn annen eng (${H(e2)[0].toFixed(0)}°)`);
const matt = [110, 104, 82], m2 = etter(matt, 1);
ok(H(m2)[0] > 65, `matt gulbrun åker på dyrket mark blir gulgrønn (${H(matt)[0].toFixed(0)}° -> ${H(m2)[0].toFixed(0)}°)`);
// 3. Brun lyng og myr (tone under 34°) dreies ikke: heia skal fortsatt være brunlig
for (const c of [[105, 90, 70], [96, 80, 66], [120, 96, 74]]) ok(likt(etter(c), gammel(c)), `brun lyng ${c} som før`);
// 4. Grått berg, grus, veg og by: uendret
for (const c of [[130, 128, 122], [90, 90, 92], [150, 148, 140], [70, 70, 68]]) ok(likt(etter(c), gammel(c)), `grått ${c} som før`);
// 5. Lys sand, strand og snø: uendret (ikke grønn strand)
for (const c of [[215, 205, 175], [235, 235, 240], [200, 190, 160]]) ok(likt(etter(c), gammel(c), 1.5), `lyst ${c} som før`);
// 6. Vann som før
const v = etter([60, 90, 140]); ok(likt(v, [60 * .2 + 92 * .8, 90 * .2 + 126 * .8, 140 * .2 + 152 * .8]), 'vann som før');
// 7. Grønt som alt er grønt, dreies lite (ikke blågrønt)
const g = [70, 95, 55], g1 = etter(g); ok(H(g1)[0] - H(g)[0] < 8 && H(g1)[0] < 110, `grønn eng dreies lite (${H(g)[0].toFixed(0)}° -> ${H(g1)[0].toFixed(0)}°)`);
// 8. HSV fram og tilbake
for (const c of [[10, 200, 30], [200, 100, 50], [30, 60, 200], [128, 128, 128]]) { const [h, s, vv] = B.hsv(...c); ok(likt(B.rgb(h, s, vv, [0, 0, 0]), c, .01), `hsv/rgb ${c}`); }
// 9. Snitt over en «hei» fra Dovre (blanding av lyng, gress og berg) skal ikke bli grønn: tonen høyst 72°
const hei = [[96, 92, 70], [104, 96, 74], [88, 84, 66], [120, 116, 104], [92, 80, 62]].map(c => etter(c));
const hs = hei.map(H), snittH = hs.reduce((a, h) => a + h[0], 0) / hs.length;
ok(snittH < 72, `heia er fortsatt grågrønn/brunlig (snitt ${snittH.toFixed(0)}°)`);
// 10. Maske for dyrket mark: utjevnet mellom 32 m-rutene
const kv = { w: 4, h: 4, r: 32, x0: 0, y0: 128, K: new Uint8Array([0, 0, 0, 0, 0, 5, 5, 0, 0, 5, 5, 0, 0, 0, 0, 0]) };
const M = B.dyrketMaske(kv, [0, 0, 128, 128], 64);
ok(M.v[32 * 64 + 32] === 255, 'midt i den dyrkede blokka: full');
ok(M.v[2 * 64 + 2] === 0, 'i hjørnet: ingenting');
ok(M.v[32 * 64 + 13] > 0 && M.v[32 * 64 + 13] < 255, 'myk kant');
// 11. naturfarger på et lite bilde gir det samme som punkt()
const px = new Uint8ClampedArray([120, 115, 70, 255, 105, 90, 70, 255]); B.naturfarger(px, 2, 0, 1);
ok(likt([px[0], px[1], px[2]], etter(eng), 1) && likt([px[4], px[5], px[6]], gammel([105, 90, 70]), 1), 'naturfarger = punkt()');
// 12. fart: 4096 × 256 punkter (en stripe i 3D) under 400 ms
const S = new Uint8ClampedArray(4096 * 256 * 4); for (let i = 0; i < S.length; i++) S[i] = (i * 37) % 200 + 30;
const t0 = Date.now(); B.naturfarger(S, 4096, 0, 256, { W: 512, v: new Uint8Array(512 * 512).fill(128) }); const ms = Date.now() - t0;
ok(ms < 400, `en stripe 4096 × 256 på ${ms} ms`);
console.log(feil ? feil + ' FEIL' : 'alt ok'); process.exit(feil ? 1 : 0);
