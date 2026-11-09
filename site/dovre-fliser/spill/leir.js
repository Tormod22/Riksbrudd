/* K2 – leiren: regler uten DOM (Node: require('./leir'); nettleser: globalThis.Leir).
 * Byggene koster kroner og spilltid (1× = ekte tid; brukeren 9. nov), og står der du plasserer dem (hvor som helst, ikke i vann
 * eller oppå et annet bygg). Strøm: aggregat (drivstoff fra tanken) og solcellepaneler gir strøm; kontrollrom, kameramaster,
 * radiomast, verksted, sykestue, drivhus og brakker bruker strøm. Er det for lite, får byggene strøm i prioritert rekkefølge.
 * Prisene og tidene er Claudes forslag, godkjent av brukeren som utgangspunkt (justeres etter testing). Se docs/plan-kollaps.md (K2).
 */
(function (rot) {
  'use strict';
  // fot: omrisset i meter rundt modellens origo [x0, x1, y0, y1] (fronten mot +x); kw: + produserer, − bruker; tid i spilltimer
  const BYGG = {
    kontrollrom: { navn: 'Kontrollrom', pris: 15e6, tid: 6, kw: -8, modell: 'hovedhus', fot: [-5.1, 5.8, -6.5, 6.5], tekst: 'Kartet, kameraene og radioen (K3)' },
    brakke: { navn: 'Brakke', pris: 4e6, tid: 2, kw: -1, modell: 'brakke', fot: [-3.4, 4.2, -6.4, 6.4], plasser: 8, tekst: 'Sengeplass til 8' },
    vakttårn: { navn: 'Vakttårn', pris: 5e6, tid: 1, kw: 0, modell: 'vakttårn', fot: [-1.6, 1.6, -1.9, 1.6], tekst: 'Utsikt og lyskaster' },
    port: { navn: 'Port med vaktbu', pris: 1.5e6, tid: 1, kw: 0, modell: 'port', fot: [-2.3, 2.3, -7.1, 3.9], tekst: 'Inngangen til leiren' },
    gjerde: { navn: 'Gjerde', prisPerMeter: 50000, tidPerMeter: .02, kw: 0, modell: 'gjerde', linje: true, tekst: 'Piggtrådgjerde: trykk der det skal begynne og slutte' },
    lagertelt: { navn: 'Lagertelt', pris: 2e6, tid: 1, kw: 0, modell: 'lagertelt', fot: [-4.3, 4.3, -3.8, 3.8], tekst: 'Lager for utstyr og varer' },
    container: { navn: 'Container', pris: 5e5, tid: .5, kw: 0, modell: 'container', fot: [-3, 3.1, -1.2, 1.2], tekst: 'Lite lager' },
    verksted: { navn: 'Verksted', pris: 7e6, tid: 3, kw: -4, modell: 'verksted', fot: [-6.3, 12, -7.3, 7.3], tekst: 'Reparerer kjøretøy' },
    sykestue: { navn: 'Sykestue', pris: 6e6, tid: 3, kw: -3, modell: 'sykestue', fot: [-3.9, 7.5, -5.9, 5.9], tekst: 'Stell av sårede' },
    drivstofftank: { navn: 'Drivstofftank', pris: 3e6, tid: 1, kw: 0, modell: 'drivstofftank', fot: [-2.2, 3.7, -4, 4], liter: 5000, tekst: 'Rommer 5 000 l drivstoff' },
    aggregat: { navn: 'Aggregat', pris: 8e6, tid: 1, kw: 20, modell: 'aggregat', fot: [-1.6, 1.6, -1, 1], tekst: 'Gir 20 kW, bruker drivstoff' },
    solcelle: { navn: 'Solcellepaneler', pris: 3e6, tid: .5, kw: 5, modell: 'solcelle', fot: [-4, 4, -2, 2], sol: true, tekst: 'Gir opptil 5 kW i dagslys' },
    kameramast: { navn: 'Kameramast', pris: 5e5, tid: .5, kw: -.5, modell: 'kameramast', fot: [-.5, .5, -.5, .5], tekst: 'Kamera som ser 300 m (K4)' },
    radiomast: { navn: 'Radiomast', pris: 2e6, tid: 2, kw: -1, modell: 'radiomast', fot: [-1, 1, -1, 1], tekst: 'Radio til lagene (K3)' },
    drivhus: { navn: 'Drivhus', pris: 2.5e6, tid: 2, kw: -1, modell: 'drivhus', fot: [-3, 3, -5, 5], tekst: 'Dyrker mat' },
    helikopterplass: { navn: 'Helikopterplass', pris: 10e6, tid: 4, kw: 0, modell: 'helikopterplass', fot: [-10.9, 15.6, -10.9, 10.9], tekst: 'Landingsplass' },
    sandsekkvoll: { navn: 'Sandsekkvoll', pris: 2e5, tid: .5, kw: 0, modell: 'sandsekkvoll', fot: [-.3, .2, -4, 4], tekst: 'Dekning' },
  };
  // hvem får strøm først når det er for lite
  const PRIORITET = ['kontrollrom', 'radiomast', 'kameramast', 'sykestue', 'verksted', 'drivhus', 'brakke'];
  const DRIVSTOFF = { prisPerLiter: 8000, literPerKWt: .3, iAggregat: 200 };   // 10 l = 80 000 kr (plan-kollaps.md); aggregatet har en liten egen tank

  function ny() { return { versjon: 1, bygg: [], neste: 1, drivstoff: 0 }; }
  // Pris og tid for et bygg (gjerdet etter lengden). bonus.bygg (ingeniør) gjør byggingen raskere.
  function kostnad(type, lengde = 0, bonus = {}) {
    const B = BYGG[type]; if (!B) return null;
    const pris = B.linje ? Math.round(B.prisPerMeter * lengde) : B.pris, timer = (B.linje ? B.tidPerMeter * lengde : B.tid) / (bonus.bygg || 1);
    return { pris, timer };
  }
  // Hjørnene til et bygg i kartet (meter) – b: { type, x, y, ret }
  function hjørner(b) {
    const B = BYGG[b.type]; if (B.linje) return b.punkter;
    const [x0, x1, y0, y1] = B.fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([u, v]) => [b.x + u * c - v * s, b.y + u * s + v * c]);
  }
  // To konvekse mangekanter overlapper (skilleakse-testen)
  function overlapper(A, B) {
    for (const P of [A, B]) for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], nx = by - ay, ny = ax - bx;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const [x, y] of A) { const d = x * nx + y * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const [x, y] of B) { const d = x * nx + y * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      if (a1 <= b0 || b1 <= a0) return false; }
    return true;
  }
  // Kan bygget stå her? v = { klasse(x, y) (3 = vann, 255 = utenfor kartet), iHus(x, y) -> true } (fra kartet)
  function kanBygge(L, b, v = {}) {
    const B = BYGG[b.type]; if (!B) return 'Ukjent bygg.';
    if (B.linje) { if (!b.punkter || b.punkter.length < 2) return 'Gjerdet trenger to punkter.'; const l = lengde(b.punkter); if (l < 2) return 'Gjerdet er for kort.'; if (l > 2000) return 'Gjerdet er for langt (høyst 2 km om gangen).'; }
    const P = hjørner(b), punkter = B.linje ? b.punkter : [...P, [b.x, b.y]];
    for (const [x, y] of punkter) { const k = v.klasse ? v.klasse(x, y) : 2; if (k === 3) return 'Kan ikke bygge i vann.'; if (k === 255 || k === undefined) return 'Her finnes det ikke kart.'; }
    if (!B.linje && v.iHus && punkter.some(([x, y]) => v.iHus(x, y))) return 'Det står et hus her.';
    if (!B.linje) for (const a of L.bygg) if (!BYGG[a.type].linje && overlapper(P, hjørner(a))) return `For nær ${BYGG[a.type].navn.toLowerCase()}.`;
    return null;
  }
  const lengde = P => { let l = 0; for (let i = 1; i < P.length; i++) l += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return l; };
  // Legger til et bygg og trekker pengene (betal(beløp) -> true når det går). Gir { bygg } eller { feil }.
  function bygg(L, b, betal, bonus = {}, v = {}) {
    const f = kanBygge(L, b, v); if (f) return { feil: f };
    const k = kostnad(b.type, BYGG[b.type].linje ? lengde(b.punkter) : 0, bonus);
    if (!betal(k.pris)) return { feil: `Ikke nok penger (${kroner(k.pris)}).` };
    const ny = { id: L.neste++, type: b.type, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, ret: +(b.ret || 0).toFixed(3), igjen: k.timer * 60, totalt: k.timer * 60, pris: k.pris };
    if (b.punkter) { ny.punkter = b.punkter.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]); ny.x = ny.punkter[0][0]; ny.y = ny.punkter[0][1]; }
    L.bygg.push(ny); return { bygg: ny };
  }
  const ferdig = b => b.igjen <= 0;
  const framdrift = b => (b.totalt ? Math.max(0, Math.min(1, 1 - b.igjen / b.totalt)) : 1);
  // Strøm og drivstoff for ett steg på dt spillminutter. sol: 0–1 (sola og skydekket). Gir { prod, behov, mangler: Set av id-er uten strøm, liter, nyFerdig: [bygg] }
  function steg(L, dt, sol = 1) {
    const nyFerdig = [];
    for (const b of L.bygg) if (b.igjen > 0) { b.igjen = Math.max(0, b.igjen - dt); if (b.igjen === 0) nyFerdig.push(b); }
    const klare = L.bygg.filter(ferdig), agg = klare.filter(b => b.type === 'aggregat'), sc = klare.filter(b => b.type === 'solcelle');
    const solKW = sc.length * BYGG.solcelle.kw * Math.max(0, Math.min(1, sol));
    const brukere = klare.filter(b => BYGG[b.type].kw < 0).sort((a, b) => PRIORITET.indexOf(a.type) - PRIORITET.indexOf(b.type));
    const behov = brukere.reduce((s, b) => s - BYGG[b.type].kw, 0), tank = kapasitet(L);
    L.drivstoff = Math.min(L.drivstoff, tank);
    // aggregatene dekker det sola ikke klarer, så lenge det er drivstoff
    const aggMaks = L.drivstoff > 0 ? agg.length * BYGG.aggregat.kw : 0, aggKW = Math.min(aggMaks, Math.max(0, behov - solKW));
    const liter = aggKW * DRIVSTOFF.literPerKWt * dt / 60; L.drivstoff = Math.max(0, L.drivstoff - liter);
    let igjen = solKW + aggKW; const mangler = new Set();
    for (const b of brukere) { const k = -BYGG[b.type].kw; if (igjen + 1e-9 >= k) igjen -= k; else mangler.add(b.id); }
    return { prod: solKW + aggKW, kapasitet: solKW + aggMaks, behov, mangler, liter, nyFerdig, sol: solKW };
  }
  // Hvor mye drivstoff leiren kan ha: tankene + en liten tank i hvert aggregat
  const kapasitet = L => L.bygg.filter(ferdig).reduce((s, b) => s + (b.type === 'drivstofftank' ? BYGG.drivstofftank.liter : b.type === 'aggregat' ? DRIVSTOFF.iAggregat : 0), 0);
  // Kjøp drivstoff: så mye som får plass, gir { liter, pris } eller { feil }
  function kjøpDrivstoff(L, liter, betal) {
    const plass = Math.max(0, kapasitet(L) - L.drivstoff), l = Math.min(liter, Math.floor(plass)); if (l <= 0) return { feil: 'Ingen plass: bygg en drivstofftank (eller et aggregat).' };
    const pris = l * DRIVSTOFF.prisPerLiter; if (!betal(pris)) return { feil: `Ikke nok penger (${kroner(pris)}).` };
    L.drivstoff += l; return { liter: l, pris };
  }
  const plasser = L => L.bygg.filter(ferdig).reduce((s, b) => s + (BYGG[b.type].plasser || 0), 0);
  function kroner(n) { const nf = (v, d) => v.toLocaleString('nb-NO', { maximumFractionDigits: d }); return Math.abs(n) >= 1e6 ? nf(n / 1e6, 1) + ' mill. kr' : nf(Math.round(n), 0) + ' kr'; }
  const tilJSON = L => JSON.stringify(L);
  function fraJSON(t) { try { const L = JSON.parse(t); if (!L || L.versjon !== 1 || !Array.isArray(L.bygg)) return null; L.bygg = L.bygg.filter(b => BYGG[b.type]); return { ...ny(), ...L }; } catch (e) { return null; } }
  const api = { BYGG, PRIORITET, DRIVSTOFF, ny, kostnad, hjørner, overlapper, kanBygge, bygg, ferdig, framdrift, steg, kapasitet, kjøpDrivstoff, plasser, lengde, kroner, tilJSON, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Leir = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
