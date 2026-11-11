/* K2 – leiren: regler uten DOM (Node: require('./leir'); nettleser: globalThis.Leir).
 * Byggene koster kroner, materialer (tre, betong, stål) og spilltid (1× = ekte tid; brukeren 9. nov), og står der du plasserer dem
 * (hvor som helst, ikke i vann eller oppå et annet bygg). Strøm: aggregat (drivstoff fra tanken) og solcellepaneler gir strøm;
 * kontrollrom, kameramaster, radiomast, verksted, sykestue, drivhus og brakker bruker strøm. Er det for lite, får byggene strøm i
 * prioritert rekkefølge. Prisene og tidene er Claudes forslag, godkjent av brukeren som utgangspunkt. Se docs/plan-kollaps.md (K2).
 * Forbedret byggesystem (11. nov, brukeren: «forbedre byggesystemet» – rive og flytte, bedre plassering, bedre gjerde, mer dybde):
 *  - riv (30 % tilbake, 90 % og materialene hvis bygget ikke er ferdig) og flytt (25 % av prisen, 30 % av tiden, virker ikke imens);
 *  - nivå 2 og 3 for noen bygg (mer strøm, flere senger, større tank og lager, lengre radio); oppgradering koster 60 % / 100 %;
 *  - byggelag: ett lag + ett per ferdig brakke, resten av jobbene står i kø;
 *  - materialer kjøpes og lagres (grunnlager + lagertelt og containere);
 *  - skade (fra fiender i leiren) og reparasjon; under halvt helt bygg virker halvparten, helt ødelagt forsvinner;
 *  - gjerde i flere ledd (også lukket ring), og porter som settes i gjerdet lager en åpning.
 * Plassering og planlegging (12. nov, brukeren: «bedre å plassere bygg og planlegge leiren»):
 *  - snapp(): nye bygg legger seg inntil nærmeste bygg med 2 m mellomrom eller retter seg etter kanten/midten (innen 3 m), med hjelpelinjer;
 *  - for bratt grunn avvises (mer enn 3 m høydeforskjell under bygget, når v.høyde finnes);
 *  - planen: gratis skisser (L.plan) som holder plassen, kan flyttes og fjernes, og bygges én og én eller alle (byggPlan);
 *  - maler: tilMal() lagrer leiren (bygg + plan) rundt et midtpunkt, planMal() legger den inn i planen et annet sted, også rotert.
 */
(function (rot) {
  'use strict';
  // fot: omrisset i meter rundt modellens origo [x0, x1, y0, y1] (fronten mot +x); kw: + produserer, − bruker; tid i spilltimer;
  // mat: materialer { tre, betong, stål }; nivå: verdiene for nivå 1, 2, 3 (bare byggene som kan oppgraderes)
  const BYGG = {
    kontrollrom: { navn: 'Kontrollrom', pris: 15e6, tid: 6, kw: -8, modell: 'hovedhus', fot: [-5.1, 5.8, -6.5, 6.5], mat: { tre: 10, betong: 40, stål: 8 }, tekst: 'Kartet, kameraene og radioen' },
    brakke: { navn: 'Brakke', pris: 4e6, tid: 2, kw: -1, modell: 'brakke', fot: [-3.4, 4.2, -6.4, 6.4], mat: { tre: 25, betong: 5 }, nivå: { plasser: [8, 14, 20] }, tekst: 'Sengeplasser og ett byggelag til' },
    vakttårn: { navn: 'Vakttårn', pris: 5e6, tid: 1, kw: 0, modell: 'vakttårn', fot: [-1.6, 1.6, -1.9, 1.6], mat: { tre: 12, stål: 1 }, tekst: 'Utsikt og lyskaster' },
    port: { navn: 'Port med vaktbu', pris: 1.5e6, tid: 1, kw: 0, modell: 'port', fot: [-2.3, 2.3, -7.1, 3.9], mat: { stål: 3, betong: 2 }, port: true, tekst: 'Settes i gjerdet og lager en åpning' },
    gjerde: { navn: 'Gjerde', prisPerMeter: 50000, tidPerMeter: .02, kw: 0, modell: 'gjerde', linje: true, matPerMeter: { stål: .02 }, tekst: 'Trykk punkt for punkt; «Lukk ringen» for et gjerde rundt' },
    lagertelt: { navn: 'Lagertelt', pris: 2e6, tid: 1, kw: 0, modell: 'lagertelt', fot: [-4.3, 4.3, -3.8, 3.8], mat: { tre: 4, stål: 1 }, nivå: { lager: [100, 200, 300] }, tekst: 'Lager for materialer' },
    container: { navn: 'Container', pris: 5e5, tid: .5, kw: 0, modell: 'container', fot: [-3, 3.1, -1.2, 1.2], mat: { stål: 2 }, nivå: { lager: [40, 70, 100] }, tekst: 'Lite lager for materialer' },
    verksted: { navn: 'Verksted', pris: 7e6, tid: 3, kw: -4, modell: 'verksted', fot: [-6.3, 12, -7.3, 7.3], mat: { tre: 10, betong: 25, stål: 10 }, tekst: 'Reparerer kjøretøy' },
    sykestue: { navn: 'Sykestue', pris: 6e6, tid: 3, kw: -3, modell: 'sykestue', fot: [-3.9, 7.5, -5.9, 5.9], mat: { tre: 15, betong: 10, stål: 2 }, tekst: 'Stell av sårede' },
    drivstofftank: { navn: 'Drivstofftank', pris: 3e6, tid: 1, kw: 0, modell: 'drivstofftank', fot: [-2.2, 3.7, -4, 4], mat: { stål: 6, betong: 3 }, nivå: { liter: [5000, 10000, 20000] }, tekst: 'Rommer drivstoff' },
    aggregat: { navn: 'Aggregat', pris: 8e6, tid: 1, kw: 20, modell: 'aggregat', fot: [-1.6, 1.6, -1, 1], mat: { stål: 4 }, nivå: { kw: [20, 35, 50] }, tekst: 'Gir strøm, bruker drivstoff' },
    solcelle: { navn: 'Solcellepaneler', pris: 3e6, tid: .5, kw: 5, modell: 'solcelle', fot: [-4, 4, -2, 2], mat: { stål: 2 }, sol: true, nivå: { kw: [5, 9, 14] }, tekst: 'Gir strøm i dagslys' },
    kameramast: { navn: 'Kameramast', pris: 5e5, tid: .5, kw: -.5, modell: 'kameramast', fot: [-.5, .5, -.5, .5], mat: { stål: 1 }, nivå: { rekkevidde: [300, 500, 800] }, tekst: 'Kamera (K4)' },
    radiomast: { navn: 'Radiomast', pris: 2e6, tid: 2, kw: -1, modell: 'radiomast', fot: [-1, 1, -1, 1], mat: { stål: 5, betong: 2 }, nivå: { rekkevidde: [40000, 60000, 80000] }, tekst: 'Leirens radio når lenger' },
    drivhus: { navn: 'Drivhus', pris: 2.5e6, tid: 2, kw: -1, modell: 'drivhus', fot: [-3, 3, -5, 5], mat: { tre: 6, stål: 2 }, tekst: 'Dyrker mat' },
    helikopterplass: { navn: 'Helikopterplass', pris: 10e6, tid: 4, kw: 0, modell: 'helikopterplass', fot: [-10.9, 15.6, -10.9, 10.9], mat: { betong: 60 }, tekst: 'Landingsplass' },
    sandsekkvoll: { navn: 'Sandsekkvoll', pris: 2e5, tid: .5, kw: 0, modell: 'sandsekkvoll', fot: [-.3, .2, -4, 4], mat: {}, tekst: 'Dekning' },
  };
  const MATERIALER = { tre: { navn: 'Tre', enhet: 'm³', pris: 20000 }, betong: { navn: 'Betong', enhet: 'm³', pris: 30000 }, stål: { navn: 'Stål', enhet: 't', pris: 60000 } };
  const GRUNNLAGER = 60;   // så mye av hvert materiale leiren kan ha uten lagertelt og containere
  // hvem får strøm først når det er for lite
  const PRIORITET = ['kontrollrom', 'radiomast', 'kameramast', 'sykestue', 'verksted', 'drivhus', 'brakke'];
  const DRIVSTOFF = { prisPerLiter: 8000, literPerKWt: .3, iAggregat: 200 };   // 10 l = 80 000 kr (plan-kollaps.md); aggregatet har en liten egen tank
  const REGLER = { rivFerdig: .3, rivUferdig: .9, flyttPris: .25, flyttTid: .3, oppgrader: [.6, 1], oppgraderTid: .5, reparerPris: .25, reparerTid: .3, halvSkade: .5 };

  function ny() { return { versjon: 2, bygg: [], neste: 1, nesteJobb: 1, drivstoff: 0, lager: { tre: 0, betong: 0, stål: 0 }, plan: [], nestePlan: 1 }; }
  const lengde = (P, lukket) => { let l = 0; const Q = lukket ? [...P, P[0]] : P; for (let i = 1; i < Q.length; i++) l += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); return l; };
  // Pris, tid og materialer for et bygg (gjerdet etter lengden). bonus.bygg (ingeniør) gjør byggingen raskere.
  function kostnad(type, l = 0, bonus = {}) {
    const B = BYGG[type]; if (!B) return null;
    const pris = B.linje ? Math.round(B.prisPerMeter * l) : B.pris, timer = (B.linje ? B.tidPerMeter * l : B.tid) / (bonus.bygg || 1);
    const mat = {}; for (const [k, v] of Object.entries(B.linje ? B.matPerMeter : B.mat || {})) mat[k] = Math.ceil((B.linje ? v * l : v) * 10) / 10;
    return { pris, timer, mat };
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
  // Kan bygget stå her? v = { klasse(x, y) (3 = vann, 255 = utenfor kartet), iHus(x, y) -> true } (fra kartet). unntatt: id som flyttes.
  // Skissene i planen holder plassen (unntatt skissen som bygges eller flyttes, planUnntatt). Høyden i kartet gir bratt-sjekken.
  const BRATT = 3;
  function kanBygge(L, b, v = {}, unntatt = null, o = {}) {
    const B = BYGG[b.type]; if (!B) return 'Ukjent bygg.';
    if (B.linje) { if (!b.punkter || b.punkter.length < 2) return 'Gjerdet trenger minst to punkter.'; const l = lengde(b.punkter, b.lukket); if (l < 2) return 'Gjerdet er for kort.'; if (l > 3000) return 'Gjerdet er for langt (høyst 3 km om gangen).'; }
    const P = hjørner(b), punkter = B.linje ? b.punkter : [...P, [b.x, b.y]];
    for (const [x, y] of punkter) { const k = v.klasse ? v.klasse(x, y) : 2; if (k === 3) return 'Kan ikke bygge i vann.'; if (k === 255 || k === undefined) return 'Her finnes det ikke kart.'; }
    if (!B.linje && v.iHus && punkter.some(([x, y]) => v.iHus(x, y))) return 'Det står et hus her.';
    // delene i byggesettet (del: true) står inntil og oppå hverandre; plassene deres sjekkes i byggesett.js
    if (!B.linje) for (const a of L.bygg) if (a.id !== unntatt && !BYGG[a.type].linje && !(B.del && BYGG[a.type].del) && overlapper(P, hjørner(a))) return `For nær ${BYGG[a.type].navn.toLowerCase()}.`;
    if (!B.linje) for (const a of L.plan || []) if (a.pid !== o.planUnntatt && !BYGG[a.type].linje && !(B.del && BYGG[a.type].del) && overlapper(P, hjørner(a))) return `For nær planlagt ${BYGG[a.type].navn.toLowerCase()}.`;
    if (!B.linje && v.høyde) { const h = P.map(([x, y]) => v.høyde(x, y)).filter(z => z !== null && z !== undefined && z === z);
      // store bygg tåler litt mer høydeforskjell (planering): 3 m, eller 18 % av diagonalen
      const diag = Math.hypot(P[2][0] - P[0][0], P[2][1] - P[0][1]), grense = Math.max(BRATT, .18 * diag), d = h.length > 1 ? Math.max(...h) - Math.min(...h) : 0;
      if (d > grense) return `For bratt her (${Math.round(d)} m høydeforskjell under bygget).`; }
    return null;
  }
  // ---------- lager og materialer ----------
  const virker = b => b.igjen <= 0 && !(b.arbeid && b.arbeid.hva === 'flytt') && b.hp > 0;
  const ferdig = b => b.igjen <= 0;
  // Verdiene for et bygg nå: nivået, og halvparten når det er hardt skadet
  function effekt(b) {
    const B = BYGG[b.type], n = (b.nivå || 1) - 1, f = virker(b) ? (b.hp < REGLER.halvSkade ? .5 : 1) : 0, N = B.nivå || {};
    const v = k => (N[k] ? N[k][n] : B[k] || 0) * f;
    return { kw: B.kw > 0 ? v('kw') : B.kw < 0 && virker(b) ? B.kw : 0, plasser: v('plasser'), liter: v('liter'), lager: v('lager'), rekkevidde: v('rekkevidde') };
  }
  const lagerplass = L => GRUNNLAGER + L.bygg.reduce((s, b) => s + effekt(b).lager, 0);
  const harMat = (L, mat) => Object.entries(mat).every(([k, v]) => (L.lager[k] || 0) + 1e-9 >= v);
  const trekk = (L, mat) => { for (const [k, v] of Object.entries(mat)) L.lager[k] = Math.max(0, (L.lager[k] || 0) - v); };
  const manglerTekst = (L, mat) => Object.entries(mat).filter(([k, v]) => (L.lager[k] || 0) < v).map(([k, v]) => `${Math.ceil((v - (L.lager[k] || 0)) * 10) / 10} ${MATERIALER[k].enhet} ${MATERIALER[k].navn.toLowerCase()}`).join(', ');
  function kjøpMateriale(L, type, mengde, betal) {
    const plass = Math.max(0, lagerplass(L) - (L.lager[type] || 0)), m = Math.min(mengde, Math.floor(plass * 10) / 10);
    if (m <= 0) return { feil: 'Lageret er fullt: bygg lagertelt eller containere.' };
    const pris = Math.round(m * MATERIALER[type].pris); if (!betal(pris)) return { feil: `Ikke nok penger (${kroner(pris)}).` };
    L.lager[type] = (L.lager[type] || 0) + m; return { mengde: m, pris };
  }
  // ---------- bygge ----------
  // Legger til et bygg og trekker penger og materialer (betal(beløp) -> true når det går). Gir { bygg } eller { feil }.
  function bygg(L, b, betal, bonus = {}, v = {}, o = {}) {
    const f = kanBygge(L, b, v, null, o); if (f) return { feil: f };
    const B = BYGG[b.type], k = kostnad(b.type, B.linje ? lengde(b.punkter, b.lukket) : 0, bonus);
    if (!harMat(L, k.mat)) return { feil: `Mangler materialer: ${manglerTekst(L, k.mat)}.`, mangler: k.mat };
    if (!betal(k.pris)) return { feil: `Ikke nok penger (${kroner(k.pris)}).` };
    trekk(L, k.mat);
    const ny = { id: L.neste++, type: b.type, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, ret: +(b.ret || 0).toFixed(3), igjen: k.timer * 60, totalt: k.timer * 60,
      pris: k.pris, mat: k.mat, nivå: 1, hp: 1, nr: L.nesteJobb++, arbeid: null };
    if (b.punkter) { ny.punkter = b.punkter.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]); ny.x = ny.punkter[0][0]; ny.y = ny.punkter[0][1]; ny.lukket = !!b.lukket; }
    L.bygg.push(ny); return { bygg: ny };
  }
  const finn = (L, id) => L.bygg.find(b => b.id === id);
  // Riv: gir tilbake { penger } (og materialene hvis bygget ikke var ferdig)
  function riv(L, id) {
    const b = finn(L, id); if (!b) return { feil: 'Finnes ikke.' };
    const uferdig = b.igjen > 0, penger = Math.round(b.pris * (uferdig ? REGLER.rivUferdig : REGLER.rivFerdig));
    if (uferdig && b.mat) for (const [k, v] of Object.entries(b.mat)) L.lager[k] = Math.min(lagerplass(L), (L.lager[k] || 0) + v);
    L.bygg = L.bygg.filter(q => q !== b); return { penger, uferdig };
  }
  // Flytt: koster 25 % av grunnprisen og 30 % av byggetiden; bygget virker ikke før det er flyttet
  function flytt(L, id, til, betal, bonus = {}, v = {}) {
    const b = finn(L, id); if (!b || BYGG[b.type].linje) return { feil: 'Kan ikke flyttes.' }; if (b.arbeid) return { feil: 'Bygget er opptatt.' };
    const f = kanBygge(L, { type: b.type, x: til.x, y: til.y, ret: til.ret }, v, b.id); if (f) return { feil: f };
    const B = BYGG[b.type], pris = Math.round(B.pris * REGLER.flyttPris); if (!betal(pris)) return { feil: `Ikke nok penger (${kroner(pris)}).` };
    b.x = Math.round(til.x * 10) / 10; b.y = Math.round(til.y * 10) / 10; b.ret = +(til.ret || 0).toFixed(3);
    const t = B.tid * REGLER.flyttTid / (bonus.bygg || 1) * 60; b.arbeid = { hva: 'flytt', igjen: t, totalt: t, nr: L.nesteJobb++ }; return { pris };
  }
  const maksNivå = type => (BYGG[type].nivå ? Object.values(BYGG[type].nivå)[0].length : 1);
  function oppgraderKostnad(b, bonus = {}) {
    const B = BYGG[b.type], n = b.nivå || 1; if (n >= maksNivå(b.type)) return null; const f = REGLER.oppgrader[n - 1];
    const mat = {}; for (const [k, v] of Object.entries(B.mat || {})) mat[k] = Math.ceil(v * f * 10) / 10;
    return { pris: Math.round(B.pris * f), timer: B.tid * REGLER.oppgraderTid / (bonus.bygg || 1), mat, til: n + 1 };
  }
  function oppgrader(L, id, betal, bonus = {}) {
    const b = finn(L, id); if (!b) return { feil: 'Finnes ikke.' }; if (!ferdig(b) || b.arbeid) return { feil: 'Bygget er ikke klart.' };
    const k = oppgraderKostnad(b, bonus); if (!k) return { feil: 'Høyeste nivå.' };
    if (!harMat(L, k.mat)) return { feil: `Mangler materialer: ${manglerTekst(L, k.mat)}.`, mangler: k.mat };
    if (!betal(k.pris)) return { feil: `Ikke nok penger (${kroner(k.pris)}).` };
    trekk(L, k.mat); b.pris += k.pris; b.arbeid = { hva: 'oppgrader', igjen: k.timer * 60, totalt: k.timer * 60, nr: L.nesteJobb++ }; return k;
  }
  function skade(L, id, mengde) {
    const b = finn(L, id); if (!b) return null; b.hp = Math.max(0, b.hp - mengde);
    if (b.hp <= 0) { L.bygg = L.bygg.filter(q => q !== b); return 'ødelagt'; } return b.hp;
  }
  function reparerKostnad(b, bonus = {}) { const B = BYGG[b.type], s = 1 - b.hp; if (s <= 0) return null; const grunn = B.linje ? b.pris : B.pris;
    return { pris: Math.round(grunn * REGLER.reparerPris * s), timer: (B.linje ? b.totalt / 60 : B.tid) * REGLER.reparerTid * s / (bonus.bygg || 1) }; }
  function reparer(L, id, betal, bonus = {}) {
    const b = finn(L, id); if (!b) return { feil: 'Finnes ikke.' }; if (b.arbeid) return { feil: 'Bygget er opptatt.' };
    const k = reparerKostnad(b, bonus); if (!k) return { feil: 'Bygget er helt.' }; if (!betal(k.pris)) return { feil: `Ikke nok penger (${kroner(k.pris)}).` };
    b.arbeid = { hva: 'reparer', igjen: k.timer * 60, totalt: k.timer * 60, nr: L.nesteJobb++ }; return k;
  }
  // ---------- porter i gjerdet ----------
  // Nærmeste gjerdeledd innen 8 m: porten festes midt på linja og snus langs den (portens y-akse langs gjerdet)
  function festTilGjerde(L, x, y) {
    let best = null;
    for (const g of L.bygg) { if (!BYGG[g.type].linje) continue; const P = g.lukket ? [...g.punkter, g.punkter[0]] : g.punkter;
      for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py); if (d < 8 && (!best || d < best.d)) best = { d, x: px, y: py, ret: Math.atan2(dy, dx) - Math.PI / 2, gjerde: g.id }; } }
    return best;
  }
  // Leddene i et gjerde med åpninger der portene står: [[[x, y], [x, y]], ...]
  function gjerdeLedd(L, g) {
    const P = g.lukket ? [...g.punkter, g.punkter[0]] : g.punkter, porter = L.bygg.filter(b => BYGG[b.type].port), ut = [];
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy); if (l < .3) continue; const ux = dx / l, uy = dy / l; let hull = [];
      for (const p of porter) { const s = (p.x - ax) * ux + (p.y - ay) * uy, d = Math.abs((p.x - ax) * -uy + (p.y - ay) * ux); if (d < 1.5 && s > -8 && s < l + 8) hull.push([s + BYGG.port.fot[2], s + BYGG.port.fot[3]]); }
      hull.sort((a, b) => a[0] - b[0]); let s0 = 0;
      for (const [h0, h1] of hull) { if (h0 > s0 + .3) ut.push([[ax + ux * s0, ay + uy * s0], [ax + ux * Math.min(h0, l), ay + uy * Math.min(h0, l)]]); s0 = Math.max(s0, h1); }
      if (s0 < l - .3) ut.push([[ax + ux * s0, ay + uy * s0], [bx, by]]);
    }
    return ut;
  }
  // ---------- plassering: snapping til naboen ----------
  // Legger bygget inntil nærmeste bygg (eller planlagte bygg) innen 60 m: side mot side med `gap` meter mellom, eller kant/midte på linje,
  // når det er innen `rad` meter. Bare når byggene står i samme retning (eller 90° på tvers). Gir { x, y, linjer, nabo, avstand }.
  function snapp(L, b, o = {}) {
    const gap = o.gap === undefined ? 2 : o.gap, rad = o.rad || 3, B = BYGG[b.type]; if (!B || B.linje) return { x: b.x, y: b.y, linjer: [] };
    const andre = [...L.bygg.filter(a => a.id !== o.unntatt), ...(L.plan || []).filter(a => a.pid !== o.unntattPid)].filter(a => !BYGG[a.type].linje && !BYGG[a.type].del);
    let n = null, best = 60; for (const a of andre) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < best) { best = d; n = a; } }
    if (!n) return { x: b.x, y: b.y, linjer: [] };
    const dr = (((b.ret || 0) - (n.ret || 0)) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2);
    const c = Math.cos(n.ret || 0), s = Math.sin(n.ret || 0), lok = ([x, y]) => [(x - n.x) * c + (y - n.y) * s, -(x - n.x) * s + (y - n.y) * c], verd = ([u, w]) => [n.x + u * c - w * s, n.y + u * s + w * c];
    const [nx0, nx1, ny0, ny1] = BYGG[n.type].fot;
    const boks = q => { const P = hjørner(q).map(lok); return [Math.min(...P.map(p => p[0])), Math.max(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[1]))]; };
    let [bx0, bx1, by0, by1] = boks(b);
    const avst = () => Math.hypot(Math.max(0, bx0 - nx1, nx0 - bx1), Math.max(0, by0 - ny1, ny0 - by1));
    if (Math.min(dr, Math.PI / 2 - dr) > .02) return { x: b.x, y: b.y, linjer: [], nabo: n, avstand: avst() };
    // kandidatene per akse: [forskyvning, linjens koordinat]
    const akse = (a0, a1, m0, m1) => [[m1 + gap - a0, m1 + gap], [m0 - gap - a1, m0 - gap], [m0 - a0, m0], [m1 - a1, m1], [(m0 + m1) / 2 - (a0 + a1) / 2, (m0 + m1) / 2]]
      .filter(([d]) => Math.abs(d) < rad).sort((p, q) => Math.abs(p[0]) - Math.abs(q[0]))[0];
    const sx = akse(bx0, bx1, nx0, nx1), sy = akse(by0, by1, ny0, ny1);
    const [ux, uy] = lok([b.x, b.y]), du = sx ? sx[0] : 0, dw = sy ? sy[0] : 0;
    bx0 += du; bx1 += du; by0 += dw; by1 += dw;
    // ikke snapp inn i naboen (to kanter på linje på begge akser kan legge bygget oppå)
    if (!(bx1 <= nx0 || nx1 <= bx0 || by1 <= ny0 || ny1 <= by0)) return { x: b.x, y: b.y, linjer: [], nabo: n, avstand: avst() };
    const [x, y] = verd([ux + du, uy + dw]), linjer = [];
    if (sx) linjer.push([...verd([sx[1], Math.min(by0, ny0) - 2]), ...verd([sx[1], Math.max(by1, ny1) + 2])]);
    if (sy) linjer.push([...verd([Math.min(bx0, nx0) - 2, sy[1]]), ...verd([Math.max(bx1, nx1) + 2, sy[1]])]);
    return { x, y, linjer, nabo: n, avstand: avst() };
  }
  // ---------- planen (gratis skisser som holder plassen) ----------
  const planFinn = (L, pid) => (L.plan || []).find(a => a.pid === pid);
  const planKopi = b => { const q = { type: b.type, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, ret: +(b.ret || 0).toFixed(3) };
    if (b.punkter) { q.punkter = b.punkter.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]); q.x = q.punkter[0][0]; q.y = q.punkter[0][1]; q.lukket = !!b.lukket; } return q; };
  function planLegg(L, b, v = {}) {
    if (!L.plan) L.plan = []; const f = kanBygge(L, b, v); if (f) return { feil: f };
    const q = { pid: L.nestePlan = (L.nestePlan || 1), ...planKopi(b) }; L.nestePlan++; L.plan.push(q); return { plan: q };
  }
  function planFlytt(L, pid, til, v = {}) {
    const a = planFinn(L, pid); if (!a || BYGG[a.type].linje) return { feil: 'Kan ikke flyttes.' };
    const f = kanBygge(L, { type: a.type, x: til.x, y: til.y, ret: til.ret }, v, null, { planUnntatt: pid }); if (f) return { feil: f };
    Object.assign(a, planKopi({ type: a.type, x: til.x, y: til.y, ret: til.ret })); return { plan: a };
  }
  function planFjern(L, pid) { const n = (L.plan || []).length; L.plan = (L.plan || []).filter(a => a.pid !== pid); return L.plan.length < n; }
  // Hva planen koster til sammen (byggetiden er summen; med flere byggelag går det fortere)
  function planKostnad(L, bonus = {}) {
    const ut = { antall: 0, pris: 0, timer: 0, mat: {} };
    for (const a of L.plan || []) { const B = BYGG[a.type], k = kostnad(a.type, B.linje ? lengde(a.punkter, a.lukket) : 0, bonus); ut.antall++; ut.pris += k.pris; ut.timer += k.timer;
      for (const [m, v] of Object.entries(k.mat)) ut.mat[m] = Math.round(((ut.mat[m] || 0) + v) * 10) / 10; }
    return ut;
  }
  // Bygger planlagte bygg (alle, eller pids) i den rekkefølgen de ble planlagt. Stopper ikke ved én feil. Gir { bygget, feil: [[pid, tekst]] }.
  function byggPlan(L, betal, bonus = {}, v = {}, pids = null) {
    const bygget = [], feil = [];
    for (const a of (L.plan || []).slice()) { if (pids && !pids.includes(a.pid)) continue;
      const r = bygg(L, a, betal, bonus, v, { planUnntatt: a.pid }); if (r.feil) { feil.push([a.pid, r.feil]); continue; }
      planFjern(L, a.pid); bygget.push(r.bygg); }
    return { bygget, feil };
  }
  // ---------- maler ----------
  // Leiren som mal rundt (cx, cy): byggene (ikke ødelagte) og planen, med plass og retning i forhold til midten
  function tilMal(L, cx, cy, navn = 'Mal') {
    const del = b => { const q = { type: b.type, dx: Math.round((b.x - cx) * 10) / 10, dy: Math.round((b.y - cy) * 10) / 10, ret: +(b.ret || 0).toFixed(3) };
      if (b.punkter) { q.punkter = b.punkter.map(([x, y]) => [Math.round((x - cx) * 10) / 10, Math.round((y - cy) * 10) / 10]); q.lukket = !!b.lukket; } return q; };
    return { versjon: 1, navn, bygg: [...L.bygg.filter(b => b.hp > 0), ...(L.plan || [])].map(del) };
  }
  // Byggene i en mal satt ut med midten i (x, y) og dreid `rot` radianer
  function fraMal(mal, x, y, rot = 0) {
    const c = Math.cos(rot), s = Math.sin(rot), p = ([u, w]) => [x + u * c - w * s, y + u * s + w * c];
    return (mal && mal.bygg || []).filter(q => BYGG[q.type]).map(q => { const [bx, by] = p([q.dx, q.dy]), b = { type: q.type, x: bx, y: by, ret: (q.ret || 0) + rot };
      if (q.punkter) { b.punkter = q.punkter.map(p); b.lukket = !!q.lukket; b.x = b.punkter[0][0]; b.y = b.punkter[0][1]; } return b; });
  }
  // Legger malen inn i planen (det som ikke får plass, hoppes over). v(b) kan gi kartsjekken per bygg.
  function planMal(L, mal, x, y, rot = 0, v = () => ({})) {
    const lagt = [], feil = [];
    for (const b of fraMal(mal, x, y, rot)) { const r = planLegg(L, b, v(b)); if (r.feil) feil.push([b.type, r.feil]); else lagt.push(r.plan); }
    return { lagt, feil };
  }
  // ---------- tid, strøm og drivstoff ----------
  const byggelag = L => 1 + L.bygg.filter(b => b.type === 'brakke' && virker(b)).length;
  // Jobbene i køen (ny bygging, oppgradering, flytting, reparasjon) i den rekkefølgen de ble bestilt
  function jobber(L) {
    const j = [];
    for (const b of L.bygg) { if (b.igjen > 0) j.push({ b, nr: b.nr || b.id, hva: 'bygg' }); else if (b.arbeid) j.push({ b, nr: b.arbeid.nr, hva: b.arbeid.hva }); }
    return j.sort((a, c) => a.nr - c.nr);
  }
  // Ett steg på dt spillminutter. sol: 0–1. Gir { prod, behov, mangler: Set av id-er uten strøm, liter, nyFerdig: [bygg], ferdigArbeid: [[bygg, hva]] }
  function steg(L, dt, sol = 1) {
    const nyFerdig = [], ferdigArbeid = [], J = jobber(L), aktive = J.slice(0, byggelag(L));
    for (const { b, hva } of aktive) {
      if (hva === 'bygg') { b.igjen = Math.max(0, b.igjen - dt); if (b.igjen === 0) nyFerdig.push(b); }
      else { b.arbeid.igjen = Math.max(0, b.arbeid.igjen - dt);
        if (b.arbeid.igjen === 0) { if (hva === 'oppgrader') b.nivå = (b.nivå || 1) + 1; if (hva === 'reparer') b.hp = 1; ferdigArbeid.push([b, hva]); b.arbeid = null; } }
    }
    const klare = L.bygg.filter(virker), agg = klare.filter(b => b.type === 'aggregat'), sc = klare.filter(b => b.type === 'solcelle');
    const solKW = sc.reduce((s, b) => s + effekt(b).kw, 0) * Math.max(0, Math.min(1, sol));
    const brukere = klare.filter(b => BYGG[b.type].kw < 0).sort((a, b) => PRIORITET.indexOf(a.type) - PRIORITET.indexOf(b.type));
    const behov = brukere.reduce((s, b) => s - BYGG[b.type].kw, 0), tank = kapasitet(L);
    L.drivstoff = Math.min(L.drivstoff, tank);
    // aggregatene dekker det sola ikke klarer, så lenge det er drivstoff
    const aggMaks = L.drivstoff > 0 ? agg.reduce((s, b) => s + effekt(b).kw, 0) : 0, aggKW = Math.min(aggMaks, Math.max(0, behov - solKW));
    const liter = aggKW * DRIVSTOFF.literPerKWt * dt / 60; L.drivstoff = Math.max(0, L.drivstoff - liter);
    let igjen = solKW + aggKW; const mangler = new Set();
    for (const b of brukere) { const k = -BYGG[b.type].kw; if (igjen + 1e-9 >= k) igjen -= k; else mangler.add(b.id); }
    return { prod: solKW + aggKW, kapasitet: solKW + aggMaks, behov, mangler, liter, nyFerdig, ferdigArbeid, sol: solKW, kø: Math.max(0, J.length - aktive.length), aktive: aktive.length };
  }
  // Hvor mye drivstoff leiren kan ha: tankene + en liten tank i hvert aggregat
  // (drivstoffet blir liggende i tanken mens den flyttes eller er skadet, så ferdige tanker teller med full størrelse)
  const kapasitet = L => L.bygg.filter(ferdig).reduce((s, b) => s + (b.type === 'drivstofftank' ? BYGG.drivstofftank.nivå.liter[(b.nivå || 1) - 1] : 0) + (b.type === 'aggregat' ? DRIVSTOFF.iAggregat : 0), 0);
  // Kjøp drivstoff: så mye som får plass, gir { liter, pris } eller { feil }
  function kjøpDrivstoff(L, liter, betal) {
    const plass = Math.max(0, kapasitet(L) - L.drivstoff), l = Math.min(liter, Math.floor(plass)); if (l <= 0) return { feil: 'Ingen plass: bygg en drivstofftank (eller et aggregat).' };
    const pris = l * DRIVSTOFF.prisPerLiter; if (!betal(pris)) return { feil: `Ikke nok penger (${kroner(pris)}).` };
    L.drivstoff += l; return { liter: l, pris };
  }
  const plasser = L => L.bygg.reduce((s, b) => s + effekt(b).plasser, 0);
  const mastRekkevidde = L => L.bygg.filter(b => b.type === 'radiomast').reduce((m, b) => Math.max(m, effekt(b).rekkevidde), 0);
  const framdrift = b => (b.igjen > 0 ? (b.totalt ? Math.max(0, Math.min(1, 1 - b.igjen / b.totalt)) : 1) : b.arbeid ? Math.max(0, Math.min(1, 1 - b.arbeid.igjen / b.arbeid.totalt)) : 1);
  function kroner(n) { const nf = (v, d) => v.toLocaleString('nb-NO', { maximumFractionDigits: d }); return Math.abs(n) >= 1e6 ? nf(n / 1e6, 1) + ' mill. kr' : nf(Math.round(n), 0) + ' kr'; }
  const tilJSON = L => JSON.stringify(L);
  // Leser lagringen (versjon 1 fra K2 gjøres om: nivå 1, helt, tomt lager)
  function fraJSON(t) {
    try { const L = JSON.parse(t); if (!L || !(L.versjon === 1 || L.versjon === 2) || !Array.isArray(L.bygg)) return null;
      const n = { ...ny(), ...L, versjon: 2 }; n.lager = { ...ny().lager, ...(L.lager || {}) };
      n.bygg = L.bygg.filter(b => BYGG[b.type]).map(b => ({ nivå: 1, hp: 1, nr: b.id, arbeid: null, mat: {}, ...b }));
      n.plan = Array.isArray(L.plan) ? L.plan.filter(a => BYGG[a.type]) : []; n.nestePlan = Math.max(n.nestePlan || 1, ...n.plan.map(a => a.pid + 1));
      n.nesteJobb = Math.max(n.nesteJobb || 1, ...n.bygg.map(b => (b.nr || 0) + 1), ...n.bygg.map(b => (b.arbeid ? b.arbeid.nr + 1 : 1)));
      return n; } catch (e) { return null; }
  }
  const api = { BYGG, MATERIALER, GRUNNLAGER, PRIORITET, DRIVSTOFF, REGLER, ny, kostnad, hjørner, overlapper, kanBygge, bygg, riv, flytt, oppgrader, oppgraderKostnad, maksNivå,
    skade, reparer, reparerKostnad, festTilGjerde, gjerdeLedd, ferdig, virker, effekt, framdrift, steg, jobber, byggelag, kapasitet, kjøpDrivstoff, kjøpMateriale, lagerplass,
    harMat, manglerTekst, plasser, mastRekkevidde, lengde, finn, kroner, tilJSON, fraJSON, BRATT, snapp, planFinn, planLegg, planFlytt, planFjern, planKostnad, byggPlan, tilMal, fraMal, planMal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Leir = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
