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
          ut.trenger = /trenger (ca\. )?\d+ mann/.test(tk); ut.boks = /Ca\. \d+ mann \(minst \d+\) tar det/.test(tk); ut.entall = /det ene tettstedet|de \d+ tettstedene/.test(tk) && !/de 1 tettstedene/.test(tk); }
        else { const Tb0 = StrategiSpill.bilde(), t0 = Tb0 && Tb0.trekk[0]; ut.trenger = !!t0 && /trenger (ca\. )?\d+ mann/.test(Strategi.kravTekst(t0)); ut.boks = !!window.GarnisonSpill && /Ca\. \d+ mann \(minst \d+\) tar det/.test(GarnisonSpill.kravTekst(by.e.folk)); ut.entall = Strategi.tettsteder(1) === '1 tettsted'; }
        const Tb = StrategiSpill.bilde(), t1 = Tb && Tb.trekk.find(q => q.by.id === by.e.id); ut.krav = t1 ? Strategi.kravTekst(t1) : null; }
      // ingen vinner før dag 4
      const st = Strategi.stilling([{ id: 1, folk: 9 }, { id: 2, folk: 1 }, { id: 3, folk: 1 }], id => (id === 1 ? 'rød' : null)); ut.tidlig = Strategi.utfall(st, Strategi.REGLER, 600).vinner === null && Strategi.utfall(st, Strategi.REGLER, 5000).vinner === 'rød';
      ut.fred = typeof AI !== 'undefined' && typeof AI.regionFred === 'function' && Fraksjoner.fredDøgn(1) === 2.5 && Fraksjoner.lagTak(0, 4) > Fraksjoner.lagTak(0, 0);
      // banneret: anslag når ingen ser dem, og ikke «ikke sett ennå» når et lag er i ildkamp med dem
      if (T && window.ForsvarSpill && Spillet.Trussel.VARSEL) { const blå = nyttLag('Vakt seks vakt', L.x + 30, L.y, 'blå'), rv = nyttLag('Røvere 7.1', L.x + 30000, L.y + 30000, 'rød'); rv.raid = 7; rv.fra = { x: L.x + 3500, y: L.y }; rv.startTid = tid; ENHETER.push(blå, rv); nye.push(blå, rv); T.aktiv = 7;
        ForsvarSpill.vis(); const a1 = document.getElementById('alarm').textContent; ut.anslag = /ventet om ca\. \d+ min/.test(a1);
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
      const G = ES.planlegg('rød', { tving: true, bare: by.e.id }); ut.gruppe = !!G && G.mål.id === by.e.id && G.lag.length >= 2; ut.lag = G ? G.lag.length : 0;
      ut.varsel = /Etterretning: Kystalliansen samler \d+ lag/.test(loggTekst()) && /Dombås \(ditt\)/.test(loggTekst());
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
  Object.assign(d, { r4: d4, r5: d5, r6: d6, r7: d7 });
  const ok6 = d6.uten || (!d6.feil && d6.i3d !== false && (d6.ettLag === undefined || (d6.ettLag && d6.treLag && d6.trenger && d6.boks && d6.entall)) && d6.tidlig && d6.fred && (d6.anslag === undefined || (d6.anslag && d6.underIld && d6.lagretSatt && d6.gjenopprett)));
  const tekst6 = `RUNDE 6: storby med ett lag tatt: ${d6.ettLag === false ? 'JA (feil)' : 'nei'}, med tre lag: ${d6.treLag}, «${d6.krav}», boksen ${d6.boks}, entall ${d6.entall}, ingen vinner dag 1: ${d6.tidlig}, fred/lagtak ${d6.fred}, banner med anslag ${d6.anslag}, under ild ${d6.underIld}, forsvaret lagres ${d6.lagretSatt}/${d6.gjenopprett}${d6.feil ? ' FEIL ' + d6.feil : ''} · `;
  const ok4 = !d4.feil && d4.dekning < .7 && Math.abs(d4.dekningAv - 1) < 1e-9 && d4.dekningTekst && d4.bytt && (d4.byttEgne === undefined || (d4.byttEgne && d4.arbeid && d4.ikkeEnnå && d4.spør && d4.forslag)) && d4.lagring && d4.krig3d && d4.ryddet && (d4.svarer === undefined || (d4.svarer && d4.ikkeUtenGrunn));
  const ok = !d.feil && d.flanke > 1.4 && Math.abs(d.av - 1) < 1e-9 && d.snudd && d.fart < .9 && d.natt < .6 && d.nattsikt > 1.5 && d.røyk < .5 && d.gaSeg && d.levert && d.avhør && d.etter && d.avhørt && d.meny
    && (d.fred === undefined || (d.fred && d.fredIld && d.brutt)) && /fører: .+\(.+\)/.test(d.fører) && d.knapp && d.panel >= 6 && d.lagret && d.ryddet && d.hus < .75 && d.holdt && d.egetGaSeg && d.krig3d && d.stridsvalg && (d.bølgeOver === undefined || (d.bølgeVenter && d.bølgeOver));
  const tekst4 = ` · RUNDE 4: dekning bak egen brakke ×${(d4.dekning || 0).toFixed(2)}, bytte ${!!d4.bytt}/${d4.byttEgne}, fanger i arbeid ${d4.arbeid}, rekruttering ${d4.spør}, forslag om bytte ${d4.forslag}, svarer kjøretøy som skyter ${d4.svarer}, lagring ${d4.lagring}${d4.feil ? ' FEIL ' + d4.feil : ''}`;
  const ok5 = d5.uten || (!d5.feil && (!d5.skjult || (d5.meldt && d5.skuddMeldt === 0 && d5.skuddNabo > 0)) && (d5.pakket === undefined || (d5.pakket && d5.settTilbake && d5.marsjIgjen)) && (d5.stripe === undefined || (d5.stripe && d5.visIgjen && d5.høyStripe < 120)));
  const tekst5 = ` · RUNDE 5: stridsvogna skyter på et meldt mål den ikke ser: ${d5.skuddMeldt === 0 ? 'nei' : d5.skuddMeldt} (meldt: ${d5.meldt}), med et eget lag ved som ser det: ${d5.skuddNabo}${d5.skjult === false ? ' (fant ikke skjult punkt)' : ''}, fienden lagres («sist sett» ${d5.settTilbake}, marsjen fortsetter ${d5.marsjIgjen}), krigskartet kan skjules: ${d5.stripe === undefined ? 'ikke prøvd (ingen tettsteder)' : d5.stripe && d5.visIgjen ? 'ja (' + d5.høyStripe + ' px)' : 'NEI'}${d5.feil ? ' FEIL ' + d5.feil : ''}`;
  return { ok: ok && ok4 && ok5 && ok6 && ok7, tekst: tekst7 + tekst6 + tekst5.slice(3) + tekst4 + ' · ' + `ild i ryggen ×${(d.flanke || 0).toFixed(2)} (av i testene: ×${(d.av || 0).toFixed(2)}), laget snur seg: ${d.snudd}, to sårede gir fart ×${(d.fart || 0).toFixed(2)}, natt gir sikt ×${(d.natt || 0).toFixed(2)}, røyk ×${(d.røyk || 0).toFixed(2)}, knust lag ga seg: ${d.gaSeg}, fanger levert og avhørt: ${d.levert && d.avhørt}, etterretning: ${d.etter}, våpenhvile: ${d.fred && d.fredIld && d.brutt}, ${d.fører}, ${d.panel} tiltak, fienden lagres: ${d.lagret}, bak ekte hus ×${(d.hus || 0).toFixed(2)}, eget lag gir seg bare når valgt: ${d.holdt && d.egetGaSeg}, røvere som trekker seg unna avslutter bølgen: ${d.bølgeOver}`, data: d };
} };
