/*
 * VIRKNING I LEIRBYGGENE (R18-B, 23. nov 2026; brukeren: «vi må legge til funksjoner og virkning i alle leirbyggene»).
 * Regler uten DOM: ÉN tabell (VIRKNING) som sier hva hvert leirbygg gjør, og små regnestykker over den. Visningen
 * (spill/leirvirkning-visning.js) kobler verdiene på der spillet regner (Folk, strøm, forsvar, kontrollrommet, kjøretøy, kroker).
 *
 * Feltene i tabellen (alle tall er Claudes forslag):
 *   tekst      kort tekst til byggelista og byggpanelet (hva bygget gjør)
 *   strøm      true = virker bare når bygget har strøm (kw < 0 i Leir.BYGG gjør det samme av seg selv)
 *   LEIREN (hele leiren; hvert slag teller én gang – flere av samme gir ikke mer):
 *   moral      poeng på moralmålet til folket          helse  helse per døgn for folket (0,02 = 2 %)
 *   mat        faktor på maten som spises (0,9 = 10 % mindre svinn)
 *   tempo      faktor på alt arbeid folket gjør (1,04 = 4 % raskere)
 *   vann       true = leiren har vann uten vannverket (som brønnen)
 *   radio      meter feltradioene når lenger          satellitt  true = terrenget stopper ikke feltradioen
 *   nett       faktor på strømmen fra strømnettet mens det virker
 *   bytte      faktor på det røverne tar av lager og diesel (0,6 = 40 % mindre)
 *   fangevakt  teller som så mange vakter for fanger i arbeid (færre rømmer)
 *   varsling   faktor på hvor langt vaktene ser fiender nær leiren
 *   drone      antall vaktdroner som sirkler rundt leiren (trenger = et annet bygg som må finnes)
 *   I LEIR.BYGG (kopieres inn ved start): lager (m³), plasser (senger), kw (+ gir strøm), diesel/sol (hvordan strømmen lages)
 *   RUNDT BYGGET (r = radius i meter):
 *   vern       faktor på treff mot egne lag innen r (den beste teller)
 *   sikt       faktor på sikten for egne lag innen r (natt: true = bare om natta)
 *   ser        fiender innen så mange meter fra bygget ses (radar: true = bare de som beveger seg og ikke står i skog)
 *   sinke      faktor på farten til fiender innen r
 *   erf        minutter erfaring per spilltime for egne lag som står i ro innen r (høyst REGLER.erfTak)
 *   ammo       andel ammunisjon per spilltime for egne lag innen r
 *   leging     helse per spilltime for sårede soldater innen r
 *   reparer    skade per spilltime som repareres på egne kjøretøy innen r
 *   fyll       andel tank per spilltime for egne kjøretøy innen r (bruker leirens diesel)
 *   skjerm     faktor på skade mot egne kjøretøy som står innen r
 */
(function (rot) {
  'use strict';
  // Tak og omregninger (Claudes forslag)
  const REGLER = {
    moralMaks: 15,          // mest moral byggene kan gi til sammen
    helseMaks: .08,         // mest helse per døgn til sammen
    matMin: .75, tempoMaks: 1.12, byttMin: .4, radioMaks: 15000,
    erfTak: 120,            // trening gir høyst «veteran» (120 min); elite krever ekte kamp
    literPerTonn: 1200,     // diesel fra leiren til kjøretøyenes tank (1 tonn olje ≈ 1200 l)
    natt: [21, 5],          // timene lysene gjør nytte (fra 21 til 5)
    halvSkade: .5,          // hardt skadet bygg virker halvt (som Leir.effekt)
  };
  const VIRKNING = {
    // ---------- eldre bygg (virkningene finnes fra før i andre filer; teksten sier hva de gjør) ----------
    kontrollrom: { tekst: 'Kartet, kameraene og radioen: ordre over radio, kameravakt og overvåking' },
    brakke: { tekst: 'Senger (8/14/20 på nivå 1–3) og ett byggelag til' },
    vakttårn: { tekst: 'Med vakt: lag innen 150 m ser 25 % lenger og treffer 20 % bedre innen 100 m; vaktene ser røverne 1,5 km unna' },
    port: { tekst: 'Åpning i gjerdet for folk og kjøretøy' },
    batteri: { tekst: 'Lagrer strøm (40/80/160 kWt): sol om dagen, lys om natta' },
    veg: { tekst: 'Bilen kjører fort på vegen, og skogen ryddes' },
    gjerde: { tekst: 'Stenger leiren; porter lager åpninger' },
    lagertelt: { tekst: 'Lagerplass +100/200/300 m³ (nivå 1–3)' },
    container: { tekst: 'Lagerplass +40/70/100 m³ (nivå 1–3)' },
    verksted: { tekst: 'Folk på «verksted» reparerer bygg og lager stål; reparerer også kjøretøy innen 40 m', strøm: true, r: 40, reparer: .05 },
    sykestue: { tekst: 'Folk på «stell» leger syke og sårede soldater innen 150 m' },
    // (Ø1, 28. nov) maskinene – reglene i spill/produksjon.js
    sagbruk: { tekst: '2 m³ tømmer → 1,1 m³ planker + 0,7 m³ flis i timen (3 folk på «Maskiner», 15 kW)', strøm: true },
    vedkløyver: { tekst: '0,6 m³ flis → 0,5 m³ ved i timen (1 folk, 3 kW)', strøm: true },
    fyrkjele: { tekst: 'Brenner 0,6 m³ flis (eller ved) i timen: 30 kW og varme i stedet for diesel (1 folk)' },
    // (ut6-kjeder, fase Ø9) de nye kjedene – reglene i spill/produksjon.js og spill/kjeder.js
    steinbrudd: { tekst: 'Bryter 1,5 m³ stein i timen ved fjell (2 folk på «Maskiner», 5 kW)', strøm: true },
    steinknuser: { tekst: '2 m³ stein → 1,8 m³ pukk i timen (2 folk, 20 kW)', strøm: true },
    betongblander: { tekst: '0,4 m³ pukk + 0,2 t sement → 0,5 m³ betong i timen (1 folk, 5 kW)', strøm: true },
    fiskemottak: { tekst: '0,8 t fisk fra båtene → 0,7 t frossen fisk i timen (3 folk, 25 kW)', strøm: true },
    mølle: { tekst: '0,6 t korn → 0,5 t mel i timen; kjøkkenet lager mat av melet (2 folk, 10 kW)', strøm: true },
    raffineri: { tekst: '0,25 t olje fra basen → 20 l diesel i timen til leirens tank (4 folk, 40 kW)', strøm: true },
    smie: { tekst: '0,5 t skrap → 0,3 t stål + 0,05 t deler i timen (2 folk, 10 kW)', strøm: true },
    drivstofftank: { tekst: 'Rommer 5 000/10 000/20 000 l diesel (nivå 1–3) til aggregat, fyring og fyllestasjon' },
    aggregat: { tekst: 'Gir 20/35/50 kW (nivå 1–3), bruker diesel' },
    solcelle: { tekst: 'Gir 5/9/14 kW i dagslys (nivå 1–3)' },
    kameramast: { tekst: 'Ser fiender innen 300/500/800 m (nivå 1–3) når kameravakta følger med' },
    radiomast: { tekst: 'Feltradioene når 15/25/40 km (nivå 1–3) i stedet for 8 km' },
    drivhus: { tekst: 'Dyrker 3 rasjoner mat i døgnet (mindre om vinteren)' },
    helikopterplass: { tekst: 'Helikopteret står her. Sårede soldater innen 250 m leges litt fortere (fløyet inn til stell)', r: 250, leging: .03 },
    sandsekkvoll: { tekst: 'Lag innen 15 m tar 40 % færre treff' },
    kjøkken: { tekst: 'Med folk på «kjøkken»: varm mat, mindre svinn og bedre moral' },
    brønn: { tekst: 'Vann til leiren når vannverket svikter' },

    // ---------- oversikt og samband ----------
    kommandosenter: { tekst: 'Feltradioene når 10 km lenger, og alt arbeid går 3 % raskere (bedre planlegging)', strøm: true, radio: 10000, tempo: 1.03 },
    dronehangar: { tekst: 'Holder én vaktdrone i lufta rundt leiren (1,5 km ut, ser 2,5 km)', strøm: true, drone: 1 },
    dronerampe: { tekst: 'Én vaktdrone til – trenger en dronehangar', strøm: true, drone: 1, trenger: 'dronehangar' },
    satellitt: { tekst: 'Samband via satellitt: åser og fjell stopper ikke feltradioene', strøm: true, satellitt: true },
    radartårn: { tekst: 'Ser fiender i bevegelse innen 5 km (ikke i skog)', strøm: true, ser: 5000, radar: true },
    kontor: { tekst: 'Arbeidet planlegges bedre: alt arbeid 4 % raskere', strøm: true, tempo: 1.04 },
    møtetelt: { tekst: 'Orientering før arbeidet: alt arbeid 3 % raskere', tempo: 1.03 },

    // ---------- lager og våpen ----------
    ammobunker: { tekst: 'Lag innen 150 m får ammunisjon (50 % i timen); røverne tar 40 % mindre av lager og diesel', r: 150, ammo: .5, bytte: .6 },
    våpenlager: { tekst: 'Lag innen 100 m får ammunisjon (25 % i timen); røverne tar 15 % mindre', strøm: true, r: 100, ammo: .25, bytte: .85 },
    lagerhall: { tekst: 'Lagerplass +250 m³', lager: 250 },
    kjølecontainer: { tekst: 'Maten holder lenger: 12 % mindre svinn (trenger strøm)', strøm: true, mat: .88 },

    // ---------- bo og leve ----------
    messe: { tekst: 'Felles måltider: moral +4 og 7 % mindre matsvinn', strøm: true, moral: 4, mat: .93 },
    offisersbrakke: { tekst: '4 senger og moral +1', plasser: 4, moral: 1 },
    dusjbrakke: { tekst: 'Moral +3 og helse +2 % i døgnet', strøm: true, moral: 3, helse: .02 },
    toalett: { tekst: 'Moral +2 og helse +2 % i døgnet (mindre smitte)', moral: 2, helse: .02 },
    vaskeri: { tekst: 'Rene klær: moral +2 og helse +1 % i døgnet', strøm: true, moral: 2, helse: .01 },
    vannrens: { tekst: 'Rent vann uten vannverket (som en brønn) og helse +1 % i døgnet', strøm: true, vann: true, helse: .01 },
    avfall: { tekst: 'Mindre rotter og smitte: helse +3 % i døgnet', helse: .03 },
    klima: { tekst: 'Bedre inneklima: moral +2 og helse +1 % i døgnet', strøm: true, moral: 2, helse: .01 },
    hundegård: { tekst: 'Hundene merker fiender: vaktene ser 30 % lenger. Moral +1', varsling: 1.3, moral: 1 },
    bålplass: { tekst: 'Samlingssted: moral +3', moral: 3 },
    flaggrekke: { tekst: 'Stolthet over selskapet: moral +2', moral: 2 },
    skilt: { tekst: 'Orden i leiren: moral +1', moral: 1 },
    parkering: { tekst: 'Egne kjøretøy som står innen 25 m, tar halv skade', r: 25, skjerm: .5 },

    // ---------- trening ----------
    treningstelt: { tekst: 'Lag i ro innen 80 m får 1 min erfaring i timen (høyst veteran). Moral +1', r: 80, erf: 1, moral: 1 },
    skytebane: { tekst: 'Lag i ro innen 120 m får 3 min erfaring i timen (høyst veteran)', r: 120, erf: 3 },
    hinderløype: { tekst: 'Lag i ro innen 100 m får 2 min erfaring i timen (høyst veteran)', r: 100, erf: 2 },
    arrest: { tekst: 'Fanger i arbeid voktes: teller som 4 vakter, færre rømmer', fangevakt: 4 },

    // ---------- kjøretøy ----------
    garasje: { tekst: 'Reparerer egne kjøretøy innen 30 m (8 % i timen)', strøm: true, r: 30, reparer: .08 },
    tungverksted: { tekst: 'Reparerer egne kjøretøy innen 50 m (25 % i timen)', strøm: true, r: 50, reparer: .25 },
    vaskeplass: { tekst: 'Vedlikehold: egne kjøretøy innen 20 m repareres litt (3 % i timen)', strøm: true, r: 20, reparer: .03 },
    fyllestasjon: { tekst: 'Fyller egne kjøretøy innen 30 m (halv tank i timen) med leirens diesel', strøm: true, r: 30, fyll: .5 },

    // ---------- sykehus ----------
    feltsykehus: { tekst: 'Sårede soldater innen 150 m leges 15 % i timen', strøm: true, r: 150, leging: .15 },
    medevac: { tekst: 'Sårede fløyes inn: soldater innen 250 m leges 8 % i timen', r: 250, leging: .08 },

    // ---------- forsvar ----------
    op: { tekst: 'Ser fiender innen 900 m; lag i posten (6 m) tar 30 % færre treff', r: 6, vern: .7, ser: 900 },
    betongbunker: { tekst: 'Lag innen 8 m tar 75 % færre treff', r: 8, vern: .25 },
    skyttergrav: { tekst: 'Lag innen 8 m tar 55 % færre treff', r: 8, vern: .45 },
    skyttergravHjørne: { tekst: 'Lag innen 8 m tar 55 % færre treff', r: 8, vern: .45 },
    kurver: { tekst: 'Lag innen 6 m tar 45 % færre treff', r: 6, vern: .55 },
    tvegger: { tekst: 'Lag innen 6 m tar halvparten så mange treff', r: 6, vern: .5 },
    porttårn: { tekst: 'Ser fiender innen 500 m; lag innen 10 m tar 30 % færre treff og ser 20 % lenger innen 40 m', r: 10, vern: .7, ser: 500, siktR: 40, sikt: 1.2 },
    piggtråd: { tekst: 'Fiender innen 8 m går med 35 % fart', r: 8, sinke: .35 },
    stålkryss: { tekst: 'Fiender innen 8 m går med halv fart (stopper kjøretøy)', r: 8, sinke: .5 },
    vegsperring: { tekst: 'Fiender innen 12 m går med 40 % fart', r: 12, sinke: .4 },
    sluse: { tekst: 'Fiender innen 12 m går med 30 % fart; kontrollbua ser 150 m', strøm: true, r: 12, sinke: .3, ser: 150 },
    lysmast: { tekst: 'Om natta ser lag innen 150 m 30 % lenger', r: 150, sikt: 1.3, natt: true },
    sirenemast: { tekst: 'Varsler hele leiren: vaktene ser fiender 50 % lenger unna', strøm: true, varsling: 1.5 },

    // ---------- strøm ----------
    generatorhus: { tekst: 'Stor generator: gir 30 kW og bruker diesel', kw: 30, diesel: true },
    trafo: { tekst: 'Henter mer fra strømnettet: dobbelt så mye mens nettet virker', nett: 2 },

    // ---------- ting i leiren (små virkninger, ellers bare utseende) ----------
    paller: { tekst: 'Lagerplass +2 m³', lager: 2 },
    presenning: { tekst: 'Lagerplass +5 m³', lager: 5 },
    sekkestabel: { tekst: 'Lag innen 3 m tar 15 % færre treff', r: 3, vern: .85 },
    ammokasser: { tekst: 'Lag innen 30 m får litt ammunisjon (5 % i timen)', r: 30, ammo: .05 },
    medisinkasser: { tekst: 'Sårede innen 30 m leges 2 % i timen', r: 30, leging: .02 },
    førstehjelp: { tekst: 'Sårede innen 30 m leges 2 % i timen; helse +1 % i døgnet', r: 30, leging: .02, helse: .01 },
    oljefat: { tekst: 'Fyller egne kjøretøy innen 15 m litt (5 % i timen) med leirens diesel', r: 15, fyll: .05 },
    jerrykanner: { tekst: 'Fyller egne kjøretøy innen 15 m litt (5 % i timen) med leirens diesel', r: 15, fyll: .05 },
    bærbargenerator: { tekst: 'Gir 3 kW og bruker diesel', kw: 3, diesel: true },
    bærbarsol: { tekst: 'Gir 1 kW i dagslys', kw: 1, sol: true },
    lyskaster: { tekst: 'Om natta ser lag innen 40 m 10 % lenger', r: 40, sikt: 1.1, natt: true },
    lysstolpe: { tekst: 'Om natta ser lag innen 30 m 10 % lenger', r: 30, sikt: 1.1, natt: true },
    kokeapparat: { tekst: 'Varm kaffe: moral +1', moral: 1 },
    feltbord: { tekst: 'Et sted å sitte: moral +1', moral: 1 },
    kartbord: { tekst: 'Planlegging: alt arbeid 1 % raskere', tempo: 1.01 },
    antennestativ: { tekst: 'Feltradioene når 2 km lenger', radio: 2000 },
    radiostasjon: { tekst: 'Feltradioene når 1 km lenger', radio: 1000 },
    småtelt: { tekst: '2 senger (telt)', plasser: 2 },
    kamotelt: { tekst: '2 senger (telt)', plasser: 2 },
  };
  // ting som bare er utseende (teksten sier det) – alt annet uten egen linje i tabellen får sin egen tekst fra Leir.BYGG
  const PYNT = 'Bare utseende';

  // Virkningsteksten for et bygg (B = Leir.BYGG[id] når den finnes)
  function tekst(id, B) {
    const v = VIRKNING[id]; if (v && v.tekst) return v.tekst;
    if (B && B.del) return 'Del i byggesettet: bygg rom med vegger, tak og dør (rom gir senger)';
    if (B && B.tekst && !/kommer senere/.test(B.tekst)) return B.tekst;
    return PYNT;
  }
  // KORT (to–tre ord på kortet i byggelista): «moral +4 · mindre matsvinn». Eldre bygg uten tall i tabellen har sin egen.
  const KORT_ELDRE = { kontrollrom: 'kart, kamera, radio', brakke: 'senger · byggelag', vakttårn: 'sikt · treff · varsling', port: 'åpning i gjerdet', batteri: 'lagrer strøm',
    veg: 'rask kjøring', gjerde: 'stenger leiren', lagertelt: 'lagerplass', container: 'lagerplass', sykestue: 'leger sårede', drivstofftank: 'rommer diesel',
    aggregat: 'strøm av diesel', solcelle: 'strøm av sol', kameramast: 'ser fiender', radiomast: 'radio 15–40 km', drivhus: 'dyrker mat', sandsekkvoll: 'vern 40 %',
    kjøkken: 'varm mat · moral', brønn: 'vann',
    // (ut4-balanse2) maskinene sto som «bare utseende» i byggelista
    sagbruk: 'planker og flis', vedkløyver: 'ved av flis', fyrkjele: 'strøm og varme av flis',
    steinbrudd: 'stein fra fjellet', steinknuser: 'pukk av stein', betongblander: 'betong av pukk', fiskemottak: 'frossen fisk', mølle: 'mel av korn',
    raffineri: 'diesel av olje', smie: 'stål og deler av skrap' };
  const pst = f => Math.round(Math.abs(1 - f) * 100);
  function kort(id, B) {
    const v = VIRKNING[id] || {}, d = [];
    if (KORT_ELDRE[id]) d.push(KORT_ELDRE[id]);
    else {
      if (v.kw > 0) d.push(`+${v.kw} kW`); if (v.plasser) d.push(`${v.plasser} senger`); if (v.lager) d.push(`lager +${v.lager}`);
      if (v.moral) d.push(`moral +${v.moral}`); if (v.vern) d.push(`vern ${pst(v.vern)} %`); if (v.ser) d.push(`ser ${v.ser >= 1000 ? v.ser / 1000 + ' km' : v.ser + ' m'}`);
      if (v.sinke) d.push('sinker fiender'); if (v.erf) d.push('trening'); if (v.ammo) d.push('ammunisjon'); if (v.leging) d.push('leger sårede');
      if (v.reparer) d.push('reparerer kjøretøy'); if (v.fyll) d.push('fyller kjøretøy'); if (v.radio) d.push(`radio +${v.radio / 1000} km`); if (v.satellitt) d.push('radio over fjell');
      if (v.drone) d.push('vaktdrone'); if (v.tempo) d.push(`arbeid +${pst(v.tempo)} %`); if (v.mat) d.push('mindre matsvinn'); if (v.helse) d.push('helse');
      if (v.vann) d.push('vann'); if (v.varsling) d.push('varsling'); if (v.bytte) d.push('mindre plyndring'); if (v.fangevakt) d.push('vokter fanger');
      if (v.nett) d.push('mer fra nettet'); if (v.sikt && !v.vern) d.push(v.natt ? 'sikt om natta' : 'sikt');
    }
    if (!d.length) return B && B.del ? 'del til rom' : 'bare utseende';
    return d.slice(0, 2).join(' · ');
  }
  // Teksten med nivåer der bygget har dem (B.nivå = { nøkkel: [n1, n2, n3] }) – «Nivå 2 av 3»
  function panelTekst(id, B, nivå) {
    const t = tekst(id, B), N = B && B.nivå ? Object.keys(B.nivå) : [];
    return N.length ? `${t}. Nivå ${nivå || 1} av ${B.nivå[N[0]].length}.` : t + '.';
  }
  // Styrken på bygget nå: 0 når det ikke virker (eller mangler strøm når det trenger det), 0,5 hardt skadet, ellers 1.
  // LB = Leir-reglene (virker), mangler = Set av id-er uten strøm (Leir.steg)
  function styrke(b, LB, mangler, B) {
    if (!LB.virker(b) || b.av) return 0;
    const v = VIRKNING[b.type] || {}, trengerStrøm = v.strøm || (B && B.kw < 0);
    if (trengerStrøm && mangler && mangler.has(b.id)) return 0;
    return b.hp < REGLER.halvSkade ? .5 : 1;
  }
  // Byggene som virker nå: [{ b, v, f }] (bare de som har en linje i tabellen)
  function aktive(L, LB, mangler) {
    const ut = []; if (!L || !Array.isArray(L.bygg)) return ut;
    for (const b of L.bygg) { const v = VIRKNING[b.type]; if (!v) continue; const f = styrke(b, LB, mangler, LB.BYGG && LB.BYGG[b.type]); if (f > 0) ut.push({ b, v, f }); }
    return ut;
  }
  // LEIREN: det hele leiren får (hvert slag én gang, det sterkeste). Gir alle nøklene, også når ingenting virker.
  // (A: aktive(...) regnet ut på forhånd, valgfritt – visningen gjenbruker lista)
  function leiren(L, LB, mangler, A) {
    A = A || aktive(L, LB, mangler); const beste = new Map();
    for (const a of A) { const g = beste.get(a.b.type); if (!g || a.f > g.f) beste.set(a.b.type, a); }
    const typer = new Set(beste.keys()), u = { moral: 0, helse: 0, mat: 1, tempo: 1, vann: false, radio: 0, satellitt: false, nett: 1, bytte: 1, fangevakt: 0, varsling: 1, drone: 0 };
    for (const { v, f } of beste.values()) {
      if (v.moral) u.moral += v.moral * f; if (v.helse) u.helse += v.helse * f;
      if (v.mat) u.mat *= 1 - (1 - v.mat) * f; if (v.tempo) u.tempo *= 1 + (v.tempo - 1) * f;
      if (v.vann) u.vann = true; if (v.radio) u.radio += v.radio * f; if (v.satellitt) u.satellitt = true;
      if (v.nett) u.nett *= 1 + (v.nett - 1) * f; if (v.bytte) u.bytte *= 1 - (1 - v.bytte) * f;
      if (v.fangevakt) u.fangevakt += v.fangevakt * f; if (v.varsling) u.varsling *= 1 + (v.varsling - 1) * f;
    }
    // droner: hvert bygg med «drone» gir sine (også flere hangarer), men bare når det byggene trenger, finnes
    for (const { b, v, f } of A) if (v.drone && f >= 1 && (!v.trenger || typer.has(v.trenger))) u.drone += v.drone;
    u.moral = Math.min(REGLER.moralMaks, u.moral); u.helse = Math.min(REGLER.helseMaks, u.helse);
    u.mat = Math.max(REGLER.matMin, u.mat); u.tempo = Math.min(REGLER.tempoMaks, u.tempo); u.bytte = Math.max(REGLER.byttMin, u.bytte);
    u.radio = Math.min(REGLER.radioMaks, u.radio);
    return u;
  }
  // RUNDT BYGGET: verdiene for et punkt (x, y). Gir { vern (laveste faktor), sikt (høyeste), sinke (laveste), erf, ammo, leging, reparer,
  // fyll (summer), skjerm (laveste) }. natt: true om natta (lysene).
  function ved(L, LB, mangler, x, y, natt, A) {
    const u = { vern: 1, sikt: 1, sinke: 1, erf: 0, ammo: 0, leging: 0, reparer: 0, fyll: 0, skjerm: 1 };
    for (const { b, v, f } of A || aktive(L, LB, mangler)) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (v.r && d <= v.r) {
        if (v.vern) u.vern = Math.min(u.vern, 1 - (1 - v.vern) * f);
        if (v.sinke) u.sinke = Math.min(u.sinke, 1 - (1 - v.sinke) * f);
        if (v.sikt && !v.siktR && (!v.natt || natt)) u.sikt = Math.max(u.sikt, 1 + (v.sikt - 1) * f);
        if (v.erf) u.erf += v.erf * f; if (v.ammo) u.ammo += v.ammo * f; if (v.leging) u.leging += v.leging * f;
        if (v.reparer) u.reparer += v.reparer * f; if (v.fyll) u.fyll += v.fyll * f; if (v.skjerm) u.skjerm = Math.min(u.skjerm, 1 - (1 - v.skjerm) * f);
      }
      if (v.siktR && d <= v.siktR && v.sikt && (!v.natt || natt)) u.sikt = Math.max(u.sikt, 1 + (v.sikt - 1) * f);
    }
    return u;
  }
  // Ser byggene fienden e ({ x, y, sti, her })? Radar ser bare dem som beveger seg (sti) og ikke står i skog (her.k === 1).
  function ser(L, LB, mangler, e, A) {
    for (const { b, v, f } of A || aktive(L, LB, mangler)) {
      if (!v.ser) continue; const r = v.ser * (f < 1 ? .5 : 1);
      if (Math.hypot(b.x - e.x, b.y - e.y) > r) continue;
      if (v.radar && (!e.sti || (e.her && e.her.k === 1))) continue;
      return b;
    }
    return null;
  }
  // Om natta? time = klokketimen 0–24
  const erNatt = time => { const [fra, til] = REGLER.natt, t = ((time % 24) + 24) % 24; return t >= fra || t < til; };
  // TRENING: ny erfaring for én mann etter dt spillminutter med «erf» minutter per time (aldri over taket, aldri ned)
  const trening = (erf, perTime, dt) => (erf >= REGLER.erfTak ? erf : Math.min(REGLER.erfTak, (erf || 0) + perTime * dt / 60));
  // FYLLING: hvor stor andel av tanken som fylles, og hvor mange liter diesel det tar. tank = tonn per kjøretøy, n = antall,
  // nå = andel i tanken (0–1), diesel = liter i leiren
  function fylling(nå, perTime, dt, tank, n, diesel) {
    const vil = Math.max(0, Math.min(1 - nå, perTime * dt / 60)), perAndel = tank * n * REGLER.literPerTonn;
    if (!(vil > 0) || !(perAndel > 0)) return { andel: 0, liter: 0 };
    const andel = Math.min(vil, Math.max(0, diesel) / perAndel); return { andel, liter: andel * perAndel };
  }
  // Kopierer lager, plasser og strøm fra tabellen inn i Leir.BYGG (så Leir.effekt og Leir.steg regner med dem), og
  // setter B.virkning = teksten. Gjør ingenting med bygg som ikke finnes.
  function brukPå(BYGG) {
    for (const [id, B] of Object.entries(BYGG || {})) {
      const v = VIRKNING[id]; B.virkning = tekst(id, B); B.virkningKort = kort(id, B); if (!v) continue;
      if (v.lager && !B.nivå) B.lager = v.lager; if (v.plasser && !B.nivå) B.plasser = v.plasser;
      if (v.kw > 0) { B.kw = v.kw; if (v.diesel) B.diesel = true; if (v.sol) B.sol = true; }
    }
    return BYGG;
  }
  // Hvilke ulike slag virkning tabellen har (vakta i sjekk.js teller dem)
  const NØKLER = ['moral', 'helse', 'mat', 'tempo', 'vann', 'radio', 'satellitt', 'nett', 'bytte', 'fangevakt', 'varsling', 'drone', 'lager', 'plasser', 'kw',
    'vern', 'sikt', 'ser', 'sinke', 'erf', 'ammo', 'leging', 'reparer', 'fyll', 'skjerm'];
  const api = { REGLER, VIRKNING, PYNT, NØKLER, KORT_ELDRE, kort, tekst, panelTekst, styrke, aktive, leiren, ved, ser, erNatt, trening, fylling, brukPå };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Leirvirkning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
