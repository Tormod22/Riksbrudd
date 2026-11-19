'use strict';
/* Riksbrudd – NATT OG REGN I 2D-KARTET (runde 6, 19. nov – kritikken: «kl. 02:47 ser ut som midt på dagen», «2D-kartet viser verken
 * natt eller regn»). Kartet blir mørkere og blåere om natta etter den samme solhøyden og den samme myke overgangen som lyset i 3D
 * (lys3d i index.html: dag fra 8° under til 8° over horisonten, lyse sommernetter når sola er 4–14° under), og litt gråere og
 * mattere når det regner eller snør. Navn og merker tegnes oppå, så de er like lette å lese. Bare 2D (3D har sitt eget lys).
 * Reglene uten DOM: KartLys.tone({ e, regn, snø, sky }) -> { natt, farge, grå, mørk } (test_kartlys.js). KartLys.tegn(ctx) kalles
 * fra tegn() i index.html rett etter kartflisene. KartLys.av = true slår det av; i testene (webdriver) er det av til KartLys.test = true.
 */
(function (rot) {
  // Claudes forslag: hvor mørkt og blått natta blir, og hvor grått regnet gjør kartet
  const REGLER = {
    // multipliseres over kartet: full natt = kartet ganges med denne fargen med styrken natt
    nattFarge: [46, 64, 112], nattMaks: .62,
    // de lyse sommernettene (sola 4–14° under horisonten) gir litt lys tilbake – mindre enn i 3D, så 2D-kartet føles som natt
    tussmørke: .35,
    // regn/snø: fargene trekkes mot grått (metning) og kartet blir litt mørkere
    gråMaks: .45, mørkRegn: .1, mørkSky: .05,
    // NÆR ZOOM (kritikken: «på 20 m blir kartet uskarpt og flatt»): et fint mønster i bakken (gress, jord, småstein) som følger kartet,
    // helt inne under detaljFra m per punkt og borte fra detaljTil; mønsteret dekker detaljMeter × detaljMeter
    detaljFra: .25, detaljTil: .6, detaljStyrke: .5, detaljMeter: 25.6,
  };
  const klemt = v => Math.max(0, Math.min(1, v)), myk = t => t * t * (3 - 2 * t);
  // dagslys 0–1 som i lys3d: dag fra −8° til 8°, tussmørke fra −14° (lyse sommernetter)
  function dagslys(e) { const dag = myk(klemt((e + 8) / 16)), tu = klemt((e + 14) / 10); return Math.max(dag, myk(tu) * REGLER.tussmørke); }
  function tone(o = {}) { const e = typeof o.e === 'number' ? o.e : 40, nedbør = klemt(Math.max(o.regn || 0, o.snø || 0)), sky = klemt(((o.sky || 0) - .3) / .7);
    const natt = (1 - dagslys(e)) * REGLER.nattMaks;
    return { natt, farge: REGLER.nattFarge, grå: nedbør * REGLER.gråMaks, mørk: nedbør * REGLER.mørkRegn + sky * REGLER.mørkSky }; }
  // hvor sterkt mønsteret i bakken er ved m meter per punkt (0 langt ute)
  const detalj = m => REGLER.detaljStyrke * myk(klemt((REGLER.detaljTil - m) / (REGLER.detaljTil - REGLER.detaljFra)));
  // forskyvningen av mønsteret på skjermen, så det følger kartet (resten etter hele mønsterbredder – store tall gir ellers hakk)
  const forskyv = (v, m) => (((v % REGLER.detaljMeter) + REGLER.detaljMeter) % REGLER.detaljMeter) / m;
  const api = { REGLER, tone, dagslys, detalj, forskyv, av: false, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------- visningen ----------
  let sist = '', mønster = null;
  // mønsteret: verdistøy i tre størrelser som går sømløst rundt, mørke småsteiner og lyse gresstrå (fast frø – likt hver gang)
  function lagMønster(g0) { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N); let f = 1234567;
    const tilf = () => { f = (f * 1103515245 + 12345) & 0x7fffffff; return f / 0x7fffffff; };
    const lag = [[8, .45], [24, .35], [64, .2]].map(([n, w]) => ({ n, w, v: Array.from({ length: n * n }, tilf) }));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0;
      for (const L of lag) { const u = x / N * L.n, t = y / N * L.n, i0 = Math.floor(u), j0 = Math.floor(t), fu = myk(u - i0), fv = myk(t - j0), q = (i, j) => L.v[(j % L.n) * L.n + (i % L.n)];
        v += L.w * ((q(i0, j0) * (1 - fu) + q(i0 + 1, j0) * fu) * (1 - fv) + (q(i0, j0 + 1) * (1 - fu) + q(i0 + 1, j0 + 1) * fu) * fv); }
      const o = (y * N + x) * 4, k = 128 + (v - .5) * 150; im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.max(0, Math.min(255, k)); im.data[o + 3] = 255; }
    g.putImageData(im, 0, 0);
    for (let i = 0; i < 900; i++) { const x = tilf() * N, y = tilf() * N, l = 2 + tilf() * 4, a = (tilf() - .5) * .9; g.strokeStyle = `rgba(200,200,200,${.25 + tilf() * .3})`; g.lineWidth = .8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke(); }
    for (let i = 0; i < 260; i++) { const x = tilf() * N, y = tilf() * N, r = .6 + tilf() * 1.6; g.fillStyle = `rgba(40,40,40,${.3 + tilf() * .35})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    return g0.createPattern(c, 'repeat'); }
  api.detaljTegn = g => { if (!på() || typeof kam === 'undefined') return; const a = detalj(kam.m); if (a < .01) return;
    if (!mønster) { try { mønster = lagMønster(g); } catch (e) { mønster = false; } } if (!mønster || !mønster.setTransform) return;
    const vx0 = kam.x - VW / 2 * kam.m, vy1 = kam.y + VH / 2 * kam.m, s = REGLER.detaljMeter / 256 / kam.m, B = REGLER.detaljMeter / kam.m;
    mønster.setTransform(new DOMMatrix([s, 0, 0, s, -forskyv(vx0, kam.m), forskyv(vy1, kam.m) - B]));
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = a; g.fillStyle = mønster; g.fillRect(0, 0, VW, VH); g.restore(); };
  function nå() { const V = rot.VAER, h = (6 + tid / TIME) % 24;
    const e = V && rot.Vaer && Vaer.solHøyde ? Vaer.solHøyde(V.dag, h) : typeof solHøyde === 'function' ? solHøyde(h) : 40;
    return tone({ e, regn: V ? V.regn : 0, snø: V ? V.snø : 0, sky: V ? V.sky : 0 }); }
  api.nå = nå;
  // i testene (navigator.webdriver) er kartet som før, så vaktene som leser fargene i kartet ikke påvirkes – KartLys.test = true slår det på
  const på = () => !api.av && (!navigator.webdriver || api.test);
  api.tegn = g => { if (!på() || typeof tid === 'undefined') return; api.detaljTegn(g); api.tegnTone(g, nå()); };
  // tegnTone(g, T): tonen T (fra tone()) over hele lerretet – brukes av tegn() og av vakten (på et eget lite lerret)
  api.tegnTone = (g, T) => { if (T.natt < .01 && T.grå < .01 && T.mørk < .01) return;
    g.save();
    if (T.grå > .01) { g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${T.grå.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    if (T.natt > .01) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${T.farge.join(',')},${T.natt.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    if (T.mørk > .01) { g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(20,22,26,${T.mørk.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    g.restore(); };
  // kartet tegnes bare når noe er endret: tegn på nytt når tonen har flyttet seg merkbart (natt kommer gradvis)
  KROKER.sim.push(() => { if (!på()) return; const T = nå(), k = Math.round(T.natt * 40) + '|' + Math.round(T.grå * 40) + '|' + Math.round(T.mørk * 40); if (k !== sist) { sist = k; skitten = true; } });
  rot.KartLys = api;
})(typeof window !== 'undefined' ? window : globalThis);
