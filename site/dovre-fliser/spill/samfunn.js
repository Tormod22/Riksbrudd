/* Samfunnet i leiren: regler uten DOM (Node: require('./samfunn'); nettleser: globalThis.Samfunn).
 * Nattarbeidet 18. nov (pakke «folk»): folkene i leiren skal føles som personer og et lite samfunn, ikke bare tall.
 *  - PERSONER: hvert menneske har et fast ansikt (portrettmotoren), én linje historie, et lynne og et ønske.
 *  - FLYKTNINGER kommer til porten og må tas imot eller avvises (mat, senger, moral, lojalitet).
 *  - SPESIALISTER (lege, mekaniker, radiooperatør, skytter): sjeldne folk med en tydelig virkning.
 *  - BARN OG GAMLE arbeider ikke, men spiser, trenger seng og teller for moralen.
 *  - GRÅLUNGEN: sykdom som smitter i trange brakker; karantene, sykestue og lege hjelper.
 *  - LOV I LEIREN: rasjonering, arbeidsplikt, portforbud og våpen i leiren – og folk reagerer.
 *  - FORRÆDERE: er lojaliteten lav, kan noen lekke til fienden eller sabotere; de kan oppdages.
 *  - OPPLÆRING: en dyktig person eller veteran trener en annen.
 *  - BEGRAVELSER OG MINNESMERKE: de døde tas farvel med – eller ikke – og det merkes på moralen.
 *  - KORT: krangler og ønsker som gir valg med følger som varer noen døgn.
 * Personene selv ligger i folket (spill/folk.js, L.folk); ekstra felt på en person: spes, syk, immun, karantene, spion, trener, borte.
 * Resten ligger i S (lagres i «riksbrudd-samfunn» av samfunn-visning.js). ALLE TALL ER CLAUDES FORSLAG, ikke brukerens fasit.
 */
(function (rot) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const FR = node ? require('./folk.js') : rot.FolkRegler;
  const PM = node ? require('./portrett-motor.js') : rot.RiksbruddPortrait;
  const LB = node ? require('./leir.js') : rot.Leir;
  // Claudes forslag – alle tallene samlet
  const REGLER = {
    døgn: 1440,
    // personer og ønsker
    ønskeMoral: 8,             // moralen flyttes inntil ±4 etter hvor mange som har fått ønsket sitt
    ønskeLojal: .02, ønskeUlojal: .01,   // lojalitet per døgn når ønsket er oppfylt / ikke oppfylt
    løfteDøgn: 3, løfteBrutt: .15, løfteHoldt: .1,
    // flyktninger
    flyktTid: [2, 4],          // døgn mellom gruppene som kommer av seg selv
    flyktSpes: .25,            // sjansen for at det er en spesialist i gruppa
    flyktSmittet: .2,          // sjansen for at en i gruppa bærer Grålungen
    flyktMat: 2,               // rasjoner per person når de får mat og sendes videre
    // spesialister
    spesFerd: 1.9,             // ferdigheten i faget (vanlige folk: 0,7–1,45)
    spesLeting: .2,            // sjansen for at en overlevende du finner i et hus er spesialist
    skytterIld: 1.15, skytterAvstand: 300,   // egne lag nær leiren treffer bedre når skytteren står vakt
    radioVarsling: 1.5,        // vaktene varsler på lengre avstand med radiooperatør på overvåking
    mekanikerHp: .2,           // kjøretøy ved leiren repareres så mye per spilltime
    // barn og gamle
    avhBra: 1.5, avhBraMaks: 6,     // moral når de har det bra (per person, og taket)
    avhDårlig: 4, avhDårligMaks: 15, // moral når de sulter, fryser eller mangler seng
    // Grålungen
    utbrudd: .03,              // sjanse per døgn for at sykdommen bryter ut av seg selv
    utbruddPause: 6,           // døgn før et nytt utbrudd kan komme
    smitte: .1,                // smittepress per syk per døgn
    trangt: 2.5,               // flere folk enn senger
    karanteneSmitte: .15,      // en syk i karantene smitter så mye
    sykestueSmitte: .7, legeSmitte: .5, portforbudSmitte: .7,
    kuldeSmitte: 1.5,          // sprengkulde ute (under −8 grader): folk sitter tett inne
    fryserSmitte: 1.5,         // folk fryser i leiren (mangler ved eller diesel)
    bySpes: .08,               // sjansen for at en rekrutt fra en by er spesialist
    // spesialister fra oppdrag (runde 4): et redningsoppdrag har så ofte en spesialist blant dem som skal reddes, og en røverpost
    // holder så ofte en fange som er spesialist (begge fast per oppdrag, så det kan stå i oppdragslista før dere drar)
    oppdragSpes: .35, postSpes: .25,
    fangeLojal: [.15, .35],    // en fange som får bli, er lite trofast i starten
    fangeMoral: 2, fangeAndres: .02,
    sykLengde: [3, 5],         // døgn
    sykHelse: .14,             // helsetap per døgn
    legeHelse: .5, stellHelse: .7,
    sykMoral: 2, sykMoralMaks: 8, karanteneMoral: 3,
    // barn og gamle blir syke selv (runde 4): barn smittes sjeldnere, gamle oftere – og de gamle tåler sykdommen dårligst
    barnSmitte: .6, gammelSmitte: 1.2,   // smittesjansen i forhold til en voksen
    gammelSykDør: .1,          // sjanse per døgn for at en gammel som er syk, dør (lege ×0,5, stell i sykestua ×0,7)
    barnSykDør: .01,           // det samme for barn
    // lover
    lovLojal: .05,             // de som misliker en lov, mister så mye lojalitet når den innføres
    // forrædere
    spionLojal: .3,            // under dette kan en person bli forræder
    spionBlir: .15,            // sjanse per døgn (når moralen er under 50 eller snittlojaliteten under 0,5)
    spionGjør: .3,             // sjanse per døgn for at en forræder gjør noe
    spionPassivRadio: .12, spionPassivVakt: .04,
    etterforsk: .45, etterforskRadio: .25, etterforskPortforbud: .15, etterforskPause: 1,
    sabotasjeMat: .15, sabotasjeHp: .3,
    // opplæring
    lærFart: .05,              // ferdighet per døgn når læreren er klart bedre
    lærerMin: 1.25,            // så god må læreren være
    lærMaks: 1.6, maksPar: 2,
    // begravelser
    ugravlagt: 3, ugravlagtMaks: 9, gravFrist: 3,
    seremoniTid: 180,          // spillminutter der arbeidet nesten står stille
    seremoniTempo: .3,
    minnesmerke: 2, minnesmerkePerNavn: .5, minnesmerkeMaks: 5,
    // kort
    kortTid: [1, 2],           // døgn mellom kortene (krangler og ønsker)
  };
  const hash = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const klem = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  // tilfeldighet som huskes i S (samme frø gir samme forløp)
  function tilf(S) { const r = FR.rng(S.frø); return () => { const v = r(); S.frø = (S.frø + 0x9E3779B9 + Math.floor(v * 65536)) >>> 0; return v; }; }
  const mellom = (r, [a, b]) => a + r() * (b - a);
  const FORNAVN_BARN = ['Emma', 'Noah', 'Nora', 'Jakob', 'Ella', 'Emil', 'Ingeborg', 'Olav', 'Frida', 'Aksel', 'Tiril', 'Mathias'];
  const FORNAVN_GAMLE = ['Gunvor', 'Reidar', 'Solveig', 'Kåre', 'Bjørg', 'Torleif', 'Aslaug', 'Oddvar', 'Borghild', 'Sverre'];

  function ny(frø = 1) {
    return { versjon: 1, frø: frø >>> 0 || 1, avhengige: [], neste: 1, lover: { rasjonering: false, arbeidsplikt: false, portforbud: false, våpen: false }, karantene: false,
      sistUtbrudd: -1e9, døde: [], gravlagte: [], seremoniTil: 0, virkninger: [], opplæring: [], løfter: [], kort: null, sistKort: null, mistanke: 0, lekket: false,
      sistEtterforsket: -1e9, nesteFlykt: null, nesteKort: null, akk: 0 };
  }
  function fraJSON(o) { if (!o || typeof o !== 'object') return null; const S = { ...ny(o.frø || 1), ...o }; S.lover = { ...ny().lover, ...(o.lover || {}) };
    for (const k of ['avhengige', 'døde', 'gravlagte', 'virkninger', 'opplæring', 'løfter']) if (!Array.isArray(S[k])) S[k] = [];
    // (R2-løkka) lagrede spill med samme døde to ganger: den første står
    S.døde = S.døde.filter((q, i, A) => q && A.findIndex(w => w && w.navn === q.navn) === i); S.gravlagte = [...new Set(S.gravlagte)]; return S; }

  // ================= PERSONER: ansikt, historie, lynne og ønske =================
  const STEDER = ['Otta', 'Lesja', 'Vågå', 'Oppdal', 'Lom', 'Hjerkinn', 'Folldal', 'Tynset', 'Ringebu', 'Sunndalsøra', 'Vinstra', 'Åndalsnes'];
  // (ut8-kr-telefon, Jonas: flyktninger «fra Ringebu» ved porten i Ulvik) – visningen kan gi stedene rundt leiren (Samfunn.nærSteder =
  // ['Granvin', 'Eidfjord', …]); da hentes navnene derfra. Uten (testene, Dovre-siden før kartet er lest) som før.
  const stedListe = () => (typeof api !== 'undefined' && api && Array.isArray(api.nærSteder) && api.nærSteder.length >= 3 ? api.nærSteder : STEDER);
  const TAP = ['Mistet broren i Grålungen.', 'Vet ikke hvor familien er.', 'Gikk i tre uker for å komme hit.', 'Var på jobb den dagen strømmen gikk.', 'Har en datter et sted i sør.',
    'Begravde naboene sine selv.', 'Kom hit med bare en ryggsekk.', 'Snakker lite om tida før.', 'Mistet alt da banken stengte.', 'Passet på foreldrene til det siste.'];
  const LYNNE = { rolig: 'Rolig og tålmodig', stri: 'Sta og egenrådig', lojal: 'Trofast mot gjengen', urolig: 'Rastløs og urolig' };
  const ØNSKER = {
    seng: { tekst: 'en ordentlig seng å sove i', ok: (p) => !!p.seng },
    varmMat: { tekst: 'varm mat fra et kjøkken', ok: (p, k) => !!(k.B && k.B.varmMat) },
    fag: { tekst: 'å få bruke det hen er best på', ok: (p) => p.oppgave === beste(p) },
    fri: { tekst: 'at flere får hvile av og til', ok: (p, k) => k.F.personer.filter(q => q.oppgave === 'fri').length / Math.max(1, k.F.personer.length) >= .1 },
    trygg: { tekst: 'vakt i et tårn om natta', ok: (p, k) => !!(k.B && k.B.bemannedeTårn > 0) },
    minne: { tekst: 'et sted å minnes dem som er borte', ok: (p, k) => !!k.minnesmerke },
    brønn: { tekst: 'rent vann fra egen brønn', ok: (p, k) => !!k.brønn },
    radio: { tekst: 'å høre nytt utenfra (radiomast)', ok: (p, k) => !!k.radiomast },
    stell: { tekst: 'en sykestue hvis noe skulle skje', ok: (p, k) => !!(k.B && k.B.sykestue) },
  };
  const beste = p => Object.entries(p.ferd || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'fri';
  const kvinne = p => { const i = FR.FORNAVN ? FR.FORNAVN.indexOf(String(p.navn).split(' ')[0]) : -1; return i >= 0 ? i % 2 === 1 : hash(p.navn) % 2 === 1; };
  // (runde 12, kritiker F: «Hen takket og gikk tilbake» om Sindre Vik) – han/hun etter kjønnet portrettet også bruker (kvinne(p));
  // medPron(tekst, p) bytter «Hen»/«hen» i en tekst om personen p. Uten person (ukjent) står «hen» igjen.
  const pron = p => (p && p.navn ? (kvinne(p) ? 'hun' : 'han') : 'hen');
  const medPron = (t, p) => { if (typeof t !== 'string') return t; const h = pron(p); return h === 'hen' ? t : t.replace(/\b(La|la|Utvis|utvis|Gi|gi) hen\b/g, '$1 ' + (h === 'hun' ? 'henne' : 'ham')).replace(/\bHen\b/g, h[0].toUpperCase() + h.slice(1)).replace(/\bhen\b/g, h); };
  // Fast profil per person (fra navnet, alderen og yrket – id-en kan skifte når en person kommer tilbake fra en tropp)
  function profil(p) {
    const h = hash(p.navn + '|' + p.yrke), r = FR.rng(h), v = a => a[Math.floor(r() * a.length)], k = kvinne(p);
    const sted = v(stedListe()), tap = v(TAP), lynne = v(Object.keys(LYNNE)), ønske = v(Object.keys(ØNSKER));
    const spes = p.spes && SPES[p.spes] ? SPES[p.spes].navn.toLowerCase() : null;
    // p.fra: stedet personen kom fra (rekrutter fra byene, spill/region-visning.js); p.fange: fraksjonen hen kjempet for (spill/krig-visning.js)
    const hvor = p.fra ? `i ${p.fra}` : `${sted === 'Hjerkinn' ? 'på' : 'i'} ${sted}`;
    const historie = `Var ${spes && spes !== p.yrke ? p.yrke + ' og ' + spes : p.yrke} ${hvor} før kollapsen. ` + (p.fange ? `Kjempet for ${p.fange} til ${pron(p)} ble tatt til fange.` : p.fra ? `Kom med handelsruta fra ${p.fra}.` : tap);
    // portrettet: bare kjente valg (motoren renser dem i normalize)
    const pal = PM && PM.palettes, P = { gender: k ? 'kvinne' : 'mann', role: p.yrke === 'tidligere soldat' ? 'militaer' : 'politisk', age: klem(p.alder || 30, 20, 80) };
    if (PM) {
      const A = PM.allowed, hårK = ['bob', 'long', 'waves', 'ponytail', 'braid', 'pixie', 'shag', 'curly', 'fringe'], hårM = ['short', 'crop', 'buzz', 'crew', 'sidepart', 'undercut', 'quiff', 'mullet', 'bald', 'curls-short'];
      for (const f of ['face', 'eyes', 'brows', 'nose', 'mouth']) P[f] = v(A[f]);
      P.expression = v(['alvorlig', 'rolig', 'streng', 'svakt-smil', 'bekymret']); P.glasses = r() < .22 ? v(['runde', 'firkantede', 'smale']) : 'ingen';
      P.hair = v(k ? hårK : hårM); P.facialHair = k ? 'ingen' : r() < .45 ? v(['skjeggstubb', 'helskjegg', 'kort-skjegg', 'bart']) : 'ingen';
      P.outfit = p.yrke === 'tidligere soldat' ? 'feltuniform' : v(['genser', 'arbeidsjakke', 'skinnjakke', 'jakke', 'hoyhalset', 'skjorte']); P.headwear = r() < .2 ? 'strikkelue' : 'ingen';
      P.detail = r() < .25 ? v(['fregner', 'arr', 'foflekk']) : 'ingen'; P.tieStyle = 'apen'; P.shirt = v(A.shirt);
      P.skin = v(pal.skin.slice(0, 4)); P.hairColor = v(pal.hair); P.eyeColor = v(pal.eyes); P.outfitColor = v(pal.outfitColor); P.background = v(pal.background);
      for (const f of ['eyeSpacing', 'faceWidth', 'eyeSize', 'cheek']) P[f] = 20 + Math.floor(r() * 60);
      P.grayAmount = (p.alder || 30) > 50 ? 40 + Math.floor(r() * 50) : 0; P.name = p.navn;
    }
    return { kvinne: k, sted, historie, lynne, lynneTekst: LYNNE[lynne], ønske, ønskeTekst: ØNSKER[ønske].tekst, portrett: P };
  }
  const portrettSVG = p => (PM ? PM.renderSVG(profil(p).portrett) : '');
  const ønskeOppfylt = (p, k) => { try { return !!ØNSKER[profil(p).ønske].ok(p, k); } catch (e) { return false; } };
  const ønskeAndel = (F, k) => (F.personer.length ? F.personer.filter(p => ønskeOppfylt(p, k)).length / F.personer.length : .5);

  // ================= SPESIALISTER =================
  const SPES = {
    lege: { navn: 'Lege', oppgave: 'stell', yrke: 'lege', tekst: 'Halverer smitten og helsetapet av Grålungen, finner syke blant flyktninger og steller dobbelt så godt (på «stell»).' },
    mekaniker: { navn: 'Mekaniker', oppgave: 'verksted', yrke: 'mekaniker', tekst: 'Verkstedet går dobbelt så fort, og skadde kjøretøy ved leiren repareres (på «verksted»).' },
    radiooperatør: { navn: 'Radiooperatør', oppgave: 'overvåking', yrke: 'radiooperatør', tekst: 'Vaktene varsler på lengre avstand, og forrædere blir lettere oppdaget (på «overvåking»).' },
    skytter: { navn: 'Skytter', oppgave: 'vakt', yrke: 'skarpskytter', tekst: 'Egne lag innen 300 m fra leiren treffer bedre når skytteren står på «vakt».' },
  };
  // gjør en person i folket om til spesialist
  function gjørSpesialist(p, type) { const T = SPES[type]; if (!T || !p) return null; p.spes = type; p.yrke = T.yrke; p.ferd = { ...(p.ferd || {}), [T.oppgave]: REGLER.spesFerd }; return p; }
  function nySpesialist(F, r, type) { const typer = Object.keys(SPES), t = SPES[type] ? type : typer[Math.floor(r() * typer.length)]; return gjørSpesialist(FR.nyPerson(F, r, SPES[t].oppgave), t); }
  // en spesialist som er i arbeid på oppgaven sin (ellers virker ikke gaven)
  const harSpes = (F, type) => F.personer.some(p => p.spes === type && FR.arbeidsfør(p) && p.oppgave === SPES[type].oppgave);
  // en overlevende funnet ved leting: av og til en spesialist (r: tilfeldighet 0–1)
  function funnet(p, r) { if (!p || p.spes || r() >= REGLER.spesLeting) return null; const typer = Object.keys(SPES); return gjørSpesialist(p, typer[Math.floor(r() * typer.length)]); }

  // SPESIALISTER FRA OPPDRAG: hvilken spesialist oppdraget o gir (eller null) – fast per oppdrag (nummeret). frø = leirens tall.
  function oppdragSpes(o, frø = 0) {
    // bare oppdragets nummer og leiren teller (spillet kan flytte oppdraget litt, f.eks. til land, etter at det er laget)
    if (!o || (o.type !== 'redd' && o.type !== 'post')) return null; const h = s => { let x = (Math.imul((o.id | 0) + 1, 2654435761) ^ Math.imul(s + 7, 40503) ^ Math.imul((frø | 0) + 13, 2246822519)) >>> 0; x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0; x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
    if (h(1) >= (o.type === 'redd' ? REGLER.oppdragSpes : REGLER.postSpes)) return null; const typer = Object.keys(SPES); return typer[Math.floor(h(2) * typer.length)];
  }
  // teksten i oppdragslista
  const oppdragSpesTekst = (o, type) => (o.type === 'redd' ? `Blant dem som skal reddes, er ${SPES[type].yrke === 'skarpskytter' ? 'en skarpskytter' : 'en ' + SPES[type].yrke}.` : `Røverne holder en fange – ${SPES[type].yrke === 'skarpskytter' ? 'en skarpskytter' : 'en ' + SPES[type].yrke}.`);
  // en rekrutt fra en by (handelsruta): får stedet i historien sin, og er en sjelden gang spesialist
  function ankommet(p, fra, r) { if (!p) return null; if (fra) p.fra = fra; if (!p.spes && r() < REGLER.bySpes) { const typer = Object.keys(SPES); gjørSpesialist(p, typer[Math.floor(r() * typer.length)]); } return p; }
  // fanger som får bli i leiren: n nye personer med lav lojalitet; de andre liker det dårlig
  function fangerInn(F, n, navn, r) { const nye = []; for (const q of F.personer) q.lojal = klem(q.lojal - REGLER.fangeAndres); F.moral = klem(F.moral - REGLER.fangeMoral, 0, 100);
    for (let i = 0; i < n; i++) { const p = FR.nyPerson(F, r, 'fri', r() < .6 ? 'tidligere soldat' : null); p.lojal = Math.round(mellom(r, REGLER.fangeLojal) * 100) / 100; p.fange = navn || 'fienden'; nye.push(p); } return nye; }
  // ================= BARN OG GAMLE =================
  function nyAvhengig(S, r, type, etternavn) {
    const barn = type === 'barn', liste = barn ? FORNAVN_BARN : FORNAVN_GAMLE, tatt = new Set(S.avhengige.map(a => a.navn.split(' ')[0]));
    let f = liste[Math.floor(r() * liste.length)]; for (let i = 0; i < 20 && tatt.has(f); i++) f = liste[Math.floor(r() * liste.length)];
    const a = { id: S.neste++, navn: f + (etternavn ? ' ' + etternavn : ''), alder: barn ? 3 + Math.floor(r() * 12) : 68 + Math.floor(r() * 20), type: barn ? 'barn' : 'gammel' }; S.avhengige.push(a); return a;
  }
  // moralen fra barna og de gamle: har de det bra, løfter de leiren; lider de, tærer det hardt
  function avhengigMoral(S, k) {
    // barna og de gamle får seng først: de mangler seng først når flere enn de voksne står uten
    const n = S.avhengige.length; if (!n) return 0; const dårlig = k.sult || k.kald > .3 || (k.B && k.B.utenSeng > k.B.n);
    return dårlig ? -Math.min(REGLER.avhDårligMaks, REGLER.avhDårlig * n) : Math.min(REGLER.avhBraMaks, REGLER.avhBra * n);
  }

  // ================= FLYKTNINGER =================
  function nyeFlyktninger(S, r) {
    const voksne = 1 + Math.floor(r() * 3), barn = r() < .55 ? 1 + Math.floor(r() * 2) : 0, gamle = r() < .35 ? 1 : 0;
    const typer = Object.keys(SPES), spes = r() < REGLER.flyktSpes ? typer[Math.floor(r() * typer.length)] : null;
    return { type: 'flyktninger', voksne, barn, gamle, spes, smittet: r() < REGLER.flyktSmittet, fra: (L => L[Math.floor(r() * L.length)])(stedListe()) };
  }
  const flyktTekst = g => { const d = [`${g.voksne} ${g.voksne === 1 ? 'voksen' : 'voksne'}`]; if (g.barn) d.push(`${g.barn} barn`); if (g.gamle) d.push(`${g.gamle} ${g.gamle === 1 ? 'gammel' : 'gamle'}`);
    return `En gruppe flyktninger fra ${g.fra} står ved porten: ${d.join(', ').replace(/, ([^,]*)$/, ' og $1')}. De er slitne og sultne.` + (g.spes ? ` En av dem sier hen er ${SPES[g.spes].yrke}.` : ''); };
  const flyktValg = g => [
    { id: 'alle', t: `Ta imot alle (${g.voksne + g.barn + g.gamle} munner å mette)` },
    ...(g.barn + g.gamle ? [{ id: 'voksne', t: 'Ta bare imot dem som kan arbeide' }] : []),
    { id: 'mat', t: `Gi dem mat og send dem videre (${(g.voksne + g.barn + g.gamle) * REGLER.flyktMat} rasjoner)` },
    { id: 'avvis', t: 'Avvis dem' }];
  // Valget tas. k: { B (behov før de kom), tid }. Gir { tekst, nye: [personer] } og endrer F og S.
  function flyktSvar(S, F, g, valg, k, r) {
    const alle = g.voksne + g.barn + g.gamle, nye = []; let tekst = '';
    const taVoksne = () => { for (let i = 0; i < g.voksne; i++) { const p = i === 0 && g.spes ? nySpesialist(F, r, g.spes) : FR.nyPerson(F, r); p.lojal = Math.round((.5 + r() * .3) * 100) / 100; nye.push(p); } };
    const smitte = () => { if (!g.smittet || !nye.length) return ''; const p = nye[nye.length - 1];
      if (harSpes(F, 'lege')) { p.syk = { dag: 0, lengde: mellom(r, REGLER.sykLengde) }; p.karantene = true; S.karantene = true; return ` Legen fant at ${p.navn} bærer Grålungen: ${pron(p)} er satt rett i karantene.`; }
      p.syk = { dag: 0, lengde: mellom(r, REGLER.sykLengde) }; S.sistUtbrudd = k.tid || 0; return ''; };
    if (valg === 'alle') { taVoksne(); const etter = nye[0] ? nye[0].navn.split(' ').slice(1).join(' ') : '';
      for (let i = 0; i < g.barn; i++) nyAvhengig(S, r, 'barn', etter); for (let i = 0; i < g.gamle; i++) nyAvhengig(S, r, 'gammel', etter);
      const plass = k.B ? k.B.senger - k.B.n - (k.B.avh || 0) >= alle : true; F.moral = klem(F.moral + (plass ? 3 : -4), 0, 100); for (const p of F.personer) if (!nye.includes(p)) p.lojal = klem(p.lojal + .03);
      tekst = `Dere tok imot alle ${alle}.` + (plass ? ' Folk er stolte av det.' : ' Det blir trangt: noen må sove i telt.') + smitte(); }
    else if (valg === 'voksne') { taVoksne(); F.moral = klem(F.moral - (g.barn ? 6 : 3), 0, 100); for (const p of F.personer) if (!nye.includes(p)) p.lojal = klem(p.lojal - .02);
      for (const p of nye) p.lojal = klem(p.lojal - .2); tekst = `Dere tok imot ${g.voksne} som kan arbeide. ` + (g.barn ? 'Barna ble sendt videre – det sitter i folk.' : 'De gamle ble sendt videre.') + smitte(); }
    else if (valg === 'mat') { const m = alle * REGLER.flyktMat; if (F.mat < m) return { feil: 'Dere har ikke nok mat å gi bort.' }; F.mat -= m; F.moral = klem(F.moral + 1, 0, 100); tekst = `Flyktningene fikk ${m} rasjoner og gikk videre.`; }
    else { F.moral = klem(F.moral - (g.barn ? 9 : 5), 0, 100); for (const p of F.personer) p.lojal = klem(p.lojal - .04); tekst = 'Flyktningene ble avvist ved porten.' + (g.barn ? ' Folk så barna gå.' : ''); }
    return { tekst, nye };
  }

  // ================= GRÅLUNGEN =================
  const sykeI = F => F.personer.filter(p => p.syk);
  // barna og de gamle som er syke (S.avhengige)
  const sykeAvh = S => S.avhengige.filter(a => a.syk);
  function smitt(S, F, r, n = 1, tid = 0) { const ut = [], friske = F.personer.filter(p => !p.syk && !p.immun);
    for (let i = 0; i < n && friske.length; i++) { const p = friske.splice(Math.floor(r() * friske.length), 1)[0]; p.syk = { dag: 0, lengde: mellom(r, REGLER.sykLengde) }; if (S.karantene) p.karantene = true; ut.push(p); }
    if (ut.length) S.sistUtbrudd = tid; return ut; }
  function settKarantene(S, F, på) { S.karantene = !!på; for (const p of [...F.personer, ...S.avhengige]) { if (S.karantene && p.syk) p.karantene = true; else delete p.karantene; } return S.karantene; }
  // ett steg av sykdommen (dt i spillminutter). k: { B, tid, auto, utenVann }
  function sykdomSteg(S, F, dt, k, r) {
    const H = [], d = dt / REGLER.døgn, syke = sykeI(F), avhSyke = sykeAvh(S), lege = harSpes(F, 'lege'), stell = FR.arbeidere(F, 'stell') > 0 && k.B && k.B.sykestue > 0;
    const trangt = k.B && k.B.utenSeng > 0;
    // nytt utbrudd av seg selv (aldri i testene: k.auto)
    if (k.auto && !syke.length && !avhSyke.length && F.personer.length >= 4 && (k.tid - S.sistUtbrudd) / REGLER.døgn > REGLER.utbruddPause
      && r() < 1 - Math.exp(-REGLER.utbrudd * (trangt ? 2 : 1) * (k.utenVann ? 2 : 1) * d)) {
      const ny = smitt(S, F, r, 1, k.tid); if (ny.length) H.push(`${ny[0].navn} hoster og har grå lepper: Grålungen er i leiren! ` + (S.karantene ? medPron('Hen er satt i karantene.', ny[0]) : 'Sett på karantene i Samfunn-panelet, ellers smitter det fort.')); }
    if (!syke.length && !avhSyke.length) return H;
    // smitte: hver syk (også barn og gamle) gir et smittepress; i karantene bare en brøkdel
    const press = [...syke, ...avhSyke].reduce((s, p) => s + (p.karantene ? REGLER.karanteneSmitte : 1), 0) * REGLER.smitte * (trangt ? REGLER.trangt : 1) * (k.sprengkulde ? REGLER.kuldeSmitte : 1) * (k.kald > .3 ? REGLER.fryserSmitte : 1)
      * (k.B && k.B.sykestue ? REGLER.sykestueSmitte : 1) * (lege ? REGLER.legeSmitte : 1) * (S.lover.portforbud ? REGLER.portforbudSmitte : 1);
    const alle = F.personer.length + S.avhengige.length, pSmitte = f => 1 - Math.exp(-press * f * d / Math.max(4, alle) * 4);
    for (const p of F.personer) if (!p.syk && !p.immun && r() < pSmitte(1)) { p.syk = { dag: 0, lengde: mellom(r, REGLER.sykLengde) }; if (S.karantene) p.karantene = true; S.sistUtbrudd = k.tid;
      H.push(`${p.navn} er smittet av Grålungen` + (S.karantene ? ' og er satt i karantene.' : '.')); }
    for (const a of S.avhengige) if (!a.syk && !a.immun && r() < pSmitte(a.type === 'barn' ? REGLER.barnSmitte : REGLER.gammelSmitte)) { a.syk = { dag: 0, lengde: mellom(r, REGLER.sykLengde) }; if (S.karantene) a.karantene = true; S.sistUtbrudd = k.tid;
      H.push(`${a.type === 'barn' ? 'Barnet' : 'Den gamle'} ${a.navn} (${a.alder}) er smittet av Grålungen` + (S.karantene ? ' og er satt i karantene.' : '.')); }
    // forløpet
    for (const p of syke) { p.syk.dag += d; p.helse = Math.max(0, p.helse - REGLER.sykHelse * (lege ? REGLER.legeHelse : 1) * (stell ? REGLER.stellHelse : 1) * d);
      if (p.syk.dag >= p.syk.lengde && p.helse > 0) { delete p.syk; delete p.karantene; p.immun = true; H.push(`${p.navn} har kommet seg gjennom Grålungen og tåler den nå.`); } }
    // barn og gamle: ingen helse å tære på – i stedet en sjanse for å dø mens de er syke (størst for de gamle)
    for (const a of avhSyke) { a.syk.dag += d; const dør = (a.type === 'barn' ? REGLER.barnSykDør : REGLER.gammelSykDør) * (lege ? REGLER.legeHelse : 1) * (stell ? REGLER.stellHelse : 1);
      if (r() < 1 - Math.exp(-dør * d)) { S.avhengige = S.avhengige.filter(q => q !== a); død(S, a.navn, a.type === 'barn' ? 'barn' : 'gammel', k.tid); H.push(`${a.navn} (${a.alder}) døde av Grålungen.`); continue; }
      if (a.syk.dag >= a.syk.lengde) { delete a.syk; delete a.karantene; a.immun = true; H.push(`${a.navn} (${a.alder}) har kommet seg gjennom Grålungen.`); } }
    if (!sykeI(F).length && !sykeAvh(S).length) { H.push('Grålungen har sluppet taket i leiren.'); if (S.karantene) { settKarantene(S, F, false); H.push('Karantenen er opphevet.'); } }
    return H;
  }

  // ================= LOV I LEIREN =================
  const LOVER = {
    rasjonering: { navn: 'Rasjonering', tekst: 'Maten varer 25 % lenger, men folk går sultne: moral −6 og litt dårligere helse.', moral: -6, mat: .75, helse: .02, misliker: ['urolig', 'stri'] },
    arbeidsplikt: { navn: 'Arbeidsplikt', tekst: 'Alt arbeid går 12 % fortere, men moralen faller (−5) og de minst trofaste blir mindre lojale.', moral: -5, tempo: 1.12, lojal: .01, misliker: ['stri', 'urolig'] },
    portforbud: { navn: 'Portforbud om natta', tekst: 'Mindre smitte, vanskeligere for forrædere, lettere å etterforske – men moral −4.', moral: -4, misliker: ['urolig'] },
    våpen: { navn: 'Alle bærer våpen i leiren', tekst: 'Egne lag ved leiren treffer 10 % bedre og folk føler seg tryggere (moral +2), men krangler kan ende stygt.', moral: 2, ild: 1.1, misliker: ['rolig'] },
  };
  function settLov(S, F, id, på) {
    const Lv = LOVER[id]; if (!Lv) return { feil: 'Ukjent lov.' }; på = !!på; if (S.lover[id] === på) return { tekst: '' }; S.lover[id] = på; const mot = [];
    if (på) for (const p of F.personer) { const l = profil(p).lynne; if (Lv.misliker.includes(l)) { p.lojal = klem(p.lojal - REGLER.lovLojal); mot.push(p.navn.split(' ')[0]); } else if (l === 'lojal') p.lojal = klem(p.lojal + .02); }
    return { tekst: på ? `${Lv.navn} er innført.` + (mot.length ? ` ${mot.slice(0, 3).join(', ')}${mot.length > 3 ? ` og ${mot.length - 3} til` : ''} liker det dårlig.` : ' Ingen protesterer.') : `${Lv.navn} er opphevet.`, mot };
  }
  const lovMoral = S => Object.entries(LOVER).reduce((s, [id, Lv]) => s + (S.lover[id] ? Lv.moral : 0), 0);

  // ================= FORRÆDERE OG SPIONER =================
  const snittLojal = F => (F.personer.length ? F.personer.reduce((s, p) => s + p.lojal, 0) / F.personer.length : 1);
  // ett døgnsteg (kalles med d døgn): noen kan bli forrædere, og forrædere kan lekke eller sabotere. Bare når k.auto.
  // Sabotasje av et bygg går gjennom Leir.skad, som når fienden skader leiren: en byggeplass kan ødelegges (de ubrukte
  // materialene kommer tilbake på lageret), et ferdig bygg skades men står (bare bygg som er mer enn 40 % hele).
  // Byggesettets deler og bygg som alt er hardt skadet, røres ikke. Gir { tekst, ødelagt, id } eller null.
  function saboter(L, r) {
    if (!L || !L.bygg || !LB || !LB.skad) return null;
    const mulige = L.bygg.filter(q => !(LB.BYGG[q.type] && LB.BYGG[q.type].del) && (q.igjen > 0 || q.hp > .4)), b = mulige[Math.floor(r() * mulige.length)]; if (!b) return null;
    const navn = LB.BYGG[b.type] ? LB.BYGG[b.type].navn : 'Et bygg', plass = b.igjen > 0, u = LB.skad(L, b.id, REGLER.sabotasjeHp); if (!u) return null;
    const mt = Object.entries(u.mat || {}).filter(([, v]) => v > 0).map(([k, v]) => `${String(v).replace('.', ',')} ${LB.MATERIALER[k].enhet} ${LB.MATERIALER[k].navn.toLowerCase()}`).join(', ');
    const tekst = u.ødelagt ? `Sabotasje! Byggeplassen for ${navn.toLowerCase()} er ødelagt i natt.` + (mt ? ` Materialene som ikke var brukt, er tilbake på lageret: ${mt}.` : '') + ' Noen i leiren står bak.'
      : `Sabotasje! ${plass ? 'Byggeplassen for ' + navn.toLowerCase() : navn} er skadet i natt. Noen i leiren står bak.`;
    return { tekst, ødelagt: u.ødelagt, id: b.id };
  }
  function spionSteg(S, F, L, dt, k, r) {
    const ut = { hendelser: [], lekk: false }, d = dt / REGLER.døgn; if (!k.auto) return ut;
    if (F.moral < 50 || snittLojal(F) < .5) for (const p of F.personer) if (!p.spion && p.lojal < REGLER.spionLojal && r() < 1 - Math.exp(-REGLER.spionBlir * d)) p.spion = true;
    for (const p of F.personer.filter(q => q.spion && !q.borte)) {
      // oppdaget av seg selv?
      const pOpp = (harSpes(F, 'radiooperatør') ? REGLER.spionPassivRadio : 0) + (FR.arbeidere(F, 'overvåking') ? REGLER.spionPassivVakt : 0);
      if (pOpp && r() < 1 - Math.exp(-pOpp * d)) { S.kø = S.kø || []; S.kø.push({ type: 'spion', id: p.id, navn: p.navn }); ut.hendelser.push(`Radiovakta har fanget opp at ${p.navn} sender meldinger ut av leiren!`); continue; }
      if (r() >= 1 - Math.exp(-REGLER.spionGjør * (S.lover.portforbud ? .5 : 1) * d)) continue;
      S.mistanke++;
      if (!S.lekket && r() < .5) { S.lekket = true; ut.lekk = true; ut.hendelser.push('Noen har lekket til fienden: de vet nå hvor leiren ligger. Etterforsk i Samfunn-panelet.'); }
      else if (r() < .5 && F.mat > 5) { const m = F.mat * REGLER.sabotasjeMat; F.mat -= m; ut.hendelser.push(`Sabotasje! ${Math.round(m)} rasjoner er ødelagt i matlageret. Noen i leiren står bak.`); }
      else { const s = saboter(L, r); if (s) { ut.hendelser.push(s.tekst); if (s.ødelagt) ut.ødelagt = true; } }
    }
    return ut;
  }
  function etterforsk(S, F, tid, r) {
    if ((tid - S.sistEtterforsket) / REGLER.døgn < REGLER.etterforskPause) return { feil: 'Dere har nettopp etterforsket. Vent et døgn.' };
    S.sistEtterforsket = tid; const spioner = F.personer.filter(p => p.spion && !p.borte);
    if (!spioner.length) { for (const p of F.personer) p.lojal = klem(p.lojal - .02); return { tekst: 'Etterforskningen fant ingenting. Folk misliker å bli mistenkt.', funnet: null }; }
    const sj = REGLER.etterforsk + (harSpes(F, 'radiooperatør') ? REGLER.etterforskRadio : 0) + (S.lover.portforbud ? REGLER.etterforskPortforbud : 0);
    if (r() < sj) { const p = spioner[0]; S.kort = { type: 'spion', id: p.id, navn: p.navn }; return { tekst: `${p.navn} er avslørt som forræder!`, funnet: p }; }
    return { tekst: 'Etterforskningen ga ingen bevis denne gangen – men noe er galt.', funnet: null };
  }
  function dom(S, F, id, valg) {
    const p = F.personer.find(q => q.id === id); if (!p) return { tekst: 'Vedkommende er ikke lenger i leiren.' }; S.mistanke = 0;
    if (valg === 'utvis') { F.personer = F.personer.filter(q => q !== p); F.moral = klem(F.moral + 2, 0, 100); for (const q of F.personer) q.lojal = klem(q.lojal + .02); return { tekst: `${p.navn} er utvist fra leiren. Folk puster lettet ut.` }; }
    delete p.spion; p.lojal = .45; for (const q of F.personer) if (q !== p) q.lojal = klem(q.lojal - .03); return { tekst: `${p.navn} fikk en sjanse til. Ikke alle liker det.` };
  }

  // ================= OPPLÆRING =================
  // hvor god læreren regnes som i oppgaven (veteraner fra oppløste tropper – p.erf – kan lære bort vakt og strid)
  const lærerNivå = (p, o) => Math.max(p.ferd[o] || 0, o === 'vakt' && p.erf > 0 ? 1.2 + .1 * Math.min(4, p.erf) : 0);
  const kanLære = (p, o) => lærerNivå(p, o) >= REGLER.lærerMin;
  const lærere = (F, o) => F.personer.filter(p => kanLære(p, o) && !p.trener);
  function startOpplæring(S, F, lærerId, elevId, o) {
    const a = F.personer.find(p => p.id === lærerId), b = F.personer.find(p => p.id === elevId);
    if (!a || !b || a === b || !FR.OPPGAVER.includes(o) || o === 'fri') return { feil: 'Velg en lærer, en elev og en oppgave.' };
    if (S.opplæring.length >= REGLER.maksPar) return { feil: `Høyst ${REGLER.maksPar} par kan trene samtidig.` };
    if (a.trener || b.trener) return { feil: 'En av dem er allerede i opplæring.' };
    if (!kanLære(a, o)) return { feil: `${a.navn} er ikke god nok i ${FR.OPPGAVE[o].navn.toLowerCase()} til å lære bort.` };
    if ((b.ferd[o] || 0) >= Math.min(REGLER.lærMaks, lærerNivå(a, o) - .05)) return { feil: `${b.navn} har ikke mer å lære av ${a.navn.split(' ')[0]}.` };
    a.trener = b.trener = true; S.opplæring.push({ lærer: a.id, elev: b.id, oppgave: o, fra: b.ferd[o] || .9 }); return { tekst: `${a.navn} lærer opp ${b.navn} i ${FR.OPPGAVE[o].navn.toLowerCase()}. Begge arbeider litt saktere imens.` };
  }
  function stoppOpplæring(S, F, i) { const q = S.opplæring[i]; if (!q) return; for (const id of [q.lærer, q.elev]) { const p = F.personer.find(x => x.id === id); if (p) delete p.trener; } S.opplæring.splice(i, 1); }
  function opplæringSteg(S, F, dt) {
    const H = [], d = dt / REGLER.døgn;
    for (let i = S.opplæring.length - 1; i >= 0; i--) { const q = S.opplæring[i], a = F.personer.find(p => p.id === q.lærer), b = F.personer.find(p => p.id === q.elev);
      if (!a || !b) { stoppOpplæring(S, F, i); continue; } if (!FR.arbeidsfør(a) || !FR.arbeidsfør(b)) continue;
      const mål = Math.min(REGLER.lærMaks, lærerNivå(a, q.oppgave) - .05), kraft = klem((lærerNivå(a, q.oppgave) - (b.ferd[q.oppgave] || .9)) / .3, .3, 2);
      b.ferd[q.oppgave] = Math.min(mål, Math.round(((b.ferd[q.oppgave] || .9) + REGLER.lærFart * kraft * d) * 1e4) / 1e4);
      if (b.ferd[q.oppgave] >= mål - 1e-6) { H.push(`${b.navn} er ferdig opplært i ${FR.OPPGAVE[q.oppgave].navn.toLowerCase()} av ${a.navn.split(' ')[0]} (${q.fra.toFixed(2).replace('.', ',')} → ${b.ferd[q.oppgave].toFixed(2).replace('.', ',')}).`); stoppOpplæring(S, F, i); } }
    return H;
  }

  // ================= BEGRAVELSER OG MINNESMERKE =================
  // (R2-løkka 26. nov, kritikken: «Venter på begravelse: Vegard Dahl, Vegard Dahl» etter omlasting) samme navn står bare én gang på lista
  function død(S, navn, hvem, tid) { if (!navn || S.døde.some(q => q.navn === navn)) return false; S.døde.push({ navn, hvem: hvem || 'folk', tid: tid || 0 }); return true; }
  // måte: 'seremoni' (koster tre timer, gir moral og lojalitet) eller 'enkel' (ingen kostnad, ingen trøst)
  function gravlegg(S, F, måte, tid) {
    if (!S.døde.length) return { feil: 'Ingen venter på å bli gravlagt.' }; const navn = S.døde.map(q => q.navn); S.gravlagte.push(...navn); S.døde = [];
    if (måte === 'seremoni') { S.seremoniTil = tid + REGLER.seremoniTid; virkning(S, { navn: 'Verdig avskjed', moral: 5, døgn: 2 }, tid); for (const p of F.personer) p.lojal = klem(p.lojal + .02);
      return { tekst: `Leiren samles til begravelse for ${liste(navn)}. Arbeidet står nesten stille i tre timer.` }; }
    virkning(S, { navn: 'Hastig gravlagt', moral: -1, døgn: 1 }, tid); return { tekst: `${liste(navn)} ble gravlagt uten seremoni.` };
  }
  const liste = a => (a.length > 3 ? `${a.slice(0, 3).join(', ')} og ${a.length - 3} til` : a.join(', ').replace(/, ([^,]*)$/, ' og $1'));
  const minneMoral = (S, har) => (har ? Math.min(REGLER.minnesmerkeMaks, REGLER.minnesmerke + REGLER.minnesmerkePerNavn * S.gravlagte.length) : 0);

  // ================= VIRKNINGER SOM VARER =================
  function virkning(S, v, tid) { const til = tid + (v.døgn || 1) * REGLER.døgn; const g = S.virkninger.find(q => q.navn === v.navn); if (g) { g.til = Math.max(g.til, til); return g; }
    const n = { navn: v.navn, moral: v.moral || 0, tempo: v.tempo || 1, til }; S.virkninger.push(n); return n; }

  // ================= KORT: krangler og ønsker =================
  // følge: { moral, lojal: {a, b, alle}, helse: {a, b}, mat, penger, virkning: {navn, moral, tempo, døgn}, borte: døgn (a), utvis: true (a), løfte: true,
  //          sjanse: { p, da: følge, ellers: følge }, tekst }
  const KORT = [
    { id: 'krangel', to: true, tekst: (a, b) => `${a.navn} og ${b.navn} krangler høylytt om hvem som gjør minst i leiren.`, valg: [
      { t: 'Sett deg ned og megle', f: { moral: 2, lojal: { a: .03, b: .03 }, tekst: 'De tok hverandre i hånda til slutt.' } },
      { t: a => `Ta ${a.navn.split(' ')[0]} sin side`, f: { lojal: { a: .1, b: -.15 }, virkning: { navn: 'Sur stemning', moral: -3, døgn: 2 }, tekst: 'Den andre gikk sin vei uten et ord.' } },
      { t: 'La dem ordne opp selv', f: { sjanse: { p: .5, da: { helse: { a: -.2, b: -.2 }, virkning: { navn: 'Slåsskamp i leiren', moral: -4, døgn: 1 }, tekst: 'Det endte i slåsskamp.' }, ellers: { tekst: 'Det gikk over av seg selv.' } } } }] },
    { id: 'fest', krav: k => k.F.mat > 15, tekst: a => `${a.navn} foreslår en fest med ekstra mat og musikk. Folk trenger noe å glede seg til.`, valg: [
      { t: 'Ja – bruk 10 rasjoner', f: { mat: -10, virkning: { navn: 'Etter festen', moral: 8, døgn: 2 }, lojal: { alle: .02 }, tekst: 'Det ble sunget til langt på natt.' } },
      { t: 'Ikke nå', f: { virkning: { navn: 'Skuffet over avslaget', moral: -3, døgn: 1 }, tekst: 'Folk trakk på skuldrene.' } }] },
    { id: 'familie', krav: k => k.F.personer.length > 4, tekst: a => `${a.navn} har hørt at søsteren kan være i live i nabodalen, og ber om å få dra og lete i to døgn.`, valg: [
      { t: 'La hen dra (borte i to døgn)', f: { borte: 2, lojal: { a: .2 }, tekst: 'Hen pakket sekken med en gang.' } },
      { t: 'Nei, vi trenger alle hender', f: { lojal: { a: -.15 }, virkning: { navn: 'Nektet å lete etter familien', moral: -2, døgn: 2 }, tekst: 'Hen sa ingenting, men alle så det.' } }] },
    { id: 'arbeidstid', tekst: a => `${a.navn} taler for flere: dagene er for lange, og folk er utslitt.`, valg: [
      { t: 'Kortere dager i tre døgn', f: { virkning: { navn: 'Kortere arbeidsdager', moral: 6, tempo: .85, døgn: 3 }, tekst: 'Arbeidet går saktere, men folk smiler igjen.' } },
      { t: 'Vi har ikke råd til å hvile', f: { virkning: { navn: 'Slitne og misfornøyde', moral: -4, døgn: 2 }, tekst: 'Det ble stille rundt bålet.' } }] },
    { id: 'brennevin', tekst: a => `${a.navn} har funnet en kasse hjemmebrent i en kjeller.`, valg: [
      { t: 'Del den ut i kveld', f: { virkning: { navn: 'Dagen derpå', moral: 7, tempo: .8, døgn: 1 }, tekst: 'Det ble en lang kveld.' } },
      { t: 'Lås den inn til sykestua', f: { virkning: { navn: 'Brennevinet ble låst inn', moral: -2, døgn: 1 }, tekst: 'Fornuftig, sa noen. Kjedelig, sa flere.' } },
      { t: 'Selg den (400 000 kr)', f: { penger: 4e5, lojal: { a: -.05 }, tekst: 'Handelsmannen betalte godt.' } }] },
    { id: 'skole', krav: k => k.S.avhengige.filter(a => a.type === 'barn').length >= 2, tekst: a => `${a.navn} vil holde skole for barna noen timer hver dag.`, valg: [
      { t: 'Ja, barna trenger det', f: { virkning: { navn: 'Skole for barna', moral: 4, tempo: .97, døgn: 7 }, lojal: { a: .1 }, tekst: 'Første time ble holdt i matteltet.' } },
      { t: 'Vi har ikke folk til det', f: { virkning: { navn: 'Ingen skole for barna', moral: -2, døgn: 3 }, tekst: 'Barna løper rundt som før.' } }] },
    { id: 'tyv', krav: k => k.F.mat > 6, tekst: a => `${a.navn} ble tatt i å gjemme unna mat fra lageret.`, valg: [
      { t: 'Straff: ekstra vakter og halv rasjon', f: { lojal: { a: -.2 }, moral: 1, tekst: 'Regler er regler.' } },
      // RUNDE 13 (kritiker H: «Tilgi – alle er sultne» mens maten rakk i 17 døgn): teksten følger matlageret (matDøgn: under 3 døgn = sultne)
      { t: (a, b, k) => (matDøgn(k) < 3 ? 'Tilgi – alle er sultne' : matDøgn(k) < 7 ? 'Tilgi – hen er redd maten tar slutt' : 'Tilgi denne gangen'), f: { lojal: { a: .1 }, virkning: { navn: 'Tyveri uten følger', moral: -2, døgn: 1 }, tekst: 'Noen mente du var for snill.' } },
      { t: 'Utvis hen fra leiren', f: { utvis: true, virkning: { navn: 'En av oss ble utvist', moral: -3, døgn: 2 }, tekst: 'Hen gikk før det ble lyst.' } }] },
    { id: 'ønske', tekst: (a, b, k) => `${a.navn} tar deg til side: «Jeg ønsker meg ${profil(a).ønskeTekst}.»`, krav: (k, a) => !ønskeOppfylt(a, k), valg: [
      { t: 'Lov at det kommer (innen tre døgn)', f: { løfte: true, lojal: { a: .05 }, tekst: 'Hen takket og gikk tilbake til arbeidet.' } },
      { t: 'Si det som det er: ikke nå', f: { tekst: 'Hen nikket. Ærlig tale varer lengst.' } }] },
    { id: 'minnestund', krav: k => k.S.gravlagte.length > 0, tekst: a => `${a.navn} vil samle leiren til en stille stund for dem som er borte.`, valg: [
      { t: 'Ja, la oss samles', f: { virkning: { navn: 'Minnestund', moral: 4, tempo: .9, døgn: 1 }, lojal: { alle: .01 }, tekst: 'Navnene ble lest opp ett for ett.' } },
      { t: 'Vi får se framover', f: { tekst: 'Arbeidet gikk videre.' } }] },
  ];
  // hvor mange døgn maten rekker (én rasjon per person per døgn; uten tall: «nok»)
  const matDøgn = k => { const F = k && k.F; return F && F.personer && F.personer.length ? (+F.mat || 0) / F.personer.length : 99; };
  // velg et kort som passer nå (aldri det samme to ganger på rad). Gir { type: 'kort', id, a, b }
  function velgKort(S, F, k, r) {
    if (F.personer.length < 2) return null; const P = F.personer.filter(p => !p.borte), a = P[Math.floor(r() * P.length)], b = P.filter(p => p !== a)[Math.floor(r() * (P.length - 1))]; if (!a || !b) return null;
    const mulige = KORT.filter(q => q.id !== S.sistKort && (!q.krav || q.krav({ ...k, S, F }, a))); const q = mulige[Math.floor(r() * mulige.length)]; if (!q) return null;
    return { type: 'kort', id: q.id, a: a.id, b: b.id };
  }
  function kortTekst(S, F, c, k) { const q = KORT.find(x => x.id === c.id), a = F.personer.find(p => p.id === c.a) || { navn: 'Noen', ferd: {} }, b = F.personer.find(p => p.id === c.b) || { navn: 'en annen', ferd: {} };
    return { tittel: 'I leiren', tekst: medPron(q.tekst(a, b, k), a), valg: q.valg.map(v => ({ t: medPron(typeof v.t === 'function' ? v.t(a, b, { ...k, S, F }) : v.t, a), kan: !(v.f.mat < 0 && F.mat < -v.f.mat) })) }; }
  function brukFølge(S, F, f, a, b, k, r, ut) {
    if (f.sjanse) return brukFølge(S, F, r() < f.sjanse.p * (S.lover.våpen && f.sjanse.da.helse ? 1.3 : 1) ? f.sjanse.da : f.sjanse.ellers, a, b, k, r, ut);
    if (f.moral) F.moral = klem(F.moral + f.moral, 0, 100); if (f.mat) F.mat = Math.max(0, F.mat + f.mat); if (f.penger) ut.penger += f.penger;
    if (f.lojal) { if (a && f.lojal.a) a.lojal = klem(a.lojal + f.lojal.a); if (b && f.lojal.b) b.lojal = klem(b.lojal + f.lojal.b); if (f.lojal.alle) for (const p of F.personer) p.lojal = klem(p.lojal + f.lojal.alle); }
    // med våpen i leiren ender slåsskamper stygt
    if (f.helse) { const g = S.lover.våpen ? 2.2 : 1; if (a && f.helse.a) a.helse = klem(a.helse + f.helse.a * g, .05); if (b && f.helse.b) b.helse = klem(b.helse + f.helse.b * g, .05); if (S.lover.våpen) ut.tekst += ' Det ble trukket våpen.'; }
    if (f.virkning) virkning(S, f.virkning, k.tid || 0);
    if (f.borte && a) a.borte = (k.tid || 0) + f.borte * REGLER.døgn;
    if (f.utvis && a) F.personer = F.personer.filter(p => p !== a);
    if (f.løfte && a) S.løfter.push({ id: a.id, navn: a.navn, til: (k.tid || 0) + REGLER.løfteDøgn * REGLER.døgn });
    if (f.tekst) ut.tekst = medPron(f.tekst, a) + ut.tekst; return ut;
  }
  // valget i et kort tas. Gir { tekst, penger } (penger: kroner inn, betales/gis av visningen)
  function kortSvar(S, F, c, i, k, r) {
    const q = KORT.find(x => x.id === c.id); if (!q || !q.valg[i]) return { feil: 'Ukjent valg.' }; const f = q.valg[i].f;
    if (f.mat < 0 && F.mat < -f.mat) return { feil: 'Dere har ikke nok mat.' };
    const a = F.personer.find(p => p.id === c.a), b = F.personer.find(p => p.id === c.b); S.sistKort = q.id;
    return brukFølge(S, F, f, a, b, k, r, { tekst: '', penger: 0 });
  }

  // ================= ALT SAMLET =================
  // Det FolkRegler.steg trenger fra samfunnet. k: { B, sult, kald, tid, minnesmerke, brønn, radiomast, F }
  function valg(S, F, k) {
    const nå = k.tid || 0, V = S.virkninger.filter(v => v.til > nå), syke = sykeI(F).length + sykeAvh(S).length;
    const deler = { lover: lovMoral(S), 'barn og gamle': avhengigMoral(S, k), ønsker: Math.round((ønskeAndel(F, { ...k, F }) - .5) * REGLER.ønskeMoral),
      hendelser: V.reduce((s, v) => s + v.moral, 0), 'ugravlagte døde': -Math.min(REGLER.ugravlagtMaks, REGLER.ugravlagt * S.døde.length), minnesmerke: minneMoral(S, k.minnesmerke),
      Grålungen: -Math.min(REGLER.sykMoralMaks, REGLER.sykMoral * syke) - (S.karantene ? REGLER.karanteneMoral : 0) };
    const tempo = (S.lover.arbeidsplikt ? LOVER.arbeidsplikt.tempo : 1) * V.reduce((s, v) => s * (v.tempo || 1), 1) * (S.seremoniTil > nå ? REGLER.seremoniTempo : 1);
    return { moralTillegg: Object.values(deler).reduce((s, v) => s + v, 0), deler, tempoFaktor: tempo, matFaktor: S.lover.rasjonering ? LOVER.rasjonering.mat : 1, avhengige: S.avhengige.length };
  }
  // Ett steg (dt i spillminutter). k: { B, sult, kald, tid, auto, utenVann, minnesmerke, brønn, radiomast }. Gir { hendelser, lekk, kort }.
  // k.auto = false (testene): ingenting starter av seg selv (utbrudd, flyktninger, forrædere, kort) – det som er i gang, går sin gang.
  function steg(S, F, L, dt, k, r) {
    r = r || tilf(S); const ut = { hendelser: [], lekk: false, kort: null }, d = dt / REGLER.døgn, nå = k.tid || 0, kk = { ...k, F };
    S.virkninger = S.virkninger.filter(v => v.til > nå);
    // tilbake fra leting etter familien
    for (const p of F.personer) if (p.borte && p.borte <= nå) { delete p.borte; ut.hendelser.push(`${p.navn} er tilbake i leiren.`); }
    // ønsker: lojaliteten følger om ønsket er oppfylt; løfter som holdes eller brytes
    for (const p of F.personer) p.lojal = klem(p.lojal + (ønskeOppfylt(p, kk) ? REGLER.ønskeLojal : -REGLER.ønskeUlojal) * d);
    for (let i = S.løfter.length - 1; i >= 0; i--) { const l = S.løfter[i], p = F.personer.find(q => q.id === l.id); if (!p) { S.løfter.splice(i, 1); continue; }
      if (ønskeOppfylt(p, kk)) { p.lojal = klem(p.lojal + REGLER.løfteHoldt); ut.hendelser.push(`Du holdt løftet til ${p.navn}: ${pron(p)} fikk ${profil(p).ønskeTekst}.`); S.løfter.splice(i, 1); }
      else if (l.til <= nå) { p.lojal = klem(p.lojal - REGLER.løfteBrutt); ut.hendelser.push(`Du brøt løftet til ${p.navn}. ${medPron('Hen', p)} stoler mindre på deg nå.`); S.løfter.splice(i, 1); } }
    // lovene
    if (S.lover.rasjonering) for (const p of F.personer) p.helse = Math.max(.3, p.helse - LOVER.rasjonering.helse * d);
    if (S.lover.arbeidsplikt) for (const p of F.personer) if (p.lojal < .6) p.lojal = klem(p.lojal - LOVER.arbeidsplikt.lojal * d);
    // de døde: etter fristen legges de i jorda uten seremoni
    if (S.døde.length && S.døde.every(q => (nå - q.tid) / REGLER.døgn > REGLER.gravFrist)) { const navn = S.døde.map(q => q.navn); S.gravlagte.push(...navn); S.døde = [];
      virkning(S, { navn: 'Ingen tok farvel', moral: -3, døgn: 2 }, nå); ut.hendelser.push(`${liste(navn)} ble lagt i jorda uten at noen tok farvel. Det tynger leiren.`); }
    ut.hendelser.push(...sykdomSteg(S, F, dt, kk, r), ...opplæringSteg(S, F, dt));
    const sp = spionSteg(S, F, L, dt, kk, r); ut.hendelser.push(...sp.hendelser); ut.lekk = sp.lekk; ut.ødelagt = !!sp.ødelagt;
    // det som kommer av seg selv: flyktninger og kort (ett om gangen)
    if (k.auto) {
      if (S.nesteFlykt === null) S.nesteFlykt = nå + mellom(r, REGLER.flyktTid) * REGLER.døgn; if (S.nesteKort === null) S.nesteKort = nå + mellom(r, REGLER.kortTid) * REGLER.døgn;
      if (!S.kort && S.kø && S.kø.length) S.kort = S.kø.shift();
      if (!S.kort && nå >= S.nesteFlykt) { S.kort = nyeFlyktninger(S, r); S.nesteFlykt = nå + mellom(r, REGLER.flyktTid) * REGLER.døgn; }
      if (!S.kort && nå >= S.nesteKort) { S.kort = velgKort(S, F, kk, r); S.nesteKort = nå + mellom(r, REGLER.kortTid) * REGLER.døgn; }
    }
    ut.kort = S.kort; return ut;
  }

  const api = { pron, medPron, REGLER, ny, fraJSON, tilf, profil, portrettSVG, ØNSKER, LYNNE, ønskeOppfylt, ønskeAndel, beste, SPES, gjørSpesialist, nySpesialist, harSpes, funnet, oppdragSpes, oppdragSpesTekst, ankommet, fangerInn, nyAvhengig, avhengigMoral,
    nyeFlyktninger, flyktTekst, flyktValg, flyktSvar, sykeI, sykeAvh, smitt, settKarantene, sykdomSteg, LOVER, settLov, lovMoral, snittLojal, spionSteg, saboter, etterforsk, dom,
    lærerNivå, kanLære, lærere, startOpplæring, stoppOpplæring, opplæringSteg, død, gravlegg, minneMoral, virkning, KORT, velgKort, kortTekst, kortSvar, valg, steg };
  if (node) module.exports = api; else rot.Samfunn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
