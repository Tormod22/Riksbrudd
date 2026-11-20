// VAKT «terreng (runde 8)»: kritikken (telefon, /norge) la leiren i en bratt li ved Aurland, og det første bygget fikk «For bratt her
// (11 m …)» – eneste vei ut var nytt spill; kartet viste ikke hvor det var flatt, og loggen sa en annen pris enn kortet.
// Vakten prøver: (1) reglene (Helling = Leir.kanBygge), (2) leirvalget i en bratt li på Dovre-kartet: «Bratt – ingen flat plass …»,
// ingen «Legg leiren her», bekreft() gjør ingenting, «Flytt hit» gir et sted der de første byggene får plass; et trykk i vann gir
// forslag til nærmeste tørre sted; (3) hellingskartet farges rundt stedet og stemmer med kanBygge når du plasserer en brakke;
// (4) «Kjøp materialene og bygg» gir samme pris i loggen som på knappen og i kassa; (5) fargeprøvene er minst 44 px på telefon.
// Setter alt tilbake: startskjermen og banneret lukkes, plasseringen avbrytes, leiren (bygg, lager), kassa, kameraet, valgt,
// OppstartSpill.test, HellingVis.test og utkastnøkkelen som før. 3D røres ikke (hellingskartet regnes også i 3D mens vakten går).
module.exports = {
  navn: 'terreng (leirplass, helling og plassering av bygg)',
  kjør: async (pg, profil) => {
    // (utenTegning fra sjekk.js: 3D-scenen tegnes ikke mens vakta går – vakta ser ikke på 3D, og hvert bilde tar ellers ~1 s i programvare-grafikk)
    const d = await pg.evaluate(profil => (window.utenTegning || (f => f()))(async () => {
      const OS = window.OppstartSpill, ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
      if (!OS || !window.Helling || !window.HellingVis || !window.Leir || !window.LeirSpill) return { mangler: true };
      const S = OS.tilstand(), L = LeirSpill.tilstand(); if (!S || !S.leir || !L) return { feil: ['ingen leir'] };
      const el = id => document.getElementById(id), vent = ms => new Promise(r => setTimeout(r, ms)), kam0 = { ...kam }, valgt0 = valgt, test0 = OS.test, htest0 = HellingVis.test;
      const utk0 = localStorage.getItem(OS.UTKAST), leir0 = { ...S.leir }, penger0 = S.penger, L0 = JSON.stringify(L), på3d0 = typeof på3d !== 'undefined' && på3d;
      const knapper = () => [...document.querySelectorAll('#leirvalg button')].map(b => b.textContent);
      const ferdig = async () => { for (let i = 0; i < 120; i++) { const f = OS.forslag(), t = el('leirvalg').textContent; if (f && !f.sjekker && !/Ser etter|Sjekker om/.test(t)) return true; await vent(150); } return false; };
      try {
        HellingVis.test = true;
        // 1. reglene: Helling bruker samme bratt-sjekk som kanBygge
        { const li = (x) => 100 + 1.2 * Math.max(0, x), b = { type: 'brakke', x: 50, y: 0, ret: 0 };
          krev(/For bratt/.test(Leir.kanBygge(Leir.ny(), b, { klasse: () => 2, høyde: li }) || '') && Helling.vurder(b, li, null).nivå === Helling.BRATT, 'Helling og kanBygge er uenige i lia');
          krev(Helling.førsteBygg(() => 5, () => true, 0, 0).ok, 'de første byggene får ikke plass på flat mark'); }
        // 2. et bratt og et vått sted på Dovre-kartet (lia vest for Dombås, og et vann)
        const v = await lagVindu([189000, 6900800, 192200, 6904000], false, 11), kv = await lagVindu([189000, 6900800, 192200, 6904000], false), hf = Helling.høydeFra(v), tf = Helling.tørtFra(Helling.klasseFra(kv));
        let bratt = null; for (let r = 0; r < 1500 && !bratt; r += 45) for (let a = 0; a < 6.28 && !bratt; a += .3) { const x = 190600 + r * Math.cos(a), y = 6902225 + r * Math.sin(a); if (tf(x, y) && !Helling.førsteBygg(hf, tf, x, y, { flatFørst: true }).ok) bratt = [x, y]; }
        let vann = null; const kv2 = await lagVindu([192000, 6894900, 201000, 6906500], false);
        for (let j = 10; j < kv2.h - 10 && !vann; j += 2) for (let i = 10; i < kv2.w - 10 && !vann; i += 2) if (kv2.K[j * kv2.w + i] === 3 && kv2.K[j * kv2.w + i + 1] === 3 && kv2.K[(j + 1) * kv2.w + i] === 3) vann = [kv2.x0 + (i + .5) * kv2.r, kv2.y0 - (j + .5) * kv2.r];
        krev(!!bratt, 'fant ikke noe bratt sted å prøve på'); krev(!!vann, 'fant ikke noe vann å prøve på');
        OS.test = true; OS.nytt(); OS.vis(3); [...document.querySelectorAll('#oppstart button')].find(b => /kartet/.test(b.textContent)).click();
        if (bratt) { kam.x = bratt[0]; kam.y = bratt[1]; kam.m = 4; await OS.prøvLeir(bratt[0], bratt[1]);
          ut.underveis = knapper().some(t => /Legg leiren her/.test(t)); krev(!ut.underveis, '«Legg leiren her» sto der mens terrenget ble sjekket');
          krev(await ferdig(), 'leirvalget ble ikke ferdig (bratt)');
          ut.bratt = el('leirvalg').textContent.replace(/\s+/g, ' ').slice(0, 150);
          krev(/Bratt – ingen flat plass for en brakke/.test(ut.bratt), 'ingen beskjed om at det er bratt: ' + ut.bratt);
          krev(!knapper().some(t => /Legg leiren her/.test(t)) && !OS.forslag().ok, 'en umulig leir kan bekreftes');
          OS.bekreft(); krev(OS.tilstand() === S && S.leir.x === leir0.x && S.leir.y === leir0.y, 'bekreft() la leiren i den bratte lia');
          krev(!!el('flytthit'), 'ingen «Flytt hit»');
          // hellingskartet rundt stedet (leirvalget)
          kam.m = 1; HellingVis.oppdater(); for (let i = 0; i < 80 && (HellingVis.venter() || !HellingVis.tilstand() || HellingVis.tilstand().hvor !== 'leir'); i++) { await vent(100); HellingVis.oppdater(); }
          const t = HellingVis.tilstand(); ut.kartLeir = t; krev(t && t.vises && t.bratt > 0, 'hellingskartet viser ikke det bratte i leirvalget');
          if (el('flytthit')) { el('flytthit').click(); await vent(50); krev(await ferdig(), 'leirvalget ble ikke ferdig (Flytt hit)'); const f = OS.forslag();
            ut.flyttet = el('leirvalg').textContent.replace(/\s+/g, ' ').slice(0, 120);
            krev(f && f.ok && knapper().some(t => /Legg leiren her/.test(t)), '«Flytt hit» ga ikke et sted som kan bekreftes: ' + ut.flyttet);
            krev(f && Helling.førsteBygg(hf, tf, f.x, f.y, { flatFørst: true }).ok, 'de første byggene får ikke plass der «Flytt hit» satte leiren'); } }
        if (vann) { kam.x = vann[0]; kam.y = vann[1]; kam.m = 4; const g = await OS.prøvLeir(vann[0], vann[1]); krev(/vann/.test(g || ''), 'vannet ble ikke avvist: ' + g);
          krev(await ferdig(), 'leirvalget ble ikke ferdig (vann)'); ut.vann = el('leirvalg').textContent.replace(/\s+/g, ' ').slice(0, 120);
          krev(!!el('flytthit') && /Nærmeste tørre sted/.test(ut.vann), 'ingen forslag til nærmeste tørre sted: ' + ut.vann); }
        OS.lukk(); OS.test = test0; Object.assign(kam, kam0); skitten = true;
        // 3. plassering ved leiren: hellingskartet for brakka, og det stemmer med kanBygge
        LeirSpill.startPlassering('brakke'); kam.x = S.leir.x; kam.y = S.leir.y; kam.m = 1; HellingVis.oppdater();
        for (let i = 0; i < 80 && (HellingVis.venter() || !HellingVis.tilstand() || HellingVis.tilstand().hvor !== 'bygg'); i++) { await vent(100); HellingVis.oppdater(); }
        const tb = HellingVis.tilstand(); ut.kartBygg = tb; krev(tb && tb.vises && tb.type === 'brakke' && tb.flatt + tb.skrått > 0, 'hellingskartet vises ikke når du plasserer en brakke');
        krev(/grønt/.test(el('byggvalg').textContent), 'banneret forklarer ikke fargene i kartet');
        let sjekket = 0, uenig = 0;
        for (const [dx, dy] of [[30, 0], [-30, 10], [0, 40], [60, -40], [-70, -50], [90, 70]]) { LeirSpill.trykk(S.leir.x + dx, S.leir.y + dy); await LeirSpill.prøv(); const p = LeirSpill.plassering(); if (!p || p.x === null) continue;
          const n = HellingVis.nivåVed(p.x, p.y); if (n === null || n === Helling.UKJENT || n === Helling.VANN) continue; sjekket++;
          if ((n === Helling.BRATT) !== /For bratt/.test(p.feil || '')) uenig++; }
        krev(sjekket >= 3 && !uenig, `hellingskartet og kanBygge er uenige (${uenig} av ${sjekket})`); ut.sjekket = sjekket;
        // 3b. skissen i den bratte lia: «For bratt», og «Flytt skissen …» flytter den dit det går
        if (bratt) { LeirSpill.trykk(bratt[0], bratt[1]); kam.x = bratt[0]; kam.y = bratt[1]; HellingVis.oppdater();
          for (let i = 0; i < 80 && (HellingVis.venter() || !HellingVis.tilstand() || Math.hypot(HellingVis.tilstand().x - bratt[0], HellingVis.tilstand().y - bratt[1]) > 60); i++) { await vent(100); HellingVis.oppdater(); }
          await LeirSpill.prøv(); const p = LeirSpill.plassering(); ut.skisseBratt = p && p.feil;
          krev(p && /For bratt/.test(p.feil || '') && p.brattForslag, 'skissen i lia sier ikke «For bratt» eller har ikke noe forslag: ' + (p && p.feil));
          const fk = el('brattflytt'), dk = el('brattdrei'); ut.brattKnapper = [!!fk, !!dk];
          if (fk) { fk.click(); for (let i = 0; i < 40 && LeirSpill.plassering() && /For bratt/.test(LeirSpill.plassering().feil || ''); i++) await vent(100); await LeirSpill.prøv();
            const q = LeirSpill.plassering(); ut.etterFlytt = q && q.feil; krev(q && !/For bratt/.test(q.feil || ''), '«Flytt skissen» ga fortsatt «For bratt»'); }
          else krev(!!dk, 'verken «Flytt skissen» eller «Drei 90°» for den bratte skissen'); }
        // 3c. byggesettet: et ferdig hus (brakke 3 × 4) i den bratte lia avvises som helhet («For bratt for huset»), ved leiren går det
        if (bratt && window.Byggesett) { LeirSpill.avbryt(); Byggesett.åpne(); Byggesett.velg({ fane: 'hus', hus: 'brakke', rot: 0 });
          Byggesett.trykk(bratt[0], bratt[1]); await Byggesett.oppdater(); const Fb = Byggesett.forslag();
          ut.husBratt = Fb.length ? Fb[0].feil : 'ingen deler'; krev(Fb.length && Fb.every(q => q.feil) && Fb.some(q => /For bratt for huset/.test(q.feil || '')), 'huset i den bratte lia ble ikke avvist: ' + ut.husBratt);
          Byggesett.trykk(S.leir.x - 12, S.leir.y - 36); await Byggesett.oppdater(); ut.husLeir = Byggesett.forslag().filter(q => /For bratt/.test(q.feil || '')).length;
          krev(ut.husLeir === 0, 'huset ved leiren ble avvist som for bratt'); Byggesett.lukk(); LeirSpill.startPlassering('brakke'); }
        // 4. «Kjøp materialene og bygg»: loggen sier det samme som knappen
        L.lager.tre = 0; L.lager.betong = 0; let fri = null;
        for (const [dx, dy] of [[40, 30], [-45, 35], [45, -40], [-50, -45], [70, 0], [0, 75]]) { LeirSpill.trykk(S.leir.x + dx, S.leir.y + dy); await LeirSpill.prøv(); const p = LeirSpill.plassering(); if (p && !p.feil) { fri = p; break; } }
        krev(!!fri, 'fant ikke plass til en brakke ved leiren');
        const kj = [...document.querySelectorAll('#byggvalg button')].find(b => /Kjøp materialene og bygg/.test(b.textContent));
        if (kj) { const før = S.penger, t = kj.textContent; kj.click(); await vent(50); const brukt = før - S.penger, linje = loggLinjer.find(x => /Brakke bestilt/.test(x)) || '';
          ut.pris = { knapp: t, logg: linje.slice(0, 110), brukt }; const kr = Leir.kroner(brukt);
          krev(/i alt \(arbeid .* \+ materialer .*\)/.test(linje) && linje.includes(kr) && t.includes(kr), `prisen i loggen (${linje}) / på knappen (${t}) er ikke ${kr}`); }
        else krev(!fri, 'ingen «Kjøp materialene og bygg»-knapp når materialene mangler');
        // 5. fargeprøvene på telefon og ingen autofokus med finger
        OS.nytt(); const berøring = matchMedia('(pointer: coarse)').matches || matchMedia('(hover: none)').matches; await vent(120);
        ut.fokus = document.activeElement && document.activeElement.tagName; if (berøring) krev(ut.fokus !== 'INPUT', 'navnefeltet fikk fokus på berøringsskjerm');
        const fp = document.querySelector('#oppstart button.farge'); ut.farge = fp ? fp.offsetWidth : null;
        if (profil !== 'PC' || innerWidth <= 700) krev(fp && fp.offsetWidth >= 44 && fp.offsetHeight >= 44, `fargeprøvene er ${ut.farge} px`);
      } catch (e) { ut.feil.push('unntak: ' + e.message); }
      finally {
        try { if (LeirSpill.plassering()) LeirSpill.avbryt(); } catch (e) { /* ingen plassering */ }
        try { if (window.Byggesett && Byggesett.tilstand().åpen) Byggesett.lukk(); } catch (e) { /* uten byggesett */ }
        OS.lukk(); OS.test = test0; HellingVis.test = htest0;
        // leiren og kassa som før (bygget fra prøven og materialene tas bort)
        const L1 = JSON.parse(L0); for (const k of Object.keys(L)) if (!(k in L1)) delete L[k]; Object.assign(L, L1); S.penger = penger0; OS.lagre(); if (LeirSpill.lagre) LeirSpill.lagre();
        if (LeirSpill.oppdater3d) try { LeirSpill.oppdater3d(true); } catch (e) { /* 3D av */ }
        Object.assign(kam, kam0); valgt = valgt0; skitten = true; if (window.visPanel) visPanel();
        try { if (utk0 === null) localStorage.removeItem(OS.UTKAST); else localStorage.setItem(OS.UTKAST, utk0); } catch (e) { /* ingen lagring */ }
      }
      ut.lukket = !el('oppstart').classList.contains('på') && !el('leirvalg').classList.contains('på') && !LeirSpill.plassering();
      krev(ut.lukket, 'startskjermen, leirvalget eller plasseringen sto igjen åpen');
      return ut;
    }), profil);
    if (d.mangler) return { ok: true, tekst: 'terreng: modulene mangler (hoppet over)', data: d };
    const ok = !d.feil.length;
    return { ok, tekst: `terreng: bratt «${(d.bratt || '').slice(0, 70)}», Flytt hit «${(d.flyttet || '').slice(0, 50)}», vann «${(d.vann || '').slice(0, 50)}», hellingskart leir ${d.kartLeir ? d.kartLeir.bratt + ' bratte' : '–'} / bygg ${d.kartBygg ? d.kartBygg.flatt + ' flate' : '–'}, kanBygge enig på ${d.sjekket}, bratt skisse: knapper flytt/drei ${JSON.stringify(d.brattKnapper)} → «${d.etterFlytt || 'ok'}», hus i lia «${(d.husBratt || '').slice(0, 40)}», pris ${d.pris ? d.pris.brukt : '–'}, fargeprøve ${d.farge} px` + (ok ? '' : ' – FEIL: ' + d.feil.join('; ')), data: d };
  },
};
