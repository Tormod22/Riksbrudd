// Vakt for pakka «maskinfolk» (28. nov, fase F3: maskinene trenger folk på riktig plass – spill/baering.js og baering-visning.js).
// Legger et ferdig sagbruk, en fyrkjele (med flis i innmatingen) og et lagertelt med tømmer i leiren, setter seks på «Maskiner» på dagskift,
// slår på døgnplanen i testen (JobberSpill.test) og kjører gangen og maskinene kl. 09:
//  - saga står («venter på folk» / «venter på tømmer») til en operatør står på bruksplassen OG en bærer har båret tømmer inn,
//  - operatørene må stå på plass (arbeidskraften er 0 før de er framme),
//  - en bærer finner en ny haug når den første forsvinner,
//  - utmatingen full stopper saga («utmatingen full») når lageret ikke har plass,
//  - jobbtavla viser bærejobbene, og fanen Produksjon viser bæringen.
// Med døgnplanen av (som i de andre testene) skal matingen tømmes tilbake i lageret. Setter alt tilbake.
module.exports = {
  navn: 'maskinfolk og bærere (F3)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand();
      if (!L || !F || !S || !window.Baering || !window.BaeringSpill || !window.ProduksjonSpill || !window.FolkgangSpill || !window.JobberSpill || typeof sim !== 'function') return { mangler: true };
      const bygg0 = L.bygg.slice(), lager0 = { ...L.lager }, opp0 = F.personer.map(p => [p.id, p.oppgave, p.ferd ? p.ferd.maskin : null]), tid0 = tid, tempo0 = tempo, neste0 = L.neste;
      const J = JobberSpill.tilstand(), skift0 = J.skift.maskin, døgn0 = J.døgn, test0 = JobberSpill.test, auto0 = J.auto;
      const lagret = ['riksbrudd-produksjon', 'riksbrudd-baering', 'riksbrudd-varer'].map(k => [k, localStorage.getItem(k)]), åpen0 = window.SelskapetSpill && SelskapetSpill.erÅpen();
      const vent = ms => new Promise(r => setTimeout(r, ms)), K9 = 3 * 60;
      const kjør = (sek, hver) => { for (let t = 0; t < sek; t += 10) { tid = K9; sim(10 / 60); tid = K9; FolkgangSpill.steg(10); if (hver && hver(t)) return t; } return null; };
      try {
        tempo = 0; J.auto = false;
        // (ut6-fiksd) vaktene før kan ha lagt et lukket gjerde uten port rundt leiren (sjekk.js, K2): da kommer ingen ut til lagerteltene.
        // Gjerder og porter tas bort mens vakta går (L.bygg settes tilbake i finally). At bærerne da gir opp, prøves i test_baering.js.
        L.bygg = L.bygg.filter(b => { const B = Leir.BYGG[b.type]; return !(B && ((B.linje && !B.veg) || B.port)); });
        const nyB = (type, dx, dy) => { const id = L.neste++; L.bygg.push({ id, type, x: S.leir.x + dx, y: S.leir.y + dy, ret: 0, igjen: 0, hp: 1, nivå: 1, pris: Leir.BYGG[type].pris, mat: {} }); return id; };
        const sid = nyB('sagbruk', 60, 60), kid = nyB('fyrkjele', 60, 85), tid1 = nyB('lagertelt', 88, 60);
        for (const k of Object.keys(L.lager)) if (['tømmer', 'tre', 'flis', 'ved'].includes(k)) L.lager[k] = 0; L.lager.tømmer = 12;
        if (window.VarelagerSpill) VarelagerSpill.avstem();
        F.personer.forEach(p => { if (p.oppgave === 'maskin') p.oppgave = 'fri'; });
        F.personer.filter(p => FolkRegler.arbeidsfør(p)).slice(0, 6).forEach(p => { p.oppgave = 'maskin'; });
        J.skift.maskin = 'dag'; J.døgn = true; JobberSpill.test = true; ProduksjonSpill.nullstill(); BaeringSpill.nullstill(); FolkgangSpill.nullstill();
        tid = K9; sim(.01);
        BaeringSpill.mating()[kid] = { inn: { flis: 4 }, ut: {} };
        ut.aktiv = BaeringSpill.aktiv();
        // 1. i starten: ingen står på bruksplassen, ingen tømmer i innmatingen – saga går ikke
        FolkgangSpill.steg(.5); ProduksjonSpill.steg(.01);
        const st0 = ProduksjonSpill.siste().status[sid];
        ut.start = { kraft: BaeringSpill.kraftPer()[sid] || 0, tekst: st0 && st0.tekst };
        ut.opPlass = ut.start.kraft === 0 && st0 && !st0.går;
        // 2. kjør til saga går: den skal ikke gå før tømmeret er båret inn og operatøren står på plass
        let gikkFør = false, innFør = null, stjålet = null;
        const gikk = kjør(1500, t => { const s = ProduksjonSpill.siste().status[sid], Bf = BaeringSpill.mating()[sid];
          if (innFør === null && Bf && (Bf.inn.tømmer || 0) > 0) innFør = t;
          if (s && s.går && (innFør === null || !(BaeringSpill.kraftPer()[sid] > 0))) gikkFør = true;
          // en tømmerhaug som en bærer har reservert, brenner opp (første gang)
          if (stjålet === null && window.VarelagerSpill) { const V = VarelagerSpill.V(), o = Object.values(BaeringSpill.tilstand().bær).find(q => q.retning === 'inn' && q.fase === 'hent' && q.enhet != null);
            const u = o && V && Varelager.finn(V, o.enhet); if (u) { stjålet = u.id; Varelager.brann(Leir, L, V, () => true, q => (q.id === u.id ? { x: 0, y: 0 } : null)); } }
          return s && s.går && t > 60 && BaeringSpill.tilstand().nyFunnet > 0; });
        ut.tall = { gikk, innFør, tekst: ProduksjonSpill.siste().status[sid].tekst, påPlass: BaeringSpill.tilstand().påPlass[sid], turer: BaeringSpill.tilstand().stat.turer, nyFunnet: BaeringSpill.tilstand().nyFunnet, venterTekst: ut.start.tekst };
        ut.venter = gikk !== null && innFør !== null && !gikkFør && /venter på (folk|tømmer)/.test(ut.start.tekst || '');
        ut.nyHaug = stjålet !== null && BaeringSpill.tilstand().nyFunnet >= 1;
        // jobbtavla viser bærejobbene
        const jm = JobberSpill.jobber().find(j => j.type === 'maskin');
        ut.tavle = !!jm && jm.hva.some(t => /^Bær /.test(t)); ut.tavleTekst = jm ? jm.hva.slice(0, 3) : null;
        // fanen Produksjon viser bæringen
        if (window.SelskapetSpill) { SelskapetSpill.vis(true, 'produksjon'); await vent(100); const t = (document.querySelector('#selskapet .skropp') || {}).textContent || '';
          ut.fane = /Bæring/.test(t) && /Innmating/.test(t) && /på plass/.test(t); } else ut.fane = true;
        // 3. utmatingen full: lageret er fullt for planker og flis, ingen kan bære ut
        const Mt = BaeringSpill.mating(), Bf = Mt[sid] || (Mt[sid] = { inn: {}, ut: {} }); Bf.ut.tre = 2.4; Bf.ut.flis = 1.6; Bf.inn.tømmer = 4;
        L.lager.tre = Leir.lagerplass(L); L.lager.flis = Leir.lagerplass(L); if (window.VarelagerSpill) VarelagerSpill.avstem();
        kjør(120);
        const sf = ProduksjonSpill.siste().status[sid];
        ut.fullt = !sf.går && sf.grunn === 'fullt' && /utmatingen full/.test(sf.tekst); ut.fulltTekst = sf.tekst;
        // 4. døgnplanen av: matingen tømmes tilbake i lageret, og maskinene går rett fra lageret som før
        L.lager.tre = 0; L.lager.flis = 0; if (window.VarelagerSpill) VarelagerSpill.avstem();
        JobberSpill.test = false; const før = L.lager.tømmer; sim(.01);
        const tom = Object.values(BaeringSpill.mating()).every(q => !Object.values(q.inn).some(m => m > 0) && !Object.values(q.ut).some(m => m > 0)) && !Object.keys(BaeringSpill.tilstand().bær).length;
        ut.av = !BaeringSpill.aktiv() && tom && L.lager.tømmer >= før + 3.9;
      } finally {
        JobberSpill.test = test0; J.skift.maskin = skift0; J.døgn = døgn0; J.auto = auto0;
        L.bygg = bygg0; L.neste = neste0; Object.assign(L.lager, lager0); for (const k of Object.keys(L.lager)) if (!(k in lager0)) delete L.lager[k];
        for (const [id, o, m] of opp0) { const p = F.personer.find(q => q.id === id); if (p) { p.oppgave = o; if (p.ferd && m !== null) p.ferd.maskin = m; } }
        tid = tid0; tempo = tempo0; ProduksjonSpill.nullstill(); BaeringSpill.nullstill(); FolkgangSpill.nullstill();
        if (window.VarelagerSpill) { VarelagerSpill.avstem(); }
        if (window.SelskapetSpill && !åpen0) SelskapetSpill.vis(false);
        for (const [k, v] of lagret) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* */ } }
        if (window.VarelagerSpill && VarelagerSpill.last) try { VarelagerSpill.last(); } catch (e) { /* */ }
        if (LeirSpill.lagre) LeirSpill.lagre(); skitten = true;
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'maskinfolk mangler (Baering, BaeringSpill, ProduksjonSpill, FolkgangSpill, JobberSpill eller sim)', data: d };
    const del = ['aktiv', 'opPlass', 'venter', 'nyHaug', 'tavle', 'fane', 'fullt', 'av'], feil = del.filter(k => !d[k]);
    return { ok: !feil.length, tekst: feil.length ? 'feilet: ' + feil.join(', ') + ' ' + JSON.stringify({ tall: d.tall, start: d.start, full: d.fulltTekst, tavle: d.tavleTekst })
      : `saga venter («${d.start.tekst}») til operatøren står på plass og tømmeret er båret inn (${d.tall.innFør} s), ny haug når den første forsvant, «${d.fulltTekst}», bærejobbene på tavla, døgnplanen av = som før (${profil})`, data: d };
  },
};
