// Test av spill/kartbilde.js (striper, falsk snø, relieff i kartbildet til 3D). Kjør: node pipeline/fliser/test_kartbilde.js
const K = require('../../site/dovre-fliser/spill/kartbilde.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const lys = (px, q) => .3 * px[q] + .59 * px[q + 1] + .11 * px[q + 2];
// et prøvebilde: lyngfarge med litt mønster
function bilde(TW, f) { const px = new Uint8ClampedArray(TW * TW * 4); for (let y = 0; y < TW; y++) for (let x = 0; x < TW; x++) { const q = (y * TW + x) * 4, c = f(x, y); px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = 255; } return px; }
const TW = 256, lyng = (x, y) => { const v = 8 * Math.sin(x * .3) * Math.cos(y * .21); return [118 + v, 112 + v, 70 + v]; };

// 1. striper: hver 16. rad (3 rader tykke) er 8 % lysere over hele bredden -> rettes
{ const px = bilde(TW, (x, y) => { const c = lyng(x, y), s = y % 16 < 3 ? 1.08 : 1; return c.map(v => v * s); });
  const radSnitt = y => { let s = 0; for (let x = 0; x < TW; x++) s += lys(px, (y * TW + x) * 4); return s / TW; };
  const før = radSnitt(33) / radSnitt(40), n = K.kjør(K.striperG(px, TW, { mpp: 4 })), etter = radSnitt(33) / radSnitt(40);
  ok(n > 30 && Math.abs(etter - 1) < Math.abs(før - 1) / 3, `stripene rettes (${n} rader, forhold ${før.toFixed(3)} -> ${etter.toFixed(3)})`); }
// … men et ekte trekk som bare går over en del av bredden (en lys åker til venstre) røres ikke
{ const px = bilde(TW, (x, y) => (x < 60 && y > 100 && y < 104 ? [190, 180, 120] : lyng(x, y))), kopi = px.slice(), n = K.kjør(K.striperG(px, TW, { mpp: 4 }));
  let d = 0; for (let i = 0; i < px.length; i++) d += Math.abs(px[i] - kopi[i]); ok(n === 0 && d === 0, `et lokalt lyst felt rettes ikke (${n} rader)`); }
// vann og snø teller ikke med i snittet
{ const px = bilde(TW, (x, y) => (x > 128 ? [70, 100, 140] : lyng(x, y))), kopi = px.slice(); K.kjør(K.striperG(px, TW, { mpp: 4 }));
  let d = 0; for (let i = 0; i < px.length; i++) d += Math.abs(px[i] - kopi[i]); ok(d === 0, 'halvt vann gir ingen retting'); }

// 2. falsk snø: hvitt under den faste snøgrensen blir grått berg, over blir det stående
{ const N = 33, S = 1000, cy = 6620000, grense = K.snøFast(cy);
  ok(grense > 1000 && grense < 1200 && K.snøFast(7700000) < 800 && K.snøFast(7700000) >= 650, `snøgrensen ${Math.round(grense)} i Rogaland, ${Math.round(K.snøFast(7700000))} i Troms`);
  const H = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = i < N / 2 ? 700 : 1500;
  const px = bilde(TW, () => [235, 236, 238]); K.kjør(K.snøTilBergG(px, TW, H, N, cy, S));
  const lav = (40 * TW + 20) * 4, høy = (40 * TW + 230) * 4;
  ok(lys(px, lav) < 170 && Math.max(px[lav], px[lav + 1], px[lav + 2]) - Math.min(px[lav], px[lav + 1], px[lav + 2]) < 30, `snø på 700 moh. blir berg (${px[lav]},${px[lav + 1]},${px[lav + 2]})`);
  ok(px[høy] === 235 && px[høy + 2] === 238, 'snø på 1500 moh. blir stående (bre)');
  const px2 = bilde(TW, lyng), k2 = px2.slice(); K.kjør(K.snøTilBergG(px2, TW, H, N, cy, S)); let d = 0; for (let i = 0; i < px2.length; i++) d += Math.abs(px2[i] - k2[i]);
  ok(d === 0, 'lyng og andre farger røres ikke'); }

// 3. relieff: et søkk blir mørkere enn flata rundt, en rygg lysere; vann røres ikke
{ const N = 65, S = 1000, cx = 100000, cy = 6620000, H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const d1 = Math.hypot(i - 16, j - 32), d2 = Math.hypot(i - 48, j - 32); H[j * N + i] = 500 - 40 * Math.exp(-d1 * d1 / 20) + 40 * Math.exp(-d2 * d2 / 20); }
  const px = bilde(TW, (x, y) => (y < 20 ? [70, 100, 140] : [120, 115, 72])), kopi = px.slice(); K.kjør(K.relieffG(px, TW, H, N, cx, cy, S, 128));
  const p = (i, j) => { const x = Math.round(i / (N - 1) * (TW - 1)), y = Math.round(j / (N - 1) * (TW - 1)); return lys(px, (y * TW + x) * 4); };
  const søkk = p(16, 32), rygg = p(48, 32), flat = p(32, 56);
  ok(søkk < flat * .93, `søkket er mørkere (${søkk.toFixed(0)} mot ${flat.toFixed(0)})`);
  ok(rygg > søkk + 5, `ryggen er lysere enn søkket (${rygg.toFixed(0)})`);
  let vd = 0; for (let y = 0; y < 18; y++) for (let x = 0; x < TW; x++) { const q = (y * TW + x) * 4; vd += Math.abs(px[q] - kopi[q]); } ok(vd === 0, 'vannet røres ikke');
  // flekkene er faste etter kartets meter: samme sted gir samme verdi
  ok(K.støy(123456, 6620000, 230) === K.støy(123456, 6620000, 230) && K.støy(1, 2, 60) >= 0 && K.støy(1, 2, 60) <= 1, 'støyen er fast og mellom 0 og 1'); }

console.log(feil ? `${feil} feil` : 'alle kartbildetester ok'); process.exit(feil ? 1 : 0);
