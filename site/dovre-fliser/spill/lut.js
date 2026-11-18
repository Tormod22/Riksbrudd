/* Riksbrudd – LUT OG BEHOLDERE (18. nov kveld, brukeren: «Legg også til at en kan finne lut inni hus, for eksempel brunost, andre
 * matgreier, saft, rifle, ammunisjon og så videre» og «Jeg ønsker liksom inventar systemet til project zomboid» – mekanikken i den
 * sjangeren, ikke utseendet, navnene eller tekstene).
 * Regler uten DOM (Node: require('./lut'); nettleser: globalThis.Lut). Visningen er spill/lut-visning.js. Test: pipeline/fliser/test_lut.js.
 *  GJENSTANDER: norske hverdagsting fra 2023 – mat, fersk mat, drikke, våpen, ammunisjon, medisin, utstyr og sekker – med vekt og virkning.
 *  BEHOLDERE: kjøleskap, kjøkkenskap, garderobe, nattbord, bokhylle, hyller, paller, verktøybenk … tas fra møblene interiøret alt har
 *   (Interior.plan -> pl.møbler). Hver har sin plass (kg) og sitt faste innhold (hash av bygget og møbelet). Gulvet har ikke noe tak.
 *  LUT PER BYGG: KLASSER sier hva slags ting som er vanlige i hvilke bygg (jaktvåpen i hytter, mat i butikker, medisin på sykehus …),
 *   og om bygget alt er ransaket (da er det lite igjen).
 *  VEKT: lommene og sekken på ryggen gir plass; sekken gjør vekten lettere å bære. Over bæreevnen går du tregere og blir fortere sliten,
 *   langt over kan du ikke løpe.
 *  FERSKHET: fersk mat blir gammel og så råtten; hermetikk, tørrfisk og knekkebrød holder. Et kjøleskap hjelper bare så lenge det har strøm.
 *   En dato er et tall (spillminuttet tingen «ble til», alderen er nå − tallet) eller, i et kjøleskap, [alder da den ble lagt inn, når].
 * Alle tall er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));

  // Claudes forslag, alle sammen
  const REGLER = {
    lommer: 5,             // kg du får plass til i lommene uten sekk
    bæreevne: 22,          // kg du bærer uten å merke det (styrken i spill/overlev.js legger til, via Utstyr.ekstraVekt)
    svært: 1.5,            // over bæreevnen × dette er det svært tungt: du kan ikke løpe
    fartTungt: .7,         // farten glir fra 1 ved bæreevnen ned til dette når det blir svært tungt
    fartSvært: .55,        // farten når det er svært tungt
    løpTungt: .5,          // løpetiden (utholdenheten) glir ned til denne andelen når det er tungt: du blir fortere sliten
    våpenTak: 2,           // våpen i beltet kan du bære til samlet vekt er bæreevnen × dette
    nær: 1.6,              // m fra kanten av et møbel du kan åpne det
    gulvNær: 2,            // m: ting på gulvet innen dette vises under «Gulvet»
    kald: .25,             // i et kjøleskap med strøm eldes maten fire ganger saktere
    gammel: { sult: .7, tørst: .8, søvn: 1 },     // gammel mat metter mindre
    råtten: { sult: .3, tørst: .3, søvn: 1, helse: -12 },   // råtten mat gjør deg dårlig
    ransaket: .3,          // i et ransaket bygg finnes hver ting bare med denne sjansen
    dag: 1440,             // spillminutter per døgn
    lagres: 3000,          // så mange endrede beholdere huskes (de eldste glemmes)
    rygg: 'tursekk',       // sekken alle har på ryggen fra start (figuren i 3D har en)
  };

  // GJENSTANDENE. kat: mat, fersk, drikke, våpen, ammo, medisin, utstyr, sekk. spis: det et måltid fyller (0–100 på behovene i spill/karakter.js),
  // drikk = du drikker det. fersk: [døgn fersk, døgn til råtten] (uten = holder). rasjoner: hva det er verdt i leirens matlager.
  // Funn: w = vekt i trekningen, n = [minst, mest] du finner, b = ganger per beholdertype, k = ganger per byggklasse.
  // finnes: tingen finnes alt i sekken (spill/utstyr.js eller spill/eventyr.js) – da brukes navn og vekt derfra.
  const GJENSTANDER = {
    // mat som holder (lenge)
    brunost: { navn: 'Brunost (Gudbrandsdalsost)', enhet: 'stk.', vekt: .5, kat: 'mat', spis: { sult: 25 }, fersk: [45, 150], rasjoner: .6, w: 3, n: [1, 2], b: { kjøleskap: 4, kjøledisk: 2 }, k: { hus: 1.5, hytte: 1.6, leil: 1.3 }, tekst: 'Søt og mettende. Holder lenge, men ikke evig.' },
    knekkebrød: { navn: 'Knekkebrød', enhet: 'stk.', vekt: .3, kat: 'mat', spis: { sult: 20, tørst: -4 }, rasjoner: .4, w: 2.5, n: [1, 2], tekst: 'Tørt, men holder i årevis.' },
    fiskeboller: { navn: 'Fiskeboller (boks)', enhet: 'stk.', vekt: .56, kat: 'mat', spis: { sult: 25, tørst: 3 }, rasjoner: .5, w: 2, n: [1, 4], tekst: 'Hermetikk holder.' },
    lapskaus: { navn: 'Lapskaus (boks)', enhet: 'stk.', vekt: .56, kat: 'mat', spis: { sult: 35 }, rasjoner: .7, w: 2, n: [1, 3], tekst: 'Et skikkelig måltid på boks.' },
    pølseboks: { navn: 'Pølser på boks', enhet: 'stk.', vekt: .58, kat: 'mat', spis: { sult: 30 }, rasjoner: .6, w: 1.6, n: [1, 3], tekst: 'Hermetikk holder.' },
    makrell: { navn: 'Makrell i tomat', enhet: 'stk.', vekt: .17, kat: 'mat', spis: { sult: 15 }, rasjoner: .3, w: 2.2, n: [1, 4], tekst: 'Liten boks, lett å bære.' },
    havregryn: { navn: 'Havregryn', enhet: 'stk.', vekt: .5, kat: 'mat', spis: { sult: 35, tørst: -6 }, rasjoner: .8, w: 1.8, n: [1, 2], tekst: 'Mettende grøt – holder lenge.' },
    tørrfisk: { navn: 'Tørrfisk (stokkfisk)', enhet: 'stk.', vekt: .35, kat: 'mat', spis: { sult: 30, tørst: -8 }, rasjoner: .6, w: 1.2, n: [1, 3], k: { hytte: 2, låve: 1.8, uthus: 1.5, butikk: .6 }, tekst: 'Holder i årevis. Gjør deg tørst.' },
    sjokolade: { navn: 'Melkesjokolade', enhet: 'stk.', vekt: .2, kat: 'mat', spis: { sult: 10 }, rasjoner: .2, w: 2.4, n: [1, 3], b: { kasse: 5, nattbord: 2.5, pult: 2, skranke: 2, kateter: 2 }, tekst: 'Litt energi.' },
    kaffe: { navn: 'Kaffe (filtermalt)', enhet: 'stk.', vekt: .25, kat: 'drikke', drikk: true, spis: { tørst: 6, søvn: 22 }, w: 1.6, n: [1, 2], b: { kjøkkenbenk: 4, skranke: 2, pult: 1.5, kjøleskap: .2 }, tekst: 'En kanne kaffe holder deg våken.' },
    rasjon: { finnes: true, navn: 'Feltrasjon', enhet: 'stk.', vekt: .6, kat: 'mat', spis: { sult: 50 }, rasjoner: 1, w: .3, n: [1, 3], k: { hangar: 6, hytte: .5 }, tekst: 'Militær feltrasjon.' },
    // fersk mat: blir gammel og råtten
    melk: { navn: 'Melk (1 liter)', enhet: 'stk.', vekt: 1.05, kat: 'fersk', drikk: true, spis: { tørst: 30, sult: 8 }, fersk: [4, 9], rasjoner: .2, w: 3, n: [1, 2], b: { kjøleskap: 2, kjøledisk: 2 }, tekst: 'Fersk – blir fort sur uten kjøleskap.' },
    grovbrød: { navn: 'Grovbrød', enhet: 'stk.', vekt: .75, kat: 'fersk', spis: { sult: 30 }, fersk: [4, 12], rasjoner: .6, w: 2, n: [1, 2], b: { kjøkkenbenk: 6, reol: 3, kjøleskap: .5 }, tekst: 'Fersk – blir tørt og så muggent.' },
    egg: { navn: 'Egg (6 stk.)', enhet: 'stk.', vekt: .4, kat: 'fersk', spis: { sult: 25 }, fersk: [14, 35], rasjoner: .5, w: 2, n: [1, 2], b: { kjøleskap: 2 }, tekst: 'Holder et par uker.' },
    epler: { navn: 'Epler', enhet: 'stk.', vekt: .2, kat: 'fersk', spis: { sult: 8, tørst: 5 }, fersk: [10, 28], rasjoner: .15, w: 2, n: [1, 5], b: { kjøkkenbenk: 8, reol: 2 }, tekst: 'Holder et par uker.' },
    wienerpølser: { navn: 'Wienerpølser', enhet: 'stk.', vekt: .45, kat: 'fersk', spis: { sult: 30 }, fersk: [6, 14], rasjoner: .6, w: 2, n: [1, 2], b: { kjøleskap: 2, kjøledisk: 2 }, tekst: 'Fersk kjøttvare.' },
    gulost: { navn: 'Gulost', enhet: 'stk.', vekt: .5, kat: 'fersk', spis: { sult: 25 }, fersk: [20, 60], rasjoner: .6, w: 2, n: [1, 1], b: { kjøleskap: 2, kjøledisk: 1.5 }, tekst: 'Holder noen uker.' },
    leverpostei: { navn: 'Leverpostei', enhet: 'stk.', vekt: .1, kat: 'fersk', spis: { sult: 10 }, fersk: [20, 50], rasjoner: .2, w: 1.4, n: [1, 3], b: { kjøleskap: 2 }, tekst: 'Pålegg. Holder noen uker.' },
    // drikke
    saft: { navn: 'Saft (solbær)', enhet: 'stk.', vekt: 1.1, kat: 'drikke', drikk: true, spis: { tørst: 35, sult: 6 }, w: 2.4, n: [1, 2], b: { kjøkkenbenk: 2, kjøleskap: 1.5 }, k: { hus: 1.5, hytte: 1.5, leil: 1.3 }, tekst: 'Søtt og godt mot tørsten.' },
    saftbr: { navn: 'Saft (bringebær)', enhet: 'stk.', vekt: 1.1, kat: 'drikke', drikk: true, spis: { tørst: 35, sult: 6 }, w: 1.4, n: [1, 2], b: { kjøkkenbenk: 2, kjøleskap: 1.5 }, k: { hus: 1.5, hytte: 1.5, leil: 1.3 }, tekst: 'Søtt og godt mot tørsten.' },
    flaskevann: { navn: 'Flaskevann (1,5 l)', enhet: 'stk.', vekt: 1.55, kat: 'drikke', drikk: true, spis: { tørst: 50 }, w: 3, n: [1, 4], k: { butikk: 2, lager: 2, terminal: 1.5 }, tekst: 'Rent vann.' },
    brus: { navn: 'Brus (0,5 l)', enhet: 'stk.', vekt: .55, kat: 'drikke', drikk: true, spis: { tørst: 25, sult: 4 }, w: 2.6, n: [1, 4], b: { kjøleskap: 2, kasse: 2 }, tekst: 'Sukker og kullsyre.' },
    // våpen (legges i beltet når du tar dem med); jaktrifla er en egen boltrifle, de andre finnes i spill/utstyr.js
    v_jaktrifle: { navn: 'Jaktrifle', enhet: 'stk.', vekt: 3.6, kat: 'våpen', våpen: 'jaktrifle', w: 3, n: [1, 1], b: { skap: 3, bil: 1 }, k: { hytte: 3, låve: 2, uthus: 1.5, hus: 1.2 }, tekst: 'Boltrifle til elgjakt (7,62 mm).' },
    v_hagle: { navn: 'Hagle', enhet: 'stk.', vekt: 3.5, kat: 'våpen', våpen: 'hagle', w: 2.4, n: [1, 1], b: { skap: 3, bil: 1 }, k: { hytte: 2, låve: 2, uthus: 1.5 }, tekst: 'Til fuglejakt – farlig på kort hold.' },
    v_pistol: { navn: 'Pistol', enhet: 'stk.', vekt: 1, kat: 'våpen', våpen: 'pistol', w: .8, n: [1, 1], b: { nattbord: 2, skranke: 1.5 }, k: { kontor: 2 }, tekst: 'Lett reservevåpen.' },
    v_gevær: { navn: 'Automatgevær (Heimevernet)', enhet: 'stk.', vekt: 4, kat: 'våpen', våpen: 'gevær', w: .5, n: [1, 1], b: { skap: 2 }, k: { hangar: 3 }, tekst: 'Mange i Heimevernet hadde geværet hjemme.' },
    // ammunisjon (typene i spill/utstyr.js)
    a762: { finnes: true, navn: '7,62 mm', enhet: 'skudd', vekt: .025, kat: 'ammo', w: 3, n: [5, 20], b: { skap: 2, hylle: 1.5, nattbord: 1 }, k: { hytte: 2.5, låve: 2, uthus: 1.5, hus: 1.2 }, tekst: 'Riflepatroner – til jaktrifla og skarpskyttergeværet.' },
    ahagl: { finnes: true, navn: 'Haglpatroner', enhet: 'skudd', vekt: .04, kat: 'ammo', w: 3, n: [5, 25], b: { skap: 2, hylle: 1.5 }, k: { hytte: 2.5, låve: 2, uthus: 1.5 }, tekst: 'Til hagla.' },
    a9: { finnes: true, navn: '9 mm', enhet: 'skudd', vekt: .012, kat: 'ammo', w: 1, n: [8, 30], tekst: 'Til pistol og maskinpistol.' },
    a556: { finnes: true, navn: '5,56 mm', enhet: 'skudd', vekt: .012, kat: 'ammo', w: .8, n: [10, 30], k: { hangar: 3 }, tekst: 'Til automatgeværet.' },
    // medisin (førstehjelp finnes i spill/utstyr.js; helse = det «Bruk» gir)
    forbinding: { finnes: true, navn: 'Førstehjelp', enhet: 'stk.', vekt: .5, kat: 'medisin', helse: 45, w: 2, n: [1, 2], b: { vask: 2, skap: .5, bil: 1.5 }, k: { sykehus: 3, skole: 1.5 }, tekst: 'Forbinding og plaster.' },
    smertestillende: { navn: 'Smertestillende (paracetamol)', enhet: 'stk.', vekt: .03, kat: 'medisin', helse: 15, w: 3, n: [1, 3], b: { vask: 3, nattbord: 2 }, k: { sykehus: 3 }, tekst: 'Demper smerten litt.' },
    // utstyr (tau finnes i spill/eventyr.js)
    lommelykt: { navn: 'Lommelykt', enhet: 'stk.', vekt: .3, kat: 'utstyr', w: 2, n: [1, 1], b: { nattbord: 2, skap: 1, arbeidsbenk: 1.5, bil: 2 }, tekst: 'Lys i mørket (til senere).' },
    batterier: { navn: 'Batterier (AA)', enhet: 'stk.', vekt: .1, kat: 'utstyr', w: 2, n: [1, 3], b: { kasse: 3, tvbenk: 2, arbeidsbenk: 1 }, tekst: 'Til lommelykta og radioen.' },
    tau: { finnes: true, navn: 'Tau', enhet: 'stk.', vekt: .4, kat: 'utstyr', w: 1.5, n: [1, 2], b: { arbeidsbenk: 2, hylle: 2, bil: 1.5 }, k: { låve: 2, uthus: 1.5 }, tekst: 'Til håndverk og feller.' },
    verktøy: { navn: 'Verktøykasse', enhet: 'stk.', vekt: 4.5, kat: 'utstyr', w: 2, n: [1, 1], b: { arbeidsbenk: 4, verktøyvogn: 4, hylle: 2, bil: 1 }, k: { industri: 2, uthus: 2, låve: 1.5 }, tekst: 'Hammer, sag, tang og skrutrekkere.' },
    sovepose: { navn: 'Sovepose', enhet: 'stk.', vekt: 1.6, kat: 'utstyr', w: 1.5, n: [1, 1], b: { skap: 3 }, k: { hytte: 2 }, tekst: 'Varm natt ute.' },
    feltflaske: { navn: 'Feltflaske', enhet: 'stk.', vekt: .25, kat: 'utstyr', w: 1, n: [1, 1], b: { skap: 1.5 }, k: { hytte: 1.5, hangar: 2 }, tekst: 'Ekstra flaske til vann.' },
    // sekker: plass i kg og hvor mye lettere vekten i sekken føles
    handlenett: { navn: 'Handlenett', enhet: 'stk.', vekt: .1, kat: 'sekk', sekk: { plass: 7, lettere: 0 }, w: 3, n: [1, 1], b: { kasse: 4, kjøkkenbenk: 1 }, k: { butikk: 3 }, tekst: 'Lite og lett, gjør ikke vekten lettere.' },
    skolesekk: { navn: 'Skolesekk', enhet: 'stk.', vekt: .5, kat: 'sekk', sekk: { plass: 12, lettere: .15 }, w: 2, n: [1, 1], k: { skole: 4, hus: 1.2, leil: 1.2 }, tekst: 'Grei til litt mat og vann.' },
    tursekk: { navn: 'Tursekk', enhet: 'stk.', vekt: 1.2, kat: 'sekk', sekk: { plass: 22, lettere: .3 }, w: 1.5, n: [1, 1], k: { hytte: 3 }, tekst: 'God bæremeis med hoftebelte.' },
    militærsekk: { navn: 'Militærsekk', enhet: 'stk.', vekt: 1.8, kat: 'sekk', sekk: { plass: 30, lettere: .4 }, w: .4, n: [1, 1], k: { hangar: 8, hytte: .6, hus: .6 }, tekst: 'Stor og solid, bærer godt.' },
  };

  // BEHOLDERNE: møbeltypene i spill/interior.js som det kan ligge noe i. navn = bestemt form («Åpne kjøleskapet»), kg = plassen,
  // kat = hva som er vanlig der, n = [minst, mest] ting (før byggets klasse ganger opp), kald = kjøleskap.
  const BEHOLDERE = {
    kjøleskap: { navn: 'kjøleskapet', tittel: 'Kjøleskap', kg: 25, kald: true, kat: { fersk: 6, drikke: 3, mat: 1.2 }, n: [1, 4] },
    kjøledisk: { navn: 'kjøledisken', tittel: 'Kjøledisk', kg: 80, kald: true, kat: { fersk: 6, drikke: 4, mat: 1 }, n: [2, 7] },
    kjøkkenbenk: { navn: 'kjøkkenskapene', tittel: 'Kjøkkenskap', kg: 30, kat: { mat: 6, drikke: 2, fersk: 1, sekk: .3, utstyr: .4 }, n: [1, 5] },
    skap: { navn: 'garderoben', tittel: 'Garderobe', kg: 40, kat: { utstyr: 3, sekk: 1.6, våpen: .55, ammo: 1.2, medisin: .8 }, n: [0, 3] },
    nattbord: { navn: 'nattbordet', tittel: 'Nattbord', kg: 4, kat: { medisin: 3, utstyr: 2, mat: 1, ammo: .6, våpen: .3 }, n: [0, 2] },
    tvbenk: { navn: 'TV-benken', tittel: 'TV-benk', kg: 10, kat: { utstyr: 2, mat: 1 }, n: [0, 2] },
    bokhylle: { navn: 'bokhylla', tittel: 'Bokhylle', kg: 12, kat: { utstyr: 2, medisin: .5, mat: .5 }, n: [0, 2] },
    pult: { navn: 'skrivebordet', tittel: 'Skrivebord', kg: 8, kat: { mat: 2, drikke: 1, utstyr: 2, medisin: 1 }, n: [0, 2] },
    kateter: { navn: 'kateteret', tittel: 'Kateter', kg: 8, kat: { mat: 2, utstyr: 2, medisin: 1 }, n: [0, 2] },
    arkivskap: { navn: 'arkivskapet', tittel: 'Arkivskap', kg: 15, kat: { utstyr: 1, mat: 1, medisin: 1 }, n: [0, 2] },
    skranke: { navn: 'skranken', tittel: 'Skranke', kg: 15, kat: { mat: 2, drikke: 2, medisin: 1, utstyr: 1 }, n: [0, 3] },
    vask: { navn: 'baderomsskapet', tittel: 'Baderomsskap', kg: 3, kat: { medisin: 5 }, n: [0, 2] },
    reol: { navn: 'reolen', tittel: 'Reol', kg: 60, kat: { mat: 6, drikke: 3, utstyr: .8, sekk: .2 }, n: [2, 6] },
    kasse: { navn: 'kassa', tittel: 'Kasse', kg: 10, kat: { mat: 2, drikke: 1, utstyr: 1, sekk: .5 }, n: [0, 3] },
    pall: { navn: 'pallen', tittel: 'Pall', kg: 100, kat: { mat: 3, drikke: 3, utstyr: 2 }, n: [0, 4] },
    pallereol: { navn: 'pallereolen', tittel: 'Pallereol', kg: 150, kat: { mat: 3, drikke: 3, utstyr: 3 }, n: [1, 5] },
    hylle: { navn: 'hylla', tittel: 'Hylle', kg: 30, kat: { utstyr: 4, ammo: 1, mat: 1, drikke: 1 }, n: [0, 3] },
    arbeidsbenk: { navn: 'verktøybenken', tittel: 'Verktøybenk', kg: 30, kat: { utstyr: 5, ammo: .4 }, n: [0, 3] },
    verktøyvogn: { navn: 'verktøyvogna', tittel: 'Verktøyvogn', kg: 20, kat: { utstyr: 5 }, n: [0, 2] },
    tønne: { navn: 'tønna', tittel: 'Tønne', kg: 25, kat: { drikke: 1, utstyr: 1 }, n: [0, 1] },
    bil: { navn: 'bilen', tittel: 'Bil', kg: 40, kat: { utstyr: 3, sekk: 1, drikke: 1, mat: 1, ammo: 1, medisin: .6, våpen: .3 }, n: [0, 3] },
  };
  const TYPER = Object.keys(BEHOLDERE);

  // LUT PER BYGGKLASSE (klassene fra hus3d / spill/interior.js): tomt = sjansen for at bygget alt er ransaket, rik = flere ting,
  // kat = ganger for hver slags ting (1 når den mangler)
  const KLASSER = {
    hus: { tomt: .25, rik: 1, kat: {} },
    hytte: { tomt: .25, rik: 1, kat: { våpen: 3, ammo: 3, utstyr: 1.5, mat: 1.2, sekk: 1.3 } },
    leil: { tomt: .3, rik: 1, kat: { våpen: .15, ammo: .4 } },
    uthus: { tomt: .3, rik: 1, kat: { utstyr: 2, ammo: 1.5, våpen: 1.2 } },
    låve: { tomt: .25, rik: 1, kat: { utstyr: 2, ammo: 2, våpen: 2 } },
    butikk: { tomt: 0, rik: 1.3, kat: { mat: 2, drikke: 2, fersk: 1.5, våpen: 0, ammo: 0, medisin: .6 } },
    kontor: { tomt: .35, rik: 1, kat: { våpen: .15, ammo: .15, drikke: 1.5 } },
    skole: { tomt: .35, rik: 1, kat: { sekk: 3, medisin: 1.5, våpen: 0, ammo: 0 } },
    sykehus: { tomt: .25, rik: 1, kat: { medisin: 6, våpen: 0, ammo: 0 } },
    industri: { tomt: .25, rik: 1, kat: { utstyr: 3, våpen: .2 } },
    lager: { tomt: .25, rik: 1.2, kat: { mat: 1.5, drikke: 1.5, utstyr: 2 } },
    kirke: { tomt: .5, rik: .7, kat: { våpen: 0, ammo: 0, medisin: 1.5 } },
    hangar: { tomt: .3, rik: 1, kat: { utstyr: 3, sekk: 2, ammo: 1.5 } },
    terminal: { tomt: .35, rik: 1, kat: { mat: 1.5, drikke: 2, sekk: 1.5, våpen: 0 } },
  };
  // leirens egne bygg (spill/interior3d.js LEIRBYGG): beholderne finnes, men er tomme – der lagrer du det du vil
  const LEIR = { brakke: 1, kontrollrom: 1, storkjøkken: 1, drivhus: 1 };

  const G = id => GJENSTANDER[id];
  const holder = id => !(G(id) && G(id).fersk);
  const ny = () => ({ t: {}, d: {} });
  const nøkkel = (i, type, k) => `${i}:${type}:${k}`;

  // alderen i spillminutter. e: tall (født) eller [alder da den kom inn, når]; C: så lenge kjøleskapet har strøm (spillminutt)
  function alder(e, nå, C) {
    if (Array.isArray(e)) { const [a0, te] = e, kald = C === undefined || C === null ? -Infinity : C;
      return a0 + REGLER.kald * Math.max(0, Math.min(nå, kald) - te) + Math.max(0, nå - Math.max(te, kald)); }
    return Math.max(0, nå - (+e || 0));
  }
  // 'fersk', 'gammel', 'råtten' – eller null når tingen holder
  function stadium(id, e, nå, C) { const g = G(id); if (!g || !g.fersk) return null; const d = alder(e, nå, C) / REGLER.dag; return d < g.fersk[0] ? 'fersk' : d < g.fersk[1] ? 'gammel' : 'råtten'; }
  // datoene følger antallet: mangler det datoer (noe annet har lagt til), er de nye ferske; er det for mange (noe er tatt ut), går de eldste
  function normaliser(B, nå, kald) { if (!B.d) B.d = {}; for (const id of Object.keys(B.d)) if (holder(id) || !(B.t[id] > 0)) delete B.d[id];
    for (const [id, n] of Object.entries(B.t)) { if (!(n > 0) || holder(id)) continue; const a = B.d[id] || (B.d[id] = []);
      if (a.length > n) { a.sort((p, q) => alder(q, nå, kald ? Infinity : null) - alder(p, nå, kald ? Infinity : null)); a.splice(0, a.length - n); }
      while (a.length < n) a.push(kald ? [0, nå] : nå); }
    return B; }
  const kgAv = (id, vekter) => (vekter && vekter[id] !== undefined ? vekter[id] : (G(id) ? G(id).vekt : 0));
  const kg = (B, vekter) => Math.round(Object.entries(B.t).reduce((s, [id, n]) => s + kgAv(id, vekter) * n, 0) * 1000) / 1000;

  // Flytt n av tingen id fra en beholder til en annen. o: { nå, fraKald, tilKald (strøm til – null/undefined = ikke kjøleskap; kjøleskap
  // uten strøm: -Infinity), erFraKald, erTilKald (er kjøleskap), stadium (bare de som er så ferske), plass (kg ledig i målet), vekter }.
  // Gir antallet som ble flyttet.
  function flytt(fra, til, id, n, o = {}) {
    const nå = o.nå || 0; normaliser(fra, nå, o.erFraKald); normaliser(til, nå, o.erTilKald);
    let tak = Math.min(Math.floor(n), fra.t[id] || 0); const v = kgAv(id, o.vekter);
    if (o.plass !== undefined && v > 0) tak = Math.min(tak, Math.max(0, Math.floor((o.plass + 1e-9) / v)));
    if (!(tak > 0)) return 0;
    if (holder(id)) { fra.t[id] -= tak; if (!fra.t[id]) delete fra.t[id]; til.t[id] = (til.t[id] || 0) + tak; return tak; }
    const a = fra.d[id], valgt = [];
    for (let q = 0; q < a.length && valgt.length < tak; q++) if (!o.stadium || stadium(id, a[q], nå, o.fraKald) === o.stadium) valgt.push(q);
    const ut = valgt.map(q => a[q]); for (let q = valgt.length - 1; q >= 0; q--) a.splice(valgt[q], 1);
    fra.t[id] -= ut.length; if (!fra.t[id]) { delete fra.t[id]; delete fra.d[id]; }
    const b = til.d[id] || (til.d[id] = []);
    for (const e of ut) { const al = alder(e, nå, o.fraKald); b.push(o.erTilKald ? [al, nå] : nå - al); }
    til.t[id] = (til.t[id] || 0) + ut.length; return ut.length;
  }
  // ta ut én (eller n) av tingen – den ferskeste først når stadium ikke er gitt (du spiser det beste); gir datoene som ble tatt
  function taUt(B, id, n, o = {}) { const nå = o.nå || 0; normaliser(B, nå, o.erKald); let tak = Math.min(n, B.t[id] || 0); if (!(tak > 0)) return [];
    if (holder(id)) { B.t[id] -= tak; if (!B.t[id]) delete B.t[id]; return new Array(tak).fill(null); }
    const a = B.d[id], rek = a.map((e, q) => q).filter(q => !o.stadium || stadium(id, a[q], nå, o.kald) === o.stadium).sort((p, q) => alder(a[p], nå, o.kald) - alder(a[q], nå, o.kald)).slice(0, tak).sort((p, q) => q - p);
    const ut = rek.map(q => a.splice(q, 1)[0]); B.t[id] -= ut.length; if (!B.t[id]) { delete B.t[id]; delete B.d[id]; } return ut; }

  // Det du ser i en beholder: én rad per ting og ferskhet («6 × 7,62 mm», «2 × Melk – råtten»), sortert etter slag og navn
  const REKKE = ['våpen', 'ammo', 'medisin', 'mat', 'fersk', 'drikke', 'utstyr', 'sekk'];
  function stabler(B, nå, C, o = {}) { normaliser(B, nå, o.erKald); const rader = [];
    for (const [id, n] of Object.entries(B.t)) { if (!(n > 0)) continue;
      if (holder(id)) { rader.push({ id, st: null, n }); continue; }
      const tel = {}; for (const e of B.d[id]) { const s = stadium(id, e, nå, C); tel[s] = (tel[s] || 0) + 1; } for (const s of ['fersk', 'gammel', 'råtten']) if (tel[s]) rader.push({ id, st: s, n: tel[s] }); }
    const navn = id => (o.navn ? o.navn(id) : (G(id) ? G(id).navn : id)), kat = id => (o.kat ? o.kat(id) : (G(id) ? G(id).kat : 'utstyr'));
    return rader.map(r => ({ ...r, kg: Math.round(kgAv(r.id, o.vekter) * r.n * 100) / 100 })).sort((a, b) => (REKKE.indexOf(kat(a.id)) - REKKE.indexOf(kat(b.id))) || navn(a.id).localeCompare(navn(b.id), 'nb') || ['fersk', 'gammel', 'råtten'].indexOf(a.st) - ['fersk', 'gammel', 'råtten'].indexOf(b.st)); }

  // Hva et måltid gjør: { sult, tørst, søvn, helse } (gammel mat metter mindre, råtten gjør deg dårlig)
  function måltid(id, st) { const g = G(id); if (!g || !g.spis) return null; const f = st === 'råtten' ? REGLER.råtten : st === 'gammel' ? REGLER.gammel : null, ut = { sult: 0, tørst: 0, søvn: 0, helse: 0 };
    for (const k of ['sult', 'tørst', 'søvn']) ut[k] = Math.round((g.spis[k] || 0) * (f && (g.spis[k] || 0) > 0 ? f[k] : 1));
    if (f && f.helse) ut.helse = f.helse; return ut; }

  // BEHOLDERNE I ET BYGG: møblene i planen som det kan ligge noe i, med nummer per type (stabilt for samme bygg)
  // (møbler som er flyttet – spill/mobler.js – har sin opprinnelige nøkkel i m.nk; den følger dem, så innholdet følger med)
  function beholdere(pl, i) { const tel = {}, ut = []; if (!pl || !pl.møbler) return ut;
    for (const m of pl.møbler) { if (!BEHOLDERE[m.type]) continue; const k = m.flyttet ? -1 : (tel[m.type] = (tel[m.type] || 0) + 1) - 1; ut.push({ type: m.type, k, m, nk: m.nk || nøkkel(i === undefined ? pl.i : i, m.type, k), ...BEHOLDERE[m.type] }); }
    return ut; }
  // avstanden fra (x, y) til kanten av møbelet (0 inni)
  function avstand(m, x, y) { const c = Math.cos(m.a || 0), s = Math.sin(m.a || 0), dx = x - m.x, dy = y - m.y, u = dx * c + dy * s, v = -dx * s + dy * c;
    return Math.hypot(Math.max(0, Math.abs(u) - (m.b || .5) / 2), Math.max(0, Math.abs(v) - (m.d || .5) / 2)); }

  // DET FASTE INNHOLDET i én beholder: kl = byggets klasse, type = møbeltypen, i = byggets nummer, k = nummeret blant like møbler.
  // Fersk mat har ligget der siden alt stoppet (dato 0).
  function innhold(kl, type, i, k) {
    const B = ny(), D = BEHOLDERE[type]; if (!D || LEIR[kl]) return B;
    const K = KLASSER[kl] || KLASSER.hus, frø = (Math.imul(i | 0, 131) + TYPER.indexOf(type) * 7919 + (k | 0) * 104729) | 0, r = n => hash(frø, n);
    const ransaket = hash(i | 0, 901) < K.tomt;
    const n = Math.round((D.n[0] + Math.floor((D.n[1] - D.n[0] + 1) * r(1))) * (K.rik || 1));
    const kandidater = []; let sum = 0;
    for (const [id, g] of Object.entries(GJENSTANDER)) { const w = (D.kat[g.kat] || 0) * (K.kat[g.kat] === undefined ? 1 : K.kat[g.kat]) * g.w * (g.b && g.b[type] !== undefined ? g.b[type] : 1) * (g.k && g.k[kl] !== undefined ? g.k[kl] : 1); if (w > 0) { kandidater.push([id, w]); sum += w; } }
    if (!sum) return B;
    for (let j = 0; j < n; j++) {
      if (ransaket && r(10 + j) > REGLER.ransaket) continue;
      let t = r(100 + j) * sum, id = kandidater[kandidater.length - 1][0]; for (const [kid, w] of kandidater) { t -= w; if (t <= 0) { id = kid; break; } }
      const g = G(id); let antall = g.n[0] + Math.floor((g.n[1] - g.n[0] + 1) * r(200 + j));
      antall = Math.min(antall, Math.floor((D.kg - kg(B) + 1e-9) / g.vekt)); if (antall <= 0) continue;
      if (g.kat === 'våpen' || g.kat === 'sekk') antall = Math.min(antall, Math.max(0, 1 - (B.t[id] || 0))); if (antall <= 0) continue;
      // våpen bare i det første møbelet av hver type i bygget (ellers fikk en hytte med to garderober tre-fire våpen)
      if (g.kat === 'våpen' && k > 0) continue;
      B.t[id] = (B.t[id] || 0) + antall;
      if (g.fersk) { const a = B.d[id] || (B.d[id] = []); for (let q = 0; q < antall; q++) a.push(D.kald ? [0, 0] : 0); }
    }
    return B;
  }

  // VEKTEN DU BÆRER. våpenKg = våpnene i beltet, tingKg = alt i lommer og sekk, rygg = sekken på ryggen (id eller null), ekstra = styrken.
  // Lommene fylles først; det som ligger i sekken, føles lettere (sekk.lettere).
  function bæring({ våpenKg = 0, tingKg = 0, rygg = null, ekstra = 0 }) {
    const S = rygg && G(rygg) && G(rygg).sekk ? G(rygg) : null, plass = REGLER.lommer + (S ? S.sekk.plass : 0);
    const iLomme = Math.min(tingKg, REGLER.lommer), iSekk = Math.max(0, tingKg - REGLER.lommer);
    const vekt = Math.round((våpenKg + (S ? S.vekt : 0) + iLomme + iSekk * (1 - (S ? S.sekk.lettere : 0))) * 100) / 100, evne = REGLER.bæreevne + (ekstra || 0), tung = evne * REGLER.svært;
    const status = vekt <= evne ? 'lett' : vekt <= tung ? 'tungt' : 'svært';
    const over = klem((vekt - evne) / Math.max(1, tung - evne), 0, 1);
    return { plass, tingKg: Math.round(tingKg * 100) / 100, vekt, evne, tung, status, fart: status === 'lett' ? 1 : status === 'tungt' ? 1 - (1 - REGLER.fartTungt) * over : REGLER.fartSvært,
      løp: status === 'lett' ? 1 : 1 - (1 - REGLER.løpTungt) * over, kanLøpe: status !== 'svært', tak: evne * REGLER.våpenTak };
  }
  const STATUS = { lett: 'Lett', tungt: 'Tungt – du går tregere og blir fortere sliten', svært: 'Svært tungt – du kan ikke løpe' };
  const STADIUM = { fersk: 'fersk', gammel: 'gammel', råtten: 'råtten' };

  // tall med komma, og et antall med enhet («6 × 7,62 mm»)
  const tall = v => String(Math.round(v * 100) / 100).replace('.', ',');
  const rad = (n, navn, st) => `${n} × ${navn}${st && st !== 'fersk' ? ' – ' + st : ''}`;

  const api = { REGLER, GJENSTANDER, BEHOLDERE, KLASSER, LEIR, REKKE, STATUS, STADIUM, ny, nøkkel, alder, stadium, normaliser, kg, flytt, taUt, stabler, måltid, beholdere, avstand, innhold, bæring, holder, tall, rad, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Lut = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
