/* Riksbrudd – OPPFØRSEL: hva folk gjør av seg selv (fase F4 i docs/plan-selskap-okonomi.md, kapittel 6.7 og 14.4). Regler uten DOM.
 * Node: require('./oppforsel'); nettleser: globalThis.Oppforsel. Visningen: spill/oppforsel-visning.js (lastes rett etter baering-visning.js).
 *
 *  - EGENSKAPER: lat, redd, ryddig og pratsom i tillegg til flittig, nattmenneske, modig og lærenem (spill/rekruttering.js har tallene for
 *    arbeidstempoet). Personer uten egenskaper (de som var med fra før) får 1–2 faste egenskaper etter id og navn (egenFor).
 *  - VENNER OG UVENNER: folk som er sammen (samme jobb i arbeidstida, samme samlingssted i fritida) blir venner over tid. Noen par har dårlig
 *    «kjemi» (fast per par) og blir uvenner i stedet. Venner sammen gir bedre moral og mindre lyst til å la seg lokke bort; uvenner på samme
 *    jobb gir dårligere moral og litt lavere tempo.
 *  - FRITID: med et samlingssted (bålplass, messe, kantine, kjøkken) går folk dit i fritida, og moralen stiger litt mer.
 *  - ALARM: vaktene går til stillingene, alle andre til det beste tilfluktsrommet (betongbunker først, så solide bygg og egenbygde rom) –
 *    barn og gamle først. Redde går allerede når angrepet er meldt.
 *  - SKADE: skadde går til sykestua; de som ikke kan gå selv (helse under bæres), bæres av en annen.
 *  - BRANN: brann i leiren gir en slukkejobb med høy prioritet (de nærmeste ledige), og folk som slukker, får brannen ned raskere.
 *  - RYDDING: varer som ligger ute når det er plass inne, bæres inn av ledige (de på «Fri» i arbeidstida).
 *  - ULYKKER (14.4): slitne folk (nattskift, uten seng, mørke uten lys, dårlig helse) kan skade seg på de farlige jobbene; verneutstyr senker
 *    sjansen. Mange ulykker senker moralen og gir færre søkere.
 * Alle tallene er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const klem = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const strHash = s => { let h = 7; for (const c of String(s || '')) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return h; };

  // ---------- REGLER (alle tallene er Claudes forslag, 28. nov) ----------
  const REGLER = {
    // egenskapene som kan deles ut (samme navn som i Rekruttering.EGENSKAPER); par som ikke passer sammen hos én person
    egenskaper: ['flittig', 'lat', 'modig', 'redd', 'nattmenneske', 'ryddig', 'pratsom', 'lærenem'],
    motsatt: [['flittig', 'lat'], ['modig', 'redd']],
    // de som var med fra før: alle får én egenskap, så mange får to
    toEgenskaper: .3,
    venner: {
      // så mye relasjonen (−1 til 1) endres per time sammen; pratsomme blir fortere kjent (og fortere uvenner)
      perTime: .015, uvennPerTime: .02, pratsom: 1.8,
      // så stor andel av parene har dårlig kjemi og blir uvenner
      uvennAndel: .12,
      // grensene: venn over, uvenn under
      venn: .6, uvenn: -.5,
      // høyst så mange i én gruppe regnes (de første etter id) – så 200 folk på én jobb ikke gir 20 000 par
      gruppeMaks: 24,
    },
    moral: {
      // moralpoeng når alle har en venn med seg (ganges med andelen), og minus når alle har en uvenn på samme jobb
      venn: 6, uvenn: 8,
      // samlingssted i fritida (leirvirkning.js gir alt bålplassen +3 og messa +4 – dette er at folk faktisk samles der)
      fritid: 2, pratsom: .5, pratsomMaks: 2,
      // ulykker de siste døgnene: minus per ulykke, høyst
      perUlykke: 3, ulykkeMaks: 12, ulykkeDøgn: 3,
    },
    // tempo for den som har en uvenn på samme jobb
    uvennTempo: .95,
    // lokking (rekruttering.js): sjansen ganges med dette når personen har venner i leiren (1 venn, 2 eller flere)
    lokk: [1, .5, .3],
    // samlingsstedene i fritida (det første som finnes, brukes)
    samling: ['bålplass', 'messe', 'kantine', 'feltkjøkken', 'kjøkken'],
    alarm: {
      // avstand fra leiren (m): angriperne nærmere enn nær = alle i tilflukt; redde går allerede når angrepet er meldt innen fjern
      nær: 1500, fjern: 8000,
      // de gamle (fra denne alderen) går først blant de voksne
      gammel: 60,
    },
    // tilfluktsrommene: rang (høyere = tryggere) og plasser. Brakker: sengeplassene; egenbygde rom: én per 2 m²
    tilflukt: {
      betongbunker: { rang: 3, plass: 20 }, ammobunker: { rang: 2, plass: 8 }, kommandosenter: { rang: 2, plass: 16 }, kontrollrom: { rang: 2, plass: 12 },
      sykestue: { rang: 2, plass: 10 }, feltsykehus: { rang: 2, plass: 16 }, verksted: { rang: 2, plass: 14 }, brakke: { rang: 1, plass: 0 },
      offisersbrakke: { rang: 1, plass: 6 }, messe: { rang: 1, plass: 16 }, kjøkken: { rang: 1, plass: 8 }, garasje: { rang: 1, plass: 8 },
      rom: { rang: 1, m2: 2 },
    },
    skade: {
      // et fall i helse så stort på én gang regnes som en skade (kamp, brann); frisk igjen (ikke lenger skadet) ved
      fall: .12, frisk: .9,
      // under dette kan personen ikke gå selv – en annen bærer hen
      bæres: .25,
    },
    slukk: {
      // brann innen så mange meter fra leirens midte gir slukkejobb; folk per brennende rute og høyst i alt
      r: 150, perRute: 3, maks: 8,
      // hver slukker som er framme, slokker ruta med denne sjansen per 10 spillminutter (høyst maks)
      perPerson: .2, maksSjanse: .85,
      // så langt fra midten av ruta de står (andel av halve rutebredden)
      kant: .8,
    },
    rydd: { maks: 2, perTur: 1, ryddig: 2 },
    ulykke: {
      // sjansen per skift (8 timer) på en farlig jobb: nesten null uthvilt, 1 % ved full tretthet (planen 14.4)
      skift: 480, uthvilt: .0005, sliten: .01,
      // tretthet 0–1: nattskift, uten seng, mørke uten lys, dårlig helse (andel av 1 − helse)
      natt: .45, utenSeng: .25, mørke: .3, helse: .4,
      // verneutstyr ganger sjansen med dette
      vern: .4,
      // skaden: helse ned så mye
      skade: .3,
      jobber: ['maskin', 'bygg', 'hogst', 'riving', 'verksted'],
    },
    // verneutstyr: pris per sett (hjelm, hansker, vernebriller, hørselvern); så mange sett i én pakke
    vern: { pris: 25000, pakke: 5 },
    // rekrutteringen: færre søkere per ulykke de siste døgnene (Rekruttering.forventet), høyst
    søkere: { perUlykke: .3, maks: 1.5, døgn: 7 },
  };

  // ---------- tilstand ----------
  function ny(frø = 1717) { return { versjon: 1, frø: frø >>> 0 || 1, rel: {}, ulykker: [], vern: 0, skadet: {}, meldt: {} }; }
  function fraJSON(o) {
    const S = ny(o && o.frø); if (!o || typeof o !== 'object') return S;
    if (o.rel && typeof o.rel === 'object') for (const [k, v] of Object.entries(o.rel)) if (/^\d+-\d+$/.test(k) && Number.isFinite(v)) S.rel[k] = klem(v, -1, 1);
    if (Array.isArray(o.ulykker)) S.ulykker = o.ulykker.filter(Number.isFinite).slice(-50);
    S.vern = Math.max(0, Math.floor(+o.vern || 0));
    if (o.skadet && typeof o.skadet === 'object') for (const [id, q] of Object.entries(o.skadet)) if (q && typeof q === 'object') S.skadet[id] = { fra: +q.fra || 0, grunn: String(q.grunn || 'skadet'), x: +q.x || 0, y: +q.y || 0 };
    if (o.meldt && typeof o.meldt === 'object') S.meldt = { ...o.meldt };
    return S;
  }
  const rng = S => () => { S.frø = (Math.imul(S.frø ^ (S.frø >>> 15), 2246822519) + 0x9e3779b9) >>> 0 || 1; return S.frø / 4294967296; };

  // ---------- egenskaper ----------
  // faste egenskaper for en person som ikke har noen liste (de som var med fra før): 1–2 etter id og navn
  function egenFor(p) {
    const L = REGLER.egenskaper, h = strHash(p.navn), r1 = hash(p.id, h), r2 = hash(p.id + 977, h), r3 = hash(p.id + 1931, h);
    const ut = [L[Math.floor(r1 * L.length)]];
    if (r2 < REGLER.toEgenskaper) { const e = L[Math.floor(r3 * L.length)]; if (!ut.includes(e) && !REGLER.motsatt.some(([a, b]) => (ut.includes(a) && e === b) || (ut.includes(b) && e === a))) ut.push(e); }
    return ut;
  }
  // gi egenskaper til dem som mangler lista. Gir antallet som fikk.
  function giEgenskaper(F) { let n = 0; if (!F) return 0; for (const p of F.personer) if (!Array.isArray(p.egen)) { p.egen = egenFor(p); n++; } return n; }
  const har = (p, e) => !!(p && Array.isArray(p.egen) && p.egen.includes(e));

  // ---------- venner og uvenner ----------
  const nøkkel = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const rel = (S, a, b) => S.rel[nøkkel(a, b)] || 0;
  // fast kjemi per par: under uvennAndel blir de uvenner
  const dårligKjemi = (a, b) => hash(Math.min(a, b) * 7919, Math.max(a, b)) < REGLER.venner.uvennAndel;
  // sted(p) -> nøkkel for hvor personen er nå (samme nøkkel = sammen), eller null (sover, borte, alene)
  // Gir hendelsene: [{ type: 'venn' | 'uvenn', a, b }] når et par går over grensen
  function vennSteg(S, F, sted, dtMin) {
    const V = REGLER.venner, ut = [], grupper = new Map(); if (!F || !(dtMin > 0)) return ut;
    for (const p of F.personer.slice().sort((a, b) => a.id - b.id)) { const k = sted(p); if (k == null) continue; if (!grupper.has(k)) grupper.set(k, []); const g = grupper.get(k); if (g.length < V.gruppeMaks) g.push(p); }
    const t = dtMin / 60;
    for (const g of grupper.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j], k = nøkkel(a.id, b.id), før = S.rel[k] || 0, f = (har(a, 'pratsom') || har(b, 'pratsom')) ? V.pratsom : 1;
      const ny = klem(før + (dårligKjemi(a.id, b.id) ? -V.uvennPerTime : V.perTime) * f * t, -1, 1); S.rel[k] = ny;
      if (før < V.venn && ny >= V.venn) ut.push({ type: 'venn', a, b }); if (før > V.uvenn && ny <= V.uvenn) ut.push({ type: 'uvenn', a, b });
    }
    return ut;
  }
  // vennene og uvennene til en person (id-er), blant dem som er i folket
  function venner(S, F, id) { const ut = []; for (const q of F.personer) if (q.id !== id && rel(S, id, q.id) >= REGLER.venner.venn) ut.push(q.id); return ut; }
  function uvenner(S, F, id) { const ut = []; for (const q of F.personer) if (q.id !== id && rel(S, id, q.id) <= REGLER.venner.uvenn) ut.push(q.id); return ut; }
  // moralen fra venner, uvenner, fritid og ulykker. sted(p) som over; o: { samling (navn eller null), tid }
  // Gir { sum, venn, uvenn, fritid, ulykker } (poeng på moralmålet i folk.js)
  function moral(S, F, sted, o = {}) {
    const M = REGLER.moral, n = F && F.personer.length; if (!n) return { sum: 0, venn: 0, uvenn: 0, fritid: 0, ulykker: 0 };
    let mv = 0, mu = 0; const her = new Map(); for (const p of F.personer) { const k = sted(p); if (k != null) { if (!her.has(k)) her.set(k, []); her.get(k).push(p.id); } }
    for (const ids of her.values()) for (const a of ids) { let v = false, u = false; for (const b of ids) { if (a === b) continue; const r = rel(S, a, b); if (r >= REGLER.venner.venn) v = true; else if (r <= REGLER.venner.uvenn) u = true; } if (v) mv++; if (u) mu++; }
    const venn = M.venn * mv / n, uvenn = -M.uvenn * mu / n;
    const fritid = o.samling ? M.fritid + Math.min(M.pratsomMaks, M.pratsom * F.personer.filter(p => har(p, 'pratsom')).length) : 0;
    const u = ulykkerSiden(S, o.tid, M.ulykkeDøgn), ulykker = -Math.min(M.ulykkeMaks, M.perUlykke * u);
    return { sum: venn + uvenn + fritid + ulykker, venn, uvenn, fritid, ulykker };
  }
  // lokkingen: faktor på sjansen for at en person lar seg lokke (venner holder på folk)
  function lokkF(S, F, p) { const n = venner(S, F, p.id).length; return REGLER.lokk[Math.min(REGLER.lokk.length - 1, n)]; }
  // tempoet for en person med en uvenn på samme jobb
  function uvennTempo(S, F, p) { if (!p || p.oppgave === 'fri') return 1; for (const q of F.personer) if (q.id !== p.id && q.oppgave === p.oppgave && rel(S, p.id, q.id) <= REGLER.venner.uvenn) return REGLER.uvennTempo; return 1; }

  // ---------- tilfluktsrom ----------
  // stedene: [{ k, x, y, navn, rang, plass, bygg, type, rom }] av leirens ferdige bygg (inngang(b) gir døra) og de egenbygde rommene
  function tilfluktssteder(L, o = {}) {
    const T = REGLER.tilflukt, ut = [];
    for (const b of (L && L.bygg) || []) { const D = T[b.type]; if (!D || (o.ferdig && !o.ferdig(b))) continue;
      const plass = b.type === 'brakke' ? (o.plasser ? o.plasser(b) : 8) : D.plass; if (!(plass > 0)) continue; const q = o.inngang ? o.inngang(b) : { x: b.x, y: b.y };
      ut.push({ k: 'id:' + b.id, kart: 'id:' + b.id, x: q.x, y: q.y, navn: o.navn ? o.navn(b) : b.type, rang: D.rang, plass, bygg: b.id, type: b.type }); }
    for (const r of o.rom || []) { const plass = Math.floor((r.areal || 0) / T.rom.m2); if (plass > 0 && r.punkt) ut.push({ k: 'rom:' + r.nøkkel, kart: 'rom:' + r.nøkkel, ...r.punkt, navn: 'det egenbygde huset', rang: T.rom.rang, plass, rom: r.nøkkel }); }
    return ut;
  }
  // Fordel folket på tilfluktsstedene. ctx: { F, steder, avh (antall barn og gamle), alarm: 'nær' | 'fjern', plass(p) -> { x, y }, leir }
  // Barn og gamle (avh) får plass først i det tryggeste stedet, så de gamle voksne, så de redde, så resten. Vaktene går til stillingene (ikke her).
  // Ved alarm 'fjern' går bare de redde. Gir { mål: Map(id -> sted), avh: { n, sted }, trangt: antall uten plass, vakter: [id] }
  function tilflukt(ctx) {
    const steder = (ctx.steder || []).map(s => ({ ...s, ledig: s.plass })).sort((a, b) => b.rang - a.rang || a.plass - b.plass), ut = { mål: new Map(), avh: { n: 0, sted: null }, trangt: 0, vakter: [] };
    const F = ctx.F; if (!F) return ut;
    const avh = Math.max(0, ctx.avh || 0);
    if (avh && ctx.alarm === 'nær') { const s = steder.find(q => q.ledig > 0) || steder[0]; if (s) { s.ledig -= Math.min(avh, s.ledig); ut.avh = { n: avh, sted: s.navn }; } else ut.avh = { n: avh, sted: null }; }
    const pri = p => ((p.alder || 30) >= REGLER.alarm.gammel ? 0 : har(p, 'redd') ? 1 : 2);
    const kø = F.personer.filter(p => !p.borte).filter(p => { if (p.oppgave === 'vakt' && !har(p, 'redd')) { ut.vakter.push(p.id); return false; } return ctx.alarm === 'nær' || har(p, 'redd'); })
      .sort((a, b) => pri(a) - pri(b) || a.id - b.id);
    for (const p of kø) {
      const q = ctx.plass ? ctx.plass(p) : null, d = s => (q ? Math.hypot(s.x - q.x, s.y - q.y) : 0);
      // det tryggeste stedet med plass (blant like trygge: det nærmeste)
      let best = null; for (const s of steder) { if (s.ledig <= 0) continue; if (!best || s.rang > best.rang || (s.rang === best.rang && d(s) < d(best))) best = s; }
      if (best) { best.ledig--; ut.mål.set(p.id, best); continue; }
      // fullt: det nærmeste solide bygget likevel (trangt), ellers bak leirens bygg (midten)
      ut.trangt++; let n = null; for (const s of steder) if (!n || d(s) < d(n)) n = s;
      ut.mål.set(p.id, n || (ctx.leir ? { k: 'dekning', x: ctx.leir.x, y: ctx.leir.y, navn: 'dekning ved leirens midte', rang: 0 } : null));
    }
    return ut;
  }

  // ---------- skade og bæring ----------
  const trengerBærer = p => p.helse < REGLER.skade.bæres;
  // velg en bærer: den nærmeste som kan arbeide, ikke er vakt og ikke er opptatt. plass(p) -> { x, y }
  function velgBærer(F, skadet, plass, opptatt = new Set(), arbeidsfør = p => p.helse >= .4) {
    const q0 = plass(skadet); let best = null, bd = Infinity; if (!q0) return null;
    for (const p of F.personer) { if (p.id === skadet.id || opptatt.has(p.id) || p.borte || p.skole || p.oppgave === 'vakt' || !arbeidsfør(p)) continue; const q = plass(p); if (!q) continue; const d = Math.hypot(q.x - q0.x, q.y - q0.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  // ---------- brann ----------
  // slukkejobbene: de brennende rutene (window.BRANNER: { x, y, r }) innen REGLER.slukk.r m fra leiren, nærmest først.
  // bygg(x, y, r) -> navnet på et av leirens bygg i ruta, eller null. Gir [{ k, x, y, r, navn, plasser }]
  function slukkJobber(branner, leir, bygg) {
    const R = REGLER.slukk; if (!leir || !branner) return [];
    return branner.filter(c => Math.hypot(c.x - leir.x, c.y - leir.y) < R.r).sort((a, b) => Math.hypot(a.x - leir.x, a.y - leir.y) - Math.hypot(b.x - leir.x, b.y - leir.y))
      .map(c => ({ k: Math.round(c.x) + ',' + Math.round(c.y), x: c.x, y: c.y, r: c.r || 32, navn: (bygg && bygg(c.x, c.y, c.r || 32)) || null, plasser: R.perRute }));
  }
  // velg slukkerne: de nærmeste som kan arbeide (ikke vakt, ikke skadet, ikke opptatt), høyst perRute per rute og maks i alt.
  // før: forrige fordeling (Map id -> jobb) – de som alt slukker, beholder jobben (ellers bytter folk hele tida mens de går). Gir Map(id -> jobb)
  function velgSlukkere(F, jobber, plass, opptatt = new Set(), arbeidsfør = p => p.helse >= .4, før = null) {
    const R = REGLER.slukk, ut = new Map(); let n = 0;
    if (før) for (const [id, j0] of før) { const j = jobber.find(q => q.k === j0.k), p = F.personer.find(q => q.id === id);
      if (!j || !p || opptatt.has(id) || p.borte || p.skole || !arbeidsfør(p) || n >= R.maks || [...ut.values()].filter(q => q.k === j.k).length >= j.plasser) continue; ut.set(id, j); n++; }
    for (const j of jobber) { if (n >= R.maks) break;
      const kand = F.personer.filter(p => !opptatt.has(p.id) && !ut.has(p.id) && !p.borte && !p.skole && p.oppgave !== 'vakt' && arbeidsfør(p) && plass(p))
        .map(p => ({ p, d: Math.hypot(plass(p).x - j.x, plass(p).y - j.y) })).sort((a, b) => a.d - b.d);
      const har = [...ut.values()].filter(q => q.k === j.k).length;
      for (const { p } of kand.slice(0, Math.max(0, Math.min(j.plasser - har, R.maks - n)))) { ut.set(p.id, j); n++; } }
    return ut;
  }
  // hvor slukkeren står: på kanten av ruta, fast vinkel per person
  function slukkPunkt(j, id) { const a = hash(id, 31) * 6.283, r = (j.r || 32) * REGLER.slukk.kant; return { x: j.x + Math.cos(a) * r, y: j.y + Math.sin(a) * r }; }
  // sjansen for at ruta slokner i løpet av dtMin når n slukkere er framme
  const slukkSjanse = (n, dtMin) => (n > 0 ? 1 - Math.pow(1 - Math.min(REGLER.slukk.maksSjanse, REGLER.slukk.perPerson * n), dtMin / 10) : 0);

  // ---------- ulykker ----------
  // tretthet 0–1. c: { natt (går nattskift / arbeider om natta), seng (har seng), mørke (natt uten lys), helse }
  function tretthet(c) { const U = REGLER.ulykke; return klem((c.natt ? U.natt : 0) + (c.seng === false ? U.utenSeng : 0) + (c.mørke ? U.mørke : 0) + U.helse * (1 - klem(c.helse == null ? 1 : c.helse))); }
  // sjansen per skift: nesten null uthvilt, sliten ved full tretthet (vokser med kvadratet), lavere med verneutstyr
  function ulykkeSjanse(t, vern) { const U = REGLER.ulykke; return (U.uthvilt + (U.sliten - U.uthvilt) * klem(t) * klem(t)) * (vern ? U.vern : 1); }
  // sjansen i løpet av dtMin spillminutter
  const ulykkeIDt = (s, dtMin) => 1 - Math.pow(1 - s, dtMin / REGLER.ulykke.skift);
  const farlig = o => REGLER.ulykke.jobber.includes(o);
  // de som har verneutstyr: de første (etter id) på de farlige jobbene, så langt settene rekker
  function medVern(S, F) { const ut = new Set(); let n = S.vern; for (const p of F.personer.filter(q => farlig(q.oppgave)).sort((a, b) => a.id - b.id)) { if (n <= 0) break; ut.add(p.id); n--; } return ut; }
  // Ett steg for ulykkene. ctx: { F, tid, dt (spillminutter), arbeider(p) (er i arbeid på arbeidsplassen nå), tretthet(p) -> 0–1, r (tilfeldig) }
  // Gir de skadde: [{ p, jobb, t }]
  function ulykkeSteg(S, ctx) {
    const ut = [], F = ctx.F, r = ctx.r || rng(S), V = medVern(S, F); if (!F || !(ctx.dt > 0)) return ut;
    for (const p of F.personer) { if (!farlig(p.oppgave) || p.helse < .4 || (ctx.arbeider && !ctx.arbeider(p))) continue;
      const t = ctx.tretthet ? ctx.tretthet(p) : 0, s = ulykkeIDt(ulykkeSjanse(t, V.has(p.id)), ctx.dt);
      if (r() < s) { p.helse = Math.max(.05, p.helse - REGLER.ulykke.skade); S.ulykker.push(Math.round(ctx.tid || 0)); if (S.ulykker.length > 50) S.ulykker.shift(); ut.push({ p, jobb: p.oppgave, t }); } }
    return ut;
  }
  function ulykkerSiden(S, tid, døgn) { if (!Number.isFinite(tid)) return 0; const fra = tid - døgn * 1440; return S.ulykker.filter(t => t > fra && t <= tid).length; }
  // rekrutteringen: så mange færre søkere i snitt (Rekruttering.forventet)
  function søkerMinus(S, tid) { const R = REGLER.søkere; return Math.min(R.maks, R.perUlykke * ulykkerSiden(S, tid, R.døgn)); }

  // ---------- kommandoene ----------
  // kjøpVern { antall pakker }: M = { tilstand(side) -> S, betal(kr) -> true/false, endret() }
  function registrerKommandoer(K, M) {
    const side = c => (c && c.side) || 'blå';
    K.registrer('kjøpVern', { leir: true,
      sjekk: (k, c) => (!M.tilstand(side(c)) ? 'Leiren er ikke klar.' : !(Number.isInteger(k.antall) && k.antall >= 1 && k.antall <= 20) ? 'Antallet må være 1–20 pakker.' : null),
      utfør: (k, c) => { const S = M.tilstand(side(c)), sett = k.antall * REGLER.vern.pakke, pris = sett * REGLER.vern.pris; if (!M.betal(pris)) return { feil: 'Ikke nok penger.' };
        S.vern += sett; if (M.endret) M.endret(); return { sett, pris, vern: S.vern }; },
      beskriv: k => `kjøper ${k.antall * REGLER.vern.pakke} sett verneutstyr` });
    return K;
  }

  const api = { REGLER, ny, fraJSON, rng, hash, egenFor, giEgenskaper, har, nøkkel, rel, dårligKjemi, vennSteg, venner, uvenner, moral, lokkF, uvennTempo,
    tilfluktssteder, tilflukt, trengerBærer, velgBærer, slukkJobber, velgSlukkere, slukkPunkt, slukkSjanse, tretthet, ulykkeSjanse, ulykkeIDt, farlig, medVern, ulykkeSteg,
    ulykkerSiden, søkerMinus, registrerKommandoer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Oppforsel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
