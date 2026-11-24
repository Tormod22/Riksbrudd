/* Snødekket: regler uten DOM (Node: require('./snodekke'); nettleser og bakgrunnstråden for kartflisene: globalThis.Snodekke).
 * FØRSTE SNØ (R19-1, 24. nov, brukerens bilder fra en fjelltur sent på høsten): et tynt snølag ligger flekkvis – mest i skyggesidene
 * (bort fra sola, mot nord), på flate, åpne jorder og på stein og berg, lite i tett skog og på bratte solsider, med ujevn kant. Gress og
 * lyng kikker opp gjennom tynn snø. Med mye snø (vinter, over snøgrensen) dekker snøen alt som før.
 * Den samme regelen brukes i bakken i 3D (skyggekoden, Snodekke.glsl()), fjernterrenget (spill/fjern3d.js), kartflisene i 2D
 * (kartflis.js) og minikartet (spill/kompass.js), så det ser likt ut nær og på avstand.
 *   dekke(V, moh, støy): hvor tykt snølaget er (0–1) i høyden moh (V = { snøgrense, pudder, pudderGrense } fra Vaer.tilstand)
 *   flekk(d, f): hvor mye av bakken snøen dekker (0–1) når laget er d tykt; f = { nord, flat, skog, stein, støy, fin }
 *     nord: normalens nordlige del (−1 bratt mot sør … 1 bratt mot nord; 0 flatt), flat: 0–1 (1 = flatt), skog: 0–1 (tett skog),
 *     stein: 0–1 (bart berg/stein), støy og fin: 0–1 (grovt og fint mønster som gir ujevn kant og strå som stikker opp)
 */
(function (rot) {
  'use strict';
  // Alle tallene er Claudes forslag.
  // full/pudder: overgangen (± meter) rundt snøgrensen og den lave grensen for førstesnøen; høydeStøy: hvor mye mønsteret flytter
  // grensen opp og ned (meter). basis … fin: vektene i «hvor lett snøen blir liggende her»; kant: hvor myk kanten mellom snø og bart er;
  // tykk: fra hvilken tykkelse snøen dekker alt; tynn: tykkelsen der laget går fra gjennomskinnelig til helt dekkende; tynnBunn: hvor
  // mye det tynneste laget dekker (resten er strå og lyng som stikker opp).
  const REGLER = { full: 70, pudder: 60, høydeStøy: 130, basis: .45, nord: .55, flat: .12, stein: .2, skog: .55, støy: .9, fin: .3,
    kant: .12, tykk: [.7, 1], tynn: [.25, .8], tynnBunn: .5 };
  const klem = v => Math.max(0, Math.min(1, v));
  const trinn = (a, b, x) => { const t = klem((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function dekke(V, moh, støy = .5) {
    if (!V) return 0; const R = REGLER, h = moh + (støy - .5) * R.høydeStøy;
    const full = V.snøgrense == null ? 0 : trinn(V.snøgrense - R.full, V.snøgrense + R.full, h);
    const p = V.pudder > 0 && V.pudderGrense != null ? V.pudder * trinn(V.pudderGrense - R.pudder, V.pudderGrense + R.pudder, h) : 0;
    return Math.max(full, p);
  }
  function flekk(d, f = {}) {
    const R = REGLER; if (!(d > 0)) return { andel: 0, tynn: 0, dekning: 0 };
    const nord = f.nord || 0, flat = f.flat == null ? 1 : f.flat, skog = f.skog || 0, stein = f.stein || 0, støy = f.støy == null ? .5 : f.støy, fin = f.fin == null ? .5 : f.fin;
    const score = R.basis + R.nord * nord + R.flat * flat + R.stein * stein - R.skog * skog + R.støy * (støy - .5) + R.fin * (fin - .5);
    const t = 1 - d; let andel = trinn(t - R.kant, t + R.kant, score);
    andel += (1 - andel) * trinn(R.tykk[0], R.tykk[1], d);
    const tynn = (R.tynnBunn + (1 - R.tynnBunn) * fin) + (1 - (R.tynnBunn + (1 - R.tynnBunn) * fin)) * trinn(R.tynn[0], R.tynn[1], d);
    return { andel, tynn, dekning: andel * tynn };
  }
  // tall i skyggekoden (GLSL vil ha desimalpunktum)
  const g = v => { const s = String(+v); return s.includes('.') || s.includes('e') ? s : s + '.0'; };
  // Den samme regelen som GLSL-funksjon (bare ASCII-navn): float snoDekke(...) og float snoFlekk(...)
  function glsl() {
    const R = REGLER;
    return `float snoDekke(float moh, float stoy, float grense, float pudder, float pGrense) {
  float h = moh + (stoy - 0.5) * ${g(R.høydeStøy)};
  float full = smoothstep(grense - ${g(R.full)}, grense + ${g(R.full)}, h);
  float p = pudder * smoothstep(pGrense - ${g(R.pudder)}, pGrense + ${g(R.pudder)}, h);
  return max(full, p);
}
float snoFlekk(float d, float nord, float flt, float skog, float stein, float stoy, float fin) {
  float score = ${g(R.basis)} + ${g(R.nord)} * nord + ${g(R.flat)} * flt + ${g(R.stein)} * stein - ${g(R.skog)} * skog + ${g(R.støy)} * (stoy - 0.5) + ${g(R.fin)} * (fin - 0.5);
  float t = 1.0 - d;
  float andel = smoothstep(t - ${g(R.kant)}, t + ${g(R.kant)}, score);
  andel += (1.0 - andel) * smoothstep(${g(R.tykk[0])}, ${g(R.tykk[1])}, d);
  float b = ${g(R.tynnBunn)} + ${g(1 - R.tynnBunn)} * fin;
  float tynn = b + (1.0 - b) * smoothstep(${g(R.tynn[0])}, ${g(R.tynn[1])}, d);
  return d > 0.0 ? andel * tynn : 0.0;
}
`;
  }
  // Fast, myk støy (0–1) i kartets meter – for 2D-kartet og fjernterrenget, der skyggekodens mønstertekstur ikke finnes.
  // skala: omtrent hvor stort ett flekk er (meter).
  function støy(X, Y, skala) {
    const x = X / skala, y = Y / skala;
    const s = Math.sin(x * 1.7 + Math.sin(y * 1.3) * 1.9) * Math.sin(y * 1.9 + Math.sin(x * 1.1) * 1.7) + .5 * Math.sin(x * 4.3 + y * 3.1) * Math.sin(y * 3.7 - x * 2.9);
    return klem(.5 + s / 3);
  }
  const api = { REGLER, dekke, flekk, glsl, støy, trinn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Snodekke = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
