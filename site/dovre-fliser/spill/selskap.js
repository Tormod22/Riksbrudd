/* W1 – Selskapet ditt (21. nov, inspirasjon fra Wardogs, docs/plan-wardogs.md): regler uten DOM (Node: require('./selskap');
 * nettleser: globalThis.Selskap). Visningen ligger i spill/selskap-visning.js (window.SelskapSpill).
 *
 * Hver side (blå, rød, grønn – sidens id, aldri «spilleren») er et privat militærselskap med et RYKTE på 0–100 i tre retninger:
 *   pålitelig  – holder kontraktene sine (opp når en kontrakt leveres, ned når den brytes);
 *   hardhendt  – sivile tap og ødeleggelse (opp ved rydding og sprengning, ned ved henting av folk og sakte hver dag);
 *   billig     – prisen (følger prisprofilen selskapet tar: lav, vanlig eller høy).
 * KONTRAKTER er betalte oppdrag med oppdragsgiver (bygd, by eller firma), frist, krav, betaling og bot ved brudd. Fire typer:
 *   eskorte – kjør en tankbil/lastebil fra A til B;   hold – ha et lag ved et sted (bru eller tettsted) i N timer;
 *   rydd    – slå ut et lag som sperrer vegen;        hent – hent en person og ta vedkommende med til leiren.
 * Nye tilbud kommer hver dag (lagTilbud), og hvilke som kommer, avhenger av ryktet. Noen tilbud har en konkurrent (et annet selskap)
 * som kommer først hvis du er for treg, og andre selskaper tar tilbud du lar ligge (rivalDag).
 * Tilstanden er ren JSON (tilJSON/fraJSON), lagres per leir og kan deles mellom flere spillere senere (flerspiller kommer senere).
 * Alle tallene er Claudes forslag til brukeren har bestemt noe annet.
 */
(function (rot) {
  'use strict';
  // felles tilfeldighet (spill/tilfeldig.js): samme frø gir samme svar på alle maskiner
  const TILFELDIG = (typeof globalThis !== 'undefined' && globalThis.Tilfeldig) || (typeof require === 'function' ? require('./tilfeldig') : null);
  const tilf = TILFELDIG ? TILFELDIG.verden : () => .5;
  // ---------- tallene (alle er Claudes forslag) ----------
  const REGLER = {
    versjon: 1,
    rykte: { start: { pålitelig: 50, hardhendt: 25, billig: 50 },
      // (R1-løkka 26. nov, kritikken: «alle tre selskapene har samme ryktetekst») de andre selskapene starter med sitt eget rykte –
      // Ravnsund er rask, røff og dyr; Mosevakt er stødig, skånsom og billig (Claudes forslag, passer omtalen i selskap-visning.js)
      sider: { rød: { pålitelig: 44, hardhendt: 66, billig: 24 }, grønn: { pålitelig: 70, hardhendt: 12, billig: 78 } } },
    // nye tilbud hver morgen (± 1 etter hvor pålitelig selskapet er). (ut2-balanse 28. nov, økonomitesten: én tropp leverte ca. 2,3
    // kontrakter i døgnet og 448 mill. på 30 døgn) 3 -> 2: et nytt selskap får to tilbud, et pålitelig (70+) tre (Claudes forslag)
    tilbudPerDag: 2,
    maksTilbud: 6,            // så mange tilbud ligger åpne samtidig (de eldste går ut)
    tilbudVarer: 30 * 60,     // spillminutter et tilbud ligger før oppdragsgiveren finner en annen
    maksAktive: 3,            // så mange kontrakter selskapet kan ha samtidig
    bot: .35,                 // bot ved brudd: andel av betalingen
    // prisprofilen: faktor på betalingen, og hvor mye «billig» flytter seg for hver levert kontrakt
    pris: { lav: { navn: 'Lav', faktor: .8, billig: 5 }, vanlig: { navn: 'Vanlig', faktor: 1, billig: 0 }, høy: { navn: 'Høy', faktor: 1.25, billig: -5 } },
    levert: { pålitelig: 6 }, brutt: { pålitelig: -10 }, avbrutt: { pålitelig: -7 }, rivalFørst: { pålitelig: -2 },
    hardDrift: -1,            // hardhendt per døgn (folk glemmer)
    sprengt: 3,               // hardhendt for hver bru/kraftverk/dam selskapet sprenger
    // typene: grunnbetaling (kr), frist i timer, hardhendt ved levering, hvem som gir dem
    // ØKONOMIEN (R1-løkka 26. nov, kritikken: «kontraktene betaler 0,4–1,5 mill. mot bygg på 2–18 mill.» – brukeren: kontraktene er den
    // røde tråden). Claudes forslag: grunnbetalingen er 2,5 × det den var (eskorte 650 000 -> 1 600 000 osv.), så én kontrakt på nivå 1
    // (startryktet, ca. 8 km) gir ca. 1,5–2,5 mill. kr – omtrent ett grunnbygg (dieseltank ca. 2,2 mill., aggregat ca. 3,9, brakke ca. 5)
    // eller en uke med lønn og drift (ca. 0,25 mill. i døgnet). Nivåfaktoren (opptil × 2,4) gjør de store kontraktene verdt 4–6 mill.
    // Startpengene (40 mill.) er brukerens valg og er ikke endret. test_balanse.js sjekker rammene.
    TYPER: {
      // (R2-løkka 26. nov, kritikken: «to ufarlige eskorter betalte 2,7 og 3,6 mill. kr for 20 min kjøring») betaling etter risiko og
      // innsats: grunnbetalingen gjelder en ROLIG rute (1 600 000 -> 700 000); en rute med meldt bakhold betaler × RISIKO.bakhold.faktor
      // (ut2-balanse 28. nov, økonomitesten: en eskorte ga i snitt 6,9 mill. for ca. 1,3 timer – 5,3 mill. i timen mot 0,7–1,0 for de andre)
      // eskorten betales etter strekket bilen kjøres (se lagTilbud), vegfaktoren er høyst × meterTak, og grunnbetalingen 700 000 -> 600 000
      // (Claudes forslag)
      eskorte: { navn: 'Eskorte', betaling: 600000, timer: 10, hardhendt: 0, givere: ['firma', 'bygd', 'by'], meterTak: 1.25 },
      // (ut2-balanse 28. nov) hold 2 100 000 -> 1 700 000: holdet var den største enkeltbetalingen (ca. 6,7 mill. på nivå 4) – Claudes forslag
      hold: { navn: 'Hold', betaling: 1700000, holdTimer: [4, 10], ekstraTimer: 10, hardhendt: 1, givere: ['by', 'bygd', 'firma'] },
      rydd: { navn: 'Rydd vegsperre', betaling: 1900000, timer: 14, hardhendt: 4, givere: ['firma', 'by'] },
      hent: { navn: 'Hent person', betaling: 1250000, timer: 12, hardhendt: -2, givere: ['bygd', 'by', 'firma'] },
    },
    avstand: { min: 2500, maks: 22000 },    // meter fra leiren til stedene i kontraktene
    // betalingen vokser med vegen: × (1 + meter / meterPer), for typer med meterTak høyst × meterTak (Claudes forslag)
    meterPer: 40000,
    // meter: eskorten er framme innen fram av B; et lag holder et sted innen hold (uten fiender der); personen hentes innen hent;
    // med personen hjem når laget er innen leir av leiren
    nær: { fram: 200, hold: 350, hent: 80, leir: 300 },
    // de andre selskapene: sjansen per døgn for at de tar et åpent tilbud; andelen tilbud med en konkurrent; når konkurrenten er
    // ferdig (andel av fristen); sjansen for at konkurrenten angriper eskorten din
    rival: { tarPerDag: .35, konkurrent: .35, førstEtter: .55, angrep: .45, angrepVed: .35 },
    // RISIKO PÅ ESKORTENE (R2-løkka 26. nov, Claudes forslag): hvert eskortetilbud sier om ruta er rolig eller har meldt bakhold.
    // bakhold.andel = andelen nye eskorter med meldt bakhold (alltid når et annet selskap holder et av stedene); faktor = på betalingen;
    // angrep = sjansen for at bakholdet faktisk kommer når kontrakten er tatt. En rolig rute kan også overraske (rolig.angrep).
    // Gamle lagrede eskorter uten risiko bruker rival.angrep som før.
    // (ut2-balanse 28. nov) bakhold.faktor 2,6 -> 1,6: bakholdet er seks mann, som en tropp på seks slår i de fleste kampene; og en rolig rute
    // betaler rolig.faktor 0,75 av grunnbetalingen, så den fortsatt er høyst halvparten av en rute med bakhold (test_balanse.js) – Claudes forslag
    RISIKO: { bakhold: { andel: .45, faktor: 1.6, angrep: .85 }, rolig: { angrep: .08, faktor: .75 } },
    // ---------- R18-A: DEN RØDE TRÅDEN (23. nov, brukeren: «det må være én tydelig rød tråd») – alle tallene er Claudes forslag ----------
    // Den første kontrakten: hent forsyninger i et tettsted (eller en bru) nær leiren. Stedet: nærmest ønsket avstand innenfor min–maks;
    // finnes ingen, legger visningen et forsyningslager reserve meter fra leiren. Fristen er romslig (1× er sanntid).
    // (R1-løkka 26. nov, kritikken: «den første kontrakten er en felle» – troppen gikk inn i Otta, bygdevernet skjøt, og radioen mistet
    // kontakten bak åsen.) NÅ: visningen legger alltid nødlageret i en låve «avstand» meter fra leiren, i retning bygda som gir jobben,
    // minst «utenfor» meter utenfor alle tettsteder. Claudes forslag: 900 m – under 35 % av håndradioens 3 km, så en ås aldri kan bryte
    // kontakten (Kontrollrom.REGLER.terreng). Betalingen er 1,5 mill. (før 400 000; se ØKONOMIEN over), ingen bot, og et brudd koster
    // bare halvparten av det vanlige ryktetapet (bruddRykte).
    første: { betaling: 1500000, timer: 72, min: 600, maks: 8000, ønsket: 2000, reserve: 900, avstand: 900, utenfor: 250, nær: 150, bruddRykte: .5 },
    // NIVÅENE: leverte kontrakter og «pålitelig» låser opp større kontrakter. faktor = på betalingen; menn = minste lagstørrelse for
    // hold/rydd på det nivået; teaser = sjansen for at ett av dagens tilbud er fra neste nivå (låst, men synlig)
    // (ut2-balanse 28. nov, økonomitesten: nivå 4 (× 2,4) ble nådd rundt dag 6) levert 2/5/10 -> 3/8/20 og faktor 1,35/1,8/2,4 ->
    // 1,15/1,35/1,55 (Claudes forslag): nivå 4 kommer nå rundt dag 13–15 for en som tar kontrakt etter kontrakt
    NIVÅER: [
      { nr: 1, navn: 'Ukjent', levert: 0, pålitelig: 0, faktor: 1, menn: 3 },
      { nr: 2, navn: 'Kjent i bygda', levert: 3, pålitelig: 55, faktor: 1.15, menn: 5 },
      { nr: 3, navn: 'Etablert', levert: 8, pålitelig: 65, faktor: 1.35, menn: 7 },
      { nr: 4, navn: 'Ettertraktet', levert: 20, pålitelig: 78, faktor: 1.55, menn: 9 },
    ],
    teaser: .5,
    // koblingene til resten av spillet ved levering: motangrep mot leiren (sjanse per type), en ny person vil bli med (fra nivå 2),
    // ekstra betaling når stedet er et tettsted dere holder
    motangrep: { rydd: .5, hold: .2, eskorte: .1, hent: .1, forsyning: 0 },
    rekrutt: { fraNivå: 2, sjanse: .35 },
    egetSted: .25,
  };
  // den første kontrakten er en egen type som aldri kommer blant de vanlige tilbudene (typeVekter har den ikke)
  REGLER.TYPER.forsyning = { navn: 'Hent nødlageret', betaling: REGLER.første.betaling, timer: REGLER.første.timer, hardhendt: 0, givere: ['bygd'] };
  const SIDER = ['blå', 'rød', 'grønn'];
  // oppdiktede firmaer (Claudes forslag; ikke ekte firmaer)
  const FIRMA = ['Gråfjell Frakt', 'Tindvik Drivstoff', 'Brattli Mineral', 'Dalsnes Kraftlag', 'Kvernhaug Mølle', 'Storlia Tømmer', 'Ytterø Sjømat'];
  // (ut4-firmaer, Ø5) registeret (spill/firma-visning.js) kan gi lista over firmaer som finnes nå (nye firmaer, ikke de som er konkurs):
  // api.firmaKilde = () => [navn]. Uten kilde (Node, økonomitesten) er lista FIRMA som før – samme tilfeldighet.
  const firmaListe = () => { const f = typeof api !== 'undefined' && typeof api.firmaKilde === 'function' ? api.firmaKilde() : null; return Array.isArray(f) && f.length ? f : FIRMA; };
  const ROLLER = ['legen', 'ingeniøren', 'sykepleieren', 'ordføreren', 'mekanikeren', 'veterinæren', 'presten', 'radiomannen'];
  const FORNAVN = ['Ingrid', 'Per', 'Solveig', 'Arne', 'Marit', 'Knut', 'Liv', 'Odd', 'Randi', 'Tor', 'Berit', 'Geir'];
  const ETTERNAVN = ['Halvorsen', 'Moe', 'Bakken', 'Lien', 'Brekke', 'Rustad', 'Haugen', 'Nygård', 'Sletten', 'Engen'];

  const mellom = (v, a, b) => Math.max(a, Math.min(b, v));
  const tall = (v, r = 0) => (Number.isFinite(+v) ? +v : r);
  // en enkel tallfølge med frø (samme frø gir samme tilbud – også hos flere spillere senere)
  function lagRand(frø) { let a = (frø >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const velg = (L, r) => L[Math.floor(r() * L.length) % L.length];
  function vektet(V, r) { const sum = Object.values(V).reduce((a, b) => a + b, 0); let x = r() * sum; for (const [k, v] of Object.entries(V)) { x -= v; if (x <= 0) return k; } return Object.keys(V)[0]; }
  const avrund = kr => Math.round(kr / 10000) * 10000;

  // ---------- tilstanden ----------
  function nySide(id, navn) { return { id, navn: navn || id, rykte: { ...REGLER.rykte.start, ...(REGLER.rykte.sider[id] || {}) }, pris: 'vanlig', aktive: [], ferdige: [], sum: { levert: 0, brutt: 0, tjent: 0, bøter: 0 } }; }
  // leir: { x, y }; navn: { blå: 'Selskapets navn', rød: …, grønn: … }
  function ny(leir, navn = {}) {
    const S = { versjon: REGLER.versjon, leir: leir ? { x: Math.round(leir.x), y: Math.round(leir.y) } : null, nr: 0, dag: -1, rivalDag: -1, tilbud: [], sider: {} };
    for (const id of SIDER) S.sider[id] = nySide(id, navn[id]);
    return S;
  }
  const side = (S, id) => S.sider[id] || (S.sider[id] = nySide(id));

  // ---------- ryktet ----------
  function endreRykte(S, id, endring) { const r = side(S, id).rykte; for (const [k, v] of Object.entries(endring || {})) if (k in r && Number.isFinite(v)) r[k] = mellom(Math.round((r[k] + v) * 10) / 10, 0, 100); return r; }
  // ord for ett tall i én retning
  const ORD = {
    pålitelig: ['bryter ord', 'ustødig', 'nokså stødig', 'holder ord', 'svært pålitelig'],
    hardhendt: ['skånsom', 'forsiktig', 'røff', 'hardhendt', 'brutal'],
    billig: ['dyr', 'nokså dyr', 'rimelig', 'billig', 'svært billig'],
  };
  const ord = (k, v) => ORD[k][Math.min(4, Math.floor(mellom(v, 0, 100) / 20.0001))];
  // én setning om hva folk sier om selskapet
  function rykteTekst(r) {
    // (R1-løkka) «dere er holder ord» -> «dere er til å stole på»
    const SETNING = { 'bryter ord': 'ikke til å stole på', 'holder ord': 'til å stole på' };
    const d = [ord('pålitelig', r.pålitelig), ord('hardhendt', r.hardhendt), ord('billig', r.billig)].map(o => SETNING[o] || o);
    return `Folk sier dere er ${d[0]}, ${d[1]} og ${d[2]}.`;
  }

  // ---------- tilbudene ----------
  // Hvordan ryktet styrer tilbudene: pålitelige selskap får flere eskorter og bedre betaling, hardhendte får ryddejobber fra firmaer
  // (og færre bygder vil ha dem), billige får flere tilbud fra bygdene.
  function typeVekter(r) {
    return { eskorte: mellom(.4 + r.pålitelig / 60, .2, 2.4), hold: 1, rydd: mellom(.4 + r.hardhendt / 45, .2, 2.6), hent: mellom(1.5 - r.hardhendt / 70, .15, 1.6) };
  }
  function giverVekter(r, typ) {
    const v = { bygd: mellom(1.3 - r.hardhendt / 60 + (r.billig - 50) / 80, .1, 2.2), by: 1, firma: mellom(.6 + r.hardhendt / 70 + (50 - r.billig) / 100, .2, 2.2) };
    for (const k of Object.keys(v)) if (!REGLER.TYPER[typ].givere.includes(k)) delete v[k];
    return v;
  }
  function antallTilbud(r) { return REGLER.tilbudPerDag + (r.pålitelig >= 70 ? 1 : 0) - (r.pålitelig < 25 ? 1 : 0); }
  // nivå: faktoren fra REGLER.NIVÅER (1 når den mangler); infl: prisstigningen i markedet (spill/spillet.js Marked, 1 når den mangler)
  function betaling(typ, r, prisId, meter, timer, nivåFaktor = 1, infl = 1) {
    const T = REGLER.TYPER[typ], p = (REGLER.pris[prisId] || REGLER.pris.vanlig).faktor;
    const ekstra = typ === 'hold' ? timer / 6 : 1;
    const mf = Math.min(T.meterTak || Infinity, 1 + meter / REGLER.meterPer);
    return avrund(T.betaling * (.75 + r.pålitelig / 200) * p * ekstra * mf * nivåFaktor * (Number.isFinite(infl) && infl > 0 ? infl : 1));
  }
  // steder: [{ navn, x, y, slag: 'tettsted' | 'bru', id, folk }] – visningen finner dem i kartet. Gir de nye tilbudene (lagt i S.tilbud).
  // o: { infl } – prisstigningen i markedet ganges inn i betalingen
  function lagTilbud(S, id, nå, steder, rand, o = {}) {
    const r = rand || lagRand(S.nr * 7919 + Math.floor(nå) + 1), sd = side(S, id), R = sd.rykte, L = S.leir || { x: 0, y: 0 };
    const nv = nivå(sd), NV = REGLER.NIVÅER, teaser = nv.nr < NV.length && r() < REGLER.teaser;
    const iNærheten = (steder || []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.y) && q.navn)
      .map(q => ({ ...q, d: Math.hypot(q.x - L.x, q.y - L.y) })).filter(q => q.d >= REGLER.avstand.min && q.d <= REGLER.avstand.maks);
    const nye = [];
    if (!iNærheten.length) return nye;
    const byer = iNærheten.filter(q => q.slag !== 'bru'), bruer = iNærheten.filter(q => q.slag === 'bru');
    // (ut4-firmaer, Ø5) o.antall = så mange tilbud (fast kunde: ett fra firmaet), o.giver = oppdragsgiveren (fast kunde), o.faktor på betalingen
    const ant = Number.isFinite(o.antall) ? o.antall : antallTilbud(R);
    for (let n = ant, forsøk = 0; n > 0 && forsøk < 4 * Math.max(1, ant); forsøk++) {
      // det siste tilbudet kan være fra neste nivå: låst til ryktet er godt nok, men synlig (så spilleren ser hva som venter)
      const kNivå = teaser && n === 1 ? NV[nv.nr] : nv;
      const typ = vektet(typeVekter(R), r), giverSlag = vektet(giverVekter(R, typ), r), T = REGLER.TYPER[typ];
      let sted = velg(byer.length ? byer : iNærheten, r), fra = null, timer = T.timer, hold = 0, person = null, last = null;
      if (typ === 'hold' && bruer.length && r() < .55) sted = velg(bruer, r);
      // (R2-løkka 26. nov, pakke «krig», kritikken: «"Hold Løten i 7 timer" lover at bygdevernet slipper dere inn – i Mosevakts hovedsete med
      // en garnison på 35–50») heller ikke andre jobber legges i et tettsted et annet selskap holder, når det finnes andre; ellers sier
      // kravteksten det ærlig (k.fare), og bygdevernet nevnes ikke (det finnes ikke i et sted et selskap holder)
      if (typ !== 'eskorte' && sted.slag !== 'bru' && sted.eier && sted.eier !== id) { const fri = byer.filter(q => !q.eier || q.eier === id); if (fri.length) sted = velg(fri, r); }
      // (kritikerløkka r3, Ingrid: «Hold Byflaten i 8 timer» og «… i 10 timer» fra to oppdragsgivere samtidig – én tropp kunne tatt begge
      // betalingene) aldri to tilbud (eller et tilbud og en aktiv kontrakt) av samme type på samme sted: et annet sted, ellers intet tilbud
      if (typ !== 'eskorte') { const brukt = q => opptatt(S, sd, typ, q); if (brukt(sted)) { const fri = (typ === 'hold' ? iNærheten : byer.length ? byer : iNærheten).filter(q => !brukt(q) && (!q.eier || q.eier === id || q.slag === 'bru')); if (!fri.length) continue; sted = velg(fri, r); } }
      if (typ === 'eskorte') {
        // fra et sted til et annet (minst 2 km mellom), eller fra leiren når det bare finnes ett sted.
        // (R1-løkka 26. nov, kritikken: «eskorte fra Ravnsunds hovedsete til Mosevakts hovedsete uten kommentar») steder et annet
        // selskap holder (q.eier fra visningen), brukes ikke i eskorter når det finnes andre; ellers sier kravteksten det (k.fare).
        const fritt = q => !q.eier || q.eier === id;
        if (!fritt(sted)) { const fri = byer.filter(fritt); if (fri.length) sted = velg(fri, r); }
        const andre = iNærheten.filter(q => q !== sted && Math.hypot(q.x - sted.x, q.y - sted.y) > 2000), friAndre = andre.filter(fritt);
        fra = friAndre.length ? velg(friAndre, r) : andre.length && !fritt(sted) ? velg(andre, r) : { navn: 'leiren', x: L.x, y: L.y, slag: 'leir' };
        last = r() < .6 ? 'tankbil' : 'lastebil';
      }
      if (typ === 'hold') { hold = T.holdTimer[0] + Math.floor(r() * (T.holdTimer[1] - T.holdTimer[0] + 1)); timer = hold + T.ekstraTimer; }
      if (typ === 'hent') person = `${velg(ROLLER, r)} ${velg(FORNAVN, r)} ${velg(ETTERNAVN, r)}`;
      // (R1-løkka) kommunen er stedets egen når stedet er et tettsted (så bygdevernet der vet om jobben – giver.by), ellers et tettsted i nærheten
      const kommune = sted.slag !== 'bru' ? sted : byer.length ? velg(byer, r) : sted;
      const giver = o.giver ? { ...o.giver } : giverSlag === 'firma' ? { slag: 'firma', navn: velg(firmaListe(), r) } : giverSlag === 'by' ? { slag: 'by', navn: `Kommunen i ${kommune.navn}`, by: kommune.id === undefined ? null : kommune.id }
        : { slag: 'bygd', navn: `Bygdelaget i ${sted.navn}`, by: sted.slag !== 'bru' && sted.id !== undefined ? sted.id : null };
      // (ut2-balanse 28. nov) eskorten betales etter strekket bilen kjøres (fra -> til): bilen står klar ved «fra» (selskap-visning.js
      // lagBil), så vegen fra leiren dit er ikke en del av jobben. De andre typene betales etter vegen fra leiren som før.
      const meter = typ === 'eskorte' && fra ? Math.hypot(fra.x - sted.x, fra.y - sted.y) : Math.hypot(sted.x - L.x, sted.y - L.y) + (fra ? Math.hypot(fra.x - sted.x, fra.y - sted.y) : 0);
      // eskorte: rolig rute eller meldt bakhold (alltid bakhold når et annet selskap holder et av stedene)
      const risiko = typ === 'eskorte' ? ([fra, sted].some(q => q && q.eier && q.eier !== id) || r() < REGLER.RISIKO.bakhold.andel ? 'bakhold' : 'rolig') : null;
      const kr = betaling(typ, R, sd.pris, meter, hold, kNivå.faktor, o.infl) * (Number.isFinite(o.faktor) && o.faktor > 0 ? o.faktor : 1) * (risiko === 'bakhold' ? REGLER.RISIKO.bakhold.faktor : risiko === 'rolig' ? (REGLER.RISIKO.rolig.faktor || 1) : 1);
      // vegsperra står litt utenfor stedet (visningen flytter den til nærmeste veg)
      const v = r() * Math.PI * 2, sperre = typ === 'rydd' ? { x: Math.round(sted.x + Math.cos(v) * 900), y: Math.round(sted.y + Math.sin(v) * 900) } : null;
      const andreSider = SIDER.filter(q => q !== id);
      const konkurrent = (typ === 'rydd' || typ === 'hent') && r() < REGLER.rival.konkurrent ? velg(andreSider, r) : null;
      const k = { id: 'k' + (++S.nr), type: typ, giver, status: 'tilbud', tilbudt: Math.round(nå), utløper: Math.round(nå + REGLER.tilbudVarer), timer, hold, betaling: kr,
        bot: avrund(kr * REGLER.bot), sted: { navn: sted.navn, x: Math.round(sted.x), y: Math.round(sted.y), slag: sted.slag || 'tettsted', id: sted.id === undefined ? null : sted.id },
        fra: fra ? { navn: fra.navn, x: Math.round(fra.x), y: Math.round(fra.y) } : null, last, person, sperre, konkurrent, side: null, for: id, nivå: kNivå.nr };
      if (typ === 'eskorte') { const holdt = [fra, sted].filter(q => q && q.eier && q.eier !== id); if (holdt.length) k.fare = holdt.map(q => ({ navn: q.navn, eier: q.eier })); k.risiko = risiko; k.betaling = avrund(k.betaling); k.bot = avrund(k.betaling * REGLER.bot); }
      else if (sted.eier && sted.eier !== id && sted.slag !== 'bru') k.fare = [{ navn: sted.navn, eier: sted.eier }];
      if (typ === 'eskorte' && opptatt(S, sd, typ, sted, fra)) continue;
      k.tittel = tittel(k); nye.push(k); S.tilbud.push(k); n--;
    }
    // de eldste går ut – aldri den første kontrakten (den har sin egen frist), r3: nye tilbud kommer også mens den ligger der
    while (S.tilbud.length > REGLER.maksTilbud) { const i = S.tilbud.findIndex(q => !q.første && !q.fast); if (i < 0) break; S.tilbud.splice(i, 1); }
    // (ut8-kr-penger) minst ett tilbud én tropp klarer – ikke for en fast kunde (o.giver), og bare når visningen sier hvor sterk spilleren er
    if (!o.giver && tall(o.styrke) > 0) { const k = sikreLett(S, id, nå, steder, r, o); if (k) nye.push(k); }
    return nye;
  }
  // ---------- ET TILBUD ÉN TROPP KLARER (ut8-kr-penger, 28. nov) ----------
  // Kritikken (Jonas Bakke, Ingrid Sæther): etter den første kontrakten var alle tilbudene «For svakt: 4 mann mot et forsvar på ca. 10 / 25 /
  // 50» – bygdevernet i stedet, en garnison eller fiender sett der – og Neste-lappen sto på «Ta en ny kontrakt» i fire døgn mens kassa rant ut.
  // Nå: finnes ingen åpent tilbud spilleren klarer med det største laget sitt (o.styrke, minst lett.styrke), lages ett: en hentejobb eller
  // et hold for bygdelaget/kommunen i et nært tettsted ingen andre holder (bygdevernet slipper dere inn – spill/krig-visning.js), eller ved
  // en bru, der det ikke står fiender. Fristen får en time ekstra per km (den skal kunne holdes til fots). Alle tallene er Claudes forslag.
  // steder kan ha: vern (bygdevernets mann), fiender (mann dere ser eller nylig så ved stedet), garnison (anslått, når et annet selskap holder det)
  // betaling = som et vanlig tilbud × betaling (en trygg jobb nær leiren betaler litt mindre enn en der troppen må slåss seg fram);
  // maksNivå: bare så lenge selskapet er på nivå 1–2 (starten, trinn 1–2) – senere skal lagene være sterke nok til de vanlige tilbudene;
  // rykte: andelen av det vanlige ryktet («pålitelig») en levert lett jobb gir
  REGLER.lett = { styrke: 4, min: 800, maksMeter: 9000, nærmeste: 3, holdSjanse: .5, ekstraPerKm: 1, garnison: 8, betaling: .85, maksNivå: 2, rykte: .5 };
  // det kjente forsvaret ved stedet for en jobb (mann), samme regel som visningens forsvarVed: bygdevernet teller ikke når jobben er for
  // bygdelaget eller kommunen der (de vet om jobben); en garnison teller når et annet selskap holder stedet
  function forsvarFor(k, sted, id) {
    if (!k || !sted || k.type === 'forsyning') return 0;
    const egen = k.giver && k.giver.slag !== 'firma' && k.giver.by != null && k.giver.by === sted.id;
    let m = tall(sted.fiender);
    if (sted.slag !== 'bru') { if (!egen) m += tall(sted.vern); if (sted.eier && sted.eier !== id) m += tall(sted.garnison, REGLER.lett.garnison); }
    return m;
  }
  // klarer én tropp på «styrke» mann (og «kjøretøy» egne biler) dette tilbudet? sted = stedet med vern/fiender (ellers k.sted)
  function klarbar(k, styrke, sd, sted, kjøretøy = 0) {
    if (!k || k.første || !REGLER.TYPER[k.type] || REGLER.TYPER[k.type].krav) return false;
    const K = kravFor(k); if (sd && K.nivå > nivå(sd).nr) return false; if (K.menn > tall(styrke)) return false;
    if (k.type === 'rydd') return false;
    if (k.type === 'eskorte' && (tall(kjøretøy) < 1 || k.risiko === 'bakhold' || k.fare)) return false;
    if (k.fare) return false;
    return forsvarFor(k, sted || k.sted, sd ? sd.id : k.for) < tall(styrke);
  }
  // stedet i lista som hører til tilbudet (samme id eller navn), med vern og fiender fra visningen
  const stedFor = (steder, k) => (steder || []).find(q => q && sammeSted(q, k.sted)) || k.sted;
  function sikreLett(S, id, nå, steder, r, o) {
    const sd = side(S, id), L = S.leir || { x: 0, y: 0 }, LT = REGLER.lett, styrke = Math.max(LT.styrke, tall(o.styrke)), nv = nivå(sd);
    // bare når selskapet står uten arbeid: ingen kontrakt i gang (har dere en, er det den som gir pengene i dag)
    if (nv.nr > LT.maksNivå || sd.aktive.some(k => !k.første && REGLER.TYPER[k.type] && !REGLER.TYPER[k.type].krav)) return null;
    if (S.tilbud.some(k => klarbar(k, styrke, sd, stedFor(steder, k), o.kjøretøy))) return null;
    // nærmest først: fra lett.min (et tettsted like ved leiren er en god første jobb – Ulvik lå 1,3 km fra Jonas' leir), helst innen
    // maksMeter; finnes ingen der, også lenger ut (til avstand.maks) – fristen vokser med avstanden
    const alle = (steder || []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.y) && q.navn)
      .map(q => ({ ...q, d: Math.hypot(q.x - L.x, q.y - L.y) })).filter(q => q.d >= LT.min && q.d <= REGLER.avstand.maks)
      .filter(q => tall(q.fiender) < styrke && (q.slag === 'bru' || !q.eier || q.eier === id)).sort((a, b) => a.d - b.d);
    const kand = alle.some(q => q.d <= LT.maksMeter) ? alle.filter(q => q.d <= LT.maksMeter) : alle;
    const ledige = kand.filter(q => !opptatt(S, sd, 'hent', q) || (!opptatt(S, sd, 'hold', q) && nv.menn <= styrke)).slice(0, LT.nærmeste);
    if (!ledige.length) return null;
    const sted = velg(ledige, r), byer = (steder || []).filter(q => q && q.slag !== 'bru' && Number.isFinite(q.x));
    const kanHold = nv.menn <= styrke && !opptatt(S, sd, 'hold', sted), kanHent = !opptatt(S, sd, 'hent', sted);
    const typ = kanHold && (!kanHent || r() < LT.holdSjanse) ? 'hold' : 'hent', T = REGLER.TYPER[typ];
    // giveren er bygdelaget eller kommunen i stedet (for en bru: det nærmeste tettstedet) – så bygdevernet slipper troppen inn
    const by = sted.slag !== 'bru' ? sted : byer.slice().sort((a, b) => Math.hypot(a.x - sted.x, a.y - sted.y) - Math.hypot(b.x - sted.x, b.y - sted.y))[0] || null;
    const giver = by && r() < .5 ? { slag: 'by', navn: `Kommunen i ${by.navn}`, by: by.id === undefined ? null : by.id } : { slag: 'bygd', navn: `Bygdelaget i ${(by || sted).navn}`, by: by && by.id !== undefined ? by.id : null };
    const hold = typ === 'hold' ? T.holdTimer[0] : 0, ekstra = Math.ceil(sted.d / 1000) * LT.ekstraPerKm;
    const timer = (typ === 'hold' ? hold + T.ekstraTimer : T.timer) + ekstra;
    const person = typ === 'hent' ? `${velg(ROLLER, r)} ${velg(FORNAVN, r)} ${velg(ETTERNAVN, r)}` : null;
    const kr = avrund(betaling(typ, sd.rykte, sd.pris, sted.d, hold, nv.faktor, o.infl) * LT.betaling);
    const k = { id: 'k' + (++S.nr), type: typ, giver, status: 'tilbud', tilbudt: Math.round(nå), utløper: Math.round(nå + REGLER.tilbudVarer), timer, hold, betaling: kr,
      bot: avrund(kr * REGLER.bot), sted: { navn: sted.navn, x: Math.round(sted.x), y: Math.round(sted.y), slag: sted.slag || 'tettsted', id: sted.id === undefined ? null : sted.id },
      fra: null, last: null, person, sperre: null, konkurrent: null, side: null, for: id, nivå: nv.nr, lett: true };
    k.tittel = tittel(k); S.tilbud.push(k);
    // maksTilbud: de eldste vanlige går ut, aldri dette
    while (S.tilbud.length > REGLER.maksTilbud) { const i = S.tilbud.findIndex(q => !q.første && !q.fast && !q.lett); if (i < 0) break; S.tilbud.splice(i, 1); }
    return k;
  }
  // (ut2-balanse 28. nov) PÅFYLL: åpner spilleren Selskapet uten tilbud og uten aktive kontrakter, kommer nye tilbud straks (selskap-visning.js,
  // så den røde tråden kan gå videre etter den første kontrakten). Før kunne det skje så ofte spilleren ville – én tropp på 60× kunne da ta
  // langt flere kontrakter i døgnet enn morgentilbudene (økonomitesten: opptil 97 på 30 døgn). Nå bare i starten – før selskapet (id) har
  // levert eller brutt mer enn den første kontrakten – og høyst én gang per spilldøgn: svarer true (og merker døgnet) når det er lov.
  function påfyll(S, dag, id) { if (!S || S.påfylt === dag) return false; const sd = id ? side(S, id) : null;
    if (sd && tall(sd.sum.levert) + tall(sd.sum.brutt) > 1) return false; S.påfylt = dag; return true; }
  // finnes det alt et tilbud eller en aktiv kontrakt av samme type på samme sted (eskorte: samme fra og til)?
  const sammeSted = (a, b) => !!(a && b && ((a.id != null && b.id != null && a.id === b.id) || (a.navn && a.navn === b.navn)));
  function opptatt(S, sd, typ, sted, fra) {
    return [...S.tilbud, ...(sd ? sd.aktive : [])].some(k => k && k.type === typ && sammeSted(k.sted, sted) && (typ !== 'eskorte' || sammeSted(k.fra, fra))); }
  function tittel(k) {
    // (ut3-varekontrakt) typer med egen tekst (spill/vare.js: lever, avtale, kjøp)
    { const T = REGLER.TYPER[k.type]; if (T && T.tittel) return T.tittel(k); }
    if (k.type === 'eskorte') return `Eskorter ${k.last === 'tankbil' ? 'tankbilen' : 'lastebilen'} fra ${k.fra.navn} til ${k.sted.navn}`;
    if (k.type === 'hold') return `Hold ${k.sted.slag === 'bru' ? k.sted.navn : k.sted.navn} i ${k.hold} timer`;
    if (k.type === 'rydd') return `Rydd vegsperra ved ${k.sted.navn}`;
    // (R1-løkka, kritikken: «Hent nødlageret i nødlageret») lageret har en retning fra leiren; gamle lagrede kontrakter uten den får
    // tettstedets navn, eller bare «Hent nødlageret»
    if (k.type === 'forsyning') return k.sted.retning ? `Hent nødlageret ${k.sted.retning} for leiren` : k.sted.slag === 'lager' || /^nødlager/i.test(k.sted.navn) ? 'Hent nødlageret' : `Hent nødlageret i ${k.sted.navn}`;
    return `Hent ${k.person} i ${k.sted.navn}`;
  }
  // (R1-løkka) jobben er for bygda/kommunen i tettstedet selv: bygdevernet der slipper lagene inn mens kontrakten er aktiv
  const vernetVet = k => !!(k.giver && k.giver.slag !== 'firma' && k.sted && k.sted.slag === 'tettsted' && k.giver.by != null && k.giver.by === k.sted.id && !(k.fare && k.fare.length));
  // kravet med enkle ord
  function kravTekst(k) {
    const N = REGLER.nær;
    { const T = REGLER.TYPER[k.type]; if (T && T.krav) return T.krav(k); }
    if (k.type === 'eskorte') return `${k.giver.navn} trenger ${k.last === 'tankbil' ? 'diesel' : 'varer'} fram. Bilen står ved ${k.fra.navn}. Kjør den til ${k.sted.navn} (innen ${N.fram} m) før fristen. Mister du bilen, er kontrakten brutt.`
      + (k.fare && k.fare.length ? ` Obs: ${k.fare.map(q => q.navn).join(' og ')} holdes av et annet selskap – regn med kamp der.` : '')
      + (k.risiko === 'bakhold' ? ' Det er meldt om bakhold langs ruta: send et lag med bilen eller i forkant. Derfor betaler jobben godt.'
        : k.risiko === 'rolig' ? ' Ruta regnes som rolig, så betalingen er lav.' : '');
    // (R2-løkka) et sted et annet selskap holder: si det ærlig (k.fare)
    const holdt = k.type !== 'eskorte' && k.fare && k.fare.length ? ` Obs: ${k.sted.navn} holdes av et annet selskap – regn med kamp mot garnisonen der.` : '';
    if (k.type === 'hold') return `Ha et eget lag innen ${N.hold} m av ${k.sted.navn}, uten fiender der, i til sammen ${k.hold} timer før fristen.` + (vernetVet(k) ? ' Bygdevernet der vet om jobben og slipper dere inn.' : '') + holdt;
    if (k.type === 'rydd') return `Et væpnet lag har sperret vegen ved ${k.sted.navn}. Slå det ut før fristen.` + holdt;
    if (k.type === 'forsyning') return k.sted.retning
      ? `${k.giver.navn} har gjemt et nødlager med mat og utstyr i ${k.sted.navn} (ca. ${Math.round((k.sted.d || REGLER.første.avstand) / 100) * 100} m, merket i kartet), men tør ikke hente det selv. Stedet ligger utenfor tettstedene og innen radiorekkevidde, og bygdevernet vet om jobben. Send en tropp dit (innen ${REGLER.første.nær} m) og bær lageret hjem til leiren (innen ${N.leir} m).`
      : `${k.giver.navn} har et nødlager med mat og utstyr ved ${k.sted.navn}, men tør ikke hente det selv. Send en tropp dit (innen ${REGLER.første.nær} m) og bær lageret hjem til leiren (innen ${N.leir} m).`;
    return `Send et lag til ${k.person} (merket i kartet ved ${k.sted.navn}) og ta vedkommende med til leiren (innen ${N.leir} m). Blir laget slått ut, er kontrakten brutt.` + holdt;
  }

  // ---------- NIVÅER OG KRAV (R18-A) ----------
  // nivået selskapet har nådd: alle kravene (leverte kontrakter og «pålitelig») må holde
  function nivå(sd) { const NV = REGLER.NIVÅER; let n = NV[0]; for (const q of NV) if (tall(sd.sum && sd.sum.levert) >= q.levert && tall(sd.rykte && sd.rykte.pålitelig) >= q.pålitelig) n = q; return n; }
  // hva som trengs for neste nivå: { nivå, mangler: [tekst] } – null på øverste nivå
  function nesteNivå(sd) {
    const nå = nivå(sd), q = REGLER.NIVÅER[nå.nr]; if (!q) return null; const mangler = [], lev = tall(sd.sum && sd.sum.levert), pål = tall(sd.rykte && sd.rykte.pålitelig);
    if (lev < q.levert) mangler.push(`${q.levert - lev} ${q.levert - lev === 1 ? 'levert kontrakt' : 'leverte kontrakter'} til (${lev} av ${q.levert})`);
    if (pål < q.pålitelig) mangler.push(`«pålitelig» ${q.pålitelig} (nå ${Math.round(pål)})`);
    return { nivå: q, mangler };
  }
  // kravet for å ta en kontrakt (avledet av typen og nivået, så gamle lagrede tilbud også får det):
  // nivå = selskapets nivå; menn = minst så mange friske i ett lag (hold, rydd); kjøretøy = et eget kjøretøy til eskorten
  function kravFor(k) {
    const NV = REGLER.NIVÅER, n = NV[Math.max(0, Math.min(NV.length, k.nivå || 1) - 1)], K = { nivå: n.nr, menn: 0, kjøretøy: 0 };
    if (k.type === 'hold') K.menn = n.menn; if (k.type === 'rydd') K.menn = n.menn + 1; if (k.type === 'eskorte') K.kjøretøy = 1;
    return K;
  }
  // har: { størsteLag (friske i det største egne laget), kjøretøy (egne kjøretøy uten kontrakt) } – fra visningen. Gir { ok, mangler: [tekst] }
  function kanTa(k, har, sd) {
    const K = kravFor(k), m = [], nv = sd ? nivå(sd).nr : 99;
    if (K.nivå > nv) m.push(`nivå ${K.nivå} «${REGLER.NIVÅER[K.nivå - 1].navn}» (dere er på nivå ${nv})`);
    if (har && K.menn && tall(har.størsteLag) < K.menn) m.push(`et lag med minst ${K.menn} friske (største lag nå: ${tall(har.størsteLag)})`);
    if (har && K.kjøretøy && tall(har.kjøretøy) < K.kjøretøy) m.push('et eget kjøretøy til eskorten (bestill et ved basen: trykk på basen i kartet)');
    // (R1-løkka 26. nov, kritikken: «✓ Dere har det som trengs (lag på 3+)» mens Krig sa «for svakt: 4 mann mot 5») har.forsvar = det
    // kjente forsvaret ved stedet i mann (samme tall som krigskartet). Samme regel som Strategi.kravFor: forsvaret minst like stort som
    // laget = for svakt. Det stopper ikke kontrakten (som «Send likevel» i Krig), men kortet viser det i stedet for ✓.
    const advarsel = [];
    if (har && (K.menn || k.type === 'hent' || k.type === 'eskorte') && tall(har.forsvar) > 0 && tall(har.størsteLag) <= tall(har.forsvar))
      advarsel.push(`For svakt: ${tall(har.størsteLag)} mann mot et forsvar på ca. ${Math.round(tall(har.forsvar))}${har.forsvarTekst ? ' (' + har.forsvarTekst + ')' : ''}`);
    return { ok: !m.length, mangler: m, advarsel };
  }
  // ---------- MARSJEN TIL STEDET (kritikerløkka r3, 26. nov) ----------
  // Ingrid: «Hold Byflaten i 10 timer» sto som «19,3 km fra leiren» med «✓ Dere har det som trengs», men marsjen var 35 km / 9,4 t gjennom
  // Moelv (Mosevakt), og fristen 20 t – i praksis tapt. Visningen regner ruta fra leiren (samme regel som ordre(): Terreng.ruteTil, utenom
  // fiendtlige tettsteder når omvegen er god nok) og gir m = { km, timer, gjennom: ['Moelv (Mosevakt holder det)'], omveg, ingen, forLangt }.
  // Claudes forslag: en marsj tar i praksis «slakk» ganger så lang tid som planen (hvil, motbakker, en kort stans); en ryddejobb trenger
  // «kamp» timer ved sperra; en hentejobb går fram og tilbake.
  REGLER.marsj = { slakk: 1.3, kamp: 1 };
  const tNum = t => String(Math.round(t * 10) / 10).replace('.', ',');
  const liste = L => (L.length <= 1 ? L.join('') : L.slice(0, -1).join(', ') + ' og ' + L[L.length - 1]);
  // gir { linje, advarsel } – linje = «marsj ca. 35 km, ca. 9,4 t, gjennom Moelv (…)», advarsel = tekst når fristen ikke kan holdes (eller '')
  function marsjVurdering(k, m) {
    if (!k || !m) return { linje: '', advarsel: '' };
    if (m.ingen) return { linje: 'ingen rute dit til fots fra leiren', advarsel: 'Troppen finner ingen rute dit til fots fra leiren (vann eller stengt terreng)' };
    if (m.forLangt) return { linje: 'for langt for én marsj fra leiren', advarsel: 'Stedet er for langt unna for én marsj fra leiren' };
    const M = REGLER.marsj, t = tall(m.timer), gj = (m.gjennom || []).filter(Boolean);
    const linje = `marsj ca. ${tNum(tall(m.km))} km, ca. ${tNum(t)} t` + (gj.length ? `, gjennom ${liste(gj)}` : m.omveg ? ', utenom fiendtlige tettsteder' : '');
    const tur = k.type === 'hent' ? 2 * t : t, trengs = tur * M.slakk + (k.type === 'hold' ? tall(k.hold) : k.type === 'rydd' ? M.kamp : 0);
    let advarsel = '';
    if (k.type !== 'eskorte' && trengs > tall(k.timer)) advarsel = k.type === 'hold' ? `Fristen holder ikke: marsjen tar ca. ${tNum(t)} t og holdet ${k.hold} t – fristen er ${k.timer} t` : k.type === 'hent' ? `Fristen holder ikke: fram og tilbake tar ca. ${tNum(tur)} t – fristen er ${k.timer} t` : `Fristen holder ikke: marsjen tar ca. ${tNum(t)} t – fristen er ${k.timer} t`;
    if (gj.length) advarsel = (advarsel ? advarsel + '. ' : '') + `Ruta går gjennom ${liste(gj)} – speidere stopper der, og andre lag må slåss seg gjennom`;
    return { linje, advarsel };
  }
  const kravKort = k => { const K = kravFor(k), d = []; if (K.nivå > 1) d.push(`nivå ${K.nivå}`); if (K.menn) d.push(`lag på ${K.menn}+`); if (K.kjøretøy) d.push('kjøretøy'); return d.join(', '); };

  // ---------- godta, levere, bryte ----------
  // har (valgfri): det leiren har (se kanTa) – uten har sjekkes bare nivået når sd finnes
  function godta(S, id, kId, nå, rand, har) {
    const sd = side(S, id), i = S.tilbud.findIndex(q => q.id === kId);
    if (i < 0) return { ok: false, grunn: 'Tilbudet finnes ikke lenger.' };
    if (sd.aktive.length >= REGLER.maksAktive) return { ok: false, grunn: `Dere har alt ${REGLER.maksAktive} kontrakter. Lever eller avbryt en først.` };
    if (har) { const kt = kanTa(S.tilbud[i], har, sd); if (!kt.ok) return { ok: false, grunn: 'Dere mangler: ' + kt.mangler.join(' og ') + '.', mangler: kt.mangler }; }
    const k = S.tilbud.splice(i, 1)[0], r = rand || tilf;
    Object.assign(k, { status: 'aktiv', side: id, godtatt: Math.round(nå), frist: Math.round(nå + k.timer * 60), framdrift: 0, pris: sd.pris });
    const RS = REGLER.RISIKO, pA = k.risiko === 'bakhold' ? RS.bakhold.angrep : k.risiko === 'rolig' ? RS.rolig.angrep : REGLER.rival.angrep;
    // (ut3-varekontrakt) en levering med meldt bakhold kan også bli angrepet på vegen (som eskorten)
    if ((k.type === 'eskorte' || (k.type === 'lever' && k.risiko === 'bakhold')) && r() < pA) k.angrep = SIDER.filter(q => q !== id)[Math.floor(r() * 2)];
    sd.aktive.push(k); return { ok: true, k };
  }
  function avslutt(S, id, k, status) { const sd = side(S, id); sd.aktive = sd.aktive.filter(q => q.id !== k.id); k.status = status; sd.ferdige.unshift(k); sd.ferdige.length = Math.min(sd.ferdige.length, 12); }
  // gir { kr, rykte } – pengene settes inn av visningen. R18-A: også { motangrep, rekrutt, nivåOpp } (koblingene til resten av spillet)
  function lever(S, id, k, nå, rand) {
    const sd = side(S, id), T = REGLER.TYPER[k.type], P = REGLER.pris[k.pris] || REGLER.pris.vanlig, før = nivå(sd).nr, r = rand || tilf;
    // (ut8-kr-penger) en lett jobb nær leiren (Selskap.sikreLett) gir halvt så mye rykte – den skal holde selskapet i live, ikke være snarveien til nivå 4
    endreRykte(S, id, { pålitelig: REGLER.levert.pålitelig * (k.lett ? REGLER.lett.rykte : 1), hardhendt: T.hardhendt, billig: P.billig });
    // (ut3-varekontrakt) k.sluttKr: det som betales ved slutten når en del er betalt underveis (avtale) eller frakten er trukket (lever)
    const sluttKr = Number.isFinite(k.sluttKr) ? k.sluttKr : k.betaling;
    k.ferdig = Math.round(nå); avslutt(S, id, k, 'levert'); sd.sum.levert++; sd.sum.tjent += sluttKr;
    const nv = nivå(sd), h = { type: 'levert', k, kr: sluttKr };
    if (nv.nr > før) h.nivåOpp = nv;
    if (!k.første && r() < (REGLER.motangrep[k.type] || 0)) h.motangrep = true;
    if (!k.første && nv.nr >= REGLER.rekrutt.fraNivå && r() < REGLER.rekrutt.sjanse) h.rekrutt = true;
    return h;
  }
  // grunn: 'frist' | 'tapt' | 'avbrutt' | 'rivalFørst'. Gir { kr: bot }
  function bryt(S, id, k, grunn, nå) {
    // (ut3-varekontrakt) 'frakt' = fraktfirmaet mistet lasten (liten ripe, ingen bot); 'avtale' = for mange døgn uten levering (ingen bot – den er betalt per døgn)
    const VR = REGLER.vareRykte || {}, sd = side(S, id), E = grunn === 'avbrutt' ? REGLER.avbrutt : grunn === 'rivalFørst' ? REGLER.rivalFørst : grunn === 'frakt' ? { pålitelig: VR.frakt || -3 } : grunn === 'avtale' ? { pålitelig: VR.avtale || -10 } : REGLER.brutt;
    const bot = grunn === 'rivalFørst' || grunn === 'frakt' || grunn === 'avtale' ? 0 : k.bot;
    // (kritikerløkka r3) å gi opp den første kontrakten koster ingenting (opplæringen skal kunne gå videre når den ikke kan fullføres)
    endreRykte(S, id, { pålitelig: k.første && grunn === 'avbrutt' ? 0 : E.pålitelig * (k.første ? REGLER.første.bruddRykte : 1) }); k.ferdig = Math.round(nå); k.grunn = grunn;
    avslutt(S, id, k, grunn === 'rivalFørst' ? 'tapt' : 'brutt'); if (grunn !== 'rivalFørst') sd.sum.brutt++; sd.sum.bøter += bot;
    return { type: grunn === 'rivalFørst' ? 'rivalFørst' : 'brutt', grunn, k, kr: bot };
  }
  function avbryt(S, id, kId, nå) { const k = side(S, id).aktive.find(q => q.id === kId); return k ? bryt(S, id, k, 'avbrutt', nå) : null; }

  // Ett steg for sidens aktive kontrakter. dt: spillminutter. mål: { [kontrakt-id]: { i, tapt, hentet } } fra visningen:
  //   i = kravet er oppfylt nå (eskorte framme, hold: eget lag der uten fiender, rydd: sperra slått ut, hent: personen i leiren);
  //   tapt = noe er mistet (bilen, laget med personen); hentet = (hent) et lag har personen med seg.
  // Gir hendelsene: levert, brutt (frist/tapt), rivalFørst, angrep (konkurrenten angriper eskorten).
  function steg(S, id, nå, dt, mål = {}) {
    const ut = [];
    for (const k of side(S, id).aktive.slice()) {
      const m = mål[k.id] || {};
      // (ut3-varekontrakt) typer med eget steg (spill/vare.js) avgjør selv når de er levert eller brutt; frist og bakhold som de andre
      const TS = REGLER.TYPER[k.type] && REGLER.TYPER[k.type].steg;
      if (TS) { const sv = TS(S, id, k, nå, dt, m, ut); if (sv === 'lever') { ut.push(lever(S, id, k, nå)); continue; } if (sv && sv.bryt) { ut.push(bryt(S, id, k, sv.bryt, nå)); continue; } }
      if (m.hentet) k.hentet = true;
      if (k.type === 'hold' && m.i) k.framdrift = Math.round((k.framdrift + dt) * 100) / 100;
      if (k.type === 'eskorte' && Number.isFinite(m.andel)) k.andel = Math.max(k.andel || 0, m.andel);
      const ferdig = TS ? false : k.type === 'hold' ? k.framdrift >= k.hold * 60 : !!m.i;
      if (ferdig) { ut.push(lever(S, id, k, nå)); continue; }
      if (m.tapt) { ut.push(bryt(S, id, k, 'tapt', nå)); continue; }
      if (nå > k.frist) { ut.push(bryt(S, id, k, 'frist', nå)); continue; }
      // konkurrenten kommer først når du ikke har kommet i gang innen førstEtter av fristen
      if (k.konkurrent && !k.hentet && nå > k.godtatt + (k.frist - k.godtatt) * REGLER.rival.førstEtter) { const h = bryt(S, id, k, 'rivalFørst', nå); h.rival = k.konkurrent; endreRykte(S, k.konkurrent, { pålitelig: REGLER.levert.pålitelig }); ut.push(h); continue; }
      if (k.angrep && !k.angrepet && (k.andel || 0) >= REGLER.rival.angrepVed) { k.angrepet = true; ut.push({ type: 'angrep', k, rival: k.angrep }); }
    }
    return ut;
  }
  // En gang per døgn: tilbud som har gått ut, forsvinner; de andre selskapene tar noen av de åpne tilbudene; hardhendt synker litt.
  function dagSteg(S, nå, rand) {
    const r = rand || lagRand(Math.floor(nå) + 17), ut = [];
    S.tilbud = S.tilbud.filter(k => { if (k.utløper > nå) return true; ut.push({ type: 'utløpt', k }); return false; });
    for (const k of S.tilbud.slice()) {
      // (ut1-okotest 28. nov, økonomitesten) aldri den første kontrakten – før tok et annet selskap den i 35 % av morgenene den lå
      // åpen, og den røde tråden mistet sitt første steg. r() trekkes likevel, så de andre tilbudene får samme tilfeldighet som før.
      if (r() >= REGLER.rival.tarPerDag || k.første || k.fast) continue;
      const tar = k.konkurrent || SIDER.filter(q => q !== k.for)[Math.floor(r() * 2)];
      S.tilbud = S.tilbud.filter(q => q !== k); k.status = 'tatt'; k.side = tar; endreRykte(S, tar, { pålitelig: 2 });
      const sd = side(S, tar); sd.sum.levert++; sd.sum.tjent += k.betaling; ut.push({ type: 'rivalTok', k, rival: tar });
    }
    for (const id of SIDER) endreRykte(S, id, { hardhendt: REGLER.hardDrift });
    return ut;
  }
  // ---------- DEN FØRSTE KONTRAKTEN OG TRÅDEN (R18-A) ----------
  // retningen fra a til b med ord (nord = +y): «nord», «nordøst» …
  const RETNING = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retningOrd = (dx, dy) => RETNING[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  // Lager den første kontrakten (et tilbud øverst i lista) når selskapet er nytt. steder som i lagTilbud; reserve = { x, y, navn } er
  // nødlagerets plass. (R1-løkka 26. nov) Med reserve ligger lageret ALLTID der (visningen legger det trygt: nær leiren, utenfor
  // tettstedene), og stedene gir bare bygda som gir jobben (den nærmeste innen min–maks; tettsted foran bru). Uten reserve (gamle
  // prøver) er stedet et tettsted eller en bru som før. Gir kontrakten, eller null når den alt er laget.
  function førsteKontrakt(S, id, nå, steder, reserve) {
    if (S.tråd) return null; const F = REGLER.første, L = S.leir || { x: 0, y: 0 };
    const kand = (steder || []).filter(q => q && q.navn && Number.isFinite(q.x) && Number.isFinite(q.y)).map(q => ({ ...q, d: Math.hypot(q.x - L.x, q.y - L.y) }))
      .filter(q => q.d >= F.min && q.d <= F.maks).sort((a, b) => (a.slag === 'bru') - (b.slag === 'bru') || Math.abs(a.d - F.ønsket) - Math.abs(b.d - F.ønsket));
    const bygd = kand[0] || null;
    let sted;
    if (reserve) { const dx = reserve.x - L.x, dy = reserve.y - L.y, d = Math.hypot(dx, dy), ret = retningOrd(dx, dy);
      sted = { navn: `låven ${ret} for leiren`, x: reserve.x, y: reserve.y, slag: 'lager', retning: ret, d: Math.round(d), by: bygd && bygd.slag !== 'bru' && bygd.id !== undefined ? bygd.id : null }; }
    else sted = bygd ? { ...bygd, by: bygd.slag !== 'bru' && bygd.id !== undefined ? bygd.id : null } : null;
    if (!sted) return null;
    const giverNavn = bygd ? (bygd.slag === 'bru' ? `Bygdelaget ved ${bygd.navn}` : `Bygdelaget i ${bygd.navn}`) : 'Bygdelaget i nærheten';
    const kr = avrund(F.betaling), k = { id: 'k' + (++S.nr), type: 'forsyning', første: true, giver: { slag: 'bygd', navn: giverNavn, by: sted.by },
      status: 'tilbud', tilbudt: Math.round(nå), utløper: Math.round(nå + 14 * 1440), timer: F.timer, hold: 0, betaling: kr, bot: 0,
      sted: { navn: sted.navn, x: Math.round(sted.x), y: Math.round(sted.y), slag: sted.slag || 'tettsted', id: sted.slag === 'lager' ? null : sted.id === undefined ? null : sted.id, retning: sted.retning || null, d: sted.d || null, by: sted.by },
      fra: null, last: null, person: null, sperre: null, konkurrent: null, side: null, for: id, nivå: 1 };
    k.tittel = tittel(k); S.tilbud.unshift(k);
    S.tråd = { k: k.id, gjort: [], byggVed: null, slutt: false };
    return k;
  }
  // Stegene i den første kontrakten, ett om gangen. b = øyeblikksbildet fra visningen:
  //   { tatt, tropper (egne tropper du har laget), framme (et lag har hentet forsyningene), levert, bygg (antall bygg i leiren, også bestilte),
  //     byggVed (antallet da betalingen kom – settes av oppdater), nyKontrakt (en kontrakt nr. 2 er tatt) }
  // pek = hvor spilleren skal trykke: 'selskap' | 'tropper' | 'kart' | 'leir'.
  const TRÅD = [
    { id: 'ta', tittel: 'Ta din første kontrakt', pek: 'selskap', lapp: k => `Ta kontrakten «${k.tittel}»`,
      tekst: k => `${k.giver.navn} tilbyr ${kroner(k.betaling)} for å hente nødlageret i ${k.sted.navn}. Åpne Selskapet og trykk «Ta kontrakten».`, ferdig: b => b.tatt },
    { id: 'tropp', tittel: 'Lag en tropp', pek: 'tropper', lapp: () => 'Lag en tropp av folkene dine',
      tekst: () => 'Åpne Tropper og trykk «Lag ny tropp». Velg 2–4 personer – la minst to stå igjen på Bygg.', ferdig: b => b.tropper > 0 || b.framme },
    // (R1-løkka, kritikken: «trykk «Marsjer»» når knappen heter «Kjør dit») o.knapp = navnet på knappen troppen har nå (fra visningen)
    { id: 'send', tittel: 'Send troppen', pek: 'kart', lapp: k => `Send troppen til ${k.sted.navn}`,
      tekst: (k, o) => `Velg troppen i kartet, trykk «${(o && o.knapp) || 'Marsjer'}» og så på det gule merket ved ${k.sted.navn}. Kommer troppen ikke fram, kan du gi opp jobben i Selskapet uten bot.`, ferdig: b => b.framme },
    { id: 'hjem', tittel: 'Kom tilbake', pek: 'kart', lapp: () => 'Ta nødlageret med hjem til leiren',
      tekst: () => 'Troppen bærer nødlageret. Gi den ordre tilbake til leiren – da betaler bygdelaget.', ferdig: b => b.levert },
    { id: 'bygg', tittel: 'Bygg noe for pengene', pek: 'leir', lapp: () => 'Bygg noe for pengene (Leir → Bygg)',
      tekst: k => `Bygdelaget betalte ${kroner(k.betaling)}. Åpne Leir og bygg noe – en brakke eller et vakttårn er et godt valg.`, ferdig: b => b.byggVed !== null && b.bygg > b.byggVed },
    // (R1-løkka, kritikken: «Kontrakt brutt», så «Ryktet ditt har vokst», så «Første kontrakt er fullført») etter et brudd sier
    // steget hva som skjedde og hva du gjør nå – ingen ros
    { id: 'neste', tittel: 'Neste kontrakt', pek: 'selskap', lapp: k => (bruttTekst(k) ? 'Prøv en ny kontrakt i Selskapet' : 'Ta en ny kontrakt i Selskapet'),
      tekst: k => (k && k.grunn === 'avbrutt' && k.første ? 'Dere ga opp den første kontrakten – det kostet ingenting. Nye kontrakter står i Selskapet – velg en dere har det som trengs til (se kravet på kortet), og send et lag som er sterkt nok.'
        : bruttTekst(k) ? `Den første kontrakten gikk galt: ${bruttTekst(k)}. Det kostet ingen bot, men litt rykte. Nye kontrakter står i Selskapet – velg en dere har det som trengs til (se kravet på kortet), og send et lag som er sterkt nok.`
        : 'Ryktet ditt har vokst. Nye kontrakter står i Selskapet – de større krever bedre rykte, kjøretøy eller sterkere lag.'), ferdig: b => b.nyKontrakt },
  ];
  // hva som gikk galt med en brutt kontrakt (tom tekst når den ikke er brutt)
  function bruttTekst(k) {
    if (!k || (k.status !== 'brutt' && k.status !== 'tapt')) return '';
    if (k.status === 'tapt') return 'et annet selskap kom først';
    { const T = REGLER.TYPER[k.type], t = T && T.bruttTekst ? T.bruttTekst(k) : ''; if (t) return t; }
    if (k.grunn === 'frist') return 'fristen gikk ut';
    if (k.grunn === 'avbrutt') return 'dere avbrøt den';
    return k.type === 'forsyning' ? 'troppen som bar nødlageret, ble slått ut' : k.type === 'eskorte' ? 'bilen gikk tapt' : 'laget ble slått ut';
  }
  const kroner = v => Math.round(v).toLocaleString('nb-NO').replace(/\u00a0/g, ' ') + ' kr';
  // går gjennom bildet og merker stegene som er gjort (ett om gangen, så lenge de holder). Svarer id-ene som ble gjort nå.
  // Brytes den første kontrakten (frist, troppen slått ut, avbrutt), hoppes stegene fram til «neste».
  function oppdaterTråd(S, b) {
    const T = S && S.tråd; if (!T || T.slutt) return []; const nye = [];
    if (b.brutt) { T.brutt = true; for (const s of TRÅD) if (s.id !== 'neste' && !T.gjort.includes(s.id)) { T.gjort.push(s.id); nye.push(s.id); } }
    for (const s of TRÅD) { if (T.gjort.includes(s.id)) continue; let f = false; try { f = !!s.ferdig({ ...b, byggVed: T.byggVed }); } catch (e) { f = false; } if (!f) break;
      T.gjort.push(s.id); nye.push(s.id); if (s.id === 'hjem') T.byggVed = tall(b.bygg, 0); }
    if (TRÅD.every(s => T.gjort.includes(s.id))) T.slutt = true;
    return nye;
  }
  const trådSteg = S => (S && S.tråd && !S.tråd.slutt ? TRÅD.find(s => !S.tråd.gjort.includes(s.id)) || null : null);
  // «Neste»-lappen for en aktiv kontrakt: hva den venter på nå. v = vurderingen fra visningen ({ i, hentet, lag, fiender, igjen, tapt }).
  function lappFor(k, v, nå) {
    v = v || {}; const st = k.sted.navn;
    { const T = REGLER.TYPER[k.type]; if (T && T.lapp) return T.lapp(k, v, nå); }
    if (k.type === 'hold') { const h = Math.floor(tall(k.framdrift) / 60), m = Math.round(tall(k.framdrift) % 60);
      return v.fiender ? `Fiender ved ${st} – rydd dem bort (holdt ${h} t ${m} min av ${k.hold} t)` : v.lag ? `Hold ${st}: ${h} t ${m} min av ${k.hold} t` : `Send et lag (${kravFor(k).menn}+) til ${st} og hold stedet`; }
    if (k.type === 'eskorte') return v.i ? `Lever: tankbilen er framme i ${st}` : `Kjør ${k.bil || 'bilen'} til ${st}` + (Number.isFinite(v.igjen) ? ` (${v.igjen >= 1000 ? (Math.round(v.igjen / 100) / 10).toString().replace('.', ',') + ' km' : Math.round(v.igjen) + ' m'} igjen)` : '');
    if (k.type === 'rydd') return v.i ? `Lever: sperra ved ${st} er slått ut` : `Slå ut vegsperra ved ${st}`;
    if (k.type === 'forsyning') return k.hentet ? 'Ta nødlageret med hjem til leiren' : `Send en tropp til ${st} og hent nødlageret`;
    return k.hentet ? `Ta ${k.person} med til leiren` : `Hent ${k.person} i ${st}`;
  }

  // sivile tap, sprengninger o.l.: hardhendt opp
  const hardhendt = (S, id, n) => endreRykte(S, id, { hardhendt: n });
  function settPris(S, id, p) { if (!REGLER.pris[p]) return false; side(S, id).pris = p; return true; }
  const fristTekst = (k, nå) => { const t = Math.max(0, k.frist - nå); const m = Math.ceil(t); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min igjen` : `${m} min igjen`; };

  // ---------- lagring (ren JSON, per leir) ----------
  const tilJSON = S => JSON.stringify(S);
  function fraJSON(t, leir) {
    try {
      const d = typeof t === 'string' ? JSON.parse(t) : t; if (!d || d.versjon !== REGLER.versjon || !d.sider) return null;
      if (leir && (!d.leir || Math.round(leir.x) !== d.leir.x || Math.round(leir.y) !== d.leir.y)) return null;
      const S = ny(d.leir, {}); S.nr = tall(d.nr, 0);
      if (d.tråd && typeof d.tråd === 'object') S.tråd = { k: String(d.tråd.k || ''), gjort: (Array.isArray(d.tråd.gjort) ? d.tråd.gjort : []).filter(x => TRÅD.some(s => s.id === x)), byggVed: Number.isFinite(d.tråd.byggVed) ? d.tråd.byggVed : null, slutt: !!d.tråd.slutt, brutt: !!d.tråd.brutt }; S.dag = tall(d.dag, -1); S.rivalDag = tall(d.rivalDag, -1); if (Number.isFinite(d.påfylt)) S.påfylt = d.påfylt;
      // (ut3-varekontrakt) det spill/vare.js husker (Storlias første kontrakt, sagbruket kjent)
      if (d.vare && typeof d.vare === 'object') S.vare = { storlia: !!d.vare.storlia, sagKjent: !!d.vare.sagKjent };
      S.tilbud = (Array.isArray(d.tilbud) ? d.tilbud : []).filter(k => k && k.id && REGLER.TYPER[k.type] && k.sted && Number.isFinite(k.sted.x));
      // (R1-løkka) gamle første kontrakter het «Hent nødlageret i nødlageret»: tittelen lages på nytt
      for (const k of S.tilbud) if (k.type === 'forsyning') k.tittel = tittel(k);
      for (const id of Object.keys(d.sider)) { const q = d.sider[id]; if (!q || typeof q !== 'object') continue; const sd = side(S, id);
        sd.navn = String(q.navn || id); sd.pris = REGLER.pris[q.pris] ? q.pris : 'vanlig';
        for (const k of Object.keys(sd.rykte)) sd.rykte[k] = mellom(tall(q.rykte && q.rykte[k], sd.rykte[k]), 0, 100);
        sd.aktive = (Array.isArray(q.aktive) ? q.aktive : []).filter(k => k && k.id && REGLER.TYPER[k.type] && Number.isFinite(k.frist));
        for (const k of sd.aktive) if (k.type === 'forsyning') k.tittel = tittel(k);
        sd.ferdige = (Array.isArray(q.ferdige) ? q.ferdige : []).filter(k => k && k.id).slice(0, 12);
        for (const k of Object.keys(sd.sum)) sd.sum[k] = tall(q.sum && q.sum[k], 0); }
      return S;
    } catch (e) { return null; }
  }

  const api = { FIRMA, firmaKilde: null, REGLER, SIDER, ORD, ny, side, endreRykte, ord, rykteTekst, typeVekter, giverVekter, antallTilbud, betaling, lagTilbud, tittel, kravTekst, bruttTekst, retningOrd,
    godta, lever, bryt, avbryt, steg, dagSteg, marsjVurdering, nivå, nesteNivå, kravFor, kanTa, kravKort, førsteKontrakt, TRÅD, oppdaterTråd, trådSteg, lappFor, hardhendt, settPris, fristTekst, tilJSON, fraJSON, lagRand, påfyll, forsvarFor, klarbar, sikreLett };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Selskap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
