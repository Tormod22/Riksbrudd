// VAKT for pakka «karakter» (eventyret til fots, natt til 18. nov): feltflaske, skader, håndverk, sniking og dekning, hund,
// historie, kartslør, ligge-stilling og karakterarket. Alt settes tilbake etterpå.
module.exports = {
  navn: 'eventyret til fots (karakter)',
  kjør: async (pg, profil) => {
    const data = await pg.evaluate(async () => {
      const d = { feil: [] }, krev = (b, t) => { if (!b) d.feil.push(t); };
      if (!window.Eventyr || !window.EventyrSpill || !EventyrSpill.klar()) { d.feil.push('EventyrSpill er ikke klart'); return d; }
      const E = Eventyr, S = EventyrSpill, T = S.T(), I = UtstyrSpill.tilstand(), B = KarakterSpill.T().behov, K = SpilletSpill.K();
      // ta vare på alt som røres
      const før = { T: JSON.stringify(T), I: JSON.stringify(I), B: { ...B }, hp: K.hp, test: S.test, penger: OppstartSpill.tilstand().penger, F: JSON.stringify(OverlevSpill.F()), ark: KarakterSpill.erÅpen(), slør: E.Slør.tilTekst(S.slør()), antall: S.slør().antall, lagret: {} };
      for (const k of ['riksbrudd-eventyr', 'riksbrudd-kartslor', 'riksbrudd-utstyr', 'riksbrudd-ferdigheter', 'riksbrudd-karakter']) før.lagret[k] = localStorage.getItem(k);
      try {
        // sekken kjenner delene, og de kan ikke kjøpes
        krev(Utstyr.TING.tøy && Utstyr.TING.tøy.del && Utstyr.TING.vann && Utstyr.VÅPEN.armbrøst && Utstyr.VÅPEN.armbrøst.selges === false, 'delene/armbrøsten mangler i sekkens tabeller');
        // feltflaska
        I.ting.vann = 2; B.tørst = 40; krev(S.drikk() && I.ting.vann === 1 && B.tørst === 75, 'en slurk av feltflaska gir ikke +35 tørst'); B.tørst = 99; krev(!S.drikk() && I.ting.vann === 1, 'drakk uten å være tørst');
        krev(S.fyllFlaske(true) === 3 && I.ting.vann === 4, 'flaska ble ikke fylt');
        // rasjonen (feilen som ble rettet: knappen brukte feil navn)
        I.ting.rasjon = 1; B.sult = 30; krev(KarakterSpill.spisRasjon() && !I.ting.rasjon && B.sult === 80, 'feltrasjonen virker ikke');
        // håndverk
        Object.assign(I.ting, { tøy: 3, tau: 2, sprit: 1, ståltråd: 1, skrap: 1 }); delete I.ting.spjelk; delete I.ting.felle; const laget0 = T.tellere.laget;
        krev(S.lag('spjelk') && I.ting.spjelk === 1 && I.ting.tøy === 2 && T.tellere.laget === laget0 + 1, 'spjelken ble ikke laget'); krev(!S.lag('armbrøst'), 'armbrøst uten nok deler');
        krev(S.lag('felle') && I.ting.felle === 1, 'fella ble ikke laget');
        // skader: brukket bein gir halv fart til det er spjelket
        T.skader = {}; krev(S.fart() === 1 && S.kanLøpe(), 'frisk skal ha full fart'); S.fåSkade('bein', 'Vakt'); krev(S.fart() === .5 && !S.kanLøpe(), 'brukket bein gir ikke halv fart');
        krev(S.behandle('bein') && S.fart() === .8 && !I.ting.spjelk, 'spjelken behandlet ikke beinet');
        S.fåSkade('infeksjon', 'Vakt'); d.knappSekk = (S.sekkKnapp('forbinding') || [])[0]; krev(d.knappSekk === 'Behandle', 'sekken tilbyr ikke å behandle infeksjonen');
        // i testene skjer ingenting av seg selv: faktoren er 1 uten test, og fallet skader ikke
        const fi = { x: 0, y: 0, navn: 'Vaktfiende' }; S.test = false; krev(S.fiendeFaktor({ x: 10, y: 0 }, fi) === 1, 'sniking/dekning virker i testene uten å være slått på'); const hp0 = K.hp; S.fall(15); krev(K.hp === hp0, 'fall skadet i testene');
        // sniking: usett fiende skyter ikke, sett fiende gjør det
        S.test = true; krev(S.fiendeFaktor({ x: 10, y: 0 }, fi) === 0, 'en fiende som ikke har sett deg, skal ikke skade'); S.settSett(fi, true); d.faktor = S.fiendeFaktor({ x: 10, y: 0 }, fi); krev(d.faktor > 0 && d.faktor <= 1, 'en fiende som har sett deg, skal skade');
        d.rekk = Math.round(S.snikRekkevidde()); krev(d.rekk > 10 && d.rekk <= 430, 'snikeavstanden er urimelig: ' + d.rekk);
        // fall med testen på: helsa synker
        K.hp = 100; S.fall(12); krev(K.hp < 100 && K.hp >= 5, 'et høyt fall kostet ikke helse'); K.hp = før.hp;
        // historien: nå målet -> belønning og neste kapittel
        T.hist = E.Historie.ny(); const bg = OppstartSpill.tilstand().karakter.bakgrunn, kap = E.Historie.kapittel(bg, T.hist), slag = kap.mål.slag;
        if (['gått', 'felt', 'laget', 'fangst', 'sovet'].includes(slag)) { T.tellere[slag] = kap.mål.n + 1; const k = S.historieSteg(); krev(k && k.tittel === kap.tittel && T.hist.kap === 1, 'kapittelet ble ikke fullført'); d.kapittel = kap.tittel; } else d.kapittel = '(hoppet over: ' + slag + ')';
        // søvn (straks i testene: klokka røres ikke) og kjøtt fra jakt (nær leiren tar leiren det)
        { const s0 = T.tellere.sovet, t0 = tid; B.søvn = 10; S.sovNå(true); krev(B.søvn === 90 && T.tellere.sovet === s0 + 1 && tid === t0, 'søvnen ga ikke +80'); }
        d.kjøttNær = S.felteDyr(10, 'sau', 50); krev(d.går ? true : d.kjøttNær === false, 'kjøttet skal gå til leiren når du ikke går selv');
        // hunden
        T.hund = null; krev(S.fåHund('Vakt') && T.hund && T.hund.navn, 'hunden kom ikke');
        // kartsløret: leiren er oppdaget, langt unna er det ikke
        const M = S.slør(), leir = OppstartSpill.tilstand().leir; d.km2 = Math.round(E.Slør.km2(M)); krev(E.Slør.sett(M, leir.x, leir.y) && !E.Slør.sett(M, leir.x + 40000, leir.y) && d.km2 > 10, 'sløret stemmer ikke');
        // karakterarket viser det nye
        KarakterSpill.åpne(); const ark = document.getElementById('karakterark').textContent; d.ark = /Din historie/.test(ark) && /Feltflaske/.test(ark) && /Skader/.test(ark) && /Hunden/.test(ark) && /Oppdaget/.test(ark); krev(d.ark, 'karakterarket mangler det nye'); if (!før.ark) KarakterSpill.lukk();
        // håndverkspanelet
        S.åpne('lag'); d.oppskrifter = document.querySelectorAll('#evpanel [data-lag]').length; krev(d.oppskrifter === E.Handverk.OPPSKRIFTER.length, 'håndverkspanelet mangler oppskrifter'); S.åpne('');
        // evnene: «Trent øye» fra leting nivå 3
        krev(!OverlevSpill.har('øye') && Overlev.Ferdigheter.har({ leting: 1e6 }, 'øye') && Overlev.Ferdigheter.åpnes('leting', 3)[1] === 'Trent øye', 'evnene fra ferdighetene stemmer ikke');
        // når du går: ligg, knapperaden, og tilflukten du våkner i
        d.går = typeof R3 !== 'undefined' && !!(R3 && R3.fot && R3.ut && Gange.kropp());
        if (d.går) { Gange.ligg(true); await new Promise(r => setTimeout(r, 900)); d.stilling = Gange.stilling(); krev(d.stilling === 'ligg', 'du la deg ikke ned'); krev(Math.abs(E.Snik.dekning(Gange.stilling(), false) - .5) < 1e-9, 'liggende gir ikke halv skade');
          S.oppdater(); d.rad = document.querySelectorAll('#evrad.på > *').length; krev(d.rad >= 2, 'knapperaden mangler når du går'); Gange.ligg(false);
          const TT = OverlevSpill.T(), x0 = R3.bane.x, y0 = R3.bane.y; TT.push({ i: -77, x: Math.round(R3.ut.cx + x0 + 40), y: Math.round(R3.ut.cy + y0), kl: 'hus' }); T.våkn = true; S.test = false;
          const tok = S.slåttUt(K); d.våknet = tok && K.hp === E.REGLER.tilflukt.helseEtter && Math.abs(R3.bane.x - x0 - 40) < 2; krev(d.våknet, 'du våknet ikke i tilfluktsstedet'); TT.splice(TT.findIndex(q => q.i === -77), 1); Gange.flytt(x0, y0, false); }
      } catch (e) { d.feil.push('unntak: ' + e.message); }
      // sett alt tilbake
      const T0 = JSON.parse(før.T); for (const k of Object.keys(T)) delete T[k]; Object.assign(T, T0);
      const I0 = JSON.parse(før.I); I.våpen.length = 0; I.våpen.push(...I0.våpen); I.aktiv = I0.aktiv; for (const k of Object.keys(I.ting)) delete I.ting[k]; Object.assign(I.ting, I0.ting);
      Object.assign(B, før.B); K.hp = før.hp; S.test = før.test; const F = OverlevSpill.F(), F0 = JSON.parse(før.F); for (const k of Object.keys(F)) F[k] = F0[k];
      const M = S.slør(); if (M.antall !== før.antall) E.Slør.fraTekst(M, før.slør);
      const P = OppstartSpill.tilstand(); if (P.penger > før.penger) OppstartSpill.betal(P.penger - før.penger); else if (P.penger < før.penger) OppstartSpill.gi(før.penger - P.penger);
      for (const [k, v] of Object.entries(før.lagret)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
      document.getElementById('evtoast').classList.remove('på'); UtstyrSpill.vis(); S.oppdater(); if (typeof skitten !== 'undefined') skitten = true;
      return d;
    });
    const ok = !data.feil.length;
    return { ok, tekst: ok ? `flaske, rasjon, håndverk, skader, sniking (oppdages fra ${data.rekk} m), historie «${data.kapittel}», hund, slør ${data.km2} km², ark og ${data.oppskrifter} oppskrifter${data.går ? ', ligg og tilflukt' : ''} (${profil})` : data.feil.join('; '), data };
  },
};
