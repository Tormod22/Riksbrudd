'use strict';
/* Riksbrudd – INVESTERE OG GRÅBØRSEN, visningen (fase Ø7, 28. nov; docs/plan-selskap-okonomi.md kapittel 9 og 10). Reglene: spill/bors.js.
 * window.BorsSpill:
 *  - tilstanden per leir i localStorage «riksbrudd-bors» (andelene, notering, investorene, ønskene, lånene, stemningen);
 *  - verdiene og kursene leses fra spillet: firmaene (FirmaSpill – helse, holdning, krigen rundt hjemstedet), ditt selskap (SeierSpill.minVerdi
 *    + andelene + ukas resultat fra PengerSpill + angrep på leiren) og rivalene (SeierSpill.rivalVerdi);
 *  - hvert døgn (morgenen): stemningen etter det som har skjedd (leverte og brutte kontrakter, byer, angrep, seire, eksport), utbytte, rivalenes
 *    kjøp, investorer som ringer, lån og ønsker (Bors.døgn) – telefonen ringer (hendelsen «riksbrudd-telefon»);
 *  - 10 % i et firma: 5 % rabatt (Firma.rabatt) og innsyn; 25 %: førsterett (tilbudene deres tas ikke av rivalene: k.fast); over 50 %: firmaet er
 *    deres (resultatet og varene kommer hit hvert døgn). En rival over 50 %: samarbeidet tar slutt (Firma.eierSkifte), og de gir ikke tilbud;
 *  - fanen Eiere i Selskapet (selskapspanel.js spør BorsSpill.fane/etter/trykk) og flisene i Oversikt (BorsSpill.flisHtml);
 *  - kursgrafen (StatistikkSpill.leggTilKilde: kursMeg, kursRød, kursGrønn i grafen «kurs»), ønskene i Neste-lappen (window.NESTE_KILDER);
 *  - penger-veien til seier (seier-visning.js) leser BorsSpill.seierInn().
 * Alt spilleren gjør går gjennom kommandolaget (KOMMANDO): borsKjøp, borsSelg, borsNoter, borsUtbytte, borsEmisjon, borsTilbakekjøp, borsRival,
 * borsRykte, borsInvestor, borsKrav. I TESTENE (navigator.webdriver) skjer ingenting av seg selv før BorsSpill.test = true.
 */
(function () {
  const Bo = window.Bors; if (!Bo || typeof KROKER === 'undefined') return;
  const R = Bo.REGLER, api = { test: false }, auto = () => !navigator.webdriver || api.test === true;
  const NØKKEL = 'riksbrudd-bors', ID = 'blå', DØGN = 1440;
  const Sp = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  const kr = v => (window.Leir && Leir.kroner ? Leir.kroner(v) : Bo.kroner(v));
  const mill = v => Bo.mill(v);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nåMin = () => (typeof tid === 'number' && Number.isFinite(tid) ? tid : 0);
  const dagNå = () => Math.floor((6 * 60 + nåMin()) / DØGN);
  const sidenavn = s => (window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[s] ? Fraksjoner.FRAKSJONER[s].navn : Bo.RIVALER[s] || s);
  const tilf = () => ((typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random);
  const cap = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const pst = v => String(Math.round(v * 10) / 10).replace('.', ',') + ' %';
  let B = Bo.ny(null), leirId = '', klar = false, melding = '', sistLagret = 0;
  // ting som bare gjelder denne økta: når dere sist skjøt med hver rival, angrepene på leiren (spillminutter)
  const kamp = { rød: null, grønn: null }; let angrepNå = false;

  // ---------- lagring per leir ----------
  const les = () => { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); return d && d.leir === leirId ? d.d : null; } catch (e) { return null; } };
  const lagre = () => { if (!leirId || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: Bo.tilJSON(B) })); } catch (e) { /* fullt eller sperret */ } };
  function start() {
    const s = Sp(); if (!s || !s.leir) return; const id = Math.round(s.leir.x) + ',' + Math.round(s.leir.y);
    if (id !== leirId) { leirId = id; B = Bo.fraJSON(les()) || Bo.ny(s.leir); if (!Array.isArray(B.angrep)) B.angrep = []; }
    klar = true; koble(); lagre();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- det vi leser fra spillet ----------
  const FS = () => (window.FirmaSpill && FirmaSpill.tilstand ? FirmaSpill.tilstand() : null);
  const firmaer = () => { const F = FS(); return F && F.firmaer ? F.firmaer : []; };
  const selskap = () => { const S = window.SelskapSpill && SelskapSpill.tilstand ? SelskapSpill.tilstand() : null; return { S, sd: S && S.sider ? S.sider[ID] : null }; };
  const nivå = () => { try { return window.SelskapSpill && SelskapSpill.nivå ? SelskapSpill.nivå().nr : 1; } catch (e) { return 1; } };
  let krigHusk = null, krigNår = -1e9;
  const krig = () => { if (performance.now() - krigNår < 3000 && krigHusk) return krigHusk; try { krigHusk = window.FirmaSpill && FirmaSpill.krig ? FirmaSpill.krig() : {}; } catch (e) { krigHusk = {}; } krigNår = performance.now(); return krigHusk; };
  function firmaTall() {
    const K = krig(), ut = {};
    for (const f of firmaer()) { const v = Bo.firmaVerdi(f, K[f.navn] || {}); const a = B.firmaer[f.navn]; ut[f.navn] = { ...v, kurs: Bo.kurs(v.verdi, a ? a.stemning : 1), f }; }
    return ut;
  }
  // ukas resultat fra dagboka over pengene (de siste 7 døgnene), uten pengene fra børsen selv og «annet» (ellers ville en notering
  // telt som resultat og løftet kursen igjen) – Claudes valg
  const UTENOM = ['børs og investorer', 'annet'];
  function ukeNetto() { try { const P = window.PengerSpill; if (!P || !P.døgn || !P.døgnNå || !P.tilstand || !P.tilstand()) return 0; const d = P.døgnNå(); let n = 0;
    for (let i = Math.max(1, d - R.uke + 1); i <= d; i++) { const D = P.døgn(i); if (!D) continue; n += (+D.inn || 0) - (+D.ut || 0); for (const k of UTENOM) if (D.p && Number.isFinite(+D.p[k])) n -= +D.p[k]; }
    return n; } catch (e) { return 0; } }
  // (ut8-kr-penger, Jonas: «−23,7 mill. i Oversikt og −12,9 mill. i Eiere») tallet som vises, er det samme som i Oversikt
  // (Selskapsbilde.ukeNå – hele dagboka); kursen regner med en del av det (sv.inntekt: uten børsens egne penger, høyst 30 % av eiendelene)
  function ukeTekst(sv) { let u = null; try { u = window.Selskapsbilde && Selskapsbilde.ukeNå ? Selskapsbilde.ukeNå() : null; } catch (e) { u = null; }
    if (!u || !u.dager) return `ukas resultat ${mill(sv.inntekt)}`; const ulik = Math.abs(u.netto - sv.inntekt) >= 5e4;
    return `ukas resultat ${mill(u.netto)}${ulik ? ` (i kursen ${mill(sv.inntekt)}: uten børsens egne penger og høyst ${pst(-Bo.REGLER.selskap.inntektGulv * 100)} av eiendelene)` : ''}`; }
  const angrepUke = () => (B.angrep || []).filter(t => nåMin() - t < 7 * DØGN).length;
  function rivalKurs(side) { let v = 0; try { v = window.SeierSpill && SeierSpill.rivalVerdi ? SeierSpill.rivalVerdi(side).sum : 15e6; } catch (e) { v = 15e6; } return { verdi: v, kurs: Bo.kurs(v, B.rivaler[side].stemning) }; }
  // alle kursene nå: { meg, rød, grønn, firma: { navn: { verdi, resultat, kurs } }, verdi (ditt selskap) }
  function kurser() {
    const FT = firmaTall(), rød = rivalKurs('rød'), grønn = rivalKurs('grønn');
    let andeler = 0; for (const [n, a] of Object.entries(B.firmaer)) if (a.du > 0 && FT[n]) andeler += a.du * FT[n].kurs;
    andeler += B.rivaler.rød.du * rød.kurs + B.rivaler.grønn.du * grønn.kurs;
    let eiend = 0; try { eiend = window.SeierSpill && SeierSpill.minVerdi ? SeierSpill.minVerdi().sum : (Sp() ? Sp().penger : 0); } catch (e) { eiend = Sp() ? Sp().penger : 0; }
    const sv = Bo.selskapVerdi({ eiendeler: eiend, andeler, ukeNetto: ukeNetto(), angrep: angrepUke() });
    return { meg: Bo.kurs(sv.verdi, B.meg.stemning), verdi: sv, andeler, rød: rød.kurs, grønn: grønn.kurs, rødVerdi: rød.verdi, grønnVerdi: grønn.verdi, firma: FT };
  }
  // tellerne for stemningen (summer så langt i spillet)
  function tellere() {
    const { sd } = selskap(), t = {};
    if (sd && sd.sum) { t.levert = +sd.sum.levert || 0; t.brutt = Number.isFinite(+sd.sum.brutt) ? +sd.sum.brutt : (sd.ferdige || []).filter(k => k.status === 'brutt').length; }
    try { if (typeof TETTSTEDER !== 'undefined' && TETTSTEDER && TETTSTEDER.values) { let n = 0; for (const v of TETTSTEDER.values()) if (v && v.eier === ID) n++; t.byer = n; } } catch (e) { /* uten tettsteder */ }
    t.angrep = (B.angrep || []).length;
    try { const S = window.SeierSpill && SeierSpill.tilstand ? SeierSpill.tilstand() : null; if (S) t.seire = +S.lagUt || 0; } catch (e) { /* */ }
    try { const E = window.EksportSpill && EksportSpill.tilstand ? EksportSpill.tilstand() : null; if (E && E.sum) t.eksport = +E.sum.levert || 0; } catch (e) { /* */ }
    return t;
  }
  const rivalByer = side => { try { let n = 0; if (typeof TETTSTEDER !== 'undefined' && TETTSTEDER && TETTSTEDER.values) for (const v of TETTSTEDER.values()) if (v && v.eier === side) n++; return n; } catch (e) { return 0; } };
  // leverte kontrakter med type og tid (for investorenes ønske om en bestemt kontrakt)
  const leverte = () => { const { sd } = selskap(); return sd ? (sd.ferdige || []).filter(k => k.status === 'levert').map(k => ({ type: k.type, tid: +k.ferdig || 0 })) : []; };
  const telefon = tekst => { if (!auto()) return; try { window.dispatchEvent(new CustomEvent('riksbrudd-telefon', { detail: { tekst } })); } catch (e) { /* eldre nettlesere */ } };
  const betal = kr0 => !!(window.OppstartSpill && OppstartSpill.betal(Math.round(kr0)));
  const gi = kr0 => { if (kr0 > 0 && window.OppstartSpill) OppstartSpill.gi(Math.round(kr0)); };

  // ---------- koblingene til firmaene og kontraktene ----------
  function koble() {
    if (window.Firma) Firma.rabatt = navn => (klar ? Bo.virkning(B, navn).rabatt : 1);
    if (window.Selskap && !koble.ferdig) { koble.ferdig = true; const gml = Selskap.firmaKilde;
      // et firma en rival eier, gir ikke dere tilbud
      Selskap.firmaKilde = function () { const l = typeof gml === 'function' ? gml.apply(this, arguments) : null; if (!l || !klar) return l; return l.filter(n => { const a = B.firmaer[n]; return !(a && (a.eier === 'rød' || a.eier === 'grønn')); }); }; }
  }
  // et firma skifter eier: samarbeidet (spill/firma.js) og loggen
  function eierSkifte(navn, side) {
    const F = FS(), f = F && window.Firma ? Firma.finn(F, navn) : null; if (f && Firma.eierSkifte) { const r = Firma.eierSkifte(F, f, side); try { if (window.FirmaSpill && FirmaSpill.lagre) FirmaSpill.lagre(); } catch (e) { /* */ }
      if (side && side !== ID && r && r.slutt.length) logg(`${navn} avslutter samarbeidet med dere – de nye eierne bestemmer.`); }
    const a = Bo.firma(B, navn); a.eier = side;
  }

  // ---------- døgnet ----------
  function døgn(tving) {
    if (!klar) start(); if (!klar || (!tving && !auto())) return [];
    const nå = nåMin(), K = kurser(), r = tilf();
    // stemningen: det som har skjedd siden sist (tellerne), og rivalenes byer
    const d = Bo.tellerForskjell(B, tellere()); Bo.endreStemning(B.meg, Bo.stemningEndring(d));
    for (const s of ['rød', 'grønn']) { const n = rivalByer(s), ri = B.rivaler[s]; if (ri.byer !== null && ri.byer !== undefined) Bo.endreStemning(ri, Bo.stemningEndring({ byer: n - ri.byer })); ri.byer = n; }
    const resultat = {}; for (const [n, v] of Object.entries(K.firma)) resultat[n] = v.resultat;
    // «ro rundt leiren»: et angrep siden ønsket kom (før fristen sjekkes)
    const før = [];
    for (const ø of B.ønsker) if (ø.status === 'aktiv' && ø.type === 'ro' && (B.angrep || []).some(t => t >= ø.fra)) { Bo.lukkØnske(B, ø, 'brutt'); før.push({ type: 'ønske', ø, utfall: 'brutt' }); }
    const H = før.concat(Bo.døgn(B, { nå, rand: r, kurs: { meg: K.meg, rød: K.rød, grønn: K.grønn }, firmaer: firmaer().map(f => ({ navn: f.navn, konkurs: f.konkurs, helse: f.helse, levert: f.levert, bransje: f.bransje })), resultat,
      sjekk: { angrepSiden: 0, kampMed: kamp, levert: leverte() }, ekteRivaler: !!window.RivalSpill }));
    for (const h of H) hendelse(h, K);
    // investorene ringer
    const hv = Bo.henvendelse(B, nivå(), nå, K.meg, r);
    if (hv) { const t = `${hv.inv.navn} (${hv.inv.hvem}) ringer: ${cap(hv.inv.tekst)}${hv.h.kr ? ` – ${mill(hv.h.kr)} for ${hv.h.andel} %` : ''}. Se Selskapet → Eiere.`; logg(t); telefon(t); }
    B.meg.kurs = K.meg; lagre(); return H;
  }
  function hendelse(h, K) {
    if (h.type === 'utbytte') { gi(h.kr); logg(`Utbytte fra ${h.navn}: ${kr(h.kr)}.`); }
    else if (h.type === 'eid') { gi(h.kr); varer(h.varer); }
    else if (h.type === 'rivalKjøpFirma') { const a = B.firmaer[h.navn], du = a ? a.du : 0; if (du >= R.firma.innsynFra || h.navn === 'Storlia Tømmer') logg(`${sidenavn(h.side)} har kjøpt ${h.n} % av ${h.navn} (de eier nå ${Math.round(a[h.side])} %).`); }
    else if (h.type === 'firmaEier') { eierSkifte(h.navn, h.side); if (h.side && h.side !== ID) { const t = `${sidenavn(h.side)} har kjøpt opp ${h.navn}. Firmaet er deres nå.`; logg(t); telefon(t); } }
    else if (h.type === 'rivalKjøpMeg') logg(`${sidenavn(h.side)} har kjøpt ${h.n} % av selskapet deres på Gråbørsen (de eier nå ${Math.round(B.meg.rival[h.side])} %).`);
    else if (h.type === 'investorSelger') { const q = Bo.investor(h.inv); const t = `${q ? q.navn : 'En investor'} er misfornøyd og har solgt ${Math.round(h.n)} % av selskapet til ${sidenavn(h.side)}.`; logg(t); telefon(t); }
    else if (h.type === 'oppkjøp') { const t = `${sidenavn(h.side)} eier nå over halvparten av selskapet – dere er kjøpt opp på Gråbørsen.`; logg(t); telefon(t); try { if (window.SeierSpill && SeierSpill.takt) setTimeout(() => SeierSpill.takt(), 50); } catch (e) { /* */ } }
    else if (h.type === 'ukeSlutt') logg(h.ok ? `Eierne fikk utbyttet sitt denne uka (${kr(h.betalt)}).` : `Eierne fikk ikke utbyttet de ventet (${kr(h.betalt)} av ${kr(h.forventet)}) – kursen faller.`);
    else if (h.type === 'renter') { const sum = h.kr + (h.siste ? h.l.kr : 0), q = Bo.investor(h.l.inv), ok = betal(sum), r = Bo.lånBetalt(B, h.l, ok, K.meg);
      logg(ok ? `${h.siste ? 'Lånet er betalt tilbake' : 'Renter på lånet betalt'} til ${q ? q.navn : 'långiveren'}: ${kr(sum)}.` : `Dere klarte ikke å betale ${q ? q.navn : 'långiveren'} (${kr(sum)}). De tar ${pst(r.andeler || 0)} av selskapet i stedet.`); }
    else if (h.type === 'ønske') { const q = Bo.investor(h.ø.inv); logg(`${q ? q.navn : 'Investoren'}: ${h.utfall === 'holdt' ? 'fornøyd – ønsket er oppfylt' : 'skuffet – ønsket ble ikke oppfylt'} («${Bo.ønskeTekst(h.ø)}»).`); }
    else if (h.type === 'krav') { const q = Bo.investor(h.ø.inv), t = `${q ? q.navn : 'En eier'} har et krav: ${Bo.ønskeTekst(h.ø)}. Dere kan si nei – det koster kurs.`; logg(t); telefon(t); }
  }
  // (ut6-spioner) RIVALENE KJØPER MED EKTE PENGER: spill/rival-visning.js kaller BorsSpill.rivalKjøp(side, kr) (veien «penger», kassa har råd)
  // og trekker det som ble brukt fra kassa si. Børsens egne tilfeldige rivalkjøp er av når RivalSpill finnes (ekteRivaler i døgnet).
  function rivalKjøp(side, kr0) {
    if (!klar) start(); if (!klar) return 0; const K = kurser();
    const u = Bo.rivalKjøp(B, side, kr0, { meg: K.meg, firma: K.firma }, { firmaer: firmaer().map(f => ({ navn: f.navn, konkurs: f.konkurs })), r: tilf() });
    for (const h of u.hendelser) hendelse(h, K);
    if (u.brukt > 0) { B.rivalBrukt = B.rivalBrukt || {}; B.rivalBrukt[side] = (B.rivalBrukt[side] || 0) + u.brukt; lagre(); }
    return u.brukt;
  }
  // varene fra et firma dere eier: til lageret (Leir.leggInn), maten til folkene, diesel og resten i kroner
  function varer(V) {
    if (!V) return; const L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null;
    for (const [t, n] of Object.entries(V)) {
      if (t === 'kr') { gi(n); continue; }
      if (t === 'mat') { const F = window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null; if (F) { F.mat = (F.mat || 0) + n; continue; } }
      if (L && window.Leir && Leir.MATERIALER && Leir.MATERIALER[t] && Leir.leggInn) { try { Leir.leggInn(L, t, n); continue; } catch (e) { /* til kroner */ } }
      const pris = t === 'diesel' && window.Leir && Leir.DRIVSTOFF ? Leir.DRIVSTOFF.prisPerLiter : window.Leir && Leir.MATERIALER && Leir.MATERIALER[t] ? Leir.MATERIALER[t].pris : 0; if (pris) gi(n * pris);
    }
  }

  // ---------- krokene ----------
  // kamp med en rival (for ønsket «hold dere unna …»): ingen endring i treffene
  KROKER.ild.push((a, b) => { if (a && b && a.side !== b.side) { const s = a.side === ID ? b.side : b.side === ID ? a.side : null; if (s === 'rød' || s === 'grønn') kamp[s] = nåMin(); } return 1; });
  let dagSist = null;
  KROKER.sim.push(() => {
    if (!klar) return;
    // angrep på leiren (røverne): tellingen for stemningen og ønsket «ro»
    try { const T = window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null, a = !!(T && T.aktiv); if (a && !angrepNå) { (B.angrep || (B.angrep = [])).push(Math.round(nåMin())); if (B.angrep.length > 40) B.angrep.shift(); } angrepNå = a; } catch (e) { /* */ }
    // førsterett: tilbudene fra et firma dere eier minst 25 % av, tas ikke av rivalene
    const { S } = selskap(); if (S && S.tilbud) for (const k of S.tilbud) if (k.giver && k.giver.slag === 'firma' && !k.fast && Bo.virkning(B, k.giver.navn).førsterett) { k.fast = true; k.førsterett = true; }
    if (!auto()) return;
    const d = dagNå(); if (dagSist === null) dagSist = B.dag >= 0 ? B.dag : d;
    if (d !== dagSist) { dagSist = d; døgn(); }
    if (performance.now() - sistLagret > 20000) { sistLagret = performance.now(); lagre(); }
  });
  // ønskene og kravene i Neste-lappen (spill/neste.js leser window.NESTE_KILDER)
  (window.NESTE_KILDER = window.NESTE_KILDER || []).push(() => {
    if (!klar) return null; const ø = B.ønsker.filter(q => q.status === 'aktiv').sort((a, b) => a.frist - b.frist)[0]; if (!ø) return null; const q = Bo.investor(ø.inv);
    const igjen = Math.max(0, Math.ceil((ø.frist - nåMin()) / DØGN));
    return { id: 'investor', slag: 'investor', tekst: `${q ? q.navn : 'Investoren'}: ${Bo.ønskeTekst(ø, { kr: B.meg.uke ? B.meg.uke.forventet : 0 })} (${igjen} døgn igjen)`, hjelp: 'Selskapet → Eiere viser investorene og ønskene deres.',
      trykk: () => { if (window.SelskapetSpill) SelskapetSpill.vis(true, 'eiere'); } };
  });
  // kursgrafen (statistikk-visning.js lastes etter denne fila)
  function kilder() { const SS = window.StatistikkSpill; if (!SS || !SS.leggTilKilde || kilder.ferdig) return; kilder.ferdig = true;
    const k = (id, navn, farge, fn) => SS.leggTilKilde(id, () => (klar ? fn() : undefined), { navn, enhet: 'kr', farge, graf: 'kurs', grafNavn: 'Kurs på Gråbørsen', tekst: 'Kursen per andel (snitt gjennom døgnet): dere, Ravnsund og Mosevakt.' });
    let husk = null, når = -1e9; const K = () => { if (!husk || performance.now() - når > 5000) { husk = kurser(); når = performance.now(); } return husk; };
    k('kursMeg', 'Dere', 'gull', () => K().meg); k('kursRød', 'Ravnsund', 'rød', () => K().rød); k('kursGrønn', 'Mosevakt', 'grønn', () => K().grønn); }
  document.addEventListener('DOMContentLoaded', kilder); setTimeout(kilder, 0); window.addEventListener('riksbrudd-spill', () => setTimeout(kilder, 0));

  // ---------- handlingene (gjennom KOMMANDO) ----------
  const ikkeKlar = () => (!klar ? 'Velg leir først.' : null);
  function kjøpRett(k) {
    const n = +k.n, K = kurser(), v = K.firma[k.navn]; if (!v) return { feil: 'Fant ikke firmaet.' };
    const r = Bo.kjøp(B, k.navn, n, v.kurs, { nivå: nivå(), konkurs: !!v.f.konkurs }); if (!r.ok) return { feil: `Kan ikke kjøpe: ${r.grunn}.` };
    if (!betal(r.kr)) { Bo.firma(B, k.navn).du = Math.round((Bo.firma(B, k.navn).du - n) * 10) / 10; return { feil: `Dere har ikke råd (${kr(r.kr)}).` }; }
    if (r.eier !== r.eierFør) eierSkifte(k.navn, r.eier);
    logg(`Dere kjøpte ${n} % av ${k.navn} for ${kr(r.kr)}${r.eier === ID && r.eierFør !== ID ? ' – firmaet er deres nå: resultatet og varene fra hjemstedet kommer til leiren hvert døgn' : ''}.`); lagre(); return { ok: true, kr: r.kr };
  }
  function selgRett(k) {
    const n = +k.n, K = kurser(), v = K.firma[k.navn]; if (!v) return { feil: 'Fant ikke firmaet.' };
    const r = Bo.selg(B, k.navn, n, v.kurs); if (!r.ok) return { feil: r.grunn }; gi(r.kr); if (r.eier !== r.eierFør) eierSkifte(k.navn, r.eier);
    logg(`Dere solgte ${n} % av ${k.navn} for ${kr(r.kr)}.`); lagre(); return { ok: true, kr: r.kr };
  }
  function noterRett(k) {
    const K = kurser(), r = Bo.noter(B, +k.p, K.meg, nåMin(), { nivå: nivå() }); if (!r.ok) return { feil: `Kan ikke noteres: ${r.grunn}.` };
    gi(r.kr); Bo.endreStemning(B.meg, 0); logg(`Selskapet er notert på Gråbørsen. ${k.p} % er solgt for ${kr(r.kr)}. Eierne venter utbytte hver uke.`); telefon('Gråbørsen: selskapet er notert.'); lagre(); return { ok: true, kr: r.kr };
  }
  function utbytteRett(k) { const r = Bo.betalUtbytte(B, +k.kr); if (!r.ok) return { feil: r.grunn }; if (!betal(r.kr)) { B.meg.uke.betalt -= r.kr; return { feil: `Dere har ikke råd (${kr(r.kr)}).` }; } logg(`Utbytte til eierne: ${kr(r.kr)}.`); lagre(); return { ok: true }; }
  function emisjonRett(k) {
    const K = kurser(), r = Bo.emisjon(B, +k.q, K.meg); if (!r.ok) return { feil: `Ingen emisjon: ${r.grunn}.` }; gi(r.kr);
    logg(`Emisjon: ${k.q} % nye andeler solgt for ${kr(r.kr)}. Dere eier nå ${pst(B.meg.egne)}.${r.under50 ? ' Dere eier under halvparten – en rival kan kjøpe dere opp.' : ''}`); lagre(); return { ok: true, kr: r.kr };
  }
  function tilbakeRett(k) { const K = kurser(), r = Bo.tilbakekjøp(B, +k.n, K.meg); if (!r.ok) return { feil: r.grunn }; if (!betal(r.kr)) { B.meg.fritt += +k.n; B.meg.egne -= +k.n; return { feil: `Dere har ikke råd (${kr(r.kr)}).` }; } logg(`Dere kjøpte tilbake ${k.n} % for ${kr(r.kr)}.`); lagre(); return { ok: true }; }
  function rivalRett(k) {
    const K = kurser(), kurs = K[k.side], n = +k.n;
    if (k.salg) { const r = Bo.selgRival(B, k.side, n, kurs); if (!r.ok) return { feil: r.grunn }; gi(r.kr); logg(`Dere solgte ${n} % av ${sidenavn(k.side)} for ${kr(r.kr)}.`); lagre(); return { ok: true }; }
    if (nivå() < R.nivå.notering) return { feil: `Gråbørsen åpner for dere på nivå ${R.nivå.notering}.` };
    const r = Bo.kjøpRival(B, k.side, n, kurs); if (!r.ok) return { feil: r.grunn }; if (!betal(r.kr)) { B.rivaler[k.side].du -= n; B.rivaler[k.side].fritt += n; return { feil: `Dere har ikke råd (${kr(r.kr)}).` }; }
    logg(`Dere kjøpte ${n} % av ${sidenavn(k.side)} på Gråbørsen for ${kr(r.kr)}.`); lagre(); return { ok: true };
  }
  function rykteRett(k) {
    if (nivå() < R.nivå.notering) return { feil: `Gråbørsen åpner for dere på nivå ${R.nivå.notering}.` }; if (!betal(R.rykte.pris)) return { feil: `Dere har ikke råd (${kr(R.rykte.pris)}).` };
    const r = Bo.rykte(B, k.side); try { const { S } = selskap(); if (S && window.Selskap) Selskap.endreRykte(S, ID, { pålitelig: r.pålitelig }); if (SelskapSpill.lagre) SelskapSpill.lagre(); } catch (e) { /* */ }
    logg(`Rykter om ${sidenavn(k.side)} sprer seg på Gråbørsen – kursen deres faller. Noen vet hvem som startet dem («pålitelig» ${r.pålitelig}).`); lagre(); return { ok: true };
  }
  function investorRett(k) {
    const r = Bo.svarInvestor(B, k.id, !!k.ja, nåMin(), tilf()); if (!r.ok) return { feil: r.grunn }; const q = Bo.investor(k.id);
    if (!k.ja) { logg(`Dere takket nei til ${q.navn}.`); lagre(); return { ok: true }; }
    gi(r.kr); logg(`${q.navn} er med: ${kr(r.kr)} inn i kassa. Ønsket deres: ${Bo.ønskeTekst(r.ønske, { kr: B.meg.uke ? B.meg.uke.forventet : 0 })}.`); lagre(); return { ok: true, kr: r.kr };
  }
  function kravRett(k) { const ø = B.ønsker.find(q => q.id === k.id && q.status === 'aktiv'); if (!ø) return { feil: 'Kravet finnes ikke lenger.' }; Bo.lukkØnske(B, ø, 'nei'); B.meg.kravNei++; logg('Dere sa nei til kravet. Eierne liker det ikke – kursen faller litt.'); lagre(); return { ok: true }; }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true; const K = window.Kommando, ik = () => ikkeKlar();
    const n = k => (Number.isFinite(+k.n) && +k.n > 0 ? null : 'Ugyldig antall.');
    K.registrer('borsKjøp', { meld: false, sjekk: k => ik() || n(k), utfør: kjøpRett, beskriv: k => `kjøper ${k.n} % av ${k.navn}` });
    K.registrer('borsSelg', { meld: false, sjekk: k => ik() || n(k), utfør: selgRett, beskriv: k => `selger ${k.n} % av ${k.navn}` });
    K.registrer('borsNoter', { meld: false, sjekk: k => ik() || (Number.isFinite(+k.p) ? null : 'Ugyldig andel.'), utfør: noterRett, beskriv: k => `noterer selskapet (${k.p} %)` });
    K.registrer('borsUtbytte', { meld: false, sjekk: k => ik() || (+k.kr > 0 ? null : 'Ugyldig sum.'), utfør: utbytteRett, beskriv: () => 'betaler utbytte' });
    K.registrer('borsEmisjon', { meld: false, sjekk: k => ik() || (+k.q > 0 ? null : 'Ugyldig andel.'), utfør: emisjonRett, beskriv: k => `emisjon på ${k.q} %` });
    K.registrer('borsTilbakekjøp', { meld: false, sjekk: k => ik() || n(k), utfør: tilbakeRett, beskriv: k => `kjøper tilbake ${k.n} %` });
    K.registrer('borsRival', { meld: false, sjekk: k => ik() || (!Bo.RIVALER[k.side] ? 'Ukjent rival.' : n(k)), utfør: rivalRett, beskriv: k => `${k.salg ? 'selger' : 'kjøper'} andeler i ${sidenavn(k.side)}` });
    K.registrer('borsRykte', { meld: false, sjekk: k => ik() || (!Bo.RIVALER[k.side] ? 'Ukjent rival.' : null), utfør: rykteRett, beskriv: k => `sprer rykter om ${sidenavn(k.side)}` });
    K.registrer('borsInvestor', { meld: false, sjekk: k => ik() || (!Bo.investor(k.id) ? 'Ukjent investor.' : null), utfør: investorRett, beskriv: k => `svarer ${(Bo.investor(k.id) || {}).navn}` });
    K.registrer('borsKrav', { meld: false, sjekk: k => ik(), utfør: kravRett, beskriv: () => 'sier nei til et krav' });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; melding = r.ok ? '' : (r.feil || 'Avvist.'); return r; };

  // ---------- fanen Eiere ----------
  const css = document.createElement('style');
  css.textContent = `#selskapet .bo-graf{ margin:4px 0 8px; min-height:60px; } #selskapet .bo-graf canvas{ max-width:100%; }
#selskapet .bo-eiere{ display:flex; height:12px; border:1px solid #4a3d22; border-radius:2px; overflow:hidden; margin:4px 0 3px; background:#17120a; }
#selskapet .bo-eiere i{ display:block; height:100%; } #selskapet .bo-forkl{ font-size:12px; color:#a99e85; display:flex; flex-wrap:wrap; gap:4px 12px; margin-bottom:4px; }
#selskapet .bo-forkl b{ display:inline-block; width:9px; height:9px; margin-right:4px; border-radius:1px; vertical-align:-1px; }
#selskapet .bo-tall{ font-variant-numeric:tabular-nums; } #selskapet .bo-opp{ color:#a9c27a; } #selskapet .bo-ned{ color:#e7a593; }`;
  document.head.appendChild(css);
  const knapp = (tekst, sp, data = {}, kl = '') => `<button type="button" class="${kl}" data-sp="${sp}"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>${esc(tekst)}</button>`;
  const FARGE = { egne: '#c9b26a', fritt: '#7a7262', inv: '#8fa6c0', rød: '#c4574a', grønn: '#6fa860' };
  function eierStolpe() {
    const m = B.meg, deler = [['egne', 'Dere', m.egne], ['inv', 'Investorer', Bo.investorAndeler(B)], ['fritt', 'På børsen', m.fritt], ['rød', sidenavn('rød'), m.rival.rød], ['grønn', sidenavn('grønn'), m.rival.grønn]].filter(d => d[2] > .05);
    return `<div class="bo-eiere" title="Hvem som eier selskapet">${deler.map(d => `<i style="width:${d[2]}%;background:${FARGE[d[0]]}" title="${esc(d[1])} ${pst(d[2])}"></i>`).join('')}</div>`
      + `<div class="bo-forkl">${deler.map(d => `<span><b style="background:${FARGE[d[0]]}"></b>${esc(d[1])} ${pst(d[2])}</span>`).join('')}</div>`;
  }
  function fane() {
    if (!klar) start(); if (!klar) return '<p class="rolig">Velg leir først.</p>';
    const K = kurser(), m = B.meg, nv = nivå(), nå = nåMin(), børs = Bo.børsverdi(K.meg);
    let h = `<p class="rolig" style="margin:6px 0">Selskapets verdi og eierne. Fra nivå ${R.nivå.andeler} kan dere kjøpe andeler i firmaene og få investorer; fra nivå ${R.nivå.notering} kan selskapet noteres på Gråbørsen – en handelsplass for private militærselskaper, smuglere og skyggefond.</p>`;
    if (melding) h += `<p class="fi-melding">${esc(melding)}</p>`;
    if (m.oppkjøpt) h += `<div class="fi-boks"><h4>Kjøpt opp</h4><div class="fi-linje">${esc(sidenavn(m.oppkjøpt))} eier over halvparten av selskapet. Dere kan spille videre, men børsen er stengt for dere.</div></div>`;
    // kursen og grafen
    const st = m.stemning, sv = K.verdi;
    h += `<h3>Kursen${m.notert ? ' på Gråbørsen' : ' (anslått – ikke notert)'}</h3><div class="fi-boks"><div class="fi-linje">Kurs per andel <b class="bo-tall">${kr(K.meg)}</b> · børsverdi <b class="bo-tall">${mill(børs)}</b> · din del <b class="bo-tall">${mill(Bo.minDel(B, børs))}</b></div>`
      + `<div class="fi-linje">Stemningen <b class="${st >= 1 ? 'bo-opp' : 'bo-ned'}">${st >= 1 ? '+' : '−'}${pst(Math.abs(st - 1) * 100)}</b> · eiendeler ${mill(sv.eiendeler)} · ${ukeTekst(sv)}${sv.trygghet < 1 ? ` · angrep trekker ${pst((1 - sv.trygghet) * 100)}` : ''}</div>`
      + '<div class="bo-graf" data-bo-graf="1"></div><p class="fi-mangler">Opp: leverte kontrakter, nye byer, seire og eksport. Ned: brudd, tapte byer, angrep på leiren, et nei til eierne og utbytte som uteblir.</p></div>';
    // eierne
    h += '<h3>Eierne</h3><div class="fi-boks">' + eierStolpe();
    const sr = Bo.størsteRival(B); if (sr.andel >= 15) h += `<div class="fi-linje bo-ned">${esc(sidenavn(sr.side))} eier ${pst(sr.andel)}. Over 50 % kjøper de dere opp. Med 30 % eller mer kan dere ikke vinne på penger.</div>`;
    for (const e of Bo.aktiveEiere(B)) { const q = Bo.investor(e.id); h += `<div class="fi-linje">${esc(q ? q.navn : e.id)} eier ${pst(e.andel)} – en aktiv eier som stiller krav.</div>`; }
    // notering / utbytte / emisjon / tilbakekjøp
    if (!m.notert) { const kn = [10, 20, 30, 40].map(p => { const k = Bo.kanNotere(B, p, { nivå: nv }); return knapp(`Noter ${p} % (${mill(p * K.meg * (1 - R.notering.rabatt))})`, 'bo-noter', { p }, k.ok ? '' : 'av'); }).join('');
      const k0 = Bo.kanNotere(B, 10, { nivå: nv }); h += `<div class="fi-del">Notering på Gråbørsen</div><div class="fi-knapper">${kn}</div>` + (k0.ok ? `<p class="fi-mangler">Pengene kommer i kassa med en gang (investorene betaler ${Math.round((1 - R.notering.rabatt) * 100)} % av kursen). Dere beholder over 50 %.</p>` : `<p class="fi-mangler">Krever ${esc(k0.mangler.join(' og '))}.</p>`); }
    if (m.uke && !m.oppkjøpt) { const u = m.uke || { forventet: 0, betalt: 0, frist: nå }, igjen = Math.max(0, u.forventet - u.betalt), d = Math.max(0, Math.ceil((u.frist - nå) / DØGN));
      h += `<div class="fi-del">Utbytte denne uka</div><div class="fi-linje">Eierne venter <b>${kr(u.forventet)}</b> · betalt ${kr(u.betalt)} · ${d} døgn igjen</div><div class="fi-knapper">${igjen > 0 ? knapp(`Betal utbytte (${kr(igjen)})`, 'bo-utbytte', { kr: igjen }, 'hoved') : '<span class="fi-mangler">Betalt for uka.</span>'}${igjen > 0 ? '' : knapp(`Betal ekstra (${kr(Math.max(100000, u.forventet))})`, 'bo-utbytte', { kr: Math.max(100000, u.forventet) })}</div>`;
    }
    if (m.notert && !m.oppkjøpt) {
      const ke = Bo.kanEmisjon(B, 10); h += `<div class="fi-del">Emisjon og tilbakekjøp</div><div class="fi-knapper">${[5, 10, 15].map(q => knapp(`Emisjon ${q} % (${mill(q / (1 - q / 100) * K.meg * (1 - R.emisjon.rabatt))})`, 'bo-emisjon', { q }, Bo.kanEmisjon(B, q).ok ? (Bo.kanEmisjon(B, q).under50 ? 'svik' : '') : 'av')).join('')}`
        + `${m.fritt >= 1 ? knapp(`Kjøp tilbake 2 % (${mill(2 * K.meg * (1 + R.tilbakekjøp.påslag))})`, 'bo-tilbake', { n: 2 }) : ''}</div><p class="fi-mangler">Emisjon: nye andeler – mer penger, men dere eier en mindre del.${ke.ok ? '' : ' ' + esc(ke.mangler.join(', '))}</p>`; }
    h += '</div>';
    // investorene
    const inv = R.INVESTORER.map(q => ({ q, s: B.investorer[q.id] })).filter(x => x.s);
    h += `<h3>Investorer</h3>`;
    if (!inv.length) h += `<p class="rolig">${nv >= R.nivå.investor ? 'Ingen har ringt ennå. Investorene hører om dere når dere leverer.' : `Investorene ringer når selskapet er på nivå ${R.nivå.investor} «Etablert».`}</p>`;
    for (const { q, s } of inv) {
      h += `<div class="fi-boks"><h4>${esc(q.navn)}<small>${esc(q.hvem)}${s.status === 'eier' ? ` · eier ${pst(B.meg.inv[q.id] || 0)}` : s.status === 'långiver' ? ' · långiver' : s.status === 'nei' ? ' · sa nei' : s.status === 'solgt' ? ' · solgte seg ut' : ''}</small></h4>`;
      if (s.status === 'tilbud') h += `<div class="fi-linje">${esc(cap(q.tekst))}${s.kr ? ` – <b>${mill(s.kr)} for ${s.andel} %</b>` : ''}${s.lån ? ` – <b>${mill(s.lån.kr)}</b>, ${pst(s.lån.rente * 100)} i uka i ${s.lån.uker} uker` : ''}.</div><div class="fi-knapper">${knapp('Si ja', 'bo-inv', { id: q.id, ja: 1 }, 'hoved')}${knapp('Si nei', 'bo-inv', { id: q.id })}</div>`;
      else if (s.status !== 'nei') h += `<div class="fi-linje">Fornøyd: <b>${Math.round(s.tilfreds)}</b> av 100</div><div class="fi-maal"><i style="width:${Math.round(s.tilfreds)}%"></i></div>`;
      for (const ø of B.ønsker.filter(x => x.inv === q.id && x.status === 'aktiv')) h += `<div class="fi-ringer">${ø.krav ? 'Krav' : 'Ønske'}: ${esc(Bo.ønskeTekst(ø, { kr: B.meg.uke ? B.meg.uke.forventet : 0 }))} · ${Math.max(0, Math.ceil((ø.frist - nå) / DØGN))} døgn igjen</div>` + (ø.krav ? `<div class="fi-knapper">${knapp('Si nei til kravet (koster kurs)', 'bo-krav', { id: ø.id }, 'svik')}</div>` : '');
      h += '</div>';
    }
    for (const l of B.meg.lån.filter(x => !x.slutt)) { const q = Bo.investor(l.inv); h += `<div class="fi-linje">Lån fra ${esc(q ? q.navn : '')}: ${mill(l.kr)}, renter ${kr(l.kr * l.rente)} hver uke, ${l.igjen} ${l.igjen === 1 ? 'uke' : 'uker'} igjen.</div>`; }
    // andelene i firmaene
    h += `<h3>Andeler i firmaene <small>${nv >= R.nivå.andeler ? 'fra nivå 3' : `låst til nivå ${R.nivå.andeler}`}</small></h3>`;
    const L = Object.values(K.firma).filter(v => !v.f.konkurs).sort((a, b) => ((B.firmaer[b.f.navn] || {}).du || 0) - ((B.firmaer[a.f.navn] || {}).du || 0) || b.verdi - a.verdi);
    for (const v of L) {
      const n = v.f.navn, a = B.firmaer[n] || { du: 0, rød: 0, grønn: 0 }, vi = Bo.virkning(B, n), fri = Bo.fri(B, n), eier = Bo.eierAv(a);
      h += `<div class="fi-boks" data-bo-firma="${esc(n)}"><h4>${esc(n)}<small>verdi ${mill(v.verdi)} · kurs ${kr(v.kurs)}</small></h4>`
        + `<div class="fi-linje">Dere eier <b>${pst(a.du)}</b>${a.rød ? ` · ${esc(sidenavn('rød'))} ${pst(a.rød)}` : ''}${a.grønn ? ` · ${esc(sidenavn('grønn'))} ${pst(a.grønn)}` : ''} · resultat ${kr(v.resultat)} per uke${v.trygghet < 1 ? ' · krigen trekker ned' : ''}</div>`;
      const gir = []; if (vi.rabatt < 1) gir.push('5 % rabatt'); if (vi.innsyn) gir.push('innsyn'); if (vi.førsterett) gir.push('førsterett'); if (vi.eier) gir.push('dere eier firmaet');
      if (eier && eier !== ID) h += `<div class="fi-linje bo-ned">Eid av ${esc(sidenavn(eier))} – ingen samarbeid med dere.</div>`;
      else if (gir.length) h += `<div class="fi-linje">Gir: <b>${esc(gir.join(', '))}</b></div>`;
      if (vi.innsyn) { const { S } = selskap(), T = S && S.tilbud ? S.tilbud.filter(k => k.giver && k.giver.navn === n) : []; h += `<div class="fi-linje">Innsyn: ${T.length ? `${T.length} ${T.length === 1 ? 'kontrakt' : 'kontrakter'} ute (${kr(T.reduce((s, k) => s + (k.betaling || 0), 0))})` : 'ingen kontrakter ute nå'} · helse ${Math.round(v.f.helse)}</div>`; }
      const kn = nv < R.nivå.andeler ? '' : [5, 10].filter(x => x <= fri + 1e-9).map(x => knapp(`Kjøp ${x} % (${kr(Math.round(x * v.kurs * (1 + R.firma.kjøp) / 1000) * 1000)})`, 'bo-kjop', { navn: n, n: x })).join('')
        + (a.du > 0 ? knapp(`Selg ${Math.min(5, a.du)} %`, 'bo-selg', { navn: n, n: Math.min(5, a.du) }) : '');
      h += `<div class="fi-knapper">${kn}</div></div>`;
    }
    // rivalene på børsen
    h += '<h3>Rivalene på Gråbørsen</h3>';
    for (const s of ['rød', 'grønn']) { const r = B.rivaler[s], k = K[s];
      h += `<div class="fi-boks"><h4>${esc(sidenavn(s))}<small>kurs ${kr(k)} · børsverdi ${mill(Bo.børsverdi(k))}</small></h4><div class="fi-linje">Dere eier <b>${pst(r.du)}</b> · ${pst(r.fritt)} på børsen · eier ${pst(B.meg.rival[s])} av dere</div>`
        + (nv >= R.nivå.notering ? `<div class="fi-knapper">${r.fritt >= 2 ? knapp(`Kjøp 2 % (${mill(2 * k * (1 + R.firma.kjøp))})`, 'bo-rival', { side: s, n: 2 }) : ''}${r.du > 0 ? knapp('Selg 2 %', 'bo-rival', { side: s, n: Math.min(2, r.du), salg: 1 }) : ''}${knapp(`Spre rykter (${kr(R.rykte.pris)})`, 'bo-rykte', { side: s }, 'svik')}</div>` : `<p class="fi-mangler">Børsen åpner for dere på nivå ${R.nivå.notering}.</p>`) + '</div>'; }
    return h;
  }
  // etter at fanen er tegnet: kursgrafen
  function etter(el) { const g = el && el.querySelector('[data-bo-graf]'); if (!g || g.dataset.tegnet === String(dagNå())) return; kilder(); try { if (window.StatistikkSpill && StatistikkSpill.graf) { StatistikkSpill.graf(g, 'kurs', { bredde: Math.min(560, (el.clientWidth || 360) - 30) }); g.dataset.tegnet = String(dagNå()); } } catch (e) { /* uten graf */ } }
  function trykk(b) {
    const s = b.dataset.sp, d = b.dataset;
    if (s === 'bo-kjop') { kom({ type: 'borsKjøp', navn: d.navn, n: +d.n }); return true; }
    if (s === 'bo-selg') { kom({ type: 'borsSelg', navn: d.navn, n: +d.n }); return true; }
    if (s === 'bo-noter') { kom({ type: 'borsNoter', p: +d.p }); return true; }
    if (s === 'bo-utbytte') { kom({ type: 'borsUtbytte', kr: +d.kr }); return true; }
    if (s === 'bo-emisjon') { kom({ type: 'borsEmisjon', q: +d.q }); return true; }
    if (s === 'bo-tilbake') { kom({ type: 'borsTilbakekjøp', n: +d.n }); return true; }
    if (s === 'bo-rival') { kom({ type: 'borsRival', side: d.side, n: +d.n, salg: !!d.salg }); return true; }
    if (s === 'bo-rykte') { kom({ type: 'borsRykte', side: d.side }); return true; }
    if (s === 'bo-inv') { kom({ type: 'borsInvestor', id: d.id, ja: !!d.ja }); return true; }
    if (s === 'bo-krav') { kom({ type: 'borsKrav', id: d.id }); return true; }
    return false;
  }
  // flisene i Oversikt: verdi og kurs (selskapspanel.js setter dem inn i lista)
  function flisLinjer() {
    if (!klar) start(); if (!klar) return []; const K = kurser(), børs = Bo.børsverdi(K.meg), st = B.meg.stemning;
    return [['Verdi', mill(Bo.minDel(B, børs)), B.meg.egne < 100 ? `dere eier ${pst(B.meg.egne)} av ${mill(børs)}` : 'børsverdien'],
      ['Kurs', kr(K.meg), `${B.meg.notert ? 'Gråbørsen' : 'anslått'} · ${st >= 1 ? '+' : '−'}${pst(Math.abs(st - 1) * 100)}`, st >= 1 ? 'pluss' : 'minus']];
  }
  // til seier-visning.js: verdiene og oppkjøpet
  function seierInn() { if (!klar) start(); if (!klar) return null; const K = kurser(); return Bo.seierInn(B, { meg: K.meg, rød: K.rød, grønn: K.grønn }); }

  Object.assign(api, { tilstand: () => B, sett: d => { B = Bo.fraJSON(d) || B; if (!Array.isArray(B.angrep)) B.angrep = []; lagre(); }, nullstill: () => { const s = Sp(); B = Bo.ny(s && s.leir); B.angrep = []; lagre(); },
    start, lagre, døgn, kurser, seierInn, rivalKjøp, fane, etter, trykk, flisLinjer, klar: () => klar, kamp, NØKKEL,
    rett: { kjøp: kjøpRett, selg: selgRett, noter: noterRett, utbytte: utbytteRett, emisjon: emisjonRett, tilbakekjøp: tilbakeRett, rival: rivalRett, rykte: rykteRett, investor: investorRett, krav: kravRett } });
  window.BorsSpill = api;
})();
