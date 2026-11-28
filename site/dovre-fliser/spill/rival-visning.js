'use strict';
/* Riksbrudd – RIVALENE GJØR DET SAMME i spillet (fase Ø8, 28. nov; docs/plan-selskap-okonomi.md kapittel 15 punkt 4). Reglene: spill/rival.js.
 * window.RivalSpill. Lagres per leir i localStorage «riksbrudd-rival». Ravnsund (rød) og Mosevakt (grønn) bruker de samme systemene som
 * spilleren, i en enkel, regnet form uten egne figurer:
 *  - ØKONOMIEN: kassa er eskaleringens (EskaleringSpill.S().øk[side].kr). Hver spilltime: lønn til lagene, betaling fra byavtalene, det
 *    de tjente på kontrakter (selskap.js teller det i sider[side].sum.tjent), sagbruket og felles anlegg. AI.rådTak(side, tak) gir taket
 *    for lag etter hva de har råd til (fraksjoner-visning.js og eskalering-visning.js spør), og et lag går fra en rival som ikke betaler lønn.
 *  - BYAVTALENE (byavtale.js): en rival som har levert en kontrakt for en by, blir kunde der; med beskyttelse/handel må den holde løftet
 *    (mann innen 3 km, telt time for time) – ellers sier byen opp og forteller deg det. AI.styrere: et ledig lag går og vokter byen.
 *  - FIRMAENE (firma.js): en rival kan bli fast kunde (tar tilbudene fra det firmaet), kjøpe halve anlegget, og – når børsen finnes – andeler
 *    (BorsSpill.rivalKjøp(side, kr) hvis den finnes, ellers RIVAL_KROKER). Vises i fanen Partnere.
 *  - VEIEN TIL SEIER (seier.js): rivalen velger makt, penger eller gjenoppbygging etter fremdriften (Rival.velgVei), og prioriterer etter
 *    den. Krigskartet viser den (KRIG_TILLEGG.side: «Ravnsund satser på penger»).
 *  - SABOTASJE: sjelden, mer når rivalen ligger bak: en maskin eller et lager i leiren din. Har dere en pakt, er den brutt av dem.
 * I testene (navigator.webdriver) skjer ingenting av seg selv før RivalSpill.test = true. Tekstene og tallene er Claudes forslag.
 */
(function () {
  const RV = window.Rival, F = window.Fraksjoner; if (!RV || !F || !window.AI || typeof KROKER === 'undefined') return;
  const R = RV.REGLER, SIDER = ['rød', 'grønn'], NØKKEL = 'riksbrudd-rival';
  const api = { test: false };
  window.RivalSpill = api;
  // RIVAL_KROKER: [(side, { kasse, vei, betal(kr) }, api) => …] hver morgen – for børsen (Ø7) når den ikke har BorsSpill.rivalKjøp
  window.RIVAL_KROKER = window.RIVAL_KROKER || [];
  const tilfV = () => ((typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random)();
  const på = () => !navigator.webdriver || api.test === true;
  const auto = () => på() && AI.på !== false;
  const nå = () => (typeof tid === 'number' && Number.isFinite(tid) ? tid : 0);
  const navn = side => (F.FRAKSJONER[side] ? F.FRAKSJONER[side].navn : side);
  const kr = v => (window.Leir && Leir.kroner ? Leir.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const leir = () => { const s = window.OppstartSpill && OppstartSpill.tilstand(); return s && s.leir ? s.leir : null; };
  const leirId = () => { const L = leir(); return L ? Math.round(L.x) + ',' + Math.round(L.y) : ''; };
  const nySide = () => ({ vei: null, veiFra: 0, sag: null, sistSab: -1e9, sab: 0, tjent: null, inn: { by: 0, kontrakt: 0, sag: 0, anlegg: 0 }, lønn: 0, gått: 0, rep: 0, kontrakter: 0 });
  const ny = () => ({ v: 1, sider: { rød: nySide(), grønn: nySide() } });
  let S = ny();
  const Ø = side => { try { const E = window.EskaleringSpill && EskaleringSpill.S(); return E && E.øk ? E.øk[side] : null; } catch (e) { return null; } };
  const maksKr = () => (window.Eskalering ? Eskalering.REGLER.økonomi.maksKr : 30e6);
  const leggTil = (side, beløp, hva) => { const ø = Ø(side); if (!ø || !(Math.abs(beløp) > 0)) return; ø.kr = Math.min(maksKr(), ø.kr + beløp); if (hva) S.sider[side].inn[hva] = (S.sider[side].inn[hva] || 0) + beløp; };
  const hend = (type, tekst) => { if (navigator.webdriver) return; try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type, tekst } })); } catch (e) { /* eldre nettlesere */ } };
  const melding = t => { if (window.SpilletSpill && SpilletSpill.varsel) SpilletSpill.varsel(t); else logg(t); };

  // ---------- det rivalen har ----------
  const lagFor = side => (typeof ENHETER !== 'undefined' ? ENHETER.filter(e => e.ai && e.side === side && levende(e) && Array.isArray(e.menn)) : []);
  const friske = s => s.menn.reduce((a, m) => a + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0);
  const alleByer = () => ((typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || []);
  const eierAv = id => { try { return Garnison.tilstand(TETTSTEDER, id).eier || null; } catch (e) { return null; } };
  const midt = by => { const p = AI.inne ? AI.inne(by) : [(by.bb[0] + by.bb[2]) / 2, (by.bb[1] + by.bb[3]) / 2]; return { x: p[0], y: p[1] }; };
  const holder = side => alleByer().filter(b => b.e && eierAv(b.e.id) === side);
  const BA = () => (window.ByavtaleSpill && ByavtaleSpill.tilstand ? ByavtaleSpill.tilstand() : null);
  // byene i byavtalen der rivalen har noe: [{ id, b (byavtalens tilstand), by (område-raden med x, y, navn, folk) }]
  function avtaleByer(side) {
    const T = BA(); if (!T || !T.byer || !window.ByavtaleSpill) return [];
    const omr = ByavtaleSpill.område ? ByavtaleSpill.område() : [], m = new Map(omr.map(o => [String(o.id), o])), ut = [];
    for (const [id, b] of Object.entries(T.byer)) if (b && b.rival && b.rival.side === side) { const by = m.get(String(id)); if (by) ut.push({ id, b, by }); }
    return ut; }
  const mannNær = (side, p, r) => lagFor(side).reduce((a, s) => a + (Math.hypot(s.x - p.x, s.y - p.y) <= r ? friske(s) : 0), 0);
  // inntekten per døgn før lønn: tettstedene (eskaleringen), byavtalene, saga
  function inntekt(side) {
    const folk = holder(side).reduce((a, b) => a + (b.e.folk || 0), 0), g = window.Eskalering ? Eskalering.grad(window.SPILLREGLER) : null;
    const t = window.Eskalering ? Eskalering.inntekt(folk, g).kr : 0, by = avtaleByer(side).reduce((a, q) => a + (q.b.rival.trinn === 'kunde' ? 0 : +q.b.rival.pris || 0), 0);
    return t + by + (S.sider[side].sag ? RV.sagOverskudd(S.sider[side].sag, 24) : 0); }

  // ---------- 1. RÅD TIL LAG ----------
  // taket for lag etter hva rivalen har råd til. grunn = taket reglene ellers gir. Uten kassa (eller i testene) som før.
  function tak(side, grunn) {
    if (!på()) return grunn; const ø = Ø(side); if (!ø) return grunn;
    const L = lagFor(side), snitt = L.length ? L.reduce((a, s) => a + s.menn.length, 0) / L.length : R.mannPerLag;
    return RV.rådTak(grunn, { kasse: ø.kr, inntekt: inntekt(side), lønnLag: snitt * R.lønn }); }
  AI.rådTak = tak;

  // ---------- 2. BYAVTALENE: kunde, løfter, oppsigelse ----------
  // byavtale-visning.js spør Byavtale.rivalMål uten tida: her får den tida, så en by som har sagt opp en rival, ikke frir til den igjen straks
  if (window.Byavtale && !Byavtale.rivalMål.medTid) { const før = Byavtale.rivalMål; Byavtale.rivalMål = (S0, byer, side, t) => før(S0, byer, side, Number.isFinite(t) ? t : nå()); Byavtale.rivalMål.medTid = true; }
  const lagreBA = () => { try { if (window.ByavtaleSpill && ByavtaleSpill.lagre) ByavtaleSpill.lagre(); } catch (e) { /* */ } };
  function byTime(side) {
    const RB = window.Byavtale; if (!RB) return 0; let inn = 0;
    for (const q of avtaleByer(side)) { const r = q.b.rival; if (r.trinn !== 'beskyttelse' && r.trinn !== 'handel') continue;
      RB.rivalTime(q.b, mannNær(side, q.by, RB.REGLER.radius)); inn += (+r.pris || 0) / 24; }
    return inn; }
  function byDøgn(side) {
    const RB = window.Byavtale; if (!RB) return []; const ut = [];
    for (const q of avtaleByer(side)) { const res = RB.rivalDøgn(q.b, nå()); if (!res) continue; ut.push({ by: q.by.navn, ...res });
      if (res.sierOpp) { melding(`${q.by.navn} har sagt opp avtalen med ${navn(side)} (${res.grunn}). Byrådet sier fra til dere – nå kan dere forhandle selv (Selskapet → Byer).`); hend('by', `${q.by.navn} sa opp ${navn(side)}`); } }
    if (ut.length) lagreBA(); return ut; }

  // ---------- 3. KONTRAKTER OG FIRMAER ----------
  const SK = () => (window.SelskapSpill && SelskapSpill.tilstand ? SelskapSpill.tilstand() : null);
  const FT = () => (window.FirmaSpill && FirmaSpill.tilstand ? FirmaSpill.tilstand() : null);
  const lagreF = () => { try { if (window.FirmaSpill && FirmaSpill.lagre) FirmaSpill.lagre(); } catch (e) { /* */ } };
  const lagreS = () => { try { if (window.SelskapSpill && SelskapSpill.lagre) SelskapSpill.lagre(); } catch (e) { /* */ } };
  const SETT = new Map();   // tilbud-id -> tilbudet (det samme objektet), så vi ser når en rival tok det
  // en rival tar et åpent tilbud (som selskap.js gjør det: rykte og betaling i regnskapet deres)
  function tarTilbud(side, k, grunn) {
    const T = SK(); if (!T || !window.Selskap || !k || k.første || k.fast || !T.tilbud.includes(k)) return false;
    T.tilbud = T.tilbud.filter(q => q !== k); k.status = 'tatt'; k.side = side; Selskap.endreRykte(T, side, { pålitelig: 2 });
    const sd = Selskap.side(T, side); sd.sum.levert++; sd.sum.tjent += +k.betaling || 0;
    if (grunn) logg(`${navn(side)} tok tilbudet «${k.tittel || 'et oppdrag'}»${grunn}.`);
    lagreS(); skitten = true; return true; }
  // det rivalene har tjent på kontrakter siden sist (selskap.js teller det), og hva de har levert for byer og firmaer
  function kontrakter() {
    const T = SK(); if (!T || !T.sider) return;
    for (const side of SIDER) { const sd = T.sider[side]; if (!sd || !sd.sum) continue; const t = +sd.sum.tjent || 0, s = S.sider[side];
      if (s.tjent === null || t < s.tjent) s.tjent = t; else if (t > s.tjent) { leggTil(side, t - s.tjent, 'kontrakt'); s.kontrakter++; s.tjent = t; } }
    for (const k of T.tilbud || []) if (k && k.id) SETT.set(k.id, k);
    for (const [id, k] of SETT) { if ((T.tilbud || []).includes(k)) continue; SETT.delete(id);
      if (k.status !== 'tatt' || !SIDER.includes(k.side) || !k.giver) continue; levertAv(k.side, k); } }
  function levertAv(side, k) {
    const g = k.giver;
    if (g.slag === 'firma' && window.Firma) { const Fs = FT(), f = Fs && Firma.finn(Fs, g.navn);
      if (f && Firma.rivalLevert(f, side, { nå: nå(), kundeEtter: R.firma.kundeEtter, kundeDøgn: R.firma.kundeDøgn }) === 'kunde') {
        melding(`${navn(side)} er blitt fast kunde hos ${f.navn} – de tar tilbudene derfra i ${R.firma.kundeDøgn} døgn. Lever mer for ${f.navn} enn dem.`); }
      if (f) lagreF(); return; }
    if (g.by !== null && g.by !== undefined && window.Byavtale) { const T = BA(); if (!T) return; const b = Byavtale.by(T, String(g.by));
      if (Byavtale.rivalKunde(b, side, nå())) { const o = (ByavtaleSpill.område ? ByavtaleSpill.område() : []).find(q => String(q.id) === String(g.by)); if (o) logg(`${navn(side)} har levert en kontrakt for ${o.navn} og er kunde der.`); }
      lagreBA(); } }
  // hver time: fast kunde tar tilbudene fra firmaet sitt; på veien «penger» tar rivalen også andre åpne tilbud oftere
  function tarTime(side) {
    const T = SK(); if (!T || !T.tilbud || !T.tilbud.length) return; const Fs = FT(), vei = S.sider[side].vei || 'makt';
    for (const k of T.tilbud.slice()) { if (k.første || k.fast || !k.giver) continue;
      const f = k.giver.slag === 'firma' && Fs && window.Firma ? Firma.finn(Fs, k.giver.navn) : null;
      if (f && Firma.rivalKunde(f, nå()) === side && tilfV() < R.firma.tarFast / 24) { tarTilbud(side, k, ` fra ${f.navn} (de er fast kunde der)`); continue; }
      if (tilfV() < (R.kontrakt.ekstra[vei] || 0) / 24 / Math.max(1, T.tilbud.length)) tarTilbud(side, k, ''); } }
  // hver morgen: felles anlegg (overskudd og kjøp) og andeler (børsen)
  function firmaDøgn(side) {
    const Fs = FT(); if (!Fs || !window.Firma) return; const ø = Ø(side); if (!ø) return; const vei = S.sider[side].vei || 'makt'; let endret = false;
    for (const f of Firma.aktive(Fs)) if (f.rival && f.rival.anlegg && f.rival.anlegg.side === side) leggTil(side, Firma.rivalAnleggDøgn(f), 'anlegg');
    const lyst = vei === 'penger' ? R.firma.anleggSjanse : vei === 'gjenoppbygging' ? R.firma.anleggSjanse / 2 : 0;
    if (lyst > 0 && tilfV() < lyst) {
      // kappløpet om Storlia: tømmerfirmaet først, så de andre med anlegg
      const kand = Firma.aktive(Fs).filter(f => Firma.rivalKanAnlegg(f)).sort((a, b) => (b.bransje === 'tømmer') - (a.bransje === 'tømmer') || b.helse - a.helse);
      for (const f of kand) { const V = Firma.vilkår(f, 'felles'); if (!V || ø.kr < V.pris + R.firma.anleggReserve) continue;
        const pris = Firma.rivalAnlegg(f, side, nå()); if (pris > 0) { ø.kr -= pris; endret = true;
          melding(`${navn(side)} har kjøpt seg inn i ${f.navn}: de eier halve ${Firma.anleggBestemt(f)}. Dere kan ikke eie det sammen med ${f.navn} nå.`); }
        break; } }
    // andeler: børsen (Ø7) – BorsSpill.rivalKjøp(side, kr) gir det som ble brukt; ellers krokene
    if (vei === 'penger' && ø.kr >= R.firma.andelKr + R.firma.anleggReserve && tilfV() < R.firma.andelSjanse) {
      if (window.BorsSpill && typeof BorsSpill.rivalKjøp === 'function') { let brukt = 0; try { brukt = +BorsSpill.rivalKjøp(side, R.firma.andelKr) || 0; } catch (e) { brukt = 0; } if (brukt > 0) ø.kr -= Math.min(brukt, ø.kr); }
      else for (const k of window.RIVAL_KROKER) { try { k(side, { kasse: ø.kr, vei, betal: b => { const v = Math.max(0, Math.min(ø.kr, +b || 0)); ø.kr -= v; return v; } }, api); } catch (e) { console.error(e); } } }
    if (endret) lagreF(); }

  // ---------- 1b. SAGBRUKET, LØNN OG LAG SOM GÅR ----------
  function sagTime(side, timer) {
    const s = S.sider[side]; if (!s.sag) return 0;
    if (eierAv(s.sag.by) !== side) { if (s.sag.navn) logg(`Etterretning: ${navn(side)} har mistet sagbruket i ${s.sag.navn}.`); s.sag = null; return 0; }
    const v = RV.sagOverskudd(s.sag, timer); s.sag.hp = Math.max(0, s.sag.hp - R.sag.slitasje * timer);
    // slitt: de reparerer (Claudes tall: 300 000 kr) – som en maskin i leiren
    if (s.sag.hp < .5) { const ø = Ø(side); if (ø && ø.kr > 3e5) { ø.kr -= 3e5; s.sag.hp = 1; } }
    return v; }
  function sagKjøp(side) {
    const s = S.sider[side], ø = Ø(side); if (!ø) return; const egne = holder(side).sort((a, b) => (b.e.folk || 0) - (a.e.folk || 0));
    if (!RV.vilKjøpeSag({ kasse: ø.kr, døgn: nå() / 1440, vei: s.vei || 'makt', harSag: !!s.sag, byer: egne.length })) return;
    const by = egne[0], p = midt(by); ø.kr -= R.sag.pris; s.sag = { by: by.e.id, navn: by.e.navn, x: p.x, y: p.y, hp: 1, fra: Math.round(nå()) };
    logg(`Etterretning: ${navn(side)} har bygget et sagbruk i ${by.e.navn}. Tar dere tettstedet, er saga deres tapt.`); }
  function lønn(side, min) {
    const ø = Ø(side); if (!ø) return; const L = lagFor(side), r = RV.lønnSteg(ø, RV.lønnDøgn(L), min); S.sider[side].lønn += r.betalt;
    const grunn = F.lagTak(holder(side).length, Math.floor(nå() / 1440)), t = tak(side, window.Eskalering ? Eskalering.tak(grunn, Math.max(0, nå() / 1440 - F.fredDøgn(1)), Eskalering.grad(window.SPILLREGLER), holder(side).length) : grunn);
    if (!RV.deserter(ø, L.length, t)) return;
    // det svakeste laget som ikke er om bord, går
    const s = L.filter(e => !e.ombord).sort((a, b) => friske(a) - friske(b))[0]; if (!s) return;
    ENHETER.splice(ENHETER.indexOf(s), 1); ø.ubetalt = 0; S.sider[side].gått++; if (typeof valgt !== 'undefined' && valgt === s && window.lukkPanel) lukkPanel();
    logg(`Etterretning: ${navn(side)} klarer ikke å betale lønn – ${s.navn} har gått fra dem.`); skitten = true; }

  // ---------- 4. VEIEN TIL SEIER ----------
  function velgVei(side) {
    const s = S.sider[side]; let A = null; try { const B = window.SeierSpill && SeierSpill.bilde ? SeierSpill.bilde() : null; A = B && B.A ? B.A[side] : null; } catch (e) { A = null; }
    const fr = v => (A && A[v] ? +A[v].fremdrift || 0 : 0);
    const før = s.vei, vei = RV.velgVei({ side, makt: fr('makt'), penger: fr('penger'), gjenoppbygging: fr('gjenoppbygging'), nå: før });
    if (vei !== før) { s.vei = vei; s.veiFra = Math.round(nå()); if (før) logg(`Etterretning: ${RV.veiTekst(navn(side), vei)} nå – ${RV.PRIORITET[vei].tekst}.`); }
    return vei; }
  // AI-en etter veien: vokte avtalebyene (alle veier, flere mann på «penger»), og «gjenoppbygging» går ikke løs på leiren din men holder
  // det de har. Spørres av fraksjoner-visning.js (AI.styrere) når eskaleringen ikke styrer laget.
  const VAKT = new Map();   // by-id -> { lag (navn), til }
  function styr(s, v) {
    if (!på() || !s.ai || !SIDER.includes(s.side) || F.slåttUt(s) || s.ombord) return null;
    if (['angrip', 'trekk', 'forsyn', 'støtt'].includes(v.hva) || /^garnison/.test(v.tekst || '')) return null;
    const side = s.side, vei = S.sider[side].vei || 'makt', P = RV.PRIORITET[vei] || RV.PRIORITET.makt, t = nå(), RB = window.Byavtale;
    if (RB) for (const q of avtaleByer(side)) { const r = q.b.rival; if (r.trinn !== 'beskyttelse' && r.trinn !== 'handel') continue;
      const id = String(q.id), V = VAKT.get(id), lag = V ? ENHETER.find(e => e.navn === V.lag && e.side === side && levende(e)) : null;
      if (V && V.lag === s.navn) { if (t > V.til) { VAKT.delete(id); continue; }
        const d = Math.hypot(s.x - q.by.x, s.y - q.by.y);
        return d > 1200 ? { hva: 'samle', x: q.by.x, y: q.by.y, tekst: `går til ${q.by.navn} for å holde løftet til byen` } : { hva: 'hold', x: s.x, y: s.y, tekst: `vokter ${q.by.navn} (avtale)` }; }
      if (lag && t <= V.til) continue;
      const behov = RB.REGLER.rivalLøfte.mann * P.vokt; if (mannNær(side, q.by, RB.REGLER.radius) >= behov) continue;
      if (Math.hypot(s.x - q.by.x, s.y - q.by.y) > 25000) continue;
      VAKT.set(id, { lag: s.navn, til: t + 6 * 60 }); return { hva: 'samle', x: q.by.x, y: q.by.y, tekst: `går til ${q.by.navn} for å holde løftet til byen` }; }
    if (P.leir === false && v.hva === 'leir') return { hva: 'hold', x: s.x, y: s.y, tekst: 'holder det de har' };
    return null; }
  AI.styrere.push(styr);
  // GJENOPPBYGGING: én sprengt ting nær egne tettsteder repareres per døgn (odeleggelse.js: hel = ingen oppføring i INFRA_TILSTAND)
  function reparer(side) {
    const T = window.INFRA_TILSTAND, ø = Ø(side); if (!T || !T.size || !ø || ø.kr < R.reparer.kr || typeof INFRA === 'undefined' || !INFRA) return null;
    const egne = holder(side).map(midt); if (!egne.length) return null;
    for (const [k, v] of T) { if (!v || v.tilstand !== 'sprengt') continue; const [lag, id] = k.split(':'), o = (INFRA[lag] || []).find(q => q && q.e && String(q.e.id) === id);
      if (!o || !o.deler || !o.deler[0]) continue; const x = o.deler[0][0], y = o.deler[0][1];
      if (!egne.some(p => Math.hypot(p.x - x, p.y - y) <= R.reparer.radius)) continue;
      T.delete(k); ø.kr -= R.reparer.kr; S.sider[side].rep++; logg(`Etterretning: ${navn(side)} har reparert ${o.e.navn || 'en ' + lag}.`); skitten = true; return k; }
    return null; }

  // ---------- 5. SABOTASJE ----------
  const paktMed = side => { const Fs = FT(); return !!(Fs && window.Firma && Firma.aktivePakter(Fs, nå()).some(p => p.side === side)); };
  const påVakt = () => { const Fo = window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null; return Fo && Fo.personer ? Fo.personer.filter(p => p.oppgave === 'vakt' && p.helse >= .4).length : 0; };
  function bak(side) { try { const B = window.SeierSpill && SeierSpill.bilde ? SeierSpill.bilde() : null; if (!B || !B.verdi) return false; return B.verdi.blå.sum > B.verdi[side].sum; } catch (e) { return false; } }
  // o = { tving (sjansen gjelder ikke), stopp (true/false: vaktene stopper den / ikke) }. Gir det som skjedde.
  function sabotér(side, o = {}) {
    const L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null, LB = window.Leir; if (!L || !LB) return null; const s = S.sider[side];
    if (!o.tving && tilfV() >= RV.sabotasjeSjanse({ nå: nå(), sist: s.sistSab, bak: bak(side), pakt: paktMed(side), vakt: påVakt() })) return null;
    const maskiner = (L.bygg || []).filter(b => LB.BYGG[b.type] && LB.BYGG[b.type].maskin && (!LB.ferdig || LB.ferdig(b))).map(b => ({ id: b.id, type: b.type, hp: b.hp }));
    const mål = RV.sabotasjeMål(maskiner, { tre: L.lager.tre, betong: L.lager.betong, stål: L.lager.stål }, tilfV()); if (!mål) return null;
    s.sistSab = Math.round(nå());
    const hva = mål.slag === 'maskin' ? (LB.BYGG[mål.type].navn || mål.type).toLowerCase() : (LB.MATERIALER[mål.vare] ? LB.MATERIALER[mål.vare].navn.toLowerCase() : mål.vare) + 'lageret';
    const stopp = o.stopp !== undefined ? !!o.stopp : påVakt() >= 2 && tilfV() < .5;
    if (stopp) { logg(`Vaktene jaget bort en sabotør fra ${navn(side)} ved ${hva}.`); return { ...mål, stoppet: true }; }
    if (mål.slag === 'maskin') LB.skad(L, mål.id, mål.skade); else L.lager[mål.vare] = Math.max(0, Math.round((L.lager[mål.vare] - mål.mengde) * 10) / 10);
    s.sab++;
    // svar: en pakt med dem er brutt av dem (uten tap av rykte for dere), og du kan gå løs på dem
    let brøt = false; const Fs = FT(); if (Fs && window.Firma) for (const p of Firma.aktivePakter(Fs, nå())) if (p.side === side && Firma.brytPakt(Fs, p.id, side, nå())) brøt = true;
    if (brøt) lagreF();
    const nær = holder(side).map(b => ({ b, d: leir() ? Math.hypot(midt(b).x - leir().x, midt(b).y - leir().y) : 0 })).sort((a, b) => a.d - b.d)[0];
    melding(`Sabotasje: noen fra ${navn(side)} har ${mål.slag === 'maskin' ? `ødelagt ${hva} (−${Math.round(mål.skade * 100)} %)` : `stjålet fra ${hva} (${String(mål.mengde).replace('.', ',')})`}.`
      + (brøt ? ' Pakten med dem er brutt – av dem. Dere kan svare uten å miste rykte.' : '') + ` Svar: send lag mot ${navn(side)}${nær ? ' i ' + nær.b.e.navn : ''}, og sett folk på vakt.`);
    hend('alarm', `Sabotasje fra ${navn(side)}`); skitten = true; return { ...mål, stoppet: false, pakt: brøt }; }

  // ---------- takten ----------
  let akk = 0, sistDag = null;
  function time(min) {
    for (const side of SIDER) { if (!Ø(side)) continue;
      lønn(side, min);
      leggTil(side, sagTime(side, min / 60), 'sag');
      leggTil(side, byTime(side) * min / 60, 'by');
      tarTime(side); }
    kontrakter(); }
  function døgn() {
    for (const side of SIDER) { if (!Ø(side)) continue; byDøgn(side); velgVei(side); sagKjøp(side); firmaDøgn(side);
      if ((S.sider[side].vei) === 'gjenoppbygging') reparer(side); sabotér(side); }
    lagre(); }
  KROKER.sim.push(dt => {
    if (!auto() || !leir()) { sistDag = null; return; }
    akk += dt; if (akk < 60) return; const min = akk; akk = 0;
    time(min); const d = Math.floor(nå() / 1440); if (sistDag === null) sistDag = d; else if (d > sistDag) { sistDag = d; døgn(); }
  });

  // ---------- krigskartet og Partnere ----------
  const veiLinje = side => { const s = S.sider[side]; if (!s.vei) return null; const d = [RV.veiTekst(navn(side), s.vei)];
    if (s.sag) d.push(`sagbruk i ${s.sag.navn}`); const n = avtaleByer(side).filter(q => q.b.rival.trinn !== 'kunde').length; if (n) d.push(`${n} byavtale${n === 1 ? '' : 'r'}`); return d.join(' · '); };
  { const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}; KT.side = KT.side || []; KT.side.push(side => (SIDER.includes(side) && på() ? veiLinje(side) : null)); }
  // én linje i rivalens boks i Partnere (firma-visning.js)
  function partnerTekst(side) {
    const s = S.sider[side], d = []; if (s.vei) d.push(RV.veiTekst(navn(side), s.vei)); const Fs = FT();
    if (Fs && window.Firma) for (const f of Firma.aktive(Fs)) { if (Firma.rivalKunde(f, nå()) === side) d.push(`fast kunde hos ${f.navn}`); if (f.rival && f.rival.anlegg && f.rival.anlegg.side === side) d.push(`eier halve ${Firma.anleggBestemt(f)} hos ${f.navn}`); }
    if (s.sag) d.push(`sagbruk i ${s.sag.navn}`); if (s.sab) d.push(`${s.sab} sabotasje${s.sab === 1 ? '' : 'r'} mot dere`);
    return d.join(' · '); }

  // ---------- lagring per leir ----------
  function lagre() { const id = leirId(); if (!id || !på() || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: id, S })); } catch (e) { /* fullt eller sperret */ } }
  function les() { S = ny(); let o = null; try { o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { o = null; }
    if (!o || o.leir !== leirId() || !o.S || !o.S.sider) return false;
    for (const side of SIDER) { const q = o.S.sider[side]; if (!q) continue; const s = S.sider[side];
      if (RV.VEIER.includes(q.vei)) s.vei = q.vei; for (const k of ['veiFra', 'sistSab', 'sab', 'lønn', 'gått', 'rep', 'kontrakter']) if (Number.isFinite(+q[k])) s[k] = +q[k];
      if (Number.isFinite(q.tjent)) s.tjent = q.tjent; if (q.inn && typeof q.inn === 'object') Object.assign(s.inn, q.inn);
      if (q.sag && Number.isFinite(q.sag.x) && Number.isFinite(q.sag.hp)) s.sag = { by: q.sag.by, navn: String(q.sag.navn || ''), x: q.sag.x, y: q.sag.y, hp: q.sag.hp, fra: +q.sag.fra || 0 }; }
    return true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (på()) les(); }, 2700));
  window.addEventListener('pagehide', () => lagre());
  setInterval(() => { if (auto()) lagre(); }, 20000);

  Object.assign(api, { S: () => S, nullstill: () => { S = ny(); VAKT.clear(); }, tak, inntekt, time, døgn, velgVei, sabotér, reparer, tarTilbud, kontrakter, byDøgn, styr, partnerTekst, veiLinje, lagre, les, NØKKEL,
    vei: side => S.sider[side] ? S.sider[side].vei : null, settVei: (side, v) => { if (S.sider[side] && RV.VEIER.includes(v)) S.sider[side].vei = v; } });
})();
