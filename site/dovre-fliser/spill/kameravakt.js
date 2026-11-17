/* Riksbrudd – KAMERAVAKTA: regler uten DOM (Node: require('./kameravakt'); nettleser: globalThis.Kameravakt).
 * (17. nov, brukeren: «det skal være folk som jobber i kontrollrommet med å se gjennom kameraene – historisk data på hvor tropper har
 * vært, forskjellige level på kameraene, noen som bare filmer når de merker bevegelse; da sjekker en som jobber i kontrollrommet det og
 * ser om det bare er været, et dyr eller folk. Er det folk, varsler den, og da kan du se det selv og gå inn i kameraet i 3D».)
 * Kameraets nivå er typen (TYPER): 1 bevegelseskamera (lager et klipp når noe rører seg – også dyr og vær), 2 fast opptak (i tillegg
 * et spor av hvor folk har gått), 3 smart kamera (skiller selv folk fra dyr og vær, og varsler straks). Klippene fra nivå 1 og 2 må
 * SES GJENNOM av folk på oppgaven «overvåking» (trenger et kontrollrom som virker). Først når noen har sett at det er folk, vises
 * fienden i kartet (K.sett[kamera] = til når). Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const TYPER = [
    { navn: 'Bevegelseskamera', kort: 'bevegelse', tekst: 'Filmer bare når noe rører seg. Klippene må ses gjennom.', opptak: false, selv: false, minutter: 6 },
    { navn: 'Kamera med fast opptak', kort: 'fast opptak', tekst: 'Filmer hele tiden: sporet av hvor folk har gått, lagres. Klippene må ses gjennom.', opptak: true, selv: false, minutter: 4 },
    { navn: 'Smart kamera', kort: 'smart', tekst: 'Skiller selv folk fra dyr og vær og varsler straks. Lagrer spor.', opptak: true, selv: true, minutter: 0 },
  ];
  const REGLER = {
    dyrPerDøgn: 4,       // falske klipp per kamera per døgn: dyr
    værPerDøgn: 1.5,     // … og vær i stille vær (ganges opp med vinden)
    nyttKlipp: 10,       // minutter mellom to klipp av folk fra samme kamera
    synlig: 20,          // minutter fienden vises etter at et klipp er bekreftet (forlenges mens noen følger med)
    spor: 2,             // minutter mellom to punkter i sporet
    klippMaks: 40, historikkTimer: 48, historikkMaks: 600,
  };
  const HVA = { folk: 'folk', dyr: 'et dyr', vær: 'vær og vind' };
  const type = nivå => TYPER[Math.max(1, Math.min(TYPER.length, nivå || 1)) - 1];
  const ny = () => ({ v: 1, nr: 0, klipp: [], hist: [], sett: {}, arbeid: 0, sistFolk: {}, sistSpor: {} });
  function fra(o) { const K = ny(); if (!o || typeof o !== 'object') return K;
    K.nr = +o.nr || 0; K.arbeid = +o.arbeid || 0; if (Array.isArray(o.klipp)) K.klipp = o.klipp.filter(k => k && isFinite(k.t) && HVA[k.hva]).slice(-REGLER.klippMaks);
    if (Array.isArray(o.hist)) K.hist = o.hist.filter(h => h && isFinite(h.t) && isFinite(h.x) && isFinite(h.y)).slice(-REGLER.historikkMaks);
    for (const n of ['sett', 'sistFolk', 'sistSpor']) if (o[n] && typeof o[n] === 'object') for (const [k, v] of Object.entries(o[n])) if (isFinite(v)) K[n][k] = +v; return K; }
  const retning = (dx, dy) => ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'][((Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) % 8) + 8) % 8];
  // Ett steg. kameraer: [{ id, x, y, r, nivå }], fiender: [{ id, x, y, antall, side }], tid og dt i spillminutter.
  // o: { tempo: summen av tempoet til dem som ser gjennom (0 = ingen), vind (m/s), rng() }.
  // Gir { nye: [klipp], varsler: [klipp som viste seg å være folk], avvist: antall }.
  function steg(K, kameraer, fiender, tid, dt, o = {}) {
    const R = REGLER, rng = o.rng || Math.random, ut = { nye: [], varsler: [], avvist: 0 }, tempo = Math.max(0, o.tempo || 0);
    const nytt = (c, hva, f) => { const T = type(c.nivå), k = { id: ++K.nr, kam: c.id, t: tid, hva, x: f ? f.x : c.x + (rng() - .5) * c.r, y: f ? f.y : c.y + (rng() - .5) * c.r, antall: f ? f.antall || 1 : 0, status: 'venter', minutter: T.minutter };
      k.meter = Math.round(Math.hypot(k.x - c.x, k.y - c.y)); k.retning = retning(k.x - c.x, k.y - c.y); K.klipp.push(k); ut.nye.push(k); return k; };
    const bekreft = (k, c) => { k.status = k.hva; k.sett = tid; if (k.hva === 'folk') { K.sett[k.kam] = tid + R.synlig; ut.varsler.push(k); if (c && !type(c.nivå).opptak) K.hist.push({ t: k.t, x: k.x, y: k.y, kam: k.kam, f: 'k' + k.id }); } else ut.avvist++; };
    for (const c of kameraer) { const T = type(c.nivå), inne = fiender.filter(f => Math.hypot(f.x - c.x, f.y - c.y) <= c.r);
      if (inne.length) { const f = inne.reduce((a, b) => (Math.hypot(a.x - c.x, a.y - c.y) < Math.hypot(b.x - c.x, b.y - c.y) ? a : b));
        if (!(tid - K.sistFolk[c.id] < R.nyttKlipp)) { K.sistFolk[c.id] = tid; const k = nytt(c, 'folk', { x: f.x, y: f.y, antall: inne.reduce((a, q) => a + (q.antall || 1), 0) }); if (T.selv) bekreft(k, c); }
        // noen følger alt med på dette kameraet: fienden blir stående i kartet så lenge den er i bildet
        if (K.sett[c.id] > tid && (T.selv || tempo > 0)) K.sett[c.id] = tid + R.synlig;
        if (T.opptak) for (const q of inne) { const n = c.id + ':' + q.id; if (!(tid - K.sistSpor[n] < R.spor)) { K.sistSpor[n] = tid; K.hist.push({ t: tid, x: Math.round(q.x), y: Math.round(q.y), kam: c.id, f: String(q.id), side: q.side }); } } }
      // bevegelse som ikke er folk: de smarte kameraene lager ikke klipp av den
      if (!T.selv) { const vind = Math.max(0, o.vind || 0), pv = R.værPerDøgn * (1 + Math.max(0, vind - 5) * .5) * dt / 1440, pd = R.dyrPerDøgn * dt / 1440;
        if (rng() < pd) nytt(c, 'dyr'); if (rng() < pv) nytt(c, 'vær'); } }
    // gjennomsynet: eldste klipp først, folk på «overvåking» gir arbeid (minutter × tempo)
    K.arbeid = tempo > 0 ? Math.min(K.arbeid + tempo * dt, 30) : 0;
    for (const k of K.klipp) { if (k.status !== 'venter') continue; if (tempo <= 0 || K.arbeid < k.minutter) break; K.arbeid -= k.minutter; bekreft(k, kameraer.find(c => c.id === k.kam)); }
    // rydding
    if (K.klipp.length > R.klippMaks) { const ferdige = K.klipp.filter(k => k.status !== 'venter'), over = K.klipp.length - R.klippMaks; const bort = new Set(ferdige.slice(0, over).map(k => k.id)); K.klipp = K.klipp.filter(k => !bort.has(k.id)); if (K.klipp.length > R.klippMaks) K.klipp = K.klipp.slice(-R.klippMaks); }
    const gammel = tid - R.historikkTimer * 60; if (K.hist.length && (K.hist[0].t < gammel || K.hist.length > R.historikkMaks)) K.hist = K.hist.filter(h => h.t >= gammel).slice(-R.historikkMaks);
    return ut;
  }
  // Viser kameraet fienden i kartet nå? De smarte alltid; de andre når et klipp er sett og bekreftet.
  const ser = (K, c, tid) => type(c.nivå).selv || K.sett[c.id] > tid;
  const venter = K => K.klipp.filter(k => k.status === 'venter').length;
  // Sporene: historikken delt per fiende, eldste punkt først. [{ f, side, punkter: [{ t, x, y }] }]
  function spor(K) { const m = new Map(); for (const h of K.hist) { let s = m.get(h.f); if (!s) m.set(h.f, s = { f: h.f, side: h.side, punkter: [] }); s.punkter.push(h); } return [...m.values()]; }
  const tekst = k => (k.hva === 'folk' ? `${k.antall > 1 ? k.antall + ' personer' : 'en person'} ${k.meter} m mot ${k.retning}` : k.hva === 'dyr' ? 'bare et dyr' : 'bare vær og vind');
  const api = { TYPER, REGLER, HVA, type, ny, fra, steg, ser, venter, spor, tekst, retning };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Kameravakt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
