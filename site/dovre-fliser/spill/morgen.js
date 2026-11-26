/* Riksbrudd – MORGENMØTET (runde 8, 20. nov natt, pakke «morgen»). Kritiker C: «Jeg følte at spillet spilte seg selv: hogst, frakt, mat
 * og forsvar går av seg selv, og jeg hadde lite å avgjøre de første døgnene.»
 *  1. Hver morgen kl. 06 (sammen med dagboka og døgnoppgjøret) får du et kort med 2–3 valg for dagen, ut fra det som faktisk står på i leiren:
 *     lite mat -> jakt og fiske / kjøp mat / halve rasjoner; røvere ventes -> dobbel vakt i natt; lite penger -> selg tre / et risikabelt
 *     oppdrag; godt med folk -> en speidertur; lav moral -> fridag; ellers ekstra skift. Hvert valg sier hva det koster og hva det gir.
 *     Neste morgen står det på kortet hvordan det gikk («I går: jakta ga 13 rasjoner»).
 *  2. Noen dager (fra dag 2, så hver tredje dag) kommer også én større beslutning på samme kort: et nabogårdsfolk vil bli med, en forlatt
 *     tankbil (et lite oppdrag i kartet), røvere som vil ha betalt for å la dere være, eller en handelskaravane.
 * Reglene her er uten DOM (Node: require('./morgen'); nettleser: globalThis.Morgen) – test: pipeline/fliser/test_morgen.js.
 * Visningen (kortet, virkningene på folk, lager, kasse og angrep) ligger i spill/morgen-visning.js. Alle tall er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // felles tilfeldighet (spill/tilfeldig.js, M0 i docs/plan-flerspiller.md): samme frø gir samme svar på alle maskiner
  const TILFELDIG = (typeof globalThis !== 'undefined' && globalThis.Tilfeldig) || (typeof require === 'function' ? require('./tilfeldig') : null);
  const tilf = TILFELDIG ? TILFELDIG.verden : Math.random;
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const des = (v, n = 1) => (Math.round(v * 10 ** n) / 10 ** n).toFixed(n).replace('.', ',').replace(/,0+$/, '');
  const kr = v => { const a = Math.abs(Math.round(v)); return (v < 0 ? '−' : '') + (a >= 1e6 ? des(a / 1e6) + ' mill. kr' : a >= 1000 ? Math.round(a / 1000).toLocaleString('nb-NO') + ' 000 kr' : a + ' kr'); };
  const mellom = (r, [a, b]) => a + r() * (b - a);

  // ---------- TALLENE (alle er Claudes forslag) ----------
  const REGLER = {
    // når et behov «står på»: mat til under matDøgn døgn, røvere ventet innen røverTimer spilltimer, kassa under litePenger kr,
    // minst folkNok arbeidsføre for en speidertur, moral under lavMoral / over godMoral
    matDøgn: 3, røverTimer: 20, litePenger: 12e6, folkNok: 6, lavMoral: 45, godMoral: 62,
    // folk som er borte en dag (jakt, speidertur, leie ut, tankbil til fots): så mange personer
    borte: 2,
    // jakt og fiske: rasjoner per person (ganger ferdigheten i hogst, og årstiden), og sjansen for at én blir skadet (helsa ned)
    jakt: { per: [4, 8], årstid: { vinter: .6, vår: .9, sommer: 1.1, høst: 1.2 }, skade: .1, helse: .3 },
    // kjøp mat: så mange rasjoner (prisen er markedsprisen)
    kjøp: 20,
    // halve rasjoner: forbruket ganges med mat, moralen får tillegg (en dag)
    rasjon: { mat: .6, moral: -12 },
    // dobbel vakt: så mange ekstra på vakt til neste morgen; lagene innen radius m fra leiren treffer ild ganger så ofte;
    // neste dag er folk slitne (moral og tempo)
    vakt: { ekstra: 2, radius: 450, ild: 1.2, slitenMoral: -8, slitenTempo: .9 },
    // selg tre: så mye av treet på lageret (høyst maks m³), minst min m³ for at valget kommer
    selg: { andel: .5, maks: 20, min: 4 },
    // lei ut to som vakter til en nabogård (risikabelt): betaling, sjansen for at én blir såret og for at én ikke kommer tilbake
    leie: { penger: [8e5, 1.6e6], såret: .3, helse: .45, borte: .06 },
    // speidertur: det de finner, sjansen for skade
    speid: { tre: [1, 4], stål: [0, 1.2], mat: [2, 7], skade: .08, helse: .3 },
    // våpenøvelse for to: erfaring (minutter i kamp, spill/formasjon.js: «erfaren» fra 30) per person, og sjansen for en liten skade
    øv: { erf: 15, skade: .05, helse: .2 },
    // fridag for alle / ekstra skift: tempo og moral (en dag)
    fri: { tempo: .5, moral: 12 }, skift: { tempo: 1.25, moral: -10 },
    // den store beslutningen: første dag, så hver «hver» dag. RUNDE 13 (kritiker H: «dag 3 er tom – alt er bygget, ingen inntekt, ingen
    // trussel»): hver dag fra dag 2 (før hver tredje). «pause» = så mange dager før samme slag kan komme igjen (brytes bare når ingenting
    // annet passer)
    stor: { første: 2, hver: 1, pause: { nabo: 4, tankbil: 3, vern: 2, karavane: 3, handel: 2 } },
    // RUNDE 13: handelsmannen kommer til leiren «timer» etter kl. 06 (kl. 14) og kjøper tre (m³) til «trePris» ganger markedets salgspris
    // og diesel (l) til «dieselPris» ganger markedets kjøpspris – det dere har avtalt og fortsatt har på lageret da
    handel: { timer: 8, tre: [10, 25], minTre: 4, trePris: 1.8, diesel: [200, 500], minDiesel: 300, dieselPris: .9 },
    // RUNDE 13: svartebørsen (inntekt uten krig, et dagsvalg): selg en andel av treet (m³, høyst maks) til «pris» ganger salgsprisen,
    // eller diesel (l) til «pris» ganger kjøpsprisen. Begge under det markedet tar for å selge (tre: 1,5 × markedet), så det lønner seg
    // ikke å kjøpe for å selge igjen
    svart: { tre: { andel: .5, maks: 20, min: 4, pris: 1.4 }, diesel: { andel: .3, maks: 400, min: 300, pris: .75 } },
    // nabogården: så mange folk og så mye mat de har med; avvist gir moral
    nabo: { folk: 4, mat: 8, avvistMoral: -3 },
    // tankbilen: avstand (m), diesel (l), frist (spillminutter), sjansen for røvere ved bilen (lag), og til fots: sjansen for at de får med noe
    tankbil: { avst: [2400, 3400], diesel: [600, 1000], frist: 2 * 1440, røvere: .35, røverMenn: 4, fots: { lykkes: .55, diesel: [250, 450], skade: .25, helse: .35 } },
    // beskyttelse: prisen (fast + per bølge), utsettelsen av neste bølge (spillminutter, og ekte minutter med spilling – bølgene kommer
    // også etter ekte tid), moral når dere nekter
    vern: { fast: 1.5e6, perBølge: 5e5, utsett: 1440, utsettEkte: 20, nektMoral: 3 },
    // handelskaravanen: pakken (diesel l, mat) til «rabatt» av markedsprisen; kjøper tre (m³) til «tre» ganger salgsprisen
    karavane: { diesel: 500, mat: 30, rabatt: .7, tre: 15, minTre: 5, trePris: 1.3 },
    // RUNDE 14 (kritiker I: møtet kl. 06:01 nevnte ikke at røverne kom «om under 1 min»): raidet står øverst i møtet når neste bølge er
    // under «linje» spillminutter unna (som varselbrikken, 12 t), og «Forsvar leiren nå» tilbys når den er under «forsvar» minutter unna
    raid: { linje: 720, forsvar: 360 },
    // RUNDE 14 (kritiker J: fire tettsteder tapt på én natt, ett lag på 4 og seks folk igjen – «ingen vei tilbake»): etter et tapt tettsted
    // eller en tapt tropp tilbyr møtet flere soldater. leie = leiesoldater (et ferdig lag på «menn» mann, pris i kr); rekrutt = folk fra
    // nabogården (til Folk, så du kan lage en tropp); vaktlag = lag en tropp av så mange av folkene (minst «minFolk» arbeidsføre i leiren først)
    tap: { leie: { menn: 4, pris: 2.5e6 }, rekrutt: { folk: 2, pris: 6e5 }, vaktlag: 4, minFolk: 6 },
    // krisehjelp: ingen tettsteder og færre enn «soldater» friske soldater -> bygdevernet sender «menn» frivillige gratis, høyst hver «pause» dag
    krise: { soldater: 6, menn: 3, pause: 3 },
    // speidertur mot et tettsted en motstander holder: større fare (skade, og at én blir tatt til fange)
    speidFiende: { skade: .25, borte: .06 },
  };

  // ---------- DAGENS VALG ----------
  // s (det som står på i leiren – visningen fyller det ut): { dag, folk, arbeidsføre, frie, mat, matDøgn, moral, penger, matPris, trePris
  //   (salgspris per m³), lager: { tre }, diesel, dieselPlass, røverTimer (spilltimer til neste bølge, 0 = pågår, null = ukjent),
  //   bølge, post (et ledig oppdrag «Ta en røverpost»: { id, gir, meter, retning } eller null), sted (navn på nærmeste tettsted), årstid }
  // Gir [{ id, t (knappen), følge (hva det koster og gir), vekt }] – 2 eller 3 valg, de viktigste først.
  function dagensValg(s, rng = tilf) {
    const R = REGLER, ut = [], kan = s.arbeidsføre >= R.borte + 2, legg = (vekt, v) => ut.push({ vekt: vekt + rng() * .01, ...v });
    const matKr = Math.round((s.matPris || 3000) * R.kjøp);
    // RUNDE 14: røverne kommer snart (eller angriper) – forsvaret først
    const rd = s.raid; if (rd && !rd.satt && (rd.aktiv || rd.min <= R.raid.forsvar) && s.folk > 0)
      legg(12, { id: 'forsvar', t: 'Forsvar leiren nå', følge: `Alle lag innen 3 km går i stilling mot røverne og graver seg ned. Folk på vakt blir Leirvakta. ${rd.aktiv ? 'Røverne angriper nå.' : 'Røverne drar ut om ' + rd.nedtelling + '.'}` });
    // RUNDE 14: etter et tapt tettsted eller en tapt tropp – minst ett valg som gir flere soldater (krisehjelp når alt er tapt)
    const tapt = s.tapt && ((s.tapt.byer || []).length || (s.tapt.lag || []).length), T = R.tap;
    if (s.kriseKan) legg(11, { id: 'krise', t: `Krisehjelp: bygdevernet sender ${R.krise.menn} frivillige (gratis)`, følge: `Dere har ingen tettsteder og bare ${s.soldater} friske soldater. ${R.krise.menn} frivillige kommer til leiren i dag som et eget lag – lett bevæpnet, men det er en start.` });
    if (tapt || s.kriseKan) {
      if (s.penger >= T.leie.pris) legg(10, { id: 'leiesold', t: `Kjøp leiesoldater (${T.leie.menn} mann, ${kr(T.leie.pris)})`, følge: `Et ferdig lag på ${T.leie.menn} med geværer står i leiren i dag. Kassa går ned med ${kr(T.leie.pris)}.`, pris: T.leie.pris });
      if (s.arbeidsføre >= T.minFolk) legg(9.5, { id: 'vaktlag', t: `Lag et vaktlag av ${T.vaktlag} i leiren (gratis)`, følge: `De ${T.vaktlag} som egner seg best, blir en tropp med geværer. Leiren har ${s.arbeidsføre - T.vaktlag} arbeidsføre igjen.` });
      if (s.penger >= T.rekrutt.pris) legg(9, { id: 'rekrutt', t: `Rekrutter ${T.rekrutt.folk} fra nabogården (${kr(T.rekrutt.pris)})`, følge: `${T.rekrutt.folk} nye i Folk i dag. Lag en tropp av dem i Leir → Tropper (minst 2 per tropp).`, pris: T.rekrutt.pris });
    }
    if (s.folk > 0 && s.matDøgn < R.matDøgn) {
      const hast = 3 - s.matDøgn;
      if (kan) legg(5 + hast, { id: 'jakt', t: 'Send to på jakt og fiske', følge: `To er borte i dag og arbeider ikke. I morgen har de med seg mat (ca. ${R.jakt.per[0] * 2}–${R.jakt.per[1] * 2} rasjoner). Liten fare for at én skader seg.` });
      if (s.penger >= matKr) legg(4 + hast, { id: 'kjøp', t: `Kjøp ${R.kjøp} rasjoner (${kr(matKr)})`, følge: `Maten kommer i dag. Kassa går ned med ${kr(matKr)}.`, pris: matKr });
      legg(3 + hast, { id: 'rasjon', t: 'Halve rasjoner i dag', følge: `Maten rekker lenger (${Math.round((1 - R.rasjon.mat) * 100)} % mindre forbruk i dag), men folk blir sure (moral ${R.rasjon.moral} i dag).` });
    }
    if (s.røverTimer !== null && s.røverTimer !== undefined && s.røverTimer <= R.røverTimer && s.folk >= 3)
      legg(s.røverTimer <= 0 ? 9 : 7, { id: 'vakt', t: s.røverTimer <= 6 ? 'Dobbel vakt fra nå til i morgen (folk blir slitne)' : 'Dobbel vakt i natt (folk blir slitne)', følge: `${R.vakt.ekstra} til går på vakt til i morgen tidlig: vaktene ser røverne tidligere, og lagene ved leiren treffer bedre. I morgen er folk slitne (moral ${R.vakt.slitenMoral}, litt saktere arbeid).` });
    if (s.penger < R.litePenger) {
      const tre = Math.min(R.selg.maks, Math.floor((s.lager && s.lager.tre || 0) * R.selg.andel));
      if (tre >= R.selg.min) legg(6, { id: 'selg', t: `Selg ${tre} m³ tre (ca. ${kr(tre * (s.trePris || 0))})`, følge: 'Penger i kassa nå. Mindre tre til bygging og ved.', mengde: tre });
      if (s.post) legg(5.5, { id: 'post', t: `Ta et risikabelt oppdrag: røverposten (${kr(s.post.gir)})`, følge: `Røverposten ${s.post.meter >= 1000 ? des(s.post.meter / 1000) + ' km' : Math.round(s.post.meter / 10) * 10 + ' m'} mot ${s.post.retning} kommer i kartet. Send en tropp dit: farlig, men godt betalt.`, oppdrag: s.post.id });
      else if (kan) legg(5, { id: 'leie', t: 'Lei ut to som vakter til en nabogård', følge: `To er borte i dag. I morgen: ${kr(R.leie.penger[0])}–${kr(R.leie.penger[1])} – men omtrent hver tredje gang kommer en av dem såret hjem, og en sjelden gang ikke i det hele tatt.` });
    }
    // RUNDE 13: inntekt uten krig – svartebørsen kjøper tre (eller diesel) hver dag, ikke bare når kassa er nesten tom
    const sv = s.folk > 0 ? svartTilbud(s) : null; if (sv && !ut.some(v => v.id === 'selg' && sv.vare === 'tre')) legg(3.5, sv);
    // RUNDE 14 (kritiker J: «speidertur mot Røysland», som fienden nettopp hadde tatt): eieren står i knappen, og risikoen i følgen
    if (kan && s.arbeidsføre >= R.folkNok) { const fi = s.stedEier || null;
      legg(fi ? 2.8 : 3, { id: 'speid', t: s.sted ? `Send to på speidertur mot ${s.sted}` + (fi ? ` (${fi} nå)` : '') : 'Send to på speidertur rundt leiren', sted: s.sted || null, fiende: fi,
        følge: fi ? `${s.sted} holdes av fienden: farlig tur (omtrent hver fjerde gang kommer en skadet hjem, og en sjelden gang blir en tatt). I morgen melder de hvor mange fiender som er der, og når røverne kommer.`
          : 'To er borte i dag. I morgen melder de når røverne kommer neste gang, og tar med det de finner av mat og materialer.' }); }
    if (kan && s.arbeidsføre >= R.folkNok) legg(2.5, { id: 'øv', t: 'Våpenøvelse for to (bedre soldater)', følge: `To øver hele dagen og arbeider ikke. I morgen er de mer erfarne (+${R.øv.erf} min kamperfaring hver – følger dem inn i en tropp).` });
    if (s.folk > 0 && s.moral < R.lavMoral) legg(4 + (R.lavMoral - s.moral) / 10, { id: 'fri', t: 'Fridag for alle', følge: `Moralen stiger (+${R.fri.moral} i dag), men alt arbeid går halvt så fort i dag.` });
    if (s.folk > 0 && s.moral >= R.godMoral) legg(2, { id: 'skift', t: 'Ekstra skift i dag', følge: `Alt arbeid går ${Math.round((R.skift.tempo - 1) * 100)} % raskere i dag, men folk blir slitne (moral ${R.skift.moral} i dag).` });
    // for få: fyll på med fridag/ekstra skift (det som passer moralen)
    if (ut.length < 2 && s.folk > 0) { if (!ut.some(v => v.id === 'skift') && s.moral >= R.lavMoral) legg(1, { id: 'skift', t: 'Ekstra skift i dag', følge: `Alt arbeid går ${Math.round((R.skift.tempo - 1) * 100)} % raskere i dag, men folk blir slitne (moral ${R.skift.moral} i dag).` });
      if (!ut.some(v => v.id === 'fri')) legg(.5, { id: 'fri', t: 'Fridag for alle', følge: `Moralen stiger (+${R.fri.moral} i dag), men alt arbeid går halvt så fort i dag.` }); }
    // RUNDE 14: når røverne kommer eller noe er tapt, får møtet plass til fire valg (så mat og forsvar ikke skyver hverandre ut)
    return ut.sort((a, b) => b.vekt - a.vekt).slice(0, (rd && (rd.aktiv || rd.min <= R.raid.forsvar)) || tapt || s.kriseKan ? 4 : 3);
  }

  // RUNDE 13: svartebørsens tilbud i dag – tre hvis det er nok på lageret, ellers diesel; null når dere ikke har noe å selge
  function svartTilbud(s) {
    const R = REGLER.svart, tre = Math.min(R.tre.maks, Math.floor((s.lager && s.lager.tre || 0) * R.tre.andel)), d = Math.min(R.diesel.maks, Math.floor((s.diesel || 0) * R.diesel.andel / 50) * 50);
    if (tre >= R.tre.min && s.trePris > 0) { const pris = Math.round(tre * s.trePris * R.tre.pris / 1e4) * 1e4;
      return { id: 'svart', vare: 'tre', mengde: tre, pris, t: `Selg ${tre} m³ tre på svartebørsen (${kr(pris)})`, følge: `Penger i kassa nå – ${Math.round((R.tre.pris - 1) * 100)} % mer enn markedet gir. Mindre tre til bygging og ved.` }; }
    if (d >= R.diesel.min && s.dieselPris > 0) { const pris = Math.round(d * s.dieselPris * R.diesel.pris / 1e4) * 1e4;
      return { id: 'svart', vare: 'diesel', mengde: d, pris, t: `Selg ${d} l diesel på svartebørsen (${kr(pris)})`, følge: 'Penger i kassa nå. Aggregatene og kjøretøyene har mindre å gå på.' }; }
    return null;
  }

  // ---------- DEN STORE BESLUTNINGEN (noen dager) ----------
  const erStorDag = (dag, sist) => dag >= REGLER.stor.første && (sist === null || sist === undefined || dag - sist >= REGLER.stor.hver);
  // s som over, pluss dieselPris (kr/l). sist = id-en på den forrige (kommer ikke to ganger på rad). hist = { id: dagen den sist kom } (RUNDE 13:
  // pausen per slag, REGLER.stor.pause; brytes når ingenting annet passer). Gir { id, tittel, tekst, valg } eller null.
  function storBeslutning(s, rng = tilf, sist = null, hist = null) {
    const R = REGLER, mulige = [];
    if (s.folk > 0) mulige.push({ id: 'nabo', tittel: 'Et nabogårdsfolk vil bli med', tekst: `${R.nabo.folk} fra en nabogård har gitt opp gården og vil slå seg sammen med dere. De har med seg litt mat, men de trenger senger og skal ha mat hver dag.`,
      valg: [{ id: 'alle', t: `Ta dem inn (folk +${R.nabo.folk}, mat +${R.nabo.mat})`, følge: `${R.nabo.folk} nye arbeidere i dag. Uten ledige senger faller moralen, og maten går fortere.` },
        { id: 'to', t: `Ta inn to av dem (folk +2, mat +${Math.round(R.nabo.mat / 2)})`, følge: 'To nye arbeidere. De andre går videre.' },
        { id: 'nei', t: 'Avvis dem', følge: `Ingen nye munner å mette. Noen synes det er hardt (moral ${R.nabo.avvistMoral}).` }] });
    if ((s.dieselPlass || 0) - (s.diesel || 0) >= 200) mulige.push({ id: 'tankbil', tittel: 'En forlatt tankbil', tekst: `En tankbil med diesel står forlatt ca. ${des(R.tankbil.avst[0] / 1000)}–${des(R.tankbil.avst[1] / 1000)} km fra leiren. Den kan være verdt ${R.tankbil.diesel[0]}–${R.tankbil.diesel[1]} liter – hvis ingen andre kommer først.`,
      valg: [{ id: 'lag', t: 'Send en tropp dit (oppdrag i kartet)', følge: `Tankbilen kommer i kartet. Kom dit med en tropp innen to døgn og ta dieselen. Det kan være røvere der (omtrent hver tredje gang).` },
        { id: 'fots', t: 'Send to til fots (borte et døgn)', følge: `To er borte i dag. I morgen har de kanskje med ${R.tankbil.fots.diesel[0]}–${R.tankbil.fots.diesel[1]} l – eller ingenting, og en kan være skadet.` },
        { id: 'nei', t: 'La den stå', følge: 'Ingen risiko, ingen diesel.' }] });
    const vernPris = R.vern.fast + R.vern.perBølge * (s.bølge || 0);
    if ((s.bølge || 0) >= 1 && s.røverTimer > 3 && s.penger >= vernPris) mulige.push({ id: 'vern', tittel: 'Røverne vil ha betalt', tekst: `En budbærer fra røverne: betal, så lar de dere være i fred et døgn lenger enn ellers. Neste bølge ventes om ca. ${Math.round(s.røverTimer)} timer.`,
      valg: [{ id: 'betal', t: `Betal ${kr(vernPris)}`, følge: `Neste bølge kommer ett døgn senere. Kassa går ned med ${kr(vernPris)}.`, pris: vernPris },
        { id: 'nei', t: 'Nekt', følge: `Folk liker at dere står imot (moral +${R.vern.nektMoral}). Røverne kommer som før.` }] });
    // dieselen i pakken: bare så mye som får plass i tankene (hele 50 l; under 50 l: bare mat)
    const dl = Math.max(0, Math.min(R.karavane.diesel, Math.floor(((s.dieselPlass || 0) - (s.diesel || 0)) / 50) * 50));
    const pakke = Math.round((dl * (s.dieselPris || 0) + R.karavane.mat * (s.matPris || 0)) * R.karavane.rabatt / 1e4) * 1e4, treSalg = Math.round(R.karavane.tre * (s.trePris || 0) * R.karavane.trePris / 1e3) * 1e3;
    const kv = [];
    // RUNDE 14 (kritiker I: «Kjøp 30 rasjoner … Dere har ikke plass til mer diesel»): følgen sier bare det som gjelder varen i knappen; at
    // tankene er fulle, står i karavanens tekst. Kritiker J: «kjøper tre», men ingen knapp – nå selges det treet dere har (minTre–tre m³),
    // og teksten sier «kjøper tre» bare når knappen finnes
    const har = Math.floor(s.lager && s.lager.tre || 0), tm = Math.min(R.karavane.tre, har), tp = Math.round(tm * (s.trePris || 0) * R.karavane.trePris / 1e3) * 1e3;
    if (s.penger >= pakke && pakke > 0) kv.push({ id: 'kjøp', t: dl ? `Kjøp ${dl} l diesel og ${R.karavane.mat} rasjoner (${kr(pakke)})` : `Kjøp ${R.karavane.mat} rasjoner (${kr(pakke)})`, følge: `Omtrent ${Math.round((1 - R.karavane.rabatt) * 100)} % billigere enn markedet.` + (dl && dl < R.karavane.diesel ? ` Bare ${dl} l får plass i tankene.` : ''), pris: pakke, diesel: dl });
    if (tm >= R.karavane.minTre && tp > 0) kv.push({ id: 'selg', t: `Selg ${tm} m³ tre (${kr(tp)})`, følge: `Bedre betalt enn på markedet (${Math.round((R.karavane.trePris - 1) * 100)} % mer).`, pris: tp, mengde: tm });
    const ktekst = 'En karavane med lastebiler har slått leir ved vegen i dag. ' + (kv.some(v => v.id === 'selg') ? 'De selger billig og kjøper tre.' : `De selger billig (de kjøper tre også, men dere har under ${R.karavane.minTre} m³).`)
      + (kv.some(v => v.id === 'kjøp') && !dl ? ' Dieseltankene er fulle, så dere kan bare kjøpe mat.' : '');
    if (kv.length) mulige.push({ id: 'karavane', tittel: 'En handelskaravane', tekst: ktekst, valg: kv.concat([{ id: 'nei', t: 'Ingen handel', følge: 'Karavanen drar videre i kveld.' }]) });
    // RUNDE 13: handelsmannen kommer kl. 14 og kjøper det dere legger av til ham (en avtale med tidsfrist)
    const H = R.handel, ht = Math.min(Math.floor(s.lager && s.lager.tre || 0), Math.round(mellom(rng, H.tre))), hd = Math.min(Math.floor((s.diesel || 0) / 50) * 50, Math.round(mellom(rng, H.diesel) / 50) * 50);
    const kl = `kl. ${String(6 + H.timer).padStart(2, '0')}`, hv = [];
    if (ht >= H.minTre && s.trePris > 0) { const pris = Math.round(ht * s.trePris * H.trePris / 1e4) * 1e4; hv.push({ id: 'tre', t: `Legg av ${ht} m³ tre til ham (${kr(pris)} ${kl})`, følge: `Han betaler ${Math.round((H.trePris - 1) * 100)} % mer enn markedet – men treet må ligge på lageret når han kommer ${kl}.`, mengde: ht, pris }); }
    if (hd >= H.minDiesel && s.dieselPris > 0) { const pris = Math.round(hd * s.dieselPris * H.dieselPris / 1e4) * 1e4; hv.push({ id: 'diesel', t: `Legg av ${hd} l diesel til ham (${kr(pris)} ${kl})`, følge: `Nesten markedspris – dieselen må stå på tanken når han kommer ${kl}.`, mengde: hd, pris }); }
    if (hv.length) mulige.push({ id: 'handel', tittel: `En handelsmann kommer ${kl}`, tekst: `En handelsmann med lastebil har sendt bud: han kommer innom leiren i dag ${kl} og kjøper det dere har lagt av til ham. Han venter ikke.`,
      valg: hv.concat([{ id: 'nei', t: 'Vi handler ikke med ham', følge: 'Han kjører forbi.' }]) });
    const valg = mulige.filter(m => m.id !== sist), P = R.stor.pause;
    const hvilt = hist && Number.isFinite(s.dag) ? valg.filter(m => !(Number.isFinite(hist[m.id]) && s.dag - hist[m.id] < (P[m.id] || 1))) : valg;
    const fra = hvilt.length ? hvilt : valg;
    return fra.length ? fra[Math.floor(rng() * fra.length)] : null;
  }

  // ---------- HVORDAN DET GIKK (regnes neste morgen) ----------
  // p: { id ('jakt' | 'leie' | 'speid' | 'tankbil'), folk: [{ navn, ferd: { hogst } }] }, o: { årstid, røverTimer }. Gir { mat, penger, diesel,
  // tre, stål, skadet: [navn], borte: [navn] (kom ikke tilbake), tekst }.
  function utfall(p, o = {}, rng = tilf) {
    const R = REGLER, u = { mat: 0, penger: 0, diesel: 0, tre: 0, stål: 0, erf: 0, skadet: [], borte: [], helse: 0 }, f = p.folk || [], navn = f.map(q => q.navn.split(' ')[0]), hvem = () => f[Math.floor(rng() * f.length)];
    const og = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a[0] || 'De');
    if (p.id === 'jakt') { const å = R.jakt.årstid[o.årstid] || 1; u.mat = Math.round(f.reduce((s, q) => s + mellom(rng, R.jakt.per) * klem((q.ferd && q.ferd.hogst) || 1, .7, 1.45), 0) * å);
      if (f.length && rng() < R.jakt.skade) { u.skadet.push(hvem().navn); u.helse = R.jakt.helse; }
      u.tekst = `${og(navn)} kom hjem fra jakt og fiske med ${u.mat} rasjoner.` + (u.skadet.length ? ` ${u.skadet[0].split(' ')[0]} skadet seg på turen.` : ''); }
    else if (p.id === 'leie') { const ikke = f.length && rng() < R.leie.borte, sår = !ikke && f.length && rng() < R.leie.såret; u.penger = Math.round(mellom(rng, R.leie.penger) / 1e5) * 1e5;
      if (ikke) { u.borte.push(hvem().navn); u.tekst = `Nabogården betalte ${kr(u.penger)}, men ${u.borte[0]} kom ikke tilbake fra vaktoppdraget.`; }
      else if (sår) { u.skadet.push(hvem().navn); u.helse = R.leie.helse; u.tekst = `Nabogården betalte ${kr(u.penger)}. ${u.skadet[0].split(' ')[0]} ble såret i et basketak og må hvile.`; }
      else u.tekst = `${og(navn)} holdt vakt for nabogården og kom hjem med ${kr(u.penger)}.`; }
    else if (p.id === 'speid') { u.tre = Math.round(mellom(rng, R.speid.tre) * 10) / 10; u.stål = Math.round(mellom(rng, R.speid.stål) * 10) / 10; u.mat = Math.round(mellom(rng, R.speid.mat));
      const SF = p.fiende ? R.speidFiende : null;
      if (SF && f.length > 1 && rng() < SF.borte) u.borte.push(hvem().navn);
      if (f.length && rng() < (SF ? SF.skade : R.speid.skade)) { const q = hvem(); if (!u.borte.includes(q.navn)) { u.skadet.push(q.navn); u.helse = R.speid.helse; } }
      const røv = o.røverTimer === null || o.røverTimer === undefined ? 'De så ingen tegn til røverne.' : o.røverTimer <= 0 ? 'Røverne er alt på vei mot leiren.' : `De så røverne samle seg: de drar ut mot leiren om ca. ${Math.max(1, Math.round(o.røverTimer))} ${Math.max(1, Math.round(o.røverTimer)) === 1 ? 'time' : 'timer'}.`;
      u.tekst = `Speiderne er tilbake fra ${p.sted || 'turen'}. ${røv} De fant ${u.mat} rasjoner, ${des(u.tre)} m³ tre` + (u.stål > 0 ? ` og ${des(u.stål)} t stål.` : '.') + (u.skadet.length ? ` ${u.skadet[0].split(' ')[0]} ${SF ? 'ble skadet i et sammenstøt med fienden' : 'vrikket foten'}.` : '')
        + (p.fiendeTekst ? ' ' + p.fiendeTekst : '') + (u.borte.length ? ` ${u.borte[0].split(' ')[0]} ble tatt av fienden og kom ikke tilbake.` : ''); }
    else if (p.id === 'øv') { u.erf = R.øv.erf; if (f.length && rng() < R.øv.skade) { u.skadet.push(hvem().navn); u.helse = R.øv.helse; }
      u.tekst = `${og(navn)} øvde med våpen hele dagen og er mer erfarne nå.` + (u.skadet.length ? ` ${u.skadet[0].split(' ')[0]} fikk en smell og må ta det rolig.` : ''); }
    else if (p.id === 'tankbil') { const T = R.tankbil.fots; if (rng() < T.lykkes) { u.diesel = Math.round(mellom(rng, T.diesel) / 10) * 10; u.tekst = `${og(navn)} fant tankbilen og bar hjem ${u.diesel} l diesel i kanner.`; }
      else u.tekst = `${og(navn)} fant tankbilen, men noen hadde tømt den før dem.`;
      if (f.length && rng() < T.skade) { u.skadet.push(hvem().navn); u.helse = T.helse; u.tekst += ` ${u.skadet[0].split(' ')[0]} skadet seg på vegen.`; } }
    else u.tekst = '';
    return u;
  }

  // ---------- HVEM SOM GÅR ----------
  // personer: [{ id, oppgave, helse, karantene, borte, ferd }]. Gir id-ene til n arbeidsføre, helst de frie, ellers de beste på «ferd»
  // fra oppgavene med flest folk (aldri den siste på en oppgave som bare har én).
  function velgFolk(personer, n, ferd, unntatt = []) {
    const tall = {}; for (const p of personer) tall[p.oppgave] = (tall[p.oppgave] || 0) + 1;
    const ok = personer.filter(p => p.helse >= .4 && !p.karantene && !p.borte && !unntatt.includes(p.id) && !p.karakter && (p.oppgave === 'fri' || tall[p.oppgave] > 1));
    const rang = p => (p.oppgave === 'fri' ? 100 : 0) + (tall[p.oppgave] || 0) * 2 + ((p.ferd && p.ferd[ferd]) || 1);
    return ok.sort((a, b) => rang(b) - rang(a)).slice(0, n).map(p => p.id);
  }

  // ---------- RUNDE 13: NY DAG, OG TAP I LAGENE ----------
  // Kritiker H: etter omlasting kl. 05:59 kom et møte for gårsdagen, og over 06:00 kom dagens møte en gang til med nye valg. Årsaken: spillet
  // lagrer klokka litt etter litt, så etter omlasting kan klokka stå et par minutter FØR møtet som alt er holdt. Et møte holdes bare når
  // dagen er NYERE enn den siste som er holdt – aldri samme dag to ganger, og aldri bakover.
  const nyDag = (d, sist) => Number.isFinite(d) && !(Number.isFinite(sist) && d <= sist);
  // tap: [{ navn, lag, hva: 'falt' | 'såret', fører }] siden forrige morgen (samme person flere ganger: det siste gjelder, falt går foran).
  // Gir «Tap i lagene: Vaktlaget: Oddvar Aasen falt, Kari Lund (lagfører) ble såret.» eller null.
  function tapTekst(tap) {
    if (!Array.isArray(tap) || !tap.length) return null;
    const per = new Map();
    for (const t of tap) { if (!t || !t.navn) continue; const k = (t.lag || '') + '|' + t.navn, f = per.get(k); if (f && f.hva === 'falt' && t.hva !== 'falt') continue; per.set(k, t); }
    const lag = new Map(); for (const t of per.values()) { const l = t.lag || 'et lag'; if (!lag.has(l)) lag.set(l, { falt: [], såret: [] }); lag.get(l)[t.hva === 'falt' ? 'falt' : 'såret'].push(t.navn + (t.fører ? ' (lagfører)' : '')); }
    const og = a => (a.length > 4 ? a.slice(0, 3).join(', ') + ` og ${a.length - 3} til` : a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a[0]);
    const deler = [...lag].map(([l, v]) => `${l}: ` + [v.falt.length ? `${og(v.falt)} falt` : '', v.såret.length ? `${og(v.såret)} ble såret` : ''].filter(Boolean).join(', '));
    return deler.length ? 'Tap i lagene: ' + deler.join('. ') + '.' : null;
  }

  // ---------- KORT TEKST om valget som ble tatt ----------
  const VALGT = { jakt: 'to på jakt og fiske', kjøp: 'kjøpte mat', rasjon: 'halve rasjoner', vakt: 'dobbel vakt', selg: 'solgte tre', post: 'tok røverposten', leie: 'leide ut to som vakter',
    speid: 'speidertur', forsvar: 'forsvarte leiren', krise: 'fikk krisehjelp', leiesold: 'kjøpte leiesoldater', vaktlag: 'laget et vaktlag', rekrutt: 'rekrutterte fra nabogården', øv: 'våpenøvelse', fri: 'fridag', skift: 'ekstra skift', svart: 'solgte på svartebørsen', ingen: 'ingen endring' };

  const api = { REGLER, dagensValg, svartTilbud, erStorDag, storBeslutning, tapTekst, nyDag, utfall, velgFolk, VALGT, kr, des };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Morgen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
