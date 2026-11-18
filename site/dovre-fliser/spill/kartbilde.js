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
    // stranda (runde 5): rutenes side (m), utjevning av kartets vann (m), hvor langt fra helt vann vannstanden spres (m), hvor høyt over
    // vannstanden det fortsatt er vann (m), hvor mange meter i høyde kanten tones over, støy på høyden (m) og på kartets vann (andel),
    // støyens to størrelser (m), den lyse sonen (m over vannet) og hvor lys den blir, den fuktige kanten (m over vannet) og hvor mørk,
    // stranda farge (lys grå stein og grus) og landets farge der kartet hadde vann som ikke er vann (lyng mot stein)
    strandCelle: 2.5, strandGlatt: 5, strandRekk: 40, strandNivå: .3, strandKant: .22, strandStøyH: .15, strandStøyKart: .16,
    strandStøyStor: 9, strandStøySmå: 3.2, strandSone: 1.3, strandLys: .55, strandVåt: .14, strandMørk: .28,
    strandFarge: [152, 146, 132], strandLand: [104, 100, 76],
    // terreng mer enn så mange meter under vannstanden regnes ikke med (nedenfor utløp og fosser)
    strandUnder: -.8,
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
  // 4. STRANDA (runde 5, 18.–19. nov: «hakkete strandkanter … vannflatene følger 32 m-ruter, så strendene ser trappete ut»).
  // Vannet i kartbildet er kartflisenes vannfarge, strukket fra grove ruter: kanten går i trapper, og rundt innsjøene på heia lå en mørk
  // ring (satellittbildets vann utenfor kartets vannflate). Høydedataene (Kartverket) har innsjøene helt flate: vannstanden er kjent.
  // Her lages kanten på nytt, punkt for punkt, før vannmasken (u.vann) lages – så gange, dyr og bygg følger det du ser:
  //  a. Ruter (ca. 2,5 m): hvor mye vann (kartet), utjevnet (runde hjørner der høyden ikke vet bedre).
  //  b. Vannstanden: fra ruter som er helt vann, spredt ut til ruter innen REGLER.strandRekk meter (nærmeste vanns høyde).
  //  c. Hvert punkt nær stranda: vann der terrenget ligger lavere enn vannstanden + strandNivå (med støy i kartets meter, så kanten
  //     blir ujevn som en ekte strand), land der det ligger over (også der kartet hadde vann). Uten kjent vannstand: kartet utjevnet.
  //     Kanten tones over ca. én meter.
  //  d. På land rett ved vannet: en lys sone med stein og grus (bredere der det er slakt, smal der det er bratt – den følger høyden over
  //     vannet) og en mørk, fuktig kant helt nede. Ikke ved havet (havnivå() i index.html har sin egen strand).
  // Gir antall punkter som ble endret. o.hav = true: høydenettet har hav (ingen lys sone under 1 moh.).
  // Glidende snitt over 2r + 1 punkter langs én linje i et M × M-gitter (start, steg = 1 langs raden eller M langs kolonnen), på stedet
  function glidLinje(A, start, steg, M, r, tmp) {
    let s = 0; const n = 2 * r + 1, at = k => A[start + (k < 0 ? 0 : k > M - 1 ? M - 1 : k) * steg];
    for (let k = -r; k <= r; k++) s += at(k);
    for (let k = 0; k < M; k++) { tmp[k] = s / n; s += at(k + r + 1) - at(k - r); }
    for (let k = 0, q = start; k < M; k++, q += steg) A[q] = tmp[k];
  }
  function* strandG(px, TW, H, N, cx, cy, S, o = {}) {
    const Rg = REGLER, mpp = 2 * S / TW, K = Math.max(1, Math.round(Rg.strandCelle / mpp)), M = Math.ceil(TW / K), cm = K * mpp;
    // a. vann per rute, og vannets farge i snitt
    // (hvert andre punkt i hver retning når rutene er minst to punkter brede – andelen blir nesten den samme, på en firedel av tiden)
    const f0 = new Float32Array(M * M), ant = new Uint16Array(M * M), sp = K >= 2 ? 2 : 1; let nV = 0, sR = 0, sG = 0, sB = 0;
    for (let y = 0; y < TW; y += sp) { if ((y & 63) === 0) yield; const rad = ((y / K) | 0) * M;
      for (let x = 0, q = y * TW * 4; x < TW; x += sp, q += 4 * sp) { const c = rad + ((x / K) | 0); ant[c]++; if (px[q + 3] < 200) continue; const R = px[q], G = px[q + 1], B = px[q + 2];
        if (erVann(R, G, B)) { f0[c]++; nV++; sR += R; sG += G; sB += B; } } }
    if (!nV) return 0;
    const vannF = [sR / nV, sG / nV, sB / nV];
    for (let c = 0; c < M * M; c++) { if ((c & 262143) === 0) yield; f0[c] /= ant[c] || 1; }
    yield;
    // utjevnet kart (to ganger en glidende firkant langs hver akse – nesten en gaussisk utjevning)
    const glatt = f0.slice(), tmp = new Float32Array(M), r = Math.max(1, Math.round(Rg.strandGlatt / cm));
    for (let gang = 0; gang < 2; gang++) for (let akse = 0; akse < 2; akse++) for (let a = 0; a < M; a++) { if ((a & 31) === 0) yield;
      glidLinje(glatt, akse ? a : a * M, akse ? M : 1, M, r, tmp); }
    // høyden midt i en rute (bilineært i høydenettet), og i et punkt i bildet
    const fH = (N - 1) / TW, hBilde = (x, y) => { const fx = (x + .5) * fH, fy = (y + .5) * fH, x0 = Math.min(N - 2, fx | 0), y0 = Math.min(N - 2, fy | 0), a = fx - x0, b = fy - y0, k = y0 * N + x0;
      return (H[k] * (1 - a) + H[k + 1] * a) * (1 - b) + (H[k + N] * (1 - a) + H[k + N + 1] * a) * b; };
    // b. vannstanden: kilder er ruter som er helt vann (og ikke ligger i en kant i det utjevnede), spredt med avstand (to gjennomløp)
    const INF = 1e9, avst = new Float32Array(M * M).fill(INF), nivå = new Float32Array(M * M), maks = Rg.strandRekk / cm, R2 = Math.SQRT2;
    for (let c = 0; c < M * M; c++) { if ((c & 131071) === 0) yield; if (f0[c] >= .99 && glatt[c] >= .9) { const cj = (c / M) | 0, ci = c - cj * M; avst[c] = 0; nivå[c] = hBilde(Math.min(TW - 1, ci * K + (K >> 1)), Math.min(TW - 1, cj * K + (K >> 1))); } }
    yield;
    const spre = (c, d, n) => { const v = avst[n] + d; if (v < avst[c]) { avst[c] = v; nivå[c] = nivå[n]; } };
    for (let j = 0; j < M; j++) { if ((j & 63) === 0) yield; for (let i = 0; i < M; i++) { const c = j * M + i; if (!avst[c]) continue;
      if (i > 0) spre(c, 1, c - 1); if (j > 0) { spre(c, 1, c - M); if (i > 0) spre(c, R2, c - M - 1); if (i < M - 1) spre(c, R2, c - M + 1); } } }
    for (let j = M - 1; j >= 0; j--) { if ((j & 63) === 0) yield; for (let i = M - 1; i >= 0; i--) { const c = j * M + i; if (!avst[c]) continue;
      if (i < M - 1) spre(c, 1, c + 1); if (j < M - 1) { spre(c, 1, c + M); if (i < M - 1) spre(c, R2, c + M + 1); if (i > 0) spre(c, R2, c + M - 1); } } }
    // c. punktene i rutene nær stranda (innen rekkevidden fra vannet, eller i kartets utjevnede kant)
    const X0 = cx - S, Y1 = cy + S, [lr, lg, lb] = Rg.strandFarge, nær = c => avst[c] <= maks || (glatt[c] > .01 && glatt[c] < .99);
    // nivået i et punkt: lineært mellom rutene som har det (ruter uten kjent nivå teller ikke). vekt: hvor mye høyden bestemmer –
    // den tones ut den siste tredjedelen av rekkevidden (ellers fikk kanten et hakk der rekkevidden slutter)
    let vekt = 0;
    const nivåVed = (x, y) => { const gx = (x + .5) / K - .5, gy = (y + .5) / K - .5, i0 = Math.max(0, Math.min(M - 1, Math.floor(gx))), j0 = Math.max(0, Math.min(M - 1, Math.floor(gy))), i1 = Math.min(M - 1, i0 + 1), j1 = Math.min(M - 1, j0 + 1), a = klem(gx - i0, 0, 1), b = klem(gy - j0, 0, 1);
      let s = 0, w = 0; vekt = 0;
      for (let k = 0; k < 4; k++) { const c = k & 1 ? (k & 2 ? j1 * M + i1 : j0 * M + i1) : (k & 2 ? j1 * M + i0 : j0 * M + i0), v = (k & 1 ? a : 1 - a) * (k & 2 ? b : 1 - b);
        if (avst[c] <= maks && v > 0) { s += nivå[c] * v; w += v; vekt += v * trinn(maks, maks * .66, avst[c]); } }
      return w > .001 ? s / w : NaN; };
    const glattVed = (x, y) => { const gx = (x + .5) / K - .5, gy = (y + .5) / K - .5, i0 = Math.max(0, Math.min(M - 2, Math.floor(gx))), j0 = Math.max(0, Math.min(M - 2, Math.floor(gy))), a = klem(gx - i0, 0, 1), b = klem(gy - j0, 0, 1), c = j0 * M + i0;
      return (glatt[c] * (1 - a) + glatt[c + 1] * a) * (1 - b) + (glatt[c + M] * (1 - a) + glatt[c + M + 1] * a) * b; };
    // ruter der ingenting kan skje, hoppes over: tørt land høyt over vannet (uten vann i kartet), og vann godt under vannstanden som alt
    // er vann i kartet. Høyden prøves i rutens fire hjørner.
    const tørr = Rg.strandNivå + Rg.strandSone * 1.4 + Rg.strandStøyH * 1.5 + .1, våtGrense = Rg.strandNivå - Rg.strandKant - Rg.strandStøyH * 1.5 - .1;
    let lo = 0, hi = 0;
    const hjørner = (ci, cj, L) => { const x0 = ci * K, y0 = cj * K, x1 = Math.min(TW - 1, x0 + K - 1), y1 = Math.min(TW - 1, y0 + K - 1);
      const a = hBilde(x0, y0) - L, b = hBilde(x1, y0) - L, c = hBilde(x0, y1) - L, d = hBilde(x1, y1) - L; lo = Math.min(a, b, c, d); hi = Math.max(a, b, c, d); };
    let endret = 0, arbeid = 0;
    for (let cj = 0; cj < M; cj++) {
      for (let ci = 0; ci < M; ci++) { const c = cj * M + ci; if (!avst[c] || !nær(c)) continue;
        if (avst[c] <= maks) { hjørner(ci, cj, nivå[c]); if ((glatt[c] < .01 && lo > tørr) || (f0[c] >= .999 && glatt[c] >= .97 && hi < våtGrense)) continue; }
        if ((arbeid += K * K) > 12000) { arbeid = 0; yield; }
        for (let y = cj * K; y < Math.min(TW, cj * K + K); y++) for (let x = ci * K; x < Math.min(TW, ci * K + K); x++) {
          const q = (y * TW + x) * 4; if (px[q + 3] < 200) continue;
          const X = X0 + (x + .5) * mpp, Y = Y1 - (y + .5) * mpp, n = (støy(X, Y, Rg.strandStøyStor) - .5) * 2 + (støy(X + 5113, Y - 2207, Rg.strandStøySmå) - .5);
          const L = nivåVed(x, y), R = px[q], G = px[q + 1], B = px[q + 2], var_ = erVann(R, G, B);
          // w: hvor mye vann (0–1) i punktet; dh: meter over vannstanden (NaN uten kjent vannstand)
          let w, dh = NaN;
          // kartets vann (utjevnet, med støy), og der vannstanden er kjent: høyden over den
          w = klem((glattVed(x, y) + n * Rg.strandStøyKart - .5) / .12 + .5, 0, 1);
          // (terreng godt UNDER vannstanden er ikke denne innsjøen – nedenfor et utløp, en foss eller en demning: da bestemmer kartet)
          if (L === L) { dh = hBilde(x, y) - L + n * Rg.strandStøyH; if (dh > Rg.strandUnder) w += (klem((Rg.strandNivå - dh) / Rg.strandKant + .5, 0, 1) - w) * vekt * trinn(Rg.strandUnder, Rg.strandUnder + .3, dh); else dh = NaN; }
          if (w > .5 !== var_) endret++;
          if (w >= .5) {
            // vann: vannets farge (litt av punktets eget mønster blir med, som i resten av vannet)
            // (også der kartet alt hadde vann: den gamle kanten var en mørkere stripe inne i vannet)
            const t = var_ ? .8 * trinn(.99, .85, glattVed(x, y)) : .9 + .1 * trinn(.5, .8, w); px[q] = R + (vannF[0] - R) * t; px[q + 1] = G + (vannF[1] - G) * t; px[q + 2] = B + (vannF[2] - B) * t;
            continue; }
          // land: der kartet hadde vann, fargen fra landet rundt (stein og lyng i lysere og mørkere flekker)
          let r0 = R, g0 = G, b0 = B;
          if (var_) { const l = 1 + n * .12; r0 = Rg.strandLand[0] * l; g0 = Rg.strandLand[1] * l; b0 = Rg.strandLand[2] * l; }
          // d. strandsonen: lys stein og grus opp til strandSone meter over vannet, mørk og fuktig helt nede
          if (dh === dh && !(o.hav && L < 1)) {
            const over = dh - Rg.strandNivå, sone = Rg.strandSone * (.65 + .35 * (n + 1)), lys = trinn(sone, 0, over) * Rg.strandLys, våt = trinn(Rg.strandVåt, 0, over);
            const m = .92 + (((x * 73856093) ^ (y * 19349663)) & 15) / 100;
            r0 += (lr * m - r0) * lys; g0 += (lg * m - g0) * lys; b0 += (lb * m - b0) * lys;
            const f = 1 - Rg.strandMørk * våt; r0 *= f; g0 *= f; b0 *= f;
          }
          // kanten mot vannet tones (en meter eller så)
          const t = w * 2 * .6; px[q] = r0 + (vannF[0] - r0) * t; px[q + 1] = g0 + (vannF[1] - g0) * t; px[q + 2] = b0 + (vannF[2] - b0) * t;
          // (et kantpunkt skal ikke bli regnet som vann av vannmasken)
          if (erVann(px[q], px[q + 1], px[q + 2])) px[q + 2] = Math.min(px[q + 2], px[q] + 17);
        } } }
    return endret;
  }
  // kjør en generator helt ut (Node-testene og reserven)
  const kjør = it => { let r; while (!(r = it.next()).done); return r.value; };
  const api = { REGLER, snøFast, striperG, snøTilBergG, relieffG, strandG, støy, kjør };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Kartbilde = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
