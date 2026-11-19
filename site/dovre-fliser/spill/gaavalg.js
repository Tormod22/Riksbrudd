/* «Gå hit» og døra: regler uten DOM (Node: require('./gaavalg'); nettleser: globalThis.Gaavalg). Visningen er i spill/gange.js.
 * Runde 6 (19. nov, kritikken): «Gå» satte deg alltid ved leiren/karakteren, også når kameraet så på gården 800 m unna, så husene var
 * utenfor rekkevidde (dagen før var klagen at det så ut som du teleporterte). Nå spør «Gå» når kameraet ser langt fra karakteren:
 * «Reis hit (ca. N min til fots)» – karakteren går dit og spilltiden går tilsvarende – eller «Gå her, der du står».
 * Og på telefon var døra vanskelig å treffe (åpningen er 1,1 m, kroppen 0,6 m): nå trekkes du inn mot midten av døra når du går mot
 * den, og knappene «Gå inn» / «Gå ut» går gjennom døra for deg.
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene):
  const REGLER = {
    // kameraet ser innen så mange meter fra karakteren: «Gå» starter der karakteren står uten å spørre
    nær: 60,
    // fart til fots i terrenget (km/t) og omvegen (terrenget er ikke en rett linje)
    kmt: 4, omveg: 1.25,
    // lenger enn dette (m) reiser du ikke i ett strekk: gå i etapper
    maks: 6000,
    // farten spillet spoles med mens du reiser (ganger sanntid), og hvor lenge reisen minst vises (sekunder)
    spol: 600, minVis: 1.2,
    dør: {
      // «Gå inn» vises når du står ute innen så mange meter fra en inngang; «Gå ut» inne når døra er nærmere enn ute (telefon: alltid inne)
      nær: 5, ute: 5,
      // døra trekker deg mot midten når du er så nær døråpningen (m langs normalen) og høyst så langt til siden av åpningen
      trekk: 1.6, side: .8,
      // hvor fort du trekkes mot midten (andel per sekund) og hvor tydelig du må gå mot døra (cos til normalen)
      fart: 7, mot: .35,
      // hjelpen «Gå inn/ut»: punktene foran og bak døra (m), og hvor lenge den prøver før den setter deg på plass (s, pluss per meter)
      foran: 1.3, bak: 1, tid: 2.5, perMeter: .7,
    },
  };
  const R = REGLER;
  // Minutter til fots for d meter (minst 1)
  const reiseMin = d => Math.max(1, Math.round(d * R.omveg / (R.kmt * 1000 / 60)));
  // Hva «Gå» skal gjøre når kameraet ser d meter fra karakteren: 'her' (start der karakteren står), 'spør' (tilby å reise) eller
  // 'forLangt' (bare «Gå her», og si at det er for langt). min = minutter til fots.
  function valg(d) {
    if (!(d > R.nær)) return { type: 'her', min: 0 };
    const min = reiseMin(d);
    return d > R.maks ? { type: 'forLangt', min } : { type: 'spør', min };
  }
  // Teksten om tiden: «ca. 15 min» / «ca. 1 t 20 min»
  function tidTekst(min) { const t = Math.floor(min / 60), m = Math.round(min % 60); return 'ca. ' + (t ? t + ' t' + (m ? ' ' + m + ' min' : '') : m + ' min'); }
  // Døra: I = { x, y, nx, ny (ut av huset), ux, uy (langs veggen), w (åpningen) }. Hvor langt du står ut fra veggen (ut > 0 = ute) og
  // langs den fra midten av døra.
  function iDøra(I, x, y) { const rx = x - I.x, ry = y - I.y; return { ut: rx * I.nx + ry * I.ny, langs: rx * I.ux + ry * I.uy }; }
  // Forskyvningen langs veggen (meter, i retning u) som trekker deg mot midten av døra dette steget. (dx, dy) er retningen du vil gå
  // (enhetsvektor eller 0). Bare når du er nær døråpningen og går gjennom den – inn når du står ute, ut når du står inne.
  function dørTrekk(I, x, y, dx, dy, dt) {
    const { ut, langs } = iDøra(I, x, y), D = R.dør, w = I.w || 1.1;
    if (Math.abs(ut) > D.trekk || Math.abs(langs) > w / 2 + D.side || !(dt > 0)) return 0;
    const mot = dx * I.nx + dy * I.ny;
    if (ut > 0 ? mot > -D.mot : mot < D.mot) return 0;
    return -langs * Math.min(1, dt * D.fart);
  }
  // Punktene «Gå inn» går gjennom: foran døra (midt ut for åpningen) og innenfor. «Gå ut»: motsatt.
  function dørVei(I, inn) {
    const D = R.dør, foran = [I.x + I.nx * D.foran, I.y + I.ny * D.foran], bak = [I.x - I.nx * D.bak, I.y - I.ny * D.bak];
    return inn ? [foran, bak] : [bak, foran];
  }
  // Kursen (som Gange: du ser mot (−sin a, cos a)) som peker fra (x, y) mot (tx, ty)
  const kurs = (x, y, tx, ty) => Math.atan2(-(tx - x), ty - y);
  const api = { REGLER, reiseMin, valg, tidTekst, iDøra, dørTrekk, dørVei, kurs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Gaavalg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
