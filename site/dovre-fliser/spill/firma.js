/* Riksbrudd – FIRMAER OG SAMARBEID (fase Ø5, 28. nov; docs/plan-selskap-okonomi.md kapittel 8 og 14.5). Regler uten DOM
 * (Node: require('./firma'); nettleser: globalThis.Firma). Visningen: spill/firma-visning.js (window.FirmaSpill).
 *
 * REGISTERET: firmaene (de sju i spill/selskap.js og nye som dukker opp i byer dere har avtale med) er egne aktører med
 *   bransje, hjemsted (et tettsted i området – eller en bygd i nærheten når kartet ikke har tettsteder), behov,
 *   økonomi (helse 0–100: frisk, presset, konkurstruet – og konkurs) og holdning til dere (0–100, som byenes tillit).
 *   Holdningen stiger når dere leverer kontrakter for firmaet og synker når dere bryter dem. Økonomien tåler dårlig at krigen
 *   kommer nær hjemstedet, og blir bedre av handelen med dere.
 * SAMARBEID (tabellen i kapittel 8):
 *   fast kunde  – førsterett på firmaets kontrakter: ett ekstra og bedre tilbud fra dem hver morgen (rivalene tar det ikke).
 *                 Dere må si ja ofte nok: lar dere for mange gå ut på rad, slutter de.
 *   felles anlegg – dere eier et anlegg sammen (sagbruk, mølle, knuseverk, fiskemottak): dere betaler halve prisen og får halve
 *                 overskuddet hvert døgn (et regnestykke i firmaet, ikke et bygg i leiren). Firmaet kan selge sin del til en rival.
 *   vern        – rammeavtale: dere vokter firmaets hjemsted (mann innen 3 km i nok av døgnets timer, som byavtalens løfte) mot fast
 *                 betaling hvert døgn. Angrep der blir deres problem.
 * PAKTER MED RIVALENE (kapittel 18, spørsmål 6: forslaget – Ravnsund og Mosevakt kan bli allierte, men de kan bryte det):
 *   våpenhvile – ikke angrip hverandre innen en radius rundt leiren i N døgn (spill/fraksjoner.js respekterer den);
 *   allianse   – mot den andre rivalen: ingen kamp mellom dere, delt etterretning (dere ser lagene deres og det de ser) og felles mål.
 * SVIK: å bryte en avtale gir en gevinst nå (overraskelse, penger tilbake) og koster «pålitelig» og holdningen hos alle firmaene.
 * TEKNOLOGI GJENNOM HANDEL (14.5): god holdning hos et firma låser opp noe – Storlia: høvleri på sagbruket, Dalsnes: bedre aggregat,
 *   Ytterø: fryselager (bare en lås til fisket finnes).
 * ALLE TALL ER CLAUDES FORSLAG (spillverdier, ikke fasit) – samlet i REGLER.
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const tall = (v, r = 0) => (Number.isFinite(+v) ? +v : r);
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function lagRand(frø) { let a = (frø >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const avrund = (kr, n = 10000) => Math.round(kr / n) * n;
  const kroner = v => Math.round(v).toLocaleString('nb-NO').replace(/ | /g, ' ') + ' kr';

  // ---------- tallene (alle er Claudes forslag) ----------
  const REGLER = {
    versjon: 1,
    // holdning til dere (0–100): start, nye firmaer i byer dere har avtale med starter høyere (de kom fordi dere var der)
    holdning: { start: 35, ny: 45, levert: 6, brutt: -10, avbrutt: -6, vernHoldt: 2, vernBrutt: -6, fastUtløpt: -2, fastSlutt: -8, svik: -25, sviktAndre: -4 },
    // økonomien: helse 0–100. frisk fra 55, presset fra 25, under = konkurstruet, 0 = konkurs
    helse: { start: 68, ny: 58, frisk: 55, presset: 25, mot: 60, opp: 1.5, ned: .5,
      // per døgn: hjemstedet holdt av en rival, fiende innen 3 km / 8 km, kamp nær hjemstedet, vern holdt halverer krigens tap
      fiendeEier: -7, fiendeNær: -4, fiendeKm: [3, 8], fiendeLangt: -1.5, kamp: -3, vernFaktor: .5,
      // handel: levert kontrakt for firmaet; kroner handlet i døgnet gir opp til handelTak poeng (per handelPer kr)
      levert: 2, handelPer: 300000, handelTak: 5, byavtale: 1 },
    // nye firmaer: sjanse per døgn per by dere har avtale med (beskyttelse, handel, medlem), høyst perBy nye per by og tak i alt
    nye: { sjanse: .12, perBy: 2, tak: 14, trinn: ['beskyttelse', 'handel', 'medlem'] },
    // bygda som reserve-hjemsted (kartet uten tettsteder): mellom [min, maks] meter fra leiren, fast retning per firma
    reserve: { min: 6000, maks: 14000 },
    samarbeid: {
      // fast kunde: krav (holdning, leverte kontrakter for firmaet), betalingen på tilbudene deres, så mange ubesvarte på rad før de slutter
      fast: { holdning: 55, levert: 2, faktor: 1.15, ubesvart: 3, varer: 24 * 60 },
      // felles anlegg: krav; pris = hele anlegget (dere betaler andelen); overskudd per døgn for hele anlegget ved full drift;
      // salg til rival: sjanse per døgn når firmaet er konkurstruet (presset: halvparten); da gir anlegget faktor av overskuddet;
      // selger dere selv (svik), får dere tilbake salg av det dere betalte; ved konkurs får dere bobestyrerens andel
      felles: { holdning: 60, levert: 2, andel: .5, salg: .2, rivalFaktor: .6, svikSalg: .7, konkurs: .3,
        økonomi: { frisk: 1, presset: .6, konkurstruet: .3 } },
      // vern: krav; betaling per døgn; mann innen radius i holdtAndel av timene; varighet; tre brudd = de sier opp
      vern: { holdning: 40, kr: 110000, mann: 3, radius: 3000, holdtAndel: .7, døgn: 14, brudd: 3 },
    },
    // anleggene per bransje (pris for hele anlegget og overskudd per døgn for hele anlegget)
    ANLEGG: {
      tømmer: { navn: 'sagbruk', pris: 6e6, overskudd: 240000 },
      mat: { navn: 'mølle', pris: 4e6, overskudd: 160000 },
      gruve: { navn: 'knuseverk', pris: 5e6, overskudd: 200000 },
      sjømat: { navn: 'fiskemottak', pris: 4e6, overskudd: 170000 },
    },
    // TEKNOLOGI GJENNOM HANDEL: krav (holdning, leverte kontrakter for firmaet, eller døgn med vern holdt), pris for å ta den i bruk
    TEKNO: {
      høvleri: { firma: 'Storlia Tømmer', navn: 'Høvleri på sagbruket', holdning: 65, levert: 4, pris: 1.5e6, trengerSag: true,
        tekst: 'Sagbruket høvler plankene: 1,4 × så mye planker av samme tømmer (mindre flis).' },
      aggregat: { firma: 'Dalsnes Kraftlag', navn: 'Bedre aggregat', holdning: 60, levert: 2, vernDøgn: 5, pris: 8e5,
        tekst: 'Dalsnes bygger om aggregatene: de bruker 20 % mindre diesel for den samme strømmen.', diesel: .8 },
      fryselager: { firma: 'Ytterø Sjømat', navn: 'Fryselager', holdning: 60, levert: 2, pris: 0, lås: true,
        tekst: 'Ytterø viser dere hvordan fryselageret deres er bygget. Dere kan bygge et når fisket kommer til leiren (senere).' },
    },
    // PAKTER MED RIVALENE
    pakt: {
      // våpenhvile: radius (m) rundt leiren og døgn å velge mellom; pris per døgn = grunn + per km radius, ganger stil og 2^brudd
      hvile: { radier: [5000, 10000, 20000], døgn: [3, 7, 14], grunn: 150000, perKm: 15000 },
      // allianse mot den andre: krav om «pålitelig», døgn å velge mellom, bidrag til den felles krigskassa per 7 døgn
      allianse: { pålitelig: 50, døgn: [7, 14], bidrag: 500000 },
      // rivalenes stil: Ravnsund (rød) tar mer betalt og bryter lettere enn Mosevakt (grønn); sjanse per døgn for at de bryter
      stil: { rød: { pris: 1.3, bryt: .05 }, grønn: { pris: 1, bryt: .025 } },
      // de bryter lettere når de er mye sterkere enn dere (den sterkeste tar mest til slutt) og en allianse når fienden er nesten slått
      sterk: 1.5, sterkFaktor: 2, svakFiende: 2,
      // svik fra dere: rykte, overraskelsen (ild × faktor mot dem i minutter) og pause før en ny pakt med samme rival (døgn)
      svik: { pålitelig: -8, ild: 1.3, minutter: 180, pause: 3, innsyn: 1440 },
    },
  };
  const RIVALER = { rød: 'Ravnsund', grønn: 'Mosevakt' };
  // de sju fra spill/selskap.js: bransje, hva de trenger (behov) og hvor sterke de er fra start
  const KJENTE = {
    'Gråfjell Frakt': { bransje: 'frakt', behov: ['vern av rutene', 'eskorter'] },
    'Tindvik Drivstoff': { bransje: 'drivstoff', behov: ['eskorter av tankbilene', 'vern av depotet'] },
    'Brattli Mineral': { bransje: 'gruve', behov: ['ryddede veger', 'vern av bruddet'] },
    'Dalsnes Kraftlag': { bransje: 'kraft', behov: ['ved og flis til kraftverket', 'vern av linjene'] },
    'Kvernhaug Mølle': { bransje: 'mat', behov: ['planker', 'vern av møllen'] },
    'Storlia Tømmer': { bransje: 'tømmer', behov: ['planker', 'flis', 'hogst'] },
    'Ytterø Sjømat': { bransje: 'sjømat', behov: ['eskorter til kysten', 'diesel'] },
  };
  const BRANSJER = {
    frakt: 'frakt', drivstoff: 'drivstoff', gruve: 'gruve og stein', kraft: 'kraft', mat: 'mat og korn', tømmer: 'tømmer og trelast', sjømat: 'sjømat',
    verksted: 'verksted', bygg: 'bygg', handel: 'handel',
  };
  // oppdiktede navn på nye firmaer (Claudes forslag; ikke ekte firmaer)
  const NYE = [
    { navn: 'Haugtun Verksted', bransje: 'verksted', behov: ['stål', 'vern'] }, { navn: 'Furuli Bygg', bransje: 'bygg', behov: ['planker', 'betong'] },
    { navn: 'Nordbø Bakeri', bransje: 'mat', behov: ['ved', 'mat'] }, { navn: 'Vassend Transport', bransje: 'frakt', behov: ['eskorter', 'diesel'] },
    { navn: 'Bekkvoll Sag', bransje: 'tømmer', behov: ['tømmer', 'vern'] }, { navn: 'Rognmo Handel', bransje: 'handel', behov: ['vern av butikken', 'varer'] },
    { navn: 'Skaret Grus', bransje: 'gruve', behov: ['ryddede veger'] }, { navn: 'Lunde Smie', bransje: 'verksted', behov: ['flis', 'stål'] },
    { navn: 'Teigen Kornlag', bransje: 'mat', behov: ['vern av lageret'] }, { navn: 'Vikan Røkeri', bransje: 'sjømat', behov: ['ved', 'eskorter'] },
  ];
  const ØKONOMIORD = { frisk: 'frisk', presset: 'presset', konkurstruet: 'konkurstruet', konkurs: 'konkurs' };
  const SAMARBEID = { fast: 'Fast kunde', felles: 'Felles anlegg', vern: 'Rammeavtale for vern' };

  // ---------- tilstanden ----------
  function nyttFirma(navn, o = {}) {
    const K = KJENTE[navn] || NYE.find(q => q.navn === navn) || { bransje: o.bransje || 'handel', behov: o.behov || [] };
    return { navn, bransje: K.bransje, behov: K.behov.slice(), hjem: o.hjem || null, helse: o.helse != null ? o.helse : REGLER.helse.start, holdning: o.holdning != null ? o.holdning : REGLER.holdning.start,
      ny: !!o.ny, fra: Math.round(tall(o.nå)), konkurs: null, levert: 0, brutt: 0, handel: 0, handelDøgn: 0, vernDøgn: 0, fast: null, felles: null, vern: null, tilbudt: {} };
  }
  function ny(leir) {
    const F = { versjon: REGLER.versjon, leir: leir ? { x: Math.round(leir.x), y: Math.round(leir.y) } : null, firmaer: [], pakter: [], talt: [], tekno: {}, brudd: { rød: 0, grønn: 0 }, pause: { rød: 0, grønn: 0 }, nr: 0, dag: -1 };
    for (const navn of Object.keys(KJENTE)) F.firmaer.push(nyttFirma(navn));
    return F;
  }
  const finn = (F, navn) => (F && F.firmaer ? F.firmaer.find(f => f.navn === navn) || null : null);
  const aktive = F => F.firmaer.filter(f => !f.konkurs);

  // ---------- hjemstedet ----------
  const RETNING = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  // reserve når kartet ikke har tettsteder: en bygd 6–14 km fra leiren, fast retning per firma
  function reserveHjem(navn, leir) {
    const L = leir || { x: 0, y: 0 }, h = hash('firma:' + navn), i = h % 8, R = REGLER.reserve, d = R.min + ((h >>> 8) % 1000) / 1000 * (R.maks - R.min), a = i * Math.PI / 4;
    return { navn: `bygda ${RETNING[i]} for leiren`, x: Math.round(L.x + Math.cos(a) * d), y: Math.round(L.y + Math.sin(a) * d), slag: 'bygd', id: null, reserve: true };
  }
  // hjemsted(navn, steder, leir, velger): velger = Vare.hjemsted når den finnes (samme sted som varekontraktene leveres til)
  function hjemsted(navn, steder, leir, velger) {
    let h = null; try { h = velger ? velger(navn, steder, leir) : null; } catch (e) { h = null; }
    if (!h) { const by = (steder || []).filter(q => q && q.navn && q.slag !== 'bru' && Number.isFinite(q.x) && Number.isFinite(q.y)).map(q => ({ ...q, d: Math.hypot(q.x - (leir || {}).x || 0, q.y - (leir || {}).y || 0) }))
      .filter(q => q.d >= 2500 && q.d <= 40000).sort((a, b) => a.d - b.d).slice(0, 4); if (by.length) { const q = by[hash(navn) % by.length]; h = { navn: q.navn, x: Math.round(q.x), y: Math.round(q.y), slag: 'tettsted', id: q.id === undefined ? null : q.id }; } }
    return h || reserveHjem(navn, leir);
  }
  // gir alle firmaene et hjemsted (og flytter dem fra reserven til et tettsted når kartet har fått tettsteder)
  function sikreHjem(F, steder, velger) {
    let endret = false;
    for (const f of F.firmaer) { if (f.hjem && !f.hjem.reserve) continue; if (f.ny && f.hjem) continue; const h = hjemsted(f.navn, steder, F.leir, velger);
      if (!f.hjem || h.navn !== f.hjem.navn || h.x !== f.hjem.x) { f.hjem = h; endret = true; } }
    return endret;
  }

  // ---------- økonomi og holdning ----------
  function økonomi(f) { if (!f) return 'konkurs'; if (f.konkurs) return 'konkurs'; const H = REGLER.helse; return f.helse >= H.frisk ? 'frisk' : f.helse >= H.presset ? 'presset' : 'konkurstruet'; }
  const endreHoldning = (f, d) => { if (f && Number.isFinite(d)) f.holdning = klem(Math.round((f.holdning + d) * 10) / 10, 0, 100); return f ? f.holdning : 0; };
  function holdningOrd(v) { return v >= 80 ? 'stoler fullt på dere' : v >= 60 ? 'liker dere' : v >= 40 ? 'nøytral' : v >= 20 ? 'skeptisk' : 'vil ikke ha med dere å gjøre'; }
  // En ferdig kontrakt (fra Selskap: k.status 'levert' | 'brutt', k.giver.slag 'firma'). Telles én gang (F.talt). Gir { f, endring } eller null.
  function registrerKontrakt(F, k) {
    if (!F || !k || !k.id || !k.giver || k.giver.slag !== 'firma' || (k.status !== 'levert' && k.status !== 'brutt')) return null;
    if (F.talt.includes(k.id)) return null; F.talt.push(k.id); if (F.talt.length > 300) F.talt.splice(0, F.talt.length - 300);
    const f = finn(F, k.giver.navn); if (!f || f.konkurs) return null; const H = REGLER.holdning;
    let d;
    if (k.status === 'levert') { d = H.levert; f.levert++; f.handel += tall(k.sluttKr, tall(k.betaling)); f.handelDøgn += tall(k.sluttKr, tall(k.betaling)); f.helse = klem(f.helse + REGLER.helse.levert, 0, 100); }
    else { d = k.grunn === 'avbrutt' ? H.avbrutt : k.grunn === 'frakt' ? -3 : H.brutt; f.brutt++; }
    endreHoldning(f, d);
    // fast kunde: et tilbud fra dem ble tatt og levert/brutt – det teller som et ja
    return { f, endring: d, levert: k.status === 'levert' };
  }

  // ---------- (ut5-bors, Ø7) eierskap fra Gråbørsen (spill/bors.js) ----------
  // api.rabatt = navn => faktor (0,95 når dere eier minst 10 % av firmaet); uten den er alle prisene som før
  function rabatt(navn) { const fn = api.rabatt; if (typeof fn !== 'function') return 1; let v = 1; try { v = tall(fn(navn), 1); } catch (e) { v = 1; } return klem(v, .5, 1); }
  // en ny eier med over halvparten: 'blå' (dere), 'rød'/'grønn' (en rival – samarbeidet med dere tar slutt) eller null. Gir hva som ble avsluttet
  function eierSkifte(F, f, side) {
    if (!f) return null; const før = f.eier || null; f.eier = side || null; const slutt = [];
    if (side && side !== 'blå' && RIVALER[side]) { if (f.fast) { f.fast = null; slutt.push('fast'); } if (f.vern) { f.vern = null; slutt.push('vern'); }
      if (f.felles && !f.felles.rival) { f.felles.rival = side; slutt.push('felles'); } }
    return { før, nå: f.eier, slutt };
  }

  // ---------- samarbeid ----------
  const anleggFor = f => (f ? REGLER.ANLEGG[f.bransje] || null : null);
  function kanSamarbeid(F, f, type) {
    const m = [], S = REGLER.samarbeid[type]; if (!f || !S) return { ok: false, mangler: ['ukjent samarbeid'] };
    if (f.konkurs) return { ok: false, mangler: [`${f.navn} er konkurs`] };
    // (ut5-bors, Ø7) kjøpt opp av en rival på Gråbørsen: ikke noe samarbeid med dere
    if (f.eier && f.eier !== 'blå' && RIVALER[f.eier]) return { ok: false, mangler: [`${f.navn} er kjøpt opp av ${RIVALER[f.eier]}`], eid: true };
    if (f[type]) return { ok: false, mangler: ['dere har det alt'], har: true };
    if (type === 'felles' && !anleggFor(f)) return { ok: false, mangler: [`${f.navn} har ikke noe anlegg å eie sammen`], ingen: true };
    if (f.holdning < S.holdning) m.push(`holdning ${S.holdning} (nå ${Math.round(f.holdning)})`);
    if (S.levert && f.levert < S.levert) m.push(`${S.levert - f.levert} levert${S.levert - f.levert === 1 ? '' : 'e'} kontrakt${S.levert - f.levert === 1 ? '' : 'er'} til for dem (${f.levert} av ${S.levert})`);
    if (type === 'felles' && økonomi(f) === 'konkurstruet') m.push('et firma som ikke er konkurstruet');
    // (ut5-rivaler) en rival som er fast kunde eller eier halve anlegget, stenger for dere til det er over
    const rv = f.rival || {};
    if (type === 'fast' && rv.kunde && RIVALER[rv.kunde.side]) m.push(`${RIVALER[rv.kunde.side]} er fast kunde der nå`);
    if (type === 'felles' && rv.anlegg && RIVALER[rv.anlegg.side]) m.push(`${RIVALER[rv.anlegg.side]} eier halve ${bestemt(f)}`);
    return { ok: !m.length, mangler: m };
  }
  // hva samarbeidet koster/gir, som tall: felles = det dere betaler, vern = betaling per døgn
  function vilkår(f, type) {
    if (type === 'felles') { const A = anleggFor(f); if (!A) return null; const S = REGLER.samarbeid.felles; return { anlegg: A.navn, pris: avrund(A.pris * S.andel * rabatt(f.navn)), overskudd: avrund(A.overskudd * S.andel, 1000) }; }
    if (type === 'vern') { const S = REGLER.samarbeid.vern; return { kr: S.kr, mann: S.mann, radius: S.radius, døgn: S.døgn }; }
    if (type === 'fast') { const S = REGLER.samarbeid.fast; return { faktor: S.faktor, ubesvart: S.ubesvart }; }
    return null;
  }
  // inngå et samarbeid. Gir { ok, grunn?, kostnad } – visningen trekker kostnaden (felles anlegg)
  function inngå(F, f, type, nå) {
    const k = kanSamarbeid(F, f, type); if (!k.ok) return { ok: false, grunn: k.mangler.join(' og ') };
    const V = vilkår(f, type); nå = Math.round(tall(nå));
    if (type === 'fast') f.fast = { fra: nå, tilbudt: 0, tatt: 0, ubesvart: 0 };
    else if (type === 'felles') f.felles = { fra: nå, anlegg: V.anlegg, betalt: V.pris, tjent: 0, rival: null };
    else if (type === 'vern') f.vern = { fra: nå, slutt: nå + V.døgn * 1440, kr: V.kr, mann: V.mann, timer: 0, okTimer: 0, døgn: 0, holdt: 0, brudd: 0 };
    delete f.tilbudt[type];
    return { ok: true, kostnad: type === 'felles' ? V.pris : 0 };
  }
  // FAST KUNDE – tilbudene: et nytt tilbud fra dem er lagt ut (id), tatt eller gått ut
  function fastTilbud(f, kId) { if (!f || !f.fast) return; f.fast.tilbudt++; f.fast.siste = kId; }
  // svar: 'tatt' | 'utløpt'. Gir 'slutt' når de har fått nok av å vente
  function fastSvar(f, svar) {
    if (!f || !f.fast) return null; const S = REGLER.samarbeid.fast;
    if (svar === 'tatt') { f.fast.tatt++; f.fast.ubesvart = 0; return 'ok'; }
    f.fast.ubesvart++; endreHoldning(f, REGLER.holdning.fastUtløpt);
    if (f.fast.ubesvart >= S.ubesvart) { f.fast = null; endreHoldning(f, REGLER.holdning.fastSlutt); return 'slutt'; }
    return 'utløpt';
  }
  // VERN – én spilltime: mann = egne friske mann innen radius av hjemstedet (samme telling som byavtalens løfte)
  function vernTime(f, mann) { const A = f && f.vern; if (!A) return null; A.timer++; const ok = mann >= A.mann; if (ok) A.okTimer++; return ok; }
  // AVSLUTTE: 'slutt' = vanlig slutt; svik = dere bryter (felles: selger til rivalen, vern: går fra det). Gir { gevinst, svik }
  function avslutt(F, f, type, o = {}) {
    if (!f || !f[type]) return null; const ut = { gevinst: 0, svik: !!o.svik, type };
    if (type === 'felles' && o.svik) ut.gevinst = avrund(f.felles.betalt * REGLER.samarbeid.felles.svikSalg);
    f[type] = null;
    if (o.svik) svik(F, f);
    else if (type === 'fast') endreHoldning(f, -5);
    return ut;
  }
  // svik: firmaet selv mister mye, alle de andre litt (de hører om det); «pålitelig» trekkes av visningen (Selskap.endreRykte)
  function svik(F, f) { const H = REGLER.holdning; if (f) endreHoldning(f, H.svik); for (const q of aktive(F)) if (q !== f) endreHoldning(q, H.sviktAndre); return REGLER.pakt.svik.pålitelig; }

  // ---------- teknologi gjennom handel ----------
  // listen over det som kan låses opp: { id, navn, tekst, firma, ok, mangler, låst (alt låst opp), pris, bare (bare tekst) }
  // o: { harSag } fra visningen
  function tekno(F, o = {}) {
    return Object.entries(REGLER.TEKNO).map(([id, T]) => {
      const f = finn(F, T.firma), m = [];
      if (!f) m.push(`${T.firma} finnes ikke i området`);
      else if (f.konkurs && !F.tekno[id]) m.push(`${T.firma} er konkurs`);
      else { if (f.holdning < T.holdning) m.push(`holdning ${T.holdning} hos ${T.firma} (nå ${Math.round(f.holdning)})`);
        const lev = f.levert >= T.levert, vern = T.vernDøgn && f.vernDøgn >= T.vernDøgn;
        if (!lev && !vern) m.push(`${T.levert - f.levert} levert${T.levert - f.levert === 1 ? '' : 'e'} kontrakt${T.levert - f.levert === 1 ? '' : 'er'} til for dem${T.vernDøgn ? ` (eller ${T.vernDøgn} døgn med vern holdt)` : ''}`); }
      const låstOpp = !!F.tekno[id], iBruk = !!(F.tekno[id] && F.tekno[id].iBruk);
      const mBruk = []; if (T.trengerSag && !o.harSag) mBruk.push('et sagbruk i leiren');
      return { id, navn: T.navn, tekst: T.tekst, firma: T.firma, ok: !m.length || låstOpp, mangler: låstOpp ? [] : m, låstOpp, iBruk, pris: T.pris, bare: !!T.lås, manglerBruk: mBruk };
    });
  }
  // det som har blitt låst opp nå (ok, ikke låst opp før): merkes med tida. Gir lista over nye
  function låsOpp(F, nå, o = {}) { const nye = []; for (const t of tekno(F, o)) if (t.ok && !t.låstOpp) { F.tekno[t.id] = { tid: Math.round(tall(nå)), iBruk: false }; nye.push(t); } return nye; }
  // ta teknologien i bruk (visningen betaler prisen og gjør endringen i spillet)
  function brukTekno(F, id, o = {}) {
    const t = tekno(F, o).find(q => q.id === id); if (!t) return { ok: false, grunn: 'Ukjent.' };
    if (!t.låstOpp) return { ok: false, grunn: 'Ikke låst opp ennå: ' + t.mangler.join(' og ') + '.' };
    if (t.bare) return { ok: false, grunn: 'Kan ikke bygges ennå.' }; if (t.iBruk) return { ok: false, grunn: 'Er alt i bruk.' };
    if (t.manglerBruk.length) return { ok: false, grunn: 'Dere trenger ' + t.manglerBruk.join(' og ') + '.' };
    F.tekno[id].iBruk = true; return { ok: true, pris: avrund(t.pris * rabatt(t.firma), 1000) };
  }

  // ---------- pakter med rivalene ----------
  const annen = side => (side === 'rød' ? 'grønn' : 'rød');
  const gjelder = (p, nå) => !!p && !p.brutt && tall(nå) < p.slutt;
  const aktivePakter = (F, nå) => (F && F.pakter ? F.pakter.filter(p => gjelder(p, nå)) : []);
  function paktPris(F, type, side, døgn, r) {
    const P = REGLER.pakt, st = P.stil[side] || { pris: 1 }, b = 2 ** tall(F && F.brudd && F.brudd[side]);
    if (type === 'hvile') return avrund(døgn * (P.hvile.grunn + (r / 1000) * P.hvile.perKm) * st.pris * b);
    if (type === 'allianse') return avrund(P.allianse.bidrag * døgn / 7 * b);
    return 0;
  }
  // kan dere inngå pakten? o: { pålitelig }
  function kanPakt(F, type, side, nå, o = {}) {
    const m = [], A = aktivePakter(F, nå); if (!RIVALER[side]) return { ok: false, mangler: ['ukjent rival'] };
    if (A.some(p => p.side === side && p.type === type)) return { ok: false, mangler: ['dere har det alt'], har: true };
    if (tall(F.pause[side]) > nå) m.push(`${RIVALER[side]} vil ikke snakke med dere før om ${Math.ceil((F.pause[side] - nå) / 1440)} døgn (dere brøt sist)`);
    if (type === 'allianse') { if (A.some(p => p.side === annen(side))) m.push(`ingen pakt med ${RIVALER[annen(side)]} (dere kan ikke stå på begge sider)`);
      if (tall(o.pålitelig, 50) < REGLER.pakt.allianse.pålitelig) m.push(`«pålitelig» ${REGLER.pakt.allianse.pålitelig} (nå ${Math.round(tall(o.pålitelig))})`); }
    if (type === 'hvile' && A.some(p => p.type === 'allianse' && p.mot === side)) m.push(`ingen allianse mot ${RIVALER[side]}`);
    return { ok: !m.length, mangler: m };
  }
  // v: { r (hvile), døgn }. sentrum = leiren. Gir { ok, p, pris } – visningen betaler
  function inngåPakt(F, type, side, v, nå, o = {}) {
    const k = kanPakt(F, type, side, nå, o); if (!k.ok) return { ok: false, grunn: k.mangler.join(' og ') };
    const P = REGLER.pakt[type]; if (!P) return { ok: false, grunn: 'Ukjent pakt.' };
    const døgn = P.døgn.includes(+v.døgn) ? +v.døgn : P.døgn[0], r = type === 'hvile' ? (P.radier.includes(+v.r) ? +v.r : P.radier[0]) : 0;
    const L = F.leir || { x: 0, y: 0 }, p = { id: 'p' + (++F.nr), type, side, mot: type === 'allianse' ? annen(side) : null, x: L.x, y: L.y, r, døgn, fra: Math.round(nå), slutt: Math.round(nå + døgn * 1440), brutt: null };
    const pris = paktPris(F, type, side, døgn, r); p.pris = pris; F.pakter.push(p); if (F.pakter.length > 20) F.pakter.splice(0, F.pakter.length - 20);
    return { ok: true, p, pris };
  }
  // hvem: 'blå' (dere bryter – svik) eller rivalens side. Gir { p, svik, ild: { side, faktor, til } }
  function brytPakt(F, id, hvem, nå) {
    const p = F.pakter.find(q => q.id === id); if (!p || !gjelder(p, nå)) return null; const S = REGLER.pakt.svik;
    p.brutt = { av: hvem, tid: Math.round(nå) };
    if (hvem === 'blå') { F.brudd[p.side] = tall(F.brudd[p.side]) + 1; F.pause[p.side] = Math.round(nå + S.pause * 1440); svik(F, null);
      return { p, svik: true, pålitelig: S.pålitelig, ild: { side: p.side, faktor: S.ild, til: Math.round(nå + S.minutter) }, innsyn: p.type === 'allianse' ? Math.round(nå + S.innsyn) : 0 }; }
    return { p, svik: false };
  }
  // er det fred mellom a og b ved (x, y)? allianse = overalt, våpenhvile = innen radius av sentrum. Uten x/y: bare alliansen
  function iPakt(pakter, a, b, x, y, nå) {
    if (a === b) return false; const side = a === 'blå' ? b : b === 'blå' ? a : null; if (!side || !pakter) return false;
    for (const p of pakter) { if (p.side !== side || !gjelder(p, nå)) continue; if (p.type === 'allianse') return true;
      if (p.type === 'hvile' && Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x - p.x, y - p.y) <= p.r) return true; }
    return false;
  }
  const alliert = (pakter, side, nå) => !!(pakter || []).some(p => p.type === 'allianse' && p.side === side && gjelder(p, nå));
  // én gang per døgn: rivalene kan bryte. om: { rand, styrke: { blå, rød, grønn } (kampkraft) }. Gir [{ p, svik: false, grunn }]
  function paktDøgn(F, nå, om = {}) {
    const r = om.rand || lagRand(Math.floor(nå) + 977), P = REGLER.pakt, S = om.styrke || {}, ut = [];
    for (const p of aktivePakter(F, nå)) {
      let s = (P.stil[p.side] || { bryt: .03 }).bryt; const meg = tall(S[p.side]), deg = tall(S.blå);
      if (deg > 0 && meg > P.sterk * deg) s *= P.sterkFaktor;
      if (p.type === 'allianse' && tall(S[p.mot]) > 0 && tall(S[p.mot]) * P.sterk < meg) s *= P.svakFiende;
      if (r() < s) { const b = brytPakt(F, p.id, p.side, nå); if (b) { b.grunn = deg > 0 && meg > P.sterk * deg ? 'de er mye sterkere enn dere nå' : p.type === 'allianse' ? 'de vil ikke dele det de tar' : 'de så en sjanse'; ut.push(b); } }
    }
    return ut;
  }

  // ---------- døgnet ----------
  // om: { nå, krig: { [navn]: { fiendeEier, fiendeKm, kamp } }, byer: [{ id, navn, x, y, trinn }] (byene dere har avtale med),
  //       avtaleBy: Set av tettsted-id med avtale, rand, vernMann (ikke brukt – vern telles time for time) }
  // Gir hendelsene: konkurs, nytt, samarbeidTilbud, vern (holdt/brutt, kr), vernOppsagt, vernFerdig, felles (kr), solgt
  function døgn(F, om = {}) {
    const nå = tall(om.nå), r = om.rand || lagRand(Math.floor(nå) + 4111), H = REGLER.helse, ut = [], K = om.krig || {};
    for (const f of F.firmaer) {
      if (f.konkurs) continue; const k = K[f.navn] || {};
      // økonomien: mot det normale, krigen rundt hjemstedet, handelen med dere
      let d = f.helse < H.mot ? H.opp : -H.ned, krig = 0;
      if (k.fiendeEier) krig += H.fiendeEier;
      if (Number.isFinite(k.fiendeKm)) krig += k.fiendeKm <= H.fiendeKm[0] ? H.fiendeNær : k.fiendeKm <= H.fiendeKm[1] ? H.fiendeLangt : 0;
      if (k.kamp) krig += H.kamp;
      if (f.vern && f.vern.timer > 0 && f.vern.okTimer >= f.vern.timer * REGLER.samarbeid.vern.holdtAndel) krig *= H.vernFaktor;
      d += krig + Math.min(H.handelTak, f.handelDøgn / H.handelPer) + (f.hjem && f.hjem.id != null && om.avtaleBy && om.avtaleBy.has(f.hjem.id) ? H.byavtale : 0);
      f.helse = klem(Math.round((f.helse + d) * 10) / 10, 0, 100); f.handelDøgn = 0;
      if (f.helse <= 0) {
        const tilbake = f.felles ? avrund(f.felles.betalt * REGLER.samarbeid.felles.konkurs) : 0;
        f.konkurs = Math.round(nå); f.fast = null; f.felles = null; f.vern = null; ut.push({ type: 'konkurs', f, kr: tilbake }); continue;
      }
      // vern: døgnet holdt eller brutt
      if (f.vern) { const A = f.vern, S = REGLER.samarbeid.vern, holdt = A.timer > 0 && A.okTimer >= A.timer * S.holdtAndel;
        A.døgn++; if (holdt) { A.holdt++; f.vernDøgn++; endreHoldning(f, REGLER.holdning.vernHoldt); ut.push({ type: 'vern', f, holdt: true, kr: A.kr }); }
        else { A.brudd++; endreHoldning(f, REGLER.holdning.vernBrutt); ut.push({ type: 'vern', f, holdt: false, kr: 0, ok: A.okTimer, av: A.timer }); }
        A.timer = 0; A.okTimer = 0;
        if (A.brudd >= S.brudd) { f.vern = null; ut.push({ type: 'vernOppsagt', f }); } else if (nå >= A.slutt) { f.vern = null; ut.push({ type: 'vernFerdig', f }); } }
      // felles anlegg: halve overskuddet, etter hvor frisk firmaet er (og om rivalen har kjøpt deres del)
      if (f.felles) { const S = REGLER.samarbeid.felles, A = anleggFor(f), ø = økonomi(f);
        if (!f.felles.rival && (ø === 'konkurstruet' ? r() < S.salg : ø === 'presset' ? r() < S.salg / 2 : false)) { f.felles.rival = r() < .5 ? 'rød' : 'grønn'; ut.push({ type: 'solgt', f, til: f.felles.rival }); }
        const kr = A ? avrund(A.overskudd * S.andel * (S.økonomi[ø] || 0) * (f.felles.rival ? S.rivalFaktor : 1), 1000) : 0; f.felles.tjent += kr; if (kr > 0) ut.push({ type: 'felles', f, kr }); }
      // de ringer og tilbyr samarbeid når kravene holder (én gang per type)
      for (const type of ['fast', 'vern', 'felles']) { if (f.tilbudt[type] || (f.eier && f.eier !== 'blå')) continue; const kv = kanSamarbeid(F, f, type); if (kv.ok) { f.tilbudt[type] = Math.round(nå); ut.push({ type: 'samarbeidTilbud', f, samarbeid: type }); break; } }
    }
    // nye firmaer i byer dere har avtale med
    const N = REGLER.nye;
    for (const by of om.byer || []) {
      if (!N.trinn.includes(by.trinn) || aktive(F).length >= N.tak) continue;
      if (F.firmaer.filter(f => f.ny && f.hjem && f.hjem.id === by.id).length >= N.perBy) continue;
      if (r() >= N.sjanse) continue;
      const ledige = NYE.filter(q => !finn(F, q.navn)); if (!ledige.length) break;
      const q = ledige[Math.floor(r() * ledige.length) % ledige.length];
      const f = nyttFirma(q.navn, { ny: true, nå, holdning: REGLER.holdning.ny, helse: H.ny, hjem: { navn: by.navn, x: Math.round(by.x), y: Math.round(by.y), slag: 'tettsted', id: by.id } });
      F.firmaer.push(f); ut.push({ type: 'nytt', f });
    }
    return ut;
  }

  // ---------- (ut5-rivaler, Ø8) RIVALENES KJØP: fast kunde og felles anlegg ----------
  // f.rival = { levert: { rød, grønn }, kunde: { side, fra, til } | null, anlegg: { side, fra, betalt } | null } – rivalene i firmaet.
  // Tallene er Claudes forslag (Rival.REGLER.firma i spill/rival.js gir kravene; her bare reserven).
  const BESTEMT = { sagbruk: 'sagbruket', mølle: 'mølla', knuseverk: 'knuseverket', fiskemottak: 'fiskemottaket' };
  const bestemt = f => { const A = anleggFor(f); return A ? BESTEMT[A.navn] || A.navn : 'anlegget'; };
  const rivalDel = f => (f.rival = f.rival && typeof f.rival === 'object' ? f.rival : { levert: { rød: 0, grønn: 0 }, kunde: null, anlegg: null });
  // en rival har levert en kontrakt for firmaet. o = { nå, kundeEtter, kundeDøgn }. Gir 'kunde' når rivalen nå blir fast kunde.
  function rivalLevert(f, side, o = {}) {
    if (!f || f.konkurs || !RIVALER[side]) return null; const R = rivalDel(f); R.levert[side] = tall(R.levert[side]) + 1;
    if (f.fast || (R.kunde && tall(R.kunde.til) > tall(o.nå))) return null;
    if (R.levert[side] < tall(o.kundeEtter, 2)) return null;
    R.kunde = { side, fra: Math.round(tall(o.nå)), til: Math.round(tall(o.nå) + tall(o.kundeDøgn, 10) * 1440) }; return 'kunde';
  }
  // er rivalen fast kunde nå? (når tida er ute, slettes det)
  function rivalKunde(f, nå) { const R = f && f.rival; if (!R || !R.kunde) return null; if (tall(R.kunde.til) <= tall(nå)) { R.kunde = null; return null; } return R.kunde.side; }
  // kan rivalen kjøpe halve anlegget? (ikke når dere eier det sammen med firmaet, ikke konkurs/konkurstruet; én rival om gangen)
  function rivalKanAnlegg(f) { const A = anleggFor(f); return !!(A && f && !f.konkurs && !f.felles && !(f.rival && f.rival.anlegg) && økonomi(f) !== 'konkurstruet'); }
  // rivalen kjøper halve anlegget. Gir prisen (kr) eller 0
  function rivalAnlegg(f, side, nå) { if (!RIVALER[side] || !rivalKanAnlegg(f)) return 0; const V = vilkår(f, 'felles'); rivalDel(f).anlegg = { side, fra: Math.round(tall(nå)), betalt: V.pris }; return V.pris; }
  // overskuddet rivalen får av anlegget for ett døgn (samme regel som for dere)
  function rivalAnleggDøgn(f) { const R = f && f.rival, A = anleggFor(f); if (!R || !R.anlegg || !A || f.konkurs) return 0; const S = REGLER.samarbeid.felles; return avrund(A.overskudd * S.andel * (S.økonomi[økonomi(f)] || 0), 1000); }
  // det rivalene har i firmaet, i ord (fanen Partnere)
  function rivalTekst(f, nå) { const R = f && f.rival; if (!R) return ''; const d = [], k = rivalKunde(f, nå);
    if (k) d.push(`${RIVALER[k]} er fast kunde (tar tilbudene deres)`); if (R.anlegg && RIVALER[R.anlegg.side]) d.push(`${RIVALER[R.anlegg.side]} eier halve ${bestemt(f)}`);
    if (R.andel) for (const [sd, a] of Object.entries(R.andel)) if (RIVALER[sd] && tall(a) > 0) d.push(`${RIVALER[sd]} eier ${Math.round(tall(a))} % av firmaet`);
    return d.join(' · '); }

  // ---------- tekster ----------
  function økonomiTekst(f) { const ø = økonomi(f); return ø === 'konkurs' ? 'gått konkurs' : ø === 'frisk' ? 'går godt' : ø === 'presset' ? 'presset av krigen' : 'nær konkurs'; }
  function samarbeidTekst(f) {
    const d = [];
    if (f.fast) d.push(`fast kunde (${f.fast.tatt} av ${f.fast.tilbudt} tilbud tatt${f.fast.ubesvart ? `, ${f.fast.ubesvart} ubesvart på rad` : ''})`);
    if (f.felles) d.push(`felles ${f.felles.anlegg} (tjent ${kroner(f.felles.tjent)}${f.felles.rival ? `, ${RIVALER[f.felles.rival]} eier deres del nå` : ''})`);
    if (f.vern) d.push(`vern (${kroner(f.vern.kr)} per døgn, ${f.vern.holdt} døgn holdt${f.vern.brudd ? `, ${f.vern.brudd} brudd` : ''})`);
    return d.join(' · ');
  }
  function paktTekst(p, nå) {
    const igjen = Math.max(0, Math.ceil((p.slutt - nå) / 1440));
    if (p.type === 'allianse') return `Allianse med ${RIVALER[p.side]} mot ${RIVALER[p.mot]} – ${igjen} døgn igjen. Dere ser lagene deres og det de ser.`;
    return `Våpenhvile med ${RIVALER[p.side]} innen ${Math.round(p.r / 1000)} km av leiren – ${igjen} døgn igjen.`;
  }

  // ---------- lagring ----------
  const tilJSON = F => JSON.parse(JSON.stringify(F));
  function fraJSON(d) {
    try { if (!d || typeof d !== 'object' || d.versjon !== 1 || !Array.isArray(d.firmaer)) return null;
      const F = ny(d.leir); F.firmaer = [];
      for (const q of d.firmaer) { if (!q || !q.navn) continue; const f = nyttFirma(String(q.navn), { ny: !!q.ny });
        for (const k of ['bransje', 'hjem', 'konkurs', 'fast', 'felles', 'vern', 'eier', 'rival']) if (q[k] !== undefined) f[k] = q[k];
        for (const k of ['helse', 'holdning', 'levert', 'brutt', 'handel', 'handelDøgn', 'vernDøgn', 'fra']) f[k] = tall(q[k], f[k]);
        if (Array.isArray(q.behov)) f.behov = q.behov.map(String); if (q.tilbudt && typeof q.tilbudt === 'object') f.tilbudt = { ...q.tilbudt };
        f.helse = klem(f.helse, 0, 100); f.holdning = klem(f.holdning, 0, 100); F.firmaer.push(f); }
      for (const navn of Object.keys(KJENTE)) if (!finn(F, navn)) F.firmaer.push(nyttFirma(navn));
      F.pakter = Array.isArray(d.pakter) ? d.pakter.filter(p => p && p.id && RIVALER[p.side] && (p.type === 'hvile' || p.type === 'allianse') && Number.isFinite(p.slutt)) : [];
      F.talt = Array.isArray(d.talt) ? d.talt.map(String).slice(-300) : []; F.tekno = d.tekno && typeof d.tekno === 'object' ? { ...d.tekno } : {};
      for (const s of ['rød', 'grønn']) { F.brudd[s] = tall(d.brudd && d.brudd[s]); F.pause[s] = tall(d.pause && d.pause[s]); }
      F.nr = tall(d.nr); F.dag = tall(d.dag, -1);
      // visningens egne felt: faste tilbud som ligger ute, overraskelsen og innsynet etter et svik
      if (Array.isArray(d.fastÅpne)) F.fastÅpne = d.fastÅpne.filter(o => o && o.id && o.firma).map(o => ({ id: String(o.id), firma: String(o.firma) }));
      for (const k of ['overraskelse', 'innsyn']) if (d[k] && typeof d[k] === 'object' && Number.isFinite(d[k].til)) F[k] = { ...d[k] };
      return F;
    } catch (e) { return null; }
  }

  const api = { rabatt: null, eierSkifte, REGLER, RIVALER, KJENTE, NYE, BRANSJER, ØKONOMIORD, SAMARBEID, hash, lagRand, kroner, ny, nyttFirma, finn, aktive, reserveHjem, hjemsted, sikreHjem, økonomi, økonomiTekst,
    endreHoldning, holdningOrd, registrerKontrakt, anleggFor, kanSamarbeid, vilkår, inngå, fastTilbud, fastSvar, vernTime, avslutt, svik, tekno, låsOpp, brukTekno,
    annen, gjelder, aktivePakter, paktPris, kanPakt, inngåPakt, brytPakt, iPakt, alliert, paktDøgn, døgn, samarbeidTekst, paktTekst, tilJSON, fraJSON,
    rivalLevert, rivalKunde, rivalKanAnlegg, rivalAnlegg, rivalAnleggDøgn, rivalTekst, anleggBestemt: f => bestemt(f) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Firma = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
