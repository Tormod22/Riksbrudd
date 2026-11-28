/* Fritt byggesett, versjon 3 (28. nov, fase B4 i docs/plan-selskap-okonomi.md, kapittel 5.5): regler uten DOM.
 * Node: require('./byggesett') (henter leir.js selv); nettleser: globalThis.ByggesettRegler (lastes etter leir.js og før leir-visning.js).
 *
 * RUTENETTET: alle plasser regnes i ruter på U = 1,2 m fra leirens midte (G = U). En del har en størrelse s (antall ruter):
 *  - nye deler i det fine rutenettet: s = 1 (1,2 m; porten s = 2), i hallrutenettet («Hall 4,8 m»): s = 4;
 *  - GAMLE deler (versjon 2, rutenett 2,4 m) står på sin plass med s = 2: de gamle typene (uten «_s» bak) har i, j i 2,4 m-ruter, som
 *    ganges med 2 når de leses (fraBygg). Typen er den samme som før (bs_vegg_tre …), prisene og riving er som før. Valget: la gamle deler stå på sitt
 *    rutenett (det tryggeste – ingen bygg deles opp, pris, framdrift, hp og jobber er urørt); de passer i det nye rutenettet fordi 2,4 = 2 × 1,2.
 *    Nye deler har b.bs.g = 1 (rutene er 1,2 m).
 * Delene (Leir.BYGG, type 'bs_…', del: true): gulv og tak i ruter (s × s), vegger, forsvar og bjelker på en kant (a = 'x' langs x nede i ruta,
 * 'y' langs y til venstre), søyler i et hjørne, trapper over 1 × 3 ruter (r = retningen opp: 0 +x, 1 +y, 2 −x, 3 −y).
 * n: gulv/tak = dekket (0 bakken, 1 mellom 1. og 2. etasje …, 4 = taket over 4. etasje); vegger, søyler, bjelker og trapper = etasjen (0–3).
 * Etasjen er H = 3 m, høyst ETASJER = 4 (spørsmål 13 i planen: forslaget fire). Loft: saltak over et bygg som er minst 7,6 m bredt (Bygning).
 * STØTTE (ingen svevende deler): vegger over 1. etasje står på en vegg eller et gulv inntil; et dekke trenger en vegg, søyle eller bjelke
 * under på en kant/et hjørne, eller et nabodekke som har det; søyler står på bakken, et gulv eller en søyle under; bjelker hviler på
 * vegg/søyle/bjelke i begge ender; trapper står på gulv.
 * SPENN (kapittel 5.5): et dekke eller tak lenger fra en støtte enn halve spennet (tre 6 m, betong 9 m, stål 12 m) raser – regelen er
 * Bygning.ras (spill/bygning.js), den samme som for husene i kartet. spenn() sier fra før noe bygges.
 * ROM: rom() finner lukkede rom (gulv + vegger rundt + tak over); romType() sier hva rommet brukes til ut fra det som står der (ROMTYPER –
 * B5 legger til maskiner/fabrikk).
 */
(function (rot) {
  'use strict';
  const Leir = rot.Leir || (typeof require === 'function' ? require('./leir.js') : null);
  const U = 1.2, G = U, H = 3, ETASJER = 4, SENG_M2 = 8, GROV = 4;
  // ---------- delene ----------
  // GAMLE deler (versjon 2, 2,4 m): uendret, så lagrede leirer koster og rives som før
  const GAMLE = {
    bs_fundament: { navn: 'Betongfundament', kort: 'Fundament', kat: 'gulv', stoff: 'betong', pris: 40000, tid: .4, mat: { betong: 1.4 }, tekst: 'Gulv på bakken' },
    bs_tregulv: { navn: 'Tregulv', kort: 'Tregulv', kat: 'gulv', stoff: 'tre', pris: 25000, tid: .3, mat: { tre: .5 }, tekst: 'Gulv, også i 2. etasje' },
    bs_vegg_tre: { navn: 'Trevegg', kort: 'Hel', kat: 'vegg', stoff: 'tre', v: 'hel', pris: 20000, tid: .3, mat: { tre: .5 } },
    bs_vegg_tre_dør: { navn: 'Trevegg med dør', kort: 'Dør', kat: 'vegg', stoff: 'tre', v: 'dør', pris: 24000, tid: .35, mat: { tre: .45, stål: .02 } },
    bs_vegg_tre_vindu: { navn: 'Trevegg med vindu', kort: 'Vindu', kat: 'vegg', stoff: 'tre', v: 'vindu', pris: 24000, tid: .35, mat: { tre: .45, stål: .01 } },
    bs_vegg_tre_port: { navn: 'Trevegg med port', kort: 'Port', kat: 'vegg', stoff: 'tre', v: 'port', pris: 28000, tid: .4, mat: { tre: .35, stål: .15 } },
    bs_vegg_betong: { navn: 'Betongvegg', kort: 'Hel', kat: 'vegg', stoff: 'betong', v: 'hel', pris: 35000, tid: .5, mat: { betong: 1.4, stål: .05 } },
    bs_vegg_betong_dør: { navn: 'Betongvegg med dør', kort: 'Dør', kat: 'vegg', stoff: 'betong', v: 'dør', pris: 40000, tid: .55, mat: { betong: 1.1, stål: .08 } },
    bs_vegg_betong_vindu: { navn: 'Betongvegg med vindu', kort: 'Vindu', kat: 'vegg', stoff: 'betong', v: 'vindu', pris: 40000, tid: .55, mat: { betong: 1.1, stål: .07 } },
    bs_vegg_betong_port: { navn: 'Betongvegg med port', kort: 'Port', kat: 'vegg', stoff: 'betong', v: 'port', pris: 45000, tid: .6, mat: { betong: .6, stål: .2 } },
    bs_vegg_stein: { navn: 'Mursteinsvegg', kort: 'Hel', kat: 'vegg', stoff: 'stein', v: 'hel', pris: 45000, tid: .8, mat: { betong: 1.6 } },
    bs_vegg_stein_dør: { navn: 'Mursteinsvegg med dør', kort: 'Dør', kat: 'vegg', stoff: 'stein', v: 'dør', pris: 50000, tid: .85, mat: { betong: 1.3, tre: .05, stål: .01 } },
    bs_vegg_stein_vindu: { navn: 'Mursteinsvegg med vindu', kort: 'Vindu', kat: 'vegg', stoff: 'stein', v: 'vindu', pris: 50000, tid: .85, mat: { betong: 1.3, tre: .05 } },
    bs_vegg_stein_port: { navn: 'Mursteinsvegg med port', kort: 'Port', kat: 'vegg', stoff: 'stein', v: 'port', pris: 55000, tid: .9, mat: { betong: .8, stål: .15 } },
    bs_tak_flatt: { navn: 'Flatt tak', kort: 'Flatt', kat: 'tak', stoff: 'tak', pris: 30000, tid: .4, mat: { tre: .4, stål: .1 }, tekst: 'Legges på veggene' },
    bs_tak_sal: { navn: 'Saltak', kort: 'Saltak', kat: 'tak', stoff: 'tak', pris: 35000, tid: .5, mat: { tre: .6, stål: .05 }, tekst: 'Legges på veggene; mønet langs lengste side (Roter bytter)' },
    bs_palisade: { navn: 'Palisade', kort: 'Palisade', kat: 'forsvar', stoff: 'tre', pris: 15000, tid: .3, mat: { tre: .8 }, tekst: 'Spisse tømmerstokker, 2,6 m' },
    bs_mur: { navn: 'Mur', kort: 'Mur', kat: 'forsvar', stoff: 'betong', pris: 40000, tid: .6, mat: { betong: 1.2, stål: .04 }, tekst: 'Betongmur, 2,2 m' },
    bs_voll: { navn: 'Jordvoll', kort: 'Voll', kat: 'forsvar', stoff: 'jord', pris: 10000, tid: .8, mat: {}, tekst: 'Gravd voll, 1,3 m (gratis materialer)' },
    bs_piggtråd: { navn: 'Piggtråd', kort: 'Piggtråd', kat: 'forsvar', stoff: 'stål', pris: 8000, tid: .15, mat: { stål: .05 }, tekst: 'Stolper med piggtråd, 1,3 m' },
  };
  // STOFFENE (Claudes forslag): pris og tid per rute (en vegg på 1,2 m, et gulv/tak på 1,2 × 1,2 m), spennet dekket/taket tåler (m).
  // tre: billig, raskt, brenner · mur: sterk, tung · betong: sterkest, tregest · stål/blikk: lett og raskt, for haller.
  const STOFF = {
    tre: { navn: 'Tre', spenn: 6, brenner: true }, stein: { navn: 'Mur', spenn: 9 }, betong: { navn: 'Betong', spenn: 9 }, blikk: { navn: 'Stål/blikk', spenn: 12 },
    stål: { navn: 'Stål', spenn: 12 }, jord: { navn: 'Jord', spenn: 0 },
  };
  // Nye deler per rute (Claudes tall). str: størrelsene som finnes (1 = 1,2 m, 2 = 2,4 m, 4 = 4,8 m). Prisen ganges med s (kanter) eller s² (ruter).
  const VEGG = { tre: { pris: 9000, tid: .12, mat: { tre: .2 } }, betong: { pris: 16000, tid: .25, mat: { betong: .6 } }, stein: { pris: 20000, tid: .4, mat: { betong: .7 } },
    blikk: { pris: 10000, tid: .08, mat: { stål: .1 } } };
  const VNAVN = { tre: 'Trevegg', betong: 'Betongvegg', stein: 'Mursteinsvegg', blikk: 'Blikkvegg' };
  const NYE = {
    bs_fundament: { navn: 'Betongfundament', kort: 'Fundament', kat: 'gulv', stoff: 'betong', pris: 9000, tid: .1, mat: { betong: .3 }, str: [1, 4], tekst: 'Gulv på bakken' },
    bs_tregulv: { navn: 'Tregulv', kort: 'Tregulv', kat: 'gulv', stoff: 'tre', pris: 6000, tid: .08, mat: { tre: .1 }, str: [1, 4], tekst: 'Gulv, også i etasjene over (spenn 6 m)' },
    bs_betongdekke: { navn: 'Betongdekke', kort: 'Betongdekke', kat: 'gulv', stoff: 'betong', pris: 12000, tid: .15, mat: { betong: .4 }, str: [1, 4], tekst: 'Gulv i etasjene over (spenn 9 m)' },
    bs_tak_flatt: { navn: 'Flatt tretak', kort: 'Flatt tre', kat: 'tak', stoff: 'tre', tak: 'flatt', pris: 7000, tid: .1, mat: { tre: .1 }, str: [1, 4], tekst: 'Spenn 6 m' },
    bs_tak_sal: { navn: 'Saltak', kort: 'Saltak', kat: 'tak', stoff: 'tre', tak: 'sal', pris: 8500, tid: .12, mat: { tre: .2 }, str: [1, 4], tekst: 'Tre, spenn 6 m; loft når bygget er bredt nok' },
    bs_tak_betong: { navn: 'Betongtak', kort: 'Betong', kat: 'tak', stoff: 'betong', tak: 'flatt', pris: 12000, tid: .15, mat: { betong: .4 }, str: [1, 4], tekst: 'Flatt, spenn 9 m' },
    bs_tak_blikk: { navn: 'Blikktak', kort: 'Blikk', kat: 'tak', stoff: 'blikk', tak: 'flatt', pris: 6000, tid: .06, mat: { stål: .1 }, str: [1, 4], tekst: 'Stål, spenn 12 m – for haller' },
    bs_søyle_tre: { navn: 'Søyle i tre', kort: 'Tre', kat: 'søyle', stoff: 'tre', pris: 3000, tid: .05, mat: { tre: .1 }, str: [1], tekst: 'Bærer dekket eller taket over' },
    bs_søyle_betong: { navn: 'Søyle i betong', kort: 'Betong', kat: 'søyle', stoff: 'betong', pris: 6000, tid: .1, mat: { betong: .2 }, str: [1], tekst: 'Bærer dekket eller taket over' },
    bs_søyle_stål: { navn: 'Søyle i stål', kort: 'Stål', kat: 'søyle', stoff: 'stål', pris: 5000, tid: .05, mat: { stål: .1 }, str: [1], tekst: 'Bærer dekket eller taket over' },
    bs_bjelke_tre: { navn: 'Bjelke i tre', kort: 'Tre', kat: 'bjelke', stoff: 'tre', pris: 4000, tid: .06, mat: { tre: .1 }, str: [1, 4], tekst: 'Under dekket; hviler på vegg eller søyle i begge ender' },
    bs_bjelke_stål: { navn: 'Stålbjelke', kort: 'Stål', kat: 'bjelke', stoff: 'stål', pris: 6000, tid: .06, mat: { stål: .1 }, str: [1, 4], tekst: 'Under dekket; hviler på vegg eller søyle i begge ender' },
    bs_trapp: { navn: 'Tretrapp', kort: 'Tre', kat: 'trapp', stoff: 'tre', pris: 15000, tid: .5, mat: { tre: .5 }, str: [1], tekst: '1,2 × 3,6 m opp til etasjen over (det må være åpent over den)' },
    bs_trapp_betong: { navn: 'Betongtrapp', kort: 'Betong', kat: 'trapp', stoff: 'betong', pris: 30000, tid: .8, mat: { betong: 1 }, str: [1], tekst: '1,2 × 3,6 m opp til etasjen over (det må være åpent over den)' },
    bs_palisade: { navn: 'Palisade', kort: 'Palisade', kat: 'forsvar', stoff: 'tre', pris: 7500, tid: .15, mat: { tre: .4 }, str: [1, 4], tekst: 'Spisse tømmerstokker, 2,6 m' },
    bs_mur: { navn: 'Mur', kort: 'Mur', kat: 'forsvar', stoff: 'betong', pris: 20000, tid: .3, mat: { betong: .6 }, str: [1, 4], tekst: 'Betongmur, 2,2 m' },
    bs_voll: { navn: 'Jordvoll', kort: 'Voll', kat: 'forsvar', stoff: 'jord', pris: 5000, tid: .4, mat: {}, str: [1, 4], tekst: 'Gravd voll, 1,3 m (gratis materialer)' },
    bs_piggtråd: { navn: 'Piggtråd', kort: 'Piggtråd', kat: 'forsvar', stoff: 'stål', pris: 4000, tid: .08, mat: {}, str: [1, 4], tekst: 'Stolper med piggtråd, 1,3 m' },
    // (B5 fabrikken, kapittel 5.6) MASKINER som settes inn på gulvet i et rom eller en hall du har bygget. l × b ruter (l langs flyten: innmating -> utmating,
    // r = retningen flyten går: 0 +x, 1 +y, 2 −x, 3 −y). maskin = maskintypen i Produksjon.REGLER.maskiner (samme regler som maskin-byggene).
    // tung: krever betonggulv (fundament eller betongdekke). Pris og kW som dagens maskin-bygg; materialene er mindre (bygget er hallen) – Claudes forslag.
    bs_sagbenk: { navn: 'Sagbenk', kort: 'Sagbenk', kat: 'maskin', stoff: 'stål', maskin: 'sagbruk', l: 8, b: 3, tung: true, kw: -15, pris: 6e6, tid: 2, mat: { stål: 6, tre: 2 }, str: [1],
      tekst: 'Sagbenk med innmatingsbord og utmating, 3,6 × 9,6 m (betonggulv, 3 folk, 15 kW)' },
    bs_høvel: { navn: 'Høvel', kort: 'Høvel', kat: 'maskin', stoff: 'stål', maskin: 'høvel', l: 4, b: 2, kw: -5, pris: 3e6, tid: 1, mat: { stål: 3 }, str: [1],
      tekst: 'Høvler plankene fra sagbenken i samme rom: planker × 1,4 (1 folk, 5 kW)' },
    bs_vedkløyver: { navn: 'Vedkløyver', kort: 'Vedkløyver', kat: 'maskin', stoff: 'stål', maskin: 'vedkløyver', l: 3, b: 2, kw: -3, pris: 8e5, tid: .6, mat: { stål: 2 }, str: [1],
      tekst: 'Kløyver flis til ved, 2,4 × 3,6 m (1 folk, 3 kW)' },
    bs_fyrkjele: { navn: 'Fyrkjele', kort: 'Fyrkjele', kat: 'maskin', stoff: 'stål', maskin: 'fyrkjele', l: 3, b: 2, tung: true, kw: 0, pris: 4e6, tid: 1.5, mat: { betong: 3, stål: 5 }, str: [1],
      tekst: 'Brenner flis eller ved: 30 kW og varme i rommet (betonggulv, 1 folk)' },
    // LYS: lamper på gulvet/i taket i en rute; lyser opp så mange meter rundt seg (lys) og bruker strøm (kW). Claudes tall.
    bs_lysrør: { navn: 'Lysrør', kort: 'Lysrør', kat: 'lampe', stoff: 'stål', lys: 6, kw: -.3, pris: 4000, tid: .05, mat: { stål: .02 }, str: [1], tekst: 'Lyser opp 6 m rundt seg (0,3 kW)' },
    bs_lyskaster: { navn: 'Lyskaster', kort: 'Lyskaster', kat: 'lampe', stoff: 'stål', lys: 14, kw: -1.2, pris: 9000, tid: .08, mat: { stål: .05 }, str: [1], tekst: 'Lyser opp 14 m rundt seg (1,2 kW)' },
    // LAGER INNI: en hyllerekke (1 × 4 ruter) eller pallplass (2 × 2) i et lukket rom gir lagerplass (m³ av hver vare) – Claudes tall
    bs_hylle: { navn: 'Hyllerekke', kort: 'Hylle', kat: 'lager', stoff: 'stål', l: 4, b: 1, lager: 6, pris: 30000, tid: .15, mat: { stål: .3 }, str: [1], tekst: 'Lagerplass 6 m³ av hver vare i rommet' },
    bs_pall: { navn: 'Pallplass', kort: 'Paller', kat: 'lager', stoff: 'tre', l: 2, b: 2, lager: 4, pris: 8000, tid: .05, mat: { tre: .2 }, str: [1], tekst: 'Lagerplass 4 m³ av hver vare i rommet' },
  };
  // veggene: fire stoff × hel/dør/vindu/port (dør og vindu i 1,2 m, porten 2,4 m i det fine rutenettet; alt 4,8 m i hallrutenettet)
  for (const [st, V] of Object.entries(VEGG)) for (const v of ['hel', 'dør', 'vindu', 'port']) {
    const ekstra = v === 'hel' ? 0 : v === 'port' ? 2000 : 3000;
    NYE[`bs_vegg_${st}${v === 'hel' ? '' : '_' + v}`] = { navn: VNAVN[st] + (v === 'hel' ? '' : ' med ' + v), kort: v === 'hel' ? 'Hel' : v[0].toUpperCase() + v.slice(1), kat: 'vegg', stoff: st, v,
      pris: V.pris + ekstra, tid: V.tid * (v === 'hel' ? 1 : 1.2), mat: { ...V.mat, ...(v === 'port' ? { stål: Math.round(((V.mat.stål || 0) + .1) * 10) / 10 } : {}) }, str: v === 'port' ? [2, 4] : [1, 4] };
  }
  // Alle typene: de gamle (s = 2, gammel) og de nye «<grunn>_<s>»
  const DELER = {};
  for (const [id, D] of Object.entries(GAMLE)) DELER[id] = { ...D, s: 2, grunn: id, gammel: true };
  const typeFor = (grunn, s) => `${grunn}_${s}`;
  for (const [id, D] of Object.entries(NYE)) for (const s of D.str) {
    const f = D.kat === 'gulv' || D.kat === 'tak' ? s * s : ['søyle', 'trapp', 'maskin', 'lampe', 'lager'].includes(D.kat) ? 1 : s;
    const mat = {}; for (const [k, v] of Object.entries(D.mat)) mat[k] = Math.round(v * f * 10) / 10;
    DELER[typeFor(id, s)] = { ...D, str: undefined, s, grunn: id, pris: Math.round(D.pris * f), tid: Math.round(D.tid * f * 100) / 100, mat,
      navn: D.navn + (s === 1 || D.kat === 'søyle' || D.kat === 'trapp' || D.kat === 'maskin' ? '' : ` ${String(s * U).replace('.', ',')} m`) };
  }
  const kat = d => (DELER[d.type] ? DELER[d.type].kat : null);
  // (B5) ting som står på gulvet med et fotavtrykk (maskiner, hyller/paller) og lamper
  const TING = d => ['maskin', 'lager'].includes(kat(d));
  // fotavtrykket i ruter: [bredde langs x, langs y] etter retningen r (l langs flyten)
  const fotRuter = d => { const T = DELER[d.type], l = T.l || 1, b = T.b || 1; return (d.r || 0) % 2 ? [b, l] : [l, b]; };
  // Plassen i 1,2 m-ruter: en gammel type uten u (fra eldre kode/tester) har i, j i 2,4 m-ruter og gjøres om; alt annet er alt i 1,2 m-ruter.
  // (fraBygg og plassering gir alltid u: true.)
  const nrm = d => (d && DELER[d.type] && DELER[d.type].gammel && !d.u ? { ...d, i: d.i * 2, j: d.j * 2, s: 2, u: true } : d && DELER[d.type] && !d.s ? { ...d, s: DELER[d.type].s } : d);
  const norm = deler => (deler || []).map(nrm);
  const KANT = d => ['vegg', 'forsvar', 'bjelke'].includes(kat(d));
  const RUTE = d => kat(d) === 'gulv' || kat(d) === 'tak';
  const erDel = type => !!DELER[type];
  const størrelse = type => (DELER[type] ? DELER[type].s : 1);
  // Delene som vanlige bygg i Leir.BYGG (fot: omrisset rundt midten, ret 0 = langs x)
  function registrer(LB) {
    if (!LB || !LB.BYGG) return;
    for (const [id, D] of Object.entries(DELER)) {
      const L = D.s * U, K = D.kat;
      const fot = K === 'gulv' || K === 'tak' ? [-L / 2, L / 2, -L / 2, L / 2] : K === 'søyle' ? [-.15, .15, -.15, .15] : K === 'trapp' ? [-1.5 * U, 1.5 * U, -U / 2, U / 2]
        : [-L / 2, L / 2, D.grunn === 'bs_voll' ? -.8 : -.15, D.grunn === 'bs_voll' ? .8 : .15];
      if (K === 'maskin' || K === 'lager') { const l = (D.l || 1) * U, b = (D.b || 1) * U; fot.splice(0, 4, -l / 2, l / 2, -b / 2, b / 2); }
      if (K === 'lampe') fot.splice(0, 4, -.2, .2, -.2, .2);
      LB.BYGG[id] = { navn: D.navn, pris: D.pris, tid: D.tid, kw: D.kw || 0, del: true, fot, mat: D.mat, tekst: D.tekst || 'Del i byggesettet',
        ...(K === 'maskin' ? { maskin: true, maskinType: D.maskin, maskinDel: { l: D.l, b: D.b, tung: !!D.tung } } : {}), ...(K === 'lampe' ? { lampe: D.lys } : {}), ...(K === 'lager' ? { hylle: D.lager } : {}) };
    }
  }
  registrer(Leir);

  // ---------- rutenettet ----------
  // s: rutenettets steg i ruter (1 fint, 4 hall). celle gir hjørneruta (i, j) i 1,2 m-ruter.
  const celle = (o, x, y, s = 1) => [Math.floor((x - o.ox) / (U * s)) * s, Math.floor((y - o.oy) / (U * s)) * s];
  const DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  // rutene en del dekker (gulv/tak: s × s; trapp: 3 ruter fra foten i retningen r)
  function ruter(d) {
    d = nrm(d); const K = kat(d), s = d.s || størrelse(d.type), ut = [];
    if (K === 'trapp') { const [di, dj] = DIR[(d.r || 0) & 3]; for (let k = 0; k < 3; k++) ut.push([d.i + di * k, d.j + dj * k]); return ut; }
    if (TING(d)) { const [w, h] = fotRuter(d); for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) ut.push([d.i + a, d.j + b]); return ut; }
    if (K === 'lampe') return [[d.i, d.j]];
    for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) ut.push([d.i + a, d.j + b]);
    return ut;
  }
  // kantene (1,2 m) en kant-del dekker
  function kanter(d) { d = nrm(d); const s = d.s || størrelse(d.type), ut = []; for (let k = 0; k < s; k++) ut.push(d.a === 'x' ? { a: 'x', i: d.i + k, j: d.j } : { a: 'y', i: d.i, j: d.j + k }); return ut; }
  // Midten (kartet) for en del, og retningen (ret) som Leir bruker for omrisset
  function midt(o, d) {
    d = nrm(d); const K = kat(d), s = d.s || størrelse(d.type);
    if (K === 'søyle') return { x: o.ox + d.i * U, y: o.oy + d.j * U, ret: 0 };
    if (TING(d)) { const [w, h] = fotRuter(d); return { x: o.ox + (d.i + w / 2) * U, y: o.oy + (d.j + h / 2) * U, ret: ((d.r || 0) & 3) * Math.PI / 2 }; }
    if (K === 'trapp') { const R = ruter(d), x = R.reduce((t, c) => t + c[0] + .5, 0) / 3, y = R.reduce((t, c) => t + c[1] + .5, 0) / 3; return { x: o.ox + x * U, y: o.oy + y * U, ret: (d.r || 0) % 2 ? Math.PI / 2 : 0 }; }
    if (!KANT(d)) return { x: o.ox + (d.i + s / 2) * U, y: o.oy + (d.j + s / 2) * U, ret: 0 };
    return d.a === 'x' ? { x: o.ox + (d.i + s / 2) * U, y: o.oy + d.j * U, ret: 0 } : { x: o.ox + d.i * U, y: o.oy + (d.j + s / 2) * U, ret: Math.PI / 2 };
  }
  // Endepunktene til en kant (kartet)
  function kantEnder(o, d) { d = nrm(d); const s = d.s || størrelse(d.type), x = o.ox + d.i * U, y = o.oy + d.j * U; return d.a === 'x' ? [[x, y], [x + s * U, y]] : [[x, y], [x, y + s * U]]; }
  // Nærmeste kant til et punkt i et rutenett med steg s (akse: lås til 'x' eller 'y')
  function kantVed(o, x, y, akse, s = 1) {
    const fx = (x - o.ox) / (U * s), fy = (y - o.oy) / (U * s), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const k = [[v, { a: 'x', i, j }], [1 - v, { a: 'x', i, j: j + 1 }], [u, { a: 'y', i, j }], [1 - u, { a: 'y', i: i + 1, j }]].filter(([, q]) => !akse || q.a === akse);
    k.sort((p, q) => p[0] - q[0]); const q = k[0][1]; return { a: q.a, i: q.i * s, j: q.j * s };
  }
  const hjørneVed = (o, x, y, s = 1) => [Math.round((x - o.ox) / (U * s)) * s, Math.round((y - o.oy) / (U * s)) * s];
  // Plassene mellom to trykk: ruter i rektangelet (gulv, tak), kanter på en linje / rundt rektangelet (vegger, forsvar, bjelker),
  // hjørner på en linje (søyler: en søylerad, o2.avstand ruter mellom, standard 4 = 4,8 m) eller én trapp (o2.r)
  const MAKS = 400;
  function rad(o, type, A, B, o2 = {}) {
    const D = DELER[type]; if (!D) return [];
    // gamle typer: som før, i 2,4 m-ruter
    if (D.gammel) return radU(o, type, A, B, o2).map(q => ({ ...q, i: q.i / 2, j: q.j / 2 }));
    return radU(o, type, A, B, o2);
  }
  function radU(o, type, A, B, o2) {
    const D = DELER[type], s = D.s, K = D.kat;
    if (K === 'trapp') { const [i, j] = celle(o, A[0], A[1]); return [{ i, j, a: null, r: o2.r || 0 }]; }
    // (B5) en maskin/hylle med midten der du trykker; lamper: én, eller en rad/et rutenett hver 4. rute (4,8 m) mellom to trykk
    if (K === 'maskin' || K === 'lager') { const r = (o2.r || 0) & 3, [w, h] = fotRuter({ type, r }), [i, j] = celle(o, A[0], A[1]); return [{ i: i - Math.floor((w - 1) / 2), j: j - Math.floor((h - 1) / 2), a: null, r }]; }
    if (K === 'lampe') { const [i0, j0] = celle(o, A[0], A[1]), [i1, j1] = B ? celle(o, B[0], B[1]) : [i0, j0], st = Math.max(1, o2.avstand || GROV), ut = [];
      for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i += st) for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j += st) if (ut.length < MAKS) ut.push({ i, j, a: null }); return ut; }
    if (K === 'søyle') {
      const [a0, b0] = hjørneVed(o, A[0], A[1]); if (!B) return [{ i: a0, j: b0, a: null }];
      const [a1, b1] = hjørneVed(o, B[0], B[1]), st = Math.max(1, o2.avstand || GROV), ut = [], lx = Math.abs(a1 - a0) >= Math.abs(b1 - b0);
      const n = Math.max(1, Math.round((lx ? Math.abs(a1 - a0) : Math.abs(b1 - b0)) / st));
      for (let k = 0; k <= n && ut.length < MAKS; k++) ut.push(lx ? { i: Math.round(a0 + (a1 - a0) * k / n), j: b0, a: null } : { i: a0, j: Math.round(b0 + (b1 - b0) * k / n), a: null });
      return ut;
    }
    if (K === 'gulv' || K === 'tak') {
      const [i0, j0] = celle(o, A[0], A[1], s), [i1, j1] = B ? celle(o, B[0], B[1], s) : [i0, j0], ut = [];
      for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i += s) for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j += s) if (ut.length < MAKS) ut.push({ i, j, a: null });
      return ut;
    }
    if (!B) return [kantVed(o, A[0], A[1], o2.akse, s)];
    const [a0, b0] = hjørneVed(o, A[0], A[1], s), [a1, b1] = hjørneVed(o, B[0], B[1], s), ut = [];
    if (a0 === a1 && b0 === b1) return [kantVed(o, A[0], A[1], o2.akse, s)];
    const x0 = Math.min(a0, a1), x1 = Math.max(a0, a1), y0 = Math.min(b0, b1), y1 = Math.max(b0, b1);
    if (y0 === y1 || x0 === x1 || o2.linje) {
      // en rett linje langs den lengste retningen
      if (x1 - x0 >= y1 - y0) { const j = b0; for (let i = x0; i < x1; i += s) ut.push({ a: 'x', i, j }); }
      else { const i = a0; for (let j = y0; j < y1; j += s) ut.push({ a: 'y', i, j }); }
    } else {
      for (let i = x0; i < x1; i += s) { ut.push({ a: 'x', i, j: y0 }); ut.push({ a: 'x', i, j: y1 }); }
      for (let j = y0; j < y1; j += s) { ut.push({ a: 'y', i: x0, j }); ut.push({ a: 'y', i: x1, j }); }
    }
    return ut.slice(0, MAKS);
  }
  // Nøklene for hver bit (1,2 m) en del dekker: c rute (gulv/tak), k kant (vegg/forsvar), b bjelke, p hjørne (søyle), t trapperute
  function biter(d) {
    d = nrm(d); const K = kat(d); if (!K) return [];
    if (K === 'gulv' || K === 'tak') return ruter(d).map(([i, j]) => `c:${i}:${j}:${d.n}`);
    if (K === 'trapp') return ruter(d).map(([i, j]) => `t:${i}:${j}:${d.n}`);
    if (K === 'søyle') return [`p:${d.i}:${d.j}:${d.n}`];
    if (TING(d)) return ruter(d).map(([i, j]) => `m:${i}:${j}:${d.n}`);
    if (K === 'lampe') return [`l:${d.i}:${d.j}:${d.n}`];
    return kanter(d).map(k => `${K === 'bjelke' ? 'b' : 'k'}:${k.a}:${k.i}:${k.j}:${d.n}`);
  }
  const nøkkel = d => biter(d)[0];
  const indeks = deler => { const m = new Map(); for (const d0 of deler) { const d = nrm(d0); for (const k of biter(d)) m.set(k, d); } return m; };
  const kanterRundt = (i, j) => [{ a: 'x', i, j }, { a: 'x', i, j: j + 1 }, { a: 'y', i, j }, { a: 'y', i: i + 1, j }];
  const ruterVed = d => (d.a === 'x' ? [[d.i, d.j - 1], [d.i, d.j]] : [[d.i - 1, d.j], [d.i, d.j]]);
  const vegg = (M, k, n) => { const d = M.get(`k:${k.a}:${k.i}:${k.j}:${n}`); return d && kat(d) === 'vegg' ? d : null; };
  const bjelke = (M, k, n) => M.get(`b:${k.a}:${k.i}:${k.j}:${n}`) || null;
  const søyle = (M, i, j, n) => M.get(`p:${i}:${j}:${n}`) || null;
  const dekke = (M, i, j, n) => M.get(`c:${i}:${j}:${n}`) || null;
  const gulv = (M, i, j, n) => { const q = dekke(M, i, j, n); return q && kat(q) === 'gulv' ? q : null; };
  const trappHer = (M, i, j, n) => M.get(`t:${i}:${j}:${n}`) || null;
  // kantene som møtes i et hjørne
  const kanterVed = (i, j) => [{ a: 'x', i, j }, { a: 'x', i: i - 1, j }, { a: 'y', i, j }, { a: 'y', i, j: j - 1 }];
  // Bærer noe dekket i ruta (i, j) på høyde n? (en vegg, bjelke under en kant, eller en søyle i et hjørne – i etasjen under)
  function bæresUnder(M, i, j, n) {
    if (kanterRundt(i, j).some(k => vegg(M, k, n - 1) || bjelke(M, k, n - 1))) return true;
    return [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]].some(([a, b]) => søyle(M, a, b, n - 1));
  }
  // Står delen trygt? (se øverst)
  function støttet(M, d) {
    const K = kat(d);
    if (K === 'forsvar') return d.n === 0;
    if (K === 'vegg') { if (d.n === 0) return true; return kanter(d).every(k => !!vegg(M, k, d.n - 1) || ruterVed(k).some(([i, j]) => dekke(M, i, j, d.n))); }
    if (K === 'søyle') { if (d.n === 0) return true; if (søyle(M, d.i, d.j, d.n - 1)) return true; return [[d.i, d.j], [d.i - 1, d.j], [d.i, d.j - 1], [d.i - 1, d.j - 1]].some(([i, j]) => gulv(M, i, j, d.n)); }
    if (K === 'trapp' || TING(d) || K === 'lampe') return ruter(d).every(([i, j]) => gulv(M, i, j, d.n));
    if (K === 'bjelke') {
      // bjelkestykkene på samme linje regnes som én bjelke: begge endene av den må hvile på en vegg eller søyle
      const hviler = (i, j) => !!søyle(M, i, j, d.n) || kanterVed(i, j).some(k => vegg(M, k, d.n));
      const [di, dj] = d.a === 'x' ? [1, 0] : [0, 1]; let a = d.i, b = d.j, steg = 0;
      while (steg++ < 400 && bjelke(M, { a: d.a, i: a - di, j: b - dj }, d.n)) { a -= di; b -= dj; }
      let c = d.i, e = d.j; while (steg++ < 800 && bjelke(M, { a: d.a, i: c, j: e }, d.n)) { c += di; e += dj; }
      if (!bjelke(M, { a: d.a, i: d.i, j: d.j }, d.n)) { const s = d.s || størrelse(d.type); c = d.i + di * s; e = d.j + dj * s; }
      return hviler(a, b) && hviler(c, e); }
    if (d.n === 0) return K === 'gulv';
    // dekket: noe som bærer under en av rutene, eller et sammenhengende nabodekke i samme høyde som har det
    const sett = new Set(), kø = ruter(d).slice();
    while (kø.length && sett.size < 3000) { const [i, j] = kø.pop(), s = i + ',' + j; if (sett.has(s)) continue; sett.add(s);
      if (bæresUnder(M, i, j, d.n)) return true;
      for (const [di, dj] of DIR) if (dekke(M, i + di, j + dj, d.n)) kø.push([i + di, j + dj]); }
    return false;
  }
  // Hvilke deler står på plassene til d (alle bitene)? En del med samme plass og størrelse kan byttes ut; en større (gammel) del ikke.
  function påPlassen(M, d) { const S = new Set(); for (const k of biter(d)) { const q = M.get(k); if (q) S.add(q); } return [...S]; }
  const sammePlass = (a, b) => a.i === b.i && a.j === b.j && (a.a || null) === (b.a || null) && (a.s || størrelse(a.type)) === (b.s || størrelse(b.type));
  // Hvor en ny del havner (etasjen velges selv når nivå er 'auto'): { d, bytt (id som byttes ut), feil }
  function plassering(deler, type, slot, o = {}) {
    const D = DELER[type]; if (!D) return { feil: 'Ukjent del.' }; if (!o.M) deler = norm(deler); slot = D.gammel && !slot.u ? { ...slot, i: slot.i * 2, j: slot.j * 2 } : slot;
    const M = o.M || indeks(deler), auto = o.nivå === undefined || o.nivå === 'auto' || o.nivå === null, K = D.kat;
    const ny = n => ({ type, i: slot.i, j: slot.j, a: ['vegg', 'forsvar', 'bjelke'].includes(K) ? slot.a : null, n, s: D.s, u: true,
      ...(K === 'tak' && (o.r ?? slot.r) !== undefined && (o.r ?? slot.r) !== null ? { r: o.r ?? slot.r } : {}), ...(K === 'trapp' || K === 'maskin' || K === 'lager' ? { r: (slot.r ?? o.r ?? 0) & 3 } : {}) });
    const stFeil = K === 'tak' ? 'Taket må ligge på vegger, søyler eller bjelker (eller inntil et annet tak).' : K === 'gulv' ? 'Gulvet i etasjene over må ligge på vegger, søyler eller bjelker.'
      : K === 'søyle' ? 'Søylen må stå på bakken, et gulv eller en søyle under.' : K === 'bjelke' ? 'Bjelken må hvile på en vegg eller søyle i begge ender.' : K === 'trapp' ? 'Trappa må stå på gulv.'
      : 'Veggen må stå på en vegg eller et gulv.';
    const sjekkTrapp = d => { if (K === 'gulv' || K === 'tak') { if (ruter(d).some(([i, j]) => trappHer(M, i, j, d.n - 1))) return 'Her går trappa opp – det må være åpent over den.'; }
      if (K === 'trapp') { if (ruter(d).some(([i, j]) => dekke(M, i, j, d.n + 1))) return 'Over trappa må det være åpent (ta bort gulvet eller taket over).'; if (d.n + 1 >= ETASJER) return `Høyst ${ETASJER} etasjer.`; }
      return null; };
    const ok = (d, bytt) => { const t = sjekkTrapp(d); if (t) return { feil: t }; return o.utsatt || støttet(M, d) ? { d, bytt: bytt || null } : { feil: stFeil }; };
    // på plassen: ledig (ok), samme slags med samme plass (bytt), eller noe annet (feil)
    const ledig = (d, kanBytte) => { const a = påPlassen(M, d); if (!a.length) return ok(d);
      if (a.length === 1 && sammePlass(a[0], d) && kanBytte(a[0])) return a[0].type === type ? { feil: 'Her står det allerede ' + D.navn.toLowerCase() + '.' } : ok(d, a[0].id);
      if (a.some(q => (q.s || størrelse(q.type)) > D.s)) return { feil: `Her står det en større del (${String((a[0].s || størrelse(a[0].type)) * U).replace('.', ',')} m) – riv den først.` };
      return { feil: 'Plassen er opptatt.' }; };
    // ferdige hus (maler): hver del på sin egen plass og etasje
    if (o.fast) { const d = ny(slot.n || 0); return ledig(d, () => false); }
    if (K === 'forsvar') return ledig(ny(0), q => kat(q) === 'forsvar');
    if (K === 'gulv') {
      const nivåer = D.grunn === 'bs_fundament' ? [0] : auto ? [...Array(ETASJER).keys()] : [o.nivå];
      let første = null;
      for (const n of nivåer) { const d = ny(n), r = ledig(d, q => !auto && kat(q) === 'gulv'); if (!r.feil || !auto) return r; if (!første && !/allerede|opptatt/.test(r.feil)) første = r; }
      return første || { feil: D.grunn === 'bs_fundament' ? 'Her er det allerede gulv.' : 'Her er det allerede gulv i alle etasjene.' };
    }
    if (K === 'tak') {
      let n = null; const R = ruter({ ...ny(0) });
      if (!auto) n = o.nivå + 1;
      else { const kant = new Set(), inne = new Set(R.map(c => c.join(',')));
        for (const [i, j] of R) for (const [k, [di, dj]] of kanterRundt(i, j).map((k, q) => [k, [[0, -1], [0, 1], [-1, 0], [1, 0]][q]])) if (!inne.has((i + di) + ',' + (j + dj))) kant.add(k);
        const v = [...kant].flatMap(k => [...Array(ETASJER).keys()].filter(e => vegg(M, k, e) || bjelke(M, k, e)));
        for (const [i, j] of R) for (const [a, b] of [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]]) for (let e = 0; e < ETASJER; e++) if (søyle(M, a, b, e)) v.push(e);
        if (v.length) n = Math.max(...v) + 1;
        else for (const [i, j] of R) for (const [di, dj] of DIR) for (let e = ETASJER; e >= 1 && n === null; e--) { const q = dekke(M, i + di, j + dj, e); if (q && kat(q) === 'tak') n = e; } }
      if (n === null) return { feil: 'Taket må ligge på vegger, søyler eller bjelker (eller inntil et annet tak).' };
      if (n > ETASJER) return { feil: `Høyst ${ETASJER} etasjer.` };
      return ledig(ny(n), q => kat(q) === 'tak');
    }
    if (TING({ type }) || K === 'lampe') return plasserTing(M, D, ny, auto ? null : o.nivå, ledig);
    if (K === 'søyle' || K === 'bjelke' || K === 'trapp') {
      if (!auto) return ledig(ny(o.nivå), q => kat(q) === K);
      let første = null;
      for (let n = 0; n < ETASJER; n++) { const r = ledig(ny(n), () => false); if (!r.feil) return r; if (!første && !/allerede|opptatt/.test(r.feil)) første = r; }
      return første || { feil: `Høyst ${ETASJER} etasjer.` };
    }
    // vegger: dør/port erstatter veggen i 1. etasje, vindu den øverste hele veggen; ellers neste ledige etasje
    const her = [...Array(ETASJER).keys()].map(e => påPlassen(M, ny(e)));
    if (her[0].some(q => kat(q) === 'forsvar')) return { feil: 'Her står det ' + DELER[her[0].find(q => kat(q) === 'forsvar').type].navn.toLowerCase() + '.' };
    const veggBytt = q => kat(q) === 'vegg';
    if (!auto) return ledig(ny(o.nivå), veggBytt);
    const en = e => (her[e].length === 1 ? her[e][0] : null);
    if ((D.v === 'dør' || D.v === 'port') && her[0].some(q => (q.s || størrelse(q.type)) > D.s)) return { feil: `Her står det en større vegg (${String((her[0][0].s || størrelse(her[0][0].type)) * U).replace('.', ',')} m) – riv den først, eller sett døra i en ny vegg.` };
    if ((D.v === 'dør' || D.v === 'port') && en(0) && sammePlass(en(0), ny(0)) && DELER[en(0).type].v !== D.v) return ok(ny(0), en(0).id);
    if (D.v === 'vindu') for (let e = ETASJER - 1; e >= 0; e--) if (en(e) && sammePlass(en(e), ny(e)) && DELER[en(e).type].v === 'hel') return ok(ny(e), en(e).id);
    for (let e = 0; e < ETASJER; e++) if (!her[e].length) return ok(ny(e));
    if (her.some(h => h.some(q => (q.s || størrelse(q.type)) > D.s))) return { feil: 'Her står det en større del (2,4 m) – riv den først.' };
    return { feil: `Høyst ${ETASJER} etasjer.` };
  }
  // (B5) maskiner, hyller og lamper: på gulv (tunge maskiner på betong), ikke over en vegg, søyle eller trapp, ikke oppå en annen maskin.
  // Etasjen: den laveste der det er gulv under hele fotavtrykket (eller den valgte).
  const BETONG = new Set(['bs_fundament', 'bs_betongdekke']);
  function tingFeil(M, D, d) {
    const R = ruter(d), K = D.kat, navn = D.navn;
    if (!R.every(([i, j]) => gulv(M, i, j, d.n))) return K === 'lampe' ? 'Lampen må stå i et rom med gulv.' : `${navn} må stå på gulv – legg gulv under hele fotavtrykket først.`;
    if (D.tung && !R.every(([i, j]) => BETONG.has(DELER[gulv(M, i, j, d.n).type].grunn))) return `${navn} er tung og trenger betonggulv (fundament eller betongdekke).`;
    if (K === 'lampe') return null;
    if (R.some(([i, j]) => trappHer(M, i, j, d.n))) return 'Her går det en trapp.';
    const inne = new Set(R.map(c => c.join(',')));
    for (const [i, j] of R) { if (inne.has((i + 1) + ',' + j) && vegg(M, { a: 'y', i: i + 1, j }, d.n)) return `${navn} står over en vegg.`; if (inne.has(i + ',' + (j + 1)) && vegg(M, { a: 'x', i, j: j + 1 }, d.n)) return `${navn} står over en vegg.`; }
    const [w, h] = fotRuter(d); for (let a = 1; a < w; a++) for (let b = 1; b < h; b++) if (søyle(M, d.i + a, d.j + b, d.n)) return `Det står en søyle der ${navn.toLowerCase()} skal stå.`;
    return null;
  }
  function plasserTing(M, D, ny, nivå, ledig) {
    const nivåer = nivå === null ? [...Array(ETASJER).keys()] : [nivå]; let første = null;
    for (const n of nivåer) { const d = ny(n), f = tingFeil(M, D, d); if (f) { if (!første) første = { feil: f }; continue; }
      const r = ledig(d, () => false); if (!r.feil) return { d, bytt: null }; if (!første || /gulv/.test(første.feil)) første = r.feil === 'Plassen er opptatt.' ? { feil: D.kat === 'lampe' ? 'Her henger det alt en lampe.' : 'Her står det alt en maskin eller hylle.' } : r; }
    return første || { feil: 'Her er det ikke plass.' };
  }
  // Mange plasser på én gang: hver ny del regnes med for de neste (en ring med vegger og så tak). Gir [{ slot, d, bytt, feil }].
  // Til slutt: spennet (Bygning.ras) – raser et nytt dekke eller tak, får hele raden feilen («Spennet er 8,4 m …»).
  function forslag(deler, type, slots, o = {}) {
    const alle = norm(deler), M = indeks(alle), ut = [], utsatt = kat({ type }) === 'bjelke', lagt = [];
    for (const s of slots) { const r = plassering(alle, type, s, { ...o, M, utsatt });
      if (!r.feil) { const d = { ...r.d, id: 'ny' + ut.length }; if (r.bytt) { const gml = alle.find(q => q.id === r.bytt); if (gml) { for (const k of biter(gml)) M.delete(k); alle.splice(alle.indexOf(gml), 1); } } alle.push(d); for (const k of biter(d)) M.set(k, d); lagt.push([ut.length, d]); }
      ut.push({ slot: s, ...r }); }
    // bjelkene sjekkes når hele raden ligger (endene av raden må hvile på noe)
    if (utsatt) for (const [k, d] of lagt) if (!støttet(M, d)) ut[k] = { slot: ut[k].slot, feil: 'Bjelken må hvile på en vegg eller søyle i begge ender.' };
    if (o.spenn !== false && (kat({ type }) === 'gulv' || kat({ type }) === 'tak')) { const sp = spenn(alle, new Set(ut.filter(q => !q.feil).map((q, k) => 'ny' + ut.indexOf(q))));
      if (sp) for (const q of ut) if (!q.feil) q.feil = sp.feil; }
    return ut;
  }

  // ---------- spennet (samme regel som husene i kartet: Bygning.ras) ----------
  // delene nær delene i ider (støtter lenger unna enn halve det største spennet + to ruter teller ikke) – raskere i store leirer
  function nærDeler(alle, ider, ekstra = 0) {
    const ny = alle.filter(d => ider.has(d.id)); if (!ny.length) return null; const N = Math.ceil(STOFF.stål.spenn / 2 / U) + 2 + ekstra;
    let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity; for (const d of ny) for (const [i, j] of RUTE(d) || kat(d) === 'trapp' ? ruter(d) : [[d.i, d.j]]) { a0 = Math.min(a0, i); b0 = Math.min(b0, j); a1 = Math.max(a1, i + 1); b1 = Math.max(b1, j + 1); }
    return alle.filter(d => { if (ider.has(d.id)) return true; const P = KANT(d) ? kanter(d).map(k => [k.i, k.j]) : kat(d) === 'søyle' ? [[d.i, d.j]] : ruter(d); return P.some(([i, j]) => i >= a0 - N && i <= a1 + N && j >= b0 - N && j <= b1 + N); });
  }
  let BYG = null;
  const bygning = () => BYG || (BYG = rot.Bygning || (typeof require === 'function' ? (() => { try { return require('./bygning.js'); } catch (e) { return null; } })() : null));
  // alle = delene slik de blir (de nye med id i nye). Gir null (holder) eller { feil, spenn, stoff, maks, id }.
  function spenn(alle, nye) {
    const B = bygning(); if (!B || !B.fraByggesett || !B.ras || !nye || !nye.size) return null;
    // bare delene nær de nye (støtter lenger unna enn halve det største spennet + en rute teller ikke) – raskere i store leirer
    const nær = nærDeler(alle, nye); if (!nær) return null;
    const m = B.fraByggesett(nær.map(d => ({ ...d, ferdig: true })), { ox: 0, oy: 0, utenGulv: true }); if (!m) return null;
    const R = B.ras(m); let verst = null;
    for (const r of R) { if (r.del !== 'dekke' && r.del !== 'tak') continue; const et = r.del === 'dekke' ? m.etasjer.find(e => e.n === r.e) : null, f = r.del === 'dekke' ? et && et.dekke.felt[r.id] : m.tak.felt[r.id];
      if (!f || !nye.has(f.del)) continue; if (!verst || (f.bredde || 0) > (verst.bredde || 0)) verst = f; }
    if (!verst) return null;
    const st = STOFF[verst.stoff] || STOFF.tre, b = Math.round((verst.bredde || 0) * 10) / 10, mål = String(b).replace('.', ',');
    return { feil: `Spennet er ${mål} m – for langt for ${st.navn.toLowerCase()} (høyst ${st.spenn} m). Sett inn en søylerad eller en bjelke.`, spenn: b, stoff: verst.stoff, maks: st.spenn, id: verst.del };
  }

  // Hva raser hvis delene i fjern rives? Gir { ider (dekke/tak som raser), m2 } eller null. Samme regel (Bygning.ras), før og etter.
  function rasVedRiving(alle, fjern) {
    const B = bygning(); if (!B || !B.fraByggesett || !fjern || !fjern.size) return null; alle = nærDeler(norm(alle), fjern, 6); if (!alle) return null;
    const rasIder = liste => { const m = B.fraByggesett(liste.map(d => ({ ...d, ferdig: true })), { ox: 0, oy: 0, utenGulv: true }); if (!m) return new Map(); const ut = new Map();
      for (const r of B.ras(m)) { const f = r.del === 'dekke' ? (m.etasjer.find(e => e.n === r.e) || { dekke: { felt: [] } }).dekke.felt[r.id] : r.del === 'tak' ? m.tak.felt[r.id] : null; if (f && f.del !== undefined) ut.set(f.del, (ut.get(f.del) || 0) + U * U); }
      return ut; };
    const før = rasIder(alle), etter = rasIder(alle.filter(d => !fjern.has(d.id))), ider = [...etter.keys()].filter(id => !før.has(id) && !fjern.has(id));
    if (!ider.length) return null; return { ider, m2: Math.round(ider.reduce((s, id) => s + etter.get(id), 0)) };
  }

  // ---------- ferdige hus (maler) ----------
  // En mal er deler i ruter fra (0, 0): { navn, w, h, deler: [{ type, i, j, a, n, r }] } – de innebygde lages av lagHus, egne av tilMal.
  function lagHus(o) {
    const s = o.s || 1, w = o.w, h = o.h, ut = [], T = (g, ss = s) => (DELER[typeFor(g, ss)] ? typeFor(g, ss) : typeFor(g, 1)), vt = v => T(`bs_vegg_${o.stoff}${v === 'hel' ? '' : '_' + v}`, v === 'port' ? (s === 1 ? 2 : s) : s);
    for (let i = 0; i < w; i += s) for (let j = 0; j < h; j += s) ut.push({ type: T(o.gulv), i, j, a: null, n: 0 });
    // sidene: 0 = sør (døra), 1 = øst, 2 = nord, 3 = vest; døra/porten midt på sør, vinduer midt på de andre sidene
    for (let k = 0; k < 4; k++) { const L = k % 2 === 0 ? w : h, inn = o.inngang || 'dør', bred = k === 0 && inn === 'port' ? (s === 1 ? 2 : s) : s;
      const midtpå = Math.floor((L - bred) / 2 / s) * s; let p = 0;
      while (p < L) { const er = k === 0 && p === midtpå, v = er ? inn : (k > 0 && (p === midtpå || (L / s > 4 && p === L - s))) ? 'vindu' : 'hel', l = er ? bred : s;
        const q = k === 0 ? { a: 'x', i: p, j: 0 } : k === 1 ? { a: 'y', i: w, j: p } : k === 2 ? { a: 'x', i: p, j: h } : { a: 'y', i: 0, j: p };
        ut.push({ type: vt(v), ...q, n: 0 }); p += l; } }
    for (const [i, j] of o.søyler || []) ut.push({ type: T(o.søyle || 'bs_søyle_stål', 1), i, j, a: null, n: 0 });
    for (let i = 0; i < w; i += s) for (let j = 0; j < h; j += s) ut.push({ type: T(o.tak), i, j, a: null, n: 1, ...(o.tak === 'bs_tak_sal' ? { r: w >= h ? 0 : 1 } : {}) });
    return { navn: o.navn, w, h, deler: ut, s };
  }
  // Hallen: 19,2 × 28,8 m i stål/blikk på hallrutenettet (4,8 m), port midt på forsiden og en søylerad midt i (uten den raser taket)
  const HUS = {
    hytte: lagHus({ navn: 'Hytte 4,8 × 4,8', w: 4, h: 4, gulv: 'bs_tregulv', stoff: 'tre', tak: 'bs_tak_sal' }),
    brakke: lagHus({ navn: 'Brakke 6 × 9,6', w: 8, h: 5, gulv: 'bs_fundament', stoff: 'tre', tak: 'bs_tak_sal' }),
    bunker: lagHus({ navn: 'Betongbu 7,2 × 7,2', w: 6, h: 6, gulv: 'bs_fundament', stoff: 'betong', tak: 'bs_tak_betong' }),
    hall: lagHus({ navn: 'Hall 19,2 × 28,8', w: 16, h: 24, s: 4, gulv: 'bs_fundament', stoff: 'blikk', tak: 'bs_tak_blikk', inngang: 'port', søyler: [[8, 4], [8, 8], [8, 12], [8, 16], [8, 20]] }),
  };
  // dreier et punkt (x, y) i en w × h-mal k kvart omdreininger mot klokka (malen blir h × w)
  function drei(x, y, w, h, k) { for (let q = 0; q < (k & 3); q++) { [x, y] = [h - y, x]; [w, h] = [h, w]; } return [x, y]; }
  // en del i malen dreid: rutene og kantene dreies som rektangler/linjer, trappa og mønet får ny retning
  function dreiDel(d, w, h, k) {
    k &= 3; if (!k) return { ...d }; const K = kat(d), s = størrelse(d.type);
    if (K === 'søyle') { const [x, y] = drei(d.i, d.j, w, h, k); return { ...d, i: x, j: y }; }
    if (K === 'trapp') { const [x, y] = drei(d.i + .5, d.j + .5, w, h, k); return { ...d, i: Math.round(x - .5), j: Math.round(y - .5), r: ((d.r || 0) + k) & 3 }; }
    if (KANT(d)) { const [x0, y0] = drei(d.i, d.j, w, h, k), [x1, y1] = d.a === 'x' ? drei(d.i + s, d.j, w, h, k) : drei(d.i, d.j + s, w, h, k);
      return { ...d, a: y0 === y1 ? 'x' : 'y', i: Math.min(x0, x1), j: Math.min(y0, y1) }; }
    const [x0, y0] = drei(d.i, d.j, w, h, k), [x1, y1] = drei(d.i + s, d.j + s, w, h, k);
    return { ...d, i: Math.min(x0, x1), j: Math.min(y0, y1), ...(d.r === 0 || d.r === 1 ? { r: k % 2 ? 1 - d.r : d.r } : {}) };
  }
  // malen (navnet i HUS, eller et malobjekt) lagt ut med hjørnet i (i0, j0) og dreid rotK kvart omdreininger
  function husDeler(mal, i0, j0, rotK = 0) {
    const M = typeof mal === 'string' ? HUS[mal] : mal; if (!M || !M.deler) return [];
    return M.deler.filter(d => DELER[d.type]).map(d => { const q = dreiDel(nrm(DELER[d.type].gammel ? { ...d, u: true } : d), M.w, M.h, rotK); return { ...q, i: q.i + i0, j: q.j + j0, u: true }; });
  }
  function husForslag(deler, mal, i0, j0, rotK = 0) {
    const alle = norm(deler), M = indeks(alle), ut = [];
    for (const q of husDeler(mal, i0, j0, rotK)) { const r = plassering(alle, q.type, { ...q, u: true }, { M, r: q.r, fast: true });
      if (!r.feil) { const d = { ...r.d, id: 'ny' + ut.length }; alle.push(d); for (const k of biter(d)) M.set(k, d); }
      ut.push({ slot: q, type: q.type, ...r }); }
    const sp = spenn(alle, new Set(ut.filter(q => !q.feil).map(q => 'ny' + ut.indexOf(q)))); if (sp) for (const q of ut) if (!q.feil && (kat(q.d) === 'tak' || kat(q.d) === 'gulv')) q.feil = sp.feil;
    return ut;
  }
  // Eget bygg som mal: delene (fra fraLeir) med hjørnet flyttet til (0, 0). Gamle deler (2,4 m) blir med som de er.
  function tilMal(deler, navn = 'Eget bygg') {
    const L = norm(deler).filter(d => DELER[d.type] && kat(d) !== 'forsvar'); if (!L.length) return null;
    const pk = L.flatMap(d => (KANT(d) ? kanter(d).flatMap(k => [[k.i, k.j]]) : kat(d) === 'søyle' ? [[d.i, d.j]] : ruter(d)));
    const i0 = Math.min(...pk.map(p => p[0])), j0 = Math.min(...pk.map(p => p[1]));
    const ut = L.map(d => ({ type: d.type, i: d.i - i0, j: d.j - j0, a: d.a || null, n: d.n || 0, ...(DELER[d.type].gammel ? { u: true } : {}), ...(d.r !== undefined && d.r !== null ? { r: d.r } : {}) }));
    const w = Math.max(...ut.flatMap(d => (KANT(d) ? [d.i + (d.a === 'x' ? størrelse(d.type) : 0)] : kat(d) === 'søyle' ? [d.i] : ruter(d).map(c => c[0] + 1)))), h = Math.max(...ut.flatMap(d => (KANT(d) ? [d.j + (d.a === 'y' ? størrelse(d.type) : 0)] : kat(d) === 'søyle' ? [d.j] : ruter(d).map(c => c[1] + 1))));
    return { navn, w, h, deler: ut, egen: true };
  }
  // en lagret mal er gyldig når alle typene finnes og tallene er hele
  const malGyldig = m => !!m && Array.isArray(m.deler) && m.deler.length > 0 && m.deler.length <= 3000 && m.deler.every(d => DELER[d.type] && Number.isInteger(d.i) && Number.isInteger(d.j) && Number.isInteger(d.n || 0));

  // ---------- lukkede rom ----------
  // Et rom: sammenhengende gulv i en etasje, vegger på alle kantene ut, og tak (eller gulvet over) over hver rute. Vegger inne deler rommet.
  // Hullet over en trapp hører til rommet over (trappa går opp dit). Bare ferdige deler teller (d.ferdig !== false).
  // brukbart: dør i 1. etasje; i etasjene over en trapp opp (rom av bare gamle deler: trapp antas inne, som før). senger: 1 per 8 m².
  // ROMBRUK (18. nov, Claudes forslag): bruken spilleren velger. typer = { nøkkel: bruk } (L.romBruk).
  const ROMBRUK = { soverom: { navn: 'Soverom', tekst: 'senger' }, kjøkken: { navn: 'Kjøkken', tekst: 'varm mat når noen står på «kjøkken»', min: 16 }, lager: { navn: 'Lager', tekst: 'mer lagerplass', m3: .6 },
    verksted: { navn: 'Verksted', tekst: 'for folk på «verksted»', min: 16 } };
  // ROMTYPER (B4-rammeverket): hva rommet ER ut fra det som står i det. ting = { seng, maskin, … } (antall). Første som passer vinner;
  // B5 legger maskinene inn (fabrikk) med ROMTYPER.unshift(...). Uten noe som passer: bruken (soverom, lager …).
  const ROMTYPER = [
    // (B5) maskiner gjør rommet til et verksted (én) eller en fabrikk (flere, eller en sagbenk); hyller/paller uten maskiner = lagerrom
    { id: 'fabrikk', navn: 'Fabrikk', passer: (r, t) => (t.maskin || 0) >= 2 || (t.sag || 0) >= 1 },
    { id: 'verksted', navn: 'Verksted', passer: (r, t) => (t.maskin || 0) >= 1 },
    { id: 'lagerrom', navn: 'Lagerrom', passer: (r, t) => (t.hylle || 0) >= 1 && !(t.seng || 0) },
    { id: 'sovesal', navn: 'Sovesal', passer: (r, t) => (t.seng || 0) >= 4 },
    { id: 'soverom', navn: 'Soverom', passer: (r, t) => (t.seng || 0) >= 1 },
  ];
  function romType(r, ting) { const t = ting || { seng: r.senger || 0 }; for (const T of ROMTYPER) if (T.passer(r, t)) return { id: T.id, navn: T.navn };
    const B = ROMBRUK[r.bruk]; return B ? { id: r.bruk, navn: B.navn } : { id: 'rom', navn: 'Rom' }; }
  function romSum(R) { const u = { senger: 0, kjøkken: 0, verksted: 0, lager: 0, hyller: 0 }; for (const r of R) { u.senger += r.senger; if (r.bruk === 'kjøkken' && r.virker) u.kjøkken++; if (r.bruk === 'verksted' && r.virker) u.verksted++; if (r.bruk === 'lager') u.lager += r.lager;
    if (r.brukbart && r.hylleplass) u.hyller += r.hylleplass; } return u; }
  function rom(deler, typer) {
    const D0 = norm(deler).filter(d => d.ferdig !== false && DELER[d.type]), M = indeks(D0), ut = [], sett = new Set();
    // gulvruter per etasje (og hullene over trappene)
    const start = [];
    for (const g of D0) { if (kat(g) === 'gulv') for (const [i, j] of ruter(g)) start.push([i, j, g.n]); }
    const golvAktig = (i, j, e) => !!gulv(M, i, j, e) || (e > 0 && !!trappHer(M, i, j, e - 1));
    for (const [gi, gj, e] of start) {
      const s0 = `${gi},${gj},${e}`; if (sett.has(s0)) continue;
      const celler = [], kø = [[gi, gj]], dørId = new Set(), vinduId = new Set(), portId = new Set(); let lukket = true, trapp = false, nye = false;
      while (kø.length) { const [i, j] = kø.pop(), s = `${i},${j},${e}`; if (sett.has(s)) continue; sett.add(s); celler.push([i, j]);
        const g = gulv(M, i, j, e); if (g && !DELER[g.type].gammel) nye = true; if (!g) trapp = true;
        const over = dekke(M, i, j, e + 1) || trappHer(M, i, j, e); if (!over) lukket = false;
        for (const [k, [di, dj]] of kanterRundt(i, j).map((k, q) => [k, [[0, -1], [0, 1], [-1, 0], [1, 0]][q]])) {
          const w = vegg(M, k, e);
          if (w) { const v = DELER[w.type].v; if (v === 'dør') dørId.add(w.id); else if (v === 'vindu') vinduId.add(w.id); else if (v === 'port') portId.add(w.id); continue; }
          if (golvAktig(i + di, j + dj, e)) kø.push([i + di, j + dj]); else lukket = false; }
        if (celler.length > 3000) { lukket = false; break; } }
      if (!lukket) continue;
      const dører = dørId.size, vinduer = vinduId.size, porter = portId.size, areal = celler.length * U * U, brukbart = dører + porter > 0 || (e > 0 && (trapp || !nye));
      const cx = celler.reduce((s, c) => s + c[0] + .5, 0) / celler.length, cy = celler.reduce((s, c) => s + c[1] + .5, 0) / celler.length;
      // nøkkelen er rommets minste rute i 2,4 m-mål (samme som før for gamle rom: L.romBruk virker), fast så lenge rommet står
      // (en ny hall med bare port er et lager til du velger noe annet)
      const c0 = celler.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])[0], nøkkel = `${e}:${c0[0] / 2},${c0[1] / 2}`, valgt = typer && ROMBRUK[typer[nøkkel]] ? typer[nøkkel] : (nye && porter && !dører ? 'lager' : 'soverom');
      const bruk = brukbart ? valgt : 'soverom', B = ROMBRUK[bruk], virker = brukbart && (!B.min || areal >= B.min), sov = bruk === 'soverom';
      const r = { etasje: e, celler, ruter: celler.length, areal: Math.round(areal * 10) / 10, ci: cx, cj: cy, dører, vinduer, porter, brukbart, nøkkel, bruk, virker, trapp,
        lager: bruk === 'lager' ? Math.round(areal * B.m3 * 10) / 10 : 0,
        senger: brukbart && sov ? Math.floor(areal / SENG_M2) : 0,
        navn: !brukbart ? (e > 0 ? 'Rom uten trapp' : 'Rom uten dør') : !sov ? `Egenbygd ${B.navn.toLowerCase()}` + (virker ? '' : ' (for lite)') : areal >= 2 * SENG_M2 ? 'Egenbygd brakke' : 'Bod' };
      // (B5) det som står i rommet: maskiner, hyller/paller og lamper (fotavtrykket i rommets ruter i samme etasje)
      const iRom = new Set(celler.map(c => c.join(','))), her = q => q.n === e && ruter(q).some(([a, b]) => iRom.has(a + ',' + b));
      r.maskiner = D0.filter(q => kat(q) === 'maskin' && her(q)).map(q => q.id); r.hyller = D0.filter(q => kat(q) === 'lager' && her(q)).map(q => q.id); r.lamper = D0.filter(q => kat(q) === 'lampe' && her(q)).map(q => q.id);
      r.hylleplass = D0.filter(q => kat(q) === 'lager' && her(q)).reduce((s, q) => s + (DELER[q.type].lager || 0), 0);
      r.type = romType(r, { seng: r.senger, maskin: r.maskiner.length, sag: D0.filter(q => kat(q) === 'maskin' && her(q) && DELER[q.type].maskin === 'sagbruk').length, hylle: r.hyller.length });
      if (r.maskiner.length || r.hyller.length) r.navn = r.type.navn + (r.hylleplass ? ` · lager ${r.hylleplass} m³` : '');
      ut.push(r);
    }
    return ut;
  }

  // ---------- høyder (ingen svevende deler) ----------
  // h(x, y) -> moh. Delene som henger sammen (ruter og kanter som berører hverandre, ikke forsvar) får samme grunnhøyde: høyeste
  // terreng under 1. etasje + 0,25 m. Delene på bakken får en sokkel ned til laveste terreng − 0,3 m. Gir Map id -> { z0, ned }.
  const SOKKEL = .25;
  // punktene en del står på (kartet): endene av en kant, hjørnet for en søyle, hjørnene i alle rutene ellers
  const punkter = (o, d) => { d = nrm(d); return KANT(d) ? kantEnder(o, d) : kat(d) === 'søyle' ? [[o.ox + d.i * U, o.oy + d.j * U]] : ruter(d).flatMap(([i, j]) => [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => [o.ox + (i + a) * U, o.oy + (j + b) * U])); };
  function høyder(o, deler, h) {
    deler = norm(deler); const hus = deler.filter(d => kat(d) !== 'forsvar'), harRute = new Set(), forelder = new Map();
    const finn = k => { while (forelder.get(k) !== k) { forelder.set(k, forelder.get(forelder.get(k))); k = forelder.get(k); } return k; };
    const node = k => { if (!forelder.has(k)) forelder.set(k, k); return k; }, slå = (a, b) => { const x = finn(node(a)), y = finn(node(b)); if (x !== y) forelder.set(x, y); };
    for (const d of hus) if (RUTE(d) || kat(d) === 'trapp') for (const [i, j] of ruter(d)) harRute.add(`${i},${j}`);
    for (const d of hus) {
      const id = 'd' + d.id;
      if (RUTE(d) || kat(d) === 'trapp') { for (const [i, j] of ruter(d)) { slå(id, `R${i},${j}`); for (const [di, dj] of [[1, 0], [0, 1]]) if (harRute.has(`${i + di},${j + dj}`)) slå(`R${i},${j}`, `R${i + di},${j + dj}`); } continue; }
      if (kat(d) === 'søyle') { slå(id, `V${d.i},${d.j}`); for (const [i, j] of [[d.i, d.j], [d.i - 1, d.j], [d.i, d.j - 1], [d.i - 1, d.j - 1]]) if (harRute.has(`${i},${j}`)) slå(id, `R${i},${j}`); continue; }
      for (const k of kanter(d)) { const [[ax, ay], [bx, by]] = k.a === 'x' ? [[k.i, k.j], [k.i + 1, k.j]] : [[k.i, k.j], [k.i, k.j + 1]];
        slå(id, `V${ax},${ay}`); slå(id, `V${bx},${by}`); for (const [i, j] of ruterVed(k)) if (harRute.has(`${i},${j}`)) slå(id, `R${i},${j}`); }
    }
    const pkt = d => punkter(o, d);
    const topp = new Map(), toppAlle = new Map(), ut = new Map(), maks = (m, k, z) => m.set(k, Math.max(m.has(k) ? m.get(k) : -1e9, z));
    for (const d of hus) { const k = finn(node('d' + d.id)); for (const [x, y] of pkt(d)) { const z = h(x, y); if (z === null || z !== z) continue; maks(toppAlle, k, z); if (d.n === 0) maks(topp, k, z); } }
    for (const d of hus) { const k = finn('d' + d.id), z0 = (topp.has(k) ? topp.get(k) : toppAlle.has(k) ? toppAlle.get(k) : 0) + SOKKEL;
      ut.set(d.id, { z0, ned: d.n === 0 ? Math.min(...pkt(d).map(([x, y]) => h(x, y))) - .3 : null }); }
    for (const d of deler) if (kat(d) === 'forsvar') { const z = kantEnder(o, d).map(([x, y]) => h(x, y)); ut.set(d.id, { z0: Math.min(...z), ned: Math.min(...z) - .3, ender: z }); }
    return ut;
  }
  // Delen i et Leir-bygg (med plassen i rutenettet i 1,2 m-ruter), eller null. Gamle typer (versjon 2) står i 2,4 m-ruter: ganges med 2.
  function fraBygg(b, LB) {
    if (!b || !DELER[b.type] || !b.bs) return null; const f = DELER[b.type].gammel && !b.bs.g ? 2 : 1;
    return { id: b.id, type: b.type, i: b.bs.i * f, j: b.bs.j * f, a: b.bs.a || null, n: b.bs.n || 0, r: b.bs.r, s: størrelse(b.type), u: true, ferdig: LB ? LB.virker(b) : true, igjen: b.igjen };
  }
  const fraLeir = (L, LB) => (L ? L.bygg.map(b => fraBygg(b, LB)).filter(Boolean) : []);
  // plassen som lagres på et nytt bygg (b.bs): alltid i 1,2 m-ruter (g: 1 – også for en gammel type lagt ut på nytt, f.eks. fra en egen mal)
  const plassFor = d => ({ g: 1, i: d.i, j: d.j, a: d.a || null, n: d.n || 0, ...(d.r !== undefined && d.r !== null ? { r: d.r } : {}) });
  // Sengeplassene i leiren får med de egenbygde brakkene (Leir.plasser leser byggene; rommene legges til)
  if (Leir && !Leir.plasser.byggesett) { const før = Leir.plasser; Leir.plasser = L => før(L) + rom(fraLeir(L, Leir), L.romBruk).reduce((s, r) => s + r.senger, 0); Leir.plasser.byggesett = true; }
  // rom brukt som lager gir lagerplass
  // (B5) hyller og paller i et lukket rom med dør gir lagerplass (lagerHylle: har leiren noen ferdige hyller? – sjekkes først, så det går raskt)
  const harHyller = L => !!(L && Array.isArray(L.bygg) && L.bygg.some(b => DELER[b.type] && DELER[b.type].kat === 'lager' && !(b.igjen > 0)));
  if (Leir && Leir.lagerplass && !Leir.lagerplass.ekstra) Leir.lagerplass.ekstra = L => { const rb = L && L.romBruk && Object.keys(L.romBruk).length, hy = harHyller(L); if (!rb && !hy) return 0;
    const S = romSum(rom(fraLeir(L, Leir), L.romBruk)); return (rb ? S.lager : 0) + S.hyller; };

  const api = { U, G, H, ETASJER, GROV, SOKKEL, DELER, GAMLE, NYE, STOFF, HUS, erDel, registrer, størrelse, typeFor, celle, ruter, kanter, biter, midt, kantEnder, kantVed, hjørneVed, rad,
    nøkkel, indeks, norm, punkter, støttet, plassering, forslag, spenn, rasVedRiving, lagHus, husDeler, husForslag, dreiDel, tilMal, malGyldig, rom, ROMBRUK, ROMTYPER, romType, romSum, høyder, fraBygg, fraLeir, plassFor,
    KANT, RUTE, kat, TING, fotRuter, tingFeil, BETONG, harHyller };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.ByggesettRegler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
