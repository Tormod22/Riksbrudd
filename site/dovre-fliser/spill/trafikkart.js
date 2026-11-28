/* Riksbrudd – TRAFIKKARTET (fase F5 i docs/plan-selskap-okonomi.md, kapittel 6.8): regler uten DOM.
 * Node: require('./trafikkart'); nettleser: globalThis.Trafikkart (visningen: spill/trafikkart-visning.js).
 *
 * Et rutenett rundt leirens midte som teller hvor mange meter folk har gått i hver rute det siste døgnet (folkgang.js gir et punkt
 * for hver 2. meter). Døgnet er delt i BØTTER (seks på fire timer): den eldste bøtta tømmes når en ny begynner, så kartet viser alltid
 * omtrent siste døgn. Spilleren ser hvor folk går mest – der en ny dør eller et lager nærmere ville spart tid.
 * Alle tall er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // rutenettet: rutestørrelse (m) og radius rundt leirens midte (m) – utenfor telles det ikke (utposter og hogstfelt langt unna)
    rute: 4, radius: 240,
    // døgnet i bøtter: antall og spillminutter per bøtte (6 × 240 = 1440 = ett døgn)
    bøtter: 6, bøtteMin: 240,
    // rutene som teller som «mye gått»: høyst så mange i oversikten
    topp: 5,
  };

  function ny(midte, o = {}) {
    const r = o.rute || REGLER.rute, R = o.radius || REGLER.radius, N = Math.ceil(2 * R / r), B = o.bøtter || REGLER.bøtter;
    return { x0: midte.x - N * r / 2, y0: midte.y - N * r / 2, r, N, B, bøtteMin: o.bøtteMin || REGLER.bøtteMin,
      b: Array.from({ length: B }, () => new Float32Array(N * N)), nr: -1, versjon: 0, sum: null, sumV: -1 };
  }
  const ruteFor = (T, x, y) => { const i = Math.floor((x - T.x0) / T.r), j = Math.floor((y - T.y0) / T.r); return i < 0 || j < 0 || i >= T.N || j >= T.N ? -1 : j * T.N + i; };
  // gå til bøtta for spilltida t (tømmer bøttene som er gått ut på veien)
  function rull(T, t) {
    const nr = Math.floor(Math.max(0, t) / T.bøtteMin); if (nr === T.nr) return;
    if (T.nr < 0 || nr < T.nr || nr - T.nr >= T.B) { for (const b of T.b) b.fill(0); }
    else for (let k = T.nr + 1; k <= nr; k++) T.b[k % T.B].fill(0);
    T.nr = nr; T.versjon++;
  }
  // m meter gått i punktet (x, y) ved spilltida t
  function legg(T, x, y, m, t) { if (t !== undefined) rull(T, t); const k = ruteFor(T, x, y); if (k < 0 || T.nr < 0) return false; T.b[T.nr % T.B][k] += m; T.versjon++; return true; }
  // summen over døgnet per rute (huskes til noe legges til)
  function sum(T) {
    if (T.sum && T.sumV === T.versjon) return T.sum; const s = T.sum || new Float32Array(T.N * T.N); s.fill(0);
    for (const b of T.b) for (let k = 0; k < s.length; k++) s[k] += b[k];
    T.sum = s; T.sumV = T.versjon; return s;
  }
  // hele døgnet: meter gått i alt, og den største ruta
  function oversikt(T) { const s = sum(T); let tot = 0, maks = 0, mk = -1; for (let k = 0; k < s.length; k++) { tot += s[k]; if (s[k] > maks) { maks = s[k]; mk = k; } }
    return { meter: tot, maks, rute: mk < 0 ? null : midt(T, mk) }; }
  const midt = (T, k) => ({ x: T.x0 + ((k % T.N) + .5) * T.r, y: T.y0 + (Math.floor(k / T.N) + .5) * T.r });
  // de mest brukte stedene: rutene slått sammen i klynger (r m), sortert etter meter – [{ x, y, meter }]
  function topp(T, n = REGLER.topp, r = 16) {
    const s = sum(T), liste = []; for (let k = 0; k < s.length; k++) if (s[k] > 0) liste.push(k); liste.sort((a, b) => s[b] - s[a]);
    const ut = [];
    for (const k of liste) { const p = midt(T, k), q = ut.find(u => Math.hypot(u.x - p.x, u.y - p.y) < r); if (q) { q.meter += s[k]; continue; } if (ut.length < n) ut.push({ ...p, meter: s[k] }); }
    return ut.sort((a, b) => b.meter - a.meter);
  }
  // fargen for en rute med v meter når den største har maks: [r, g, b, a] (0–255) – fra mørk gul til rød, svak for lite
  function farge(v, maks) {
    if (!(v > 0) || !(maks > 0)) return null; const t = Math.min(1, Math.sqrt(v / maks));
    return [Math.round(235 + 20 * t), Math.round(215 - 170 * t), Math.round(70 - 40 * t), Math.round(110 + 135 * t)];
  }

  const api = { REGLER, ny, rull, legg, sum, oversikt, topp, farge, ruteFor, midt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Trafikkart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
