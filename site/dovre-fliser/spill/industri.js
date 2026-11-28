/* INDUSTRIEN I BYGGENE: regler uten DOM (Node: require('./industri'); nettleser: globalThis.Industri). 28. nov, ut8-industri.
 * Brukeren: «Se etter et system som kan ha forskjellige industrimaskiner til forskjellige industribygg – om du kan lese hva slags
 * industri et bygg hører til, f.eks. tømmer, olje, gass, bergarter, fiskeindustri osv. – for å ha korrekt innredning.»
 *
 *  - IND: industritypene (samme nummer som `ind` i husdataene fra pipeline/fliser/bygninger.py).
 *  - type(bygg, omg): industritypen for et bygg – fra bygg.ind når dataene har den, ellers fra navnet, ellers et anslag fra
 *    omgivelsene (omg, Claudes regler: kai og fiskevær -> fisk, oljeanlegg -> olje/gass, kraftverk -> kraft, bratt fjell -> stein,
 *    skogbygd -> tømmer …). Samme bygg og samme omgivelser gir alltid samme svar (fast trekning med byggets nummer).
 *  - innredning(type): maskinene og utstyret som hører til typen: [{ type, navn, b, d, h, plass, antall, rom }].
 *  - koble(Interior): legger maskinene inn i Interior.MØBLER, oppskriftene i Interior.MØBELSETT, romsettene i Interior.ROMSETT og
 *    gjør at klassene «industri» og «lager» velger romsett etter industritypen (i stedet for den samme verkstedmaskinen overalt).
 *    Skjer av seg selv i nettleseren når interior.js er lastet før denne fila.
 *  - deler(m, k): enkle kasse-modeller av maskinene for 3D-interiøret (spill/interior3d.js kaller den for møbeltyper den ikke kjenner).
 *    MODELLER[type] = (m, k, F) => true kan byttes ut av den som lager finere modeller; k(x0, x1, y0, y1, z0, z1, farge, stoff, rund).
 *  - omgivelser(info): bare i nettleseren (nederst) – avstander fra INFRA, kaiene og høydedataene.
 * ALLE TALL ER CLAUDES FORSLAG.
 */
(function (rot) {
  'use strict';

  // ---------- typene (nummer = `ind` i husdataene) ----------
  // kort: i tekster («Industri – fiskeforedling»), merke: tegnet på taket i 2D (kartflis.js), hall/bak: rollene i interiøret,
  // prod: maskintypen i spill/produksjon.js som hører til (for senere: kjøpe/ta over et bygg som fabrikk)
  const IND = {
    0: { navn: 'ukjent', kort: 'industri', hall: null },
    1: { navn: 'tømmer/sagbruk', kort: 'sagbruk og tømmer', hall: 'sagbrukshall', bak: 'tørkeloft', prod: 'sagbruk' },
    2: { navn: 'trevare/snekker', kort: 'snekkerverksted og trevare', hall: 'snekkerverksted', bak: 'lakkrom' },
    3: { navn: 'olje', kort: 'olje', hall: 'oljehall', bak: 'styrerom', prod: 'raffineri' },
    4: { navn: 'gass', kort: 'gass', hall: 'gasshall', bak: 'styrerom' },
    5: { navn: 'stein/pukk/gruve', kort: 'stein, pukk og grus', hall: 'knuserhall', bak: 'lager', prod: 'steinknuser' },
    6: { navn: 'fisk/sjømat', kort: 'fiskeforedling', hall: 'fiskehall', bak: 'fryselager', prod: 'fiskemottak' },
    7: { navn: 'mat/meieri/slakteri', kort: 'matproduksjon', hall: 'mathall', bak: 'kjølerom', prod: 'mølle' },
    8: { navn: 'metall/verksted/smie', kort: 'mekanisk verksted', hall: 'metallverksted', bak: 'lager', prod: 'smie' },
    9: { navn: 'båt/verft', kort: 'båtbyggeri og verft', hall: 'verftshall', bak: 'lager' },
    10: { navn: 'kraft/energi', kort: 'kraft og energi', hall: 'turbinhall', bak: 'styrerom' },
    11: { navn: 'lager/logistikk', kort: 'lager og logistikk', hall: 'lagerhall', bak: 'kontor' },
    12: { navn: 'gjenvinning/avfall', kort: 'gjenvinning', hall: 'sorteringshall', bak: 'kontor' },
    13: { navn: 'bryggeri/drikke', kort: 'bryggeri', hall: 'bryggerhall', bak: 'kjølerom' },
    14: { navn: 'kjemi/plast', kort: 'kjemi og plast', hall: 'kjemihall', bak: 'lager' },
  };
  const ALLE = Object.keys(IND).map(Number).filter(n => n > 0);

  // ---------- REGLER (Claudes forslag) ----------
  const REGLER = {
    // avstander i meter
    kai: { nær: 400, middels: 1500 },          // kai eller havn
    olje: { nær: 3000, langt: 10000 },          // oljeterminal / raffineri på land (INFRA.olje type 3)
    kraft: { nær: 800, middels: 2000 },         // kraftverk
    fiskevær: { folk: 3000, moh: 25 },          // et lite tettsted ved sjøen (innbyggere under, høyde under)
    bratt: .35,                                 // helning (høydeforskjell / avstand) rundt bygget som teller som bratt fjell
    skogbygd: { tett: 10, moh: [100, 750], kai: 3000 },
    // vektene i trekningen (større = oftere). grunn = alltid med, så et bygg uten noe spesielt rundt seg blir verksted, lager eller mat.
    grunn: { 8: 1.5, 11: 1, 7: .6, 2: .4, 12: .3, 14: .2, 13: .1 },
    vekt: { fiskNær: 8, fiskMiddels: 2, båt: 1.2, olje: 5, oljeLangt: 1, gassAndel: .3, kraftNær: 4, kraftMiddels: 1, bratt: 3, høyt: 1, skog: 3, nabo: 2 },
    // uten omgivelser (i Node, eller før kartdataene er lest): bare høyden, tettheten og størrelsen (som den gamle regelen i interior.js)
    uten: { olje: .25, tre: .5, treBy: .3 },
  };

  // Ord i navnet (samme rekkefølge og ord som IND_ORD i bygninger.py)
  const ORD = [[9, /verft|båtbyggeri|skipsbyggeri|slipp(en)?\b|shipyard|boatyard/], [6, /fisk|sjømat|fryseri|seafood|laks|sild|reker|trandamp|filet|hermetikk/],
    [1, /sagbruk|(^|[^a-zæøå])sag($|[^a-zæøå])|trelast|sawmill|tømmer|høvleri/], [2, /snekker|møbel|trevare|ferdighus|treindustri|joinery/],
    [13, /bryggeri|brenneri|brewery/], [7, /meieri|slakteri|bakeri|mølle|kjøtt|(^|[^a-zæøå])mat($|[^a-zæøå])|næringsmiddel|nortura|dairy/],
    [4, /(^|[^a-zæøå])gass($|[^a-zæøå])|gassterminal|(^|[^a-z])lng($|[^a-z])/], [3, /olje|raffineri|petro|tankanlegg/],
    [5, /pukk|steinbrudd|(^|[^a-zæøå])grus|sement|betong|gruve|(^|[^a-zæøå])stein|quarry|knuseverk/], [14, /kjemi|plast|maling|gjødsel/],
    [12, /gjenvinning|skrap|avfall|renovasjon|renseanlegg|recycling/], [10, /kraftstasjon|kraftverk|transformator|trafo|energi|fjernvarme/],
    [8, /(^|[^a-zæøå])mek($|[^a-zæøå])|mekanisk|verksted|(^|[^a-zæøå])stål|metall|sveis|smie|aluminium|støperi/], [11, /lager|logistikk|terminal|transport|spedisjon/]];
  // den gamle teksten i info.industri (OSM industrial/craft) kan også være engelske verdier
  const ENG = [[1, /sawmill|timber|lumber|wood/], [2, /carpent|joiner|furniture/], [3, /oil|refinery|petroleum|fuel/], [4, /(^|[^a-z])gas/], [5, /quarry|mine|gravel|cement|concrete|stone/],
    [6, /fish|seafood/], [7, /food|dairy|slaughter|bakery|meat/], [8, /metal|steel|weld|blacksmith|mechanic/], [9, /ship|boat/], [10, /power|electric/],
    [11, /warehouse|logistic|depot|port/], [12, /scrap|recycl|waste/], [13, /brew|distill/], [14, /chemi|plastic/]];
  function fraNavn(t) {
    t = String(t || '').toLowerCase(); if (!t.trim()) return 0;
    for (const [n, r] of ORD) if (r.test(t)) return n;
    for (const [n, r] of ENG) if (r.test(t)) return n;
    return 0;
  }

  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // trekning med vekter: fast per bygg (frø = byggets nummer)
  function trekk(vekter, frø) {
    const liste = Object.entries(vekter).filter(([, v]) => v > 0).sort((a, b) => +a[0] - +b[0]); let sum = 0; for (const [, v] of liste) sum += v;
    if (!sum) return 0; let f = hash(frø | 0, 811) * sum;
    for (const [n, v] of liste) { f -= v; if (f < 0) return +n; }
    return +liste[liste.length - 1][0];
  }

  // Vektene for et bygg ut fra omgivelsene. omg = { moh, kai, fiskevær, olje, kraft, bratt, skog, tett, nabo: { type: antall } } (alt valgfritt)
  function vekter(bygg, omg) {
    const V = REGLER.vekt, W = Object.assign({}, REGLER.grunn), leggTil = (n, v) => { W[n] = (W[n] || 0) + v; };
    const moh = omg.moh !== undefined && omg.moh !== null ? omg.moh : bygg.moh, tett = omg.tett !== undefined ? omg.tett : bygg.tett;
    const kai = omg.kai === undefined ? Infinity : omg.kai, olje = omg.olje === undefined ? Infinity : omg.olje, kraft = omg.kraft === undefined ? Infinity : omg.kraft;
    if (kai < REGLER.kai.nær && (omg.fiskevær || (moh !== undefined && moh < 15))) leggTil(6, V.fiskNær);
    else if (kai < REGLER.kai.middels && moh !== undefined && moh < 20) leggTil(6, V.fiskMiddels);
    if (kai < REGLER.kai.nær / 1.3) leggTil(9, V.båt);
    if (olje < REGLER.olje.nær) { leggTil(3, V.olje * (1 - V.gassAndel)); leggTil(4, V.olje * V.gassAndel); }
    else if (olje < REGLER.olje.langt) { leggTil(3, V.oljeLangt * (1 - V.gassAndel)); leggTil(4, V.oljeLangt * V.gassAndel); }
    if (kraft < REGLER.kraft.nær) leggTil(10, V.kraftNær); else if (kraft < REGLER.kraft.middels) leggTil(10, V.kraftMiddels);
    if ((omg.bratt || 0) > REGLER.bratt) leggTil(5, V.bratt); if (moh !== undefined && moh > 600) leggTil(5, V.høyt);
    const S = REGLER.skogbygd, skogbygd = (omg.skog || 0) > .4 || (tett !== undefined && tett < S.tett && moh !== undefined && moh >= S.moh[0] && moh <= S.moh[1] && kai > S.kai);
    if (skogbygd) { leggTil(1, V.skog); leggTil(2, V.skog * .4); }
    // naboene: industribygg rundt med kjent type trekker i samme retning (et bygg ved et sagbruk hører trolig til sagbruket)
    for (const [n, a] of Object.entries(omg.nabo || {})) if (+n > 0 && IND[n]) leggTil(+n, V.nabo * Math.min(3, a));
    return W;
  }

  // INDUSTRITYPEN for et bygg. bygg = { i, ind, navn, industri, kl, areal, h, moh, tett }, omg = omgivelsene (eller null).
  function type(bygg, omg) {
    bygg = bygg || {};
    if (bygg.ind > 0 && IND[bygg.ind]) return bygg.ind | 0;
    const n = fraNavn((bygg.industri || '') + ' ' + (bygg.navn || '')); if (n) return n;
    const frø = bygg.i | 0;
    if (omg) return trekk(vekter(bygg, omg), frø);
    // uten omgivelser: som den gamle regelen i interior.js (olje nær havet i store bygg, tre på landet, ellers metall)
    const U = REGLER.uten, f = hash(frø, 802), olje = bygg.moh !== undefined && bygg.moh < 25 && bygg.areal > 600 ? U.olje : .08, tre = (bygg.tett || 0) < 10 ? U.tre : U.treBy;
    return f < olje ? 3 : f < olje + tre ? 1 : 8;
  }
  // er typen lest fra dataene (true) eller anslått (false)?
  const kjent = bygg => !!bygg && ((bygg.ind > 0 && !!IND[bygg.ind]) || !!fraNavn((bygg.industri || '') + ' ' + (bygg.navn || '')));
  const navn = t => (IND[t] || IND[0]).navn, kort = t => (IND[t] || IND[0]).kort;
  // «Industri – fiskeforedling»
  const tekst = (t, forran) => (forran || 'Industri') + (t > 0 && IND[t] ? ' – ' + IND[t].kort : '');

  // ---------- MASKINENE: [bredde langs veggen, dybde, høyde, sperrer] (som Interior.MØBLER) + navn ----------
  const MASKINER = {
    kantverk: [4, 1.6, 1.3, 1, 'Kantverk'], tømmerstabel: [5, 2.2, 1.6, 1, 'Tømmerstabel'], transportbånd: [6, .9, 1, 1, 'Transportbånd'], tørkeovn: [1.6, 1.1, 2, 1, 'Tørkeovn'],
    høvelbenk: [2.2, .8, .9, 1, 'Høvelbenk'], bordsag: [2, 1.6, 1, 1, 'Bordsag'], båndsag: [.9, .9, 1.9, 1, 'Båndsag'], limpresse: [3, 1.2, 1.4, 1, 'Limpresse'], lakkbås: [3, 2.4, 2.2, 1, 'Lakkbås'],
    pumpe: [1.4, .8, 1.1, 1, 'Pumpe'], gasstank: [6, 2.6, 2.8, 1, 'Gasstank (liggende)'], kompressor: [2.4, 1.4, 1.8, 1, 'Kompressor'], gassflasker: [1.2, .6, 1.5, 1, 'Gassflasker'],
    knuser: [3.5, 3, 3.2, 1, 'Steinknuser'], sikt: [4, 2.2, 2.4, 1, 'Sikt'], grushaug: [5, 5, 2.2, 1, 'Grushaug'], hjullaster: [2.6, 7, 3.2, 1, 'Hjullaster'],
    sløyebenk: [3, 1, .95, 1, 'Sløyebenk'], filetmaskin: [3.5, 1.4, 1.5, 1, 'Filetmaskin'], frysetunnel: [6, 2.4, 2.6, 1, 'Frysetunnel'], iskar: [1.2, 1, .8, 1, 'Kar med is'], pakkebord: [2.4, 1, .9, 1, 'Pakkebord'],
    kokekar: [1.6, 1.6, 1.4, 1, 'Kokekar'], pakkemaskin: [3, 1.4, 1.7, 1, 'Pakkemaskin'], stålbenk: [2.4, .8, .9, 1, 'Benk i rustfritt stål'], kjølereol: [2, .6, 2, 1, 'Kjølereol'],
    dreiebenk: [2.6, 1, 1.4, 1, 'Dreiebenk'], platesaks: [3, 1.6, 1.4, 1, 'Platesaks'], esse: [1.2, 1, 1.2, 1, 'Esse (smie)'], ambolt: [.6, .35, .8, 1, 'Ambolt'],
    båtbukk: [4, 11, 3.6, 1, 'Båt på bukker'],
    generator: [4, 4, 3.5, 1, 'Generator'], transformator: [3, 2.2, 2.8, 1, 'Transformator'],
    avfallscontainer: [4, 2, 1.6, 1, 'Container'], ballepresse: [2.2, 1.4, 2.4, 1, 'Ballepresse'], skraphaug: [4, 4, 1.8, 1, 'Skraphaug'],
    bryggekjele: [2, 2, 2.4, 1, 'Bryggekjele'], gjæringstank: [2, 2, 4, 1, 'Gjæringstank'], tappelinje: [6, 1.2, 1.6, 1, 'Tappelinje'], fat: [.6, .6, .9, 1, 'Fat'],
    reaktor: [2.6, 2.6, 3.5, 1, 'Reaktor'], blandetank: [2, 2, 2.5, 1, 'Blandetank'], sprøytestøper: [4, 1.6, 2, 1, 'Sprøytestøpemaskin'], kjemikalieskap: [1.2, .6, 1.9, 1, 'Kjemikalieskap'],
    truck: [1.2, 2.4, 2.1, 1, 'Gaffeltruck'],
  };
  // navnene på møbler interior.js har fra før og som brukes her
  const ANDRE_NAVN = { sagbenk: 'Sagbenk', plankestabel: 'Plankestabel', tørkestativ: 'Tørkestativ', arbeidsbenk: 'Arbeidsbenk', tank: 'Tank', rørgate: 'Rørgate', ventil: 'Ventiltavle',
    tavlepanel: 'Tavlepanel', traverskran: 'Traverskran', sveisebås: 'Sveisebås', stålplater: 'Stålplater', maskin: 'Maskin', verktøyvogn: 'Verktøyvogn', pall: 'Pall',
    pallereol: 'Pallereol', hylle: 'Hylle', tønne: 'Tønne', pult: 'Pult', arkivskap: 'Arkivskap', vedstabel: 'Vedstabel' };

  // ---------- OPPSKRIFTENE per rom (samme form som Interior.MØBELSETT) ----------
  // [hva, type, antall (tall eller funksjon av arealet A), valg]: 'vegg', 'rad', 'midt', 'rutenett', 'kran', 'par' – se interior.js.
  const OPPSKRIFT = {
    sagbrukshall: [['midt', 'sagbenk', 1, { fri: 2 }], ['vegg', 'kantverk', A => A > 150 ? 1 : 0, { fri: 1.6, sider: 'lang' }], ['rad', 'tømmerstabel', A => Math.min(4, Math.floor(A / 90)), { fri: 1.6, sider: 'lang' }],
      ['vegg', 'transportbånd', A => A > 250 ? 1 : 0, { fri: 1.4 }], ['rad', 'plankestabel', A => Math.min(6, Math.floor(A / 60)), { fri: 1.6 }], ['vegg', 'arbeidsbenk', 1]],
    tørkeloft: null,     // finnes i interior.js (tørkestativ)
    lakkrom: [['vegg', 'lakkbås', 1, { fri: 1.2 }], ['vegg', 'hylle', 2], ['vegg', 'tønne', 2]],
    snekkerverksted: [['rutenett', 'høvelbenk', 8, { du: 4, dv: 3.4, mU: 2.2, mV: 2.2, fri: 1.4 }], ['vegg', 'bordsag', 1, { fri: 1.4 }], ['vegg', 'båndsag', 1, { fri: 1 }],
      ['vegg', 'limpresse', A => A > 120 ? 1 : 0, { fri: 1.2 }], ['rad', 'plankestabel', A => Math.min(4, Math.floor(A / 80)), { fri: 1.4 }], ['vegg', 'arbeidsbenk', 2]],
    oljehall: [['rutenett', 'tank', 8, { du: 6, dv: 6, mU: 3, mV: 3, fri: 2 }], ['rad', 'rørgate', A => Math.min(8, Math.floor(A / 90)), { fri: 1.4 }], ['vegg', 'pumpe', A => Math.min(4, 1 + Math.floor(A / 200)), { fri: 1 }],
      ['vegg', 'ventil', A => Math.min(6, Math.floor(A / 100)), { fri: 1 }], ['vegg', 'tønne', 3]],
    gasshall: [['rutenett', 'gasstank', 6, { du: 8, dv: 4.2, mU: 3, mV: 3, fri: 2 }], ['vegg', 'kompressor', A => Math.min(3, 1 + Math.floor(A / 250)), { fri: 1.2 }], ['rad', 'rørgate', A => Math.min(6, Math.floor(A / 100)), { fri: 1.4 }],
      ['vegg', 'ventil', A => Math.min(5, Math.floor(A / 100)), { fri: 1 }], ['vegg', 'gassflasker', 2, { fri: .8 }]],
    styrerom: [['vegg', 'tavlepanel', 3, { sider: 'lang' }], ['par', 'pult', 2], ['vegg', 'arkivskap', 1]],
    knuserhall: [['midt', 'knuser', 1, { fri: 2.5 }], ['vegg', 'sikt', 1, { fri: 2 }], ['vegg', 'transportbånd', A => Math.min(2, Math.floor(A / 150)), { fri: 1.6 }],
      ['rutenett', 'grushaug', 4, { du: 7, dv: 7, mU: 3, mV: 3, fri: 2.5 }], ['midt', 'hjullaster', A => A > 260 ? 1 : 0, { fri: 2 }]],
    fiskehall: [['rad', 'sløyebenk', A => Math.min(4, 1 + Math.floor(A / 120)), { fri: 1.4, sider: 'lang' }], ['midt', 'filetmaskin', 1, { fri: 1.6 }], ['vegg', 'frysetunnel', A => A > 160 ? 1 : 0, { fri: 1.6, sider: 'lang' }],
      ['vegg', 'iskar', A => Math.min(6, 2 + Math.floor(A / 100)), { fri: .9 }], ['vegg', 'pakkebord', A => Math.min(3, 1 + Math.floor(A / 150)), { fri: 1.2 }], ['vegg', 'pall', 2]],
    fryselager: [['rad', 'kjølereol', 6, { fri: 1.2 }], ['rutenett', 'pall', 12, { du: 2.2, dv: 2.6, mU: 1.6, mV: 1.6, fri: 1.4 }], ['vegg', 'iskar', 2, { fri: .8 }]],
    mathall: [['rutenett', 'kokekar', 6, { du: 3.6, dv: 3.6, mU: 2.4, mV: 2.4, fri: 1.4 }], ['vegg', 'pakkemaskin', A => Math.min(2, 1 + Math.floor(A / 300)), { fri: 1.4 }],
      ['vegg', 'stålbenk', A => Math.min(5, 1 + Math.floor(A / 80)), { fri: 1 }], ['vegg', 'pall', 2]],
    kjølerom: [['rad', 'kjølereol', 6, { fri: 1.1 }], ['vegg', 'pall', 3]],
    metallverksted: [['kran', 'traverskran'], ['rutenett', 'dreiebenk', 6, { du: 5, dv: 4, mU: 3, mV: 3, fri: 1.6 }], ['vegg', 'platesaks', A => A > 150 ? 1 : 0, { fri: 1.4 }],
      ['vegg', 'sveisebås', A => Math.min(3, 1 + Math.floor(A / 300)), { fri: 1.2 }], ['vegg', 'esse', 1, { fri: 1.2 }], ['vegg', 'ambolt', 1, { fri: 1 }],
      ['rad', 'stålplater', A => Math.min(4, Math.floor(A / 120)), { fri: 1.4 }], ['vegg', 'arbeidsbenk', 2], ['vegg', 'verktøyvogn', 1]],
    verftshall: [['kran', 'traverskran'], ['midt', 'båtbukk', 1, { fri: 2 }], ['vegg', 'sveisebås', A => Math.min(2, 1 + Math.floor(A / 400)), { fri: 1.2 }],
      ['rad', 'stålplater', A => Math.min(4, Math.floor(A / 150)), { fri: 1.4 }], ['vegg', 'plankestabel', 1, { fri: 1.4 }], ['vegg', 'arbeidsbenk', 2], ['vegg', 'verktøyvogn', 2]],
    turbinhall: [['kran', 'traverskran'], ['rutenett', 'generator', 4, { du: 8, dv: 8, mU: 3, mV: 3, fri: 2 }], ['vegg', 'transformator', A => Math.min(3, 1 + Math.floor(A / 300)), { fri: 1.6 }],
      ['vegg', 'tavlepanel', 2, { fri: 1 }], ['rad', 'rørgate', A => Math.min(3, Math.floor(A / 200)), { fri: 1.4 }]],
    sorteringshall: [['rutenett', 'avfallscontainer', 8, { du: 6, dv: 4, mU: 2.5, mV: 2.5, fri: 2 }], ['vegg', 'ballepresse', 1, { fri: 1.4 }], ['vegg', 'skraphaug', A => Math.min(3, Math.floor(A / 150)), { fri: 1.6 }],
      ['midt', 'hjullaster', A => A > 300 ? 1 : 0, { fri: 2 }]],
    bryggerhall: [['rad', 'bryggekjele', A => Math.min(3, 1 + Math.floor(A / 150)), { fri: 1.4, sider: 'lang' }], ['rutenett', 'gjæringstank', 8, { du: 3.4, dv: 3.4, mU: 2.4, mV: 2.4, fri: 1.4 }],
      ['vegg', 'tappelinje', A => A > 120 ? 1 : 0, { fri: 1.4, sider: 'lang' }], ['vegg', 'fat', A => Math.min(8, Math.floor(A / 30)), { fri: .6 }], ['vegg', 'pall', 2]],
    kjemihall: [['rutenett', 'reaktor', 6, { du: 5, dv: 5, mU: 3, mV: 3, fri: 2 }], ['vegg', 'blandetank', A => Math.min(4, 1 + Math.floor(A / 150)), { fri: 1.2 }],
      ['vegg', 'sprøytestøper', A => A > 150 ? 1 : 0, { fri: 1.4 }], ['rad', 'rørgate', A => Math.min(4, Math.floor(A / 150)), { fri: 1.4 }], ['vegg', 'kjemikalieskap', 2, { fri: .8 }]],
  };
  // rommenes gulv og vegger i 3D (spill/interior3d.js romStil spør her for rollene den ikke kjenner)
  const ROMSTIL = {
    sagbrukshall: { gulv: ['betong', [.56, .54, .5]], vegg: ['planke', [.7, .56, .4]], lampe: 2 }, lakkrom: { gulv: ['betong', [.6, .6, .58]], vegg: ['malt', [.9, .9, .88]], lampe: 2 },
    snekkerverksted: { gulv: ['planke', [.62, .5, .36]], vegg: ['planke', [.74, .6, .44]], lampe: 2 },
    oljehall: { gulv: ['betong', [.58, .59, .58]], vegg: ['betong', [.74, .75, .74]], lampe: 2 }, gasshall: { gulv: ['betong', [.6, .61, .6]], vegg: ['betong', [.76, .77, .76]], lampe: 2 },
    styrerom: { gulv: ['betong', [.5, .54, .56]], vegg: ['malt', [.86, .88, .86]], lampe: 2 },
    knuserhall: { gulv: ['betong', [.5, .48, .45]], vegg: ['betong', [.66, .65, .62]], lampe: 2 },
    fiskehall: { gulv: ['flis', [.72, .76, .76]], vegg: ['flis', [.92, .95, .95]], lampe: 2 }, fryselager: { gulv: ['betong', [.7, .74, .76]], vegg: ['malt', [.9, .94, .96]], lampe: 2 },
    mathall: { gulv: ['flis', [.76, .74, .7]], vegg: ['flis', [.94, .94, .92]], lampe: 2 }, kjølerom: { gulv: ['betong', [.7, .74, .76]], vegg: ['malt', [.9, .94, .96]], lampe: 2 },
    metallverksted: { gulv: ['betong', [.6, .61, .6]], vegg: ['betong', [.74, .75, .74]], lampe: 2 }, verftshall: { gulv: ['betong', [.58, .58, .56]], vegg: ['betong', [.72, .73, .72]], lampe: 2 },
    turbinhall: { gulv: ['flis', [.62, .64, .6]], vegg: ['malt', [.84, .86, .82]], lampe: 2 }, sorteringshall: { gulv: ['betong', [.52, .5, .47]], vegg: ['betong', [.68, .67, .64]], lampe: 2 },
    bryggerhall: { gulv: ['flis', [.7, .62, .52]], vegg: ['flis', [.92, .9, .86]], lampe: 2 }, kjemihall: { gulv: ['betong', [.62, .66, .64]], vegg: ['malt', [.88, .9, .88]], lampe: 2 },
  };
  const romStil = rolle => ROMSTIL[rolle] || null;

  // ---------- innredning(type): listen over maskiner og utstyr ----------
  // plass: 'midt' (midt i hallen), 'vegg' (inntil veggen), 'rad' (så mange som får plass langs veggene), 'rutenett' (rader på gulvet), 'tak' (kran)
  // antall: for en hall på 400 m² (A = 400); rom: 'hall' eller 'bak'
  const A_EKS = 400;
  function innredning(t) {
    const I = IND[t] || IND[0], ut = [];
    const fra = (rolle, rom) => { const S = OPPSKRIFT[rolle] || (rolle === 'tørkeloft' ? [['rad', 'tørkestativ', 6]] : rolle === 'lager' ? [['rutenett', 'pall', 10], ['vegg', 'hylle', 3]] : rolle === 'kontor' ? [['vegg', 'pult', 2], ['vegg', 'arkivskap', 1]] : rolle === 'lagerhall' ? [['rutenett', 'pallereol', 20], ['midt', 'truck', 1]] : null);
      for (const [hva, type, ant] of S || []) { const M = MASKINER[type], n = typeof ant === 'function' ? ant(A_EKS) : ant === undefined ? 1 : ant; if (!n) continue;
        const mål = M || (rot.Interior && rot.Interior.MØBLER[type]) || [1, 1, 1];
        ut.push({ type, navn: M ? M[4] : ANDRE_NAVN[type] || type, b: mål[0], d: mål[1], h: mål[2], plass: hva === 'kran' ? 'tak' : hva === 'par' ? 'vegg' : hva, antall: n, rom }); } };
    if (!I.hall) return [{ type: 'arbeidsbenk', navn: 'Arbeidsbenk', b: 2, d: .7, h: .9, plass: 'vegg', antall: 4, rom: 'hall' }, { type: 'maskin', navn: 'Maskin', b: 1.8, d: 1.2, h: 1.6, plass: 'rutenett', antall: 6, rom: 'hall' }];
    fra(I.hall, 'hall'); if (I.bak) fra(I.bak, 'bak');
    return ut;
  }

  // ---------- kobling til interiøret (interior.js) ----------
  // romsettet for typen t: 'ind_<t>' (hall + bakrom), lager og logistikk bruker lagerets romsett
  const romsettFor = t => (t === 11 ? 'lager' : IND[t] && IND[t].hall ? 'ind_' + t : 'industri');
  // byggets data fra planens info: { i, ind, navn, industri, kl, areal, h, moh, tett, X, Y }
  function forInfo(info) {
    if (!info) return 0;
    if (info.ind > 0 && IND[info.ind]) return info.ind | 0;
    const omg = typeof api.omgivelser === 'function' ? api.omgivelser(info) : null;
    return type(info, omg);
  }
  let koblet = null;
  function koble(Interior) {
    if (!Interior || !Interior.TYPER || koblet === Interior) return !!Interior; koblet = Interior;
    const M = Interior.MØBLER, MS = Interior.MØBELSETT, RS = Interior.ROMSETT, T = Interior.TYPER;
    for (const [k, v] of Object.entries(MASKINER)) if (!M[k]) M[k] = v.slice(0, 4);
    for (const [k, v] of Object.entries(OPPSKRIFT)) if (v && !MS[k]) MS[k] = v;
    for (const t of ALLE) { const I = IND[t]; if (t !== 11 && I.hall) RS['ind_' + t] = { hall: I.hall, bak: I.bak }; }
    // klassen «industri»: varianten er industritypen (ind1 … ind14); den gamle regelen (tre/metall/olje) står igjen som reserve
    const Ti = T.industri; if (Ti && !Ti.gammelVariant) {
      Ti.gammelVariant = Ti.variant; Ti.variant = (info, f) => 'ind' + forInfo(info);
      for (const t of [0, ...ALLE]) Ti.varianter['ind' + t] = { romsett: romsettFor(t), ind: t };
    }
    // klassen «lager»: industrilokalet når dataene sier hvilken industri lageret hører til (ind), ellers et vanlig lager
    const Tl = T.lager; if (Tl && !Tl.variant) {
      Tl.variant = info => (info && info.ind > 0 && info.ind !== 11 && IND[info.ind] ? 'ind' + info.ind : 'lager');
      Tl.varianter = { lager: { romsett: 'lager', ind: 11 } }; for (const t of ALLE) Tl.varianter['ind' + t] = { romsett: romsettFor(t), ind: t };
    }
    return true;
  }
  // industritypen i en ferdig plan (pl.variant 'ind6' -> 6), eller null når planen ikke er et industribygg
  const fraPlan = pl => { const m = pl && /^ind(\d+)$/.exec(pl.variant || ''); return m ? +m[1] : pl && pl.kl === 'lager' ? 11 : null; };
  // Interior-kroken: andre moduler kan be om innredningen for et bygg (info som til Interior.plan)
  const forBygg = info => { const t = forInfo(info); return { type: t, navn: navn(t), tekst: tekst(t), kjent: kjent(info), innredning: innredning(t) }; };

  // ---------- enkle kasse-modeller for 3D (byttes ut av finere modeller) ----------
  // k(x0, x1, y0, y1, z0, z1, farge, stoff, rund): møbelets akser – x langs bredden (−b/2 … b/2), y fra ryggen (−d/2) til fronten, z opp
  const F = { stål: [.66, .68, .7], mørk: [.16, .16, .18], gul: [.86, .66, .12], rød: [.72, .16, .12], grønn: [.24, .44, .3], blå: [.26, .4, .58], hvit: [.9, .9, .88],
    tre: [.72, .56, .36], tømmer: [.5, .36, .22], rust: [.48, .32, .22], stein: [.58, .56, .52], is: [.8, .9, .96], kobber: [.72, .44, .26], betong: [.62, .62, .6] };
  const MODELLER = {
    kantverk: (m, k, b, d, h) => { k(-b, b, -d * .6, d * .6, .7, .9, F.stål); for (const x of [-b + .2, b - .3]) k(x, x + .1, -d * .5, d * .5, 0, .7, F.mørk); k(-.4, .4, -d, d, .9, h, F.gul); },
    tømmerstabel: (m, k, b, d, h) => { for (let z = 0, j = 0; z < h - .1; z += .36, j++) for (let y = -d + .2; y < d - .1; y += .4) k(-b, b, y - .17 + (j % 2) * .1, y + .17 + (j % 2) * .1, z, z + .34, j % 2 ? F.tømmer : [.56, .42, .27], 'tre', true); },
    transportbånd: (m, k, b, d, h) => { k(-b, b, -d, d, h - .25, h, F.mørk, 'tøy'); for (let x = -b + .3; x < b; x += 1.5) k(x, x + .1, -d * .8, d * .8, 0, h - .25, F.stål); },
    tørkeovn: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, F.rust); k(-b * .6, b * .6, d, d + .03, .3, h - .3, F.mørk); },
    høvelbenk: (m, k, b, d, h) => { k(-b, b, -d, d, h - .1, h, F.tre, 'tre'); for (const x of [-b + .1, b - .2]) k(x, x + .1, -d * .8, d * .8, 0, h - .1, F.tre, 'tre'); k(-b, -b + .3, -d, -d + .2, h, h + .12, F.mørk); },
    bordsag: (m, k, b, d, h) => { k(-b * .8, b * .8, -d * .8, d * .8, 0, h - .05, F.grønn); k(-b, b, -d, d, h - .05, h, F.stål); k(-.15, .15, -.01, .01, h, h + .12, F.stål, 'glatt', true); },
    båndsag: (m, k, b, d, h) => { k(-b * .6, b * .6, -d * .6, d * .6, 0, .9, F.grønn); k(-b, b, -d, d, .9, .95, F.stål); k(-b * .5, b * .5, -d * .3, d * .3, .95, h, F.grønn); },
    limpresse: (m, k, b, d, h) => { k(-b, b, -d, d, .6, .8, F.tre, 'tre'); for (const x of [-b, b - .15]) k(x, x + .15, -d, d, 0, h, F.blå); k(-b, b, -d * .3, d * .3, h - .2, h, F.blå); },
    lakkbås: (m, k, b, d, h) => { k(-b, b, -d, -d + .05, 0, h, F.hvit); for (const s of [-1, 1]) k(s * b - (s > 0 ? .05 : 0), s * b + (s > 0 ? 0 : .05), -d, d, 0, h, F.hvit); k(-b * .4, b * .4, -d + .05, -d + .3, h - .6, h - .1, F.mørk); },
    pumpe: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .15, F.mørk); k(-b * .6, b * .2, -d * .6, d * .6, .15, h, F.blå, 'glatt', true); k(b * .2, b, -.15, .15, .3, .6, F.stål, 'glatt', true); },
    gasstank: (m, k, b, d, h) => { k(-b, b, -d, d, .5, h, F.hvit, 'glatt', true); for (const x of [-b * .6, b * .6]) k(x - .2, x + .2, -d * .7, d * .7, 0, .6, F.betong, 'betong'); k(-.2, .2, -.2, .2, h, h + .3, F.stål); },
    kompressor: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, F.blå); k(-b * .8, b * .8, d, d + .03, .3, h * .6, F.mørk); k(b * .5, b * .9, -d * .5, d * .5, h, h + .25, F.stål, 'glatt', true); },
    gassflasker: (m, k, b, d, h) => { for (let x = -b + .15; x < b; x += .3) k(x - .12, x + .12, -.12, .12, 0, h, x < 0 ? F.rød : F.grønn, 'glatt', true); k(-b, b, -d, -d + .05, .9, .95, F.stål); },
    knuser: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h * .55, F.gul); k(-b * .8, b * .8, -d * .8, d * .8, h * .55, h, F.rust); k(-b * .4, b * .4, -d * .4, d * .4, h - .02, h, F.mørk); },
    sikt: (m, k, b, d, h) => { for (const [x, y] of [[-b, -d], [b - .15, -d], [-b, d - .15], [b - .15, d - .15]]) k(x, x + .15, y, y + .15, 0, h - .5, F.gul); k(-b, b, -d, d, h - .5, h, F.stål); },
    grushaug: (m, k, b, d, h) => { for (let q = 0; q < 4; q++) { const s = 1 - q * .24; k(-b * s, b * s, -d * s, d * s, h * q / 4, h * (q + 1) / 4, F.stein, 'betong'); } },
    hjullaster: (m, k, b, d, h) => { k(-b * .9, b * .9, -d * .3, d * .6, .6, 1.8, F.gul); k(-b * .7, b * .7, -d * .1, d * .4, 1.8, h, F.gul); k(-b, b, -d, -d + .6, .3, 1.4, F.mørk); for (const y of [-d * .5, d * .45]) for (const s of [-1, 1]) k(s * b - (s > 0 ? .5 : 0), s * b + (s > 0 ? 0 : .5), y - .7, y + .7, 0, 1.4, F.mørk, 'glatt', true); },
    sløyebenk: (m, k, b, d, h) => { k(-b, b, -d, d, h - .08, h, F.stål); for (const x of [-b + .1, b - .2]) k(x, x + .1, -d * .8, d * .8, 0, h - .08, F.stål); k(-b, b, -d, -d + .08, h, h + .2, F.stål); k(-b * .5, b * .5, -d * .6, d * .6, .1, .5, F.blå); },
    filetmaskin: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .9, F.stål); k(-b * .6, b * .6, -d * .8, d * .8, .9, h, F.hvit); k(-b, b, -d * .3, d * .3, .9, 1, F.mørk, 'tøy'); },
    frysetunnel: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, F.hvit); k(-b + .2, -b + 1.2, d, d + .03, .2, h - .3, F.stål); k(-b, b, -d, d, h - .05, h, F.stål); },
    iskar: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h - .1, F.blå); k(-b + .06, b - .06, -d + .06, d - .06, h - .1, h, F.is); },
    pakkebord: (m, k, b, d, h) => { k(-b, b, -d, d, h - .06, h, F.stål); for (const s of [-1, 1]) k(s * b - (s > 0 ? .08 : 0), s * b + (s > 0 ? 0 : .08), -d * .8, d * .8, 0, h - .06, F.stål); k(-b * .6, -b * .1, -d * .4, d * .4, h, h + .25, [.85, .78, .62], 'tøy'); },
    kokekar: (m, k, b, d, h) => { k(-b, b, -d, d, .3, h, F.stål, 'glatt', true); for (const s of [-1, 1]) k(s * b * .7 - .06, s * b * .7 + .06, -.06, .06, 0, .3, F.mørk); k(-b * .6, b * .6, -d * .6, d * .6, h, h + .1, F.stål, 'glatt', true); },
    pakkemaskin: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h * .6, F.hvit); k(-b * .5, b * .5, -d * .7, d * .7, h * .6, h, F.stål); k(-b, b, d * .2, d * .6, .8, .9, F.mørk, 'tøy'); },
    stålbenk: (m, k, b, d, h) => { k(-b, b, -d, d, h - .05, h, F.stål); for (const s of [-1, 1]) k(s * b - (s > 0 ? .06 : 0), s * b + (s > 0 ? 0 : .06), -d * .8, d * .8, 0, h - .05, F.stål); k(-b + .1, b - .1, -d + .1, d - .1, .15, .2, F.stål); },
    kjølereol: (m, k, b, d, h) => { for (const s of [-1, 1]) k(s * b - (s > 0 ? .06 : 0), s * b + (s > 0 ? 0 : .06), -d, d, 0, h, F.stål); for (let z = .1; z < h; z += .5) k(-b, b, -d, d, z, z + .04, F.stål); for (let z = .14; z < h - .4; z += .5) k(-b + .1, b - .1, -d + .05, d - .05, z, z + .3, [.85, .78, .62], 'tøy'); },
    dreiebenk: (m, k, b, d, h) => { k(-b, b, -d * .6, d * .6, 0, .9, F.grønn); k(-b, b, -d * .3, d * .3, .9, 1.05, F.stål); k(-b, -b + .6, -d * .5, d * .5, 1.05, h, F.grønn); k(b - .4, b, -d * .3, d * .3, 1.05, 1.3, F.grønn); },
    platesaks: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .9, F.blå); k(-b, b, -d * .2, d * .3, .9, h, F.blå); k(-b, b, d * .3, d, .88, .9, F.stål); },
    esse: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h * .8, [.42, .3, .24], 'betong'); k(-b * .6, b * .6, -d * .6, d * .6, h * .8, h, [.9, .4, .12], 'glatt'); k(-b * .4, b * .4, -d * .4, d * .4, h, h + 1.4, F.mørk); },
    ambolt: (m, k, b, d, h) => { k(-.15, .15, -.12, .12, 0, h - .2, F.tømmer, 'tre', true); k(-b, b, -d, d, h - .2, h, F.mørk); },
    båtbukk: (m, k, b, d, h) => { for (const y of [-d * .6, 0, d * .6]) k(-b * .8, b * .8, y - .15, y + .15, 0, 1, F.tre, 'tre'); k(-b * .5, b * .5, -d, d, 1, 1.8, F.hvit, 'glatt', true); k(-b, b, -d * .9, d * .95, 1.8, h - .8, F.hvit, 'glatt', true); k(-b, b, -d * .9, d * .95, h - .8, h - .7, F.blå); k(-b * .6, b * .6, d * .1, d * .5, h - .7, h, F.hvit); },
    generator: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .6, F.betong, 'betong'); k(-b * .8, b * .8, -d * .8, d * .8, .6, h, F.grønn, 'glatt', true); k(-b * .3, b * .3, -d * .3, d * .3, h, h + .3, F.stål, 'glatt', true); },
    transformator: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h * .7, F.mørk); for (let x = -b + .2; x < b; x += .35) k(x, x + .06, -d - .1, d + .1, .2, h * .65, F.mørk); for (const x of [-b * .5, 0, b * .5]) k(x - .08, x + .08, -.08, .08, h * .7, h, [.7, .5, .3], 'glatt', true); },
    avfallscontainer: (m, k, b, d, h) => { const c = [F.grønn, F.blå, F.rød, F.gul][Math.floor((m.f || 0) * 4) % 4]; k(-b, b, -d, d, .1, h, c); k(-b + .08, b - .08, -d + .08, d - .08, h - .1, h - .02, F.mørk); },
    ballepresse: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, F.gul); k(-b * .7, b * .7, d, d + .03, .2, 1.2, F.mørk); },
    skraphaug: (m, k, b, d, h) => { for (let q = 0; q < 6; q++) { const r = (n => { const v = Math.sin(((m.f || 0) + 1.7) * (n + 1) * 77.3) * 4375.85; return v - Math.floor(v); }); const x = (r(q) - .5) * b, y = (r(q + 9) - .5) * d, s = .4 + r(q + 20) * .6; k(x - s, x + s, y - s * .7, y + s * .7, 0, h * (.4 + r(q + 30) * .6), q % 2 ? F.rust : F.stål); } },
    bryggekjele: (m, k, b, d, h) => { k(-b, b, -d, d, .2, h - .3, F.kobber, 'glatt', true); k(-b * .5, b * .5, -d * .5, d * .5, h - .3, h, F.kobber, 'glatt', true); k(-.06, .06, -.06, .06, h, h + .8, F.kobber); },
    gjæringstank: (m, k, b, d, h) => { k(-b, b, -d, d, .5, h - .4, F.stål, 'glatt', true); k(-b * .4, b * .4, -d * .4, d * .4, .1, .5, F.stål, 'glatt', true); k(-b * .6, b * .6, -d * .6, d * .6, h - .4, h, F.stål, 'glatt', true); },
    tappelinje: (m, k, b, d, h) => { k(-b, b, -d * .6, d * .6, 0, .9, F.stål); k(-b, b, -d * .4, d * .4, .9, 1, F.mørk, 'tøy'); for (let x = -b + .1; x < b; x += .12) k(x, x + .06, -.03, .03, 1, 1.25, [.3, .2, .1], 'glatt', true); k(-b * .2, b * .2, -d, d, 1, h, F.stål); },
    fat: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, F.tømmer, 'tre', true); for (const z of [.12, h - .16]) k(-b - .01, b + .01, -d - .01, d + .01, z, z + .04, F.mørk, 'glatt', true); },
    reaktor: (m, k, b, d, h) => { k(-b, b, -d, d, .4, h - .5, F.stål, 'glatt', true); for (const s of [-1, 1]) k(s * b * .7 - .08, s * b * .7 + .08, -.08, .08, 0, .4, F.mørk); k(-b * .3, b * .3, -d * .3, d * .3, h - .5, h, F.gul, 'glatt', true); },
    blandetank: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h - .2, F.hvit, 'glatt', true); k(-b * .3, b * .3, -d * .3, d * .3, h - .2, h, F.blå); },
    sprøytestøper: (m, k, b, d, h) => { k(-b, b, -d, d, 0, 1, F.blå); k(-b * .8, b * .2, -d * .6, d * .6, 1, h, F.hvit); k(b * .2, b * .9, -d * .2, d * .2, 1, 1.4, F.stål, 'glatt', true); },
    kjemikalieskap: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, F.gul); k(-b * .2, b * .2, d, d + .01, h * .6, h * .6 + .3, F.rød); },
    truck: (m, k, b, d, h) => { k(-b, b, -d * .4, d, .2, 1.1, F.gul); k(-b * .9, b * .9, -d * .1, d * .5, 1.1, h, F.mørk); for (const s of [-1, 1]) k(s * b * .35 - .06, s * b * .35 + .06, -d, -d * .4, .05, .1, F.stål); k(-b * .6, b * .6, -d * .45, -d * .4, 0, h, F.mørk); },
  };
  // interior3d.js: møbeltyper den ikke kjenner (svar true når modellen er tegnet)
  function deler(m, k) { const f = MODELLER[m.type]; if (!f) return false; f(m, k, m.b / 2, m.d / 2, m.h, F); return true; }

  const api = { IND, ALLE, REGLER, MASKINER, OPPSKRIFT, ROMSTIL, MODELLER, F, ORD, type, kjent, navn, kort, tekst, fraNavn, vekter, innredning, koble, forInfo, forBygg, fraPlan, romsettFor, romStil, deler, hash, omgivelser: null };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Industri = api;
  // nettleseren: koble til interiøret med en gang (interior.js er lastet før denne fila)
  if (rot.Interior) koble(rot.Interior);
})(typeof globalThis !== 'undefined' ? globalThis : this);
