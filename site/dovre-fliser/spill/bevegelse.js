/* Bevegelse i førsteperson: regler uten DOM (Node: require('./bevegelse'); nettleser: globalThis.Bevegelse).
 * Brukeren 11. nov: «lag et bedre movement-system for første person». Myk akselerasjon og bremsing, gange, løping (med utholdenhet)
 * og huk, hopp med tyngdekraft, tregere i motbakke og stopp i de bratteste skråningene (over ca. 40°), ikke ut i vann, kroppen er
 * en sirkel på 0,3 m som glir langs vegger og trestammer, og hodet gynger litt i takt med skrittene. Tallene er forslag.
 */
(function (rot) {
  'use strict';
  const R = {
    gå: 1.7, løp: 5.5, huk: .9,              // m/s
    aks: 10, brems: 12, luft: .25,           // m/s²; luft: hvor mye du kan styre i lufta
    hopp: 4.2, g: 9.81,                      // m/s utgangsfart i hoppet, tyngdekraft
    øye: 1.7, øyeHuk: 1, radius: .3,         // m
    bratt: .84,                              // stigning (høyde/lengde) der det stopper: ca. 40°
    løpTid: 12, hvile: 6, løpIgjen: .25,     // s med løping på full utholdenhet; s for å fylles helt; må ha 25 % før du kan løpe igjen
    skritt: .75, gynge: .035,                // m per skritt; hvor mye hodet gynger opp og ned (m)
  };
  function ny(x, y, z) { return { x, y, z, vx: 0, vy: 0, vz: 0, bakke: true, huk: false, øye: R.øye, utholdenhet: 1, sliten: false, fase: 0, løper: false, fart: 0 }; }
  // inn: { fram, side (−1..1, kan være brøk fra styrespaken), retning (rad, 0 = nord/+y), løp, hopp, huk }
  // verden: { høyde(x, y) moh., hindring(x, y) -> true, vann(x, y) -> true }
  function steg(s, inn, dt, verden) {
    dt = Math.min(.1, Math.max(0, dt));
    s.huk = !!inn.huk && s.bakke;
    const l = Math.min(1, Math.hypot(inn.fram || 0, inn.side || 0));
    // løping tømmer utholdenheten; tom = sliten til den er fylt igjen litt
    const vilLøpe = inn.løp && l > .1 && !s.huk && !s.sliten;
    s.løper = vilLøpe && s.bakke;
    if (s.løper) { s.utholdenhet = Math.max(0, s.utholdenhet - dt / R.løpTid); if (s.utholdenhet === 0) s.sliten = true; }
    else { s.utholdenhet = Math.min(1, s.utholdenhet + dt / R.hvile); if (s.sliten && s.utholdenhet >= R.løpIgjen) s.sliten = false; }
    const maks = (s.huk ? R.huk : s.løper ? R.løp : R.gå) * l;
    // ønsket retning i kartet (retning = kameraets vinkel; fram = (−sin a, cos a), høyre = (cos a, sin a))
    const a = inn.retning || 0, fx = -Math.sin(a), fy = Math.cos(a), sx = Math.cos(a), sy = Math.sin(a);
    let dx = fx * (inn.fram || 0) + sx * (inn.side || 0), dy = fy * (inn.fram || 0) + sy * (inn.side || 0); const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    // bakken: motbakke gjør deg tregere, nedoverbakke litt raskere
    const h0 = verden.høyde(s.x, s.y), stig = l > 0 ? (verden.høyde(s.x + dx * .6, s.y + dy * .6) - h0) / .6 : 0;
    const bakkeFaktor = stig > 0 ? Math.max(.3, 1 - stig * 1.1) : 1 + Math.min(.15, -stig * .25);
    const mål = maks * bakkeFaktor, mx = l > 0 ? dx * mål : 0, my = l > 0 ? dy * mål : 0;
    // myk akselerasjon mot ønsket fart (mindre styring i lufta), og bremsing når du slipper
    const k = (l > 0 ? R.aks : R.brems) * (s.bakke ? 1 : R.luft) * dt, ex = mx - s.vx, ey = my - s.vy, el = Math.hypot(ex, ey);
    if (el > 0) { const f = Math.min(1, k / el); s.vx += ex * f; s.vy += ey * f; }
    // flytt: hver akse for seg, så du glir langs vegger; bratt, hindring og vann stopper
    const fritt = (x, y) => {
      if (verden.vann && verden.vann(x, y)) return false;
      for (const [ox, oy] of [[0, 0], [R.radius, 0], [-R.radius, 0], [0, R.radius], [0, -R.radius]]) if (verden.hindring && verden.hindring(x + ox, y + oy)) return false;
      if (s.bakke) { const d = Math.hypot(x - s.x, y - s.y); if (d > 1e-6 && (verden.høyde(x, y) - h0) / d > R.bratt) return false; }
      return true; };
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    if (!fritt(s.x, s.y) || fritt(nx, ny)) { s.x = nx; s.y = ny; }
    else if (fritt(nx, s.y)) { s.x = nx; s.vy = 0; }
    else if (fritt(s.x, ny)) { s.y = ny; s.vx = 0; }
    else { s.vx = 0; s.vy = 0; }
    // hopp og tyngdekraft
    const bakke = verden.høyde(s.x, s.y);
    if (inn.hopp && s.bakke && !s.huk) { s.vz = R.hopp; s.bakke = false; }
    if (!s.bakke) { s.vz -= R.g * dt; s.z += s.vz * dt; if (s.z <= bakke) { s.z = bakke; s.vz = 0; s.bakke = true; } }
    else { s.z += (bakke - s.z) * Math.min(1, dt * 18); if (Math.abs(bakke - s.z) > 1.5) s.z = bakke; }   // jevnt over små ujevnheter
    // øyehøyden og gyngingen i takt med skrittene
    s.øye += ((s.huk ? R.øyeHuk : R.øye) - s.øye) * Math.min(1, dt * 10);
    s.fart = Math.hypot(s.vx, s.vy); if (s.bakke) s.fase += s.fart * dt / R.skritt * Math.PI;
    const gyng = s.bakke ? Math.min(1, s.fart / R.gå) : 0;
    return { kx: s.x + Math.cos(a) * Math.sin(s.fase) * .02 * gyng, ky: s.y + Math.sin(a) * Math.sin(s.fase) * .02 * gyng, kz: s.z + s.øye + Math.abs(Math.sin(s.fase)) * R.gynge * gyng - R.gynge * gyng / 2 };
  }
  const api = { REGLER: R, ny, steg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Bevegelse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
