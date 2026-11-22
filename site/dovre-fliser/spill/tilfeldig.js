/* Riksbrudd – FELLES TILFELDIGHET (M0 punkt 4 i docs/plan-flerspiller.md, 22. nov).
 * Når verden senere regnes på en tjener og to maskiner skal få samme svar, kan spillreglene ikke bruke Math.random.
 * Her er en frø-basert tilfeldighet (mulberry32): samme frø gir alltid samme rekke, og tilstanden er ett heltall som kan lagres.
 *  - Tilfeldig.lag(frø) -> r(), et tall i [0, 1). r.tilstand() gir tilstanden, r.sett(tilstand) setter den.
 *    frø kan være et heltall eller en tekst (teksten hashes).
 *  - Tilfeldig.verden = én felles strøm for verden (frø 1 som standard). Den er SAMME funksjon hele tiden – nyVerden(frø) og les(t)
 *    setter bare tilstanden på nytt, så moduler som har tatt vare på Tilfeldig.verden, bruker fortsatt den riktige strømmen.
 *  - Tilfeldig.nyVerden(frø), Tilfeldig.lagre() -> tilstand, Tilfeldig.les(tilstand).
 *  - Hjelpere: heltall(a, b, r) (a til og med b), velg(liste, r), sjanse(p, r). r er standard verden-strømmen.
 * Uten DOM (Node: require('./tilfeldig'); nettleser: globalThis.Tilfeldig) – test: pipeline/fliser/test_tilfeldig.js.
 */
(function (rot) {
  'use strict';
  // tekst -> 32-bits heltall (FNV-1a); tall rundes og gjøres om til 32 bit uten fortegn
  function hash(frø) {
    if (typeof frø === 'number' && Number.isFinite(frø)) return Math.floor(frø) >>> 0;
    const s = String(frø === undefined || frø === null ? '' : frø); let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // mulberry32: liten, rask og god nok for spillregler (ikke for kryptografi)
  function lag(frø) {
    let a = hash(frø);
    const r = function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.tilstand = () => a;
    r.sett = t => { a = hash(t); return r; };
    return r;
  }
  const VERDEN_FRØ = 1;
  const verden = lag(VERDEN_FRØ);
  const nyVerden = (frø = VERDEN_FRØ) => { verden.sett(hash(frø)); return verden; };
  const lagre = () => verden.tilstand();
  // ugyldig tilstand (gamle lagringer uten feltet) gjør ingenting
  const les = t => { if (typeof t === 'number' && Number.isFinite(t)) { verden.sett(t); return true; } return false; };
  const heltall = (a, b, r = verden) => a + Math.floor(r() * (b - a + 1));
  const velg = (liste, r = verden) => liste && liste.length ? liste[Math.floor(r() * liste.length)] : undefined;
  const sjanse = (p, r = verden) => r() < p;

  const api = { lag, hash, verden, nyVerden, lagre, les, heltall, velg, sjanse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Tilfeldig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
