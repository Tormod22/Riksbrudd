/* Riksbrudd – RIVALENE GJØR DET SAMME (fase Ø8, 28. nov; docs/plan-selskap-okonomi.md kapittel 15 punkt 4, 3.3, 8 og 9).
 * Regler uten DOM (Node: require('./rival'); nettleser: globalThis.Rival). Visningen og koblingen til spillet: spill/rival-visning.js.
 * Ravnsund (rød) og Mosevakt (grønn) bruker de samme systemene som spilleren, i en enkel, regnet form uten egne figurer:
 *  - ØKONOMI: kassa er den samme som eskaleringen bruker (spill/eskalering.js, Ø.kr). Her kommer det som går ut og inn i tillegg:
 *    lønn til lagene (15 000 kr per mann per døgn, samme som spilleren), betaling fra byavtaler, kontrakter de tar, og ett sagbruk i et
 *    tettsted de holder (regnet som produksjon.js: 1,1 m³ planker i timen, uten folk). Kassa bestemmer hvor mange lag de har råd til
 *    (rådTak): en rik rival får flere lag enn grunntaket, en fattig færre, og en rival som ikke kan betale lønn, mister lag.
 *  - VEI TIL SEIER (seier.js): rivalen velger makt, penger eller gjenoppbygging etter hva den er god på (velgVei), og prioriterer etter det
 *    (PRIORITET: hvor mange lag som vokter avtalebyer, hvor ivrig den er etter kontrakter og sagbruk, om den reparerer).
 *  - SABOTASJE: sjelden, mer når rivalen ligger bak (sabotasjeSjanse, sabotasjeMål).
 *  - simuler(): en enkel rival som spiller av seg selv i døgnsteg (økonomitesten i pipeline/fliser/test_rival.js).
 * ALLE TALL ER CLAUDES FORSLAG (spillverdier, ikke fasit), unntatt lønnen (brukerens tall for spilleren, brukt likt for rivalene).
 */
(function (rot) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const REGLER = {
    // lønn: kr per mann per døgn (brukerens tall); mannPerLag brukes bare når lagets menn ikke er kjent (modellen)
    lønn: 15000, mannPerLag: 8,
    // RÅD TIL LAG (Claudes forslag): + ett lag per «rikPer» kr i kassa (høyst «rikMaks» over grunntaket); har rivalen ikke penger til
    // «reserve» døgn med lønn for grunntaket (kassa + døgnets overskudd før lønn), får den bare så mange lag som den kan betale; aldri under «min»
    tak: { rikPer: 8e6, rikMaks: 3, reserve: 2, min: 1 },
    // et lag går fra rivalen etter så mange spillminutter uten lønn (kassa tom) – bare når rivalen har flere lag enn den har råd til
    deserter: 24 * 60,
    // SAGBRUKET (Claudes forslag, tallene fra produksjon.js og leir.js): pris som et sagbruk i leiren, planker i timen ved full drift,
    // plankeprisen (Leir.MATERIALER.tre) og andelen den får ved salg; folkene på saga får lønn. Kjøpes når kassa har pris + reserve.
    // Uten et tettsted rivalen holder, står saga (tettstedet er tapt = saga er tapt).
    sag: { pris: 6e6, reserve: 4e6, perTime: 1.1, plankePris: 20000, salg: .5, folk: 3, slitasje: .0015 },
    // KONTRAKTER: ekstra sjanse per døgn for å ta et åpent tilbud (utenom selskap.js sin egen tarPerDag), etter veien
    kontrakt: { ekstra: { makt: 0, penger: .3, gjenoppbygging: .1 } },
    // FIRMAENE (Claudes forslag): fast kunde etter «kundeEtter» kontrakter levert for firmaet (og spilleren er ikke fast kunde der),
    // varer «kundeDøgn» døgn; da tar rivalen firmaets åpne tilbud med sjanse «tarFast» per døgn. Felles anlegg: sjanse per døgn når kassa
    // har prisen + «anleggReserve» og veien er penger (gjenoppbygging halvparten, makt aldri).
    firma: { kundeEtter: 2, kundeDøgn: 10, tarFast: .5, anleggSjanse: .2, anleggReserve: 4e6, andelSjanse: .25, andelKr: 2e6 },
    // VEIEN: bytter bare når en annen vei er «bytt» ganger bedre; stil: Ravnsund (marked .9) liker penger, Mosevakt (tradisjon .8) gjenoppbygging
    vei: { bytt: 1.25, stil: { rød: { penger: 1.2, makt: 1.05 }, grønn: { gjenoppbygging: 1.25 } } },
    // SABOTASJE (Claudes forslag): sjanse per spilldøgn per rival; × «bak» når rivalen ligger bak deg (verdi eller tettsteder), × «pakt» når
    // dere har en pakt (de risikerer den), × «vakt» når minst to av folkene dine er på vakt; ikke de første «ikkeFør» spillminuttene,
    // og høyst én gang per «pause» spillminutter per rival. En maskin mister «maskinSkade» av hp, et lager «lagerAndel» av én vare.
    sabotasje: { sjanse: .04, bak: 2.5, pakt: .5, vakt: .5, ikkeFør: 3 * 1440, pause: 2 * 1440, maskinSkade: .35, lagerAndel: .2 },
    // GJENOPPBYGGING: en rival på den veien reparerer én sprengt ting nær tettstedene sine per døgn for så mye
    reparer: { kr: 1.5e6, radius: 15000 },
  };
  const VEIER = ['makt', 'penger', 'gjenoppbygging'];
  const VEIORD = { makt: 'makt', penger: 'penger', gjenoppbygging: 'gjenoppbygging' };
  // PRIORITET per vei (Claudes forslag): vokt = mann per avtaleby (× løftet), sagFra = døgn før de vil kjøpe sagbruk, reparer = reparerer
  // sprengte ting nær tettstedene sine, leir = går løs på leiren din (false: lagene holder det de har i stedet). Makt: som før – tar tettsteder.
  // Kontraktene og firmaene etter veien: REGLER.kontrakt.ekstra og firma.anleggSjanse (penger mest, makt ingenting).
  const PRIORITET = {
    makt: { vokt: 1, sagFra: 12, reparer: false, leir: true, tekst: 'tar tettsteder' },
    penger: { vokt: 1.25, sagFra: 3, reparer: false, leir: true, tekst: 'tar kontrakter, bygger sagbruk og frir til byene' },
    gjenoppbygging: { vokt: 1, sagFra: 6, reparer: true, leir: false, tekst: 'holder tettstedene sine og reparerer' },
  };
  const tall = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- lønn og råd til lag ----------
  // lag: tall (antall lag) eller liste av lag ({ menn: [] } / { mann }). Gir kr per døgn.
  function lønnDøgn(lag) {
    if (Array.isArray(lag)) return lag.reduce((s, l) => s + (Array.isArray(l.menn) ? l.menn.filter(m => m.hp > 0).length : tall(l.mann, REGLER.mannPerLag)), 0) * REGLER.lønn;
    return Math.max(0, tall(lag)) * REGLER.mannPerLag * REGLER.lønn;
  }
  // Hvor mange lag rivalen har råd til. grunn = taket fra Fraksjoner.lagTak/Eskalering.tak; o = { kasse, inntekt (kr per døgn før lønn),
  // lønnLag (kr per lag per døgn) }. Rik: + ett lag per rikPer kr (høyst rikMaks). Fattig: så mange lag kassa og inntekten kan betale.
  function rådTak(grunn, o = {}) {
    const T = REGLER.tak, g = Math.max(T.min, Math.floor(tall(grunn))), kasse = Math.max(0, tall(o.kasse)), inn = Math.max(0, tall(o.inntekt)), ll = Math.max(1, tall(o.lønnLag, REGLER.mannPerLag * REGLER.lønn));
    const pluss = Math.min(T.rikMaks, Math.floor(kasse / T.rikPer));
    if (inn + kasse / T.reserve >= g * ll) return g + pluss;
    return Math.max(T.min, Math.min(g, Math.floor((inn + kasse / T.reserve) / ll)));
  }
  // Lønn for «minutter» spillminutter: trekkes fra Ø.kr. Kassa går ikke under 0; da telles Ø.ubetalt (minutter uten lønn).
  // Gir { betalt, mangler }.
  function lønnSteg(Ø, lønn, minutter) {
    const skyld = Math.max(0, tall(lønn)) * Math.max(0, tall(minutter)) / 1440, betalt = Math.min(Math.max(0, tall(Ø.kr)), skyld);
    Ø.kr = tall(Ø.kr) - betalt; if (betalt + 1 < skyld) Ø.ubetalt = tall(Ø.ubetalt) + tall(minutter); else Ø.ubetalt = 0;
    Ø.lønnBetalt = tall(Ø.lønnBetalt) + betalt; return { betalt, mangler: skyld - betalt };
  }
  // Skal et lag gå fra rivalen nå? (lønn ikke betalt lenge nok, og flere lag enn de har råd til)
  const deserter = (Ø, lag, tak) => tall(Ø.ubetalt) >= REGLER.deserter && lag > tak;

  // ---------- sagbruket ----------
  // overskudd for «timer» timer: planker × pris × salgsandel − lønn til folkene; slitt sag (hp) går saktere
  function sagOverskudd(sag, timer) {
    const S = REGLER.sag, hp = sag ? klem(tall(sag.hp, 1), 0, 1) : 0; if (!sag || !sag.by && sag.by !== 0) return 0;
    const fart = hp >= .5 ? 1 : hp * 2;
    return (S.perTime * fart * S.plankePris * S.salg - S.folk * REGLER.lønn / 24) * Math.max(0, tall(timer));
  }
  // Vil rivalen kjøpe et sagbruk nå? o = { kasse, døgn, vei, harSag, byer (antall tettsteder de holder) }
  const vilKjøpeSag = o => !o.harSag && tall(o.byer) > 0 && tall(o.kasse) >= REGLER.sag.pris + REGLER.sag.reserve && tall(o.døgn) >= (PRIORITET[o.vei] || PRIORITET.makt).sagFra;

  // ---------- veien til seier ----------
  // o = { side, makt (fremdrift 0–1 fra Seier.makt), penger (fremdrift), gjenoppbygging (fremdrift), nå (veien de har) }.
  // Rivalen velger veien der fremdriften (× stilen) er størst; den bytter bare når en annen er «bytt» ganger bedre.
  function velgVei(o = {}) {
    const stil = REGLER.vei.stil[o.side] || {}, poeng = {};
    for (const v of VEIER) poeng[v] = (tall(o[v]) + .05) * (stil[v] || 1);
    let best = VEIER[0]; for (const v of VEIER) if (poeng[v] > poeng[best]) best = v;
    if (o.nå && VEIER.includes(o.nå) && poeng[best] < poeng[o.nå] * REGLER.vei.bytt) return o.nå;
    return best;
  }
  const veiTekst = (navn, vei) => `${navn} satser på ${VEIORD[vei] || vei}`;

  // ---------- sabotasje ----------
  // o = { nå, sist (forrige sabotasje), bak (rivalen ligger bak deg), pakt (dere har pakt), vakt (folk på vakt hos deg) }. Gir sjansen dette døgnet.
  function sabotasjeSjanse(o = {}) {
    const S = REGLER.sabotasje; if (tall(o.nå) < S.ikkeFør || tall(o.nå) - tall(o.sist, -1e9) < S.pause) return 0;
    return S.sjanse * (o.bak ? S.bak : 1) * (o.pakt ? S.pakt : 1) * (tall(o.vakt) >= 2 ? S.vakt : 1);
  }
  // Hva rammes: maskiner = [{ id, type, hp }] (ferdige maskiner i leiren), lager = { tre, betong, stål } (mengder). r = 0–1.
  // Gir { slag: 'maskin', id, type, skade } | { slag: 'lager', vare, mengde } | null
  function sabotasjeMål(maskiner, lager, r) {
    const S = REGLER.sabotasje, M = (maskiner || []).filter(m => m && tall(m.hp, 1) > .2), V = Object.entries(lager || {}).filter(([, n]) => tall(n) >= 2);
    if (!M.length && !V.length) return null;
    const velgMaskin = M.length && (!V.length || r < .6);
    if (velgMaskin) { const m = M[Math.floor(r / .6 * M.length) % M.length]; return { slag: 'maskin', id: m.id, type: m.type, skade: S.maskinSkade }; }
    const [vare, n] = V[Math.floor(r * V.length) % V.length]; return { slag: 'lager', vare, mengde: Math.round(tall(n) * S.lagerAndel * 10) / 10 };
  }

  // ---------- en enkel rival som spiller selv (økonomitesten) ----------
  // Døgnsteg i 30 døgn. Tettstedene i området: én storby og elleve mindre (folk × 0,75–1,25 etter frøet). Rivalen starter med ett lite
  // tettsted og to lag; etter fredstiden tar frie lag (de som ikke er garnison) nøytrale tettsteder (sjanse per lag per døgn × flaks),
  // storbyen først fra eskaleringens storbyFra. Spilleren og den andre rivalen tar av og til et av rivalens tettsteder. Byavtaler,
  // kontrakter og sagbruket som i spillet. Seier regnes med seier.js. o = { frø, døgn, flaks (1 = normal), side, inntektF (selvtest) }.
  // Gir { seier: { vei, dag } | null, blakkDag (første døgn kassa var tom med lønn ubetalt) | null, dager: [{ dag, kr, lag, byer, andel, vei }] }
  function simuler(o = {}) {
    const E = NODE ? require('./eskalering.js') : rot.Eskalering, F = NODE ? require('./fraksjoner.js') : rot.Fraksjoner, SE = NODE ? require('./seier.js') : rot.Seier;
    let a = (tall(o.frø, 1) >>> 0) || 1; const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const side = o.side || 'rød', flaks = tall(o.flaks, 1), g = E.grad(), dagMaks = tall(o.døgn, 30), fred = F.fredDøgn(1);
    // Claudes forslag til modellen (ikke spillregler): sjansen per fritt lag per døgn for å ta et tettsted, hvor ofte et tettsted tapes, og
    // kontraktene (antall åpne tilbud per døgn og snittbetaling), byavtalene (sjanse per døgn, brudd per døgn) og hvor ofte spilleren og den
    // andre rivalen tar et nøytralt tettsted per døgn (andre)
    const M = { ta: .2, taStorby: .1, storbyLag: 4, tape: .08, tilbud: 2, betaling: 9e5, tarPerDag: .35 / 2, frie: .35, brudd: .12, spillerStart: 40e6, spillerPerDag: 1.5e6, andre: .3 };
    const folk = [60000, 9000, 7000, 6000, 5000, 4200, 3600, 3000, 2600, 2000, 1500, 1000].map((f, i) => Math.round(f * (i ? .75 + r() * .5 : 1)));
    const byer = folk.map((f, i) => ({ id: i, folk: f, eier: i === 11 ? side : i === 6 ? 'blå' : i === 10 ? 'annen' : null, fra: 0, strøm: r() < .8, avtale: null }));
    const Ø = E.nyØkonomi(); let lag = 2, sag = null, vei = 'makt', seier = null, blakkDag = null; const dager = [];
    const total = folk.reduce((s, f) => s + f, 0);
    for (let d = 0; d < dagMaks && !seier; d++) {
      const nå = d * 1440, egne = byer.filter(b => b.eier === side), folkH = egne.reduce((s, b) => s + b.folk, 0);
      // inntekt (eskaleringen), byavtaler, kontrakter, saga
      const før = Ø.kr; E.tjen(Ø, folkH, 1440, g); let inn = Ø.kr - før; Ø.kr = før;
      for (const b of byer) if (b.avtale) { inn += b.avtale.pris; if (r() < M.brudd) b.avtale.brudd++; else b.avtale.holdt++; if (b.avtale.brudd >= 3) b.avtale = null; else if (b.avtale.holdt >= 5) b.avtale.trinn = 'handel'; }
      if (d >= 1 && r() < .35) { const k = byer.filter(b => !b.eier && !b.avtale).sort((p, q) => q.folk - p.folk)[Math.floor(r() * 3)]; if (k) k.avtale = { pris: Math.round(Math.min(9e5, Math.max(45000, 25 * k.folk)) * .9), brudd: 0, holdt: 0, trinn: 'beskyttelse' }; }
      const tilbud = Math.round(M.tilbud * (.5 + r())); for (let i = 0; i < tilbud; i++) if (r() < M.tarPerDag + REGLER.kontrakt.ekstra[vei] / M.tilbud) inn += M.betaling * (.6 + r() * .8);
      if (sag) { if (!byer.some(b => b.id === sag.by && b.eier === side)) sag = null; else { inn += sagOverskudd(sag, 24); sag.hp -= REGLER.sag.slitasje * 24; if (sag.hp < .5) { Ø.kr -= 3e5; sag.hp = 1; } } }
      Ø.kr = Math.min(E.REGLER.økonomi.maksKr, Ø.kr + inn * tall(o.inntektF, 1));
      // lønn
      lønnSteg(Ø, lønnDøgn(lag), 1440); if (Ø.ubetalt > 0 && blakkDag === null) blakkDag = d;
      // kjøp: sagbruk, lag
      if (vilKjøpeSag({ kasse: Ø.kr, døgn: d, vei, harSag: !!sag, byer: egne.length })) { Ø.kr -= REGLER.sag.pris; sag = { by: egne[0].id, hp: 1 }; }
      const dEtter = d - fred, grunn = F.lagTak(egne.length, d), tak = rådTak(dEtter >= 0 ? E.tak(grunn, dEtter, g, egne.length) : grunn, { kasse: Ø.kr, inntekt: inn, lønnLag: REGLER.mannPerLag * REGLER.lønn });
      if (dEtter >= 0) { const hva = E.kjøp(Ø, { lag, tak, lastebiler: 3, stridsvogner: 1, døgn: d, g }); if (hva === 'lag') { E.betal(Ø, 'lag'); lag++; } }
      if (deserter(Ø, lag, tak)) { lag--; Ø.ubetalt = 0; }
      // krigen: frie lag tar tettsteder, noen tapes
      if (d >= fred) { let frie = Math.max(0, lag - egne.length);
        // storbyen: en gruppe på storbyLag lag (fra storbyFra); ellers tar hvert fritt lag kanskje ett nøytralt tettsted
        const storby = byer.find(b => !b.eier && b.folk >= E.REGLER.storby);
        if (storby && d >= g.storbyFra && frie >= M.storbyLag && r() < M.taStorby * flaks) { storby.eier = side; storby.fra = nå; storby.avtale = null; frie -= M.storbyLag; }
        for (let k = 0; k < frie; k++) { const L = byer.filter(b => !b.eier && b.folk < E.REGLER.storby); if (!L.length) break;
          if (r() < M.ta * flaks) { const b = L[Math.floor(r() * L.length) % L.length]; b.eier = side; b.fra = nå; b.avtale = null; } }
        for (const b of egne) if (egne.length > 1 && r() < M.tape / flaks) { b.eier = r() < .5 ? 'blå' : 'annen'; b.fra = nå; } }
      // de andre: spilleren (fra dag 2) og den andre rivalen (etter fredstiden) tar også nøytrale tettsteder
      for (const [hvem, fra] of [['blå', 1], ['annen', fred]]) { if (d < fra || r() >= M.andre) continue; const L = byer.filter(b => !b.eier && b.folk < E.REGLER.storby); if (L.length) { const b = L[Math.floor(r() * L.length) % L.length]; b.eier = hvem; b.fra = nå; b.avtale = null; } }
      // seier (seier.js)
      const eid = byer.filter(b => b.eier === side), andel = (eid.reduce((s, b) => s + b.folk, 0) + byer.filter(b => b.avtale && b.avtale.trinn === 'handel').reduce((s, b) => s + b.folk / 2, 0)) / total;
      const tid = nå + 1440, st = { byer: byer.length, sider: { [side]: { andel } } };
      const mk = SE.makt(st, side, tid), verdi = SE.rivalVerdi({ kasse: Ø.kr, folk: eid.reduce((s, b) => s + b.folk, 0), lag, kjøretøy: 1.5e6 }).sum;
      const pg = SE.penger({ [side]: verdi, blå: M.spillerStart + M.spillerPerDag * d }, side, tid);
      const gj = SE.gjenoppbygging(byer.map(b => ({ id: b.id, navn: 'by' + b.id, folk: b.folk, eier: b.eier, strøm: b.strøm, ødelagt: 0, loj: null, holdtFra: b.eier ? b.fra : null })), side, { tid });
      vei = velgVei({ side, makt: mk.fremdrift, penger: pg.fremdrift, gjenoppbygging: gj.fremdrift, nå: d ? vei : null });
      if (mk.nådd) seier = { vei: 'makt', dag: d + 1 }; else if (pg.nådd) seier = { vei: 'penger', dag: d + 1 }; else if (gj.nådd) seier = { vei: 'gjenoppbygging', dag: d + 1 };
      dager.push({ dag: d + 1, kr: Math.round(Ø.kr), lag, byer: eid.length, andel: Math.round(andel * 100) / 100, vei });
    }
    return { seier, blakkDag, dager };
  }

  const api = { REGLER, VEIER, VEIORD, PRIORITET, lønnDøgn, rådTak, lønnSteg, deserter, sagOverskudd, vilKjøpeSag, velgVei, veiTekst, sabotasjeSjanse, sabotasjeMål, simuler };
  if (NODE) module.exports = api;
  else rot.Rival = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
