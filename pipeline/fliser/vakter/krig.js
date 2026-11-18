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
      if (window.SpilletSpill && SpilletSpill.T()) { const Sp = SpilletSpill, Tr = Sp.T(), T1 = JSON.stringify(Tr), kr1 = OppstartSpill.tilstand().penger, F1 = window.FolkSpill && FolkSpill.tilstand(), mo = F1 ? F1.moral : 0;
        Tr.aktiv = 0; await Sp.angrep(); const rl = ENHETER.filter(q => q.raid === Tr.aktiv); for (let i = 0; i < 40 && rl.some(q => q.planlegger); i++) await new Promise(r => setTimeout(r, 250));
        for (const q of rl) { q.sti = null; q.x = L.x + 3900; q.y = L.y; } Sp.angrepSteg(); ut.bølgeVenter = Tr.aktiv > 0 && rl.length > 0; tid += 31; Sp.angrepSteg(); ut.bølgeOver = Tr.aktiv === 0 && !ENHETER.some(q => q.raid) && OppstartSpill.tilstand().penger > kr1;
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
  Object.assign(d, { r4: d4 });
  const ok4 = !d4.feil && d4.dekning < .7 && Math.abs(d4.dekningAv - 1) < 1e-9 && d4.dekningTekst && d4.bytt && (d4.byttEgne === undefined || (d4.byttEgne && d4.arbeid && d4.ikkeEnnå && d4.spør && d4.forslag)) && d4.lagring && d4.krig3d && d4.ryddet && (d4.svarer === undefined || (d4.svarer && d4.ikkeUtenGrunn));
  const ok = !d.feil && d.flanke > 1.4 && Math.abs(d.av - 1) < 1e-9 && d.snudd && d.fart < .9 && d.natt < .6 && d.nattsikt > 1.5 && d.røyk < .5 && d.gaSeg && d.levert && d.avhør && d.etter && d.avhørt && d.meny
    && (d.fred === undefined || (d.fred && d.fredIld && d.brutt)) && /fører: .+\(.+\)/.test(d.fører) && d.knapp && d.panel >= 6 && d.lagret && d.ryddet && d.hus < .75 && d.holdt && d.egetGaSeg && d.krig3d && d.stridsvalg && (d.bølgeOver === undefined || (d.bølgeVenter && d.bølgeOver));
  const tekst4 = ` · RUNDE 4: dekning bak egen brakke ×${(d4.dekning || 0).toFixed(2)}, bytte ${!!d4.bytt}/${d4.byttEgne}, fanger i arbeid ${d4.arbeid}, rekruttering ${d4.spør}, forslag om bytte ${d4.forslag}, svarer kjøretøy som skyter ${d4.svarer}, lagring ${d4.lagring}${d4.feil ? ' FEIL ' + d4.feil : ''}`;
  return { ok: ok && ok4, tekst: tekst4.slice(3) + ' · ' + `ild i ryggen ×${(d.flanke || 0).toFixed(2)} (av i testene: ×${(d.av || 0).toFixed(2)}), laget snur seg: ${d.snudd}, to sårede gir fart ×${(d.fart || 0).toFixed(2)}, natt gir sikt ×${(d.natt || 0).toFixed(2)}, røyk ×${(d.røyk || 0).toFixed(2)}, knust lag ga seg: ${d.gaSeg}, fanger levert og avhørt: ${d.levert && d.avhørt}, etterretning: ${d.etter}, våpenhvile: ${d.fred && d.fredIld && d.brutt}, ${d.fører}, ${d.panel} tiltak, fienden lagres: ${d.lagret}, bak ekte hus ×${(d.hus || 0).toFixed(2)}, eget lag gir seg bare når valgt: ${d.holdt && d.egetGaSeg}, røvere som trekker seg unna avslutter bølgen: ${d.bølgeOver}`, data: d };
} };
