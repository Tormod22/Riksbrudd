/* Riksbrudd – INVESTERE OG GRÅBØRSEN (fase Ø7, 28. nov; docs/plan-selskap-okonomi.md kapittel 9 og 10). Regler uten DOM
 * (Node: require('./bors'); nettleser: globalThis.Bors). Visningen: spill/bors-visning.js (window.BorsSpill).
 *
 * Kapittel 18, spørsmål 3 og 4: forslagene er brukt – børsen heter «Gråbørsen», notering fra nivå 4 (Ettertraktet), og en rival KAN
 * kjøpe opp selskapet ditt (da har den vunnet på «penger»).
 *
 * VERDI OG ANDELER: hvert selskap (ditt, firmaene i spill/firma.js, Ravnsund og Mosevakt) har en verdi og 100 andeler.
 *   - Firmaene: grunnverdi per firma × økonomien (helsa) × trygghet rundt hjemstedet (rival eier byen, fiende nær, kamp) × handelen med dere.
 *     Resultatet per uke (7 spilldøgn) er en del av verdien; eierne får utbytte av det. Konkurs = verdt 0.
 *   - Ditt selskap: eiendelene (kassa, bygg, lager, kjøretøy – som spill/seier.js – pluss andelene dine i andre) + ukas resultat,
 *     ganget med tryggheten (angrep på leiren den siste uka trekker ned).
 *   - Rivalene: anslaget fra spill/seier.js (kassa, hovedkvarter, tettsteder, lag, kjøretøy).
 *   KURSEN per andel = verdi / 100 × stemningen. Stemningen (0,5–1,8) flytter seg hvert døgn: opp ved leverte kontrakter, nye byer, seire
 *   og eksport; ned ved brudd, tapte byer, angrep på leiren, et «nei» til en eier, utbytte som uteblir og rykter. Den drar sakte mot 1.
 * ANDELER I FIRMAENE (fra nivå 3): kjøp og salg til kursen (med kurtasje). 10 % = 5 % rabatt + innsyn i kontraktene deres, 25 % =
 *   førsterett (rivalene tar ikke tilbudene deres), over 50 % = dere eier firmaet: hele resultatet og varene fra hjemstedet kommer til dere.
 *   Rivalene kjøper også – særlig Storlia Tømmer. Får en rival over halvparten, er firmaet deres, og samarbeidet med dere tar slutt.
 * INVESTORENE (fra nivå 3): tre oppdiktede henvendelser – en utenlandsk rederi-eier, et svensk sikkerhetsfirma og et anonymt fond. De tilbyr
 *   penger for en andel eller et lån med rente, og har et ØNSKE (et oppdrag i Neste-lappen): avkastning, ro rundt leiren, hold dere unna en
 *   rival, eller lever en bestemt slags kontrakt. Holdt = de blir fornøyde (kursen stiger), brutt = de blir misfornøyde og kan selge til en rival.
 * GRÅBØRSEN (fra nivå 4): notering (selg 10–40 %, dere beholder over 50 %), utbytte hver uke (eierne venter noe), emisjon (nye andeler – dere
 *   eier en mindre del), tilbakekjøp, rivalene er notert (dere kan kjøpe i dem og de i dere). Eier en rival over 50 %, er dere KJØPT OPP.
 *   Aktive eiere (over 15 %) stiller krav. Å spre rykter om en rival er mulig, men koster «pålitelig».
 * ALLE TALL ER CLAUDES FORSLAG (spillverdier, ikke fasit) – samlet i REGLER.
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const tall = (v, r = 0) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : r);
  const avrund = (kr, n = 10000) => Math.round(kr / n) * n;
  const en = v => Math.round(v * 10) / 10;
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function lagRand(frø) { let a = (frø >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const kroner = v => Math.round(v).toLocaleString('nb-NO').replace(/ | /g, ' ') + ' kr';
  const mill = v => { const m = tall(v) / 1e6; return (Math.abs(m) >= 100 ? String(Math.round(m)) : String(Math.round(m * 10) / 10).replace('.', ',')) + ' mill. kr'; };
  const DØGN = 1440, UKE = 7;
  const RIVALER = { rød: 'Ravnsund', grønn: 'Mosevakt' };

  // ---------- tallene (alle er Claudes forslag) ----------
  const REGLER = {
    versjon: 1,
    andeler: 100,
    // nivået i spill/selskap.js som låser opp: kjøp av andeler og investorer (3 Etablert), notering (4 Ettertraktet)
    nivå: { andeler: 3, investor: 3, notering: 4 },
    uke: UKE,
    firma: {
      // grunnverdien (kr) når firmaet går normalt (helse 68 i spill/firma.js); nye firmaer i byene
      grunn: { 'Gråfjell Frakt': 14e6, 'Tindvik Drivstoff': 18e6, 'Brattli Mineral': 16e6, 'Dalsnes Kraftlag': 22e6, 'Kvernhaug Mølle': 10e6, 'Storlia Tømmer': 20e6, 'Ytterø Sjømat': 12e6 },
      nyGrunn: 6e6,
      helseStart: 68,
      // trygghet rundt hjemstedet (ganges): en rival holder byen, fiende innen 3 km / 8 km, kamp der siste døgn
      fiendeEier: .6, fiendeNær: .85, fiendeLangt: .95, kamp: .9,
      // handelen med dere: + per levert kontrakt for firmaet, høyst tak
      perLevert: .02, levertTak: .3,
      // resultatet per uke som del av verdien, etter økonomien; så mye av resultatet som deles ut til eierne
      avkastning: .05, økonomi: { frisk: 1, presset: .4, konkurstruet: 0, konkurs: 0 }, utdeling: .8,
      // kurtasje: dere betaler kursen + kjøp, får kursen − salg
      kjøp: .04, salg: .04,
      // grensene: rabatt og innsyn, førsterett, eie
      rabattFra: 10, rabatt: .95, innsynFra: 10, førsterettFra: 25, eieOver: 50,
      // et firma dere eier, sender varer fra hjemstedet hvert døgn (per bransje; kroner når varen ikke finnes i leiren)
      varer: { tømmer: { tømmer: 6 }, mat: { mat: 30 }, drivstoff: { diesel: 400 }, gruve: { stein: 8 }, sjømat: { mat: 25 }, bygg: { planker: 4 }, kraft: { kr: 40000 }, frakt: { kr: 30000 }, verksted: { stål: 1 }, handel: { kr: 25000 } },
    },
    selskap: {
      // ukas resultat (netto inn − ut siste 7 døgn) regnes inn i verdien, men trekker høyst 30 % av eiendelene ned
      inntektUker: 1, inntektGulv: -.3,
      // et angrep på leiren den siste uka: × (1 − angrep), høyst angrepTak
      angrep: .05, angrepTak: .2,
    },
    // stemningen (ganges med kursen): grenser, hvor fort den drar mot 1 per døgn, og hva hendelsene gjør
    // (økonomitesten 28. nov: med +3 % per levert kontrakt og 8 % tilbake per døgn lå stemningen fast på ca. 1,6 for en som leverte hver dag –
    // nå ca. 1,1)
    stemning: { start: 1, min: .5, maks: 1.8, tilbake: .15,
      levert: .01, by: .03, tapt: -.04, seier: .005, eksport: .01, brudd: -.05, angrep: -.04, rykte: -.03, nei: -.05, utbytteBetalt: .01, utbytteUte: -.08, ønskeHoldt: .02, ønskeBrutt: -.03 },
    // rabatt: investorene betaler kursen minus Gråbørsens meglere og «tilretteleggere» (økonomitesten 28. nov: 10 % ga for mye kontanter på én gang)
    notering: { min: 10, maks: 40, beholde: 50, rabatt: .15 },
    // utbytte: eierne utenfor venter så stor del av sin del av børsverdien hver uke
    utbytte: { forventet: .015 },
    emisjon: { maks: 15, rabatt: .12, minEgne: 35 },
    tilbakekjøp: { påslag: .06 },
    rival: {
      // rivalene: de er notert fra start med fritt av andelene sine på børsen
      fritt: 40,
      // sjanse per døgn for at en rival kjøper andeler i et firma (Storlia teller tre ganger), og hvor mange
      firmaSjanse: .25, firmaVekt: { 'Storlia Tømmer': 3 }, firmaKjøp: [2, 5],
      // sjanse per døgn for at en rival kjøper av de frie andelene i dere (× 2 når dere eier under halvparten, × 1,5 når kursen er lav)
      megSjanse: .2, megKjøp: [1, 3], lavKurs: .8,
      // en misfornøyd investor (under misfornøyd) selger alt til en rival
      misfornøyd: 25,
    },
    investor: {
      // henvendelsene kommer når nivået er nådd: én ny per døgn med sjanse, og de ringer bare én gang hver
      sjanse: .35,
      start: 60, holdt: 15, brutt: -20, nei: -10, utbytteUte: -10, utbytteBetalt: 3,
      // et lån: rente per uke, antall uker, betales tilbake på slutten; ikke betalt = andeler til kursen
      // aktive eiere (over 15 %) stiller et nytt krav hver uke
      aktivFra: 15,
    },
    // tre oppdiktede investorer (Claudes forslag – ikke ekte personer eller firmaer)
    INVESTORER: [
      { id: 'rederi', navn: 'Aurelio Brandt', hvem: 'rederi-eier i Valletta', tilbud: { andel: 10, kr: null }, lån: null, ønske: 'avkastning',
        tekst: 'vil ha 10 % av selskapet – og noe tilbake hver uke' },
      { id: 'vakt', navn: 'Grenvik Säkerhet AB', hvem: 'svensk sikkerhetsfirma', tilbud: null, lån: { kr: 12e6, rente: .02, uker: 4 }, ønske: 'unna',
        tekst: 'låner dere 12 mill. kr til 2 % i uka – mot at dere holder dere unna Ravnsund' },
      { id: 'fond', navn: 'Fond 7', hvem: 'et anonymt fond', tilbud: { andel: 16, kr: null }, lån: null, ønske: 'kontrakt',
        tekst: 'vil kjøpe 16 % – og ønsker seg en bestemt slags kontrakt' },
    ],
    // ønskene: varighet (døgn) og hva som må til
    ØNSKER: {
      avkastning: { døgn: 7, tekst: 'Betal utbytte på minst {kr} denne uka', kr: .01 },
      ro: { døgn: 5, tekst: 'Ro rundt leiren: ingen angrep på leiren i {døgn} døgn' },
      unna: { døgn: 7, tekst: 'Hold dere unna {rival}: ingen kamp med dem i {døgn} døgn' },
      kontrakt: { døgn: 8, tekst: 'Lever en {type}-kontrakt innen {døgn} døgn' },
    },
    // ryktespredning om en rival: pris, kursen deres, og prisen i «pålitelig»
    rykte: { pris: 250000, kurs: -.08, pålitelig: -2 },
  };
  const OPPDRAGSTYPER = ['eskorte', 'hold', 'rydd', 'redning'];

  // ---------- tilstanden ----------
  function nyttFirma() { return { du: 0, rød: 0, grønn: 0, eier: null, stemning: 1, utbytte: 0 }; }
  function ny(leir) {
    return { versjon: REGLER.versjon, leir: leir ? { x: Math.round(leir.x), y: Math.round(leir.y) } : null, dag: -1,
      meg: { egne: 100, fritt: 0, rival: { rød: 0, grønn: 0 }, inv: {}, notert: false, notertDag: null, stemning: 1, kurs: 0, oppkjøpt: null,
        uke: null, lån: [], kravNei: 0 },
      firmaer: {},
      rivaler: { rød: { stemning: 1, du: 0, fritt: REGLER.rival.fritt, byer: null }, grønn: { stemning: 1, du: 0, fritt: REGLER.rival.fritt, byer: null } },
      investorer: {}, ønsker: [], nr: 0,
      tellere: { levert: null, brutt: null, byer: null, angrep: null, seire: null, eksport: null },
      hendelser: [] };
  }
  const firma = (B, navn) => B.firmaer[navn] || (B.firmaer[navn] = nyttFirma());
  // dine andeler i dere selv + alle andre: summen er alltid 100
  const ute = B => 100 - B.meg.egne;
  const investorAndeler = B => Object.values(B.meg.inv).reduce((s, n) => s + tall(n), 0);
  function sjekkSum(B) { const m = B.meg, s = m.egne + m.fritt + m.rival.rød + m.rival.grønn + investorAndeler(B); return Math.abs(s - 100) < .05; }

  // ---------- verdiene ----------
  // f = firmaet fra spill/firma.js (helse, levert, konkurs, bransje), k = krigen rundt hjemstedet { fiendeEier, fiendeKm, kamp }
  function firmaVerdi(f, k = {}, R = REGLER.firma) {
    if (!f || f.konkurs) return { verdi: 0, resultat: 0, trygghet: 0 };
    const g = R.grunn[f.navn] || R.nyGrunn, h = klem(tall(f.helse, R.helseStart), 0, 100), øk = (.3 + .7 * h / 100) / (.3 + .7 * R.helseStart / 100);
    let t = 1; if (k.fiendeEier) t *= R.fiendeEier; if (Number.isFinite(k.fiendeKm)) t *= k.fiendeKm <= 3 ? R.fiendeNær : k.fiendeKm <= 8 ? R.fiendeLangt : 1; if (k.kamp) t *= R.kamp;
    const handel = 1 + Math.min(R.levertTak, tall(f.levert) * R.perLevert), verdi = avrund(g * øk * t * handel);
    const ø = h >= 55 ? 'frisk' : h >= 25 ? 'presset' : 'konkurstruet';
    return { verdi, resultat: avrund(verdi * R.avkastning * (R.økonomi[ø] || 0), 1000), trygghet: t, økonomi: ø };
  }
  // kursen per andel (kr)
  const kurs = (verdi, stemning) => Math.max(0, Math.round(tall(verdi) / REGLER.andeler * klem(tall(stemning, 1), REGLER.stemning.min, REGLER.stemning.maks)));
  // ditt selskap: d = { eiendeler (kassa, bygg, lager, kjøretøy – kr), andeler (kr, andelene dine i andre), ukeNetto (kr), angrep (antall siste uke) }
  function selskapVerdi(d, R = REGLER.selskap) {
    const eiend = Math.max(0, tall(d && d.eiendeler)) + Math.max(0, tall(d && d.andeler));
    const inntekt = Math.max(R.inntektGulv * eiend, tall(d && d.ukeNetto) * R.inntektUker);
    const trygg = 1 - Math.min(R.angrepTak, Math.max(0, tall(d && d.angrep)) * R.angrep);
    return { verdi: avrund(Math.max(0, (eiend + inntekt) * trygg)), eiendeler: eiend, inntekt, trygghet: trygg };
  }
  // børsverdien = kursen × 100. Din del (det seier-veien «penger» teller) = børsverdien × andelen dere eier selv
  const børsverdi = k => tall(k) * REGLER.andeler;
  function minDel(B, børs) { return Math.round(tall(børs) * B.meg.egne / 100); }

  // ---------- stemningen ----------
  // hendelsene siden sist (tall) -> endringen i stemningen. teller: { levert, brutt, byer (+/−), angrep, seire, eksport }
  function stemningEndring(d) {
    const S = REGLER.stemning; let e = 0;
    e += tall(d.levert) * S.levert + tall(d.brutt) * S.brudd + tall(d.angrep) * S.angrep + tall(d.seire) * S.seier + tall(d.eksport) * S.eksport;
    const b = tall(d.byer); e += b > 0 ? b * S.by : -b * S.tapt;
    return e;
  }
  function endreStemning(o, d) { o.stemning = klem(en((tall(o.stemning, 1) + d) * 100) / 100, REGLER.stemning.min, REGLER.stemning.maks); return o.stemning; }
  // hvert døgn drar stemningen mot 1
  function tilbake(o) { const T = REGLER.stemning.tilbake, s = tall(o.stemning, 1); o.stemning = Math.round((s + (1 - s) * T) * 1000) / 1000; return o.stemning; }
  // tellerne fra spillet (summer så langt) -> forskjellen siden sist (første gang: 0)
  function tellerForskjell(B, nå) {
    const T = B.tellere, ut = {};
    for (const k of Object.keys(T)) { const v = nå[k]; if (!Number.isFinite(v)) continue; ut[k] = T[k] === null ? 0 : v - T[k]; T[k] = v; }
    if (ut.levert < 0) ut.levert = 0; if (ut.brutt < 0) ut.brutt = 0; if (ut.angrep < 0) ut.angrep = 0; if (ut.seire < 0) ut.seire = 0; if (ut.eksport < 0) ut.eksport = 0;
    return ut;
  }

  // ---------- andeler i firmaene ----------
  const fri = (B, navn) => { const a = firma(B, navn); return en(100 - a.du - a.rød - a.grønn); };
  // hva andelen gir: { rabatt, innsyn, førsterett, eier }
  function virkning(B, navn) {
    const a = B.firmaer[navn], R = REGLER.firma, n = a ? a.du : 0;
    return { andel: n, rabatt: n >= R.rabattFra ? R.rabatt : 1, innsyn: n >= R.innsynFra, førsterett: n >= R.førsterettFra, eier: n > R.eieOver };
  }
  // hvem som eier firmaet (over halvparten): 'blå', 'rød', 'grønn' eller null
  function eierAv(a) { const R = REGLER.firma; if (!a) return null; if (a.du > R.eieOver) return 'blå'; for (const s of ['rød', 'grønn']) if (a[s] > R.eieOver) return s; return null; }
  // kan dere kjøpe n andeler i firmaet? nivå = selskapets nivå
  function kanKjøpe(B, navn, n, o = {}) {
    const m = [], R = REGLER;
    if (tall(o.nivå, 1) < R.nivå.andeler) m.push(`nivå ${R.nivå.andeler} «Etablert»`);
    if (o.konkurs) m.push('firmaet er konkurs');
    if (!(n > 0)) m.push('et antall andeler');
    if (n > fri(B, navn) + 1e-9) m.push(`bare ${fri(B, navn)} andeler er til salgs`);
    return { ok: !m.length, mangler: m };
  }
  // kjøp/salg: pris per andel (kursen) -> { ok, kr } (visningen betaler eller gir pengene)
  function kjøp(B, navn, n, kursKr, o = {}) {
    const k = kanKjøpe(B, navn, n, o); if (!k.ok) return { ok: false, grunn: k.mangler.join(' og ') };
    const a = firma(B, navn), kr = avrund(n * kursKr * (1 + REGLER.firma.kjøp), 1000), før = eierAv(a); a.du = en(a.du + n);
    return { ok: true, kr, eierFør: før, eier: eierAv(a) };
  }
  function selg(B, navn, n, kursKr) {
    const a = B.firmaer[navn]; if (!a || !(n > 0) || n > a.du + 1e-9) return { ok: false, grunn: 'Dere har ikke så mange andeler.' };
    const før = eierAv(a); a.du = en(a.du - n); return { ok: true, kr: avrund(n * kursKr * (1 - REGLER.firma.salg), 1000), eierFør: før, eier: eierAv(a) };
  }
  // ukas utbytte fra et firma: { kr } for andelen deres (et firma dere eier, gir i stedet hele resultatet hvert døgn – se døgnet)
  const utbytteFirma = (andel, resultat) => avrund(tall(resultat) * REGLER.firma.utdeling * tall(andel) / 100, 1000);

  // ---------- ditt selskap på Gråbørsen ----------
  function kanNotere(B, p, o = {}) {
    const R = REGLER.notering, m = [];
    if (B.meg.notert) m.push('selskapet er alt notert');
    if (tall(o.nivå, 1) < REGLER.nivå.notering) m.push(`nivå ${REGLER.nivå.notering} «Ettertraktet»`);
    if (!(p >= R.min && p <= R.maks)) m.push(`mellom ${R.min} og ${R.maks} %`);
    else if (B.meg.egne - p <= R.beholde) m.push(`dere må beholde over ${R.beholde} %`);
    if (B.meg.oppkjøpt) m.push('selskapet er kjøpt opp');
    return { ok: !m.length, mangler: m };
  }
  // notering: p % selges til investorer på Gråbørsen. Gir { ok, kr }
  function noter(B, p, kursKr, nå, o = {}) {
    const k = kanNotere(B, p, o); if (!k.ok) return { ok: false, grunn: k.mangler.join(' og ') };
    const m = B.meg; m.egne = en(m.egne - p); m.fritt = en(m.fritt + p); m.notert = true; m.notertDag = Math.floor(tall(nå) / DØGN);
    m.uke = nyUke(B, nå, kursKr);
    return { ok: true, kr: avrund(p * kursKr * (1 - REGLER.notering.rabatt)) };
  }
  // ukas utbytte: det eierne utenfor venter (kr) og fristen
  function forventetUtbytte(B, kursKr) { return avrund(børsverdi(kursKr) * ute(B) / 100 * REGLER.utbytte.forventet); }
  function nyUke(B, nå, kursKr) { return { fra: Math.round(tall(nå)), frist: Math.round(tall(nå)) + UKE * DØGN, forventet: forventetUtbytte(B, kursKr), betalt: 0 }; }
  function betalUtbytte(B, kr) { const u = B.meg.uke; if (!u) return { ok: false, grunn: 'Dere har ingen eiere utenfra ennå.' }; if (!(kr > 0)) return { ok: false, grunn: 'Ingen sum.' }; u.betalt += Math.round(kr); return { ok: true, kr: Math.round(kr) }; }
  // emisjon: q % nye andeler (av det nye totalen) – alle eiere eier en mindre del. Gir { ok, kr }
  function kanEmisjon(B, q) {
    const R = REGLER.emisjon, m = [];
    if (!B.meg.notert) m.push('selskapet må være notert');
    if (!(q > 0 && q <= R.maks)) m.push(`høyst ${R.maks} % om gangen`);
    else if (B.meg.egne * (1 - q / 100) < R.minEgne) m.push(`dere ville eid under ${R.minEgne} %`);
    if (B.meg.oppkjøpt) m.push('selskapet er kjøpt opp');
    return { ok: !m.length, mangler: m, under50: B.meg.egne * (1 - q / 100) <= 50 };
  }
  function emisjon(B, q, kursKr) {
    const k = kanEmisjon(B, q); if (!k.ok) return { ok: false, grunn: k.mangler.join(' og ') };
    const m = B.meg, f = 1 - q / 100;
    m.egne = en(m.egne * f); m.rival.rød = en(m.rival.rød * f); m.rival.grønn = en(m.rival.grønn * f);
    for (const id of Object.keys(m.inv)) m.inv[id] = en(m.inv[id] * f);
    m.fritt = en(100 - m.egne - m.rival.rød - m.rival.grønn - investorAndeler(B));
    return { ok: true, kr: avrund(q / (1 - q / 100) * kursKr * (1 - REGLER.emisjon.rabatt)), under50: m.egne <= 50 };
  }
  function tilbakekjøp(B, n, kursKr) {
    const m = B.meg; if (!m.notert) return { ok: false, grunn: 'Selskapet er ikke notert.' }; if (!(n > 0) || n > m.fritt + 1e-9) return { ok: false, grunn: `Bare ${m.fritt} andeler er på børsen.` };
    m.fritt = en(m.fritt - n); m.egne = en(m.egne + n); return { ok: true, kr: avrund(n * kursKr * (1 + REGLER.tilbakekjøp.påslag)) };
  }
  // andeler i rivalene
  function kjøpRival(B, side, n, kursKr) {
    const r = B.rivaler[side]; if (!r) return { ok: false, grunn: 'Ukjent rival.' }; if (!(n > 0) || n > r.fritt + 1e-9) return { ok: false, grunn: `Bare ${r.fritt} av andelene deres er på børsen.` };
    r.fritt = en(r.fritt - n); r.du = en(r.du + n); return { ok: true, kr: avrund(n * kursKr * (1 + REGLER.firma.kjøp), 1000) };
  }
  function selgRival(B, side, n, kursKr) {
    const r = B.rivaler[side]; if (!r || !(n > 0) || n > r.du + 1e-9) return { ok: false, grunn: 'Dere har ikke så mange andeler.' };
    r.du = en(r.du - n); r.fritt = en(r.fritt + n); return { ok: true, kr: avrund(n * kursKr * (1 - REGLER.firma.salg), 1000) };
  }
  // ryktespredning: rivalens stemning ned, deres «pålitelig» ned
  function rykte(B, side) { const r = B.rivaler[side]; if (!r) return { ok: false, grunn: 'Ukjent rival.' }; endreStemning(r, REGLER.rykte.kurs); return { ok: true, pris: REGLER.rykte.pris, pålitelig: REGLER.rykte.pålitelig }; }
  // hvem eier mest av ditt selskap utenom dere: { side, andel }
  function størsteRival(B) { const r = B.meg.rival; return r.rød >= r.grønn ? { side: 'rød', andel: r.rød } : { side: 'grønn', andel: r.grønn }; }

  // ---------- investorene ----------
  const investor = id => REGLER.INVESTORER.find(q => q.id === id) || null;
  function nyttØnske(B, id, type, nå, rand) {
    const W = REGLER.ØNSKER[type]; if (!W) return null; const r = rand || lagRand(hash('ønske:' + id + ':' + B.nr + ':' + Math.round(tall(nå))));
    const ø = { id: 'ø' + (++B.nr), inv: id, type, fra: Math.round(nå), frist: Math.round(nå) + W.døgn * DØGN, status: 'aktiv' };
    if (type === 'unna') ø.rival = r() < .6 ? 'rød' : 'grønn';
    if (type === 'kontrakt') ø.oppdrag = OPPDRAGSTYPER[Math.floor(r() * OPPDRAGSTYPER.length) % OPPDRAGSTYPER.length];
    if (type === 'avkastning') ø.kr = 0;
    B.ønsker.push(ø); return ø;
  }
  function ønskeTekst(ø, o = {}) {
    const W = REGLER.ØNSKER[ø.type]; if (!W) return ''; const døgn = Math.max(1, Math.round((ø.frist - ø.fra) / DØGN));
    return W.tekst.replace('{kr}', kroner(tall(o.kr, ø.kr))).replace('{døgn}', døgn).replace('{rival}', RIVALER[ø.rival] || 'rivalen').replace('{type}', ø.oppdrag || 'bestemt');
  }
  // en henvendelse: { inv, tilbud: { andel, kr } | lån: { kr, rente, uker } } – kr for andelen settes etter kursen
  function henvendelse(B, nivå, nå, kursKr, rand) {
    const r = rand || lagRand(Math.floor(tall(nå)) + 9133); if (tall(nivå, 1) < REGLER.nivå.investor || B.meg.oppkjøpt) return null;
    const ledig = REGLER.INVESTORER.filter(q => !B.investorer[q.id]); if (!ledig.length || r() >= REGLER.investor.sjanse) return null;
    const q = ledig[0], h = { status: 'tilbud', tid: Math.round(nå), tilfreds: REGLER.investor.start };
    if (q.tilbud) { const n = Math.min(q.tilbud.andel, Math.max(0, B.meg.egne - 51)); if (n < 1) { B.investorer[q.id] = { status: 'nei', tid: Math.round(nå), tilfreds: 50 }; return null; } h.andel = n; h.kr = avrund(n * kursKr); }
    if (q.lån) h.lån = { ...q.lån };
    B.investorer[q.id] = h; return { inv: q, h };
  }
  // svar på en henvendelse: ja -> { ok, kr (inn i kassa) }; nei -> investoren går
  function svarInvestor(B, id, ja, nå, rand) {
    const q = investor(id), h = B.investorer[id]; if (!q || !h || h.status !== 'tilbud') return { ok: false, grunn: 'Ingen slik henvendelse.' };
    if (!ja) { h.status = 'nei'; return { ok: true, kr: 0 }; }
    let kr = 0;
    if (h.andel) { if (B.meg.egne - h.andel <= 50) return { ok: false, grunn: 'Dere må beholde over 50 %.' };
      B.meg.egne = en(B.meg.egne - h.andel); B.meg.inv[id] = en(tall(B.meg.inv[id]) + h.andel); kr = h.kr; h.status = 'eier';
      // eierne utenfra venter utbytte hver uke – også før selskapet er notert
      if (!B.meg.uke) B.meg.uke = nyUke(B, nå, h.kr / h.andel); }
    if (h.lån) { B.meg.lån.push({ id: 'l' + (++B.nr), inv: id, kr: h.lån.kr, rente: h.lån.rente, uker: h.lån.uker, neste: Math.round(nå) + UKE * DØGN, igjen: h.lån.uker }); kr += h.lån.kr; h.status = h.andel ? 'eier' : 'långiver'; }
    const ø = nyttØnske(B, id, q.ønske, nå, rand); return { ok: true, kr, ønske: ø };
  }
  // er ønsket holdt eller brutt? sjekk = { utbytte (kr betalt denne uka), angrepSiden (antall angrep på leiren siden ønsket kom),
  //   kampMed: { rød, grønn } (sist dere og rivalen skjøt på hverandre, spillminutter), levert: [{ type, tid }] } -> 'holdt' | 'brutt' | null
  function vurderØnske(ø, nå, s = {}) {
    if (ø.status !== 'aktiv') return null; const slutt = nå >= ø.frist;
    if (ø.type === 'avkastning') { const mål = tall(s.forventet); if (mål > 0 && tall(s.utbytte) >= mål) return 'holdt'; return slutt ? 'brutt' : null; }
    if (ø.type === 'ro') { if (tall(s.angrepSiden) > 0) return 'brutt'; return slutt ? 'holdt' : null; }
    if (ø.type === 'unna') { const k = s.kampMed ? s.kampMed[ø.rival] : null; if (Number.isFinite(k) && k >= ø.fra) return 'brutt'; return slutt ? 'holdt' : null; }
    if (ø.type === 'kontrakt') { if ((s.levert || []).some(k => k.type === ø.oppdrag && k.tid >= ø.fra)) return 'holdt'; return slutt ? 'brutt' : null; }
    return slutt ? 'holdt' : null;
  }
  // avslutt et ønske: holdt/brutt/nei -> tilfredshet og stemning. Gir endringen i stemningen
  function lukkØnske(B, ø, utfall) {
    const h = B.investorer[ø.inv], I = REGLER.investor, S = REGLER.stemning; ø.status = utfall;
    if (h) h.tilfreds = klem(h.tilfreds + (utfall === 'holdt' ? I.holdt : utfall === 'nei' ? I.nei : I.brutt), 0, 100);
    const d = utfall === 'holdt' ? S.ønskeHoldt : utfall === 'nei' ? S.nei : S.ønskeBrutt; endreStemning(B.meg, d); return d;
  }
  // aktive eiere: investorer med over aktivFra % (og rivalene) – de som stiller krav
  const aktiveEiere = B => Object.entries(B.meg.inv).filter(([, n]) => n > REGLER.investor.aktivFra).map(([id, n]) => ({ id, andel: n }));

  // ---------- døgnet ----------
  // om: { nå, rand, kurs: { meg, rød, grønn, firma: { navn: kr } }, firmaer: [{ navn, konkurs, helse, levert, bransje }],
  //       resultat: { navn: kr per uke }, sjekk (som vurderØnske), nivå }
  // Gir hendelsene: utbytte (firma), eid (firma, kr per døgn, varer), rivalKjøpFirma, firmaEier, rivalKjøpMeg, investorSelger, oppkjøp,
  //   ukeSlutt (utbytte betalt/uteblitt), renter, lånSlutt, lånMislighold, ønske (holdt/brutt), krav (aktiv eier)
  function døgn(B, om = {}) {
    const nå = tall(om.nå), r = om.rand || lagRand(Math.floor(nå) + 7717), ut = [], R = REGLER, K = om.kurs || {}, dag = Math.floor(nå / DØGN);
    B.dag = dag; tilbake(B.meg); for (const s of ['rød', 'grønn']) tilbake(B.rivaler[s]);
    // firmaene: utbytte hver uke, hele resultatet hver dag når dere eier dem
    for (const f of om.firmaer || []) {
      const a = B.firmaer[f.navn]; if (!a || f.konkurs) continue; const res = tall((om.resultat || {})[f.navn]);
      if (eierAv(a) === 'blå') { const kr = avrund(res / UKE * a.du / 100, 1000); if (kr > 0 || R.firma.varer[f.bransje]) ut.push({ type: 'eid', navn: f.navn, kr, varer: R.firma.varer[f.bransje] || null }); }
      else if (a.du > 0 && dag % UKE === 0) { const kr = utbytteFirma(a.du, res); if (kr > 0) { a.utbytte += kr; ut.push({ type: 'utbytte', navn: f.navn, kr }); } }
    }
    // rivalene kjøper andeler i firmaene (kappløpet om Storlia)
    // (ut6-spioner) om.ekteRivaler: rivalenes økonomi (spill/rival-visning.js) kjøper selv med penger fra kassa (rivalKjøp) – da kjøper de ikke tilfeldig her
    const levende = (om.firmaer || []).filter(f => !f.konkurs);
    for (const s of ['rød', 'grønn']) {
      if (om.ekteRivaler) break;
      if (!levende.length || r() >= R.rival.firmaSjanse) continue;
      const vekt = levende.map(f => R.rival.firmaVekt[f.navn] || 1), sum = vekt.reduce((a, b) => a + b, 0); let x = r() * sum, f = levende[0];
      for (let i = 0; i < levende.length; i++) { x -= vekt[i]; if (x <= 0) { f = levende[i]; break; } }
      const [a0, a1] = R.rival.firmaKjøp, n = Math.min(fri(B, f.navn), a0 + Math.floor(r() * (a1 - a0 + 1))); if (n <= 0) continue;
      const a = firma(B, f.navn), før = eierAv(a); a[s] = en(a[s] + n); ut.push({ type: 'rivalKjøpFirma', side: s, navn: f.navn, n });
      const etter = eierAv(a); if (etter !== før) { a.eier = etter; ut.push({ type: 'firmaEier', navn: f.navn, side: etter }); }
    }
    // dere selv på børsen
    const m = B.meg;
    if (m.notert && !m.oppkjøpt) {
      // misfornøyde investorer selger til en rival
      for (const [id, n] of Object.entries(m.inv)) { const h = B.investorer[id]; if (!h || n <= 0 || h.tilfreds >= R.rival.misfornøyd) continue;
        const s = m.rival.rød <= m.rival.grønn ? 'rød' : 'grønn'; m.rival[s] = en(m.rival[s] + n); m.inv[id] = 0; h.status = 'solgt'; ut.push({ type: 'investorSelger', inv: id, side: s, n }); }
      for (const s of ['rød', 'grønn']) {
        if (om.ekteRivaler) break;
        let p = R.rival.megSjanse; if (m.egne < 50) p *= 2; if (m.stemning < R.rival.lavKurs) p *= 1.5;
        if (m.fritt <= 0 || r() >= p) continue; const [a0, a1] = R.rival.megKjøp, n = Math.min(m.fritt, a0 + Math.floor(r() * (a1 - a0 + 1)));
        m.fritt = en(m.fritt - n); m.rival[s] = en(m.rival[s] + n); ut.push({ type: 'rivalKjøpMeg', side: s, n });
      }
      for (const s of ['rød', 'grønn']) if (m.rival[s] > 50 && !m.oppkjøpt) { m.oppkjøpt = s; ut.push({ type: 'oppkjøp', side: s, andel: m.rival[s] }); }
    }
    if (!m.oppkjøpt) {
      // uka: utbytte betalt eller ikke (eiere utenfra: notert eller investorer)
      if (m.uke && nå >= m.uke.frist) {
        const u = m.uke, ok = u.betalt >= u.forventet, del = u.forventet > 0 ? Math.min(1, u.betalt / u.forventet) : 1;
        const d = ok ? R.stemning.utbytteBetalt : R.stemning.utbytteUte * (1 - del); endreStemning(m, d);
        for (const h of Object.values(B.investorer)) if (h.status === 'eier') h.tilfreds = klem(h.tilfreds + (ok ? R.investor.utbytteBetalt : R.investor.utbytteUte * (1 - del)), 0, 100);
        ut.push({ type: 'ukeSlutt', betalt: u.betalt, forventet: u.forventet, ok });
        m.uke = nyUke(B, nå, tall(K.meg));
        // aktive eiere stiller et nytt krav hver uke
        for (const e of aktiveEiere(B)) { if (B.ønsker.some(ø => ø.inv === e.id && ø.status === 'aktiv')) continue; const typer = ['kontrakt', 'ro', 'unna', 'avkastning'];
          const ø = nyttØnske(B, e.id, typer[Math.floor(r() * typer.length) % typer.length], nå, r); if (ø) { ø.krav = true; ut.push({ type: 'krav', ø }); } }
      }
    }
    // lånene: renter hver uke, tilbake på slutten (visningen betaler – sier den nei, er lånet misligholdt)
    for (const l of m.lån) { if (l.slutt || nå < l.neste) continue; l.neste += UKE * DØGN; l.igjen--; ut.push({ type: 'renter', l, kr: avrund(l.kr * l.rente, 1000), siste: l.igjen <= 0 }); }
    // ønskene
    for (const ø of B.ønsker) { if (ø.status !== 'aktiv') continue; const u = vurderØnske(ø, nå, { ...(om.sjekk || {}), forventet: m.uke ? m.uke.forventet : 0, utbytte: m.uke ? m.uke.betalt : 0 }); if (u) { lukkØnske(B, ø, u); ut.push({ type: 'ønske', ø, utfall: u }); } }
    if (B.ønsker.length > 40) B.ønsker = B.ønsker.filter(ø => ø.status === 'aktiv').concat(B.ønsker.filter(ø => ø.status !== 'aktiv').slice(-20));
    return ut;
  }
  // ---------- (ut6-spioner) RIVALENE KJØPER MED EKTE PENGER ----------
  // rivalKjøp(B, side, kr, kurs, o): rivalen har «kr» fra kassa si (spill/rival-visning.js) og kjøper andeler til kursen. Er dere notert og det
  // finnes frie andeler, kjøper de i dere (høyst megKjøp[1] % om gangen, og bare når kursen er lav eller dere eier under halvparten – ellers
  // i et firma); ellers i et firma (Storlia teller tre ganger, høyst firmaKjøp[1] %). kurs = { meg, firma: { navn: { kurs } } } (kr per %).
  // o = { firmaer: [{ navn, konkurs }], r }. Gir { brukt, hendelser } – hendelsene er de samme som døgn() gir (rivalKjøpMeg, rivalKjøpFirma, firmaEier, oppkjøp).
  function rivalKjøp(B, side, kr, kurs = {}, o = {}) {
    const R = REGLER.rival, ut = [], r = o.r || lagRand(Math.floor(tall(kr)) + 31), m = B.meg; let brukt = 0; kr = Math.max(0, tall(kr));
    if (!['rød', 'grønn'].includes(side) || kr <= 0) return { brukt, hendelser: ut };
    const km = tall(kurs.meg), lyst = m.egne < 50 || m.stemning < R.lavKurs || r() < .5;
    if (m.notert && !m.oppkjøpt && m.fritt > 0 && km > 0 && lyst) {
      const n = en(Math.min(m.fritt, R.megKjøp[1], Math.floor(kr / km * 10) / 10));
      if (n >= .1) { m.fritt = en(m.fritt - n); m.rival[side] = en(m.rival[side] + n); brukt = Math.round(n * km); ut.push({ type: 'rivalKjøpMeg', side, n, kr: brukt });
        if (m.rival[side] > 50 && !m.oppkjøpt) { m.oppkjøpt = side; ut.push({ type: 'oppkjøp', side, andel: m.rival[side] }); }
        return { brukt, hendelser: ut }; }
    }
    const levende = (o.firmaer || []).filter(f => f && !f.konkurs && fri(B, f.navn) > 0 && kurs.firma && kurs.firma[f.navn] && tall(kurs.firma[f.navn].kurs) > 0);
    if (!levende.length) return { brukt, hendelser: ut };
    const vekt = levende.map(f => R.firmaVekt[f.navn] || 1), sum = vekt.reduce((a, b) => a + b, 0); let x = r() * sum, f = levende[0];
    for (let i = 0; i < levende.length; i++) { x -= vekt[i]; if (x <= 0) { f = levende[i]; break; } }
    const kf = tall(kurs.firma[f.navn].kurs), n = en(Math.min(fri(B, f.navn), R.firmaKjøp[1], Math.floor(kr / kf * 10) / 10));
    if (n < .1) return { brukt, hendelser: ut };
    const a = firma(B, f.navn), før = eierAv(a); a[side] = en(a[side] + n); brukt = Math.round(n * kf); ut.push({ type: 'rivalKjøpFirma', side, navn: f.navn, n, kr: brukt });
    const etter = eierAv(a); if (etter !== før) { a.eier = etter; ut.push({ type: 'firmaEier', navn: f.navn, side: etter }); }
    return { brukt, hendelser: ut };
  }
  // lån betalt / ikke betalt (visningen kaller etter «renter»). Ikke betalt: långiveren tar andeler til kursen
  function lånBetalt(B, l, ok, kursKr) {
    if (ok) { if (l.igjen <= 0) l.slutt = true; return { ok: true }; }
    const h = B.investorer[l.inv], skyld = l.igjen <= 0 ? l.kr + l.kr * l.rente : l.kr * l.rente, n = kursKr > 0 ? Math.min(Math.max(0, B.meg.egne - 1), Math.ceil(skyld / kursKr * 10) / 10) : 0;
    B.meg.egne = en(B.meg.egne - n); B.meg.inv[l.inv] = en(tall(B.meg.inv[l.inv]) + n); if (h) { h.tilfreds = klem(h.tilfreds + REGLER.investor.brutt, 0, 100); if (h.status === 'långiver') h.status = 'eier'; }
    endreStemning(B.meg, REGLER.stemning.brudd); l.slutt = true; return { ok: false, andeler: n };
  }

  // ---------- til seier.js (penger-veien) ----------
  // verdier for Seier.penger: dere = din del av børsverdien; rivalene = sin del (100 − det dere eier i dem) – og hvem som er kjøpt opp
  function seierInn(B, kurser) {
    const v = { blå: minDel(B, børsverdi(kurser.meg)) };
    for (const s of ['rød', 'grønn']) v[s] = Math.round(børsverdi(kurser[s]) * (100 - B.rivaler[s].du) / 100);
    const oppkjøpt = {}; if (B.meg.oppkjøpt) oppkjøpt.blå = B.meg.oppkjøpt;
    const rival = størsteRival(B);
    return { verdier: v, oppkjøpt, rivalAndel: { blå: rival.andel }, børs: true };
  }

  // ---------- lagring ----------
  const tilJSON = B => JSON.parse(JSON.stringify(B));
  function fraJSON(d) {
    try {
      if (!d || typeof d !== 'object' || !d.meg) return null; const B = ny(d.leir);
      const m = d.meg, M = B.meg;
      M.egne = klem(tall(m.egne, 100), 0, 100); M.fritt = klem(tall(m.fritt), 0, 100); M.rival = { rød: klem(tall(m.rival && m.rival.rød), 0, 100), grønn: klem(tall(m.rival && m.rival.grønn), 0, 100) };
      M.inv = {}; if (m.inv && typeof m.inv === 'object') for (const [k, v] of Object.entries(m.inv)) if (investor(k)) M.inv[k] = klem(tall(v), 0, 100);
      M.notert = !!m.notert; M.notertDag = m.notertDag == null ? null : tall(m.notertDag); M.stemning = klem(tall(m.stemning, 1), REGLER.stemning.min, REGLER.stemning.maks);
      M.kurs = tall(m.kurs); M.oppkjøpt = RIVALER[m.oppkjøpt] ? m.oppkjøpt : null; M.kravNei = tall(m.kravNei);
      M.uke = m.uke && Number.isFinite(m.uke.frist) ? { fra: tall(m.uke.fra), frist: tall(m.uke.frist), forventet: tall(m.uke.forventet), betalt: tall(m.uke.betalt) } : null;
      M.lån = Array.isArray(m.lån) ? m.lån.filter(l => l && investor(l.inv)).map(l => ({ id: String(l.id), inv: l.inv, kr: tall(l.kr), rente: tall(l.rente), uker: tall(l.uker), neste: tall(l.neste), igjen: tall(l.igjen), slutt: !!l.slutt })) : [];
      if (!sjekkSum(B)) { M.fritt = en(Math.max(0, 100 - M.egne - M.rival.rød - M.rival.grønn - investorAndeler(B))); }
      if (d.firmaer && typeof d.firmaer === 'object') for (const [k, a] of Object.entries(d.firmaer)) if (a && typeof a === 'object') B.firmaer[k] = { du: klem(tall(a.du), 0, 100), rød: klem(tall(a.rød), 0, 100), grønn: klem(tall(a.grønn), 0, 100), eier: a.eier || null, stemning: tall(a.stemning, 1), utbytte: tall(a.utbytte) };
      for (const s of ['rød', 'grønn']) { const r = d.rivaler && d.rivaler[s]; if (r) B.rivaler[s] = { stemning: klem(tall(r.stemning, 1), REGLER.stemning.min, REGLER.stemning.maks), du: klem(tall(r.du), 0, 100), fritt: klem(tall(r.fritt, REGLER.rival.fritt), 0, 100), byer: r.byer == null ? null : tall(r.byer) }; }
      if (d.investorer && typeof d.investorer === 'object') for (const [k, h] of Object.entries(d.investorer)) if (investor(k) && h) B.investorer[k] = { ...h, tilfreds: klem(tall(h.tilfreds, 50), 0, 100) };
      B.ønsker = Array.isArray(d.ønsker) ? d.ønsker.filter(ø => ø && REGLER.ØNSKER[ø.type]).slice(-40) : [];
      B.nr = tall(d.nr); B.dag = tall(d.dag, -1);
      if (d.tellere && typeof d.tellere === 'object') for (const k of Object.keys(B.tellere)) B.tellere[k] = d.tellere[k] == null ? null : tall(d.tellere[k]);
      return B;
    } catch (e) { return null; }
  }

  const api = { rivalKjøp, REGLER, RIVALER, OPPDRAGSTYPER, hash, lagRand, kroner, mill, ny, firma, ute, investorAndeler, sjekkSum, firmaVerdi, kurs, selskapVerdi, børsverdi, minDel,
    stemningEndring, endreStemning, tilbake, tellerForskjell, fri, virkning, eierAv, kanKjøpe, kjøp, selg, utbytteFirma, kanNotere, noter, forventetUtbytte, nyUke, betalUtbytte,
    kanEmisjon, emisjon, tilbakekjøp, kjøpRival, selgRival, rykte, størsteRival, investor, nyttØnske, ønskeTekst, henvendelse, svarInvestor, vurderØnske, lukkØnske, aktiveEiere,
    døgn, lånBetalt, seierInn, tilJSON, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Bors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
