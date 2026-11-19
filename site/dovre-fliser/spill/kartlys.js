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
    nattFarge: [46, 64, 112], nattMaks: .58,
    // regn/snø: fargene trekkes mot grått (metning) og kartet blir litt mørkere
    gråMaks: .45, mørkRegn: .1, mørkSky: .05,
  };
  const klemt = v => Math.max(0, Math.min(1, v)), myk = t => t * t * (3 - 2 * t);
  // dagslys 0–1 som i lys3d: dag fra −8° til 8°, tussmørke fra −14° (lyse sommernetter)
  function dagslys(e) { const dag = myk(klemt((e + 8) / 16)), tu = klemt((e + 14) / 10); return Math.max(dag, myk(tu) * .55); }
  function tone(o = {}) { const e = typeof o.e === 'number' ? o.e : 40, nedbør = klemt(Math.max(o.regn || 0, o.snø || 0)), sky = klemt(((o.sky || 0) - .3) / .7);
    const natt = (1 - dagslys(e)) * REGLER.nattMaks;
    return { natt, farge: REGLER.nattFarge, grå: nedbør * REGLER.gråMaks, mørk: nedbør * REGLER.mørkRegn + sky * REGLER.mørkSky }; }
  const api = { REGLER, tone, dagslys, av: false, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------- visningen ----------
  let sist = '';
  function nå() { const V = rot.VAER, h = (6 + tid / TIME) % 24;
    const e = V && rot.Vaer && Vaer.solHøyde ? Vaer.solHøyde(V.dag, h) : typeof solHøyde === 'function' ? solHøyde(h) : 40;
    return tone({ e, regn: V ? V.regn : 0, snø: V ? V.snø : 0, sky: V ? V.sky : 0 }); }
  api.nå = nå;
  // i testene (navigator.webdriver) er kartet som før, så vaktene som leser fargene i kartet ikke påvirkes – KartLys.test = true slår det på
  const på = () => !api.av && (!navigator.webdriver || api.test);
  api.tegn = g => { if (!på() || typeof tid === 'undefined') return; const T = nå(); if (T.natt < .01 && T.grå < .01 && T.mørk < .01) return;
    g.save();
    if (T.grå > .01) { g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${T.grå.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    if (T.natt > .01) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${T.farge.join(',')},${T.natt.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    if (T.mørk > .01) { g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(20,22,26,${T.mørk.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    g.restore(); };
  // kartet tegnes bare når noe er endret: tegn på nytt når tonen har flyttet seg merkbart (natt kommer gradvis)
  KROKER.sim.push(() => { if (!på()) return; const T = nå(), k = Math.round(T.natt * 40) + '|' + Math.round(T.grå * 40) + '|' + Math.round(T.mørk * 40); if (k !== sist) { sist = k; skitten = true; } });
  rot.KartLys = api;
})(typeof window !== 'undefined' ? window : globalThis);
