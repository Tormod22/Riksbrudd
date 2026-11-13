'use strict';
// Navnene på lag, kjøretøy, basen og leiren skal ikke ligge oppå hverandre (feiljakten 12. nov: ved leiren sto fem navn i én klump).
// Regler uten DOM (test: pipeline/fliser/test_etikett.js). Hver ramme: Etikett.nullstill(), og så spør hver tegner
// Etikett.plass(x, y, bredde, retning) om hvor navnet skal stå. Er plassen tatt, flyttes navnet en linje om gangen
// oppover (retning −1, navn over symbolet) eller nedover (retning 1, navn under symbolet) til det er ledig.
(function (rot) {
  const LINJE = 15, MAKS = 30, tatt = [];
  // (MAKS var 12: med lag og kjøretøy tett samlet ved leiren, sett langt ute, fikk ikke det 13. og 14. navnet plass – 13. nov)
  // rammen rundt en tekst med midten i x og grunnlinja i y (13 px skrift): litt luft på sidene
  const ramme = (x, y, w, h) => [x - w / 2 - 3, y - h + 3, w + 6, h];
  const kolliderer = r => tatt.some(q => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]);
  function nullstill() { tatt.length = 0; }
  // plass(x, y, w, retning, h): y-en teksten skal tegnes i. Plassen blir merket som tatt.
  function plass(x, y, w, retning = -1, h = LINJE) {
    let r = ramme(x, y, w, h), yy = y;
    for (let i = 0; i < MAKS && kolliderer(r); i++) { yy += (retning < 0 ? -1 : 1) * h; r = ramme(x, yy, w, h); }
    tatt.push(r); return yy;
  }
  // merk(r): en ramme [x, y, bredde, høyde] som alt er tegnet av andre (navnene på infrastrukturen, tegnEtiketter i index.html), så
  // navnene på lag, kjøretøy og olje ikke legges oppå dem (feiljakten 12. nov: «STURE», «MONGSTAD» og «500 t olje» i én klump)
  function merk(r) { tatt.push([r[0], r[1], r[2], r[3]]); }
  // tekst(g, t, x, y, retning): måler teksten med skriften som er satt i g, og gir y-en den skal tegnes i
  function tekst(g, t, x, y, retning) { return plass(x, y, g.measureText(t).width, retning); }
  // overlapp(): antall par av navn som fortsatt ligger oppå hverandre i denne rammen (0 når alt fikk plass) – for vakten i sjekk.js
  function overlapp() { let n = 0; for (let i = 0; i < tatt.length; i++) for (let j = i + 1; j < tatt.length; j++) { const r = tatt[i], q = tatt[j];
    if (r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]) n++; } return n; }
  const E = { nullstill, plass, merk, tekst, antall: () => tatt.length, overlapp, LINJE, MAKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else rot.Etikett = E;
})(typeof window !== 'undefined' ? window : globalThis);
