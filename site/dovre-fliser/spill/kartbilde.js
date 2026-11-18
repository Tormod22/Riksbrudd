/* Riksbrudd – KARTBILDET I 3D (18. nov, brukeren: «ting så litt svakt ut i vanlig 3D-view … bare den vanlige 3D-kart»).
 * Bilder fra Rogaland viste tre ting som gjorde kartet blast ovenfra:
 *  1. STRIPER: satellittmosaikken (Landsat) har lyse, vannrette skanne-striper som går tvers over kartet (de er der også med bare
 *     kartbildet, uten lys og tåke). striperG jevner ut lysstyrken rad for rad – men bare der avviket går samme vei over nesten hele
 *     bredden (ekte landskap gjør ikke det), og høyst REGLER.stripeMaks.
 *  2. FALSK SNØ: snøfonner i satellittbildene lå som kritthvite flekker på heia hele året (og så ut som snø om høsten). snøTilBergG maler
 *     hvite punkter under den faste snøgrensen (snøFast – breene ligger over den) som bart fjell. Snø fra været legger bakken på som før.
 *  3. FLATT: heia var én jevn olivenfarge. relieffG gjør søkk og daler litt mørkere og rygger litt lysere (fra høydenettet) og gir lyng og
 *     berg flekker i to størrelser (fast etter kartets meter, så nabo-utsnitt passer sammen).
 * Alt bakes inn i kartbildet når utsnittet bygges (ingen kostnad per bilde, virker på alle grafikknivåer). Reglene er uten DOM
 * (Node: require('./kartbilde'), test: node pipeline/fliser/test_kartbilde.js). Generatorene gir yield mellom bitene (kjørAsynk i index.html).
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene):
  const REGLER = {
    // striper: blokker på tvers, hvor mange rader som er «naboer» (i meter), største retting, og hvor stor andel av blokkene som må være enige
    stripeBlokker: 16, stripeNabo: 160, stripeMaks: .1, stripeMin: .008, stripeEnige: .75,
    // falsk snø: lysstyrke og gråhet som regnes som snø, og hvor mange meter under den faste snøgrensen den er helt borte
    snøLys: 172, snøFull: 212, snøGrå: 30, snøOvergang: 120,
    // bart fjell (litt varmt grått) og hvor mye av satellittbildets eget mønster som beholdes
    berg: [136, 132, 121], bergMønster: .35,
    // relieff: radius for «nabolaget» (meter), hvor mange meter under nabolaget som gir full skygge, styrken i søkk og på rygger
    hulR: 110, hulDyp: 26, hulMørk: .2, ryggLys: .07,
    // flekker: to størrelser (meter) og styrke (andel lysstyrke), litt grønnere/brunere med den store
    flekkStor: 230, flekkSmå: 55, flekkStorK: .12, flekkSmåK: .09, flekkFarge: .05,
  };
  // Den faste snøgrensen (moh.) etter hvor langt nord: 1150 m i Rogaland/Hordaland, ca. 1040 i Jotunheimen, ca. 870 ved Svartisen,
  // ca. 730 i Lyngen. Breene ligger over den (lave bretunger blir grå – det er prisen). Claudes forslag.
  const snøFast = Y => Math.max(650, Math.min(1200, 1150 - (Y - 6600000) * .00035));
  const klem = (v, a, b) => (v < a ? a : v > b ? b : v), trinn = (a, b, v) => { const t = klem((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const erVann = (R, G, B) => B > R + 18 && B > G + 4;

  // 1. Striper. Middel per (rad, blokk) uten vann, snø og gjennomsiktig; avviket fra nabolaget langs radene; bare rader der blokkene er
  // enige om retningen rettes, med medianen av avvikene. o.mpp = meter per punkt.
  function* striperG(px, TW, o = {}) {
    const B = REGLER.stripeBlokker, bw = Math.ceil(TW / B), sum = new Float64Array(TW * B), ant = new Float64Array(TW * B);
    for (let y = 0; y < TW; y++) { if ((y & 63) === 0) yield;
      for (let x = 0; x < TW; x += 2) { const q = (y * TW + x) * 4, R = px[q], G = px[q + 1], Bl = px[q + 2]; if (px[q + 3] < 200 || erVann(R, G, Bl)) continue;
        const l = .3 * R + .59 * G + .11 * Bl; if (l > REGLER.snøLys || l < 12) continue; const k = y * B + ((x / bw) | 0); sum[k] += l; ant[k]++; } }
    const W = Math.max(3, Math.round(REGLER.stripeNabo / (o.mpp || 4))), mid = new Float64Array(TW * B);
    for (let b = 0; b < B; b++) for (let y = 0; y < TW; y++) { const k = y * B + b; mid[k] = ant[k] > bw * .15 ? sum[k] / ant[k] : NaN; }
    // nabolaget: snitt av blokkens middel W rader opp og ned (prefikssummer langs radene)
    const rett = new Float32Array(TW).fill(1), pre = new Float64Array(TW + 1), preN = new Float64Array(TW + 1), avv = new Float32Array(TW * B).fill(NaN);
    for (let b = 0; b < B; b++) { if ((b & 3) === 0) yield;
      for (let y = 0; y < TW; y++) { const v = mid[y * B + b], ok = v === v; pre[y + 1] = pre[y] + (ok ? v : 0); preN[y + 1] = preN[y] + (ok ? 1 : 0); }
      for (let y = 0; y < TW; y++) { const v = mid[y * B + b]; if (v !== v) continue; const a = Math.max(0, y - W), c = Math.min(TW, y + W + 1), n = preN[c] - preN[a];
        if (n < W) continue; avv[y * B + b] = v / ((pre[c] - pre[a]) / n) - 1; } }
    let rettet = 0; const liste = [];
    for (let y = 0; y < TW; y++) { liste.length = 0; for (let b = 0; b < B; b++) { const d = avv[y * B + b]; if (d === d) liste.push(d); }
      if (liste.length < B * .5) continue; liste.sort((p, q) => p - q); const D = liste[liste.length >> 1]; if (Math.abs(D) < REGLER.stripeMin) continue;
      const enige = liste.filter(d => Math.sign(d) === Math.sign(D)).length / liste.length; if (enige < REGLER.stripeEnige) continue;
      rett[y] = 1 / (1 + klem(D, -REGLER.stripeMaks, REGLER.stripeMaks)); rettet++; }
    for (let y = 0; y < TW; y++) { if ((y & 63) === 0) yield; const f = rett[y]; if (f === 1) continue;
      for (let x = 0, q = y * TW * 4; x < TW; x++, q += 4) { if (px[q + 3] < 200) continue; px[q] = klem(px[q] * f, 0, 255); px[q + 1] = klem(px[q + 1] * f, 0, 255); px[q + 2] = klem(px[q + 2] * f, 0, 255); } }
    return rettet;
  }

  // 2. Falsk snø. H er høydenettet (N × N over hele bildet, moh.), y-aksen i bildet går sørover fra Y1 = cy + S.
  function* snøTilBergG(px, TW, H, N, cy, S) {
    const f = (N - 1) / TW, Rg = REGLER, [br, bg, bb] = Rg.berg; let n = 0;
    for (let y = 0; y < TW; y++) { if ((y & 31) === 0) yield; const j = Math.min(N - 1, Math.round((y + .5) * f)), Y = cy + S - (y + .5) * 2 * S / TW, grense = snøFast(Y);
      for (let x = 0; x < TW; x++) { const q = (y * TW + x) * 4, R = px[q], G = px[q + 1], B = px[q + 2]; if (px[q + 3] < 200) continue;
        const l = (R + G + B) / 3; if (l < Rg.snøLys || Math.max(R, G, B) - Math.min(R, G, B) > Rg.snøGrå) continue;
        const h = H[j * N + Math.min(N - 1, Math.round((x + .5) * f))]; if (!(h < grense)) continue;
        const w = trinn(Rg.snøLys, Rg.snøFull, l) * trinn(grense, grense - Rg.snøOvergang, h); if (w <= 0) continue;
        // bart fjell, med litt av satellittbildets eget mønster (lysere/mørkere flekker) og fast småvariasjon
        const m = 1 + (l - (Rg.snøLys + Rg.snøFull) / 2) / 255 * Rg.bergMønster + (((x * 73856093) ^ (y * 19349663)) & 15) / 300 - .025;
        px[q] = R + (br * m - R) * w; px[q + 1] = G + (bg * m - G) * w; px[q + 2] = B + (bb * m - B) * w; n++; } }
    return n;
  }

  // Verdistøy (0–1) i kartets meter, fast for samme sted
  const hsh = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function støy(X, Y, P) { const x = X / P, y = Y / P, i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = hsh(i, j), b = hsh(i + 1, j), c = hsh(i, j + 1), d = hsh(i + 1, j + 1); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; }

  // 3. Relieff og flekker. Først et faktorgitter (M × M over bildet: lysstyrke + litt farge), så hvert punkt med lineær blanding.
  function* relieffG(px, TW, H, N, cx, cy, S, M = 512) {
    const Rg = REGLER, steg = 2 * S / (N - 1), r = Math.max(1, Math.round(Rg.hulR / steg));
    // prefikssummer over høydenettet: snittet i en firkant rundt hvert punkt
    const P = new Float64Array((N + 1) * (N + 1));
    for (let j = 0; j < N; j++) { if ((j & 63) === 0) yield; let rad = 0; for (let i = 0; i < N; i++) { const h = H[j * N + i]; rad += h === h ? h : 0; P[(j + 1) * (N + 1) + i + 1] = P[j * (N + 1) + i + 1] + rad; } }
    const hul = new Float32Array(N * N);
    for (let j = 0; j < N; j++) { if ((j & 63) === 0) yield; const j0 = Math.max(0, j - r), j1 = Math.min(N, j + r + 1);
      for (let i = 0; i < N; i++) { const i0 = Math.max(0, i - r), i1 = Math.min(N, i + r + 1), n = (j1 - j0) * (i1 - i0), s = P[j1 * (N + 1) + i1] - P[j0 * (N + 1) + i1] - P[j1 * (N + 1) + i0] + P[j0 * (N + 1) + i0];
        const h = H[j * N + i]; hul[j * N + i] = h === h ? klem((s / n - h) / Rg.hulDyp, -1, 1) : 0; } }
    // faktorgitteret: [lys, rødt, grønt] per celle
    const F = new Float32Array(M * M * 3), cm = 2 * S / M, fN = (N - 1) / (M - 1);
    for (let gy = 0; gy < M; gy++) { if ((gy & 31) === 0) yield; const Y = cy + S - (gy + .5) * cm, jj = gy * fN, j = Math.min(N - 2, Math.floor(jj)), tv = jj - j;
      for (let gx = 0; gx < M; gx++) { const X = cx - S + (gx + .5) * cm, ii = gx * fN, i = Math.min(N - 2, Math.floor(ii)), tu = ii - i;
        const a = hul[j * N + i], b = hul[j * N + i + 1], c = hul[(j + 1) * N + i], d = hul[(j + 1) * N + i + 1], hv = (a + (b - a) * tu) * (1 - tv) + (c + (d - c) * tu) * tv;
        const s1 = støy(X, Y, Rg.flekkStor) - .5, s2 = støy(X + 9137, Y - 4211, Rg.flekkSmå) - .5;
        const lys = (hv > 0 ? 1 - Rg.hulMørk * hv : 1 - Rg.ryggLys * hv) * (1 + Rg.flekkStorK * s1 * 2 + Rg.flekkSmåK * s2 * 2), k = (gy * M + gx) * 3;
        F[k] = lys; F[k + 1] = 1 - Rg.flekkFarge * s1 * 2; F[k + 2] = 1 + Rg.flekkFarge * s1 * 2; } }
    // hvert punkt: lineært mellom cellene (raden blandes først loddrett, så langs raden). Vann og gjennomsiktig røres ikke; snø halvt.
    const gxAv = new Int32Array(TW), tx = new Float32Array(TW), fM = (M - 1) / (TW - 1), rad = new Float32Array(M * 3);
    for (let x = 0; x < TW; x++) { const g = x * fM; gxAv[x] = Math.min(M - 2, Math.floor(g)); tx[x] = g - gxAv[x]; }
    let n = 0;
    for (let y = 0; y < TW; y++) { if ((y & 31) === 0) yield; const g = y * fM, gy = Math.min(M - 2, Math.floor(g)), t = g - gy;
      for (let k = 0, a = gy * M * 3, b = (gy + 1) * M * 3; k < M * 3; k++) rad[k] = F[a + k] + (F[b + k] - F[a + k]) * t;
      for (let x = 0, q = y * TW * 4; x < TW; x++, q += 4) { const R = px[q], G = px[q + 1], B = px[q + 2]; if (px[q + 3] < 200 || erVann(R, G, B)) continue;
        const k = gxAv[x] * 3, u = tx[x], lys = rad[k] + (rad[k + 3] - rad[k]) * u, fr = rad[k + 1] + (rad[k + 4] - rad[k + 1]) * u, fg = rad[k + 2] + (rad[k + 5] - rad[k + 2]) * u;
        const l = (R + G + B) / 3, w = l > Rg.snøLys ? .5 : 1, L = 1 + (lys - 1) * w;
        px[q] = klem(R * L * (1 + (fr - 1) * w), 0, 255); px[q + 1] = klem(G * L * (1 + (fg - 1) * w), 0, 255); px[q + 2] = klem(B * L, 0, 255); n++; } }
    return n;
  }
  // kjør en generator helt ut (Node-testene og reserven)
  const kjør = it => { let r; while (!(r = it.next()).done); return r.value; };
  const api = { REGLER, snøFast, striperG, snøTilBergG, relieffG, støy, kjør };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Kartbilde = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
