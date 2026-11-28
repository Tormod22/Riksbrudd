/* Riksbrudd – EKSPORT (fase Ø6, 28. nov; docs/plan-selskap-okonomi.md kapittel 11, Ø6 i kapittel 16, spørsmål 5 i kapittel 18).
 * Regler uten DOM. Node: const Eksport = require('./eksport'); nettleser: globalThis.Eksport. Visningen: spill/eksport-visning.js (window.EksportSpill).
 *
 * Kronen er nesten verdiløs etter Kronekrakket. Utenlandske kjøpere sender EKSPORTORDRE («Kjøper i Hamburg vil ha 200 m³ planker innen 10 døgn»)
 * med mengde, frist og en pris i EUROKREDITT – en egen utenlandsk valuta (spørsmål 5: forslaget i planen er brukt) som ikke taper seg med
 * inflasjonen. Prisen er høyere og mer stabil enn hjemme.
 *  - UT SJØVEIEN: varene kjøres til en havn (leirens egen kai, et tettsted dere holder eller en havneby dere har avtale med). Når alt ligger på
 *    kaia, kommer et utenlandsk fraktskip, laster og går – da er ordren levert og betalt. Pirater og rivaler kan ta en last på sjøen (liten
 *    sjanse, større uten avtale med havnebyen). Store havner tar store laster, en middels havn bare små, en liten kai ingen skip.
 *  - UT OVER GRENSA: varene kjøres til en grensestasjon (en kjent grenseovergang på riksgrensa). Med avtale med Grensevakta (et oppdiktet
 *    svensk selskap) betaler dere per tur; uten avtale er det smugling – gratis, men tollen kan beslaglegge lasten (og ryktet ute faller).
 *  - EUROKREDITT kan veksles til kroner (kursen stiger med inflasjonen, minus et gebyr) eller brukes på ting som bare finnes ute.
 * ALLE TALLENE ER CLAUDES FORSLAG (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  // ---------- tallene (alle er Claudes forslag) ----------
  const REGLER = {
    // varene som kan eksporteres: pris i eurokreditt per enhet (1 eurokreditt ≈ 1000 kr ved start, så planker gir ca. 36 000 kr mot
    // 20 000 kr i markedet og 25 000 kr for en levering hjemme – økonomitesten viste at 32 knapt lønte seg, fordi plankene er flaskehalsen), mengden en ordre spør etter, og plassen i lasterommet per enhet (som i spill/sjo.js: m³/t = 1, diesel 0,01 per liter)
    VARER: {
      tre: { navn: 'planker', enhet: 'm³', ek: 36, mengde: [40, 200], steg: 10, plass: 1 },
      tømmer: { navn: 'tømmer', enhet: 'm³', ek: 12, mengde: [60, 240], steg: 20, plass: 1 },
      ved: { navn: 'ved', enhet: 'm³', ek: 13, mengde: [30, 120], steg: 10, plass: 1 },
      stål: { navn: 'stål', enhet: 't', ek: 85, mengde: [5, 25], steg: 5, plass: 1 },
      diesel: { navn: 'diesel', enhet: 'l', ek: 4, mengde: [2000, 8000], steg: 500, plass: .01 },
    },
    // planker og tømmer først (det brukeren nevnte); ved, stål og diesel når så mange eksportordre er levert
    førstVarer: ['tre', 'tre', 'tømmer'], senereVarer: ['tre', 'tømmer', 'ved', 'stål', 'diesel'], senereEtter: 2,
    // prisen svinger bare litt per ordre (±4 %, hjemme ±12 % per døgn); grensekjøperne betaler litt mindre (kortere vei); ryktet ute
    // flytter prisen ±10 %
    svingning: .08, grensePris: .95,
    // fristen (døgn) og hvor lenge et tilbud står (spillminutter)
    frist: [6, 12], tilbudStår: 2 * 1440,
    // om morgenen: sjanse for en ny ordre, høyst så mange åpne tilbud og så mange aktive ordre samtidig
    nySjanse: .7, maksTilbud: 3, maksAktive: 3,
    // ordrene kommer når selskapet har nådd trinn 3 (spill/trinn.js), eller når dere har en havn eller en grensestasjon å eksportere fra
    trinn: 3,
    // HAVNENE: hvor mye et skip kan ta (plassenheter) etter kaistørrelsen (Kaier.størrelse); en liten kai tar ingen skip.
    // En havn må ligge så nær leiren (m) for at varene kan kjøres dit
    havn: { liten: 0, middels: 80, stor: 400 }, havnMaks: 60000,
    // SKIPET: kommer så mange timer etter at alt ligger på kaia, og laster så lenge (timer)
    skip: { kommer: [6, 18], laster: 4, navn: ['MS Nordstern', 'MV Baltic Trader', 'MS Hanna Vos', 'MV Skagerrak Star', 'MS Elbe Kontor', 'MV Gdynia Pearl'] },
    // PIRATER OG RIVALER på sjøen: sjansen for at lasten tas, med avtale med havnebyen (eller en by dere holder) og uten
    pirat: { avtale: .03, uten: .08 },
    // GRENSA: en grensestasjon så nær leiren (m) gjør at ordrene kommer før trinn 3 (nær), og dere kan kjøre til stasjoner innen maks m;
    // per tur med Grensevakta (kr, ganges med inflasjonen); smugling: sjansen for beslag per tur
    grense: { nær: 80000, maks: 200000, perTur: 150000, beslag: .25, firma: 'Grensevakta', fulltNavn: 'Gränsvakten Nord AB' },
    // GRÅFJELL FRAKT kjører til havna/grensestasjonen (som i spill/vare.js): andel av eksportverdien i kroner, kmt km/t langs en veg omveg ×
    // luftlinja + fast timer lasting, sjansen for tap og erstatningen (andel av verdien) – lavere andel enn for leveringer hjemme (lang kjøring)
    frakt: { firma: 'Gråfjell Frakt', andel: .08, kmt: 35, omveg: 1.35, fast: 3, tap: .04, erstatning: .8 },
    // varene er framme innen så mange meter av havna/grensestasjonen; tas på innen leir meter av leiren
    nær: { fram: 300, leir: 400 },
    // RYKTET UTE (0–100, start 50): levert +5, beslag −8, utløpt −10; flytter prisen (se svingning) og sjansen for nye ordre
    rykte: { start: 50, levert: 5, beslag: -8, utløpt: -10 },
    // EUROKREDITT: kronekursen ved start (kr per eurokreditt), ganges med inflasjonen i markedet (spill/spillet.js, M.infl); gebyr ved veksling
    kurs: 1000, gebyr: .03,
    // TING SOM BARE FINNES UTE (pris i eurokreditt)
    BUTIKK: {
      helideler: { navn: 'Helikopterdeler', ek: 60, tekst: 'Originale deler: reparerer helikopteret helt (ligger på lager til det trengs).' },
      radio: { navn: 'Utenlandske feltradioer', ek: 45, tekst: 'Feltradio til alle egne lag som ikke har en – de når så langt som leirens radio.' },
      ammo: { navn: 'Ammunisjon av høy kvalitet', ek: 25, tekst: '300 skudd 5,56 mm og 60 skudd 7,62 mm i sekken.' },
    },
  };
  // KJØPERNE (oppdiktede firma i ekte byer); x, y = byen i kartets meter (EPSG:25833), bare til streken i kartet
  const KJØPERE = {
    sjø: [
      { navn: 'Elbe Holzhandel', by: 'Hamburg', land: 'Tyskland', x: 168190, y: 5945138 },
      { navn: 'Maas Timber', by: 'Rotterdam', land: 'Nederland', x: -222500, y: 5804611 },
      { navn: 'Granite Coast Supply', by: 'Aberdeen', land: 'Skottland', x: -528100, y: 6464509 },
      { navn: 'Bałtyk Drewno', by: 'Gdańsk', land: 'Polen', x: 737193, y: 6028607 },
      { navn: 'Västkust Trä', by: 'Göteborg', land: 'Sverige', x: 319440, y: 6399348 },
    ],
    grense: [
      { navn: 'Värmlandsbygg', by: 'Karlstad', land: 'Sverige', x: 414778, y: 6583327 },
      { navn: 'Jämtlands Virke', by: 'Östersund', land: 'Sverige', x: 481878, y: 7005695 },
      { navn: 'Norrbottens Trä', by: 'Luleå', land: 'Sverige', x: 829278, y: 7291837 },
      { navn: 'Malmfältens Bygg', by: 'Kiruna', land: 'Sverige', x: 719415, y: 7535406 },
      { navn: 'Pohjolan Puu', by: 'Oulu', land: 'Finland', x: 991772, y: 7250449 },
      { navn: 'Lapin Rakennus', by: 'Ivalo', land: 'Finland', x: 1006265, y: 7668316 },
    ],
  };
  // GRENSESTASJONENE (VALGET: en enkel liste over kjente grenseoverganger for bil mot Sverige og Finland – vegnettet i spillet slutter ved
  // grensa, så «nærmeste veg som krysser» kan ikke regnes ut). Punktet er nærmeste punkt på riksgrensa (data/riksgrense.json) fra
  // overgangen; koordinatene er regnet ut én gang (lengde/bredde -> EPSG:25833) og ligger innen ca. 1–6 km fra vegen.
  const GRENSER = [
    { id: 'svinesund', navn: 'Svinesund', veg: 'E6', x: 285701, y: 6556760 }, { id: 'orje', navn: 'Ørje', veg: 'E18', x: 316111, y: 6597922 },
    { id: 'magnor', navn: 'Magnor', veg: 'rv. 2', x: 345247, y: 6646584 }, { id: 'vauldalen', navn: 'Vauldalen', veg: 'fv. 31', x: 348949, y: 6945798 },
    { id: 'storlien', navn: 'Storlien', veg: 'E14', x: 354139, y: 7028526 }, { id: 'gaddede', navn: 'Gäddede', veg: 'fv. 74', x: 456024, y: 7150625 },
    { id: 'umbukta', navn: 'Umbukta', veg: 'E12', x: 485729, y: 7335440 }, { id: 'graddis', navn: 'Graddis', veg: 'rv. 77', x: 539850, y: 7410215 },
    { id: 'bjornfjell', navn: 'Bjørnfjell', veg: 'E10', x: 627320, y: 7591340 }, { id: 'helligskogen', navn: 'Helligskogen', veg: 'E8', x: 734064, y: 7674389 },
    { id: 'kivilompolo', navn: 'Kivilompolo', veg: 'E45', x: 838543, y: 7641219 }, { id: 'karigasniemi', navn: 'Karigasniemi', veg: 'rv. 92', x: 923446, y: 7736977 },
    { id: 'utsjoki', navn: 'Utsjoki', veg: 'E75', x: 958680, y: 7801341 }, { id: 'polmak', navn: 'Polmak', veg: 'E75', x: 990809, y: 7824447 },
  ];
  const tall = (v, r = 0) => (Number.isFinite(+v) ? +v : r);
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const nf = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const ekTekst = v => `${Math.round(v).toLocaleString('nb-NO').replace(/\s/g, ' ')} eurokreditt`;
  const mengdeTekst = (vare, m) => `${Math.round(m * 10) / 10 === Math.round(m) ? Math.round(m).toLocaleString('nb-NO').replace(/\s/g, ' ') : nf(m)} ${(REGLER.VARER[vare] || {}).enhet || ''}`.trim();
  const plass = (vare, m) => tall(m) * ((REGLER.VARER[vare] || {}).plass || 1);
  function lagRand(frø) { let a = (frø >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const velg = (L, r) => L[Math.floor(r() * L.length) % L.length];

  function ny() { return { versjon: 1, ek: 0, nr: 0, tilbud: [], aktive: [], ferdige: [], grensevakt: false, rykte: REGLER.rykte.start, lager: { helideler: 0 }, sum: { ek: 0, vekslet: 0, kr: 0, levert: 0, tapt: 0, beslag: 0, utløpt: 0, brukt: 0 }, dag: -1 }; }

  // ---------- havner og grense ----------
  // hvor mye et skip tar fra en havn av denne størrelsen
  const skipTar = størrelse => REGLER.havn[størrelse] || 0;
  // grensestasjonene innen maks meter fra (x, y), nærmest først: [{ ...stasjon, d }]
  function grenserNær(x, y, maks = REGLER.grense.maks) { return GRENSER.map(g => ({ ...g, d: Math.hypot(g.x - x, g.y - y) })).filter(g => g.d <= maks).sort((a, b) => a.d - b.d); }
  // kommer ordrene? o: { trinn, havner: antall havner som tar skip, grenser: antall grensestasjoner innen REGLER.grense.nær }
  const åpen = o => tall(o && o.trinn) >= REGLER.trinn || tall(o && o.havner) > 0 || tall(o && o.grenser) > 0;
  const rykteFaktor = S => .9 + klem(tall(S.rykte, 50), 0, 100) / 500;

  // ---------- ordrene ----------
  // lager én ordre. o: { rand, vei ('sjø' | 'grense'), størst (største skip dere kan laste: plassenheter), vare }
  function lagOrdre(S, nå, o = {}) {
    const r = o.rand || lagRand(S.nr * 977 + Math.floor(nå) + 3), vei = o.vei || (r() < .6 ? 'sjø' : 'grense');
    const vare = o.vare || velg(S.sum.levert >= REGLER.senereEtter ? REGLER.senereVarer : REGLER.førstVarer, r), V = REGLER.VARER[vare];
    // mengden: innenfor varens spenn, men aldri mer enn den største havna tar (sjø) eller halve spennet (grense: mange turer med lastebil)
    let [a, b] = V.mengde; if (vei === 'grense') b = a + (b - a) / 2;
    if (vei === 'sjø' && o.størst > 0) b = Math.min(b, o.størst / V.plass);
    b = Math.max(V.steg, b); a = Math.min(a, b);
    const mengde = Math.max(V.steg, Math.round((a + r() * (b - a)) / V.steg) * V.steg);
    const kjøper = velg(KJØPERE[vei], r), døgn = REGLER.frist[0] + Math.floor(r() * (REGLER.frist[1] - REGLER.frist[0] + 1));
    const prisEk = Math.round(V.ek * (1 + (r() - .5) * REGLER.svingning) * (vei === 'grense' ? REGLER.grensePris : 1) * rykteFaktor(S) * 10) / 10;
    const k = { id: 'e' + (++S.nr), kjøper, vei, vare, mengde, prisEk, betaling: Math.round(prisEk * mengde), døgn, tilbudt: Math.round(nå), utløper: Math.round(nå + REGLER.tilbudStår),
      status: 'tilbud', ut: null, iHavn: 0, levert: 0, turer: [], skip: null, frist: null };
    k.tittel = tittel(k); return k;
  }
  // om morgenen: kanskje en ny ordre, gamle tilbud går ut. o: { rand, åpen (åpen(...)), vei ('sjø'/'grense'/null = begge), størst }
  function morgen(S, nå, o = {}) {
    const r = o.rand || lagRand(S.nr * 131 + Math.floor(nå) + 17), nye = [];
    S.tilbud = S.tilbud.filter(k => k.utløper > nå);
    if (!o.åpen) return nye;
    const sjanse = REGLER.nySjanse * (.6 + klem(tall(S.rykte, 50), 0, 100) / 125);
    if (S.tilbud.length < REGLER.maksTilbud && r() < sjanse) { const k = lagOrdre(S, nå, { rand: r, vei: o.vei || null, størst: o.størst }); S.tilbud.push(k); nye.push(k); }
    return nye;
  }
  // ta ordren og velg hvor den skal ut: ut = { slag: 'havn' | 'grense', id, navn, x, y, størrelse (havn), avtale (havn: true = by dere holder
  // eller har avtale med) }. Gir { ok } eller { feil }
  function ta(S, id, ut, nå) {
    const k = S.tilbud.find(q => q.id === id); if (!k) return { feil: 'Fant ikke ordren.' };
    if (S.aktive.length >= REGLER.maksAktive) return { feil: `Dere har alt ${REGLER.maksAktive} eksportordre i gang.` };
    const f = utFeil(k, ut); if (f) return { feil: f };
    S.tilbud = S.tilbud.filter(q => q !== k); k.status = 'aktiv'; k.godtatt = Math.round(nå); k.frist = Math.round(nå + k.døgn * 1440); k.ut = { ...ut }; S.aktive.push(k);
    return { ok: true, k };
  }
  // passer utgangen for ordren? Gir feilteksten eller null
  function utFeil(k, ut) {
    if (!ut) return k.vei === 'sjø' ? 'Velg en havn – leirens kai, et tettsted dere holder eller en havneby dere har avtale med.' : 'Ingen grensestasjon innen rekkevidde.';
    if (k.vei === 'sjø') { if (ut.slag !== 'havn') return 'Denne ordren skal sjøveien – velg en havn.'; const tar = skipTar(ut.størrelse);
      if (!tar) return `${ut.navn} er en liten kai – fraktskipene legger ikke til der.`;
      if (plass(k.vare, k.mengde) > tar + 1e-6) return `${ut.navn} er for liten: skipene der tar høyst ${mengdeTekst(k.vare, tar / REGLER.VARER[k.vare].plass)}. Store laster trenger en stor havn.`;
      return null; }
    return ut.slag === 'grense' ? null : 'Denne ordren skal over grensa – velg en grensestasjon.';
  }

  // ---------- lasten fram til havna / over grensa ----------
  // varene er framme på kaia (sjø). Gir mengden som ble lagt der
  function iHavn(k, m) { const t = Math.max(0, Math.min(tall(m), k.mengde - tall(k.iHavn))); k.iHavn = Math.round((tall(k.iHavn) + t) * 10) / 10; return t; }
  // pris for en tur over grensa med Grensevakta (kr): perTur × inflasjonen
  const turPris = infl => Math.round(REGLER.grense.perTur * Math.max(1, tall(infl, 1)) / 1000) * 1000;
  // en tur kommer fram til grensestasjonen. smugling = uten avtale. Gir { levert, beslag }
  function overGrensa(S, k, m, smugling, r) {
    const rr = r || Math.random; m = Math.max(0, Math.min(tall(m), k.mengde - tall(k.levert)));
    if (smugling && rr() < REGLER.grense.beslag) { S.rykte = klem(tall(S.rykte, 50) + REGLER.rykte.beslag, 0, 100); S.sum.beslag++; return { levert: 0, beslag: m }; }
    k.levert = Math.round((tall(k.levert) + m) * 10) / 10; return { levert: m, beslag: 0 };
  }
  // ---------- steget: skipet, betalingen, fristen ----------
  // o: { rand, avtale(k) -> true når havna er i en by dere holder eller har avtale med }. Gir hendelser:
  // { type: 'skipBestilt' | 'skipKom' | 'levert' (ek) | 'tapt' | 'utløpt' (tilbake: mengde på kaia som kan tas hjem), k }
  function steg(S, nå, o = {}) {
    const r = o.rand || lagRand(S.nr * 389 + Math.floor(nå) + 29), ut = [];
    for (const k of S.aktive.slice()) {
      if (k.vei === 'sjø') {
        if (!k.skip && tall(k.iHavn) >= k.mengde - 1e-6) {
          const [a, b] = REGLER.skip.kommer; k.skip = { navn: velg(REGLER.skip.navn, r), ankommer: Math.round(nå + (a + r() * (b - a)) * 60), ved: false, går: null };
          ut.push({ type: 'skipBestilt', k });
        }
        if (k.skip && !k.skip.ved && nå >= k.skip.ankommer) { k.skip.ved = true; k.skip.går = Math.round(k.skip.ankommer + REGLER.skip.laster * 60); ut.push({ type: 'skipKom', k }); }
        if (k.skip && k.skip.ved && nå >= k.skip.går) {
          const sjanse = (o.avtale ? o.avtale(k) : !!(k.ut && k.ut.avtale)) ? REGLER.pirat.avtale : REGLER.pirat.uten;
          if (r() < sjanse) { slutt(S, k, 'tapt'); S.sum.tapt++; ut.push({ type: 'tapt', k }); }
          else { betal(S, k); ut.push({ type: 'levert', k, ek: k.betaling }); }
          continue;
        }
      } else if (tall(k.levert) >= k.mengde - 1e-6) { betal(S, k); ut.push({ type: 'levert', k, ek: k.betaling }); continue; }
      // fristen: et skip som alt ligger ved kaia, får gå; ellers er ordren ute (det som ligger på kaia, kan hentes hjem)
      if (nå > k.frist && !(k.skip && k.skip.ved)) { const tilbake = k.vei === 'sjø' ? tall(k.iHavn) : 0; slutt(S, k, 'utløpt'); S.sum.utløpt++;
        S.rykte = klem(tall(S.rykte, 50) + REGLER.rykte.utløpt, 0, 100); ut.push({ type: 'utløpt', k, tilbake }); }
    }
    return ut;
  }
  function slutt(S, k, status) { k.status = status; k.slutt = Math.round(tall(k.frist)); S.aktive = S.aktive.filter(q => q !== k); S.ferdige.unshift(k); S.ferdige = S.ferdige.slice(0, 8); }
  function betal(S, k) { S.ek = Math.round((tall(S.ek) + k.betaling) * 10) / 10; S.sum.ek += k.betaling; S.sum.levert++; S.rykte = klem(tall(S.rykte, 50) + REGLER.rykte.levert, 0, 100); slutt(S, k, 'levert'); }
  // avbryt en aktiv ordre (ingen bot, men ryktet ute faller som ved utløpt). Gir { tilbake }
  function avbryt(S, id) { const k = S.aktive.find(q => q.id === id); if (!k) return { feil: 'Fant ikke ordren.' }; if (k.skip && k.skip.ved) return { feil: 'Skipet laster alt – det går snart.' };
    const tilbake = k.vei === 'sjø' ? tall(k.iHavn) : 0; slutt(S, k, 'avbrutt'); S.rykte = klem(tall(S.rykte, 50) + REGLER.rykte.utløpt, 0, 100); return { ok: true, k, tilbake }; }

  // ---------- eurokreditt ----------
  // kronekurs (kr per eurokreditt) med inflasjonen; netto etter gebyret
  const kurs = infl => Math.round(REGLER.kurs * Math.max(1, tall(infl, 1)));
  const nettoKurs = infl => kurs(infl) * (1 - REGLER.gebyr);
  // veksle ek eurokreditt til kroner. Gir { kr, ek } eller { feil }
  function veksle(S, ek, infl) { ek = Math.min(tall(ek), tall(S.ek)); if (!(ek > 0)) return { feil: 'Dere har ingen eurokreditt å veksle.' };
    const kr = Math.round(ek * nettoKurs(infl)); S.ek = Math.round((S.ek - ek) * 10) / 10; S.sum.vekslet += ek; S.sum.kr += kr; return { kr, ek }; }
  // kjøp noe som bare finnes ute. Gir { ok, ting } eller { feil }
  function kjøpUte(S, id) { const T = REGLER.BUTIKK[id]; if (!T) return { feil: 'Ukjent vare.' }; if (tall(S.ek) < T.ek) return { feil: `${T.navn} koster ${ekTekst(T.ek)} – dere har ${ekTekst(S.ek)}.` };
    S.ek = Math.round((S.ek - T.ek) * 10) / 10; S.sum.brukt += T.ek; if (id === 'helideler') S.lager.helideler = tall(S.lager.helideler) + 1; return { ok: true, ting: T }; }
  // eurokredittens verdi i kroner
  const iKroner = (S, infl) => Math.round(tall(S.ek) * nettoKurs(infl));

  // ---------- tekstene ----------
  function tittel(k) { const V = REGLER.VARER[k.vare]; return `${k.kjøper.navn} i ${k.kjøper.by} vil ha ${mengdeTekst(k.vare, k.mengde)} ${V.navn} innen ${k.døgn} døgn`; }
  function krav(k, infl) {
    const V = REGLER.VARER[k.vare], kr = Math.round(k.betaling * nettoKurs(infl));
    return `${k.kjøper.navn} (${k.kjøper.by}, ${k.kjøper.land}) betaler ${nf(k.prisEk)} eurokreditt per ${V.enhet} – ${ekTekst(k.betaling)} i alt (ca. ${Math.round(kr / 1e5) / 10} mill. kr i dag, og eurokreditten taper seg ikke).`
      + (k.vei === 'sjø' ? ' Kjør varene til en havn. Når alt ligger på kaia, kommer et fraktskip og henter dem. Store laster trenger en stor havn.'
        : ` Kjør varene til en grensestasjon. Med avtale med ${REGLER.grense.firma} koster hver tur litt; uten avtale er det smugling (tollen kan ta lasten).`);
  }
  // linja om framdriften
  function status(k, nå) {
    const V = REGLER.VARER[k.vare], t = m => (m >= 120 ? nf(m / 60) + ' t' : Math.max(1, Math.round(m)) + ' min');
    if (k.vei === 'sjø') { if (k.skip && k.skip.ved) return `${k.skip.navn} laster ved ${k.ut.navn} – går om ${t(k.skip.går - nå)}.`;
      if (k.skip) return `Alt ligger på kaia i ${k.ut.navn}. ${k.skip.navn} kommer om ${t(k.skip.ankommer - nå)}.`;
      return `På kaia i ${k.ut ? k.ut.navn : 'havna'}: ${mengdeTekst(k.vare, k.iHavn)} av ${mengdeTekst(k.vare, k.mengde)} ${V.navn}. Skipet kommer når alt er der.`; }
    return `Over grensa ved ${k.ut ? k.ut.navn : 'grensa'}: ${mengdeTekst(k.vare, k.levert)} av ${mengdeTekst(k.vare, k.mengde)} ${V.navn}.`;
  }

  // ---------- lagring ----------
  function tilJSON(S) { return JSON.parse(JSON.stringify(S)); }
  function fraJSON(d) { const S = ny(); if (!d || d.versjon !== 1) return S;
    S.ek = Math.max(0, tall(d.ek)); S.nr = Math.max(0, Math.floor(tall(d.nr))); S.grensevakt = !!d.grensevakt; S.rykte = klem(tall(d.rykte, REGLER.rykte.start), 0, 100); S.dag = tall(d.dag, -1);
    const ok = k => k && typeof k.id === 'string' && REGLER.VARER[k.vare] && (k.vei === 'sjø' || k.vei === 'grense') && k.kjøper && tall(k.mengde) > 0;
    S.tilbud = (d.tilbud || []).filter(ok); S.aktive = (d.aktive || []).filter(k => ok(k) && k.ut); S.ferdige = (d.ferdige || []).filter(ok).slice(0, 8);
    for (const k of S.aktive) { k.turer = Array.isArray(k.turer) ? k.turer : []; k.iHavn = tall(k.iHavn); k.levert = tall(k.levert); }
    S.lager = { helideler: Math.max(0, Math.floor(tall(d.lager && d.lager.helideler))) }; S.sum = { ...ny().sum, ...(d.sum || {}) }; return S; }

  const api = { REGLER, KJØPERE, GRENSER, ny, skipTar, grenserNær, åpen, lagOrdre, morgen, ta, utFeil, iHavn, turPris, overGrensa, steg, avbryt, kurs, nettoKurs, veksle, kjøpUte, iKroner,
    tittel, krav, status, ekTekst, mengdeTekst, plass, tilJSON, fraJSON, lagRand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Eksport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
