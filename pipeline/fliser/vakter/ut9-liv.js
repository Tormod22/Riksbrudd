// Vakt «liv i leiren» (ut9-liv, spill/leirliv.js + leirliv3d.js + stillingene i folk3d.js): en ferdig brakke får vasketøy, en byggeplass
// kasser og verktøy – aldri inni et bygg –, en gjeng på ti har en hund som rusler (og ligger ved bålet om natta), og reglene for røyk og lys
// svarer. I 3D også: småtingene og hunden står på bakken og ikke i bygg, brakka får lys i vinduene om natta, kjøkkenet en pipe som ryker
// ved middag, plassen i køya ligger inne i brakka og plassen på benken ved kjøkkenet like utenfor (under markisen). Setter alt tilbake (bygg, tid, mørket, hundene).
module.exports = {
  navn: 'liv i leiren (vasketøy, kasser, hund, røyk, lys i vinduene, køya og bordet)',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (b, t) => { if (!b) ut.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
    if (!window.Leirliv || !window.Leirliv3d || !window.LeirSpill || !window.OppstartSpill || !OppstartSpill.tilstand()) return { ok: false, tekst: 'Leirliv/Leirliv3d mangler eller spillet er ikke startet', data: ut };
    const LL = Leirliv, LV = Leirliv3d, L = LeirSpill.tilstand(), m = OppstartSpill.tilstand().leir, bygg0 = JSON.stringify(L.bygg), neste0 = L.neste, tid0 = tid;
    const i3d = typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && R3.ut, mørke0 = window.NATT ? NATT.mørke : 0;
    try {
      // 1. REGLENE
      krev(LL.stilling({ inne: 'brakke', sover: true }, 'bygg', 'brakke') === 'ligger' && LL.stilling({ inne: 'kjøkken', hva: 'mat' }, 'bygg', 'kjøkken') === 'sitter', 'stillingene i køya/ved bordet');
      krev(LL.røyk('kjøkken', 12) === 1 && LL.røyk('kjøkken', 3) === 0 && LL.lys('brakke', 21, .8) && !LL.lys('brakke', 13, .02), 'røyk og lys etter klokka');
      // 1b. KARAKTERVERNET: et prøvelag som alt er fjernet, «fjernes» igjen med indexOf = −1 – det tar ut det siste laget (ofte karakteren);
      // spill/karaktervern.js setter karakteren inn igjen innen et sekund
      { const kar = ENHETER.find(e => e.karakter); if (kar && window.KaraktervernSpill) { const i0 = ENHETER.indexOf(kar); ENHETER.push(ENHETER.splice(i0, 1)[0]);
          const p = nyttLag('Prøvelag', m.x + 500, m.y, 'rød'); ENHETER.push(p); ENHETER.splice(ENHETER.indexOf(p), 1); ENHETER.splice(ENHETER.indexOf(p), 1);
          const borte = !ENHETER.includes(kar); for (let k = 0; k < 30 && !ENHETER.includes(kar); k++) await vent(100);
          ut.vern = { borte, tilbake: ENHETER.includes(kar) }; if (!ENHETER.includes(kar)) ENHETER.splice(Math.min(i0, ENHETER.length), 0, kar);
          else if (ENHETER.indexOf(kar) !== i0) { ENHETER.splice(ENHETER.indexOf(kar), 1); ENHETER.splice(Math.min(i0, ENHETER.length), 0, kar); }
          krev(ut.vern.borte && ut.vern.tilbake, 'karakteren kom ikke tilbake etter en feil fjerning ' + JSON.stringify(ut.vern)); } }
      // 2. PRØVELEIREN: en ferdig brakke og et kjøkken litt unna midten, og en byggeplass (lagertelt under arbeid)
      let id = 930000; const legg = (type, x, y, ferdig = true) => { const b = { id: id++, type, x: m.x + x, y: m.y + y, ret: .3, nivå: 1, hp: 1, igjen: ferdig ? 0 : 600, totalt: 600, nr: id, arbeid: null }; L.bygg.push(b); return b; };
      const brakke = legg('brakke', 40, 40), kjøk = Leir.BYGG.kjøkken ? legg('kjøkken', 60, 20) : null, plass = legg('lagertelt', 30, 70, false);
      LV.oppdater(); const T = LV.ting(), polys = [brakke, kjøk, plass].filter(Boolean).map(b => Leir.hjørner(b));
      ut.ting = { snor: T.filter(t => t.k === 'snor' && t.bygg === brakke.id).length, ved: T.filter(t => t.bygg === plass.id).length, iBygg: T.filter(t => polys.some(P => LL.avstPoly(P, t.x, t.y) < t.r - .01)).length };
      krev(ut.ting.snor === 1, 'ingen vasketøysnor ved den nye brakka ' + JSON.stringify(ut.ting));
      krev(ut.ting.ved >= 2, 'for få kasser/verktøy ved byggeplassen ' + JSON.stringify(ut.ting));
      krev(ut.ting.iBygg === 0, 'småting inni et bygg ' + JSON.stringify(ut.ting));
      // 3. HUNDEN: gjengen har minst seks personer – en hund rusler om dagen og ligger ved bålet om natta
      const F = window.FolkSpill && FolkSpill.tilstand(), nFolk = F ? F.personer.filter(p => !p.borte).length : 0;
      tid = ((12 - 6 + 24) % 24) * 60; LV.steg(.02); const H = LV.hunder(); ut.hund = { folk: nFolk, n: H.length };
      if (nFolk >= LL.REGLER.hund.én) { krev(H.length >= 1, 'ingen hund i leiren med ' + nFolk + ' personer');
        if (H.length) { const h = H[0], x0 = h.x, y0 = h.y; let gikk = 0; for (let k = 0; k < 60; k++) { const a = h.x, b = h.y; LV.steg(.02); gikk += Math.hypot(h.x - a, h.y - b); }
          ut.hund.gikk = +gikk.toFixed(1); ut.hund.fraLeir = +Math.hypot(h.x - m.x, h.y - m.y).toFixed(1); ut.hund.iBygg = polys.some(P => LL.avstPoly(P, h.x, h.y) < .3);
          krev(gikk > 2 || h.ligger, 'hunden står stille hele dagen ' + JSON.stringify(ut.hund)); krev(ut.hund.fraLeir <= LL.REGLER.hund.radius + 2, 'hunden har gått fra leiren ' + JSON.stringify(ut.hund));
          krev(!ut.hund.iBygg, 'hunden står i et bygg'); tid = ((1 - 6 + 24) % 24) * 60; for (let k = 0; k < 200 && !h.ligger; k++) LV.steg(.02); ut.hund.natt = h.ligger;
          krev(h.ligger === 1, 'hunden legger seg ikke om natta ' + JSON.stringify(ut.hund)); void x0; void y0; } }
      // 4. 3D: står på bakken og ikke i bygg, lys i vinduene om natta, pipa ryker ved middag, plassen i køya og ved bordet er inne i bygget
      if (i3d) { tid = ((22.75 - 6 + 24) % 24) * 60; const holdMørkt = setInterval(() => { if (window.NATT) NATT.mørke = .9; }, 50); if (window.NATT) NATT.mørke = .9; LV.oppdater(); await vent(1600); clearInterval(holdMørkt);
        const s = LV.sjekk(); ut.d3 = s;
        krev(s && s.ting.snor >= 1 && s.ting.kasse + s.ting.verktøy + s.ting.bukk >= 2, '3D: småtingene mangler ' + JSON.stringify(s));
        krev(s && s.iBygg === 0 && s.svever === 0, '3D: noe står i et bygg eller svever ' + JSON.stringify(s));
        krev(s && s.vinduer > 0, '3D: ingen lys i vinduene om natta ' + JSON.stringify(s));
        krev(!kjøk || LV.kilder().some(k => k.id === kjøk.id), '3D: kjøkkenet har ingen pipe');
        const seng = window.Folk3d && Folk3d.plassVed ? Folk3d.plassVed(brakke, 0, 'seng') : null, bord = kjøk && window.Folk3d ? Folk3d.plassVed(kjøk, 1, 'bord') : null;
        ut.d3.seng = seng ? { ligger: !!seng.ligger, inne: LL.inni(Leir.hjørner(brakke), seng.x, seng.y) } : null; ut.d3.bord = bord ? { sitter: !!bord.sitter, nær: Math.hypot(bord.x - kjøk.x, bord.y - kjøk.y) < 8, iVeggen: LL.inni(Leir.hjørner(kjøk), bord.x, bord.y) } : null;
        // interiøret lages bare for bygg nær kameraet (Interior3d) – mangler planen, kan plassene ikke prøves her
        if (seng) krev(seng.ligger && ut.d3.seng.inne, '3D: plassen i køya er ikke inne i brakka ' + JSON.stringify(ut.d3.seng));
        if (bord) krev(bord.sitter && ut.d3.bord.nær && !ut.d3.bord.iVeggen, '3D: plassen på benken ved kjøkkenet er feil (langt unna eller inni bygget) ' + JSON.stringify(ut.d3.bord)); }
    } catch (e) { ut.feil.push('unntak: ' + e.message); }
    finally {
      L.bygg.splice(0, L.bygg.length, ...JSON.parse(bygg0)); L.neste = neste0; tid = tid0; if (window.NATT) NATT.mørke = mørke0; LV.oppdater(); if (typeof skitten !== 'undefined') skitten = true;
    }
    const d3 = ut.d3 ? `; 3D: ${ut.d3.ting.snor} snor, ${ut.d3.ting.kasse + ut.d3.ting.verktøy + ut.d3.ting.bukk} kasser/verktøy, ${ut.d3.vinduer} vinduer med lys, ${ut.d3.røykKilder} piper, køya ${ut.d3.seng ? 'inne' : '–'}, benken ${ut.d3.bord ? 'ved kjøkkenet' : '–'}` : ' (3D av)';
    return { ok: !ut.feil.length, tekst: ut.feil.length ? ut.feil.join('; ') : `karakteren kom tilbake etter feil fjerning: ${ut.vern ? ut.vern.tilbake : '–'}; vasketøy ved brakka, ${ut.ting.ved} ting ved byggeplassen, 0 i bygg; hund ${ut.hund.n} (gikk ${ut.hund.gikk || 0} m, ligger om natta ${!!ut.hund.natt})` + d3, data: ut };
  }),
};
