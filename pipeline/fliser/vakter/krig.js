// VAKT «krig» (nattarbeidet 18. nov): flanke, sårede, overgivelse og fanger, etterretning, natt, røyk, våpenhvile, lagring av fienden.
// Alt settes tilbake: lagene, pengene, tiden og KrigSpill.test.
module.exports = { navn: 'krig', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = {}; if (!window.KrigSpill || !window.Krig) return { uten: true };
    const KS = KrigSpill, K = Krig, R = K.REGLER, S = OppstartSpill.tilstand(), L = S.leir, penger0 = S.penger, tid0 = tid, test0 = KS.test, T0 = JSON.stringify(KS.T()), ant0 = ENHETER.length, valgt0 = valgt;
    const ild = (a, b) => KROKER.ild.reduce((v, h) => v * h(a, b), 1);
    const a = nyttLag('Vakt blå', L.x + 5000, L.y + 5000, 'blå'), b = nyttLag('Vakt rød', L.x + 5300, L.y + 5000, 'rød'); ENHETER.push(a, b);
    // (18. nov) føreren har en væremåte etter navnet (tilfeldig); en «forsiktig» fører tar ×0,88 og ga «av i testene ×1,14» – vakta trenger en nøytral
    if (K.væremåte) { const m0 = b.menn[b.leder || 0] || b.menn[0]; for (let n = 0; n < 50 && m0; n++) { const v = K.væremåte(m0.navn); if (v.ild === 1 && v.tar === 1) break; m0.navn = 'Ola Vakt ' + n; } }
    try {
      // i testene er de nye stridsfaktorene av
      KS.test = false; b.retning = 0; const av = ild(a, b); KS.test = true;
      // flanke: b vender mot øst, a står i vest = i ryggen på b
      b.retning = 0; const rygg = ild(a, b); b.retning = Math.PI; const front = ild(a, b); ut.flanke = rygg / front; ut.av = av / front;
      // laget snur seg mot den som skyter
      b.retning = 0; b.krigFra = { v: Math.PI, t: tid, hva: 'rygg' }; b.sti = null; for (let i = 0; i < 100; i++) KROKER.sim.forEach(f => { if (/K\.snu/.test(String(f))) f(.2); }); ut.snudd = Math.abs(Math.abs(b.retning) - Math.PI) < .01;
      // sårede bæres: farten synker
      const fart = s => KROKER.fart.reduce((v, f) => v * f(s), 1), f0 = fart(a); a.menn[5].hp = .5; a.menn[6].hp = .5; ut.fart = fart(a) / f0; a.menn[5].hp = 1; a.menn[6].hp = 1;
      // natt: sikten synker uten nattsikt
      const sikt = s => KROKER.sikt.reduce((v, f) => v * f(s), 1); tid = 18 * 60; const natt = sikt(a); a.utstyr = { nattsikt: true }; ut.natt = natt; ut.nattsikt = sikt(a) / natt; delete a.utstyr; tid = tid0;
      // røyk: laget i røyken er vanskeligere å treffe
      b.retning = Math.PI; const før = ild(b, a); KS.røyk(a); ut.røyk = ild(b, a) / før; KS.røykSkyer.length = 0;
      // overgivelse: et knust lag gir seg, fangene følger laget og leveres i leiren, og avhør gir etterretning
      const c = nyttLag('Vakt rød 2', L.x + 5200, L.y + 5100, 'rød'); ENHETER.push(c);
      for (let i = 0; i < 7; i++) b.menn[i].hp = 0; KS.steg.overgivelser(); ut.gaSeg = !ENHETER.includes(b) && !!a.fanger && a.fanger.n === 5 && ENHETER.includes(c);
      a.x = L.x + 20; a.y = L.y + 20; KS.test = false; for (let i = 0; i < 12; i++) KROKER.sim.forEach(f => f(.1)); KS.test = true; ut.levert = !a.fanger && KS.T().fanger.length === 1;
      ut.avhør = KS.avhør(0); tid += R.etterretning.avhør + 1; for (let i = 0; i < 12; i++) KROKER.sim.forEach(f => f(.1)); tid = tid0; ut.etter = KS.T().etter.some(q => q.navn === 'Vakt rød 2' && q.kilde === 'avhør'); ut.avhørt = !!KS.T().fanger[0].avhørt;
      // Leir-menyen viser fangene og etterretningen
      const hode = document.createElement('div'), el = (t, at = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(at)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
      for (const f of LEIR_MENY) if (/Etterretning og avtaler/.test(String(f))) f(hode, { el, knapp: (t, fn, eg = {}) => { const q = el('button', eg, t); q.onclick = fn; return q; } });
      ut.meny = /fanger fra/.test(hode.textContent) && /Vakt rød 2/.test(hode.textContent) && !!hode.querySelector('[data-krig="fri"]');
      // våpenhvile: betales, stopper ilden begge veger, og kan brytes
      if (window.AI && AI.fred) { OppstartSpill.gi(2e7); const p = KS.fredPris('rød'), s1 = OppstartSpill.tilstand().penger; ut.fred = KS.fred('rød') && OppstartSpill.tilstand().penger === s1 - p; ut.fredIld = ild(a, c) === 0 && ild(c, a) === 0; ut.brutt = KS.brytFred('rød') && ild(a, c) > 0 && KS.fredPris('rød') > p; }
      // lagpanelet: fiendens fører og væremåte, og knappen «Tiltak» for egne lag
      ut.fører = KROKER.lagTekst.map(h => h(c)).filter(Boolean).join(' · '); valgt = a; visPanel(); ut.knapp = !!document.getElementById('krigtiltak'); document.getElementById('krigtiltak') && document.getElementById('krigtiltak').click(); ut.panel = document.querySelectorAll('#krigpanel [data-tiltak]').length; KS.lukk();
      // runde 2: ekte hus inntil laget gir dekning, og et eget lag som er knust og omringet, gir seg bare når du har valgt det
      a.x = L.x + 5000; a.y = L.y + 5000; a.sti = null; c.retning = 0; const h0 = ild(c, a); a.vedHus = true; ut.hus = ild(c, a) / h0; a.vedHus = false;
      const d1 = nyttLag('Vakt rød 3', a.x + 300, a.y, 'rød'), d2 = nyttLag('Vakt rød 4', a.x - 300, a.y, 'rød'); ENHETER.push(d1, d2); for (let i = 0; i < 6; i++) a.menn[i].hp = 0;
      KS.steg.egneGirSeg(); ut.holdt = ENHETER.includes(a); a.strid = Strid.ren({ ...(a.strid || {}), overgi: 'ja' }); KS.steg.egneGirSeg(); ut.egetGaSeg = !ENHETER.includes(a); ut.krig3d = !!window.Krig3d; ut.stridsvalg = !!Strid.VALG.overgi && Strid.ren({}).overgi === 'nei';
      // en bølge er over når røverne har holdt seg unna leiren i en halv spilltime (de sto før og «angrep» for alltid)
      // (runde 6: røverne starter 3–4 km unna og er «på vei» til de har vært nær leiren – her har de vært der og trukket seg unna: nærVært)
      if (window.SpilletSpill && SpilletSpill.T()) { const Sp = SpilletSpill, Tr = Sp.T(), T1 = JSON.stringify(Tr), kr1 = OppstartSpill.tilstand().penger, F1 = window.FolkSpill && FolkSpill.tilstand(), mo = F1 ? F1.moral : 0;
        Tr.aktiv = 0; await Sp.angrep(); const rl = ENHETER.filter(q => q.raid === Tr.aktiv); for (let i = 0; i < 40 && rl.some(q => q.planlegger); i++) await new Promise(r => setTimeout(r, 250));
        for (const q of rl) { q.sti = null; q.x = L.x + 3900; q.y = L.y; q.nærVært = true; } Sp.angrepSteg(); ut.bølgeVenter = Tr.aktiv > 0 && rl.length > 0; tid += 31; Sp.angrepSteg(); ut.bølgeOver = Tr.aktiv === 0 && !ENHETER.some(q => q.raid) && OppstartSpill.tilstand().penger > kr1;
        for (const q of rl) if (ENHETER.includes(q)) ENHETER.splice(ENHETER.indexOf(q), 1); tid = tid0; for (const k of Object.keys(Tr)) delete Tr[k]; Object.assign(Tr, JSON.parse(T1)); if (Tr.nesteSpill === null) Tr.nesteSpill = Infinity; if (Tr.nesteEkte === null) Tr.nesteEkte = Infinity; if (F1) F1.moral = mo; try { localStorage.setItem('riksbrudd-trussel', T1); } catch (e) {} document.querySelectorAll('#varsel.på').forEach(v => v.classList.remove('på')); }

      // lagringen tar med fiendens lag, minnet og målet for en marsj
      const pk = Lagring.pakk({ tid, leir: L, lag: [], fiender: LagringSpill.fiendeLag(), minne: window.AI ? AI.minne : null, stillinger: window.STILLINGER || [] }); ut.lagret = pk.fiender.some(q => q.navn === 'Vakt rød 2' && q.side === 'rød') && (!window.AI || !!pk.minne.rød);
      // kartet tegnes med merkene uten feil
      skitten = true; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 400); }
    finally {
      for (const s of ENHETER.slice()) if (/^Vakt (blå|rød)/.test(s.navn)) ENHETER.splice(ENHETER.indexOf(s), 1);
      KS.nullstill(); Object.assign(KS.T(), JSON.parse(T0)); KS.test = test0; tid = tid0; valgt = valgt0; visPanel(); if (window.AI && AI.fred) for (const k of Object.keys(AI.fred)) delete AI.fred[k];
      const S2 = OppstartSpill.tilstand(); if (S2.penger > penger0) OppstartSpill.betal(S2.penger - penger0); else if (S2.penger < penger0) OppstartSpill.gi(penger0 - S2.penger);
      KS.lagre(); ut.ryddet = ENHETER.length === ant0; skitten = true;
    }
    return ut;
  });
  if (d.uten) return { ok: false, tekst: 'KrigSpill mangler', data: d };
  // RUNDE 4 (18. nov dag): dekning bak leirens egne bygg, fangene (bytte, arbeid, rekruttering) og lagringen av røyk og helikopter
  const d4 = await pg.evaluate(async () => {
    const ut = {}, KS = KrigSpill, S = OppstartSpill.tilstand(), L = S.leir, LS = LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), penger0 = S.penger, tid0 = tid, test0 = KS.test, T0 = JSON.stringify(KS.T());
    const ant0 = ENHETER.length, bygg0 = LS.bygg.length, F0 = F ? { ider: new Set(F.personer.map(p => p.id)), mat: F.mat, moral: F.moral, neste: F.neste, oppg: F.personer.map(p => [p.id, p.oppgave]) } : null;
    const ild = (a, b) => KROKER.ild.reduce((v, h) => v * h(a, b), 1);
    const a = nyttLag('Vakt4 blå', L.x + 600 + 4.2 + 3, L.y + 600, 'blå'), b = nyttLag('Vakt4 rød', L.x + 300, L.y + 600, 'rød'); ENHETER.push(a, b); a.retning = Math.PI; b.retning = 0;
    try {
      KS.test = false; const u0av = ild(b, a); KS.test = true; const u0 = ild(b, a);
      LS.bygg.push({ id: 987654, type: 'brakke', x: L.x + 600, y: L.y + 600, ret: 0, igjen: 0, totalt: 1, pris: 0, mat: {}, nivå: 1, hp: 1 });
      ut.dekning = ild(b, a) / u0; ut.dekningTekst = /i dekning bak brakke/.test(KROKER.lagTekst.map(h => h(a)).filter(Boolean).join(' · '));
      KS.test = false; ut.dekningAv = ild(b, a) / u0av; KS.test = true;
      // fanger: bytte mot penger og mot egne, arbeid, god behandling og rekruttering
      const T = KS.T(); T.fanger.push({ side: 'rød', n: 2, t: tid }); const kr1 = OppstartSpill.tilstand().penger; ut.bytt = KS.byttPenger(T.fanger.length - 1) && OppstartSpill.tilstand().penger - kr1 === Krig.byttePris(2);
      if (F) { T.fanger.push({ side: 'rød', n: 3, t: tid }); T.tatt.push({ side: 'rød', navn: 'Vakt Tatt', rolle: 'rifle', hp: 1, t: tid }); const n1 = F.personer.length;
        ut.byttEgne = KS.byttEgne(T.fanger.length - 1) && F.personer.length === n1 + 1 && F.personer.some(p => p.navn === 'Vakt Tatt') && T.fanger[T.fanger.length - 1].n === 2;
        const i = T.fanger.length - 1; if (!FolkRegler.arbeidere(F, 'bygg')) FolkRegler.pluss(F, 'bygg'); KS.arbeid(i, 'bygg'); KROKER.sim.forEach(f => f(1.01)); ut.arbeid = FolkRegler.oppgaveF('bygg') > 1.05 && FolkRegler.oppgaveF('hogst') === 1;
        KS.behandling(i, true); ut.ikkeEnnå = !KS.kanSpørres(i); T.fanger[i].godMin = 1e5; F.moral = 100;
        for (let k = 0; k < 3; k++) LS.bygg.push({ id: 987660 + k, type: 'brakke', x: L.x + 700 + 40 * k, y: L.y + 700, ret: 0, igjen: 0, totalt: 1, pris: 0, mat: {}, nivå: 3, hp: 1 });
        const r = KS.spør(i); ut.spør = !!r && r.spurt === 2 && F.personer.filter(p => p.fange && !F0.ider.has(p.id)).length === r.ja;
        // del 2: motstanderen foreslår et bytte (én mot én), og «Godta» henter din mann hjem
        T.fanger.push({ side: 'grønn', n: 2, t: tid }); T.tatt.push({ side: 'grønn', navn: 'Vakt Forslag', rolle: 'rifle', hp: 1, t: tid });
        ut.forslag = KS.foreslå('grønn') && T.forslag && T.forslag.n === 1 && KS.svarForslag(true) && !T.forslag && F.personer.some(p => p.navn === 'Vakt Forslag') && T.fanger.some(f => f.side === 'grønn' && f.n === 1); }
      // del 3: et lag som blir skutt på av et kjøretøy det ikke ser (stridsvogna skyter på alt du vet om), svarer – før skjøt det aldri tilbake
      const kv = KJORETOY.find(k => k.side === 'blå' && k.type === 'stridsvogn') || KJORETOY.find(k => k.side === 'blå');
      if (kv && window.S6 && S6.motKjøretøy) { const kv0 = { x: kv.x, y: kv.y, skade: kv.skade, antall: kv.antall, skyterPå: kv.skyterPå };
        try { const r2 = nyttLag('Vakt4 rød 2', L.x + 9000, L.y - 9000, 'rød'); ENHETER.push(r2); r2.sikt = null; kv.x = r2.x + 300; kv.y = r2.y;
          kv.skyterPå = null; let n0 = SKUDD.length; S6.motKjøretøy(); ut.ikkeUtenGrunn = !SKUDD.slice(n0).some(q => q.a === r2);
          kv.skyterPå = r2; n0 = SKUDD.length; S6.motKjøretøy(); ut.svarer = SKUDD.slice(n0).some(q => q.a === r2 && q.b === kv); }
        finally { Object.assign(kv, kv0); } }
      // lagringen: røyken og helikopteret står i «riksbrudd-krig»
      KS.røyk(a); KS.lagre(); const lagret = JSON.parse(localStorage.getItem('riksbrudd-krig') || '{}'); ut.lagring = Array.isArray(lagret.røyk) && lagret.røyk.length >= 1 && 'heli' in lagret && Array.isArray(lagret.kjør) && Array.isArray(lagret.tatt);
      ut.krig3d = !!(window.Krig3d && Krig3d.antall && 'stillinger' in Krig3d.antall());
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 400); }
    finally {
      for (const s of ENHETER.slice()) if (/^Vakt4 /.test(s.navn)) ENHETER.splice(ENHETER.indexOf(s), 1);
      for (let i = LS.bygg.length - 1; i >= 0; i--) if (LS.bygg[i].id >= 987654 && LS.bygg[i].id <= 987670) LS.bygg.splice(i, 1);
      if (F && F0) { F.personer = F.personer.filter(p => F0.ider.has(p.id)); for (const [id, o] of F0.oppg) { const p = F.personer.find(q => q.id === id); if (p) p.oppgave = o; } F.mat = F0.mat; F.moral = F0.moral; F.neste = F0.neste; }
      KS.nullstill(); Object.assign(KS.T(), JSON.parse(T0)); KS.test = test0; tid = tid0;
      const S2 = OppstartSpill.tilstand(); if (S2.penger > penger0) OppstartSpill.betal(S2.penger - penger0); else if (S2.penger < penger0) OppstartSpill.gi(penger0 - S2.penger);
      KS.lagre(); if (LeirSpill.lagre) LeirSpill.lagre(); ut.ryddet = ENHETER.length === ant0 && LS.bygg.length === bygg0; skitten = true;
    }
    return ut;
  });
  // RUNDE 5 (18.–19. nov kveld): stridsvogna skyter bare på det den selv eller et eget lag rett ved ser – ikke på det dronen melder
  const d5 = await pg.evaluate(async () => {
    const ut = {}, K = KJORETOY.find(k => k.side === 'blå' && k.type === 'stridsvogn');
    if (!K || !window.S6 || !S6.vognSikt || !window.Enheter || !Enheter.velgKanonmål) return { uten: true };
    const k0 = { x: K.x, y: K.y, sti: K.sti, skyterPå: K.skyterPå, meldtSett: K.meldtSett }, tempo0 = tempo, dr0 = DRONER.length, lag = [];
    try {
      // vogna settes ved leiren (tidligere prøver kan ha flyttet den ut av kartet)
      { const L0 = OppstartSpill.tilstand().leir; if (L0) { K.x = L0.x + 40; K.y = L0.y - 30; } }
      tempo = 0; K.sti = null; await S6.vognSikt(K); let p = null;
      for (let r = 300; r <= 1150 && !p; r += 50) for (let a = 0; a < 6.28 && !p; a += .2) { const x = K.x + Math.cos(a) * r, y = K.y + Math.sin(a) * r; if (!vognSer(K, x, y, null)) p = [x, y]; }
      ut.skjult = !!p;
      if (p) { const b = nyttLag('Vakt5 rød', p[0], p[1], 'rød'); b.her = { k: 2, h: 0 }; ENHETER.push(b); lag.push(b);
        // de andre fiendene langt unna mens vogna prøves (de flyttes tilbake i finally)
        for (const e of ENHETER) if (e !== b && e.side !== 'blå' && Math.hypot(e.x - K.x, e.y - K.y) < 2500) { lag.push({ flyttet: e, x: e.x, y: e.y }); e.x += 60000; }
        DRONER.push({ navn: 'Vakt5-drone', x: p[0], y: p[1], mål: p.slice(), igjen: 7200, retning: 0, fase: 'over målet' });
        ut.meldt = synlig(b); let n0 = SKUDD.length; for (let i = 0; i < 3; i++) S6.kanon(K); ut.skuddMeldt = SKUDD.slice(n0).filter(q => q.a === K && q.b === b).length;
        // et eget lag rett ved vogna som ser målet
        const a = nyttLag('Vakt5 blå', K.x + 60, K.y, 'blå'); ENHETER.push(a); lag.push(a); a.sikt = { x0: K.x - 5000, y0: K.y + 5000, mw: 1, mh: 1, r: 1e5, m: new Uint8Array([1]) };
        n0 = SKUDD.length; S6.kanon(K); ut.skuddNabo = SKUDD.slice(n0).filter(q => q.a === K && q.b === b).length; }
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
    finally {
      for (const q of lag) { if (q.flyttet) { q.flyttet.x = q.x; q.flyttet.y = q.y; } else if (ENHETER.includes(q)) ENHETER.splice(ENHETER.indexOf(q), 1); }
      for (let i = DRONER.length - 1; i >= dr0; i--) if (DRONER[i].navn === 'Vakt5-drone') DRONER.splice(i, 1);
      Object.assign(K, k0); tempo = tempo0; skitten = true; }
    // lagringen av fienden (riksbrudd-krig → fiende): «sist sett» og lastebilene pakkes og legges inn igjen, og en lagret marsj settes i gang igjen
    if (window.KrigSpill && KrigSpill.fiendePakk) { const E = ENHETER.find(e => e.side !== 'blå' && levende(e) && !e.ombord && !e.raid);
      if (E) { const e0 = { x: E.x, y: E.y, sett: E.sett, sti: E.sti, steg: E.steg, seg: E.seg, prog: E.prog, timerIgjen: E.timerIgjen, mål: E.ai ? E.ai.mål : undefined };
        try { E.sett = { x: E.x + 11, y: E.y - 7, tid: 3 }; const p = KrigSpill.fiendePakk(); ut.pakket = !!(p.sett[E.navn] && Array.isArray(p.biler));
          E.sett = null; await KrigSpill.fiendeBruk({ sett: p.sett, biler: [] }); ut.settTilbake = !!(E.sett && Math.abs(E.sett.x - (E.x + 11)) < 1);
          E.sti = null; E.målLagret = [E.x + 600, E.y + 200]; await new Promise(r => setTimeout(r, 1100)); sim(.0001);
          ut.marsjIgjen = !E.målLagret && !!(E.planlegger || E.sti); for (let i = 0; i < 40 && E.planlegger; i++) await new Promise(r => setTimeout(r, 100)); }
        catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
        finally { Object.assign(E, { x: e0.x, y: e0.y, sett: e0.sett, sti: e0.sti, steg: e0.steg, seg: e0.seg, prog: e0.prog, timerIgjen: e0.timerIgjen }); delete E.målLagret; if (E.ai) E.ai.mål = e0.mål; E.siktSkitten = true; } } }
    // krigskartet: «Skjul» gjør panelet til en stripe og «Vis mer» henter det fram igjen (telefon: kartet passes inn i den frie delen)
    if (window.StrategiSpill && StrategiSpill.skjul && StrategiSpill.bilde()) { const var0 = StrategiSpill.erÅpen(), kam0 = { x: kam.x, y: kam.y, m: kam.m }, d30 = typeof på3d !== 'undefined' && på3d; let lagret = null; try { lagret = localStorage.getItem('riksbrudd-krigpanel'); } catch (e) { lagret = null; }
      try { if (!var0) StrategiSpill.åpne(); const p = document.getElementById('krig'); StrategiSpill.skjul(true);
        const st = p.querySelector('.stripe'), side = p.querySelector('.side'); ut.stripe = p.classList.contains('inn') && !!st && getComputedStyle(st).display !== 'none' && (!side || getComputedStyle(side).display === 'none');
        ut.høyStripe = Math.round(p.getBoundingClientRect().height); StrategiSpill.skjul(false); ut.visIgjen = !p.classList.contains('inn') && !!p.querySelector('.side .stolpe') && getComputedStyle(p.querySelector('.side')).display !== 'none'; }
      catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
      finally { if (!var0) StrategiSpill.lukk(); Object.assign(kam, kam0); if (d30 && !på3d && typeof slå3d === 'function') { await slå3d(true); for (let i = 0; i < 1800 && (!R3 || !R3.ut || R3.bygger); i++) await new Promise(r => setTimeout(r, 100)); } try { if (lagret === null) localStorage.removeItem('riksbrudd-krigpanel'); else localStorage.setItem('riksbrudd-krigpanel', lagret); } catch (e) { /* uten lagring */ } skitten = true; } }
    return ut; });
  // RUNDE 6 (19. nov, kritikken): store tettsteder krever styrke og tid, ingen vinner dag 1, «Neste trekk» sier hvor mange mann som trengs,
  // entall i målteksten, banneret under ild og med anslag, og forsvaret lagres med angrepet. Alt settes tilbake.
  const d6 = await pg.evaluate(async () => {
    const ut = {}; if (!window.Garnison || !Garnison.mannFor || !window.StrategiSpill || !window.Strategi) return { uten: true };
    const by = INFRA && INFRA.tettsted && INFRA.tettsted.find(t => t.e.navn === 'Dombås'), folk0 = by ? by.e.folk : 0, T6 = new Map(TETTSTEDER), kam0 = { ...kam }, var0 = StrategiSpill.erÅpen();
    const Sp = window.SpilletSpill, T = Sp && Sp.klar && Sp.klar() ? Sp.T() : null, aktiv0 = T ? T.aktiv : 0, lagret0 = localStorage.getItem('riksbrudd-angrep'), L = OppstartSpill.tilstand().leir, nye = [];
    // krigskartet går til 2D: 3D settes på igjen til slutt hvis det var på (vaktene etter trenger det)
    const d30 = typeof på3d !== 'undefined' && på3d;
    try {
      if (by) { by.e.folk = 235000; const blå = nyttLag('Vakt seks', 0, 0, 'blå'); let p = null;
        for (let j = 1; j < 20 && !p; j++) for (let i = 1; i < 20 && !p; i++) { const x = by.bb[0] + (by.bb[2] - by.bb[0]) * i / 20, y = by.bb[1] + (by.bb[3] - by.bb[1]) * j / 20; if (Garnison.inni(by, x, y)) p = [x, y]; }
        [blå.x, blå.y] = p; const M = Garnison.ny(); Garnison.steg(M, [by], [blå], 6 * 3600); ut.ettLag = Garnison.tilstand(M, by.e.id).eier === null;
        const tre = [blå, ...[1, 2].map(i => Object.assign(nyttLag('Vakt seks ' + i, p[0], p[1], 'blå')))]; Garnison.steg(M, [by], tre, 12 * 3600); ut.treLag = Garnison.tilstand(M, by.e.id).eier === 'blå';
        // krigskartet: kravet står i «Neste trekk» og i boksen for tettstedet; entall i målteksten. Panelet prøves bare i 2D (krigskartet slår
        // 3D av, og vaktene etter trenger 3D slik det var); i 3D prøves tekstene fra reglene.
        TETTSTEDER.clear();
        if (!d30) { StrategiSpill.åpne(); StrategiSpill.velg(by.e.id); await new Promise(r => setTimeout(r, 200)); const tk = document.getElementById('krig').textContent;
          ut.trenger = /trenger (minst |ca\. )?\d+ mann/.test(tk); ut.boks = /Ca\. \d+ mann \(minst \d+\) tar det/.test(tk); ut.entall = /det ene tettstedet|de \d+ tettstedene/.test(tk) && !/de 1 tettstedene/.test(tk); }
        else { const Tb0 = StrategiSpill.bilde(), t0 = Tb0 && Tb0.trekk[0]; ut.trenger = !!t0 && /trenger (minst |ca\. )?\d+ mann/.test(Strategi.kravTekst(t0)); ut.boks = !!window.GarnisonSpill && /Ca\. \d+ mann \(minst \d+\) tar det/.test(GarnisonSpill.kravTekst(by.e.folk)); ut.entall = Strategi.tettsteder(1) === '1 tettsted'; }
        const Tb = StrategiSpill.bilde(), t1 = Tb && Tb.trekk.find(q => q.by.id === by.e.id); ut.krav = t1 ? Strategi.kravTekst(t1) : null; }
      // ingen vinner før dag 4
      const st = Strategi.stilling([{ id: 1, folk: 9 }, { id: 2, folk: 1 }, { id: 3, folk: 1 }], id => (id === 1 ? 'rød' : null)); ut.tidlig = Strategi.utfall(st, Strategi.REGLER, 600).vinner === null && Strategi.utfall(st, Strategi.REGLER, 5000).vinner === 'rød';
      ut.fred = typeof AI !== 'undefined' && typeof AI.regionFred === 'function' && Fraksjoner.fredDøgn(1) === 2.5 && Fraksjoner.lagTak(0, 4) > Fraksjoner.lagTak(0, 0);
      // banneret: anslag når ingen ser dem, og ikke «ikke sett ennå» når et lag er i ildkamp med dem
      if (T && window.ForsvarSpill && Spillet.Trussel.VARSEL) { const blå = nyttLag('Vakt seks vakt', L.x + 30, L.y, 'blå'), rv = nyttLag('Røvere 7.1', L.x + 30000, L.y + 30000, 'rød'); rv.raid = 7; rv.fra = { x: L.x + 3500, y: L.y }; rv.startTid = tid; ENHETER.push(blå, rv); nye.push(blå, rv); T.aktiv = 7;
        ForsvarSpill.vis(); const a1 = document.getElementById('alarm').textContent; ut.anslag = /ventet om ca\. \d+(–\d+)? (min|timer)|ikke sett – kommer trolig /.test(a1);
        rv.skyterPå = new Set([blå]); ForsvarSpill.vis(); const a2 = document.getElementById('alarm').textContent; ut.underIld = !/ikke sett ennå/.test(a2) && /ildkamp med Vakt seks vakt/.test(a2); rv.skyterPå = new Set();
        // forsvaret lagres med angrepet og kommer tilbake
        ForsvarSpill.sett(false); TrusselLagringSpill.lagre(); const lag = JSON.parse(localStorage.getItem('riksbrudd-angrep') || '{}'); ut.lagretSatt = !!(lag.d && lag.d.satt);
        ForsvarSpill.opphev(false); ut.gjenopprett = ForsvarSpill.gjenopprett() && ForsvarSpill.erSatt(); ForsvarSpill.opphev(false); }
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
    finally { if (by) by.e.folk = folk0; TETTSTEDER.clear(); for (const [k, v] of T6) TETTSTEDER.set(k, v); for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
      if (T) T.aktiv = aktiv0; if (window.ForsvarSpill && ForsvarSpill.erSatt()) ForsvarSpill.opphev(false); if (window.ForsvarSpill) ForsvarSpill.vis();
      try { if (lagret0 === null) localStorage.removeItem('riksbrudd-angrep'); else localStorage.setItem('riksbrudd-angrep', lagret0); } catch (e) { /* uten lagring */ }
      if (!var0) StrategiSpill.lukk(); Object.assign(kam, kam0); skitten = true;
      ut.i3d = typeof på3d === 'undefined' || på3d === d30; }
    return ut; });
  // RUNDE 7 (20. nov natt): eskaleringen – lag samles til et angrep på en garnison (med etterretning), angrepet går først etter varselet,
  // og leiren varsles før et ekte angrep. Tida settes fram og tilbake; lagene, tettstedene, minnet og eskaleringen settes tilbake.
  const d7 = await pg.evaluate(async () => {
    const ut = {}; if (!window.EskaleringSpill || !window.Eskalering || !window.AI || !AI.nytt || !AI.styr) return { uten: true };
    const ES = EskaleringSpill, by = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && INFRA.tettsted.find(t => t.e.navn === 'Dombås');
    if (!by) return { uten: true };
    const tid0 = tid, tempo0 = tempo, test0 = ES.test, T7 = new Map(TETTSTEDER), frø0 = frø, angrip0 = AI.angripLeir, leir0 = AI.minne && AI.minne.rød ? AI.minne.rød.leir : false, lagret0 = localStorage.getItem('riksbrudd-eskalering');
    const ai0 = ENHETER.filter(e => e.ai).map(e => [e, e.ai.neste, e.ai.mål, e.ai.hva, e.ai.tekst, e.x, e.y]), nye = [], loggTekst = () => [...document.querySelectorAll('#logg > *')].map(e => e.textContent).join(' | ');
    try {
      ES.test = true; ES.nullstill();
      const [bx, by0] = AI.inne(by), blå = nyttLag('Vakt sju garnison', bx, by0, 'blå'); ENHETER.push(blå); nye.push(blå); TETTSTEDER.set(by.e.id, { eier: 'blå', inntar: null });
      for (let i = 0; i < 3; i++) nye.push(AI.nytt('rød', bx + 4200 + i * 250, by0 + 300 * i));
      // etter fredstiden, før leirangrepene er lov
      tid = ES.fredSlutt() + 2.5 * 1440;
      const G = ES.planlegg('rød', { tving: true, bare: by.e.id }); ut.gruppe = !!G && G.mål.id === by.e.id && G.lag.length >= 2 && G.angripFra - G.start >= 4 * 60; ut.lag = G ? G.lag.length : 0;
      ut.varsel = loggTekst().includes('Etterretning: ' + Fraksjoner.FRAKSJONER.rød.navn + ' samler ') && /Dombås \(ditt\)/.test(loggTekst());
      const m = G && ENHETER.find(e => e.navn === G.lag[0]); const v1 = m ? AI.styr(m, { hva: 'ta', x: 0, y: 0, tekst: '' }) : null; ut.samles = !!v1 && /^(samle|hold)$/.test(v1.hva);
      // angrepet går ikke før varselet er ute, selv når lagene er samlet
      if (G) { for (const e of ENHETER) if (G.lag.includes(e.navn)) { e.x = G.sted.x + 20; e.y = G.sted.y + 20; }
        tid = G.angripFra - 30; ut.venter = ES.oppdater('rød') === 'samler';
        tid = G.angripFra + 1; ut.angriper = ES.oppdater('rød') === 'angriper' && /angriper nå/.test(loggTekst());
        const v2 = AI.styr(m, { hva: 'ta', x: 0, y: 0, tekst: '' }); ut.mot = !!v2 && v2.hva === 'ta' && v2.mål === by.e.id; }
      // leiren: et ekte angrep varsles i god tid
      // økonomien: med penger og folk kjøper motstanderen et nytt lag (eller sparer til stridsvogna) – det nye tas bort igjen
      { const før = new Set(ENHETER), kfør = new Set(KJORETOY), Ø = ES.S().øk.rød; Ø.kr = 30e6; Ø.folk = 100; const hva = ES.økonomi('rød', 60);
        ut.kjøp = hva; for (const e of ENHETER.slice()) if (!før.has(e)) nye.push(e); for (const k of KJORETOY.slice()) if (!kfør.has(k)) { KJORETOY.splice(KJORETOY.indexOf(k), 1); for (const sd of ['rød', 'grønn']) { const i = AI.ekstraBiler[sd].indexOf(k); if (i >= 0) AI.ekstraBiler[sd].splice(i, 1); } } }
      // (lagene dine ved leiren teller: med fire lag hjemme trengs det flere angripere)
      ES.nullstill(); AI.angripLeir = true; tid = Eskalering.grad(window.SPILLREGLER).leirFra * 1440 + 60; for (let i = 0; i < 4; i++) nye.push(AI.nytt('rød', bx + 3000, by0 - 300 * i));
      const H = ES.planlegg('rød', { tving: true, leir: true }); ut.leir = !!H && H.mål.leir && H.angripFra - tid >= 4 * 60 && /Målet er leiren din/.test(loggTekst());
      // storbyen (Dombås gjort til 235 000 innbyggere, nøytral): planen går gjennom uten feil, med eller uten garnisonene fra småstedene
      { const folk0 = by.e.folk; try { ES.nullstill(); by.e.folk = 235000; TETTSTEDER.delete(by.e.id); tid = Eskalering.grad(window.SPILLREGLER).storbyFra * 1440 + 60;
        const K = ES.planlegg('rød', { tving: true, utenLeir: true }); ut.storby = K ? K.mål.navn + ' ' + K.lag.length + ' lag' : 'ingen gruppe'; } finally { by.e.folk = folk0; } }
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
    finally { tid = tid0; tempo = tempo0; ES.nullstill(); ES.test = test0; AI.angripLeir = angrip0; if (AI.minne && AI.minne.rød) AI.minne.rød.leir = leir0;
      for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); } for (const [e, n, mm, h, t, x, y] of ai0) Object.assign(e.ai, { neste: n, mål: mm, hva: h, tekst: t }), (e.x = x), (e.y = y);
      TETTSTEDER.clear(); for (const [k, v] of T7) TETTSTEDER.set(k, v); frø = frø0;
      if (window.KrigSpill && KrigSpill.T) { const T = KrigSpill.T(); if (T && T.etter) for (let i = T.etter.length - 1; i >= 0; i--) if (T.etter[i].kilde === 'speidere') T.etter.splice(i, 1); }
      try { if (lagret0 === null) localStorage.removeItem('riksbrudd-eskalering'); else localStorage.setItem('riksbrudd-eskalering', lagret0); } catch (e) { /* uten lagring */ }
      skitten = true; ut.tilbake = tid === tid0 && !ENHETER.some(e => nye.includes(e)); }
    return ut; });
  const ok7 = d7.uten || (!d7.feil && d7.gruppe && d7.varsel && d7.samles && d7.venter && d7.angriper && d7.mot && d7.leir && d7.tilbake && /^(lag|lastebil|stridsvogn)$/.test(d7.kjøp) && !!d7.storby);
  const tekst7 = `RUNDE 7: ${d7.uten ? 'ikke prøvd (mangler Dombås eller eskaleringen)' : `lag samles mot garnisonen i Dombås: ${d7.gruppe} (${d7.lag} lag), etterretning ${d7.varsel}, lagene går til samlingsstedet ${d7.samles}, venter på varselet ${d7.venter}, angriper etterpå ${d7.angriper}/${d7.mot}, leiren varsles ${d7.leir}, kjøper ${d7.kjøp}, storby: ${d7.storby}, satt tilbake ${d7.tilbake}`}${d7.feil ? ' FEIL ' + d7.feil : ''} · `;
  // RUNDE 8 (20. nov natt, ny kritikk): én kilde for angrepet (sett / sist sett / anslag som ikke hopper), et ekte angrep på leiren bruker banneret
  // og «Forsvar leiren» med motstanderens navn, rapport etter hver bølge, egne lag ved leiren vises der de er, garnisonen holder stillingen,
  // og meldte fiender nær hverandre får én lapp. Alt settes tilbake (lag, tid, TETTSTEDER, eskaleringen, loggen er bare lest).
  const d8 = await pg.evaluate(async () => {
    const ut = {}; if (!window.ForsvarSpill || !ForsvarSpill.status || !window.SpilletSpill || !SpilletSpill.klar()) return { uten: true };
    const FS = ForsvarSpill, S = OppstartSpill.tilstand(), L = S.leir, T = SpilletSpill.T(), aktiv0 = T.aktiv, tid0 = tid, nye = [], ser = [], TT = new Map(TETTSTEDER), frø0 = frø;
    const ES = window.EskaleringSpill, gr0 = ES ? JSON.stringify(ES.S().gruppe) : null, ferdig0 = ES ? ES.S().ferdig.length : 0, GS = window.GarnisonSpill, gtest0 = GS ? GS.test : false;
    try {
      // (runde 14: banneret bruker den nyeste egne observasjonen i 6 t – her er synet på 1,2 km nyere enn «i leiren for 2 min siden»)
      // (1) røverne: sett på 1,2 km gir avstanden; uten syn, men sett i leiren for 2 min siden: «sist sett i leiren for 2 min siden» (ikke «ikke sett ennå»)
      const rv = nyttLag('Røvere 9.1', L.x + 1200, L.y, 'rød'); rv.raid = 9; rv.fra = { x: L.x + 3500, y: L.y }; rv.startTid = tid - 20; ENHETER.push(rv); nye.push(rv); T.aktiv = 9;
      const f1 = e => e === rv; KROKER.ser.push(f1); ser.push(f1); let st = FS.status(); ut.sett = !!st && st.sett && /1,2 km unna/.test(st.tekst) && /fra leiren/.test(st.kort);
      KROKER.ser.splice(KROKER.ser.indexOf(f1), 1); ser.length = 0; rv.x = L.x + 2400; rv.sett = { x: L.x + 20, y: L.y, tid: tid - 2 }; st = FS.status();
      ut.sist = !!st && !st.sett && /sist sett (i leiren for 2 min siden|1,2 km)/.test(st.tekst) && !/ikke sett ennå/.test(st.tekst); ut.sistTekst = st && st.tekst;
      // anslaget hopper ikke: et rått anslag som går fra ca. 70 til 231 min på ti spillminutter flytter det glattede lite
      delete rv.sett; rv.raid = 10; T.aktiv = 10; rv.fra = { x: L.x + 3150, y: L.y }; rv.startTid = tid; rv.sti = null; FS.status(); const a0 = FS.status().min; tid += 10; rv.sti = [[rv.x, rv.y], [L.x, L.y]]; rv.timerIgjen = 231 / 60; const a1 = FS.status().min; rv.sti = null; delete rv.timerIgjen;
      ut.glatt = a0 !== null && a1 !== null && a1 < a0 + 60; ut.anslag = [a0, a1].map(v => Math.round(v || 0)).join(' → ');
      // varselbrikka sier det samme som banneret
      FS.vis(); const al = document.getElementById('alarm').textContent, br = (document.getElementById('varsler') || {}).textContent || ''; ut.brikke = !/10,0 km/.test(br) && (!br || /ikke sett|sist sett|fra leiren|i leiren/.test(br)) && /Angrep/.test(al);
      // (2) rapporten etter bølgen
      FS.slutt({ nr: 9, utfall: 'unna', tok: '450 000 kr fra røverne' }); ut.rapport = /^Bølge 9 er slått tilbake/.test(loggLinjer[0] || '') && /Dere tok 450 000 kr/.test(loggLinjer[0] || '');
      T.aktiv = aktiv0; const i = ENHETER.indexOf(rv); if (i >= 0) ENHETER.splice(i, 1);
      // (3) et ekte angrep på leiren: samme banner og knapp, med motstanderens navn
      if (ES && window.AI && AI.nytt) { ES.nullstill(); const lag = []; for (let k = 0; k < 2; k++) { const e = AI.nytt('rød', L.x + 900 + k * 40, L.y + 200); lag.push(e); nye.push(e); }
        ES.S().gruppe.rød = { mål: { leir: true, x: L.x, y: L.y, navn: 'leiren din' }, lag: lag.map(e => e.navn), behov: 1, sted: { x: L.x + 900, y: L.y + 200 }, fase: 'angriper', start: tid, angripFra: tid, side: 'rød' };
        const A = FS.angrep(); FS.vis(); const t = document.getElementById('alarm').textContent; const nf = window.Fraksjoner ? Fraksjoner.FRAKSJONER.rød.navn : 'Kystalliansen';
        ut.eskalering = !!A && A.side === 'rød' && t.includes(`Angrep: ${nf}`) && !!document.getElementById('forsvarknapp'); ut.eskTekst = t.slice(0, 120); }
      // (4) egne lag ved leiren vises der de er (kontrollrommet «ute»): ikke «sist meldt»
      const KR = window.KontrollromSpill; if (KR && KR.modus && KR.modus() === 'ute') { const h = nyttLag('Vakt hjemme', L.x + 250, L.y + 100, 'blå'); ENHETER.push(h); nye.push(h); ut.hjemme = !KROKER.skjul.some(f => f(h)); }
      // (5) garnisonen holder stillingen (GarnisonSpill.test), og laget får reglene tilbake når det går ut
      if (GS && GS.holdStilling && typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && INFRA.tettsted.length && window.AI && AI.inne) { const by = INFRA.tettsted[0], [x, y] = AI.inne(by), g = nyttLag('Vakt garnison', x, y, 'blå'); ENHETER.push(g); nye.push(g);
        TETTSTEDER.set(by.e.id, { eier: 'blå', inntar: null }); GS.test = true; GS.holdStilling(); ut.garnison = g.strid && g.strid.underlegen === 'kjemp' && +g.strid.tap === 0;
        g.x = x + 30000; GS.holdStilling(); ut.garnisonUt = g.strid.underlegen !== 'kjemp'; }
      // (6) meldte fiender nær hverandre: én lapp
      if (Krig.klynger) { const k = Krig.klynger([{ x: 100, y: 100, side: 'rød', navn: 'a', t: 1 }, { x: 110, y: 104, side: 'rød', navn: 'b', t: 1 }]); ut.lapp = k.length === 1 && k[0].n === 2; }
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
    finally { for (const f of ser) { const i = KROKER.ser.indexOf(f); if (i >= 0) KROKER.ser.splice(i, 1); } T.aktiv = aktiv0; tid = tid0; frø = frø0;
      for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
      if (ES) { ES.nullstill(); const g0 = JSON.parse(gr0 || 'null'); if (g0) for (const sd of Object.keys(g0)) ES.S().gruppe[sd] = g0[sd]; }
      if (GS) GS.test = gtest0; TETTSTEDER.clear(); for (const [k, v] of TT) TETTSTEDER.set(k, v);
      if (FS.lukkRapport) FS.lukkRapport(); FS.vis(); skitten = true; ut.tilbake = tid === tid0 && !ENHETER.some(e => nye.includes(e)) && T.aktiv === aktiv0; }
    return ut; });
  const ok8 = d8.uten || (!d8.feil && d8.sett && d8.sist && d8.glatt && d8.brikke && d8.rapport && d8.eskalering !== false && d8.hjemme !== false && d8.garnison !== false && d8.garnisonUt !== false && d8.lapp !== false && d8.tilbake);
  const tekst8 = `RUNDE 8: ${d8.uten ? 'ikke prøvd' : `sett ${d8.sett}, sist sett ${d8.sist} («${d8.sistTekst}»), anslag uten hopp ${d8.glatt} (${d8.anslag}), brikka som banneret ${d8.brikke}, rapport ${d8.rapport}, ekte angrep i banneret ${d8.eskalering}, lag hjemme vist ${d8.hjemme}, garnison holder ${d8.garnison}/${d8.garnisonUt}, én lapp ${d8.lapp}, satt tilbake ${d8.tilbake}${d8.feil ? ' FEIL ' + d8.feil : ''}`} · `;
  // RUNDE 12 (PC-kritiker F og telefon-kritiker E): radioadvarsel før «Send», Send med kjøretøyet, garnisonen melder seg fra tettstedet,
  // troppelista, leiren forsvares av seg selv under spoling, oppsummering på seiersskjermen, reprisen står på pause, pausen holder straks.
  const d12 = await pg.evaluate(async () => {
    const ut = {}; if (!window.StrategiSpill || !window.KontrollromSpill || !KontrollromSpill.kanNå || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return { uten: true };
    const S0 = OppstartSpill.tilstand(), L = S0.leir, penger0 = S0.penger, tid0 = tid, tempo0 = tempo, kam0 = { x: kam.x, y: kam.y, m: kam.m }, ant0 = ENHETER.length, valgt0 = valgt, krpFør = KontrollromSpill.på();
    const st0 = StrategiSpill.test, fs0 = window.ForsvarSpill ? ForsvarSpill.test : false, sl0 = window.Skjermlag ? Skjermlag.test : false, plass = ENHETER.map(e => [e, e.x, e.y, e.sti, e.radio, e.ombord]);
    const nyBy = (id, dx, dy, folk) => { const x = L.x + dx, y = L.y + dy, r = 300; return { lag: 'tettsted', e: { id, navn: 'Vakt ' + id, folk }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; };
    const nye = [nyBy('v12a', 6000, -2000, 900), nyBy('v12b', -5000, 4000, 700)]; INFRA.tettsted.push(...nye); TETTSTEDER.set('v12b', { eier: 'blå', inntar: null });
    const lag = []; const nytt = (n, dx, dy) => { const s = nyttLag(n, L.x + dx, L.y + dy, 'blå'); ENHETER.push(s); lag.push(s); return s; };
    try {
      KontrollromSpill.av(false); StrategiSpill.test = true;
      const a = nytt('Vakt12 A', 200, 0); await KontrollromSpill.sjekkKontakt(a);
      // 1: advarsel før et lag sendes ut av rekkevidden (6,3 km, håndradio 3 km)
      // (i 3D åpnes ikke krigskartet og reprisen – de går til 2D; da prøves bare reglene)
      const i3d = typeof på3d !== 'undefined' && på3d; ut.i3d = i3d;
      const by = StrategiSpill.område().find(b => b.id === 'v12a'); if (!i3d) StrategiSpill.åpne(); StrategiSpill.velg('v12a');
      if (StrategiSpill.settTerreng) StrategiSpill.settTerreng(by, false); ut.sendt = StrategiSpill.send(by, a); const A = StrategiSpill.advarsel(); await new Promise(r => setTimeout(r, 50));
      ut.advarsel = !!A && !a.sti && !a.planlegger && (i3d || (!!document.getElementById('krigadvarsel') && !!document.querySelector('[data-advarsel=likevel]') && !!document.querySelector('[data-advarsel=feltradio]')));
      if (!i3d) document.querySelector('[data-advarsel=avbryt]').click(); else StrategiSpill.send(by, a, { likevel: true }) && (a.sti = null); ut.avbrutt = !StrategiSpill.advarsel();
      // 2: et lag uten kontakt (9 km ute) er ikke «ledig med kontakt»
      const u = nytt('Vakt12 U', -9000, 0); await KontrollromSpill.sjekkKontakt(u); ut.utenKontakt = !KontrollromSpill.kanNå(u) && StrategiSpill.bilde().ledige.find(q => q.lag === u).kontakt === false;
      // 3: garnisonen i et tettsted du holder melder seg derfra (kontakt, vist der den er)
      const g = nytt('Vakt12 G', -5000, 4000); await KontrollromSpill.sjekkKontakt(g); ut.garnison = KontrollromSpill.kanNå(g) && !KROKER.skjul.some(f => f(g)) && !!KontrollromSpill.garnisonI(g);
      // 4: et lag om bord sendes med kjøretøyet (ordren går til kjøretøyet, troppen går av når det er framme)
      const k = (window.KJORETOY || []).find(q => q.side === 'blå' && !q.sti && !q.oppdrag && window.TropperSpill && !TropperSpill.bærer(q));
      if (k && window.TropperSpill) { const kx = k.x, ky = k.y; k.x = a.x + 5; k.y = a.y; a.menn = a.menn.slice(0, 4); const om = TropperSpill.gåOmBord(a, k); const lok = StrategiSpill.område().find(b => b.id === 'v12b');
        window.kjørTil0 = window.kjørTil; let kjørt = null; window.kjørTil = (kk, X, Y) => { kjørt = [kk, X, Y]; };
        StrategiSpill.send(lok, a, { likevel: true }); window.kjørTil = window.kjørTil0; delete window.kjørTil0;
        ut.kjøretøy = om && !!kjørt && kjørt[0] === k && !!a.avstigning && !a.sti; delete a.avstigning; TropperSpill.gåAv(a); k.x = kx; k.y = ky; }
      if (!i3d) StrategiSpill.lukk();
      // 5: troppelista øverst i Tropper-panelet
      if (window.TropperSpill) { TropperSpill.åpne(); await new Promise(r => setTimeout(r, 50)); const rader = [...document.querySelectorAll('#troppliste [data-tropp]')].map(e => e.getAttribute('data-tropp'));
        ut.liste = rader.includes('Vakt12 A') && rader.includes('Vakt12 G') && !!document.querySelector('#troppliste [data-velg]') && !!document.querySelector('#tropppanel [data-mal]'); TropperSpill.lukk(); }
      // 6: leiren forsvares av seg selv når du spoler
      if (window.ForsvarSpill && ForsvarSpill.autoForsvar && window.SpilletSpill && SpilletSpill.T && SpilletSpill.T()) { ForsvarSpill.test = true; const T = SpilletSpill.T(), akt0 = T.aktiv, nr = 900 + Math.floor(Math.random() * 90);
        T.aktiv = nr; const r = nyttLag('Røvere vakt', L.x + 2500, L.y, 'rød'); r.raid = nr; ENHETER.push(r); lag.push(r); tempo = 60;
        ForsvarSpill.autoForsvar(ForsvarSpill.angrep()); ut.selvForsvar = ForsvarSpill.erSatt(); tempo = 0; ForsvarSpill.opphev(false); T.aktiv = akt0; }
      // 7: oppsummering på seiersskjermen, og panelene under sløret
      if (window.ScenarioSpill && ScenarioSpill.oppsumElement) { const o = ScenarioSpill.oppsummering(); ScenarioSpill.visKort('Vakt', 'Prøve', [['OK', null]], ScenarioSpill.oppsumElement());
        ut.oppsum = !!o && o.tall.length >= 4 && document.querySelectorAll('#oppsummering dt').length >= 4 && document.body.classList.contains('formkortpå'); ScenarioSpill.kortLukk(); ut.oppsumLukk = !document.body.classList.contains('formkortpå'); }
      // 8: reprisen holder spillet på pause, og farten kommer tilbake etterpå
      if (!i3d && window.ScenarioSpill && ScenarioSpill.etterspill) { document.getElementById('sp2').click(); const t1 = tempo; if (ScenarioSpill.etterspill()) { document.getElementById('sp2').click(); await new Promise(r => setTimeout(r, 400));
          ut.reprisePause = tempo === 0 && !!document.querySelector('#etterspill .forkl'); ScenarioSpill.etterspillLukk(); ut.repriseFart = tempo === t1; } }
      // 9: pausen holder straks når et kort venter (sjekken i simuleringen)
      if (window.Skjermlag) { const h = document.getElementById('hendelse'), f = KROKER.sim.find(q => String(q).includes('KORT_ID'));
        if (h && f) { Skjermlag.test = true; document.getElementById('sp2').click(); const hadde = h.classList.contains('på'), tekst = h.innerHTML; if (!h.textContent.trim()) h.textContent = 'Vakt'; h.classList.add('på'); f(.01); ut.kortPause = tempo === 0; if (!hadde) h.classList.remove('på'); h.innerHTML = tekst; Skjermlag.test = sl0; } }
    } catch (e) { ut.feil = e.message; }
    finally {
      for (const s of lag) { const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1); }
      for (const [e, x, y, sti, radio, om] of plass) { e.x = x; e.y = y; e.sti = sti; if (radio === undefined) delete e.radio; else e.radio = radio; e.ombord = om; }
      for (const b of nye) { if (StrategiSpill.settTerreng) StrategiSpill.settTerreng({ x: (b.bb[0] + b.bb[2]) / 2, y: (b.bb[1] + b.bb[3]) / 2 }, null); const i = INFRA.tettsted.indexOf(b); if (i >= 0) INFRA.tettsted.splice(i, 1); } TETTSTEDER.delete('v12a'); TETTSTEDER.delete('v12b');
      StrategiSpill.test = st0; if (window.ForsvarSpill) ForsvarSpill.test = fs0; if (window.Skjermlag) Skjermlag.test = sl0; if (!krpFør) KontrollromSpill.av(true);
      S0.penger = penger0; tid = tid0; if (tempo !== tempo0) { if (tempo0 === 0) { if (tempo > 0) document.getElementById('sp0').click(); } else tempo = tempo0; }
      kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; valgt = valgt0; skitten = true; ut.tilbake = ENHETER.length === ant0 && tid === tid0 && OppstartSpill.tilstand().penger === penger0; }
    return ut; });
  const ok12 = d12.uten || (!d12.feil && d12.advarsel && d12.avbrutt && d12.sendt === false && d12.utenKontakt && d12.garnison && d12.kjøretøy !== false && d12.liste !== false && d12.selvForsvar !== false
    && d12.oppsum !== false && d12.oppsumLukk !== false && d12.reprisePause !== false && d12.repriseFart !== false && d12.kortPause !== false && d12.tilbake);
  const tekst12 = `RUNDE 12: ${d12.uten ? 'ikke prøvd' : `advarsel før Send utenfor radioen ${d12.advarsel} (avbryt ${d12.avbrutt}), lag uten kontakt grått ${d12.utenKontakt}, garnison melder seg ${d12.garnison}, Send med kjøretøyet ${d12.kjøretøy}, troppelista ${d12.liste}, forsvar av seg selv ${d12.selvForsvar}, oppsummering ${d12.oppsum}/${d12.oppsumLukk}, reprisen på pause ${d12.reprisePause}/${d12.repriseFart}, kortpausen straks ${d12.kortPause}, satt tilbake ${d12.tilbake}`}${d12.feil ? ' FEIL ' + d12.feil : ''} · `;
  // RUNDE 13 (kritiker G og H): ett tall for kravet, advarsel før «Send» (for få, bygdevern med avtale, speidere, leiren uten vakt), radioen
  // med terrenget i forslaget («når heller ikke fram»), speid og meld, riktige tall i lagene, tegnforklaring, scenariets mål, samme varsel
  // utenfor krigskartet (tankbilen), lagtallet ved leiren uten deg, regionteksten og svartebørsen.
  const d13 = await pg.evaluate(async () => {
    const ut = {}; if (!window.StrategiSpill || !StrategiSpill.farer || !window.KontrollromSpill || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return { uten: true };
    const S0 = OppstartSpill.tilstand(), L = S0.leir, penger0 = S0.penger, tid0 = tid, kam0 = { x: kam.x, y: kam.y, m: kam.m }, ant0 = ENHETER.length, valgt0 = valgt, krpFør = KontrollromSpill.på(), st0 = StrategiSpill.test;
    const plass = ENHETER.map(e => [e, e.x, e.y, e.sti, e.radio, e.menn.map(m => m.hp)]), KT = window.KrigSpill && KrigSpill.T ? KrigSpill.T() : null, vern0 = KT ? JSON.stringify(KT.vern) : null;
    const nyBy = (id, dx, dy, folk) => { const x = L.x + dx, y = L.y + dy, r = 300; return { lag: 'tettsted', e: { id, navn: 'Vakt ' + id, folk }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; };
    const nye = [nyBy('v13a', 5000, 1500, 1021)]; INFRA.tettsted.push(...nye);
    const lag = []; const nytt = (n, dx, dy, menn) => { const s = nyttLag(n, L.x + dx, L.y + dy, 'blå'); if (menn) s.menn = s.menn.slice(0, menn); ENHETER.push(s); lag.push(s); return s; };
    const i3d = typeof på3d !== 'undefined' && på3d; ut.i3d = i3d; const vent = ms => new Promise(r => setTimeout(r, ms));
    try {
      KontrollromSpill.av(false); StrategiSpill.test = true;
      // 1: ett tall – «trenger minst 3 mann (5 for full fart)», og «For få: 1 av 3 – tar ikke stedet»
      const t = { minst: 3, mann: 5 }; ut.ettTall = /^trenger minst 3 mann \(5 for full fart\)/.test(Strategi.kravTekst({ ...t, nok: true })) && /For få: 1 av 3 – tar ikke stedet/.test(Strategi.kravFor(t, [{ menn: [{ hp: 1 }] }]).tekst);
      const by = StrategiSpill.område().find(b => b.id === 'v13a'); StrategiSpill.settTerreng(by, true);
      // 2: forsvaret står i «Neste trekk» før du sender (bygdevernet i et nøytralt sted)
      if (!i3d) { StrategiSpill.åpne(); StrategiSpill.velg('v13a'); await vent(60); const f = document.querySelector('#krig [data-forsvar="v13a"]'); ut.forsvar = !!f && /bygdevernet: \d+ mann/.test(f.textContent); }
      // 3: speidertroppen sendes mot stedet: advarsel med «Speid og meld», bygdevernet med avtale, og (terrenget kutter feltradioen til 2,8 km)
      //    et lag med feltradio som HELLER ikke når fram, foreslås ikke – det står «når heller ikke fram (terreng: 2,8 km)»
      const sp = nytt('Speidertropp V13', 120, 0, 4); sp.mal = 'speider'; sp.radio = 'felt'; await KontrollromSpill.sjekkKontakt(sp);
      const fr = nytt('Feltlaget V13', -150, 60, 6); fr.radio = 'felt'; await KontrollromSpill.sjekkKontakt(fr);
      const hå = nytt('Håndlaget V13', 0, -140, 6); await KontrollromSpill.sjekkKontakt(hå);
      ut.sendtSpeider = StrategiSpill.send(by, sp); const A = StrategiSpill.advarsel(); await vent(60);
      ut.speidFare = !!A && A.farer.some(f => f.id === 'speider') && A.farer.some(f => f.id === 'vern') && !sp.sti && !sp.planlegger;
      if (!i3d) { ut.speidKnapp = !!document.querySelector('#krigadvarsel [data-advarsel=speid]') && !!document.querySelector('#krigadvarsel [data-advarsel=avtale]') && /terrenget står i veien: 2,8 km/.test(document.getElementById('krigadvarsel').textContent); document.querySelector('#krigadvarsel [data-advarsel=avbryt]').click(); }
      StrategiSpill.send(by, hå); const B = StrategiSpill.advarsel(); await vent(60);
      if (!i3d) { const bx = document.getElementById('krigadvarsel'); ut.ikkeForeslått = !!bx && !bx.querySelector('[data-advarsel=annet]') && /Feltlaget V13 \(feltradio\) når heller ikke fram \(terreng: 2,8 km\)/.test(bx.textContent); bx.querySelector('[data-advarsel=avbryt]').click(); }
      else ut.ikkeForeslått = !!B && B.ute.length === 1;
      // 4: speid og meld: troppen går mot et punkt FØR stedet, ikke inn i det
      StrategiSpill.speid(by, [sp]); await vent(30); for (let i = 0; i < 300 && sp.planlegger; i++) await vent(50);
      const mål = sp.sti && sp.sti[sp.sti.length - 1]; ut.speid = !!sp.speid && !!mål && !G0inni(by, mål) && Math.hypot(mål[0] - by.x, mål[1] - by.y) > 500;
      function G0inni(b, p) { return Garnison.inni(b.ref || b, p[0], p[1]); }
      // 5: leiren uten vakt når det siste laget ved leiren sendes
      const hjemme = ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && !e.ai && levende(e) && !e.sti && Math.hypot(e.x - L.x, e.y - L.y) <= 600);
      ut.leirFare = StrategiSpill.farer(by, hjemme, null).some(f => f.id === 'leir') && !StrategiSpill.farer(by, hjemme.slice(1), null).some(f => f.id === 'leir' && hjemme.length > 1);
      // 6: tallene – én falt og én såret trekkes fra med en gang (lagene i Krig og troppelista)
      hå.menn[0].hp = 0; hå.menn[1].hp = .5; ut.tall = StrategiSpill.mannTekst(hå) === '4 friske av 6, 1 såret, 1 falt';
      if (!i3d && window.TropperSpill) { StrategiSpill.lukk(); TropperSpill.åpne(); await vent(60); const r = document.querySelector('#troppliste [data-mann="Håndlaget V13"]'); ut.troppTall = !!r && /4 friske av 6, 1 såret, 1 falt/.test(r.textContent); TropperSpill.lukk(); StrategiSpill.åpne(); await vent(40); }
      // 7: tegnforklaringen forklarer «?» (meldt fiende)
      if (!i3d) { const fk = document.getElementById('krigforkl'); ut.forkl = !!fk && fk.querySelectorAll('canvas').length >= 7 && /«\?»: fiende meldt/.test(fk.textContent); }
      // 8: lagtallet ved leiren teller ikke karakteren din
      if (typeof leirTillegg === 'function') { const m0 = kam.m; kam.m = 40; const n = ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && e !== valgt && levende(e) && vedLeiren(e)).length, txt = leirTillegg(); kam.m = m0; ut.leirTall = n ? txt.includes(n + ' lag') : true; }
      // 9: samme radiovarsel utenfor krigskartet (tankbilen): laget går ikke, boksen står, Avbryt lukker
      StrategiSpill.lukk(); const tb = { x: L.x + 3300, y: L.y - 400, navn: 'tankbilen' }; StrategiSpill.settTerreng(tb, true); let gikk = null;
      const straks = StrategiSpill.sendTil(hå, tb, l => { gikk = l.navn; }); await vent(40); const kv = document.getElementById('krigvarsel');
      ut.tankbil = !straks && !gikk && !!kv && kv.classList.contains('på') && /terrenget står i veien/.test(kv.textContent); if (kv) { const k = kv.querySelector('[data-advarsel=avbryt]'); if (k) k.click(); } ut.tankbilLukket = !(kv && kv.classList.contains('på'));
      StrategiSpill.settTerreng(tb, null);
      // 10: scenariets mål står øverst i Krig (når et scenario er valgt)
      if (window.SPILLREGLER && window.ScenarioSpill && ScenarioSpill.scenario) { const sc0 = SPILLREGLER.scenario; SPILLREGLER.scenario = 'overlev'; let sc = null; try { sc = ScenarioSpill.scenario(); } catch (e) { sc = null; }
        if (sc) { const el = StrategiSpill.scenarioBoks(); ut.scenario = !!el && /Scenario: Sju døgn – dag \d+ av 7/.test(el.textContent) && /avgjør ikke scenariet/.test(el.textContent); } SPILLREGLER.scenario = sc0; }
      // 11: regionen – riktig tekst om døgnet, og lappen «Svartebørsen» går til svartebørsen
      if (!i3d && window.RegionSpill && RegionSpill.klar && RegionSpill.klar()) { RegionSpill.åpne('børs'); await vent(60); const p = document.getElementById('region'), h = document.getElementById('regionbors'), ing = document.querySelector('#region .ingress');
        ut.region = !!h && !!ing && !/eller ti minutter spilling/.test(ing.textContent) && h.getBoundingClientRect().top >= p.getBoundingClientRect().top - 2 && h.getBoundingClientRect().top < p.getBoundingClientRect().bottom; RegionSpill.lukk(); }
    } catch (e) { ut.feil = e.message + ' ' + (e.stack || '').split('\n')[1]; }
    finally {
      for (const s of lag) { delete s.speid; const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1); }
      for (const [e, x, y, sti, radio, hp] of plass) { e.x = x; e.y = y; e.sti = sti; if (radio === undefined) delete e.radio; else e.radio = radio; e.menn.forEach((m, i) => { m.hp = hp[i]; }); }
      for (const b of nye) { StrategiSpill.settTerreng({ x: (b.bb[0] + b.bb[2]) / 2, y: (b.bb[1] + b.bb[3]) / 2 }, null); const i = INFRA.tettsted.indexOf(b); if (i >= 0) INFRA.tettsted.splice(i, 1); } TETTSTEDER.delete('v13a');
      if (KT && vern0 !== null) KT.vern = JSON.parse(vern0);
      if (StrategiSpill.erÅpen()) StrategiSpill.lukk(); StrategiSpill.test = st0; if (!krpFør) KontrollromSpill.av(true);
      S0.penger = penger0; tid = tid0; kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; valgt = valgt0; skitten = true; ut.tilbake = ENHETER.length === ant0 && tid === tid0 && OppstartSpill.tilstand().penger === penger0; }
    return ut; });
  const ok13 = d13.uten || (!d13.feil && d13.ettTall && d13.forsvar !== false && d13.sendtSpeider === false && d13.speidFare && d13.speidKnapp !== false && d13.ikkeForeslått && d13.speid && d13.leirFare && d13.tall
    && d13.troppTall !== false && d13.forkl !== false && d13.leirTall !== false && d13.tankbil && d13.tankbilLukket && d13.scenario !== false && d13.region !== false && d13.tilbake);
  const tekst13 = `RUNDE 13: ${d13.uten ? 'ikke prøvd' : `ett tall ${d13.ettTall}, forsvaret i Neste trekk ${d13.forsvar}, speidere advares ${d13.speidFare}/${d13.speidKnapp}, «når heller ikke fram» ${d13.ikkeForeslått}, speid og meld stopper før ${d13.speid}, leiren uten vakt ${d13.leirFare}, falne/sårede trukket fra ${d13.tall}/${d13.troppTall}, tegnforklaring ${d13.forkl}, lagtall uten deg ${d13.leirTall}, tankbilvarsel ${d13.tankbil}/${d13.tankbilLukket}, scenariet ${d13.scenario}, regionen ${d13.region}, satt tilbake ${d13.tilbake}`}${d13.feil ? ' FEIL ' + d13.feil : ''} · `;
  // RUNDE 14 (kritiker I og J): scenariet navngir byen og har ring/panel, telleren 24 t = 1,0 og nullstilles ikke av ukjent eier, tapt by
  // gir loggen, varselet viser forsvaret i mann og aldri «tar stedet» mot et større forsvar (rød Send), laget ved et forsvart sted sier hvorfor,
  // lag på marsj er ikke garnison, speiderbilen kan velges
  const d14 = await pg.evaluate(async () => {
    const ut = {}; if (!window.ScenarioSpill || !window.StrategiSpill || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted || !INFRA.tettsted.length) return { uten: true };
    const S = OppstartSpill.tilstand(), regler0 = S.regler, tid0 = tid, ant0 = ENHETER.length, by = INFRA.tettsted[0], id = by.e.id, T0 = TETTSTEDER.has(id) ? { ...TETTSTEDER.get(id) } : null, logg0 = loggLinjer.length;
    const sp0 = localStorage.getItem('riksbrudd-spillform'), sc0 = ScenarioSpill.tilstand() ? JSON.stringify(ScenarioSpill.tilstand().sc) : null, test0 = [ScenarioSpill.test, StrategiSpill.test], åpen0 = StrategiSpill.erÅpen();
    const mx = (by.bb[0] + by.bb[2]) / 2, my = (by.bb[1] + by.bb[3]) / 2, nye = [];
    try {
      S.regler = { vanskelighet: 'vanlig', utfordringer: [], scenario: 'hold' }; ScenarioSpill.settRegler(); StrategiSpill.test = true;
      if (ScenarioSpill.tilstand()) ScenarioSpill.tilstand().sc = {};
      TETTSTEDER.set(id, { eier: 'rød', inntar: null });
      for (let i = 0; i < 3; i++) { const f = nyttLag('Vakt14 rød ' + i, mx + i * 30, my, 'rød'); ENHETER.push(f); nye.push(f); }
      const sc = ScenarioSpill.scenario(); ut.navn = !!sc && sc.tekst.includes(by.e.navn) && (sc.tekst.includes(Fraksjoner.FRAKSJONER.rød.eieform) || /fiendens|\d+ km/.test(sc.tekst));
      ut.ring = typeof SCENARIO_BY === 'function' && String(SCENARIO_BY()) === String(id);
      StrategiSpill.åpne(); StrategiSpill.velg(id); await new Promise(r => setTimeout(r, 50));
      const boks = document.getElementById('krigscenario'); ut.boks = !!boks && boks.textContent.includes(by.e.navn);
      const rad = document.querySelector(`#krig [data-trekk="${id}"]`); ut.forsvarMann = !!rad && /Forsvar: ca\. \d+ mann/.test(rad.textContent);
      const blå = nyttLag('Vakt14 blå', mx + 3000, my, 'blå'); blå.menn.length = 4; ENHETER.push(blå); nye.push(blå);
      const B = StrategiSpill.område().find(q => q.id === id), fa = StrategiSpill.farer(B, [blå], { minst: 3, mann: 5, eier: 'rød', by: B });
      ut.ikkeTar = fa.length > 0 && !fa.some(f => /tar stedet/.test(f.tekst)) && fa.some(f => f.id === 'svak');
      // laget ved byen: grunnen i loggen (antall lag kan være flere enn de tre her – andre vakter og AI-en kan ha lag i nærheten)
      blå.x = mx + 150; blå.y = my + 80; blå.sti = null; const g = StrategiSpill.hvorforIkkeTar(blå, B); ut.hvorfor = !!g && /holdes av \d+ lag/.test(g); ut.hvorforTekst = g;
      // telleren: 24 t = 1,0; ukjent eier nullstiller ikke; tapt gir loggen
      TETTSTEDER.set(id, { eier: 'blå', inntar: null }); const tA = tid; ScenarioSpill.scenarioSteg(); tid = tA + 1440;
      ut.teller = /1,0 av 3 døgn/.test(ScenarioSpill.scenario().tekst);
      TETTSTEDER.delete(id); ScenarioSpill.scenario(); ut.omlast = ScenarioSpill.tilstand().sc.holdtFra != null;
      TETTSTEDER.set(id, { eier: 'rød', inntar: null }); const ScS = window.SPILLREGLER; ScenarioSpill.test = true; ScenarioSpill.scenarioSteg();
      ut.tapt = loggLinjer.slice(0, 6).some(l => /Scenariet: .+ er tapt – telleren starter på nytt/.test(l));
    } catch (e) { ut.feil = e.message; }
    finally {
      for (const f of nye) { const i = ENHETER.indexOf(f); if (i >= 0) ENHETER.splice(i, 1); }
      if (T0) TETTSTEDER.set(id, T0); else TETTSTEDER.delete(id); tid = tid0; S.regler = regler0; ScenarioSpill.settRegler();
      if (ScenarioSpill.tilstand() && sc0 !== null) ScenarioSpill.tilstand().sc = JSON.parse(sc0); if (sp0 === null) localStorage.removeItem('riksbrudd-spillform'); else localStorage.setItem('riksbrudd-spillform', sp0);
      [ScenarioSpill.test, StrategiSpill.test] = test0; if (!åpen0) StrategiSpill.lukk(); skitten = true; }
    return ut; });
  const ok14 = d14.uten || (!d14.feil && d14.navn && d14.ring && d14.boks && d14.forsvarMann && d14.ikkeTar && d14.hvorfor && d14.teller && d14.omlast && d14.tapt);
  const tekst14 = `RUNDE 14: ${d14.uten ? 'ikke prøvd' : `byen navngis ${d14.navn}/${d14.boks}, ring ${d14.ring}, forsvar i mann ${d14.forsvarMann}, aldri «tar stedet» ${d14.ikkeTar}, laget sier hvorfor ${d14.hvorfor}, 24 t = 1,0 ${d14.teller}, omlasting nullstiller ikke ${d14.omlast}, tapt i loggen ${d14.tapt}${d14.feil ? ', FEIL ' + d14.feil : ''}`} · `;
  Object.assign(d, { r4: d4, r5: d5, r6: d6, r7: d7, r8: d8, r12: d12, r13: d13, r14: d14 });
  const ok6 = d6.uten || (!d6.feil && d6.i3d !== false && (d6.ettLag === undefined || (d6.ettLag && d6.treLag && d6.trenger && d6.boks && d6.entall)) && d6.tidlig && d6.fred && (d6.anslag === undefined || (d6.anslag && d6.underIld && d6.lagretSatt && d6.gjenopprett)));
  const tekst6 = `RUNDE 6: storby med ett lag tatt: ${d6.ettLag === false ? 'JA (feil)' : 'nei'}, med tre lag: ${d6.treLag}, «${d6.krav}», boksen ${d6.boks}, entall ${d6.entall}, ingen vinner dag 1: ${d6.tidlig}, fred/lagtak ${d6.fred}, banner med anslag ${d6.anslag}, under ild ${d6.underIld}, forsvaret lagres ${d6.lagretSatt}/${d6.gjenopprett}${d6.feil ? ' FEIL ' + d6.feil : ''} · `;
  const ok4 = !d4.feil && d4.dekning < .7 && Math.abs(d4.dekningAv - 1) < 1e-9 && d4.dekningTekst && d4.bytt && (d4.byttEgne === undefined || (d4.byttEgne && d4.arbeid && d4.ikkeEnnå && d4.spør && d4.forslag)) && d4.lagring && d4.krig3d && d4.ryddet && (d4.svarer === undefined || (d4.svarer && d4.ikkeUtenGrunn));
  const ok = !d.feil && d.flanke > 1.4 && Math.abs(d.av - 1) < 1e-9 && d.snudd && d.fart < .9 && d.natt < .6 && d.nattsikt > 1.5 && d.røyk < .5 && d.gaSeg && d.levert && d.avhør && d.etter && d.avhørt && d.meny
    && (d.fred === undefined || (d.fred && d.fredIld && d.brutt)) && /fører: .+\(.+\)/.test(d.fører) && d.knapp && d.panel >= 6 && d.lagret && d.ryddet && d.hus < .75 && d.holdt && d.egetGaSeg && d.krig3d && d.stridsvalg && (d.bølgeOver === undefined || (d.bølgeVenter && d.bølgeOver));
  const tekst4 = ` · RUNDE 4: dekning bak egen brakke ×${(d4.dekning || 0).toFixed(2)}, bytte ${!!d4.bytt}/${d4.byttEgne}, fanger i arbeid ${d4.arbeid}, rekruttering ${d4.spør}, forslag om bytte ${d4.forslag}, svarer kjøretøy som skyter ${d4.svarer}, lagring ${d4.lagring}${d4.feil ? ' FEIL ' + d4.feil : ''}`;
  const ok5 = d5.uten || (!d5.feil && (!d5.skjult || (d5.meldt && d5.skuddMeldt === 0 && d5.skuddNabo > 0)) && (d5.pakket === undefined || (d5.pakket && d5.settTilbake && d5.marsjIgjen)) && (d5.stripe === undefined || (d5.stripe && d5.visIgjen && d5.høyStripe < 120)));
  const tekst5 = ` · RUNDE 5: stridsvogna skyter på et meldt mål den ikke ser: ${d5.skuddMeldt === 0 ? 'nei' : d5.skuddMeldt} (meldt: ${d5.meldt}), med et eget lag ved som ser det: ${d5.skuddNabo}${d5.skjult === false ? ' (fant ikke skjult punkt)' : ''}, fienden lagres («sist sett» ${d5.settTilbake}, marsjen fortsetter ${d5.marsjIgjen}), krigskartet kan skjules: ${d5.stripe === undefined ? 'ikke prøvd (ingen tettsteder)' : d5.stripe && d5.visIgjen ? 'ja (' + d5.høyStripe + ' px)' : 'NEI'}${d5.feil ? ' FEIL ' + d5.feil : ''}`;
  d.deler = { ok, ok4, ok5, ok6, ok7, ok8, ok12, ok13, ok14 }; return { ok: ok && ok4 && ok5 && ok6 && ok7 && ok8 && ok12 && ok13 && ok14, tekst: tekst14 + tekst13 + tekst12 + tekst8 + tekst7 + tekst6 + tekst5.slice(3) + tekst4 + ' · ' + `ild i ryggen ×${(d.flanke || 0).toFixed(2)} (av i testene: ×${(d.av || 0).toFixed(2)}), laget snur seg: ${d.snudd}, to sårede gir fart ×${(d.fart || 0).toFixed(2)}, natt gir sikt ×${(d.natt || 0).toFixed(2)}, røyk ×${(d.røyk || 0).toFixed(2)}, knust lag ga seg: ${d.gaSeg}, fanger levert og avhørt: ${d.levert && d.avhørt}, etterretning: ${d.etter}, våpenhvile: ${d.fred && d.fredIld && d.brutt}, ${d.fører}, ${d.panel} tiltak, fienden lagres: ${d.lagret}, bak ekte hus ×${(d.hus || 0).toFixed(2)}, eget lag gir seg bare når valgt: ${d.holdt && d.egetGaSeg}, røvere som trekker seg unna avslutter bølgen: ${d.bølgeOver}`, data: d };
} };
