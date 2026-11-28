/* STATISTIKK (G3 del 1 i docs/plan-selskap-okonomi.md, kapittel 13.5, 28. nov): tall per spilldøgn for leiren, til grafene i fanen
 * «Statistikk». Reglene her er uten DOM (Node: require('./statistikk'); nettleser: globalThis.Statistikk); visningen og innsamlingen er
 * spill/statistikk-visning.js (window.StatistikkSpill, også StatistikkSpill.graf(el, hva) som andre paneler kan bruke).
 *
 * Et døgn går fra kl. 06 til kl. 06 (døgn = Math.floor(tid / 1440) + 1, som dagboka over inn og ut i spill/penger-visning.js).
 * Tilstanden S = { v, dager: { [døgn]: rad }, åpen: { d, n, sum: {}, tell: {} } } – ren JSON, lagres per leir.
 *   rad = { d, inn, ut, p: { post: kr }, kassa, moral, helse, folk, arbeider, syke, fast, tBlå, tRød, tGrønn, bygg, … }
 * Gjennom døgnet tas PRØVER (snitt: moral, helse, folk …) og TELLINGER (bygg ferdig …); ved døgnskiftet lukkes døgnet med
 * SLUTTVERDIER (penger inn/ut per post, kassa, tettsteder per side). Alle feltene er tall, så en ny serie trenger bare et nytt felt:
 * leggTilSerie({ id, navn, enhet, fra }) og eventuelt leggTilGraf(id, { navn, serier, type }). Maskinene og «hvorfor saga sto»
 * (Ø1/F3) kommer slik senere.
 * Tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag
  const REGLER = {
    døgn: 30,          // så mange døgn huskes per leir
    prøveHver: 10,     // spillminutter mellom hver prøve (moral, helse, folk …)
  };
  const DØGN = 1440;
  const døgnNr = t => Math.floor((Number.isFinite(t) ? t : 0) / DØGN) + 1;
  const ny = () => ({ v: 1, dager: {}, åpen: null });
  // les lagret tilstand (tåler tull)
  function fra(x) {
    if (!x || typeof x !== 'object' || !x.dager || typeof x.dager !== 'object') return ny();
    const S = ny();
    for (const [k, r] of Object.entries(x.dager)) { const d = +k; if (Number.isFinite(d) && d > 0 && r && typeof r === 'object') S.dager[d] = { ...r, d }; }
    if (x.åpen && Number.isFinite(x.åpen.d)) S.åpen = { d: x.åpen.d, n: +x.åpen.n || 0, sum: { ...(x.åpen.sum || {}) }, tell: { ...(x.åpen.tell || {}) } };
    rydd(S); return S;
  }
  function rydd(S, R = REGLER) { const n = Object.keys(S.dager).map(Number).sort((a, b) => b - a); for (const d of n.slice(R.døgn)) delete S.dager[d]; return S; }
  const åpne = (S, d) => (S.åpen && S.åpen.d === d ? S.åpen : (S.åpen = { d, n: 0, sum: {}, tell: {} }));
  // en prøve av tall som skal ha snitt over døgnet (verdier som ikke er tall, hoppes over)
  function prøve(S, d, verdier) {
    const Å = åpne(S, d); Å.n++;
    for (const [k, v] of Object.entries(verdier || {})) if (Number.isFinite(v)) Å.sum[k] = (Å.sum[k] || 0) + v;
    return S;
  }
  // tell noe som har skjedd i døgnet (bygg ferdig …)
  function tell(S, d, hva, n = 1) { const Å = åpne(S, d); Å.tell[hva] = (Å.tell[hva] || 0) + n; return S; }
  // raden for det åpne døgnet så langt (snitt + tellinger), uten sluttverdier
  function snitt(Å) { if (!Å) return null; const r = { d: Å.d }; for (const [k, v] of Object.entries(Å.sum)) r[k] = Å.n ? v / Å.n : undefined; for (const [k, v] of Object.entries(Å.tell)) r[k] = v; if (!('bygg' in r)) r.bygg = 0; return r; }
  // lukk det åpne døgnet med sluttverdiene (penger, kassa, tettsteder …). Gir raden.
  function lukk(S, slutt, R = REGLER) {
    if (!S.åpen) return null; const r = { ...snitt(S.åpen), ...(slutt || {}), d: S.åpen.d };
    S.dager[r.d] = r; S.åpen = null; rydd(S, R); return r;
  }
  // rader sortert etter døgn; idag (valgfri) = raden for døgnet som går nå (merket delvis)
  function rader(S, idag) {
    const L = Object.values((S && S.dager) || {}).sort((a, b) => a.d - b.d);
    if (idag && Number.isFinite(idag.d) && !L.some(r => r.d === idag.d)) { L.push({ ...idag, delvis: true }); L.sort((a, b) => a.d - b.d); }
    return L.slice(-REGLER.døgn);
  }
  // ---------- seriene og grafene ----------
  const SERIER = {
    inn: { navn: 'Inn', enhet: 'kr', fra: r => r.inn, farge: 'god' },
    ut: { navn: 'Ut', enhet: 'kr', fra: r => r.ut, farge: 'dårlig' },
    netto: { navn: 'Netto', enhet: 'kr', fra: r => (Number.isFinite(r.inn) && Number.isFinite(r.ut) ? r.inn - r.ut : undefined), farge: 'nøytral' },
    kassa: { navn: 'Kassa', enhet: 'kr', fra: r => r.kassa, farge: 'gull' },
    moral: { navn: 'Moral', enhet: '', fra: r => r.moral, farge: 'gull' },
    helse: { navn: 'Helse', enhet: '%', fra: r => r.helse, farge: 'god' },
    folk: { navn: 'Folk', enhet: 'stk', fra: r => r.folk, farge: 'nøytral' },
    arbeider: { navn: 'Arbeider', enhet: 'stk', fra: r => r.arbeider, farge: 'god' },
    syke: { navn: 'Syke', enhet: 'stk', fra: r => r.syke, farge: 'dårlig' },
    fast: { navn: 'Arbeidet sto stille', enhet: '%', fra: r => (Number.isFinite(r.fast) ? r.fast * 100 : undefined), farge: 'dårlig' },
    tBlå: { navn: 'Dine', enhet: 'stk', fra: r => r.tBlå, farge: 'blå' },
    tRød: { navn: 'Ravnsund', enhet: 'stk', fra: r => r.tRød, farge: 'rød' },
    tGrønn: { navn: 'Mosevakt', enhet: 'stk', fra: r => r.tGrønn, farge: 'grønn' },
    bygg: { navn: 'Byggejobber ferdig', enhet: 'stk', fra: r => r.bygg, farge: 'gull' },
  };
  // type: 'søyle' (stolper side om side per døgn) | 'linje' | 'poster' (inn og ut per post, summert over døgnene)
  const GRAFER = {
    penger: { navn: 'Penger inn og ut', serier: ['inn', 'ut'], type: 'søyle', tekst: 'Det som kom inn og gikk ut hvert døgn (dagboka over inn og ut).' },
    poster: { navn: 'Per post', serier: [], type: 'poster', tekst: 'Inn og ut per post, summert over døgnene grafen viser.' },
    kassa: { navn: 'Kassa', serier: ['kassa'], type: 'linje', tekst: 'Kassa ved slutten av hvert døgn.' },
    folk: { navn: 'Moral og helse', serier: ['moral', 'helse'], type: 'linje', maks: 100, tekst: 'Snitt gjennom døgnet (0–100).' },
    arbeid: { navn: 'Folk i arbeid', serier: ['folk', 'arbeider', 'syke'], type: 'linje', tekst: 'Hvor mange dere er, hvor mange som arbeider og hvor mange som er syke (snitt).' },
    fast: { navn: 'Står stille', serier: ['fast'], type: 'søyle', maks: 100, tekst: 'Hvor stor del av døgnet byggejobbene sto stille fordi ingen bygde.' },
    tettsteder: { navn: 'Tettsteder', serier: ['tBlå', 'tRød', 'tGrønn'], type: 'linje', tekst: 'Hvor mange tettsteder hver side holdt ved slutten av døgnet.' },
    bygg: { navn: 'Bygg ferdig', serier: ['bygg'], type: 'søyle', tekst: 'Byggejobber som ble ferdige (nye bygg, utbygging, reparasjon, flytting).' },
  };
  function leggTilSerie(def) { if (!def || !def.id || typeof def.fra !== 'function') return false; SERIER[def.id] = { navn: def.navn || def.id, enhet: def.enhet || '', fra: def.fra, farge: def.farge || 'nøytral' }; return true; }
  function leggTilGraf(id, def) { if (!id || !def || !Array.isArray(def.serier)) return false; GRAFER[id] = { navn: def.navn || id, serier: def.serier, type: def.type || 'linje', tekst: def.tekst || '', maks: def.maks }; return true; }
  // [[døgn, verdi]] for én serie (døgn uten verdi hoppes over)
  function serie(L, id) { const s = SERIER[id]; if (!s) return []; const ut = []; for (const r of L || []) { let v; try { v = s.fra(r); } catch (e) { v = undefined; } if (Number.isFinite(v)) ut.push([r.d, v]); } return ut; }
  // inn og ut per post summert over radene: [{ post, inn, ut }] størst først
  function poster(L) {
    const M = new Map(); for (const r of L || []) for (const [k, v] of Object.entries(r.p || {})) { if (!Number.isFinite(v)) continue; const q = M.get(k) || { post: k, inn: 0, ut: 0 }; if (v > 0) q.inn += v; else q.ut -= v; M.set(k, q); }
    return [...M.values()].sort((a, b) => (b.inn + b.ut) - (a.inn + a.ut));
  }
  // pene merker på aksen: { min, maks, steg, merker }
  function skala(min, maks, n = 4) {
    if (!Number.isFinite(min) || !Number.isFinite(maks)) { min = 0; maks = 1; }
    if (maks < min) [min, maks] = [maks, min]; if (maks === min) { maks = min + (Math.abs(min) || 1); }
    const rå = (maks - min) / n, p = Math.pow(10, Math.floor(Math.log10(rå))), f = rå / p, steg = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    const a = Math.floor(min / steg + 1e-9) * steg, b = Math.ceil(maks / steg - 1e-9) * steg, merker = [];
    for (let v = a; v <= b + steg * 1e-6; v += steg) merker.push(Math.round(v / steg) * steg);
    return { min: a, maks: b, steg, merker };
  }
  // kort tall: «1,2 mill.», «350 000», «12»
  function kort(v, enhet) {
    if (!Number.isFinite(v)) return '–'; const a = Math.abs(v), s = v < 0 ? '−' : '';
    const t = a >= 1e6 ? (Math.round(a / 1e5) / 10).toString().replace('.', ',') + ' mill.' : a >= 1e4 ? Math.round(a / 1000) + ' 000' : a >= 100 ? String(Math.round(a)) : (Math.round(a * 10) / 10).toString().replace('.', ',');
    return s + t + (enhet === '%' ? ' %' : enhet === 'kr' && a < 1e6 ? ' kr' : enhet === 'kr' ? ' kr' : '');
  }
  // byggejobber som er ferdige mellom to oppslag: jobbene (id-er) før og nå, og om bygget fortsatt finnes (ellers revet/ødelagt)
  function ferdigeJobber(før, nå, finnes) { const N = new Set(nå || []); let n = 0; for (const id of før || []) if (!N.has(id) && (!finnes || finnes(id))) n++; return n; }
  const api = { REGLER, SERIER, GRAFER, døgnNr, ny, fra, prøve, tell, snitt, lukk, rader, serie, poster, skala, kort, leggTilSerie, leggTilGraf, ferdigeJobber };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Statistikk = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
