// Vakt for pakka «ut5-rivaler» (fase Ø8, 28. nov; docs/natt/ut5-rivaler.md): rivalene bruker de samme systemene som spilleren.
// 1) RÅD TIL LAG: med RivalSpill.test har en rik Ravnsund (kassa 30 mill.) høyere tak for lag enn en fattig (kassa 0, uten inntekt) –
//    og i testene uten flagget er taket som før (AI.rådTak gir grunntaket);
// 2) BYAVTALE: Ravnsund får beskyttelse med en by (forhandlingen ferdig), holder ikke løftet (ingen mann der) – byen sier opp etter tre brudd;
// 3) FIRMA: to kontrakter Ravnsund tar fra Storlia Tømmer gjør dem til fast kunde (Firma.rivalKunde), og dere kan ikke bli det samtidig;
// 4) VEIEN: den valgte veien står i krigskartets linje («Ravnsund satser på penger») og i Partnere;
// 5) SABOTASJE: skjer ikke av seg selv i testene (RivalSpill.test av: sabotér gir null), men med flagget og tving rammes lageret/maskinen.
// Setter alt tilbake: kassa til rivalene, byavtalene, firmaene, selskapet, leirens lager, lagene, lagringen og flagget.
module.exports = {
  navn: 'ut5-rivaler',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const RS = window.RivalSpill, ES = window.EskaleringSpill, BS = window.ByavtaleSpill, BA = window.Byavtale, FS = window.FirmaSpill, Fi = window.Firma, SS = window.SelskapSpill, LS = window.LeirSpill;
    if (!RS || !ES || !BS || !BA || !FS || !Fi || !SS || !LS || !window.AI) return { ok: false, tekst: 'RivalSpill, EskaleringSpill, ByavtaleSpill, FirmaSpill, SelskapSpill eller LeirSpill mangler', data: {} };
    if (FS.start) FS.start();
    const E = ES.S(), BT = BS.tilstand(), FT = FS.tilstand(), ST = SS.tilstand(), L = LS.tilstand();
    if (!E || !BT || !FT || !ST || !L) return { ok: false, tekst: 'en av tilstandene mangler (eskalering, byavtale, firma, selskap, leir)', data: {} };
    const før = { øk: JSON.stringify(E.øk), BT: JSON.stringify(BT), FT: Fi.tilJSON(FT), ST: JSON.stringify({ tilbud: ST.tilbud, sider: ST.sider }), tilbud: ST.tilbud.slice(), lager: JSON.stringify(L.lager), bygg: JSON.stringify(L.bygg.map(b => [b.id, b.hp])),
      enh: ENHETER.slice(), test: RS.test, rv: JSON.stringify(RS.S()), lagring: Object.keys(localStorage).filter(n => /^riksbrudd-(rival|byavtale|firma|selskap|k2|eskalering)/.test(n)).map(n => [n, localStorage.getItem(n)]),
      logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null };
    let lagetInfra = false; if (typeof INFRA !== 'undefined' && !INFRA) { INFRA = {}; for (const k of ['felt', 'tettsted', 'magasin', 'ror', 'ferje', 'tunnel', 'dam', 'bru', 'ferjekai', 'kraft', 'olje', 'kai']) INFRA[k] = []; lagetInfra = true; }
    if (!INFRA.tettsted) INFRA.tettsted = [];
    const Lr = OppstartSpill.tilstand().leir, bx = Lr.x + 8000, by0 = Lr.y, PRØVE = { lag: 'tettsted', e: { id: 'ut5a', navn: 'Vakt ut5a', folk: 2500 }, bb: [bx - 300, by0 - 300, bx + 300, by0 + 300], deler: [[bx - 300, by0 - 300, bx + 300, by0 - 300, bx + 300, by0 + 300, bx - 300, by0 + 300]] };
    INFRA.tettsted.push(PRØVE);
    try {
      // ---------- 1) råd til lag ----------
      RS.test = false; krev(AI.rådTak('rød', 6) === 6, 'uten testflagget skal taket være som før');
      d.utenFlagg = RS.sabotér('rød'); krev(d.utenFlagg === null || d.utenFlagg === undefined, 'sabotasje skjedde i testene uten flagget');
      RS.test = true;
      E.øk.rød.kr = 30e6; const rik = RS.tak('rød', 6); E.øk.rød.kr = 0; const fattig = RS.tak('rød', 6); d.tak = { rik, fattig };
      krev(rik > fattig, `en rik rival skal ha flere lag enn en fattig (${rik} mot ${fattig})`);
      // ---------- 2) byavtale: får den og mister den ----------
      // et prøvetettsted 8 km fra leiren (Dovre-testsiden har ingen tettsteder; tas bort etterpå)
      const omr = BS.område(); d.byer = omr.length; const by = omr.find(b => b.id === 'ut5a'); krev(by, 'prøvetettstedet er ikke med i området');
      if (by) { const b = BA.by(BT, String(by.id)); b.avtale = null; b.rival = null; b.forhandler = null; delete b.rivalStengt;
        BA.rivalFrir(b, 'rød', by.folk, tid - 2000, 'redd'); const r = BA.rivalSteg(b, tid); krev(r === 'rival' && b.rival && b.rival.trinn === 'beskyttelse', 'Ravnsund fikk ikke beskyttelsesavtalen');
        // ingen røde lag i nærheten: løftet brytes hver time, og byen sier opp etter tre døgn
        const røde = ENHETER.filter(e => e.side === 'rød'); for (const e of røde) ENHETER.splice(ENHETER.indexOf(e), 1);
        let opp = null; for (let dg = 0; dg < 4 && b.rival; dg++) { for (let h = 0; h < 24; h++) RS.time(60); const u = RS.byDøgn('rød'); if (u.some(q => q.sierOpp)) opp = u.find(q => q.sierOpp); }
        d.byOpp = opp; krev(opp && !b.rival && b.rivalStengt && b.rivalStengt.side === 'rød', 'byen sa ikke opp Ravnsund da de ikke holdt løftet');
        krev(RS.meldinger.some(t => /sagt opp avtalen med Ravnsund/.test(t)), 'du fikk ikke beskjed om oppsigelsen');
        for (const e of røde) ENHETER.push(e); }
      // ---------- 3) firma: fast kunde ----------
      const st = Fi.finn(FT, 'Storlia Tømmer'); st.fast = null; st.rival = null;
      for (let i = 0; i < 2; i++) { const k = { id: 'vakt-ut5-' + i, type: 'hold', status: 'åpen', tittel: 'Vakt-oppdrag', giver: { slag: 'firma', navn: 'Storlia Tømmer' }, betaling: 5e5, utløper: tid + 1e5 };
        ST.tilbud.push(k); RS.kontrakter(); krev(RS.tarTilbud('rød', k, ''), 'Ravnsund tok ikke tilbudet'); RS.kontrakter(); }
      d.kunde = Fi.rivalKunde(st, tid); krev(d.kunde === 'rød', 'Ravnsund ble ikke fast kunde hos Storlia etter to kontrakter');
      st.holdning = 70; st.levert = 3; krev(!Fi.kanSamarbeid(FT, st, 'fast').ok, 'dere kunne bli fast kunde mens Ravnsund er det');
      krev(/Ravnsund er fast kunde/.test(Fi.rivalTekst(st, tid)), 'Partnere-teksten for firmaet mangler rivalen');
      // ---------- 4) veien vises ----------
      RS.settVei('rød', 'penger'); const KT = window.KRIG_TILLEGG, linjer = KT && KT.side ? KT.side.map(f => { try { return f('rød'); } catch (e) { return null; } }).filter(Boolean) : [];
      d.krig = linjer.filter(t => typeof t === 'string'); krev(d.krig.some(t => /Ravnsund satser på penger/.test(t)), 'krigskartet viser ikke rivalens vei');
      d.partner = RS.partnerTekst('rød'); krev(/satser på penger/.test(d.partner) && /fast kunde hos Storlia/.test(d.partner), 'Partnere viser ikke rivalens vei og kunde');
      const vv = RS.velgVei('grønn'); krev(['makt', 'penger', 'gjenoppbygging'].includes(vv), 'velgVei ga ingen vei');
      // ---------- 5) sabotasje med flagget ----------
      L.lager.tre = Math.max(L.lager.tre || 0, 20); const tre0 = L.lager.tre;
      const sab = RS.sabotér('grønn', { tving: true, stopp: false }); d.sab = sab;
      krev(sab && !sab.stoppet && (sab.slag === 'maskin' || L.lager[sab.vare] < (sab.vare === 'tre' ? tre0 : 1e9)), 'sabotasjen rammet ikke leiren');
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      Object.assign(E.øk, JSON.parse(før.øk)); const bt = BA.fraJSON(JSON.parse(før.BT)); BT.byer = bt.byer;
      FS.sett(JSON.parse(JSON.stringify(før.FT))); const st0 = JSON.parse(før.ST); ST.tilbud.length = 0; for (const k of før.tilbud) ST.tilbud.push(k); ST.sider = st0.sider;
      Object.assign(L.lager, JSON.parse(før.lager)); for (const [id, hp] of JSON.parse(før.bygg)) { const b = L.bygg.find(q => q.id === id); if (b) b.hp = hp; }
      ENHETER.length = 0; for (const e of før.enh) ENHETER.push(e); RS.sett(JSON.parse(før.rv)); RS.test = før.test;
      for (const n of Object.keys(localStorage)) if (/^riksbrudd-(rival|byavtale|firma|selskap|k2|eskalering)/.test(n)) localStorage.removeItem(n);
      for (const [n, v] of før.lagring) localStorage.setItem(n, v);
      if (før.logg && typeof loggLinjer !== 'undefined') { loggLinjer.length = 0; for (const l of før.logg) loggLinjer.push(l); }
      INFRA.tettsted = INFRA.tettsted.filter(t => t !== PRØVE); if (lagetInfra) INFRA = null;
      skitten = true; }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `rik ${d.tak.rik} lag mot fattig ${d.tak.fattig}; ${d.byOpp ? d.byOpp.by + ' sa opp Ravnsund' : ''}; Ravnsund fast kunde hos Storlia; «${d.krig[0]}»; sabotasje: ${d.sab ? d.sab.slag : '–'}`, data: d };
  }),
};
