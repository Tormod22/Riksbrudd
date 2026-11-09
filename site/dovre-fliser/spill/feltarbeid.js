/* S5 del 2 – feltarbeid: skyttergraver og miner. Regler uten DOM (Node: require('./feltarbeid'); nettleser: globalThis.Feltarbeid).
 * Et lag som står i ro kan grave seg ned (1 t, ingeniører 30 min): nedgravd får det halvparten så mange treff fra håndvåpen og
 * færre fra artilleri. Flytter laget seg, er graven forlatt. Ingeniørlag legger minefelt der de står (1 t): fiender som beveger
 * seg gjennom feltet (radius 120 m) kan løse ut en mine. Tallene er forslag.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    grav: 3600, gravIngeniør: 1800, vern: .5,                 // sekunder; treff ganges med vern når målet er nedgravd
    mine: { tid: 3600, radius: 120, ladninger: 6, sjanse: .3, treff: [1, 3], skade: 3 },   // sjanse per spillminutt i bevegelse i feltet
  };
  // Graving: sek spillsekunder. Gir 'graver' | 'nedgravd' (nettopp ferdig) | 'flyttet' | null (ikke i gang).
  function grav(s, sek, ingeniør) {
    if (s.graver === undefined || s.graver === null) return null;
    if (s.sti) { s.graver = null; s.nedgravd = false; return 'flyttet'; }
    if (s.nedgravd) return null;
    s.graver += sek;
    if (s.graver >= (ingeniør ? REGLER.gravIngeniør : REGLER.grav)) { s.nedgravd = true; return 'nedgravd'; }
    return 'graver';
  }
  function startGrav(s) { if (s.sti) return { feil: 'Laget må stå i ro for å grave seg ned.' }; if (s.nedgravd) return { feil: 'Laget er allerede nedgravd.' }; s.graver = 0; return { ok: true }; }
  // Laget har flyttet seg: graven er forlatt.
  function forlat(s) { if (s.nedgravd || s.graver != null) { s.nedgravd = false; s.graver = null; return true; } return false; }
  const vern = mål => mål && mål.nedgravd ? REGLER.vern : 1;

  function nyttMinefelt({ x, y, side, navn }) { return { x, y, side, navn, ladninger: REGLER.mine.ladninger }; }
  // Ett spillminutt for et minefelt. enheter: [{ x, y, side, sti, menn? , antall? }]. Gir [[enhet, treff]] (treff: menn for lag, skade-treff for kjøretøy).
  function mineSteg(felt, enheter, rng) {
    const M = REGLER.mine, ut = [];
    if (felt.ladninger <= 0) return ut;
    for (const e of enheter) {
      if (e.side === felt.side || !e.sti || Math.hypot(e.x - felt.x, e.y - felt.y) > M.radius) continue;
      if (rng() >= M.sjanse) continue;
      felt.ladninger--;
      ut.push([e, e.menn ? M.treff[0] + Math.floor(rng() * (M.treff[1] - M.treff[0] + 1)) : M.skade]);
      if (felt.ladninger <= 0) break;
    }
    return ut;
  }
  const api = { REGLER, grav, startGrav, forlat, vern, nyttMinefelt, mineSteg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Feltarbeid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
