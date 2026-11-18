// VAKT sjøen (spill/sjo.js + sjo-visning.js, nattarbeid 18. nov): med to prøvekaier og et prøvekart av sjøen – kjøp av båt trekker
// penger, ruta går rundt en øy og aldri over land, båten kommer fram, et lag kan gå om bord, fiske gir rasjoner, miner sperrer,
// panelet tegnes. Alt settes tilbake (penger, kaier, båter, lag, panel).
module.exports = { navn: 'sjøen', kjør: async (pg, profil) => {
  const data = await pg.evaluate(async () => { const o = { feil: [] }; if (!window.SjoSpill || !window.Sjo || !window.KaierSpill) { o.feil.push('modulene mangler'); return o; }
    const ok = (b, t) => { if (!b) o.feil.push(t); }, O = OppstartSpill.tilstand(), L = O.leir, K0 = KaierSpill.data(), p0 = O.penger, lagret = localStorage.getItem('riksbrudd-sjo'), åpen = SjoSpill.erÅpen(), valgt0 = valgt;
    const test0 = SjoSpill.test; SjoSpill.test = true; if (!SjoSpill.klar()) SjoSpill.start(); SjoSpill.lagre();
    const lagretNå = localStorage.getItem('riksbrudd-sjo');
    try {
      // to kaier: en stor 500 m øst for leiren og en liten 4,5 km øst
      KaierSpill.settData({ n: 2, navn: ['Prøvehavn', 'Prøvebrygge'], d: [Math.round(L.x) + 500, Math.round(L.y), 3, 200, 1, 4000, 0, 1, 20, 2] });
      // sjøkart: bare vann, med en øy midt i leia
      const r = 32, w = 220, h = 125, v = { x0: L.x - 1000, y0: L.y + 2000, r, w, h, K: new Uint8Array(w * h).fill(3) };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const x = v.x0 + (i + .5) * r, y = v.y0 - (j + .5) * r; if (x > L.x + 2000 && x < L.x + 2600 && Math.abs(y - L.y) < 600) v.K[j * w + i] = 1; }
      const S = SjoSpill.tilstand(), n0 = S.båter.length;
      ok(SjoSpill.kjøpGrunn(0) && !SjoSpill.kjøpGrunn(1), 'kjøp bare ved kaia nær leiren'); SjoSpill.kai(0); o.kjøpKnapper = document.querySelectorAll('#sjopanel [data-kjop]:not([disabled])').length; ok(o.kjøpKnapper === 3, 'tre båttyper kan kjøpes ved en stor kai (' + o.kjøpKnapper + ')');
      const kj = SjoSpill.kjøp('sjark', 0), bt = kj.båt; ok(bt && S.båter.length === n0 + 1 && OppstartSpill.tilstand().penger === p0 - Sjo.TYPER.sjark.pris, 'sjarken er kjøpt og betalt'); if (!bt) throw new Error('ingen båt');
      ok(SjoSpill.kjøp('lekter', 1).feil, 'lekter kan ikke kjøpes ved en liten kai langt unna');
      const sv = await SjoSpill.seilTilKai(bt, 1, { vindu: v }); o.meter = sv.meter ? Math.round(sv.meter) : sv.feil; ok(sv.meter > 4000 && sv.meter < 5200, 'ruta går rundt øya: ' + o.meter);
      let påLand = 0; if (bt.sti) for (let q = 1; q < bt.sti.length; q++) { const a = bt.sti[q - 1], c = bt.sti[q], nn = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 16); for (let t = 0; t <= nn; t++) { const x = a[0] + (c[0] - a[0]) * t / nn, y = a[1] + (c[1] - a[1]) * t / nn; if (v.K[Math.floor((v.y0 - y) / r) * w + Math.floor((x - v.x0) / r)] !== 3) påLand++; } } ok(påLand === 0, 'ruta holder seg i vann (' + påLand + ')');
      // tegnes i kartet og i panelet uten feil
      SjoSpill.velg(bt); SjoSpill.vis(true); skitten = true; await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); o.panel = /underveis/.test(document.getElementById('sjopanel').textContent); ok(o.panel, 'panelet viser at båten er underveis');
      let fr = null, n = 0; while (!fr && n++ < 2000) fr = Sjo.steg(bt, 1); ok(fr === 'framme' && bt.kai === 1, 'båten kommer fram til kaia'); o.minutter = n;
      // lag om bord
      const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.ombord && levende(e)); if (s) { const før = [s.x, s.y, s.sti]; s.x = bt.x + 30; s.y = bt.y + 20; ok(SjoSpill.gåOmBord(s, bt) && s.påBåt === bt && SjoSpill.omBord(bt).length === 1, 'laget går om bord');
        ok(!KROKER.kanOrdre.every(f => f(s)), 'laget tar ikke ordre om bord'); ok(Sjo.ild({ påBåt: bt }, {}, tid) < 1, 'om bord: dårligere treff'); s.påBåt = null; s.x = før[0]; s.y = før[1]; s.sti = før[2]; s.siktSkitten = true; }
      // kjøretøy om bord i en lekter, og folk som fisker fra kaia
      const lk = Sjo.nyBåt(S, 'lekter', L.x + 500, L.y, 0), bil = (window.KJORETOY || []).find(k => k.side === 'blå' && !k.oppdrag && !k.sti); if (bil) { const før = [bil.x, bil.y]; bil.x = lk.x + 20; bil.y = lk.y + 10; ok(!SjoSpill.kjørOmBord(bil, bt) && SjoSpill.kjørOmBord(bil, lk) && SjoSpill.kjOmBord(lk).length === 1, 'kjøretøy om bord i lekteren, ikke i sjarken'); bil.påBåt = null; bil.x = før[0]; bil.y = før[1]; }
      ok(SjoSpill.leirHarKai(), 'leiren har kai'); const f0 = S.fiskere; SjoSpill.settFiskere(2); o.fiskere = SjoSpill.fiskere(); ok(o.fiskere >= 0 && o.fiskere <= 2 && Sjo.kaiFangst(2, 60, {}) > 0, 'folk kan settes til fiske fra kaia'); SjoSpill.settFiskere(f0);
      // fiske og miner
      bt.fisker = true; ok(Sjo.fangst(bt, 60, { vind: 2, årstid: 'vår' }) > 1, 'sjarken fisker'); bt.fisker = false;
      const p1 = OppstartSpill.tilstand().penger; bt.x = L.x + 1500; bt.y = L.y; bt.kai = -1; SjoSpill.miner(bt); ok(S.sperringer.length >= 1 && OppstartSpill.tilstand().penger === p1 - Sjo.REGLER.minePris, 'miner lagt og betalt');
      const bt2 = Sjo.nyBåt(S, 'småbåt', L.x + 500, L.y, 0); const sv2 = await SjoSpill.seilTilKai(bt2, 1, { vindu: v }); ok(sv2.meter && bt2.sti.every(p => Math.hypot(p[0] - (L.x + 1500), p[1] - L.y) > Sjo.REGLER.mineRadius - 40), 'neste båt går utenom minefeltet');
      // (runde 4) fiendens båter: bording, senking med ild, et AI-lag som tar båt, trykk i 3D, leirvalget, krigskartet, lojaliteten
      { const FB = SjoSpill.fiendeBåter(), nF = FB.length, s4 = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.ombord && levende(e)), før = s4 && [s4.x, s4.y, s4.sti];
        bt.x = L.x + 500; bt.y = L.y; bt.sti = null; bt.kai = 0; bt.last = Sjo.tomLast();
        if (s4) { s4.x = bt.x + 20; s4.y = bt.y; s4.sti = null; SjoSpill.gåOmBord(s4, bt); }
        const f = { id: 'vakt1', type: 'frakt', hp: Sjo.REGLER.fiendeBåt.hp, navn: 'Forsyningsbåt', side: 'rød', by: 'vakt', byNavn: 'Prøveby', x: bt.x + 40, y: bt.y, kai: -1, sti: null, seg: 0, mål: -1, retning: 0, last: Sjo.tomLast() }; FB.push(f);
        ok(Sjo.kanBorde(bt, SjoSpill.omBord(bt).length, f), 'båten med laget kan borde forsyningsbåten'); const fikk = SjoSpill.bord(bt, f); o.bordet = fikk ? Sjo.lastTekst(fikk) : null;
        ok(fikk && Sjo.lastVekt(bt.last) > 1 && !FB.includes(f), 'bordet: lasten er om bord og forsyningsbåten borte (' + o.bordet + ')');
        if (s4) { s4.påBåt = null; s4.x = L.x + 500; s4.y = L.y - 60; s4.sti = null; }
        const f2 = { ...f, id: 'vakt2', x: L.x + 560, y: L.y - 60, hp: Sjo.REGLER.fiendeBåt.hp }; FB.push(f2); const sk = SjoSpill.skyttereMot(f2); o.skyttere = sk.length;
        ok(!s4 || sk.length >= 1, 'et lag 60 m unna skyter på båten'); let n4 = 0; while (sk.length && Sjo.skadBåt(f2, sk.map(q => ({ ...q, faktor: Math.max(.3, q.faktor) })), 1) !== 'senket' && n4 < 500) n4++; if (sk.length) SjoSpill.senket(f2, sk[0].lag); ok(!sk.length || !FB.includes(f2), 'forsyningsbåten senket med ild etter ' + n4 + ' min');
        // (del 2) fiendens båt skyter tilbake: på et lag på land, og på din båt til den synker (laget svømmer i land med tap)
        if (s4) { const hp0 = s4.menn.map(m => m.hp), f3 = { ...f, id: 'vakt3', x: s4.x, y: s4.y - 100, hp: 60 }; FB.push(f3);
          let tr = 0; for (let n = 0; n < 300 && !tr; n++) if (SjoSpill.skytTilbake(f3, 5) === 'truffet') tr++; ok(tr > 0 && s4.menn.some((m, i) => m.hp < hp0[i]), 'forsyningsbåten skyter på laget på land');
          s4.menn.forEach((m, i) => { m.hp = hp0[i]; }); FB.splice(FB.indexOf(f3), 1);
          const b5 = Sjo.nyBåt(S, 'småbåt', L.x + 520, L.y + 300, -1); s4.x = b5.x + 10; s4.y = b5.y; s4.sti = null; SjoSpill.gåOmBord(s4, b5); const lev0 = s4.menn.filter(m => m.hp > 0).length;
          const f4 = { ...f, id: 'vakt4', x: b5.x + 200, y: b5.y, hp: 60 }; FB.push(f4); let n5 = 0; while (S.båter.includes(b5) && n5++ < 600) SjoSpill.skytTilbake(f4, 1);
          o.senketEtter = n5; ok(!S.båter.includes(b5) && !s4.påBåt, `din småbåt senket etter ${n5} min`); o.svømte = s4.menn.filter(m => m.hp > 0).length + ' av ' + lev0;
          ok(s4.menn.filter(m => m.hp > 0).length === lev0 - Sjo.drukner(lev0), 'laget svømte i land med tap (' + o.svømte + ')'); FB.splice(FB.indexOf(f4), 1);
          await new Promise(r => setTimeout(r, 2500)); s4.menn.forEach((m, i) => { m.hp = hp0[i]; }); }
        // AI-lag som tar båt fra prøvehavna til prøvebrygga
        const ai = nyttLag('Vaktbåtfolk', L.x + 500, L.y + 40, 'rød'); ai.ai = { neste: 0, mål: [L.x + 4000, L.y] }; ENHETER.push(ai);
        const pl = await SjoSpill.planAI(ai, 0, 1, 1e6, [L.x + 4000, L.y], { vindu: v }); ok(pl && pl.plan && ai.båtPlan, 'AI-laget planlegger båt (' + (pl && (pl.feil || Math.round(pl.plan.meter) + ' m')) + ')');
        if (ai.båtPlan) { const ab = SjoSpill.gåOmAI(ai, ai.båtPlan); ok(ab && ai.påBåt === ab && FB.includes(ab), 'AI-laget er om bord'); let fr4 = null, m4 = 0; while (!fr4 && m4++ < 3000) fr4 = Sjo.steg(ab, 1); if (FB.includes(ab)) { FB.splice(FB.indexOf(ab), 1); SjoSpill.iLandAI(ab); } ok(fr4 === 'framme' && !ai.påBåt && ai.ai.neste === 0, 'AI-båten kom fram og laget gikk i land'); }
        ENHETER.splice(ENHETER.indexOf(ai), 1); FB.length = nF; if (s4) { s4.x = før[0]; s4.y = før[1]; s4.sti = før[2]; s4.siktSkitten = true; }
        // trykk i 3D (kroken med kartets meter): båten åpner panelet
        const v0 = valgt; valgt = null; SjoSpill.vis(false); ok(SjoSpill.trykk3d(bt.x + 3, bt.y) && SjoSpill.erÅpen() && SjoSpill.valgt() && SjoSpill.valgt().båt === bt, 'trykk på båten i 3D åpner den'); SjoSpill.vis(false); valgt = v0;
        ok(Array.isArray(SjoSpill.tatteFerjer()), 'listen over tatte ferjer');
        o.leirvalg = Kaier.leirTekst(KaierSpill.data(), L.x, L.y); ok(/Prøvehavn, stor \(500 m\) – leirens egen kai/.test(o.leirvalg), 'leirvalget viser nærmeste kai: ' + o.leirvalg);
        // krigskartets tillegg og lojaliteten (Regionen)
        // et eget prøvetettsted 3 km sør for leiren (som vakten «økonomi»); uten infrastruktur lages en tom mens vakten går
        const utenInfra = typeof INFRA === 'undefined' || !INFRA; if (utenInfra) { const tom = {}; for (const k of INFRA_REKKE) tom[k] = []; INFRA = tom; } if (!INFRA.tettsted) INFRA.tettsted = [];
        const rr = 300, cx = L.x, cy = L.y - 3000, by = { lag: 'tettsted', e: { id: 'sjø1', navn: 'Prøvevik', folk: 1500 }, bb: [cx - rr, cy - rr, cx + rr, cy + rr], deler: [[cx - rr, cy - rr, cx + rr, cy - rr, cx + rr, cy + rr, cx - rr, cy + rr]] }; INFRA.tettsted.push(by);
        if (window.RegionSpill && RegionSpill.klar() && window.KRIG_TILLEGG) { const t0 = TETTSTEDER.get(by.e.id), RS = RegionSpill.tilstand(), b0 = RS.byer[by.e.id] ? { ...RS.byer[by.e.id] } : null, rlag = localStorage.getItem('riksbrudd-region');
          try { TETTSTEDER.set(by.e.id, { eier: null, inntar: null }); const e1 = KRIG_TILLEGG.by.map(fn => fn(by, null)).filter(Boolean).map(e => e.textContent || e).join(' '); o.krig = e1.slice(0, 160); ok(/Hvis du tar det, per døgn: .*olje til basen.*Strøm/.test(e1), 'krigskartet: hva tettstedet gir hvis du tar det');
            TETTSTEDER.set(by.e.id, { eier: 'blå', inntar: null }); RegionSpill.status(); const e2 = KRIG_TILLEGG.by.map(fn => fn(by, 'blå')).filter(Boolean).map(e => e.textContent || e).join(' '); ok(/Gir deg nå per døgn/.test(e2), 'krigskartet: hva ditt tettsted gir nå');
            RS.byer[by.e.id].loj = 90; Region.mistet(RS, by.e.id); TETTSTEDER.set(by.e.id, { eier: 'blå', inntar: null }); RegionSpill.status(); o.loj = RS.byer[by.e.id].loj; ok(o.loj === Region.REGLER.lojGjentatt, 'tatt igjen: lojaliteten faller til ' + o.loj);
          } finally { if (t0) TETTSTEDER.set(by.e.id, t0); else TETTSTEDER.delete(by.e.id); if (b0) RS.byer[by.e.id] = b0; else delete RS.byer[by.e.id]; if (rlag === null) localStorage.removeItem('riksbrudd-region'); else localStorage.setItem('riksbrudd-region', rlag); RegionSpill.status(); } } else o.feil.push('Regionen eller krigskartets krok mangler');
        { const i = INFRA.tettsted.indexOf(by); if (i >= 0) INFRA.tettsted.splice(i, 1); } if (utenInfra) INFRA = null; }
      // havn: varene samler seg og kan lastes
      Sjo.havnSteg(S, [{ id: 'prøve', folk: 3000 }], 7 * 1440); ok(S.havner.prøve && Math.abs(S.havner.prøve.tre - 30) < 1e-6, 'en uke i havna gir 30 tre'); delete S.havner.prøve;
    } catch (e) { o.feil.push('unntak: ' + e.message); }
    // alt tilbake
    for (const s of ENHETER) if (s.påBåt) s.påBåt = null; const p2 = OppstartSpill.tilstand().penger; if (p2 < p0) OppstartSpill.gi(p0 - p2);
    if (lagretNå === null) localStorage.removeItem('riksbrudd-sjo'); else localStorage.setItem('riksbrudd-sjo', lagretNå); SjoSpill.start(); if (lagret === null) localStorage.removeItem('riksbrudd-sjo'); else localStorage.setItem('riksbrudd-sjo', lagret);
    KaierSpill.settData(K0); SjoSpill.test = test0; SjoSpill.vis(åpen); valgt = valgt0; skitten = true; o.penger = OppstartSpill.tilstand().penger === p0; if (!o.penger) o.feil.push('pengene ble ikke satt tilbake'); return o; });
  const ok = data.feil.length === 0;
  return { ok, tekst: ok ? `kjøp, rute rundt øya (${data.meter} m, ${data.minutter} min), om bord, fiske, miner, havn, bording (${data.bordet}), senking, ild tilbake (din småbåt senket etter ${data.senketEtter} min, ${data.svømte} i land), AI-båt, trykk i 3D, leirvalg og krigskart` : data.feil.join('; '), data };
} };
