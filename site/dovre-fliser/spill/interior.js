/* Interiør: regler uten DOM (Node: require('./interior'); nettleser: globalThis.Interior).
 * Brukeren 15. nov: «Alle bygg skal ha interiør, og en skal kunne gå inn i dem.»
 * plan(P, info) lager romplanen for ett bygg: P = omrisset (mot klokka, meter), info = { i (byggets nummer = frø), kl (klassen fra
 * hus3d: hus, hytte, leil, kontor, skole, sykehus, butikk, industri, lager, låve, uthus, kirke, hangar, terminal), h (høyde),
 * dør: { x, y, ux, uy, w } (midt i døra på ytterveggen, veggens retning, bredde) }. Samme bygg gir alltid samme plan.
 * Valgfritt i info (brukes når dataene har det, ellers gjettes det): år (byggeår), am (OSM amenity, f.eks. nursing_home), navn,
 * industri (OSM industrial/craft), tett (antall bygg innen 100 m), moh (høyden over havet), k (kjeden).
 *
 * RUNDE 15 (21. nov, brukeren: rar takhøyde, «gang først, ikke rett inn på et soverom», flere innganger, eldre og moderne bygg,
 * riktig interiør per type, «systemer for framtiden»). Planen lages nå av TABELLER, ikke av kode per type:
 *  - TYPER: per klasse – planform (korridor/hall/bsp), takhøyde, stil, rom, innganger og varianter (fjøs, sag, sykehjem …).
 *  - ROMSETT: hvilke rom en type trenger og i hvilken rekkefølge de velges (størst, ved et annet rom, nær inngangen, resten).
 *  - TILGANG: hvilke rom et rom kan ha dør til (soverom og bad bare fra gang eller stue), og ALDRI_VED_DØR.
 *  - MØBELSETT: møblene per romtype som oppskrifter (vegg, rad, rutenett, midt, foran) – en ny romtype trenger bare en linje her.
 *  - STILER: eldre (mange små rom), nyere (stue og kjøkken uten vegg mellom), moderne (åpent mot gangen, større vinduer).
 * Se docs/natt/inne.md for hvordan en ny type legges til. Alle tallene er Claudes forslag.
 * (28. nov, ut8-industri) spill/industri.js kobler seg på (Industri.koble): klassene «industri» og «lager» velger romsett etter
 *   industritypen (info.ind fra husdataene, ellers anslått fra omgivelsene) – maskinene og oppskriftene legges inn i MØBLER/MØBELSETT/ROMSETT.
 * blokkert(plan, x, y) er kollisjonen når du går: yttervegger (unntatt inngangene), skillevegger og store møbler.
 * Bare første etasje.
 */
(function (rot) {
  'use strict';
  const VEGG = .12;      // halv veggtykkelse for kollisjon (m)
  const DØRÅPNING = .95; // bredden på åpningene i skilleveggene
  // per klasse: største rom (m²) før det deles, minste romside (m), takhøyde (grunnverdi; se TYPER.tak), hall = ingen romdeling
  // (bakrom = andel av lengden som skilles ut i enden lengst fra inngangen). Beholdt for andre moduler og for den gamle delingen.
  const KLASSE = {
    hus: { maks: 16, min: 2.4, tak: 2.5 }, hytte: { maks: 14, min: 2.2, tak: 2.4 }, leil: { maks: 20, min: 2.6, tak: 2.6 },
    kontor: { maks: 22, min: 2.8, tak: 3.1 }, skole: { maks: 55, min: 4.5, tak: 3.2 }, sykehus: { maks: 24, min: 3, tak: 3 },
    butikk: { hall: true, bakrom: .2, tak: 3.6 }, industri: { hall: true, bakrom: .18, tak: 0 }, lager: { hall: true, bakrom: .12, tak: 0 },
    låve: { hall: true, tak: 0 }, uthus: { hall: true, tak: 2.5 }, kirke: { hall: true, bakrom: .1, tak: 0 }, hangar: { hall: true, tak: 0 },
    terminal: { hall: true, bakrom: .15, tak: 0 },
    // byggene i spillerens egen leir (spill/interior3d.js LEIRBYGG) – ikke bygg fra kartet
    brakke: { hall: true, tak: 2.5, leir: true }, kontrollrom: { hall: true, tak: 2.6, leir: true }, storkjøkken: { hall: true, tak: 2.5, leir: true }, drivhus: { hall: true, tak: 2.3, leir: true },
  };

  // ---------- TABELLENE (Claudes forslag) ----------
  // Takhøyden (brukeren 21. nov): boliger ca. 2,4–2,7 m, butikker og kontorer 3–4 m, full høyde i haller, låver, kirker og industri,
  // aldri over veggtoppen og aldri under TAK_MIN. 'full' = opp til taket (høyst TAK_FULL_MAKS). Stilen velger hvor i spennet.
  // største romdybde fra korridoren før bygget deles i flere skiver med hver sin korridor (m)
  const DYP = 7.5;
  const TAK_MIN = 2.2, TAK_FULL_MAKS = 14, TAK_LUFT = .06, TAK_FLATT = .35;
  // Stilene: [gangbredde-faktor, rombredde-faktor, hvor i takspennet (0–1), vindusbredde (m), vinduets underkant (m)]
  const STILER = {
    eldre: { gang: .9, rom: .9, tak: .15, vindu: 1.0, vinduNed: .95, åpen: 0 },
    nyere: { gang: 1, rom: 1, tak: .45, vindu: 1.4, vinduNed: .8, åpen: 1 },
    moderne: { gang: 1.15, rom: 1.15, tak: .9, vindu: 2.1, vinduNed: .45, åpen: 2 },
  };
  // åpen: 0 = vegger og dører mellom alle rom, 1 = ingen vegg mellom stue og kjøkken, 2 = stue/kjøkken også åpne mot gangen.
  // Byggeår (når dataene får det): før ÅR[0] eldre, før ÅR[1] nyere, ellers moderne.
  const ÅR = [1965, 2005];
  const TYPER = {
    hus: { plan: 'korridor', gang: 1.25, minRom: 2.4, romB: 3.3, vindfang: 1.9, tak: [2.4, 2.7], stil: [.4, .4, .2], romsett: 'bolig', inn: { bak: 110 } },
    leil: { plan: 'korridor', gang: 1.4, minRom: 2.6, romB: 3.5, vindfang: 2.2, tak: [2.45, 2.7], stil: [.35, .4, .25], romsett: 'bolig', inn: { bak: 140, nød: 500 } },
    hytte: { plan: 'bsp', tak: [2.3, 2.5], stil: [.6, .3, .1], romsett: 'bolig', inn: {} },
    kontor: { plan: 'korridor', gang: 1.9, minRom: 2.8, romB: 3.2, vindfang: 3, tak: [3, 3.5], stil: [.25, .4, .35], romsett: 'kontor', inn: { bak: 150, nød: 400 } },
    skole: { plan: 'korridor', gang: 2.6, minRom: 5, romB: 7.5, dyp: 9, vindfang: 4, tak: [3, 3.5], stil: [.35, .4, .25], romsett: 'skole', inn: { bak: 150, nød: 300 } },
    sykehus: { plan: 'korridor', gang: 2.3, minRom: 3, romB: 3.6, vindfang: 4, tak: [2.8, 3.3], stil: [.3, .45, .25], romsett: 'sykehus', inn: { bak: 150, nød: 400 },
      // helse: eldrehjem/sykehjem («vanlige bygg»), legevakt og sykehus. am fra OSM går foran; ellers etter størrelse og høyde.
      variant: info => /nursing|social_facility|eldre|sykehjem/.test(info.am || info.navn || '') ? 'sykehjem' : /clinic|doctors|legevakt|helsesenter/.test(info.am || info.navn || '') ? 'legevakt'
        : /hospital|sykehus/.test(info.am || '') ? 'sykehus' : info.areal < 500 ? 'legevakt' : (info.h || 9) <= 13 && info.areal < 4000 ? 'sykehjem' : 'sykehus',
      varianter: { sykehjem: { romsett: 'sykehjem', tak: [2.6, 2.9], romB: 3.8 }, legevakt: { romsett: 'legevakt', tak: [2.7, 3], vindfang: 4.5 }, sykehus: { romsett: 'sykehus' } } },
    butikk: { plan: 'hall', bakrom: .2, tak: [3.2, 4], stil: [.2, .4, .4], romsett: 'butikk', inn: { vare: 60, nød: 350 } },
    industri: { plan: 'hall', bakrom: .18, tak: 'full', stil: [.4, .4, .2], romsett: 'industri', inn: { vare: 0, nød: 300 },
      // treindustri, metall/stål eller olje og gass: OSM-merket eller navnet går foran, ellers sted og hash (fast per bygg)
      variant: (info, f) => { const t = ((info.industri || '') + ' ' + (info.navn || '')).toLowerCase();
        if (/sag|sawmill|tre|wood|trelast|snekker|carpenter|timber/.test(t)) return 'tre';
        if (/olje|oil|gass|gas|petro|raffin|refinery|fuel/.test(t)) return 'olje';
        if (/mek|metal|stål|steel|sveis|weld|smie|blacksmith|verft|shipyard/.test(t)) return 'metall';
        const olje = (info.moh !== undefined && info.moh < 25 && info.areal > 600 ? .25 : .08), tre = (info.tett || 0) < 10 ? .5 : .3;
        return f < olje ? 'olje' : f < olje + tre ? 'tre' : 'metall'; },
      varianter: { tre: { romsett: 'sag' }, metall: { romsett: 'metall' }, olje: { romsett: 'olje' } } },
    lager: { plan: 'hall', bakrom: .12, tak: 'full', stil: [.4, .4, .2], romsett: 'lager', inn: { vare: 0, nød: 400 } },
    // låven/driftsbygningen: fjøs nede (høyloftet legger spill/lave3d.js oppå), melkerommet foran når døra er i enden
    låve: { plan: 'hall', forrom: 3.2, tak: 'full', stil: [.6, .3, .1], romsett: 'fjøs', inn: { bak: 100 } },
    uthus: { plan: 'hall', tak: [2.3, 3.4], stil: [.5, .4, .1], romsett: 'uthus', inn: {} },
    kirke: { plan: 'hall', bakrom: .1, tak: 'full', stil: [.7, .2, .1], romsett: 'kirke', inn: { bak: 150 } },
    hangar: { plan: 'hall', tak: 'full', stil: [.3, .4, .3], romsett: 'hangar', inn: { bak: 150, nød: 400 } },
    terminal: { plan: 'hall', bakrom: .15, tak: 'full', stil: [.1, .4, .5], romsett: 'terminal', inn: { bak: 100, nød: 400 } },
  };
  // Rommene en type trenger, i den rekkefølgen de velges. inngang = rollen til rommet døra går inn i (eller gangen/korridoren).
  // velg: 'størst' | 'minst' | 'nær' (nærmest inngangen) | 'ved:<rolle>' (vegg i vegg med) | 'rest' (alle som er igjen). min = minste areal,
  // ellers = rollen når rommet er for lite. hver = én til per så mange rom (f.eks. et vaktrom per åtte beboerrom).
  const ROMSETT = {
    bolig: { inngang: 'vindfang', gang: 'gang', rom: [{ rolle: 'stue', velg: 'størst' }, { rolle: 'kjøkken', velg: 'ved:stue' }, { rolle: 'bad', velg: 'minst', min: 3 },
      { rolle: 'vaskerom', velg: 'minst', min: 3, fraRom: 7 }, { rolle: 'soverom', velg: 'rest', min: 5.5, ellers: 'bod' }] },
    kontor: { inngang: 'resepsjon', gang: 'korridor', rom: [{ rolle: 'møterom', velg: 'størst' }, { rolle: 'pauserom', velg: 'minst', min: 6, fraRom: 4 }, { rolle: 'kontor', velg: 'rest', min: 5, ellers: 'arkiv' }] },
    skole: { inngang: 'gang', gang: 'korridor', rom: [{ rolle: 'lærerrom', velg: 'nær' }, { rolle: 'kontor', velg: 'minst', min: 8, fraRom: 4 }, { rolle: 'klasserom', velg: 'rest', min: 28, ellers: 'grupperom' }] },
    sykehjem: { inngang: 'vindfang', gang: 'korridor', rom: [{ rolle: 'dagligstue', velg: 'størst' }, { rolle: 'kjøkken', velg: 'ved:dagligstue' }, { rolle: 'vaktrom', velg: 'nær' },
      { rolle: 'bad', velg: 'minst', min: 4, fraRom: 8 }, { rolle: 'beboerrom', velg: 'rest', min: 9, ellers: 'bod' }] },
    legevakt: { inngang: 'venterom', gang: 'korridor', rom: [{ rolle: 'vaktrom', velg: 'nær' }, { rolle: 'bad', velg: 'minst', min: 3, fraRom: 4 }, { rolle: 'behandlingsrom', velg: 'rest', min: 7, ellers: 'bod' }] },
    sykehus: { inngang: 'resepsjon', gang: 'korridor', rom: [{ rolle: 'vaktrom', velg: 'nær', hver: 8 }, { rolle: 'sykerom', velg: 'rest', min: 8, ellers: 'bod' }] },
    // hallene: hovedrommet og bakrommet (lageret bak i butikken, kontrollrommet i olje, sakristiet i kirken)
    butikk: { hall: 'butikk', bak: 'lager' }, industri: { hall: 'verksted', bak: 'lager' }, sag: { hall: 'sag', bak: 'tørkeloft' }, metall: { hall: 'maskinhall', bak: 'lager' },
    olje: { hall: 'prosesshall', bak: 'kontrollrom_olje' }, lager: { hall: 'lagerhall', bak: 'kontor' }, fjøs: { hall: 'fjøs', for: 'melkerom' }, uthus: { hall: 'uthus' },
    kirke: { hall: 'kirke', bak: 'sakristi' }, hangar: { hall: 'hangar' }, terminal: { hall: 'terminal', bak: 'kontor' },
  };
  // Hvem et rom kan ha dør til (brukeren: soverom og bad går ut fra gang eller stue). Og rom som aldri skal ha ytterdøra.
  const TILGANG = { soverom: ['gang', 'korridor', 'stue', 'allrom', 'vindfang'], bad: ['gang', 'korridor', 'stue', 'allrom', 'vindfang', 'soverom'], beboerrom: ['korridor', 'gang'], sykerom: ['korridor', 'gang', 'resepsjon'] };
  const ALDRI_VED_DØR = { soverom: 1, bad: 1, beboerrom: 1, sykerom: 1, behandlingsrom: 1, vaskerom: 1 };

  // møbler: [bredde langs veggen, dybde, høyde, sperrer (du kan ikke gå gjennom)]
  const MØBLER = {
    sofa: [2, .9, .8, 1], salongbord: [1.1, .6, .42, 0], tvbenk: [1.5, .42, .5, 1], bokhylle: [1, .32, 1.9, 1], lenestol: [.85, .85, .8, 1],
    spisebord: [1.5, .9, .75, 1], stol: [.45, .45, .85, 0], plante: [.4, .4, 1.1, 0], teppe: [2.2, 1.5, .02, 0],
    kjøkkenbenk: [2.4, .62, .9, 1], kjøleskap: [.62, .62, 1.85, 1], komfyr: [.6, .62, .9, 1],
    seng: [1, 2, .5, 1], dobbeltseng: [1.7, 2.05, .5, 1], nattbord: [.45, .4, .5, 0], skap: [1.2, .58, 2, 1],
    toalett: [.4, .65, .45, 1], vask: [.6, .45, .85, 1], dusj: [.9, .9, 2, 0],
    skohylle: [.9, .3, .45, 0], knagger: [1, .1, 1.7, 0],
    pult: [1.4, .7, .74, 1], kontorstol: [.5, .5, .95, 0], arkivskap: [.9, .45, 1.3, 1], skranke: [2.4, .7, 1.1, 1], benk: [1.6, .45, .45, 1],
    skolepult: [.65, .5, .72, 1], kateter: [1.5, .7, .76, 1], tavle: [2.6, .06, 1.2, 0],
    sykeseng: [.95, 2.05, .6, 1],
    reol: [2.4, .8, 1.8, 1], kasse: [1.6, .8, .95, 1], kjøledisk: [2.4, .9, 1.3, 1],
    plantebed: [2.6, 1, .55, 1], pall: [1.2, .8, 1.1, 1], pallereol: [2.8, 1.1, 4, 1], arbeidsbenk: [2, .7, .9, 1], maskin: [1.8, 1.2, 1.6, 1], tønne: [.6, .6, .9, 1],
    høyball: [1.3, 1.3, 1.2, 1], bås: [2.2, 2.6, 1.2, 1], traktor: [2, 3.6, 2.4, 1],
    bil: [1.8, 4.3, 1.45, 1], vedstabel: [1.8, .45, 1.1, 1], hylle: [1.2, .4, 1.8, 1],
    kirkebenk: [3, .5, .9, 1], alter: [2, .8, 1, 1], prekestol: [.9, .9, 1.4, 1],
    fly: [9, 7, 2.6, 1], verktøyvogn: [.9, .5, .9, 1], seterad: [2.4, .6, .85, 1],
    køyeseng: [.95, 2.05, 1.75, 1], ovn: [.6, .6, 1, 1], kartbord: [2.4, 1.4, .9, 1], radio: [1.2, .5, 1.3, 1], langbord: [2.6, .9, .75, 1],
    // runde 15: butikk, fjøs, industri (tre, metall, olje), helse, kontor og kirke
    fruktdisk: [2.2, 1.1, .9, 1], fryseboks: [2, .85, .9, 1], båsrekke: [4.8, 2.9, 1.25, 1], melketank: [1.7, 1.1, 1.4, 1], fôrvogn: [1, 1.6, 1.1, 1],
    sagbenk: [6, 1.4, 1.1, 1], plankestabel: [4.2, 1.2, 1.3, 1], tørkestativ: [3.6, 1.4, 2.4, 1],
    traverskran: [10, .7, 0, 0], sveisebås: [3, 2.6, 2.1, 1], stålplater: [3, 1.5, .7, 1],
    tank: [3, 3, 4, 1], rørgate: [6, .9, 1.4, 1], ventil: [.8, .8, 1.3, 1], tavlepanel: [2.4, .5, 2, 1],
    beboerbad: [1.9, 1.7, 2.2, 1], undersøkelsesbenk: [.7, 1.9, .75, 1], medisinskap: [1, .45, 1.9, 1], døpefont: [.7, .7, 1, 1], kopimaskin: [.8, .6, 1.1, 1],
    // (ut9-mobler, 28. nov, brukeren: «flere forskjellige hyller, flere forskjellige møbler») 31 nye møbler. Mål er Claudes forslag.
    // Veggskap og -hyller (overskap, vifte, krydderhylle, speilskap, verktøyvegg) sperrer ikke: de henger over gulvet (høyden = toppen).
    hjørnesofa: [2.5, 1.7, .82, 1], peis: [1.3, .55, 1.25, 1], vitrineskap: [1, .42, 1.9, 1], gyngestol: [.7, .95, 1.05, 1], piano: [1.5, .62, 1.25, 1], skjenk: [1.6, .46, .85, 1],
    overskap: [1.8, .35, 2.15, 0], kjøkkenøy: [1.8, .9, .92, 1], vifte: [.6, .5, 2.2, 0], oppvaskmaskin: [.6, .6, .86, 1], krydderhylle: [.8, .18, 1.85, 0],
    barneseng: [.72, 1.32, .9, 1], kommode: [1, .5, .9, 1], garderobe: [1.8, .62, 2.1, 1], sminkebord: [1, .45, .76, 1],
    badekar: [1.7, .75, .56, 1], vaskemaskin: [.6, .6, .86, 1], speilskap: [.6, .16, 1.9, 0], skoskap: [.9, .32, 1.1, 0],
    permreol: [.8, .4, 2, 1], vannkjøler: [.36, .36, 1.3, 1], safe: [.6, .6, 1, 1],
    gondol: [2.4, 1.1, 1.45, 1], frysedisk: [2.4, 1, .9, 1], drikkekjøler: [.75, .72, 2, 1], vognrekke: [1.1, .6, 1, 1],
    stålreol: [1.8, .6, 2.2, 1], verktøyvegg: [2, .12, 1.8, 0], verkstedbenk: [2.2, .75, .92, 1], luftkompressor: [.7, .45, .8, 1], dekkstativ: [1.2, .5, 1.4, 1],
  };
  // (ut9-mobler) møblene som henger på veggen over gulvet: spill/interior3d.js tegner dem uten skygge på gulvet
  const VEGGHENGT = { overskap: 1, vifte: 1, krydderhylle: 1, speilskap: 1, verktøyvegg: 1 };
  // Møblene per romtype, som oppskrifter (brukes for alle roller som ikke har egen kode i møblerG). Hvert steg:
  //  [hva, type, antall, valg]: 'vegg' = inntil en vegg (valg.sider 'lang'/'kort'), 'midt' = midt i rommet, 'foran' = foran forrige møbel,
  //  'rutenett' = rader (valg du/dv, mU/mV), 'rad' = så mange som får plass langs veggene, 'bord' = bord med stoler (antall = stoler).
  //  antall kan være en funksjon av arealet A. «per» = ett møbel per så mange m² (høyst antall).
  const MØBELSETT = {
    vindfang: [['vegg', 'skohylle', 1, { fri: .6 }], ['vegg', 'knagger', 1, { fri: .5 }]],
    vaskerom: [['vegg', 'vask', 1, { fri: .5 }], ['vegg', 'vaskemaskin', 1, { fri: .4 }], ['vegg', 'hylle', 1, { fri: .5 }], ['vegg', 'skap', 1]],
    møterom: [['bord', 'spisebord', 6, { b: 2.4 }], ['vegg', 'tavle', 1, { fri: .3, sider: 'kort' }], ['vegg', 'plante', 1, { fri: .5 }]],
    pauserom: [['vegg', 'kjøkkenbenk', 1, { b: 2.4, sider: 'lang' }], ['vegg', 'kjøleskap', 1], ['vegg', 'oppvaskmaskin', 1], ['bord', 'spisebord', 4], ['vegg', 'vannkjøler', 1, { fri: .5 }], ['vegg', 'plante', 1, { fri: .5 }]],
    arkiv: [['vegg', 'arkivskap', 4], ['vegg', 'permreol', 2], ['vegg', 'hylle', 1]],
    kontorlandskap: [['par', 'pult', A => Math.min(16, Math.floor(A / 6))], ['vegg', 'kopimaskin', 1], ['vegg', 'arkivskap', 2], ['vegg', 'permreol', 1], ['vegg', 'vannkjøler', 1, { fri: .5 }], ['vegg', 'plante', 2, { fri: .5 }]],
    lærerrom: [['bord', 'langbord', 0], ['vegg', 'kjøkkenbenk', 1, { b: 1.8 }], ['vegg', 'bokhylle', 2], ['vegg', 'pult', 2]],
    grupperom: [['bord', 'spisebord', 4], ['vegg', 'tavle', 1, { fri: .3 }], ['vegg', 'bokhylle', 1]],
    korridor: [['vegg', 'benk', A => Math.min(4, Math.floor(A / 25)), { fri: .8 }], ['vegg', 'plante', A => Math.min(3, Math.floor(A / 30)), { fri: .8 }]],
    // helse
    beboerrom: [['vegg', 'beboerbad', 1, { fri: .5, sider: 'kort' }], ['seng', 'sykeseng'], ['vegg', 'skap', 1], ['vegg', 'lenestol', 1], ['vegg', 'plante', 1, { fri: .5 }]],
    dagligstue: [['vegg', 'sofa', 2, { sider: 'lang' }], ['vegg', 'lenestol', A => Math.min(4, Math.floor(A / 10))], ['vegg', 'tvbenk', 1], ['bord', 'spisebord', 4], ['bord', 'spisebord', 4], ['vegg', 'bokhylle', 1], ['vegg', 'piano', 1], ['vegg', 'plante', 2, { fri: .5 }]],
    vaktrom: [['vegg', 'pult', 2], ['vegg', 'medisinskap', 1], ['vegg', 'arkivskap', 1], ['vegg', 'skap', 1], ['vegg', 'vask', 1, { fri: .5 }]],
    venterom: [['vegg', 'skranke', 1, { sider: 'kort' }], ['rad', 'benk', 6, { fri: 1 }], ['vegg', 'plante', 2, { fri: .5 }]],
    behandlingsrom: [['vegg', 'undersøkelsesbenk', 1], ['vegg', 'pult', 1], ['vegg', 'vask', 1, { fri: .5 }], ['vegg', 'medisinskap', 1], ['vegg', 'stol', 1, { fri: .4 }]],
    // fjøset: båsrekker langs langveggene (gjødselkanal bak, fôrbrett foran mot fôrgangen i midten), melkerommet med tank og vask
    fjøs: [['rad', 'båsrekke', 8, { sider: 'lang', fri: 1.4, iVeien: true }], ['vegg', 'fôrvogn', 1, { fri: 1.2, sider: 'kort' }], ['vegg', 'høyball', 2, { fri: 1.4, sider: 'kort' }], ['vegg', 'tønne', 1], ['vegg', 'melketank', 1, { fri: 1.2 }], ['midt', 'traktor', A => A > 90 ? 1 : 0, { fri: 1.5 }]],
    melkerom: [['vegg', 'melketank', 1, { fri: .6 }], ['vegg', 'vask', 1, { fri: .5 }], ['vegg', 'hylle', 1]],
    // industri: sag (sagbenk, plank, tørkestativ), maskinhall (maskiner, traverskran, sveisebås, stålplater), prosesshall (tanker, rør, ventiler)
    sag: [['midt', 'sagbenk', 1, { fri: 2 }], ['rad', 'plankestabel', A => Math.min(8, Math.floor(A / 50)), { fri: 1.6 }], ['vegg', 'arbeidsbenk', 1], ['vegg', 'vedstabel', 2]],
    tørkeloft: [['rad', 'tørkestativ', A => Math.min(8, Math.floor(A / 12)), { fri: 1 }]],
    maskinhall: [['kran', 'traverskran'], ['rutenett', 'maskin', 12, { du: 7, dv: 6, mU: 3, mV: 3, fri: 2 }], ['vegg', 'sveisebås', A => Math.min(3, 1 + Math.floor(A / 400)), { fri: 1.2 }],
      ['rad', 'stålplater', A => Math.min(6, Math.floor(A / 120)), { fri: 1.4 }], ['vegg', 'arbeidsbenk', 2], ['vegg', 'verktøyvogn', 2]],
    prosesshall: [['rutenett', 'tank', 8, { du: 6, dv: 6, mU: 3, mV: 3, fri: 2 }], ['rad', 'rørgate', A => Math.min(8, Math.floor(A / 90)), { fri: 1.4 }], ['vegg', 'ventil', A => Math.min(6, Math.floor(A / 100)), { fri: 1 }], ['vegg', 'tønne', 3]],
    kontrollrom_olje: [['vegg', 'tavlepanel', 3, { sider: 'lang' }], ['par', 'pult', 3], ['vegg', 'arkivskap', 1]],
    sakristi: [['vegg', 'skap', 2], ['vegg', 'pult', 1], ['vegg', 'stol', 1, { fri: .4 }]],
  };

  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function inni(P, X, Y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inn = !inn; } return inn; }
  function avstSeg(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; return Math.hypot(x - ax - dx * t, y - ay - dy * t); }
  const avstKant = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, avstSeg(x, y, a[0], a[1], b[0], b[1])); } return d; };
  // RUTER PÅ OMRISSET (20. nov natt, hakk i store bygg med mange hjørner): et rutenett over omrisset der hver rute er merket «sikkert inne»
  // (1) eller «sikkert ute» (2) når midten ligger lenger fra alle kanter enn rutens halve diagonal + SIKKER. Hele ruta ligger da på samme
  // side av omrisset og lenger enn SIKKER fra kanten, så inni() og nærKant(…, g ≤ SIKKER) har samme svar for alle punkter i ruta.
  // Ellers (0, nær en kant, eller utenfor rutenettet) regnes det som før. Bare for omriss med minst 12 hjørner. Tallene er Claudes forslag.
  const SIKKER = .15, RUTE = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function ruter(P) {
    if (!RUTE || P.length < 12) return null; let G = RUTE.get(P); if (G !== undefined) return G;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const c = Math.max(.5, Math.sqrt((x1 - x0) * (y1 - y0) / 900)), W = Math.max(1, Math.ceil((x1 - x0) / c)), H = Math.max(1, Math.ceil((y1 - y0) / c)), k = new Uint8Array(W * H), hd = c * Math.SQRT1_2 + SIKKER;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const cx = x0 + (i + .5) * c, cy = y0 + (j + .5) * c; if (avstKant(P, cx, cy) > hd) k[j * W + i] = inni(P, cx, cy) ? 1 : 2; }
    G = { x0, y0, c, W, H, k }; RUTE.set(P, G); return G;
  }
  const ruteKode = (G, x, y) => { const i = Math.floor((x - G.x0) / G.c), j = Math.floor((y - G.y0) / G.c); return i < 0 || j < 0 || i >= G.W || j >= G.H ? 0 : G.k[j * G.W + i]; };
  // samme svar som inni(P, x, y) og nærKant(P, x, y, g), raskere i store omriss
  function inniR(P, x, y) { const G = ruter(P), q = G ? ruteKode(G, x, y) : 0; return q === 1 ? true : q === 2 ? false : inni(P, x, y); }
  function nærKantR(P, x, y, g) { if (g <= SIKKER) { const G = ruter(P); if (G && ruteKode(G, x, y)) return false; } return nærKant(P, x, y, g); }
  // (20. nov) sant når (x, y) er nærmere enn g fra en kant: samme svar som avstKant(P, x, y) < g, men stopper ved første treff
  const nærKant = (P, x, y, g) => { for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[i + 1 === n ? 0 : i + 1]; if (avstSeg(x, y, a[0], a[1], b[0], b[1]) < g) return true; } return false; };

  // ---------- stil, variant og takhøyde ----------
  // Stilen per bygg: byggeåret når det finnes (info.år), ellers etter type, by/land (info.tett), høyde og form – fast per bygg via hash.
  function velgStil(kl, info, areal, hjørner) {
    const T = TYPER[kl]; if (!T) return 'nyere';
    if (info.år > 1000) return info.år < ÅR[0] ? 'eldre' : info.år < ÅR[1] ? 'nyere' : 'moderne';
    let [e, n, m] = T.stil; const tett = info.tett;
    // på landet flere eldre bygg, i byen flere moderne; høye bygg og store, enkle omriss er oftere nye; mange hjørner = eldre, påbygd
    if (tett !== undefined) { if (tett < 6) e += .15; else if (tett >= 25) m += .12; }
    if ((info.h || 0) > 14) m += .15; if (hjørner > 8) e += .1; if (areal > 1500 && kl !== 'kirke') m += .08;
    const s = e + n + m, f = hash(info.i | 0, 801) * s; return f < e ? 'eldre' : f < e + n ? 'nyere' : 'moderne';
  }
  // Typen med varianten flettet inn (fjøs, sag, sykehjem …): { ...TYPER[kl], ...varianter[v], variant }
  function type(kl, info) {
    const T = TYPER[kl]; if (!T) return null; if (!T.variant) return T;
    const v = T.variant(info, hash(info.i | 0, 802)); return Object.assign({}, T, T.varianter[v] || {}, { variant: v });
  }
  // Takhøyden (m): regel = [min, maks] eller 'full'; vegg = plass fra gulvet til veggtoppen (undefined = ukjent), saltak = om bygget har
  // saltak (P.veggTopp), stilTak = hvor i spennet (0–1), h = byggets høyde. Aldri over veggtoppen, aldri under TAK_MIN.
  function takhøyde(regel, o) {
    const vegg = o.vegg, rom = vegg !== undefined && vegg === vegg ? vegg - (o.saltak ? TAK_LUFT : TAK_FLATT) : undefined;
    let t;
    if (regel === 'full' || !regel) t = rom !== undefined ? Math.min(TAK_FULL_MAKS, rom) : Math.max(TAK_MIN, Math.min(TAK_FULL_MAKS, (o.h || 6) - .6));
    else { const [a, b] = regel; t = a + (b - a) * Math.max(0, Math.min(1, o.stilTak === undefined ? .5 : o.stilTak));
      // ved saltak ligger himlingen rett under veggtoppen når veggen er innenfor spennet (+0,35 m) – ikke et rart bånd mellom
      if (o.saltak && rom !== undefined && rom <= b + .35) t = Math.max(a, rom); }
    if (rom !== undefined) t = Math.min(t, rom);
    return Math.max(TAK_MIN, Math.round(t * 100) / 100);
  }

  // (20. nov natt, hakk) planen er en generator (yield mellom rommene og i rutenettene), så interiøret i 3D kan lages i biter.
  // plan() kjører den ferdig i ett strekk – samme svar.
  function plan(P, info) { const it = planG(P, info); let r; while (!(r = it.next()).done); return r.value; }
  function* planG(P, info) {
    const kl = KLASSE[info.kl] ? info.kl : 'hus', K = KLASSE[kl], frø = info.i | 0; let teller = 0; const tilf = () => hash(frø, ++teller);
    // aksene: u langs byggets lengste side, v på tvers
    let best = 0, ux = 1, uy = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > best) { best = l; ux = (b[0] - a[0]) / l; uy = (b[1] - a[1]) / l; } }
    const vx = -uy, vy = ux, tilUV = (x, y) => [x * ux + y * uy, x * vx + y * vy], tilXY = (u, v) => [u * ux + v * vx, u * uy + v * vy];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, areal = 0;
    for (let i = 0; i < P.length; i++) { const [x, y] = P[i], [bx, by] = P[(i + 1) % P.length], [u, v] = tilUV(x, y); areal += x * by - bx * y;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    areal = Math.abs(areal) / 2;
    const iUV = (u, v) => inniR(P, u * ux + v * vx, u * uy + v * vy);
    const T = K.leir ? null : type(kl, Object.assign({ areal }, info)), stil = T ? velgStil(kl, info, areal, P.length) : 'nyere', S = STILER[stil];
    // inngangen: punktet rett innenfor døra, og åpningen i ytterveggen
    const d = info.dør, nx = d.uy, ny = -d.ux, w = Math.max(1.1, d.w), inn = [d.x - nx * .7, d.y - ny * .7];
    const åpninger = [tilUV(inn[0], inn[1])], vegger = [], dører = [];
    // en skillevegg langs en linje i uv: klippes mot omrisset, får én døråpning i det lengste stykket (medDør = false: ingen)
    const skille = (langsU, fast, a, b, medDør = true) => {
      const pkt = (t, side = 0) => langsU ? [t, fast + side] : [fast + side, t], biter = [], løp = []; let start = null, ds = null;
      // veggen står der linja er inne i omrisset; døra må ha rom på begge sider (0,6 m ut til hver side er også inne)
      const iP = (t, side) => (langsU ? iUV(t, fast + side) : iUV(fast + side, t));
      for (let t = a; t <= b + 1e-6; t += .2) { const tt = Math.min(b, t), inne = iP(tt, 0), begge = inne && iP(tt, .6) && iP(tt, -.6);
        if (inne && start === null) start = tt; if (!inne && start !== null) { biter.push([start, t - .2]); start = null; }
        if (begge && ds === null) ds = tt; if (!begge && ds !== null) { løp.push([ds, t - .2]); ds = null; } }
      if (start !== null) biter.push([start, b]); if (ds !== null) løp.push([ds, b]);
      let L = null; if (medDør) for (const l of løp) if (!L || l[1] - l[0] > L[1] - L[0]) L = l;
      let d0 = null, d1 = null;
      if (L) { const len = L[1] - L[0];
        if (len < DØRÅPNING + .6) { d0 = L[0]; d1 = L[1]; } else { const m = L[0] + .3 + DØRÅPNING / 2 + tilf() * (len - .6 - DØRÅPNING); d0 = m - DØRÅPNING / 2; d1 = m + DØRÅPNING / 2; }
        // døråpningen: midten, veggens retning og bredden
        const m = (d0 + d1) / 2, ret = langsU ? tilXY(1, 0) : tilXY(0, 1); åpninger.push(pkt(m)); dører.push([...tilXY(...pkt(m)), ret[0], ret[1], d1 - d0]); }
      const legg = (p, q) => { if (q - p < .15) return; const A = tilXY(...pkt(p)), B = tilXY(...pkt(q)); vegger.push({ ax: A[0], ay: A[1], bx: B[0], by: B[1] }); };
      for (const s of biter) { if (d0 === null || d1 <= s[0] || d0 >= s[1]) legg(s[0], s[1]); else { legg(s[0], d0); legg(d1, s[1]); } }
    };
    // et skille i fast = uS (langs v) er lov når ingen åpning ligger der skilleveggen møter romveggene
    const lov = (langsU, fast, a, b) => !åpninger.some(([ou, ov]) => { const o = langsU ? [ov, ou] : [ou, ov]; return Math.abs(o[0] - fast) < 1 && (Math.abs(o[1] - a) < .5 || Math.abs(o[1] - b) < .5 || (o[1] > a && o[1] < b && Math.abs(o[0] - fast) < .45)); });
    let rom = [];
    // (generator: yield før hver skillevegg, så store bygg med mange rom kan deles i biter; brukes med yield*)
    const del = function* (r, dybde) {
      const lu = r.u1 - r.u0, lv = r.v1 - r.v0;
      if (K.hall || lu * lv <= K.maks || dybde > 7 || Math.max(lu, lv) < 2 * K.min) { rom.push(r); return; }
      const iU = lu >= lv, len = iU ? lu : lv, lo = iU ? r.u0 : r.v0;
      for (let k = 0; k < 8; k++) {
        const s = lo + Math.max(K.min, Math.min(len - K.min, len * (.36 + .28 * tilf())));
        if (!lov(!iU, s, iU ? r.v0 : r.u0, iU ? r.v1 : r.u1)) continue;
        yield 'skille'; skille(!iU, s, iU ? r.v0 : r.u0, iU ? r.v1 : r.u1);
        if (iU) { yield* del({ u0: r.u0, u1: s, v0: r.v0, v1: r.v1 }, dybde + 1); yield* del({ u0: s, u1: r.u1, v0: r.v0, v1: r.v1 }, dybde + 1); }
        else { yield* del({ u0: r.u0, u1: r.u1, v0: r.v0, v1: s }, dybde + 1); yield* del({ u0: r.u0, u1: r.u1, v0: s, v1: r.v1 }, dybde + 1); }
        return;
      }
      rom.push(r);
    };
    const hele = { u0, u1, v0, v1 }, [iu, iv] = åpninger[0];
    let form = 'bsp';
    const RS = T ? ROMSETT[T.romsett] : null;
    if (T && T.plan === 'korridor') {
      // (går korridorplanen ikke, tas veggene den rakk å lage bort igjen)
      const nV = vegger.length, nD = dører.length, nÅ = åpninger.length, k = yield* korridorG({ T, S, hele, iu, iv, skille, tilf, iUV });
      // en vegg rett innenfor døra (skjeve omriss) gjør også at korridorplanen ikke brukes
      const vItt = k && vegger.slice(nV).some(g => avstSeg(inn[0], inn[1], g.ax, g.ay, g.bx, g.by) < .45);
      if (k && !vItt) { rom = k; form = 'korridor'; } else { vegger.length = nV; dører.length = nD; åpninger.length = nÅ; }
    }
    if (form === 'bsp') {
      if (K.hall && T && T.forrom && u1 - u0 > 9 && areal > 50 && Math.min(iu - u0, u1 - iu) < 6.5 && Math.min(iu - u0, u1 - iu) > -1) {
        // forrom (melkerommet i fjøset): enden der døra er, fra gavlen til litt forbi døra – døra går inn i forrommet
        const vedU0 = iu - u0 < u1 - iu, s = vedU0 ? Math.max(u0 + T.forrom, iu + 1.4) : Math.min(u1 - T.forrom, iu - 1.4);
        skille(false, s, v0, v1); const a = { u0, u1: s, v0, v1 }, b = { u0: s, u1, v0, v1 }; (vedU0 ? a : b).forrom = true; rom.push(a, b); form = 'hall';
      } else if (K.hall && K.bakrom && u1 - u0 > 9 && areal > 60) {
        // hall med bakrom i enden lengst fra inngangen
        const bak = (u1 - u0) * K.bakrom, s = iu - u0 < u1 - iu ? u1 - Math.max(2.6, bak) : u0 + Math.max(2.6, bak);
        skille(false, s, v0, v1);
        const a = { u0, u1: s, v0, v1 }, b = { u0: s, u1, v0, v1 }, innA = iu < s;
        (innA ? b : a).bak = true; rom.push(a, b); form = 'hall';
      } else { yield* del(hele, 0); form = K.hall ? 'hall' : 'bsp'; }
    }
    // rommenes mål og hvor mye av dem som ligger inne i omrisset (rom utenfor et skjevt omriss brukes ikke)
    for (const r of rom) { yield 'mål'; let inne = 0, n = 0; for (let a = .5; a < 4; a++) for (let b = .5; b < 4; b++) { n++; if (iUV(r.u0 + (r.u1 - r.u0) * a / 4, r.v0 + (r.v1 - r.v0) * b / 4)) inne++; }
      r.andel = inne / n; r.areal = (r.u1 - r.u0) * (r.v1 - r.v0) * r.andel; }
    const romVed = (u, v) => rom.find(r => !r.utenom && u >= r.u0 - 1e-6 && u <= r.u1 + 1e-6 && v >= r.v0 - 1e-6 && v <= r.v1 + 1e-6) || null;
    const innRom = romVed(iu, iv) || rom[0];
    // forbindelsene: hvilke rom hver døråpning går mellom (to punkter 0,3 m ut på hver side av åpningen)
    const naboer = new Map(rom.map(r => [r, new Set()]));
    for (const [x, y, dx, dy] of dører) { const [a1, b1] = tilUV(x - dy * .35, y + dx * .35), [a2, b2] = tilUV(x + dy * .35, y - dx * .35), A = romVed(a1, b1), B = romVed(a2, b2);
      if (A && B && A !== B) { naboer.get(A).add(B); naboer.get(B).add(A); } }
    for (const r of rom) if (r.åpenMot) for (const o of r.åpenMot) { naboer.get(r).add(o); naboer.get(o).add(r); }
    if (form !== 'korridor') roller(kl, rom, innRom, info, w, RS, naboer, stil);
    // TILGANG: et soverom, bad, sykerom … uten dør til gang/korridor/stue blir et rom man kan gå gjennom (kontor, bod)
    for (const r of rom) { const T2 = TILGANG[r.rolle]; if (!T2 || r.andel < .5) continue; if (![...naboer.get(r)].some(o => T2.includes(o.rolle))) r.rolle = /hus|leil|hytte/.test(kl) && (r.areal < 8 || kl === 'hytte') ? 'bod' : 'kontor'; }
    // FLERE INNGANGER (brukeren: store bygg får hovedinngang, bakdør/vareinngang og nødutgang; butikker vareinngang bak)
    const pl0 = { P, rom, vegger, akse: { ux, uy, vx, vy }, tilUV, tilXY, iUV, romVed };
    const ekstra = T ? flereInnganger(pl0, T, areal, d, w, tilf) : [];
    for (const e of ekstra) åpninger.push(tilUV(e.inn[0], e.inn[1]));
    // ytterveggene (stykker), med åpning ved alle inngangene
    const alle = [{ x: d.x, y: d.y, ux: d.ux, uy: d.uy, w }, ...ekstra], ytre = [];
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, hull = [];
      for (const q of alle) { const t = (q.x - a[0]) * ex + (q.y - a[1]) * ey, av = Math.abs((q.x - a[0]) * ey - (q.y - a[1]) * ex); if (av < .3 && t > -.01 && t < L + .01) hull.push([Math.max(0, t - q.w / 2), Math.min(L, t + q.w / 2)]); }
      hull.sort((p, q) => p[0] - q[0]); let t0 = 0;
      for (const [p, q] of hull) { if (p - t0 > .05) ytre.push({ ax: a[0] + ex * t0, ay: a[1] + ey * t0, bx: a[0] + ex * p, by: a[1] + ey * p }); t0 = Math.max(t0, q); }
      if (L - t0 > .05) ytre.push({ ax: a[0] + ex * t0, ay: a[1] + ey * t0, bx: b[0], by: b[1] }); }
    const regel = T ? T.tak : null;
    const pl = { P, kl, i: frø, areal, bb: [x0, y0, x1, y1], akse: { ux, uy, vx, vy }, rom, vegger, ytre, dører, møbler: [], form, stil, variant: T && T.variant || null,
      inngang: { x: d.x, y: d.y, nx, ny, ux: d.ux, uy: d.uy, w, inn, type: 'hoved' }, gulv: 0,
      // grunnverdien før veggtoppen er kjent (interior3d.js regner den på nytt med Interior.takhøyde når gulvet og veggtoppen er kjent)
      takRegel: regel, stilTak: S.tak, vindu: S.vindu, vinduNed: S.vinduNed,
      tak: regel ? takhøyde(regel, { h: info.h, stilTak: S.tak }) : (K.tak || Math.max(2.4, Math.min(7, (info.h || 6) - .6))) };
    pl.innganger = [pl.inngang, ...ekstra];
    pl.naboer = [...naboer].map(([r, s]) => [rom.indexOf(r), [...s].map(o => rom.indexOf(o))]);
    pl.senger = info.senger;   // brakka i leiren: så mange sengeplasser bygget har (to per køyeseng)
    yield 'rom';
    yield* møblerG(pl, tilXY, åpninger, tilf);
    for (const r of rom) delete r.veier;
    return pl;
  }

  // KORRIDORPLANEN (boliger, kontor, skole, helse): en gang/korridor langs byggets lengde, rommene i ett eller to bånd langs den, hvert rom
  // med dør til korridoren. Døra går inn i korridoren eller i et vindfang/en resepsjon som er åpen mot den. Gir null når bygget er for smalt
  // eller omrisset er så skjevt at et rom ikke kan nås – da brukes den gamle delingen.
  function* korridorG(c) {
    const { T, S, hele, iu, iv, skille, tilf, iUV } = c, { u0, u1, v0, v1 } = hele, W = v1 - v0, L = u1 - u0, RS = ROMSETT[T.romsett];
    const cw = T.gang * S.gang, minR = T.minRom, ew = T.vindfang || 2;
    if (L < 4.5 || W < minR + cw || L * W < 30) return null;
    // hvilken side døra er på (i byggets firkant)
    const dS = [Math.abs(iv - v0), Math.abs(u1 - iu), Math.abs(v1 - iv), Math.abs(iu - u0)], side = dS.indexOf(Math.min(...dS)), kortside = side === 1 || side === 3;
    // BREDE BYGG (over 2 × DYP + gang per skive): flere skiver, hver med sin korridor i midten, og en tverrkorridor som binder dem sammen
    // (ellers blir rommene 15 m dype). DYP = største romdybde (Claudes forslag).
    const dyp = T.dyp || DYP, nSk = W >= 2 * (2 * minR + cw) ? Math.max(1, Math.min(4, Math.round(W / (2 * dyp + cw)))) : 1, bånd = [], korrer = [];
    let tverr = null;
    if (nSk >= 2) {
      const Ws = W / nSk; for (let k = 0; k < nSk; k++) { const a = v0 + k * Ws, e = a + Ws, cv = (a + e) / 2; korrer.push({ u0, u1, v0: cv - cw / 2, v1: cv + cw / 2, korridor: true });
        bånd.push({ a, b: cv - cw / 2, ved: cv - cw / 2, kc: cv }, { a: cv + cw / 2, b: e, ved: cv + cw / 2, kc: cv }); }
      const uc = Math.max(u0 + 2.6 + cw / 2, Math.min(u1 - 2.6 - cw / 2, kortside ? (u0 + u1) / 2 : iu)); tverr = { u0: uc - cw / 2, u1: uc + cw / 2, v0, v1, korridor: true, tverr: true };
    } else {
      let c0, c1;
      if (W >= 2 * minR + cw) {
        // to bånd: korridoren i midten (døra i gavlen: korridoren rett inn fra døra)
        const midt = kortside ? iv : (v0 + v1) / 2 + (tilf() - .5) * .6;
        const cv = Math.max(v0 + minR + cw / 2, Math.min(v1 - minR - cw / 2, midt)); c0 = cv - cw / 2; c1 = cv + cw / 2;
      } else {
        // ett bånd: korridoren langs den siden døra er nærmest
        const lav = kortside ? iv - v0 < v1 - iv : side === 0; if (lav) { c0 = v0; c1 = v0 + cw; } else { c0 = v1 - cw; c1 = v1; }
      }
      if (c0 - v0 >= minR - 1e-6) bånd.push({ a: v0, b: c0, ved: c0, kc: (c0 + c1) / 2 }); if (v1 - c1 >= minR - 1e-6) bånd.push({ a: c1, b: v1, ved: c1, kc: (c0 + c1) / 2 });
      korrer.push({ u0, u1, v0: c0, v1: c1, korridor: true });
    }
    const korr = korrer[0], iKorr = (u, v) => korrer.some(k => v >= k.v0 - .05 && v <= k.v1 + .05) || (tverr && u >= tverr.u0 - .05 && u <= tverr.u1 + .05);
    // rommet døra går inn i: korridoren, eller et inngangsrom i båndet (vindfang/resepsjon/venterom) – bredde ew, rundt døra
    let innB = null, innA = null;
    if (!iKorr(iu, iv)) { innB = bånd.find(b => iv >= b.a - .05 && iv <= b.b + .05); if (!innB) return null;
      const m = kortside ? (side === 3 ? u0 + ew / 2 : u1 - ew / 2) : iu; innA = [Math.max(u0, m - ew / 2), Math.min(u1, m + ew / 2)];
      if (innA[1] - innA[0] < ew - .01) { if (innA[0] === u0) innA[1] = u0 + ew; else innA[0] = u1 - ew; }
      if (tverr && innA[1] > tverr.u0 && innA[0] < tverr.u1) return null; }
    // delingen langs hvert bånd: rom med bredde rundt romB (fast per bygg), aldri smalere enn 2 m
    const rb = T.romB * S.rom, seg = [];
    const delStrekk = (b, a0, a1) => { const len = a1 - a0; if (len < 1.6) return; const n = Math.max(1, Math.round(len / (rb * (.85 + tilf() * .3)))), wSeg = len / n;
      for (let k = 0; k < n; k++) seg.push({ u0: a0 + k * wSeg, u1: a0 + (k + 1) * wSeg, v0: b.a, v1: b.b, bånd: b }); };
    // (tverrkorridoren deler båndene i to strekk)
    const strekk = (b, a0, a1) => { if (!tverr) return delStrekk(b, a0, a1); if (a0 < tverr.u0) delStrekk(b, a0, Math.min(a1, tverr.u0)); if (a1 > tverr.u1) delStrekk(b, Math.max(a0, tverr.u1), a1); };
    for (const b of bånd) { if (b === innB) { strekk(b, u0, innA[0]); seg.push({ u0: innA[0], u1: innA[1], v0: b.a, v1: b.b, bånd: b, inngang: true }); strekk(b, innA[1], u1); } else strekk(b, u0, u1); }
    for (const s of seg) { s.areal = (s.u1 - s.u0) * (s.v1 - s.v0); let inne = 0; for (let a = .5; a < 4; a++) for (let q = .5; q < 4; q++) if (iUV(s.u0 + (s.u1 - s.u0) * a / 4, s.v0 + (s.v1 - s.v0) * q / 4)) inne++; s.andel = inne / 16; s.areal *= s.andel; }
    // rollene etter ROMSETT
    const brukt = seg.filter(s => s.andel > .5 && !s.inngang), dørPkt = [iu, iv];
    for (const k of korrer) k.rolle = RS.gang; if (tverr) tverr.rolle = RS.gang; const innS = seg.find(s => s.inngang); if (innS) innS.rolle = S.åpen === 2 && RS.inngang === 'vindfang' ? 'gang' : RS.inngang;
    tildel(brukt, RS.rom, dørPkt);
    for (const s of seg) if (!s.rolle) s.rolle = s.andel > .3 ? 'bod' : 'utenfor';
    // veggene: mellom rommene i et bånd (ingen dør; åpent mellom stue og kjøkken i nyere og moderne), og mot korridoren (én dør per rom,
    // ingen vegg for inngangsrommet og for stue/kjøkken i moderne stil)
    const åpneRoller = { stue: 1, kjøkken: 1, dagligstue: 1, kontorlandskap: 1 };
    for (const b of bånd) { const L2 = seg.filter(s => s.bånd === b).sort((p, q) => p.u0 - q.u0);
      for (let k = 0; k < L2.length - 1; k++) { yield 'skille'; const A = L2[k], B = L2[k + 1], åpne = S.åpen >= 1 && åpneRoller[A.rolle] && åpneRoller[B.rolle];
        if (åpne) { A.åpenMot = (A.åpenMot || []).concat([B]); continue; }
        // mellom et inngangsrom og nabo: dør bare når naboen kan nås fra den (aldri soverom/bad), ellers tett vegg
        skille(false, A.u1, b.a, b.b, false); }
      for (const s of L2) { yield 'skille'; if (s.rolle === 'utenfor') continue;
        const minKorr = korrer.find(k => Math.abs((k.v0 + k.v1) / 2 - b.kc) < .01) || korr;
        if (s.inngang || (S.åpen >= 2 && åpneRoller[s.rolle])) { s.åpenMot = (s.åpenMot || []).concat([minKorr]); continue; }
        // veggen mot korridoren med én dør (litt inn fra kanten, så døra ikke kommer der to vegger møtes)
        skille(true, b.ved, s.u0 + .25, s.u1 - .25, true); if (s.u1 - s.u0 > .5) { skille(true, b.ved, s.u0, s.u0 + .25, false); skille(true, b.ved, s.u1 - .25, s.u1, false); } } }
    // tverrkorridorens vegger mot båndene (uten dør) – rommene har dør til sin egen korridor
    if (tverr) for (const b of bånd) { yield 'skille'; for (const uu of [tverr.u0, tverr.u1]) if (uu > u0 + .3 && uu < u1 - .3 && !(b === innB && uu > innA[0] - .05 && uu < innA[1] + .05)) skille(false, uu, b.a, b.b, false); }
    // kan alle rom nås? (rom med dør: punktet i døra må være inne i omrisset på begge sider) – grovt: korridoren må være inne der rommet ligger
    for (const s of seg) { if (s.rolle === 'utenfor' || s.andel < .5) continue; const m = (s.u0 + s.u1) / 2, cv = s.bånd.kc; if (!iUV(m, cv) && !iUV(s.u0 + .6, cv) && !iUV(s.u1 - .6, cv)) return null; }
    if (tverr) for (const k of korrer) if (!iUV((tverr.u0 + tverr.u1) / 2, (k.v0 + k.v1) / 2)) return null;
    return [...korrer, ...(tverr ? [tverr] : []), ...seg];
  }

  // Tildel roller til rommene etter en liste fra ROMSETT (se forklaringen over ROMSETT). Rommene er { u0, u1, v0, v1, areal, bånd }.
  function tildel(L, liste, dørPkt) {
    const ledig = () => L.filter(r => !r.rolle), midt = r => [(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2];
    const ved = (a, b) => a.bånd === b.bånd && (Math.abs(a.u1 - b.u0) < .05 || Math.abs(b.u1 - a.u0) < .05);
    for (const k of liste) { let n = 1; if (k.fraRom && L.length < k.fraRom) continue; if (k.hver) n = Math.max(1, Math.floor(L.length / k.hver));
      for (let q = 0; q < n; q++) { const F = ledig().filter(r => !k.min || r.areal >= k.min || k.velg === 'rest'); if (!F.length) break; let r = null;
        if (k.velg === 'rest') { for (const x of F) x.rolle = k.min && x.areal < k.min ? k.ellers || 'bod' : k.rolle; break; }
        if (k.velg === 'størst') r = F.reduce((a, b) => b.areal > a.areal ? b : a);
        else if (k.velg === 'minst') r = F.reduce((a, b) => b.areal < a.areal ? b : a);
        else if (k.velg === 'nær') r = F.reduce((a, b) => Math.hypot(...midt(b).map((v, i) => v - dørPkt[i])) < Math.hypot(...midt(a).map((v, i) => v - dørPkt[i])) ? b : a);
        else if (/^ved:/.test(k.velg)) { const mål = L.find(x => x.rolle === k.velg.slice(4));
          // vegg i vegg i samme bånd, ellers rett over korridoren (overlapper langs), ellers det største
          const V = mål ? F.filter(x => ved(x, mål)) : [], O = mål ? F.filter(x => x.bånd !== mål.bånd && Math.min(x.u1, mål.u1) - Math.max(x.u0, mål.u0) > 1) : [];
          r = (V.length ? V : O.length ? O : F).reduce((a, b) => b.areal > a.areal ? b : a); }
        if (r) r.rolle = k.rolle; } }
  }

  // Hva rommene brukes til i den gamle delingen (hytter, skjeve omriss, hallene). Boliger: døra går inn i en gang når det er flere enn to rom;
  // soverom og bad bare i rom med dør til gang eller stue (TILGANG), ellers blir rommet bod.
  function roller(kl, rom, innRom, info, w, RS, naboer, stil) {
    const andre = rom.filter(r => r !== innRom && r.andel > .3).sort((a, b) => b.areal - a.areal);
    for (const r of rom) r.rolle = r.andel > .3 ? 'tomt' : 'utenfor';
    const nab = r => [...(naboer.get(r) || [])];
    if (kl === 'hus' || kl === 'hytte' || kl === 'leil') {
      if (!andre.length) innRom.rolle = 'allrom';
      else if (andre.length === 1) { innRom.rolle = 'allrom'; andre[0].rolle = 'soverom'; }
      else { innRom.rolle = innRom.areal > 15 && stil !== 'eldre' ? 'stue' : innRom.areal > 15 ? 'allrom' : 'gang';
        const fri = () => andre.filter(r => r.rolle === 'tomt');
        if (innRom.rolle === 'gang') { const S = nab(innRom).filter(r => r.rolle === 'tomt').sort((a, b) => b.areal - a.areal)[0] || fri()[0]; if (S) S.rolle = 'stue'; }
        const stue = rom.find(r => r.rolle === 'stue' || r.rolle === 'allrom');
        const kj = fri().filter(r => stue && (naboer.get(stue) || new Set()).has(r)).sort((a, b) => b.areal - a.areal)[0] || fri()[0]; if (kj) kj.rolle = 'kjøkken';
        const kan = r => nab(r).some(o => TILGANG.soverom.includes(o.rolle));
        // flere runder: et rom bak et soverom/bad blir bod; rom med dør til gang/stue blir bad (det minste) og soverom
        const F = fri().filter(kan); if (F.length >= 2) F.sort((a, b) => a.areal - b.areal)[0].rolle = 'bad';
        for (const r of fri()) r.rolle = kan(r) ? 'soverom' : r.areal > 8 && kl !== 'hytte' ? 'kontor' : 'bod'; }
    } else if (kl === 'kontor') { innRom.rolle = 'resepsjon'; for (const r of andre) r.rolle = 'kontor'; }
    else if (kl === 'skole') { innRom.rolle = 'gang'; for (const r of andre) r.rolle = r.areal > 22 ? 'klasserom' : 'kontor'; }
    else if (kl === 'sykehus') { innRom.rolle = 'resepsjon'; for (const r of andre) r.rolle = 'sykerom'; }
    else if (kl === 'brakke' || kl === 'kontrollrom' || kl === 'storkjøkken' || kl === 'drivhus') innRom.rolle = kl;
    else if (RS && RS.hall) {
      // hallene etter ROMSETT: hovedrommet, bakrommet og forrommet
      for (const r of rom) if (r.andel > .3) r.rolle = r.forrom && RS.for ? RS.for : r.bak && RS.bak ? RS.bak : r === innRom ? RS.hall : RS.bak || RS.hall;
      const hoved = rom.find(r => r.rolle === RS.hall); if (!hoved && RS.for && innRom.rolle === RS.for) { const h = andre[0]; if (h) h.rolle = RS.hall; }
      if (kl === 'uthus') innRom.rolle = w >= 2.2 && innRom.areal > 14 ? 'garasje' : 'bod';
    }
  }

  // Ekstra innganger (Claudes forslag): bak = bakdør når arealet er minst så mye, vare = vareinngang (port) i bakrommet/bakveggen,
  // nød = nødutgang. Døra legges midt på en ytterkant (eller litt til siden) der den ikke treffer en skillevegg og går inn i et rom som
  // kan ha ytterdør (ALDRI_VED_DØR). Gir [{ x, y, nx, ny, ux, uy, w, inn, type }].
  function flereInnganger(pl, T, areal, d, w, tilf) {
    const I = T.inn || {}, ønsk = [];
    if (I.vare !== undefined && areal >= I.vare) ønsk.push(['vare', T.romsett === 'butikk' || T.romsett === 'lager' ? 2.6 : 3.2]);
    else if (I.bak !== undefined && areal >= I.bak) ønsk.push(['bak', 1]);
    if (I.nød !== undefined && areal >= I.nød) ønsk.push(['nød', 1.1]);
    const ut = [], P = pl.P, kanter = [];
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 2.4) kanter.push({ a, b, L, ex: (b[0] - a[0]) / L, ey: (b[1] - a[1]) / L }); }
    const dører = [[d.x, d.y]];
    for (const [type, bw] of ønsk) {
      let best = null;
      for (const k of kanter) { if (k.L < bw + 1.6) continue; for (const t of [.5, .3, .7, .25, .75, .18, .82, .4, .6, .1, .9]) {
        const x = k.a[0] + k.ex * k.L * t, y = k.a[1] + k.ey * k.L * t, nx = k.ey, ny = -k.ex, ix = x - nx * .7, iy = y - ny * .7;
        if (!inni(P, ix, iy) || avstKant(P, ix, iy) < .5) continue;
        // ikke der en skillevegg møter ytterveggen, og ikke tett på en annen dør
        if (pl.vegger.some(g => avstSeg(ix, iy, g.ax, g.ay, g.bx, g.by) < .75 || Math.min(Math.hypot(g.ax - x, g.ay - y), Math.hypot(g.bx - x, g.by - y)) < bw / 2 + .45)) continue;
        if (dører.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < 4)) continue;
        const [iu, iv] = pl.tilUV(ix, iy), r = pl.romVed(iu, iv); if (!r || r.rolle === 'utenfor' || ALDRI_VED_DØR[r.rolle]) continue;
        // vareinngangen helst i bakrommet (lageret), bakdøra og nødutgangen langt fra hoveddøra
        const fjern = Math.min(...dører.map(([qx, qy]) => Math.hypot(qx - x, qy - y))), poeng = fjern + (type === 'vare' && (r.bak || r.rolle === 'lager') ? 1000 : 0) + (type === 'bak' && /kjøkken|gang|vaskerom|lager|melkerom/.test(r.rolle) ? 8 : 0) + tilf() * .5;
        if (!best || poeng > best.poeng) best = { poeng, x, y, nx, ny, ux: k.ex, uy: k.ey, w: bw, inn: [ix, iy], type }; } }
      if (best) { delete best.poeng; ut.push(best); dører.push([best.x, best.y]); }
    }
    return ut;
  }

  // Møblene. Et møbel står med ryggen mot en romvegg (side 0: v0, 1: u1, 2: v1, 3: u0) eller fritt i rommet; a = retningen
  // møbelets bredde går i, og fronten vender inn i rommet.
  // hjørnene og midten som prøv() sjekker mot omrisset, i denne rekkefølgen
  const HJØRNER = [-1, -1, 1, -1, 1, 1, -1, 1, 0, 0], TOM = Object.freeze({}), PLASSER = [.5, .15, .85, 0, 1, .3, .7], SIDER = [0, 1, 2, 3];
  function* møblerG(pl, tilXY, åpninger, tilf) {
    const { ux, uy, vx, vy } = pl.akse, P = pl.P, satt = [];
    // rektangel i uv: midt (cu, cv), halv bredde langs (du, dv-retning), gyldig = inne i rommet og omrisset, ikke i en åpning, ikke oppå noe
    const prøv = (r, type, cu, cv, langsU, snu, o) => { o = o || TOM;
      const MB = MØBLER[type], b0 = MB[0], d0 = MB[1], h = MB[2], sperrer = MB[3], b = o.b || b0, dd = o.d || d0, hu = (langsU ? b : dd) / 2, hv = (langsU ? dd : b) / 2, m = o.margin === undefined ? .06 : o.margin;
      if (cu - hu < r.u0 + m || cu + hu > r.u1 - m || cv - hv < r.v0 + m || cv + hv > r.v1 - m) return null;
      // (20. nov: de billige sjekkene først, hjørnene mot omrisset til slutt – ingenting endres før møbelet settes, så svaret er det samme)
      const fri = o.fri === undefined ? .75 : o.fri;
      for (let q = 0; q < åpninger.length; q++) { const ou = åpninger[q][0], ov = åpninger[q][1]; if (Math.abs(ou - cu) < hu + fri && Math.abs(ov - cv) < hv + fri) return null; }
      // store møbler står aldri i gangveien fra en døråpning til rommets midte (ellers kan to møbler stenge et rom)
      if (sperrer && !o.iVeien && r.veier) for (let q = 0; q < r.veier.length; q++) { const V = r.veier[q]; if (cu + hu > V[0] && cu - hu < V[2] && cv + hv > V[1] && cv - hv < V[3]) return null; }
      const luft = o.luft === undefined ? .08 : o.luft;
      for (let q = 0; q < satt.length; q++) { const s = satt[q]; if (!(o.på && s === o.på) && Math.abs(s.cu - cu) < s.hu + hu + luft && Math.abs(s.cv - cv) < s.hv + hv + luft) return null; }
      for (let q = 0; q < 5; q++) { const su = HJØRNER[q * 2], sv = HJØRNER[q * 2 + 1], pu = cu + su * hu, pv = cv + sv * hv, x = pu * ux + pv * vx, y = pu * uy + pv * vy; if (!inniR(P, x, y) || nærKantR(P, x, y, .1)) return null; }
      const [x, y] = tilXY(cu, cv), a = Math.atan2(langsU ? uy : vy, langsU ? ux : vx) + (snu ? Math.PI : 0);
      // (i rom som er skåret av omrisset, stemmer ikke gangveiene: der sperrer ikke møblene)
      const it = { type, x, y, a, b, d: dd, h: o.h || h, sperrer: !!sperrer && r.andel > .97, cu, cv, hu, hv, f: tilf(), rolle: r.rolle }; if (!o.svev) satt.push(it); pl.møbler.push(it); return it;
    };
    // inntil en vegg: side 0–3, t = plass langs veggen (0–1)
    const vegg = (r, type, side, t, o) => { const [b0, d0] = MØBLER[type], b = (o && o.b) || b0, d = (o && o.d) || d0, lu = r.u1 - r.u0, lv = r.v1 - r.v0, k = .16 + d / 2;
      if (side === 0) return prøv(r, type, r.u0 + b / 2 + .1 + t * Math.max(0, lu - b - .2), r.v0 + k, true, false, o);
      if (side === 2) return prøv(r, type, r.u0 + b / 2 + .1 + t * Math.max(0, lu - b - .2), r.v1 - k, true, true, o);
      if (side === 1) return prøv(r, type, r.u1 - k, r.v0 + b / 2 + .1 + t * Math.max(0, lv - b - .2), false, false, o);
      return prøv(r, type, r.u0 + k, r.v0 + b / 2 + .1 + t * Math.max(0, lv - b - .2), false, true, o); };
    // prøv veggene i en fast, tilfeldig rekkefølge og noen plasser langs hver
    const etSted = (r, type, o, sider) => { const s0 = Math.floor(tilf() * 4), L = sider || SIDER;
      for (let k = 0; k < L.length; k++) for (const t of PLASSER) { const it = vegg(r, type, L[(k + s0) % L.length], t, o); if (it) { it.side = L[(k + s0) % L.length]; return it; } } return null; };
    // foran et møbel (inn i rommet), avstand fra fronten
    const foran = (r, it, type, avst, o) => { const [, d0] = MØBLER[type], dd = (o && o.d) || d0, s = it.side, q = it[s === 0 || s === 2 ? 'hv' : 'hu'] + avst + dd / 2;
      const cu = it.cu + (s === 3 ? q : s === 1 ? -q : 0), cv = it.cv + (s === 0 ? q : s === 2 ? -q : 0); const ny = prøv(r, type, cu, cv, s === 0 || s === 2, s === 0 || s === 3, o); if (ny) ny.side = s; return ny; };
    // rader i et rutenett: u-retningen er radene; du/dv = avstand mellom midtene
    // (generator: yield for hver åttende plass, så store haller kan planlegges i biter; brukes med yield*)
    const rutenett = function* (r, type, o) { const [b0, d0] = MØBLER[type], mU = o.mU || 1.2, mV = o.mV || 1.2, ut = []; let n = 0;
      for (let cv = r.v0 + mV + (o.langsU ? d0 : b0) / 2; cv < r.v1 - mV; cv += o.dv) for (let cu = r.u0 + mU + (o.langsU ? b0 : d0) / 2; cu < r.u1 - mU; cu += o.du) {
        if (++n % 8 === 0) yield 'rutenett';
        if (o.hopp && o.hopp(cu, cv)) continue; if (ut.length >= (o.maks || 60)) return ut; const it = prøv(r, type, cu, cv, !!o.langsU, !!o.snu, o); if (it) ut.push(it); }
      return ut; };
    // langs veggene: så mange som får plass, side om side (sider = lang/kort/alle)
    const rad = (r, type, maks, o, sider) => { const [b0] = MØBLER[type], b = (o && o.b) || b0, ut = [], lu = r.u1 - r.u0, lv = r.v1 - r.v0;
      for (const s of sider || SIDER) { const len = s === 0 || s === 2 ? lu : lv, n = Math.floor((len - .4) / (b + .1)); for (let k = 0; k < n && ut.length < maks; k++) { const it = vegg(r, type, s, n > 1 ? k / (n - 1) : .5, o); if (it) { it.side = s; ut.push(it); } } }
      return ut; };
    const bord = (r, n, type = 'spisebord', o) => { const lu0 = r.u1 - r.u0 >= r.v1 - r.v0, it = prøv(r, type, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, lu0, false, o) || prøv(r, type, r.u0 + (r.u1 - r.u0) * .35, r.v0 + (r.v1 - r.v0) * .6, true, false, o)
        || prøv(r, type, r.u0 + (r.u1 - r.u0) * .7, r.v0 + (r.v1 - r.v0) * .4, lu0, false, o);
      if (!it || type !== 'spisebord') return it; const lu = it.hu > it.hv;
      for (let k = 0; k < n; k++) { const s = k % 2 ? 1 : -1, t = n > 2 ? ((Math.floor(k / 2) / Math.max(1, Math.ceil(n / 2) - 1)) - .5) * Math.max(0, (lu ? it.hu : it.hv) * 2 - .5) : 0; prøv(r, 'stol', it.cu + (lu ? t : s * (it.hu + .32)), it.cv + (lu ? s * (it.hv + .32) : t), lu, lu ? s > 0 : s < 0, { luft: -.2, fri: .3 }); }
      return it; };
    // (ut9-mobler) et veggskap over et annet møbel (overskap over benken, vifte over komfyren, speilskap over vasken): samme vegg, ryggen
    // mot veggen, sperrer ikke og står ikke i veien for noe på gulvet
    const oppå = (r, it, type, o) => { if (!it || it.side === undefined) return null; const d0 = MØBLER[type][1], q = (it.d - d0) / 2, sd = it.side;
      const cu = it.cu + (sd === 1 ? q : sd === 3 ? -q : 0), cv = it.cv + (sd === 0 ? -q : sd === 2 ? q : 0);
      const ny = prøv(r, type, cu, cv, sd === 0 || sd === 2, sd === 2 || sd === 3, Object.assign({ svev: true, iVeien: true, fri: -50, luft: -100, margin: .02, b: Math.min(it.b, MØBLER[type][0]) }, o)); if (ny) ny.side = sd; return ny; };
    // midt i rommet, eller litt til siden når gangveien går gjennom midten
    const midtI = (r, type, o) => { const lu0 = r.u1 - r.u0 >= r.v1 - r.v0; for (const [a, b2] of [[.5, .5], [.5, .3], [.5, .7], [.35, .5], [.65, .5]]) { const it = prøv(r, type, r.u0 + (r.u1 - r.u0) * a, r.v0 + (r.v1 - r.v0) * b2, lu0, false, o); if (it) return it; } return null; };
    // fast valg per rom (ikke fra tilf(), så de andre møblene beholder sine tall)
    const rh = (r, q) => hash(pl.i, 9000 + pl.rom.indexOf(r) * 31 + q);
    // gangveiene: fra hver åpning i rommet rett inn fra veggen og så bort til rommets midte, 0,8 m brede
    for (const r of pl.rom) { const cu = (r.u0 + r.u1) / 2, cv = (r.v0 + r.v1) / 2, q = .4; r.veier = [];
      for (const [ou, ov] of åpninger) { if (ou < r.u0 - .3 || ou > r.u1 + .3 || ov < r.v0 - .3 || ov > r.v1 + .3) continue;
        const vFørst = Math.abs(ov - r.v0) < .8 || Math.abs(ov - r.v1) < .8, bo = (a0, b0, a1, b1) => r.veier.push([Math.min(a0, a1) - q, Math.min(b0, b1) - q, Math.max(a0, a1) + q, Math.max(b0, b1) + q]);
        if (vFørst) { bo(ou, ov, ou, cv); bo(ou, cv, cu, cv); } else { bo(ou, ov, cu, ov); bo(cu, ov, cu, cv); } }
      // rom som er åpne mot et annet (ingen vegg): gangvei over hele den åpne siden
      if (r.åpenMot) for (const o of r.åpenMot) { const mu = Math.max(r.u0, o.u0), Mu = Math.min(r.u1, o.u1), mv = Math.max(r.v0, o.v0), Mv = Math.min(r.v1, o.v1);
        if (Mu - mu > .5 || Mv - mv > .5) { const pu = (mu + Mu) / 2, pv = (mv + Mv) / 2; r.veier.push([Math.min(pu, cu) - q, Math.min(pv, cv) - q, Math.max(pu, cu) + q, Math.max(pv, cv) + q]); } } }
    // inngangens side i et rom: 0 v0, 1 u1, 2 v1, 3 u0 (eller -1 når inngangen ikke er i rommet)
    const iUv = pl.inngang.inn[0] * ux + pl.inngang.inn[1] * uy, iVv = pl.inngang.inn[0] * vx + pl.inngang.inn[1] * vy;
    const dørside = r => { if (iUv < r.u0 - .9 || iUv > r.u1 + .9 || iVv < r.v0 - .9 || iVv > r.v1 + .9) return -1; const D = [iVv - r.v0, r.u1 - iUv, r.v1 - iVv, iUv - r.u0]; return D.indexOf(Math.min(...D)); };
    for (const r of pl.rom) { yield 'rom';
      const A = r.areal, lu = r.u1 - r.u0, lv = r.v1 - r.v0, lang = lu >= lv ? [0, 2] : [1, 3], kort = lu >= lv ? [1, 3] : [0, 2];
      switch (r.rolle) {
        case 'stue': case 'allrom': {
          // hytter og eldre hus: vedovn i stua (først, så den får plass)
          if (pl.kl === 'hytte' || pl.stil === 'eldre') etSted(r, 'ovn', { fri: .6 }); else if (A > 15 && rh(r, 1) < .35) etSted(r, 'peis', { fri: .7 });
          // (ut9-mobler) hjørnesofa i store stuer, ellers vanlig sofa
          const s = (A > 18 && rh(r, 2) < .4 ? etSted(r, 'hjørnesofa', null, lang) : null) || etSted(r, 'sofa', null, lang) || etSted(r, 'sofa'); if (s) { foran(r, s, 'salongbord', .45, { fri: .3 }); }
          etSted(r, 'tvbenk', null, s ? [(s.side + 2) % 4] : null) || etSted(r, 'tvbenk'); etSted(r, 'bokhylle'); if (A > 14) etSted(r, rh(r, 3) < .3 ? 'gyngestol' : 'lenestol');
          if (A > 17 && rh(r, 4) < .25) etSted(r, 'piano'); if (A > 16 && rh(r, 5) < .5) etSted(r, 'vitrineskap'); etSted(r, 'plante', { fri: .5 });
          if (r.rolle === 'allrom') { const k = etSted(r, 'kjøkkenbenk', { b: Math.min(2.4, Math.max(1.2, Math.min(lu, lv) - 1)) }); if (k) etSted(r, 'kjøleskap'); if (A > 16) bord(r, 2); if (pl.rom.filter(q => q.rolle !== 'utenfor').length === 1) etSted(r, 'seng'); }
          else if (A > 20) { bord(r, 4); if (rh(r, 6) < .6) etSted(r, 'skjenk'); }
          break; }
        case 'kjøkken': { const kb = etSted(r, 'kjøkkenbenk', { b: Math.min(3, Math.max(1.4, Math.max(lu, lv) - 1.2)) }, lang) || etSted(r, 'kjøkkenbenk', { b: 1.4 }); oppå(r, kb, 'overskap');
          const kf = etSted(r, 'komfyr'); oppå(r, kf, 'vifte'); etSted(r, 'kjøleskap'); if (A > 7 && rh(r, 1) < .7) etSted(r, 'oppvaskmaskin');
          if (rh(r, 2) < .65) etSted(r, 'krydderhylle', { svev: true, fri: .3 });
          if (A > 13 && rh(r, 3) < .45 && midtI(r, 'kjøkkenøy', { fri: .9 })) break; if (A > 8) bord(r, A > 12 ? 4 : 2); break; }
        case 'soverom': { const barn = A < 9.5 && rh(r, 1) < .4 && pl.rom.filter(q => q.rolle === 'soverom').length > 1;
          const s = etSted(r, barn ? 'barneseng' : A > 9 ? 'dobbeltseng' : 'seng') || etSted(r, 'seng'); if (s && s.type !== 'barneseng') { const lU = s.side === 0 || s.side === 2;
          prøv(r, 'nattbord', s.cu + (lU ? s.hu + .3 : 0), s.cv + (lU ? 0 : s.hv + .3), lU, s.side === 2 || s.side === 3, { fri: .3 }); }
          (A > 10 && rh(r, 2) < .6 ? etSted(r, 'garderobe') : null) || etSted(r, 'skap'); if (A > 7 && rh(r, 3) < .6) etSted(r, 'kommode');
          if (s && s.type === 'dobbeltseng' && rh(r, 4) < .45) etSted(r, 'sminkebord'); if (A > 11) etSted(r, 'pult'); break; }
        case 'bad': { etSted(r, 'toalett', { fri: .5 }); const v = etSted(r, 'vask', { fri: .5 }); if (rh(r, 3) < .7) oppå(r, v, 'speilskap');
          (A > 5.5 && rh(r, 1) < .55 ? etSted(r, 'badekar', { fri: .5 }) : null) || etSted(r, 'dusj', { fri: .5 });
          if (rh(r, 2) < .5 && !pl.rom.some(q => q.rolle === 'vaskerom')) etSted(r, 'vaskemaskin', { fri: .4 }); break; }
        case 'gang': etSted(r, rh(r, 1) < .45 ? 'skoskap' : 'skohylle', { fri: .6 }); etSted(r, 'knagger', { fri: .5 }); if (A > 9) etSted(r, 'skap'); if (pl.kl === 'skole') { etSted(r, 'benk'); etSted(r, 'benk'); } break;
        case 'kontor': { const n = Math.max(1, Math.min(6, Math.floor(A / 7))); for (let k = 0; k < n; k++) { const p = etSted(r, 'pult'); if (p) foran(r, p, 'kontorstol', .1, { fri: .3, luft: -.1 }); } etSted(r, 'arkivskap'); etSted(r, rh(r, 1) < .4 ? 'permreol' : 'bokhylle');
          if (A > 12 && rh(r, 2) < .35) etSted(r, 'vannkjøler', { fri: .5 }); if (rh(r, 3) < .15) etSted(r, 'safe'); etSted(r, 'plante', { fri: .5 }); break; }
        case 'resepsjon': { const s = etSted(r, 'skranke', null, kort) || etSted(r, 'skranke'); if (s) foran(r, s, 'kontorstol', -1.3, { fri: .2, luft: -1 }); etSted(r, 'benk'); etSted(r, 'benk'); etSted(r, 'plante', { fri: .5 }); etSted(r, 'plante', { fri: .5 }); break; }
        case 'klasserom': { const t = etSted(r, 'tavle', { fri: .3 }, kort); etSted(r, 'kateter', null, t ? [t.side] : kort);
          yield* rutenett(r, 'skolepult', { du: 1.5, dv: 1.3, mU: lu >= lv ? 2.4 : 1, mV: lu >= lv ? 1 : 2.4, langsU: lu < lv, maks: 24 }); etSted(r, 'bokhylle'); break; }
        case 'sykerom': { const s = etSted(r, 'sykeseng'); if (s) { const lU = s.side === 0 || s.side === 2; prøv(r, 'nattbord', s.cu + (lU ? s.hu + .3 : 0), s.cv + (lU ? 0 : s.hv + .3), lU, false, { fri: .3 }); }
          if (A > 14) etSted(r, 'sykeseng'); etSted(r, 'stol', { fri: .4 }); etSted(r, 'vask', { fri: .5 }); break; }
        case 'butikk': yield* butikk(r); break;
        case 'lager': { for (let k = 0; k < Math.min(10, Math.floor(A / 5)); k++) etSted(r, k % 3 ? 'pall' : rh(r, k) < .5 ? 'stålreol' : 'hylle'); break; }
        case 'verksted': { for (let k = 0; k < Math.min(6, 1 + Math.floor(A / 60)); k++) etSted(r, k === 0 ? 'verkstedbenk' : 'arbeidsbenk'); etSted(r, 'verktøyvegg', { fri: .5 }); if (rh(r, 1) < .6) etSted(r, 'luftkompressor'); etSted(r, 'stålreol');
          yield* rutenett(r, 'maskin', { du: 7, dv: 6, mU: 3, mV: 3, langsU: lu >= lv, fri: 2, maks: 12 }); for (let k = 0; k < Math.min(8, Math.floor(A / 40)); k++) etSted(r, k % 2 ? 'pall' : 'tønne'); break; }
        case 'lagerhall': { const høy = pl.tak > 4.6; const satt = yield* rutenett(r, høy ? 'pallereol' : 'pall', { du: lu >= lv ? 3 : 4.2, dv: lu >= lv ? 4.2 : 3, mU: 2.5, mV: 2.5, langsU: lu >= lv, fri: 2.5, maks: 60, h: høy ? Math.min(4, pl.tak - .6) : undefined });
          // små lager (telt, boder): paller og hyller langs veggene i stedet
          if (!satt.length) for (let k = 0; k < Math.min(8, Math.floor(A / 4)); k++) etSted(r, k % 3 ? 'pall' : k % 2 ? 'stålreol' : 'hylle'); break; }
        case 'låve': { yield* rutenett(r, 'høyball', { du: 1.45, dv: 1.45, mU: 1, mV: 1, maks: 14, fri: 2, hopp: (cu, cv) => cu > r.u0 + lu * .45 }); for (let k = 0; k < Math.min(4, Math.floor(A / 40)); k++) etSted(r, 'bås', { fri: 1.5 });
          if (A > 90) prøv(r, 'traktor', r.u0 + lu * .7, (r.v0 + r.v1) / 2, lu < lv, false, { fri: 1.5 }); etSted(r, 'tønne'); break; }
        case 'garasje': { const i = pl.inngang, cu = i.inn[0] * ux + i.inn[1] * uy, cv = i.inn[0] * vx + i.inn[1] * vy, tvers = Math.abs(i.nx * ux + i.ny * uy) > .7;
          // bilen står rett innenfor porten, med nesa innover
          prøv(r, 'bil', tvers ? cu - Math.sign(i.nx * ux + i.ny * uy) * 2.6 : cu, tvers ? cv : cv - Math.sign(i.nx * vx + i.ny * vy) * 2.6, !tvers, false, { fri: 0, margin: .2 });
          etSted(r, rh(r, 1) < .5 ? 'stålreol' : 'hylle'); etSted(r, rh(r, 2) < .5 ? 'verkstedbenk' : 'arbeidsbenk', { b: 1.4 }); etSted(r, 'verktøyvegg', { fri: .5 });
          if (rh(r, 3) < .5) etSted(r, 'dekkstativ'); if (rh(r, 4) < .3) etSted(r, 'luftkompressor'); break; }
        case 'bod': etSted(r, 'hylle'); etSted(r, 'vedstabel'); if (A > 6) etSted(r, 'tønne'); if (A > 5 && rh(r, 1) < .5) etSted(r, 'stålreol'); break;
        case 'kirke': { const iU = lu >= lv, i = pl.inngang, cu = i.inn[0] * ux + i.inn[1] * uy, cv = i.inn[0] * vx + i.inn[1] * vy;
          // alteret i enden lengst fra inngangen, benkerader på hver side av midtgangen
          const fjern = iU ? (cu - r.u0 < r.u1 - cu ? 1 : 3) : (cv - r.v0 < r.v1 - cv ? 2 : 0); vegg(r, 'alter', fjern, .5, { fri: .5 });
          const midt = iU ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, bb = Math.max(1.4, Math.min(3.4, (iU ? lv : lu) / 2 - 1.5));
          yield* rutenett(r, 'kirkebenk', { b: bb, du: iU ? 1.25 : bb + 1.4, dv: iU ? bb + 1.4 : 1.25, mU: iU ? 3.5 : 1, mV: iU ? 1 : 3.5, langsU: !iU, snu: fjern === 1 || fjern === 2, maks: 44, fri: .9,
            hopp: (a, b) => Math.abs((iU ? b : a) - midt) < .75 }); etSted(r, 'prekestol', { fri: .6 }, [fjern]); etSted(r, 'døpefont', { fri: .8 }, [fjern]); break; }
        case 'hangar': { if (lu > 14 && lv > 12) prøv(r, 'fly', (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, lu >= lv, false, { fri: 2 }); for (let k = 0; k < 4; k++) etSted(r, k % 2 ? 'verktøyvogn' : 'arbeidsbenk'); break; }
        // leirens bygg: brakka har køyesenger langs langveggene, kontrollrommet kartbord og radio, kjøkkenet benker og langbord
        // drivhus: plantebed i rekker langs huset med gang mellom, vanntønne ved døra
        case 'drivhus': { const satt = yield* rutenett(r, 'plantebed', { du: lu >= lv ? 2.9 : 1.75, dv: lu >= lv ? 1.75 : 2.9, mU: .7, mV: .6, langsU: lu >= lv, fri: .8, maks: 16 });
          if (!satt.length) for (let k = 0; k < Math.min(6, Math.floor(A / 6)); k++) etSted(r, 'plantebed', { fri: .8 }, lang); etSted(r, 'tønne'); break; }
        case 'brakke': { for (let k = 0; k < (pl.senger ? Math.ceil(pl.senger / 2) : Math.min(12, Math.floor(A / 6))); k++) etSted(r, 'køyeseng', { fri: .9 }, lang) || etSted(r, 'køyeseng', { fri: .9 }); etSted(r, 'ovn', { fri: .8 }, kort); etSted(r, 'skap'); etSted(r, 'skap'); etSted(r, 'knagger', { fri: .5 }); break; }
        case 'kontrollrom': { prøv(r, 'kartbord', (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, lu >= lv, false, { iVeien: true, fri: 1.4 });
          for (let k = 0; k < 6; k++) { const p = etSted(r, 'pult'); if (p) foran(r, p, 'kontorstol', .1, { fri: .3, luft: -.1 }); } etSted(r, 'radio'); etSted(r, 'radio'); etSted(r, 'tavle', { fri: .3 }); etSted(r, 'arkivskap'); break; }
        case 'storkjøkken': { etSted(r, 'kjøkkenbenk', { b: Math.min(3, Math.max(lu, lv) - 2) }, lang); etSted(r, 'komfyr'); etSted(r, 'komfyr'); etSted(r, 'kjøleskap'); etSted(r, 'kjøleskap'); etSted(r, 'hylle');
          yield* rutenett(r, 'langbord', { du: lu >= lv ? 3.4 : 2.4, dv: lu >= lv ? 2.4 : 3.4, mU: 1.6, mV: 1.6, langsU: lu >= lv, maks: 3, fri: 1.2 }); break; }
        case 'terminal': { yield* rutenett(r, 'seterad', { du: lu >= lv ? 3.4 : 2.2, dv: lu >= lv ? 2.2 : 3.4, mU: 3, mV: 3, langsU: lu >= lv, maks: 30, fri: 2 }); etSted(r, 'skranke'); etSted(r, 'skranke'); break; }
        default: if (MØBELSETT[r.rolle]) yield* oppskrift(r, MØBELSETT[r.rolle], lang, kort);
      }
    }
    // MØBELSETT-motoren: én oppskrift per romtype (se tabellen over)
    function* oppskrift(r, steg, lang, kort) {
      const A = r.areal; let forrige = null;
      for (const [hva, type, ant, o0] of steg) { const o = o0 ? Object.assign({}, o0) : {}, sider = o.sider === 'lang' ? lang : o.sider === 'kort' ? kort : null; delete o.sider;
        const n = typeof ant === 'function' ? ant(A) : ant === undefined ? 1 : ant;
        if (hva === 'vegg') { for (let k = 0; k < n; k++) forrige = etSted(r, type, o, sider) || (sider ? etSted(r, type, o) : null) || forrige; }
        else if (hva === 'rad') rad(r, type, n, o, sider);
        else if (hva === 'midt' && n > 0) { const lu = r.u1 - r.u0 >= r.v1 - r.v0; forrige = null;
          // midt i rommet, eller litt til siden når gangveien går gjennom midten
          for (const [a, b] of [[.5, .5], [.5, .3], [.5, .7], [.35, .5], [.65, .5], [.3, .3], [.7, .7]]) { forrige = prøv(r, type, r.u0 + (r.u1 - r.u0) * a, r.v0 + (r.v1 - r.v0) * b, lu, false, o); if (forrige) break; } }
        else if (hva === 'foran' && forrige) foran(r, forrige, type, .1, o);
        else if (hva === 'bord') bord(r, n, type, o);
        else if (hva === 'seng') { const s = etSted(r, type); if (s) { const lU = s.side === 0 || s.side === 2; prøv(r, 'nattbord', s.cu + (lU ? s.hu + .3 : 0), s.cv + (lU ? 0 : s.hv + .3), lU, false, { fri: .3 }); } }
        else if (hva === 'par') { for (let k = 0; k < n; k++) { const p = etSted(r, type); if (!p) break; foran(r, p, 'kontorstol', .1, { fri: .3, luft: -.1 }); } }
        else if (hva === 'rutenett') { const lu = r.u1 - r.u0 >= r.v1 - r.v0; yield* rutenett(r, type, Object.assign({ langsU: lu, maks: n }, o)); }
        else if (hva === 'kran' && (r.u1 - r.u0) > 8 && pl.tak > 5) {
          // traverskranen: en bjelke på tvers av hallen oppe under taket (sperrer ikke), midt i hallen
          const lu = r.u1 - r.u0 >= r.v1 - r.v0, bredde = (lu ? r.v1 - r.v0 : r.u1 - r.u0) - .3; prøv(r, type, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, !lu, false, { b: bredde, h: pl.tak - .25, fri: -50, iVeien: true, luft: -100, margin: .02, svev: true }); }
      }
    }
    // BUTIKKEN (brukeren: reoler i rader med midtganger, kasser ved utgangen, kjøledisk, frukt og grønt, lager bak):
    // kundene kommer inn foran; kassene står på rad rett innenfor, til siden for døra; frukt og grønt like innenfor; reolene i rader
    // som går innover fra fronten med gang mellom og en midtgang på tvers; kjøledisker langs bakveggen og langs én langvegg.
    function* butikk(r) {
      const A = r.areal, lu = r.u1 - r.u0, lv = r.v1 - r.v0; let ds = dørside(r); if (ds < 0) ds = lu >= lv ? 0 : 3;
      const dybdeV = ds === 0 || ds === 2, bak = (ds + 2) % 4, dyp = dybdeV ? lv : lu, bred = dybdeV ? lu : lv;
      // avstand inn fra fronten (0 ved døra) og plass langs fronten (0 ved én side)
      const inn = (cu, cv) => ds === 0 ? cv - r.v0 : ds === 2 ? r.v1 - cv : ds === 3 ? cu - r.u0 : r.u1 - cu, langs = (cu, cv) => dybdeV ? cu - r.u0 : cv - r.v0;
      const pkt = (a, t) => { const cu = dybdeV ? r.u0 + t : (ds === 3 ? r.u0 + a : r.u1 - a), cv = dybdeV ? (ds === 0 ? r.v0 + a : r.v1 - a) : r.v0 + t; return [cu, cv]; };
      const iu0 = pl.inngang.inn[0] * ux + pl.inngang.inn[1] * uy, iv0 = pl.inngang.inn[0] * vx + pl.inngang.inn[1] * vy, dørT = langs(iu0, iv0);
      // kassene: på rad 2,4 m inn fra fronten, på den siden av døra med mest plass, med 1,2 m mellom
      const front = Math.min(4.2, Math.max(2.6, dyp * .22)), mot = dørT > bred / 2 ? -1 : 1, nk = Math.max(1, Math.min(4, Math.floor(A / 120) + 1));
      for (let k = 0; k < nk; k++) { const t = dørT + mot * (2.2 + k * 2.4); if (t < 1 || t > bred - 1) break; const [cu, cv] = pkt(2.1, t); prøv(r, 'kasse', cu, cv, !dybdeV, false, { fri: .9 }); }
      // frukt og grønt like innenfor, på den andre siden av døra
      { const t = dørT - mot * 2.8; if (t > 1.4 && t < bred - 1.4) { const [cu, cv] = pkt(front + .9, t); prøv(r, 'fruktdisk', cu, cv, dybdeV ? true : false, false, { fri: .8 }); } }
      // kjøledisker langs bakveggen og den lengste veggen på siden, fryser foran kjøledisken
      rad(r, 'kjøledisk', Math.max(1, Math.floor(bred / 3)), { fri: 1.2 }, [bak]); if (A > 150) rad(r, 'kjøledisk', 2, { fri: 1.2 }, [dybdeV ? (mot > 0 ? 3 : 1) : (mot > 0 ? 0 : 2)]);
      // reolene: rader innover fra fronten, 2,7 m mellom radene, midtgang på tvers, fri sone foran og ved bakveggen
      const midt = dyp * .55;
      // (ut9-mobler) halve butikkene har gondoler (lavere, dobbeltsidige reoler), resten høye reoler
      const reolType = hash(pl.i, 77) < .5 ? 'gondol' : 'reol';
      // med gondoler i midten står de høye reolene langs den andre langveggen
      if (reolType === 'gondol') rad(r, 'reol', Math.max(1, Math.floor(dyp / 3.2)), { fri: 1.2 }, [dybdeV ? (mot > 0 ? 1 : 3) : (mot > 0 ? 2 : 0)]);
      yield* rutenett(r, reolType, { du: dybdeV ? 2.7 : 2.5, dv: dybdeV ? 2.5 : 2.7, mU: 1.6, mV: 1.6, langsU: !dybdeV, fri: 1.4, maks: 48, iVeien: true,
        hopp: (cu, cv) => { const a = inn(cu, cv); return a < front + 2.2 || a > dyp - 2.4 || Math.abs(a - midt) < 1.3; } });
      if (!pl.møbler.some(m => m.type === 'kasse')) etSted(r, 'kasse');
      // frysedisk, drikkekjølere og handlevogner der det er plass langs veggene
      if (A > 60) etSted(r, 'frysedisk', { fri: 1.2 }); for (let k = 0; k < (A > 150 ? 3 : A > 40 ? 2 : 1); k++) etSted(r, 'drikkekjøler', { fri: 1 }); etSted(r, 'vognrekke', { fri: 1 });
    }
  }

  // Kollisjon: sant når (x, y) er i en vegg eller et stort møbel. Utenfor omrisset sperrer bare selve ytterveggen.
  function blokkert(pl, x, y) {
    // (B2) en annen etasje enn 1. (spill/etasjer3d.js setter pl.over mens du er i huset): undefined = som før
    if (pl.over) { const v = pl.over(x, y); if (v !== undefined) return v; }
    const b = pl.bb; if (x < b[0] - .5 || x > b[2] + .5 || y < b[1] - .5 || y > b[3] + .5) return false;
    for (const s of pl.ytre) if (avstSeg(x, y, s.ax, s.ay, s.bx, s.by) < VEGG) return true;
    if (!inni(pl.P, x, y)) return false;
    for (const s of pl.vegger) if (avstSeg(x, y, s.ax, s.ay, s.bx, s.by) < VEGG) return true;
    for (const m of pl.møbler) { if (!m.sperrer) continue; const dx = x - m.x, dy = y - m.y, c = Math.cos(m.a), si = Math.sin(m.a); if (Math.abs(dx * c + dy * si) < m.b / 2 && Math.abs(-dx * si + dy * c) < m.d / 2) return true; }
    return false;
  }
  // INNGANGENE STÅR FRITT (ut7, 28. nov): en plan som er laget av noe annet enn plan() (1. etasje fra byggemodellen i etasjer3d.js)
  // kan ha en skillevegg eller et stort møbel rett innenfor en inngang når modellens dør ikke står der 3D-huset har døra. friInngang
  // tar bort veggbitene og de sperrende møblene i en sone innenfor hver inngang: døras bredde (+ FRI.side på hver side), fra FRI.ut
  // utenfor veggen til FRI.inn innover. Gir antallet som ble tatt bort. (Tallene er Claudes forslag.)
  const FRI = { side: 0, ut: .3, inn: 1.6 };
  function friInngang(pl) {
    let tatt = 0; const L = (pl.innganger || [pl.inngang]).filter(Boolean);
    for (const i of L) {
      const S = i.w / 2 + FRI.side, lok = (x, y) => [(x - i.x) * i.ux + (y - i.y) * i.uy, -((x - i.x) * i.nx + (y - i.y) * i.ny)];
      const inne = (x, y) => { const [s, d] = lok(x, y); return Math.abs(s) < S && d > -FRI.ut && d < FRI.inn; };
      // veggene: delen av hver vegg inne i sonen klippes bort (Liang–Barsky i døras akser)
      const ny = [];
      for (const w of pl.vegger) { const [s0, d0] = lok(w.ax, w.ay), [s1, d1] = lok(w.bx, w.by), ds = s1 - s0, dd = d1 - d0; let t0 = 0, t1 = 1, ute = false;
        for (const [p, q] of [[-ds, s0 + S], [ds, S - s0], [-dd, d0 + FRI.ut], [dd, FRI.inn - d0]]) { if (Math.abs(p) < 1e-12) { if (q < 0) ute = true; continue; } const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); }
        if (ute || t0 >= t1) { ny.push(w); continue; } tatt++;
        const pkt = t => [w.ax + (w.bx - w.ax) * t, w.ay + (w.by - w.ay) * t], Lw = Math.hypot(w.bx - w.ax, w.by - w.ay);
        if (t0 * Lw > .05) { const b = pkt(t0); ny.push(Object.assign({}, w, { bx: b[0], by: b[1] })); }
        if ((1 - t1) * Lw > .05) { const a = pkt(t1); ny.push(Object.assign({}, w, { ax: a[0], ay: a[1] })); } }
      pl.vegger = ny;
      // møbler som sperrer: bort når midten, et hjørne eller midten av en kant er i sonen
      pl.møbler = pl.møbler.filter(m => { if (!m.sperrer) return true; const c = Math.cos(m.a || 0), s = Math.sin(m.a || 0);
        for (const [a, b] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const lx = a * m.b / 2, ly = b * m.d / 2; if (inne(m.x + lx * c - ly * s, m.y + lx * s + ly * c)) { tatt++; return false; } }
        return true; });
    }
    return tatt;
  }
  // Høyden du står på: gulvet inne, og en trapp/rampe de siste meterne foran hver dør (i.trapp, ellers pl.trapp, ellers 1,5 m;
  // terreng(x, y) = bakken). null = vanlig terreng.
  function høyde(pl, x, y, terreng) {
    const b = pl.bb; if (x < b[0] - 7 || x > b[2] + 7 || y < b[1] - 7 || y > b[3] + 7) return null;
    if (inni(pl.P, x, y)) return pl.gulv;
    for (const i of pl.innganger || [pl.inngang]) { const dx = x - i.x, dy = y - i.y, ut = dx * i.nx + dy * i.ny, langs = Math.abs(dx * i.ux + dy * i.uy), L = i.trapp || pl.trapp || 1.5;
      if (ut >= -.3 && ut < L && langs < i.w / 2 + .15) { const t = Math.max(0, ut) / L; return pl.gulv * (1 - t) + terreng(x, y) * t; } }
    return null;
  }
  // På trappa foran en dør eller i selve døråpningen
  function påTrapp(pl, x, y) { for (const i of pl.innganger || [pl.inngang]) { const dx = x - i.x, dy = y - i.y, ut = dx * i.nx + dy * i.ny; if (ut >= -.8 && ut < (i.trapp || pl.trapp || 1.5) + .3 && Math.abs(dx * i.ux + dy * i.uy) < i.w / 2 + .15) return true; } return false; }
  const api = { KLASSE, TYPER, ROMSETT, MØBELSETT, TILGANG, ALDRI_VED_DØR, STILER, ÅR, TAK_MIN, MØBLER, VEGGHENGT, VEGG, FRI, plan, planG, takhøyde, velgStil, type, nærKant, inniR, nærKantR, blokkert, friInngang, høyde, påTrapp, inni, avstSeg, avstKant };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Interior = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
