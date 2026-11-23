/* FORLATTE STEDER (R18-F, 23. nov – brukeren likte hvordan Silent Hill «har gjort det generelt bra med atmosfæren og en god stemning» og
 * valgte «forlatte steder»). Bare stemningen er inspirasjon: ingen navn, figurer, monstre, symboler eller utseende derfra, og ingenting
 * overnaturlig. Norge har kollapset (Kronekrakket, Grålungen); husene forteller stille hva som skjedde der da folk dro.
 * Regler uten DOM (Node: require('./spor'); nettleser: globalThis.Spor). Visningen: spill/spor-visning.js. Test: pipeline/fliser/test_spor.js.
 *  - historie(kl, i): hva som skjedde i bygget (karantene, flukt, barrikade, venting, plyndret, stille …) og hvilke spor det har
 *    (karantenelapp på døra, barnetegning, halvpakket koffert, planker for bakdøra, seng i stua, tomme matskap, kalender, brev på bordet).
 *  - lapp(kl, i): en lapp du kan lese (LAPPER, 48 stykk sortert etter byggtype og tema) – eller null. Noen peker videre (peker: 'gjemt').
 *  - dato(i): datoen kalenderen stoppet på (de fleste i de samme ukene på senvinteren).
 *  - gate(veger, opt): forlatte biler med åpne dører, barrikader av møbler, håndmalte skilt i tettstedene (fast per sted, med måte).
 *  - plater(P, i): vinduer med plater på husene i tettstedene.
 *  - lydInne(kl, i), lydUte: hva du hører inne i et forlatt hus og ute i et tomt tettsted (spill/lyd.js bruker det).
 * Samme bygg og samme sted gir alltid det samme (fast hash, ingen Math.random). Alle tall er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // tallene under er Claudes forslag
  const REGLER = {
    // sjansen for at et bygg har en lapp du kan lese, per gruppe
    lapp: { bolig: .32, skole: .55, sykehus: .6, butikk: .45, kirke: .6, kontor: .35, gård: .3, annet: .2 },
    // tettstedene: forlatt bil per prøvepunkt (hver 55. m langs vegen), barrikade, skilt; og høyst så mange per utsnitt [PC, mobil]
    gate: { steg: 55, bil: .065, barrikade: .035, skilt: .05, minBil: 70, minBarrikade: 220, minSkilt: 120, tak: { bil: [14, 6], barrikade: [4, 2], skilt: [7, 3], plate: [110, 45] } },
    // andelen hus i tettsted som har plater for vinduene, og høyst så mange plater per hus
    plater: { andel: .13, maks: 3 },
    // lyd inne: andelen hus med tikkende klokke, dryppende rør, knust vindu (vinden uler i glipa); knirk hvert 18–55 s
    lyd: { klokke: .35, drypp: .4, glipe: .3, knirk: [18, 55], hund: [45, 130], dør: [60, 170], dørVind: 4 },
  };
  const GRUPPE = { hus: 'bolig', leil: 'bolig', hytte: 'bolig', skole: 'skole', sykehus: 'sykehus', butikk: 'butikk', kirke: 'kirke', kontor: 'kontor', terminal: 'kontor',
    låve: 'gård', uthus: 'gård', industri: 'annet', lager: 'annet', hangar: 'annet' };
  const gruppe = kl => GRUPPE[kl] || 'annet';

  // HISTORIENE: [navn, vekt, sporene]. Sporene: karantene (lapp på døra), tegning (barnetegning), koffert (halvpakket), barrikade
  // (planker for en dør innenfra / stolene stablet ved døra), sykeseng (sengen i stua), skap (tomme matskap, dørene står åpne),
  // kalender, brev (på bordet), madrasser (folk har sovet på gulvet), lys (stearinlys), papir (papirhauger), sperrebånd, kurver.
  const HISTORIER = {
    bolig: [['karantene', 18, ['karantene', 'sykeseng', 'kalender', 'skap']], ['flukt', 26, ['koffert', 'skap', 'kalender', 'brev']], ['barrikade', 12, ['barrikade', 'madrasser', 'skap']],
      ['venting', 16, ['tegning', 'brev', 'kalender']], ['syk', 12, ['sykeseng', 'tegning', 'kalender']], ['plyndret', 10, ['skap', 'papir']], ['stille', 22, ['kalender']]],
    skole: [['nødsenter', 40, ['madrasser', 'karantene', 'tegning']], ['stengt', 60, ['tegning', 'kalender', 'karantene']]],
    sykehus: [['overfylt', 55, ['madrasser', 'sperrebånd', 'karantene']], ['evakuert', 45, ['sperrebånd', 'papir', 'kalender']]],
    butikk: [['plyndret', 55, ['kurver', 'karantene']], ['rasjonert', 45, ['kurver', 'karantene']]],
    kirke: [['tilflukt', 60, ['madrasser', 'lys']], ['minne', 40, ['lys']]],
    kontor: [['kriseledelse', 45, ['papir', 'kalender']], ['arkiv', 55, ['papir', 'kalender']]],
    gård: [['flukt', 50, ['kalender']], ['stille', 50, []]],
    annet: [['stille', 100, []]],
  };
  function historie(kl, i) {
    const g = gruppe(kl), L = HISTORIER[g], sum = L.reduce((a, h) => a + h[1], 0); let x = hash(i, 901) * sum, valgt = L[L.length - 1];
    for (const h of L) { if (x < h[1]) { valgt = h; break; } x -= h[1]; }
    const ting = {}; for (const t of valgt[2]) ting[t] = true;
    // noen spor tas bort igjen per bygg, så to hus med samme historie ikke er like (karantenelappen blir alltid)
    for (const [n, t] of valgt[2].entries()) if (t !== 'karantene' && n > 0 && hash(i, 920 + n) < .25) delete ting[t];
    return { gruppe: g, navn: valgt[0], ting };
  }

  // Datoen kalenderen stoppet på: de fleste i noen uker på senvinteren (da Grålungen kom og alt stengte), noen tidligere og noen senere.
  // Ingen årstall (spillet foregår på 2020-tallet uten faste årstall).
  const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'], DAGER = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function dato(i) {
    const a = hash(i, 931), b = hash(i, 932), dag0 = a < .7 ? 52 + Math.floor(b * 40) : a < .85 ? 10 + Math.floor(b * 42) : 92 + Math.floor(b * 120);
    let d = dag0, m = 0; while (m < 11 && d >= DAGER[m]) { d -= DAGER[m]; m++; } return { dag: d + 1, mnd: m, tekst: (d + 1) + '. ' + MND[m] };
  }

  // LAPPENE: [id, grupper, tema, tittel, tekst, peker]. Sober og troverdig, korte (1–4 setninger), uten ekte personnavn.
  // {sted} = nærmeste tettsted (kartnavnet), {dato} = datoen kalenderen i huset stoppet på. peker 'gjemt' = lappen sier hvor noe er gjemt.
  const LAPPER = [
    // boliger
    ['b1', 'bolig', 'karantene', 'Lapp på døra', 'KARANTENE. Bekreftet smitte i husstanden fra {dato}. Ikke gå inn. Mat kan settes på trappa.'],
    ['b2', 'bolig', 'karantene', 'Lapp på døra', 'Vi er friske nå. Vi har ventet i fire uker og ingen fra kommunen har kommet. Vi går til {sted}.'],
    ['b3', 'bolig', 'syk', 'Liste på kjøleskapet', 'Feber om morgenen 39,4, om kvelden 40,1. Hostesaften er tom. Spør naboen om de har mer.'],
    ['b4', 'bolig', 'syk', 'Brev på bordet', 'Pappa sover i stua så vi ikke skal bli smittet. Han sier det går bra. Vi får ikke gå inn dit.'],
    ['b5', 'bolig', 'flukt', 'Brev på bordet', 'Til den som kommer: Vi har tatt bilen sørover så langt dieselen rekker. Ta det du trenger, men vær så snill og lukk døra etter deg.'],
    ['b6', 'bolig', 'flukt', 'Handleliste', 'Vann, ris, batterier, medisin til mor, bensinkanna fra garasjen. Bankkortet virker ikke lenger, ta kontanter.'],
    ['b7', 'bolig', 'flukt', 'Lapp i gangen', 'Vi drar {dato}. Nøkkelen ligger der den pleier. Hvis du er en av oss: vi venter ved kirka i {sted} hver søndag.'],
    ['b8', 'bolig', 'venting', 'Barnetegning', 'Under tegningen står det med store bokstaver: «Når kommer mamma hjem fra jobb?»'],
    ['b9', 'bolig', 'venting', 'Brev på bordet', 'Jeg har ventet her i tre uker nå. Telefonen har ikke dekning lenger. Hvis du leser dette og har sett ham, si at jeg har gått til søsteren min.'],
    ['b10', 'bolig', 'barrikade', 'Lapp på innsiden av døra', 'Ikke åpne for noen. Ikke for noen. De sier de er fra kommunen, men de har ingen bil og ingen papirer.'],
    ['b11', 'bolig', 'barrikade', 'Dagbokside', 'Noen prøvde bakdøra i natt. Jeg har spikret den igjen med plankene fra boden. Vi har mat til en uke til.'],
    ['b12', 'bolig', 'plyndret', 'Lapp på kjøkkenbenken', 'Dere tok alt. Det var til barna. Håper dere vet det.'],
    ['b13', 'bolig', 'stille', 'Kalenderark', 'På dagen står det: «Tannlege 14.30». Neste uke: «Bursdag – kjøpe kake». Etter det står det ingenting.'],
    ['b14', 'bolig', 'stille', 'Brev fra banken', 'Kontoen din er midlertidig sperret. Uttak over 2 000 kr krever oppmøte. Vi beklager ulempen.'],
    ['b15', 'bolig', 'gjemt', 'Dagbokside', 'Vi har lagt resten av maten og dieselkanna i boden i det nærmeste huset mot vegen. Ingen leter der. Hvis vi ikke kommer tilbake, ta den.', 'gjemt'],
    ['b16', 'bolig', 'gjemt', 'Lapp under en kopp', 'Til bror: det er hermetikk og to kanner i uthuset hos naboen. Vi rakk ikke å ta det med.', 'gjemt'],
    ['b17', 'bolig', 'flukt', 'Lapp på speilet', 'Jeg er hos de andre i {sted}. Ta med ullteppene. Ikke kjør over fjellet, vegen er stengt.'],
    ['b18', 'bolig', 'syk', 'Resept', 'Tørrhoste og feber over tre døgn: hold deg hjemme. Apoteket er tomt for det du trenger. Prøv igjen neste uke.'],
    ['b19', 'bolig', 'venting', 'Lapp på kjøleskapet', 'Husk å vanne plantene. Vi er tilbake om to uker. Datoen er strøket over og skrevet på nytt to ganger.'],
    ['b20', 'bolig', 'karantene', 'Skriv fra helsetjenesten', 'Husstanden er satt i karantene til videre. Forlat ikke boligen. Matutdeling skjer tirsdager og fredager.'],
    // skoler
    ['s1', 'skole', 'stengt', 'Oppslag på døra', 'Skolen er stengt til videre. Elevene skal ikke møte. Følg med på kommunens sider for ny informasjon.'],
    ['s2', 'skole', 'stengt', 'Elevtekst', 'Mitt beste minne: Da vi hadde aktivitetsdag og alle fikk is. Jeg vil at det skal være skole igjen.'],
    ['s3', 'skole', 'nødsenter', 'Liste på tavla', 'Klasserom 2: 14 personer. Klasserom 3: 11. Gymsalen: full. Nye henvises til kirka.'],
    ['s4', 'skole', 'nødsenter', 'Vaktliste', 'Natt: to på vakt. Ingen slipper inn uten å vise hendene og ta tempen. Lommelyktene skal tilbake hit.'],
    ['s5', 'skole', 'stengt', 'Lapp i lærerrommet', 'Tok med meg kopimaskinpapiret. Det brenner godt. Beklager. Hilsen vaktmesteren.'],
    ['s6', 'skole', 'gjemt', 'Lapp i kateteret', 'Nødlageret fra kommunen er flyttet til bygget ved siden av, bak den låste døra. Nøkkelen henger på spikeren.', 'gjemt'],
    // sykehus og helsehus
    ['h1', 'sykehus', 'overfylt', 'Lapp i korridoren', 'Alle senger er fulle. Pasienter med pustebesvær legges i korridoren. Vi har ikke mer oksygen.'],
    ['h2', 'sykehus', 'overfylt', 'Vaktbok', 'Tre på jobb i natt. Skulle vært ni. Ingen avløsning siden mandag.'],
    ['h3', 'sykehus', 'evakuert', 'Oppslag', 'Avdelingen er flyttet. Pasienter som kan gå selv, følges til {sted}. De andre hentes når det kommer transport.'],
    ['h4', 'sykehus', 'evakuert', 'Brev til de pårørende', 'Vi har gjort det vi kunne. Navnelista er sendt videre. Spør etter den på rådhuset.'],
    ['h5', 'sykehus', 'gjemt', 'Lapp på medisinskapet', 'Det siste av antibiotikaen er satt i boden i nabobygget. Ikke si det til noen som ikke trenger det.', 'gjemt'],
    ['h6', 'sykehus', 'karantene', 'Skilt på døra', 'SMITTE. Kun personell med verneutstyr. Hold avstand.'],
    // butikker
    ['u1', 'butikk', 'rasjonert', 'Skilt ved kassa', 'Maks to av hver vare per kunde. Kun kontant. Vi har ikke fått levering siden {dato}.'],
    ['u2', 'butikk', 'plyndret', 'Lapp på døra', 'Butikken er tom. Det er ingenting igjen. Ikke knus flere ruter.'],
    ['u3', 'butikk', 'rasjonert', 'Lapp i vinduet', 'Brød kommer kanskje torsdag. Mel og gjær er slutt. Kom tidlig.'],
    ['u4', 'butikk', 'plyndret', 'Kvittering', 'En lang kvittering: 24 hermetikk, 10 kg ris, 18 liter vann. Betalt med kort, kl. 23.41. Det siste kjøpet på rullen.'],
    ['u5', 'butikk', 'gjemt', 'Lapp på lagerdøra', 'Restene av varene er flyttet til et bygg bak butikken. Til de ansatte: hent det før noen andre gjør.', 'gjemt'],
    // kirker
    ['k1', 'kirke', 'tilflukt', 'Liste ved døra', 'Her bor 23 personer. Vi deler det vi har. Alle som kommer i fred, er velkomne.'],
    ['k2', 'kirke', 'minne', 'Lapper ved lysene', 'Mange små lapper med bare et navn og en dato. Noen har skrevet: «Vi glemmer deg ikke.»'],
    ['k3', 'kirke', 'tilflukt', 'Kunngjøring', 'Søndag kl. 12: vi samles her og bestemmer om vi blir eller går til {sted}. Alle har en stemme.'],
    ['k4', 'kirke', 'minne', 'Brev på alteret', 'Klokkene har ikke ringt siden {dato}. Det er ingen her til å ringe dem.'],
    // kontorer og terminaler
    ['o1', 'kontor', 'kriseledelse', 'Notat', 'Kriseledelsen samles i kjelleren kl. 08. Strømmen går fra aggregatet i to timer om dagen. Telefonlinjene er nede.'],
    ['o2', 'kontor', 'arkiv', 'Utskrift', 'Kronen falt med 40 prosent på to dager. Bankene stengte uttak. Lønn utbetales ikke denne måneden.'],
    ['o3', 'kontor', 'kriseledelse', 'Tavle', 'Vann: kokes. Strøm: rasjonert. Diesel: kun nødetater. Politi: ingen kontakt siden {dato}.'],
    ['o4', 'kontor', 'arkiv', 'E-post skrevet ut', 'Hei, jeg kommer ikke på jobb i dag. Barna er syke og ingen kan passe dem. Jeg vet ikke når jeg kan komme igjen.'],
    // gårder og uthus
    ['g1', 'gård', 'flukt', 'Lapp på fjøsdøra', 'Dyrene er sluppet ut. Vi klarte ikke å fôre dem lenger. Den som finner dem, kan ta dem.'],
    ['g2', 'gård', 'stille', 'Notat på veggen', 'Slått på jordet nedenfor: ferdig. Potetene: ikke tatt opp. Traktoren står uten diesel.'],
    ['g3', 'gård', 'gjemt', 'Lapp i en støvel', 'Såkornet ligger i nabohuset nærmest vegen, under presenningen. Det er nok til neste år.', 'gjemt'],
    // annet (industri, lager, hangar)
    ['a1', 'annet', 'stille', 'Skiftplan', 'Siste skift: {dato}. Maskinene er slått av og stengt. Ingen skal være i hallen uten tillatelse.'],
    ['a2', 'annet', 'stille', 'Lapp på porten', 'Lageret er tomt. Det som var her, er hentet av Forsvaret. Ikke bryt opp porten.'],
  ].map(([id, g, tema, tittel, tekst, peker]) => ({ id, g, tema, tittel, tekst, peker: peker || null }));
  const PER_GRUPPE = {}; for (const l of LAPPER) (PER_GRUPPE[l.g] = PER_GRUPPE[l.g] || []).push(l);
  const finn = id => LAPPER.find(l => l.id === id) || null;

  // Lappen i bygget (eller null): helst en som passer historien; ellers en fra gruppen. Pekerlappene bare i 25 % av tilfellene de velges.
  function lapp(kl, i, h) {
    const g = gruppe(kl); if (hash(i, 941) >= (REGLER.lapp[g] || 0)) return null;
    h = h || historie(kl, i); const alle = PER_GRUPPE[g] || PER_GRUPPE.annet, passer = alle.filter(l => l.tema === h.navn && !l.peker);
    if (hash(i, 942) < .2) { const p = alle.filter(l => l.peker); if (p.length) return p[Math.floor(hash(i, 943) * p.length)]; }
    const L = passer.length && hash(i, 944) < .75 ? passer : alle.filter(l => !l.peker); return L[Math.floor(hash(i, 945) * L.length)] || null;
  }
  // Teksten med stedet og datoen satt inn
  const fyll = (l, i, sted) => l.tekst.replace(/\{sted\}/g, sted || 'byen').replace(/\{dato\}/g, dato(i).tekst);
  // Lappen ligger ute (på døra) når den er en karantenelapp eller et oppslag på døra
  const UTE = new Set(['Lapp på døra', 'Oppslag på døra', 'Skilt på døra', 'Lapp på porten', 'Lapp i vinduet', 'Lapp på fjøsdøra']), ute = l => !!l && UTE.has(l.tittel);

  // Hvilket bygg pekerlappen peker på: blant kandidatene [{ i, x, y, kl }] (ikke lappens eget), 30–600 m unna, et av de fire nærmeste
  // som er bolig, uthus, låve eller lager; null når ingen passer. Samme lapp gir samme bygg.
  function pekerMål(i, x, y, kandidater, ferdig) {
    const L = kandidater.filter(k => k.i !== i && !(ferdig && ferdig.has(k.i)) && /^(hus|hytte|uthus|låve|lager|leil|skole|sykehus|butikk)$/.test(k.kl))
      .map(k => [Math.hypot(k.x - x, k.y - y), k]).filter(([d]) => d >= 30 && d <= 600).sort((a, b) => a[0] - b[0]).slice(0, 4);
    return L.length ? L[Math.floor(hash(i, 951) * L.length)][1] : null;
  }
  // Det som ligger gjemt der lappen peker: litt mer enn et vanlig hus (Claudes forslag)
  function gjemt(i) { return { mat: 10 + Math.floor(hash(i, 961) * 18), diesel: hash(i, 962) < .6 ? 30 + Math.floor(hash(i, 963) * 70) : 0, tre: 0, betong: 0, stål: 0, penger: 0, tomt: false }; }

  // ---------- TETTSTEDENE ----------
  // veger: [{ k, by, w, P: [[x, y, z]…] }] (u.veger fra liv3d.js), opt: { cx, cy, ok(x, y), mobil, sted(x, y) -> navn }.
  // Gir { bil: [x, y, z, retning, dør (1 venstre, -1 høyre), farge], barrikade: [x, y, z, retning, bredde], skilt: [x, y, z, retning, tekstnr] }.
  // Plassen kommer fra kartets meter (cx + x), så samme sted gir det samme uansett utsnitt.
  const SKILT = ['VANN HER ↓', 'IKKE GÅ INN – SMITTE', 'VI HAR DRATT TIL {sted}', 'INGEN MAT IGJEN', 'STENGT', 'SJEKK NABOEN', 'HJELP I KIRKA', 'IKKE DRIKK VANNET', 'SAKTE – BARN', 'VI KOMMER TILBAKE'];
  function gate(veger, opt) {
    const G = REGLER.gate, ut = { bil: [], barrikade: [], skilt: [] }, mob = opt.mobil ? 1 : 0, ok = opt.ok || (() => true), cx = opt.cx || 0, cy = opt.cy || 0;
    const nær = (L, n, x, y, d) => { for (let q = 0; q < L.length; q += n) if (Math.hypot(L[q] - x, L[q + 1] - y) < d) return true; return false; };
    for (const v of veger) { if (!v.by || v.g || !v.P || v.P.length < 2 || !/^[ERFK]$/.test(v.k)) continue; let igjen = G.steg * .5;
      for (let s = 0; s < v.P.length - 1; s++) { const a = v.P[s], b = v.P[s + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .01) continue; const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, ret = Math.atan2(ey, ex);
        for (let t = igjen; t < L; t += G.steg) { const x = a[0] + ex * t, y = a[1] + ey * t, z = a[2] + (b[2] - a[2]) * t / L, X = Math.round(x + cx), Y = Math.round(y + cy), h = hash(X * 7 + 13, Y * 3 + 7);
          if (h < G.bil && ut.bil.length / 6 < G.tak.bil[mob]) { const side = hash(X, Y + 5) < .5 ? 1 : -1, off = v.w * (.35 + hash(X + 3, Y) * .35) * side, bx = x - ey * off, by = y + ex * off;
            if (!nær(ut.bil, 6, bx, by, G.minBil)) ut.bil.push(bx, by, z, ret + (hash(X, Y + 9) - .5) * .7 + (hash(X + 1, Y) < .5 ? 0 : Math.PI), hash(X + 2, Y + 2) < .5 ? 1 : -1, Math.floor(hash(X + 4, Y + 4) * 8)); }
          else if (h > 1 - G.barrikade && v.k === 'K' && ut.barrikade.length / 5 < G.tak.barrikade[mob] && !nær(ut.barrikade, 5, x, y, G.minBarrikade)) ut.barrikade.push(x, y, z, ret + Math.PI / 2, Math.min(7, v.w * 1.5 + 1));
          else if (h > .5 && h < .5 + G.skilt && ut.skilt.length / 5 < G.tak.skilt[mob]) { const side = hash(X + 7, Y) < .5 ? 1 : -1, off = (v.w + 1.6) * side, sx = x - ey * off, sy = y + ex * off;
            if (ok(sx, sy) && !nær(ut.skilt, 5, sx, sy, G.minSkilt)) ut.skilt.push(sx, sy, z, ret + (side > 0 ? 0 : Math.PI), Math.floor(hash(X + 11, Y + 3) * SKILT.length)); } }
        igjen = ((igjen - L) % G.steg + G.steg) % G.steg; } }
    return ut;
  }
  const skiltTekst = (n, sted) => SKILT[n % SKILT.length].replace('{sted}', (sted || 'BYEN').toUpperCase());

  // Plater for vinduene på et hus (omrisset P i utsnittets meter, i = byggets nummer): [x, y, retning ut, bredde] per plate (høyst REGLER.plater.maks),
  // på vegger som er minst 3 m; [] for de fleste hus.
  function plater(P, i) {
    if (hash(i, 971) >= REGLER.plater.andel || !P || P.length < 3) return [];
    let A = 0; for (let q = 0; q < P.length; q++) { const a = P[q], b = P[(q + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } const mot = A > 0 ? 1 : -1, ut = [];
    const n = 1 + Math.floor(hash(i, 972) * REGLER.plater.maks);
    for (let q = 0; q < P.length && ut.length < n; q++) { const k = (q + Math.floor(hash(i, 973) * P.length)) % P.length, a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 3) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, t = L * (.3 + hash(i, 974 + q) * .4);
      // normalen ut av huset (omrisset mot klokka: ut = (ey, −ex))
      ut.push(a[0] + ex * t, a[1] + ey * t, Math.atan2(-ex * mot, ey * mot), 1 + hash(i, 980 + q) * .4); }
    return ut;
  }

  // ---------- LYD ----------
  // Hva du hører inne i et forlatt hus: en klokke som fortsatt tikker (batteri), et dryppende rør (bad/kjøkken), vind i et knust vindu
  function lydInne(kl, i) { const L = REGLER.lyd, bolig = /^(hus|leil|hytte|kontor|skole|sykehus)$/.test(kl);
    return { klokke: bolig && hash(i, 991) < L.klokke, drypp: kl !== 'kirke' && kl !== 'låve' && hash(i, 992) < L.drypp, glipe: hash(i, 993) < L.glipe, knirk: L.knirk }; }

  const api = { REGLER, GRUPPE, gruppe, HISTORIER, historie, dato, LAPPER, finn, lapp, fyll, ute, pekerMål, gjemt, SKILT, gate, skiltTekst, plater, lydInne, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Spor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
