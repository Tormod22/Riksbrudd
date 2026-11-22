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
  // ---------- tallene (alle er Claudes forslag) ----------
  const REGLER = {
    versjon: 1,
    rykte: { start: { pålitelig: 50, hardhendt: 25, billig: 50 } },
    tilbudPerDag: 3,          // nye tilbud hver morgen (± 1 etter hvor pålitelig selskapet er)
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
    TYPER: {
      eskorte: { navn: 'Eskorte', betaling: 650000, timer: 10, hardhendt: 0, givere: ['firma', 'bygd', 'by'] },
      hold: { navn: 'Hold', betaling: 850000, holdTimer: [4, 10], ekstraTimer: 10, hardhendt: 1, givere: ['by', 'bygd', 'firma'] },
      rydd: { navn: 'Rydd vegsperre', betaling: 750000, timer: 14, hardhendt: 4, givere: ['firma', 'by'] },
      hent: { navn: 'Hent person', betaling: 500000, timer: 12, hardhendt: -2, givere: ['bygd', 'by', 'firma'] },
    },
    avstand: { min: 2500, maks: 22000 },    // meter fra leiren til stedene i kontraktene
    // meter: eskorten er framme innen fram av B; et lag holder et sted innen hold (uten fiender der); personen hentes innen hent;
    // med personen hjem når laget er innen leir av leiren
    nær: { fram: 200, hold: 350, hent: 80, leir: 300 },
    // de andre selskapene: sjansen per døgn for at de tar et åpent tilbud; andelen tilbud med en konkurrent; når konkurrenten er
    // ferdig (andel av fristen); sjansen for at konkurrenten angriper eskorten din
    rival: { tarPerDag: .35, konkurrent: .35, førstEtter: .55, angrep: .45, angrepVed: .35 },
  };
  const SIDER = ['blå', 'rød', 'grønn'];
  // oppdiktede firmaer (Claudes forslag; ikke ekte firmaer)
  const FIRMA = ['Gråfjell Frakt', 'Tindvik Drivstoff', 'Brattli Mineral', 'Dalsnes Kraftlag', 'Kvernhaug Mølle', 'Storlia Tømmer', 'Ytterø Sjømat'];
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
  function nySide(id, navn) { return { id, navn: navn || id, rykte: { ...REGLER.rykte.start }, pris: 'vanlig', aktive: [], ferdige: [], sum: { levert: 0, brutt: 0, tjent: 0, bøter: 0 } }; }
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
    const d = [ord('pålitelig', r.pålitelig), ord('hardhendt', r.hardhendt), ord('billig', r.billig)];
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
  function betaling(typ, r, prisId, meter, timer) {
    const T = REGLER.TYPER[typ], p = (REGLER.pris[prisId] || REGLER.pris.vanlig).faktor;
    const ekstra = typ === 'hold' ? timer / 6 : 1;
    return avrund(T.betaling * (.75 + r.pålitelig / 200) * p * ekstra * (1 + meter / 40000));
  }
  // steder: [{ navn, x, y, slag: 'tettsted' | 'bru', id, folk }] – visningen finner dem i kartet. Gir de nye tilbudene (lagt i S.tilbud).
  function lagTilbud(S, id, nå, steder, rand) {
    const r = rand || lagRand(S.nr * 7919 + Math.floor(nå) + 1), sd = side(S, id), R = sd.rykte, L = S.leir || { x: 0, y: 0 };
    const iNærheten = (steder || []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.y) && q.navn)
      .map(q => ({ ...q, d: Math.hypot(q.x - L.x, q.y - L.y) })).filter(q => q.d >= REGLER.avstand.min && q.d <= REGLER.avstand.maks);
    const nye = [];
    if (!iNærheten.length) return nye;
    const byer = iNærheten.filter(q => q.slag !== 'bru'), bruer = iNærheten.filter(q => q.slag === 'bru');
    for (let n = antallTilbud(R); n > 0; n--) {
      const typ = vektet(typeVekter(R), r), giverSlag = vektet(giverVekter(R, typ), r), T = REGLER.TYPER[typ];
      let sted = velg(byer.length ? byer : iNærheten, r), fra = null, timer = T.timer, hold = 0, person = null, last = null;
      if (typ === 'hold' && bruer.length && r() < .55) sted = velg(bruer, r);
      if (typ === 'eskorte') {
        // fra et sted til et annet (minst 2 km mellom), eller fra leiren når det bare finnes ett sted
        const andre = iNærheten.filter(q => q !== sted && Math.hypot(q.x - sted.x, q.y - sted.y) > 2000);
        fra = andre.length ? velg(andre, r) : { navn: 'leiren', x: L.x, y: L.y, slag: 'leir' };
        last = r() < .6 ? 'tankbil' : 'lastebil';
      }
      if (typ === 'hold') { hold = T.holdTimer[0] + Math.floor(r() * (T.holdTimer[1] - T.holdTimer[0] + 1)); timer = hold + T.ekstraTimer; }
      if (typ === 'hent') person = `${velg(ROLLER, r)} ${velg(FORNAVN, r)} ${velg(ETTERNAVN, r)}`;
      const giver = giverSlag === 'firma' ? { slag: 'firma', navn: velg(FIRMA, r) } : giverSlag === 'by' ? { slag: 'by', navn: `Kommunen i ${(byer.length ? velg(byer, r) : sted).navn}` } : { slag: 'bygd', navn: `Bygdelaget i ${sted.navn}` };
      const meter = Math.hypot(sted.x - L.x, sted.y - L.y) + (fra ? Math.hypot(fra.x - sted.x, fra.y - sted.y) : 0);
      const kr = betaling(typ, R, sd.pris, meter, hold);
      // vegsperra står litt utenfor stedet (visningen flytter den til nærmeste veg)
      const v = r() * Math.PI * 2, sperre = typ === 'rydd' ? { x: Math.round(sted.x + Math.cos(v) * 900), y: Math.round(sted.y + Math.sin(v) * 900) } : null;
      const andreSider = SIDER.filter(q => q !== id);
      const konkurrent = (typ === 'rydd' || typ === 'hent') && r() < REGLER.rival.konkurrent ? velg(andreSider, r) : null;
      const k = { id: 'k' + (++S.nr), type: typ, giver, status: 'tilbud', tilbudt: Math.round(nå), utløper: Math.round(nå + REGLER.tilbudVarer), timer, hold, betaling: kr,
        bot: avrund(kr * REGLER.bot), sted: { navn: sted.navn, x: Math.round(sted.x), y: Math.round(sted.y), slag: sted.slag || 'tettsted', id: sted.id === undefined ? null : sted.id },
        fra: fra ? { navn: fra.navn, x: Math.round(fra.x), y: Math.round(fra.y) } : null, last, person, sperre, konkurrent, side: null, for: id };
      k.tittel = tittel(k); nye.push(k);
    }
    S.tilbud.push(...nye);
    while (S.tilbud.length > REGLER.maksTilbud) S.tilbud.shift();
    return nye;
  }
  function tittel(k) {
    if (k.type === 'eskorte') return `Eskorter ${k.last === 'tankbil' ? 'tankbilen' : 'lastebilen'} fra ${k.fra.navn} til ${k.sted.navn}`;
    if (k.type === 'hold') return `Hold ${k.sted.slag === 'bru' ? k.sted.navn : k.sted.navn} i ${k.hold} timer`;
    if (k.type === 'rydd') return `Rydd vegsperra ved ${k.sted.navn}`;
    return `Hent ${k.person} i ${k.sted.navn}`;
  }
  // kravet med enkle ord
  function kravTekst(k) {
    const N = REGLER.nær;
    if (k.type === 'eskorte') return `${k.giver.navn} trenger ${k.last === 'tankbil' ? 'diesel' : 'varer'} fram. Bilen står ved ${k.fra.navn}. Kjør den til ${k.sted.navn} (innen ${N.fram} m) før fristen. Mister du bilen, er kontrakten brutt.`;
    if (k.type === 'hold') return `Ha et eget lag innen ${N.hold} m av ${k.sted.navn}, uten fiender der, i til sammen ${k.hold} timer før fristen.`;
    if (k.type === 'rydd') return `Et væpnet lag har sperret vegen ved ${k.sted.navn}. Slå det ut før fristen.`;
    return `Send et lag til ${k.person} (merket i kartet ved ${k.sted.navn}) og ta vedkommende med til leiren (innen ${N.leir} m). Blir laget slått ut, er kontrakten brutt.`;
  }

  // ---------- godta, levere, bryte ----------
  function godta(S, id, kId, nå, rand) {
    const sd = side(S, id), i = S.tilbud.findIndex(q => q.id === kId);
    if (i < 0) return { ok: false, grunn: 'Tilbudet finnes ikke lenger.' };
    if (sd.aktive.length >= REGLER.maksAktive) return { ok: false, grunn: `Dere har alt ${REGLER.maksAktive} kontrakter. Lever eller avbryt en først.` };
    const k = S.tilbud.splice(i, 1)[0], r = rand || Math.random;
    Object.assign(k, { status: 'aktiv', side: id, godtatt: Math.round(nå), frist: Math.round(nå + k.timer * 60), framdrift: 0, pris: sd.pris });
    if (k.type === 'eskorte' && r() < REGLER.rival.angrep) k.angrep = SIDER.filter(q => q !== id)[Math.floor(r() * 2)];
    sd.aktive.push(k); return { ok: true, k };
  }
  function avslutt(S, id, k, status) { const sd = side(S, id); sd.aktive = sd.aktive.filter(q => q.id !== k.id); k.status = status; sd.ferdige.unshift(k); sd.ferdige.length = Math.min(sd.ferdige.length, 12); }
  // gir { kr, rykte } – pengene settes inn av visningen
  function lever(S, id, k, nå) {
    const sd = side(S, id), T = REGLER.TYPER[k.type], P = REGLER.pris[k.pris] || REGLER.pris.vanlig;
    endreRykte(S, id, { pålitelig: REGLER.levert.pålitelig, hardhendt: T.hardhendt, billig: P.billig });
    k.ferdig = Math.round(nå); avslutt(S, id, k, 'levert'); sd.sum.levert++; sd.sum.tjent += k.betaling;
    return { type: 'levert', k, kr: k.betaling };
  }
  // grunn: 'frist' | 'tapt' | 'avbrutt' | 'rivalFørst'. Gir { kr: bot }
  function bryt(S, id, k, grunn, nå) {
    const sd = side(S, id), E = grunn === 'avbrutt' ? REGLER.avbrutt : grunn === 'rivalFørst' ? REGLER.rivalFørst : REGLER.brutt;
    const bot = grunn === 'rivalFørst' ? 0 : k.bot;
    endreRykte(S, id, { pålitelig: E.pålitelig }); k.ferdig = Math.round(nå); k.grunn = grunn;
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
      if (m.hentet) k.hentet = true;
      if (k.type === 'hold' && m.i) k.framdrift = Math.round((k.framdrift + dt) * 100) / 100;
      if (k.type === 'eskorte' && Number.isFinite(m.andel)) k.andel = Math.max(k.andel || 0, m.andel);
      const ferdig = k.type === 'hold' ? k.framdrift >= k.hold * 60 : !!m.i;
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
      if (r() >= REGLER.rival.tarPerDag) continue;
      const tar = k.konkurrent || SIDER.filter(q => q !== k.for)[Math.floor(r() * 2)];
      S.tilbud = S.tilbud.filter(q => q !== k); k.status = 'tatt'; k.side = tar; endreRykte(S, tar, { pålitelig: 2 });
      const sd = side(S, tar); sd.sum.levert++; sd.sum.tjent += k.betaling; ut.push({ type: 'rivalTok', k, rival: tar });
    }
    for (const id of SIDER) endreRykte(S, id, { hardhendt: REGLER.hardDrift });
    return ut;
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
      const S = ny(d.leir, {}); S.nr = tall(d.nr, 0); S.dag = tall(d.dag, -1); S.rivalDag = tall(d.rivalDag, -1);
      S.tilbud = (Array.isArray(d.tilbud) ? d.tilbud : []).filter(k => k && k.id && REGLER.TYPER[k.type] && k.sted && Number.isFinite(k.sted.x));
      for (const id of Object.keys(d.sider)) { const q = d.sider[id]; if (!q || typeof q !== 'object') continue; const sd = side(S, id);
        sd.navn = String(q.navn || id); sd.pris = REGLER.pris[q.pris] ? q.pris : 'vanlig';
        for (const k of Object.keys(sd.rykte)) sd.rykte[k] = mellom(tall(q.rykte && q.rykte[k], sd.rykte[k]), 0, 100);
        sd.aktive = (Array.isArray(q.aktive) ? q.aktive : []).filter(k => k && k.id && REGLER.TYPER[k.type] && Number.isFinite(k.frist));
        sd.ferdige = (Array.isArray(q.ferdige) ? q.ferdige : []).filter(k => k && k.id).slice(0, 12);
        for (const k of Object.keys(sd.sum)) sd.sum[k] = tall(q.sum && q.sum[k], 0); }
      return S;
    } catch (e) { return null; }
  }

  const api = { REGLER, SIDER, ORD, ny, side, endreRykte, ord, rykteTekst, typeVekter, giverVekter, antallTilbud, betaling, lagTilbud, tittel, kravTekst,
    godta, lever, bryt, avbryt, steg, dagSteg, hardhendt, settPris, fristTekst, tilJSON, fraJSON, lagRand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Selskap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
