/* Riksbrudd – FORMASJONER og ERFARING: regler uten DOM (Node: require('./formasjon'); nettleser: globalThis.Formasjon).
 * (17. nov, brukeren ba om «formasjoner» og «erfaring – veteraner som treffer bedre».) Formasjonen bestemmer hvor mennene står
 * (i kartet og i 3D) og gir en fordel og en ulempe i ildkamp. Erfaringen teller minutter i kamp per mann. Tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // ild: faktor på lagets egen ild; tar: faktor på treffene laget tar; bredde/dybde: meter mellom mennene
  const TYPER = {
    kile: { navn: 'Kile', tekst: 'Allsidig: ingen fordel, ingen ulempe.', ild: 1, tar: 1 },
    linje: { navn: 'Linje', tekst: 'Alle skyter framover: 15 % mer ild, men 10 % flere treff mot laget.', ild: 1.15, tar: 1.1 },
    spredt: { navn: 'Spredt', tekst: 'Stor avstand mellom mennene: 25 % færre treff mot laget, 10 % mindre ild.', ild: .9, tar: .75 },
    kolonne: { navn: 'Kolonne', tekst: 'På rekke, for marsj: 20 % mindre ild og 15 % flere treff mot laget.', ild: .8, tar: 1.15 },
  };
  const REKKE = ['kile', 'linje', 'spredt', 'kolonne'];
  const type = id => TYPER[id] || TYPER.kile, neste = id => REKKE[(REKKE.indexOf(TYPER[id] ? id : 'kile') + 1) % REKKE.length];
  // Plassen til mann nr. n (0 = fører) i lagets eget system: [fram, side] i meter. På marsj går alle i kolonne (spredt: bredere).
  function plass(id, n, marsj) {
    const s = n % 2 ? 1 : -1, rad = Math.floor((n + 1) / 2);
    if (marsj || id === 'kolonne') return [-n * 4, s * (id === 'spredt' ? 3 : 1.2)];
    if (id === 'linje') return [n === 0 ? 0 : -.6 * (rad % 2), s * rad * 3.2];
    if (id === 'spredt') return [-(rad % 3) * 9 - (n % 2) * 2, s * rad * 8];
    return [-rad * 4, s * rad * 4];
  }
  // Faktoren i ildkamp når a skyter på b: a sin ild × det b tar. På marsj teller begge som kolonne.
  const ild = (a, b) => type(a && a.marsj ? 'kolonne' : a && a.id).ild * type(b && b.marsj ? 'kolonne' : b && b.id).tar;
  // ---------- erfaring ----------
  const ERFARING = { erfaren: 30, veteran: 120, elite: 360, bonus: [1, 1.08, 1.18, 1.28] }, NIVÅ = ['Rekrutt', 'Erfaren', 'Veteran', 'Elite'];
  const nivå = e => (e >= ERFARING.elite ? 3 : e >= ERFARING.veteran ? 2 : e >= ERFARING.erfaren ? 1 : 0);
  // lagets treffaktor: snittet av de friske mennenes bonus
  function erfFaktor(menn) { let s = 0, n = 0; for (const m of menn || []) if (m.hp >= 1) { s += ERFARING.bonus[nivå(m.erf || 0)]; n++; } return n ? s / n : 1; }
  // ett minutt i kamp: alle som lever, lærer (sårede halvparten). Gir navnene på dem som gikk opp et nivå.
  function lær(menn, minutter = 1) { const opp = []; for (const m of menn || []) { if (!(m.hp > 0)) continue; const før = nivå(m.erf || 0); m.erf = (m.erf || 0) + minutter * (m.hp >= 1 ? 1 : .5); const nå = nivå(m.erf); if (nå > før) opp.push({ navn: m.navn, nivå: NIVÅ[nå] }); } return opp; }
  const erfTekst = menn => { const L = (menn || []).filter(m => m.hp > 0); if (!L.length) return ''; const t = [0, 0, 0, 0]; for (const m of L) t[nivå(m.erf || 0)]++; const d = []; for (let i = 3; i >= 1; i--) if (t[i]) d.push(`${t[i]} ${NIVÅ[i].toLowerCase()}`); return d.length ? d.join(', ') : 'rekrutter'; };
  // erfaringen følger personen hjem: stridsferdigheten i leiren vokser litt med nivået
  const ferdighet = e => [0, .05, .12, .2][nivå(e || 0)];
  const api = { TYPER, REKKE, type, neste, plass, ild, ERFARING, NIVÅ, nivå, erfFaktor, lær, erfTekst, ferdighet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Formasjon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
