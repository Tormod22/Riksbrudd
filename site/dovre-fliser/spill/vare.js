/* Riksbrudd – VAREKONTRAKTER (fase Ø2, 28. nov; docs/plan-selskap-okonomi.md kapittel 7, 14.5 og fasen Ø2 i kapittel 16).
 * Regler uten DOM. Node: const Vare = require('./vare'); Vare.registrer(require('./selskap')). Nettleser: globalThis.Vare (registrerer seg
 * selv i window.Selskap når fila lastes – rett etter spill/selskap-visning.js). Visningen ligger i spill/vare-visning.js (window.VareSpill).
 *
 * Tre nye kontrakttyper i Selskapet – samme maskineri som de andre (tilbud, frist, bot, rykte, nivå; Selskap.godta/steg/lever/bryt):
 *   lever  – «Storlia Tømmer kjøper 40 m³ planker, levert ved Otta innen 3 døgn»: varene fra leirens lager kjøres dit med en lastebil
 *            eller tømmerbil (eller bæres av et lag – lite). Levert = varene er framme. Eller: «La Gråfjell Frakt ta det» (15 %, de tar risikoen).
 *   avtale – leveranseavtale: N enheter hver dag i D døgn til fast pris. Kjøperen henter ved leiren hver morgen (døgnet etter at avtalen
 *            ble tatt). Har lageret ikke nok, blir det bot for døgnet; alt levert gir bonus til slutt.
 *   kjøp   – kjøpsavtale: du kjøper N enheter tømmer/diesel/mat hver dag i D døgn til fast pris (trygt når prisene stiger). Leveres til
 *            leiren; det som ikke får plass, beholder selgeren (du betaler likevel). Har kassa ikke pengene, blir det bot for døgnet.
 * Varene: tre (planker – nøkkelen i leiren heter fortsatt «tre»), tømmer, ved, flis, diesel og mat. Prisene: markedets verdi i dag
 * (visningen gir den) ganget med typens faktor. Tilstanden ligger på kontrakten (k.levert, k.turer, k.døgnGjort, k.mist, k.frakt) og
 * lagres med selskapet («riksbrudd-selskap»).
 * ALLE TALLENE ER CLAUDES FORSLAG (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  // ---------- tallene (alle er Claudes forslag) ----------
  const REGLER = {
    VARER: {
      tre: { navn: 'planker', Navn: 'Planker', enhet: 'm³' }, tømmer: { navn: 'tømmer', Navn: 'Tømmer', enhet: 'm³' },
      ved: { navn: 'ved', Navn: 'Ved', enhet: 'm³' }, flis: { navn: 'flis', Navn: 'Flis', enhet: 'm³' },
      diesel: { navn: 'diesel', Navn: 'Diesel', enhet: 'l' }, mat: { navn: 'mat', Navn: 'Mat', enhet: 'rasjoner' },
    },
    // LEVER: pris per enhet = markedets verdi × faktor (markedet selv gir 80 % og kjøper høyst 25 m³ planker i døgnet – kontraktene er
    // veien forbi det taket); mengde og frist (timer) trekkes innenfor intervallene; bot ved brudd = andel av betalingen
    lever: { faktor: 1.25, mengde: { tre: [20, 40], ved: [10, 20], flis: [15, 30] }, timer: [48, 72], bot: .35, varer: ['tre', 'tre', 'ved', 'flis'] },
    // LEVERANSEAVTALE: kjøperen henter ved leiren, så prisen er litt lavere; bot per døgn uten levering = andel av døgnets verdi; bonus til
    // slutt = andel av hele verdien når alle døgnene ble levert; mister dere over halvparten av døgnene, er avtalen brutt
    avtale: { faktor: 1.1, døgn: [5, 8], perDøgn: { ved: [6, 10], flis: [8, 12], tre: [8, 14] }, botDøgn: .5, bonus: .15, varer: ['ved', 'flis', 'tre'] },
    // KJØPSAVTALE: fast pris under markedet; bot per døgn dere ikke kan betale = andel av døgnets pris
    kjøp: { faktor: .92, døgn: [5, 7], perDøgn: { tømmer: [16, 30], diesel: [300, 600], mat: [15, 30] }, botDøgn: .25, varer: ['tømmer', 'tømmer', 'diesel', 'mat'] },
    // hvem som kjøper og selger hva (firmaene i spill/selskap.js)
    firma: { lever: { tre: ['Storlia Tømmer', 'Kvernhaug Mølle'], ved: ['Dalsnes Kraftlag'], flis: ['Dalsnes Kraftlag', 'Storlia Tømmer'] },
      avtale: { ved: ['Dalsnes Kraftlag'], flis: ['Dalsnes Kraftlag'], tre: ['Storlia Tømmer'] },
      kjøp: { tømmer: ['Storlia Tømmer'], diesel: ['Tindvik Drivstoff'], mat: ['Kvernhaug Mølle', 'Ytterø Sjømat'] } },
    // STORLIA (planen 14.5 og 15 punkt 6): den første tømmerkontrakten, når trinn 2 «Leverandør» er nådd. Billig tømmer i fem døgn – det
    // som peker mot sagbruket (sagbruket gir 26 m³ planker i døgnet av 48 m³ tømmer)
    storlia: { firma: 'Storlia Tømmer', vare: 'tømmer', faktor: .7, perDøgn: 20, døgn: 5, utløper: 14 * 1440 },
    // FRAKT med Gråfjell Frakt: de tar andel av betalingen, kjører i snitt kmt km/t langs vegen (vegen er omveg × luftlinja) og bruker fast
    // timer på lasting og lossing; sjansen for at lasten går tapt (de tar risikoen: ingen bot, liten ripe i ryktet, og de erstatter varene)
    frakt: { firma: 'Gråfjell Frakt', andel: .15, kmt: 35, omveg: 1.35, fast: 3, tap: .04, tapBakhold: .1, erstatning: .8 },
    // det et kjøretøy og et lag kan ta med seg (m³): lastebil og tømmerbil som i spill/ressurser.js, et lag bærer lite per frisk mann
    last: { lastebil: 12, tømmerbil: 20 }, bære: .25,
    // et nytt tilbud har meldt bakhold langs ruta med denne sjansen (som eskorten); da kommer angrepet med Selskap.REGLER.RISIKO.bakhold.angrep
    bakhold: .3, bakholdFaktor: 1.1,
    // tilbudene: så mange nye om morgenen (ett til når dere har en maskin som lager varen), høyst så mange åpne varetilbud, og de ligger så lenge
    perDag: 1, maksÅpne: 3, varer: 30 * 60,
    // stedene for levering: tettsteder innen [min, maks] meter fra leiren
    avstand: { min: 2500, maks: 40000 },
    // lastebilen er framme innen fram meter av stedet; varene lastes på innen leir meter av leiren
    nær: { fram: 250, leir: 400 },
    // rykte ved brudd som ikke er deres skyld (fraktfirmaet mistet lasten) og ved en brutt avtale
    rykte: { frakt: -3, avtale: -10 },
    // farten i tekstene: lastebilen kjører i snitt så stor andel av toppfarten (80 km/t), et lag går ca. 3,5 km/t
    bilAndel: .6, gåKmt: 3.5,
  };
  const TYPER = ['lever', 'avtale', 'kjøp'];
  const tall = (v, r = 0) => (Number.isFinite(+v) ? +v : r);
  const avrund = (kr, n = 10000) => Math.round(kr / n) * n;
  const mellom = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
  const velg = (L, r) => L[Math.floor(r() * L.length) % L.length];
  const nf = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const kroner = v => Math.round(v).toLocaleString('nb-NO').replace(/ /g, ' ') + ' kr';
  const mengdeTekst = (vare, m) => `${nf(m)} ${(REGLER.VARER[vare] || {}).enhet || ''}`.trim();
  const erVare = k => !!(k && TYPER.includes(k.type));
  function lagRand(frø) { let a = (frø >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------- stedene ----------
  // firmaets hjemsted: et av de nærmeste tettstedene innen avstand (fast per firma og leir, så Storlia alltid holder til samme sted)
  function hjemsted(firma, steder, leir) {
    const L = leir || { x: 0, y: 0 }, A = REGLER.avstand;
    const by = (steder || []).filter(q => q && q.navn && q.slag !== 'bru' && Number.isFinite(q.x) && Number.isFinite(q.y))
      .map(q => ({ ...q, d: Math.hypot(q.x - L.x, q.y - L.y) })).filter(q => q.d >= A.min && q.d <= A.maks).sort((a, b) => a.d - b.d).slice(0, 4);
    if (!by.length) return null; const q = by[hash(firma) % by.length];
    return { navn: q.navn, x: Math.round(q.x), y: Math.round(q.y), slag: 'tettsted', id: q.id === undefined ? null : q.id };
  }
  // kjøretid og marsj (timer) for km langs ruta
  const bilTimer = km => km / (80 * REGLER.bilAndel), gåTimer = km => km / REGLER.gåKmt;
  // det kjøretøyet tar (m³)
  const kapasitet = kj => (kj ? (REGLER.last[kj.type] || 0) * (kj.antall || 1) : 0);
  // det et lag bærer (m³): friske menn × bære
  const bære = friske => Math.round(Math.max(0, friske) * REGLER.bære * 10) / 10;

  // ---------- tilbudene ----------
  // pris per enhet (kr) – planker, ved og flis i hele hundrelapper, diesel og mat per liter/rasjon i hele kroner
  const enhetPris = (vare, verdi, faktor) => (vare === 'diesel' || vare === 'mat' ? Math.max(1, Math.round(verdi * faktor)) : Math.max(100, Math.round(verdi * faktor / 100) * 100));
  function grunn(S, id, type, vare, firma, nå, o) {
    return { id: 'k' + (++S.nr), type, vare, giver: { slag: 'firma', navn: firma }, status: 'tilbud', tilbudt: Math.round(nå), utløper: Math.round(nå + (o.varer || REGLER.varer)),
      hold: 0, fra: null, last: null, person: null, sperre: null, konkurrent: null, side: null, for: id, nivå: 1 };
  }
  // lager ett tilbud av typen (eller null). o: { steder, verdi: { vare: kr per enhet i markedet i dag }, leir, rand }
  function lagEtt(S, id, type, nå, o, vare, firma) {
    const r = o.rand || lagRand(S.nr * 31 + Math.floor(nå) + 7), V = o.verdi || {}, L = o.leir || S.leir || { x: 0, y: 0 };
    const R = REGLER[type]; vare = vare || velg(R.varer, r); if (!(V[vare] > 0)) return null;
    firma = firma || velg(REGLER.firma[type][vare], r);
    const k = grunn(S, id, type, vare, firma, nå, o);
    if (type === 'lever') {
      const sted = hjemsted(firma, o.steder, L); if (!sted) { S.nr--; return null; }
      k.sted = sted; k.mengde = Math.round(mellom(r, R.mengde[vare]) / 5) * 5 || 5; k.timer = mellom(r, [R.timer[0] / 12, R.timer[1] / 12]) * 12;
      k.risiko = r() < REGLER.bakhold ? 'bakhold' : 'rolig';
      k.enhetPris = enhetPris(vare, V[vare], R.faktor * (k.risiko === 'bakhold' ? REGLER.bakholdFaktor : 1));
      k.betaling = avrund(k.mengde * k.enhetPris); k.bot = avrund(k.betaling * R.bot); k.levert = 0; k.turer = [];
    } else {
      k.sted = { navn: 'leiren', x: Math.round(L.x), y: Math.round(L.y), slag: 'leir', id: null };
      k.døgn = mellom(r, R.døgn); k.perDøgn = mellom(r, R.perDøgn[vare]); if (vare === 'diesel') k.perDøgn = Math.round(k.perDøgn / 50) * 50;
      k.enhetPris = enhetPris(vare, V[vare], R.faktor); k.dagKr = avrund(k.perDøgn * k.enhetPris, 1000);
      k.botDøgn = avrund(k.dagKr * R.botDøgn, 1000); k.timer = k.døgn * 24 + (type === 'avtale' ? 1 : 0); k.døgnGjort = 0; k.mist = 0; k.levertDøgn = 0;
      if (type === 'avtale') { k.bonus = avrund(k.dagKr * k.døgn * R.bonus); k.betaling = k.dagKr * k.døgn + k.bonus; }
      else { k.betaling = 0; k.kostnad = k.dagKr * k.døgn; }
      k.bot = avrund(k.botDøgn * 2, 1000);
    }
    k.tittel = tittel(k); return k;
  }
  // nye varetilbud om morgenen. o: { steder, verdi, lager, perDøgn: { vare: det maskinene lager i døgnet }, leir, rand }
  // Gir de nye (lagt i S.tilbud). Ingen nye når det alt ligger maksÅpne varetilbud.
  function lagTilbud(S, id, nå, o = {}) {
    const r = o.rand || lagRand(S.nr * 7919 + Math.floor(nå) + 101), nye = [];
    const åpne = () => S.tilbud.filter(erVare).length, P = o.perDøgn || {};
    const n = REGLER.perDag + (Object.values(P).some(v => v > 0) ? 1 : 0);
    for (let i = 0, f = 0; i < n && f < 6 && åpne() < REGLER.maksÅpne; f++) {
      // det maskinene lager, blir oftere til leveranser (planker fra saga, ved fra kløyveren)
      const x = r(), type = x < .5 ? 'lever' : x < .78 ? 'avtale' : 'kjøp';
      let vare = null; if (type !== 'kjøp') { const lages = REGLER[type].varer.filter(v => P[v] > 0); if (lages.length && r() < .7) vare = velg(lages, r); }
      const k = lagEtt(S, id, type, nå, { ...o, rand: r }, vare); if (!k) continue;
      if (S.tilbud.some(q => erVare(q) && q.type === k.type && q.vare === k.vare && q.giver.navn === k.giver.navn)) { continue; }
      S.tilbud.push(k); nye.push(k); i++;
    }
    return nye;
  }
  // DEN FØRSTE TØMMERKONTRAKTEN fra Storlia (trinn 2). Gir kontrakten, eller null når den alt er laget. S.vare.storlia husker det.
  function storliaTilbud(S, id, nå, o = {}) {
    if (!S.vare) S.vare = {}; if (S.vare.storlia) return null; const T = REGLER.storlia, V = o.verdi || {}; if (!(V[T.vare] > 0)) return null;
    const k = grunn(S, id, 'kjøp', T.vare, T.firma, nå, { varer: T.utløper }), L = o.leir || S.leir || { x: 0, y: 0 };
    Object.assign(k, { sted: { navn: 'leiren', x: Math.round(L.x), y: Math.round(L.y), slag: 'leir', id: null }, døgn: T.døgn, perDøgn: T.perDøgn, enhetPris: enhetPris(T.vare, V[T.vare], T.faktor),
      timer: T.døgn * 24, døgnGjort: 0, mist: 0, levertDøgn: 0, betaling: 0, storlia: true, fast: true });
    k.dagKr = avrund(k.perDøgn * k.enhetPris, 1000); k.botDøgn = avrund(k.dagKr * REGLER.kjøp.botDøgn, 1000); k.kostnad = k.dagKr * k.døgn; k.bot = avrund(k.botDøgn * 2, 1000);
    k.tittel = tittel(k); S.tilbud.unshift(k); S.vare.storlia = true; return k;
  }

  // ---------- tekstene ----------
  function tittel(k) {
    const V = REGLER.VARER[k.vare] || { navn: k.vare, enhet: '' };
    if (k.type === 'lever') return `${k.giver.navn} kjøper ${mengdeTekst(k.vare, k.mengde)} ${V.navn}, levert ved ${k.sted.navn} innen ${Math.round(k.timer / 24 * 10) / 10 === Math.round(k.timer / 24) ? Math.round(k.timer / 24) + ' døgn' : k.timer + ' timer'}`.replace('innen 1 døgn', 'innen et døgn');
    if (k.type === 'avtale') return `Leveranseavtale: ${mengdeTekst(k.vare, k.perDøgn)} ${V.navn} hvert døgn i ${k.døgn} døgn til ${k.giver.navn}`;
    return `Kjøpsavtale: ${mengdeTekst(k.vare, k.perDøgn)} ${V.navn} hvert døgn i ${k.døgn} døgn fra ${k.giver.navn}`;
  }
  const prisTekst = k => (k.vare === 'diesel' || k.vare === 'mat' ? `${kroner(k.enhetPris)} per ${k.vare === 'diesel' ? 'liter' : 'rasjon'}` : `${kroner(k.enhetPris)} per ${REGLER.VARER[k.vare].enhet}`);
  function krav(k) {
    const V = REGLER.VARER[k.vare] || { navn: k.vare };
    if (k.type === 'lever') return `${k.giver.navn} betaler ${prisTekst(k)} for ${mengdeTekst(k.vare, k.mengde)} ${V.navn} levert i ${k.sted.navn} (innen ${REGLER.nær.fram} m) før fristen. Last varene fra leirens lager på en lastebil eller tømmerbil ved leiren og kjør dem dit (flere turer går fint), la et lag bære litt, eller la ${REGLER.frakt.firma} ta det for ${Math.round(REGLER.frakt.andel * 100)} %.`
      + (k.risiko === 'bakhold' ? ' Det er meldt om bakhold langs ruta – send et lag med bilen. Derfor betaler jobben litt bedre.' : ' Ruta regnes som rolig.');
    if (k.type === 'avtale') return `${k.giver.navn} henter ${mengdeTekst(k.vare, k.perDøgn)} ${V.navn} ved leiren hvert døgn i ${k.døgn} døgn og betaler ${prisTekst(k)} (${kroner(k.dagKr)} per døgn). Mangler lageret varene når de kommer, blir det bot (${kroner(k.botDøgn)}). Alt levert gir en bonus på ${kroner(k.bonus)} til slutt. Fast pris – også om markedet stiger.`;
    return `Dere kjøper ${mengdeTekst(k.vare, k.perDøgn)} ${V.navn} hvert døgn i ${k.døgn} døgn til fast pris, ${prisTekst(k)} (${kroner(k.dagKr)} per døgn). Varene kommer til leiren – det som ikke får plass på lageret, beholder ${k.giver.navn} (betales likevel). Mangler kassa pengene, blir det bot (${kroner(k.botDøgn)}). Trygt når prisene stiger, dyrt når de faller.`
      + (k.storlia ? ' Tømmeret blir verdt mye mer som planker: et sagbruk gjør 48 m³ tømmer om til 26 m³ planker og 17 m³ flis i døgnet, og Storlia kjøper plankene.' : '');
  }
  // hva lageret og maskinene rekker: { ok, tekst }. har = på lager nå, perDøgn = det maskinene lager i døgnet, kjøreTimer = tida på vegen
  function rekker(k, har, perDøgn, kjøreTimer = 0) {
    const V = REGLER.VARER[k.vare] || { navn: k.vare }, h = Math.max(0, tall(har)), p = Math.max(0, tall(perDøgn));
    const lager = `Dere har ${mengdeTekst(k.vare, h)}`, maskin = p > 0 ? `, ${k.vare === 'tre' ? 'sagbruket' : k.vare === 'ved' ? 'vedkløyveren' : 'maskinene'} gir ${mengdeTekst(k.vare, p)} per døgn` : '';
    if (k.type === 'lever') {
      const trengs = Math.max(0, k.mengde - tall(k.levert)), tid = Math.max(0, (k.status === 'aktiv' ? (k.frist - k.godtatt) / 60 : k.timer) - kjøreTimer - 1);
      const får = h + p * tid / 24, ok = får >= trengs;
      return { ok, tekst: `${lager}${maskin} – ${ok ? (h >= trengs ? 'nok på lager nå' : 'rekker det') : `rekker ikke (mangler ca. ${mengdeTekst(k.vare, Math.ceil(trengs - får))})`}.` };
    }
    if (k.type === 'avtale') { const ok = p >= k.perDøgn || h >= k.perDøgn * (k.døgn - tall(k.døgnGjort));
      return { ok, tekst: `${lager}${maskin} – ${ok ? 'rekker det' : p > 0 ? `maskinene gir mindre enn ${mengdeTekst(k.vare, k.perDøgn)} per døgn` : (h >= k.perDøgn ? `lageret rekker ${Math.floor(h / k.perDøgn)} døgn` : `lageret har ikke nok til den første hentingen (${mengdeTekst(k.vare, k.perDøgn)})`)}.` }; }
    return { ok: true, tekst: `${lager} ${V.navn} på lager.` };
  }
  // linja om vegen: «ca. 21 km langs ruta – lastebil ca. 0,4 t, til fots ca. 6 t»
  const vegTekst = km => `ca. ${nf(km)} km langs ruta – lastebil ca. ${nf(bilTimer(km))} t, til fots ca. ${nf(gåTimer(km))} t`;
  // «Neste»-lappen. v = vurderingen fra visningen
  function lapp(k, v) {
    v = v || {}; const V = REGLER.VARER[k.vare] || { navn: k.vare };
    if (k.type === 'lever') { const igjen = Math.max(0, k.mengde - tall(k.levert));
      if (k.frakt) return `${REGLER.frakt.firma} kjører ${V.navn} til ${k.sted.navn}`;
      return (k.turer && k.turer.length ? `Kjør lasten til ${k.sted.navn}` : `Send ${mengdeTekst(k.vare, igjen)} ${V.navn} til ${k.sted.navn}`) + ` (${nf(tall(k.levert))} av ${nf(k.mengde)} levert)`; }
    if (k.type === 'avtale') return `Ha ${mengdeTekst(k.vare, k.perDøgn)} ${V.navn} på lager til i morgen (levert ${tall(k.levertDøgn)} av ${k.døgn} døgn)`;
    return `Kjøpsavtale: ${V.navn} kommer hvert døgn (${tall(k.døgnGjort)} av ${k.døgn})`;
  }
  function bruttTekst(k) { return k.grunn === 'frakt' ? `${REGLER.frakt.firma} mistet lasten` : k.grunn === 'avtale' ? 'for mange døgn uten levering' : ''; }

  // ---------- frakt med Gråfjell ----------
  // km = luftlinja fra leiren til stedet. Gir { firma, pris, timer, sjanse, tapt } – tapt trekkes nå (r), men vises først ved ankomst
  function frakt(k, km, r) {
    const F = REGLER.frakt, rr = r || Math.random, timer = Math.round((F.fast + km * F.omveg / F.kmt) * 10) / 10;
    const sjanse = k.risiko === 'bakhold' ? F.tapBakhold : F.tap;
    return { firma: F.firma, pris: avrund(k.betaling * F.andel, 1000), timer, sjanse, tapt: rr() < sjanse };
  }
  // setter frakten på kontrakten (visningen har alt tatt varene fra lageret). Gir frakten, eller { feil }.
  function brukFrakt(k, nå, km, r) {
    if (!k || k.type !== 'lever' || k.status !== 'aktiv') return { feil: 'Kontrakten er ikke aktiv.' };
    if (k.frakt) return { feil: `${REGLER.frakt.firma} har alt lasten.` };
    if (k.turer && k.turer.length) return { feil: 'En last er alt på vegen. Vent til den er framme.' };
    const f = frakt(k, km, r); f.mengde = Math.max(0, k.mengde - tall(k.levert)); f.ankommer = Math.round(nå + f.timer * 60);
    if (f.ankommer > k.frist) return { feil: `${REGLER.frakt.firma} rekker ikke fristen (de trenger ca. ${nf(f.timer)} t).` };
    k.frakt = f; return f;
  }

  // ---------- steget (kalles av Selskap.steg for hver aktive varekontrakt) ----------
  // m fra visningen: lever { levert: mengde levert nå, andel: hvor langt bilen har kommet }; avtale { har: på lager }; kjøp { penger, plass }.
  // Legger hendelsene i ut: vareDøgn (avtale: { mengde, kr }), vareKjøp ({ mengde, får, kr }), vareMist ({ kr: bot, mangler }), fraktFram.
  // Svarer 'lever', { bryt: grunn } eller null.
  function steg(S, id, k, nå, dt, m, ut) {
    m = m || {}; const sd = S.sider[id];
    if (k.type === 'lever') {
      if (m.levert > 0) k.levert = Math.min(k.mengde, Math.round((tall(k.levert) + m.levert) * 10) / 10);
      if (Number.isFinite(m.andel)) k.andel = Math.max(tall(k.andel), m.andel);
      if (k.frakt && nå >= k.frakt.ankommer) {
        if (k.frakt.tapt) { k.bot = 0; ut.push({ type: 'fraktTapt', k, kr: avrund(k.frakt.mengde * tall(k.enhetPris) / REGLER.lever.faktor * REGLER.frakt.erstatning, 1000) }); return { bryt: 'frakt' }; }
        k.levert = k.mengde; k.sluttKr = Math.max(0, k.betaling - k.frakt.pris); ut.push({ type: 'fraktFram', k }); return 'lever';
      }
      return k.levert >= k.mengde - 1e-6 ? 'lever' : null;
    }
    const start = tall(k.godtatt, nå), n = Math.min(k.døgn, Math.floor((nå - start) / 1440) + (k.type === 'kjøp' ? 1 : 0));
    let har = tall(m.har), penger = tall(m.penger), plass = tall(m.plass, Infinity);
    while (tall(k.døgnGjort) < n) {
      k.døgnGjort = tall(k.døgnGjort) + 1;
      if (k.type === 'avtale') {
        if (har >= k.perDøgn - 1e-6) { har -= k.perDøgn; k.levertDøgn = tall(k.levertDøgn) + 1; sd.sum.tjent += k.dagKr; ut.push({ type: 'vareDøgn', k, mengde: k.perDøgn, kr: k.dagKr }); }
        else { k.mist = tall(k.mist) + 1; sd.sum.bøter += k.botDøgn; ut.push({ type: 'vareMist', k, kr: k.botDøgn, mangler: Math.round((k.perDøgn - har) * 10) / 10 }); }
      } else if (penger >= k.dagKr) { penger -= k.dagKr; const får = Math.max(0, Math.min(k.perDøgn, plass)); plass -= får; k.levertDøgn = tall(k.levertDøgn) + 1; ut.push({ type: 'vareKjøp', k, mengde: k.perDøgn, får, kr: k.dagKr }); }
      else { k.mist = tall(k.mist) + 1; sd.sum.bøter += k.botDøgn; ut.push({ type: 'vareMist', k, kr: k.botDøgn, mangler: 0 }); }
    }
    if (tall(k.mist) > k.døgn / 2) { k.bot = 0; return { bryt: 'avtale' }; }
    if (tall(k.døgnGjort) >= k.døgn) { k.sluttKr = k.type === 'avtale' && !tall(k.mist) ? k.bonus : 0; return 'lever'; }
    return null;
  }

  // ---------- inn i Selskap ----------
  function registrer(SK) {
    if (!SK || !SK.REGLER || !SK.REGLER.TYPER || SK.REGLER.TYPER.lever) return SK;
    const felles = { betaling: 0, hardhendt: 0, givere: ['firma'], vare: true, steg, tittel, krav, lapp, bruttTekst };
    SK.REGLER.TYPER.lever = { ...felles, navn: 'Levering', timer: 72 };
    SK.REGLER.TYPER.avtale = { ...felles, navn: 'Leveranseavtale', timer: 120 };
    SK.REGLER.TYPER.kjøp = { ...felles, navn: 'Kjøpsavtale', timer: 120 };
    if (SK.REGLER.motangrep) Object.assign(SK.REGLER.motangrep, { lever: 0, avtale: 0, kjøp: 0 });
    SK.REGLER.vareRykte = REGLER.rykte;
    return SK;
  }

  const api = { REGLER, TYPER, erVare, hjemsted, kapasitet, bære, bilTimer, gåTimer, lagEtt, lagTilbud, storliaTilbud, tittel, krav, rekker, vegTekst, lapp, bruttTekst,
    frakt, brukFrakt, steg, registrer, mengdeTekst, prisTekst, lagRand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { rot.Vare = api; if (rot.Selskap) registrer(rot.Selskap); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
