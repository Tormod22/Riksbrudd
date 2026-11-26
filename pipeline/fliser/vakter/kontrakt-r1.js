// VAKT «kontraktene etter kritikken» (R1-løkka 26. nov, docs/kritikk/2026-11-26-r1-*.md):
//  1) den første kontrakten er trygg: nødlageret ligger nær leiren (innen 35 % av håndradioens rekkevidde, så terrenget ikke bryter
//     kontakten), utenfor alle tettsteder, og tittelen har aldri «i nødlageret»;
//  2) et brudd på den gir ingen ros og ingen «fullført» – loggen sier hva som skjedde, og nye tilbud kommer;
//  3) bygdevernet regner ikke et lag på oppdrag for bygda/kommunen der som fiende (KrigSpill.fiendtligeByer, StrategiSpill.vern);
//  4) en marsj gjennom et fiendtlig tettsted går utenom (KROKER.rute) – her Dombås med bygdevernet;
//  5) kontraktkortet bruker krigskartets vurdering («For svakt»), 6) nylige tap trekker ned forslaget i Krig, 7) overskriften har
//     flaggets farge, og de tre selskapene har hver sin ryktetekst.
// Setter alt tilbake (selskapet, lagringen, penger, folk, lag, tid, krig og strategi).
module.exports = { navn: 'kontraktene etter kritikken (R1): trygg første kontrakt, brudd, bygdevern, ruter, vurdering, tap', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [], ok: [] }, krev = (b, t) => { if (!b) ut.feil.push(t); else ut.ok.push(t); };
    const SS = window.SelskapSpill, SK = window.Selskap, KS = window.KrigSpill, ST = window.StrategiSpill;
    if (!SS || !SK || !SS.lagerPlass || !KS || !KS.fiendtligeByer || !ST) { krev(false, 'API mangler'); return ut; }
    const før = SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, lagretFør = localStorage.getItem(SS.NØKKEL), testFør = SS.test, ktFør = KS.test;
    const stFør = localStorage.getItem('riksbrudd-strategi'), krigFør = JSON.stringify(KS.T().vern || {});
    const pengerFør = OppstartSpill.tilstand().penger, tidFør = tid, F = FolkSpill.tilstand(), folkFør = JSON.stringify(F.personer), lagFør = ENHETER.slice(), loggFør = window.logg, linjer = [];
    let tetFør = null; const L = OppstartSpill.tilstand().leir, byer = (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [];
    try {
      SS.test = true;
      // 1) den første kontrakten
      const k = SS.førsteKontrakt(true), dL = Math.hypot(k.sted.x - L.x, k.sted.y - L.y), rek = (window.Kontrollrom ? Kontrollrom.RADIO.hånd.meter * Kontrollrom.REGLER.terreng : 1050);
      krev(k && k.sted.slag === 'lager' && dL <= rek + 1, `nødlageret ${Math.round(dL)} m fra leiren (høyst ${Math.round(rek)})`);
      const nærBy = byer.length ? Math.min(...byer.map(b => Garnison.avstand(b, k.sted.x, k.sted.y))) : Infinity;
      krev(nærBy >= SK.REGLER.første.utenfor - 1, `nødlageret ${Math.round(nærBy)} m utenfor nærmeste tettsted`);
      krev(!/i nødlageret/i.test(k.tittel) && /Hent nødlageret/.test(k.tittel), 'tittel: ' + k.tittel); ut.tittel = k.tittel;
      // 2) brudd: ingen ros, ingen «fullført»
      window.logg = t => { linjer.push(String(t)); return loggFør(t); };
      SS.ta(k.id); F.personer.forEach(p => { p.helse = 1; }); const r = TropperSpill.opprett(F.personer.slice(0, 3).map(p => p.id), 'Vakttropp R1', 'standard', null), s = r && r.lag;
      krev(s, 'troppen ble ikke laget'); if (s) { s.x = k.sted.x + 5; s.y = k.sted.y; s.sti = null; SS.steg(1); SS.oppdaterTråd(); for (let i = 0; i < 4; i++) SS.lapp();
        krev(linjer.filter(t => /har lastet nødlageret/.test(t)).length === 1, '«har lastet nødlageret» står ' + linjer.filter(t => /har lastet nødlageret/.test(t)).length + ' ganger');
        for (const m of s.menn) m.hp = 0; SS.steg(1); SS.oppdaterTråd(); SS.steg(1); SS.oppdaterTråd(); }
      krev(linjer.some(t => /Kontrakt brutt/.test(t)) && !linjer.some(t => /vokst|fullført/.test(t)), 'loggen etter bruddet: ' + linjer.slice(-3).join(' | '));
      const lp = SS.lapp(); krev(lp && /gikk galt/.test(lp.hjelp || '') && (SS.tilstand().tilbud.length > 0 || linjer.some(t => /kontrakter kommer i morgen/.test(t))), 'lappen etter bruddet: ' + (lp && lp.hjelp));
      window.logg = loggFør;
      // 3) bygdevernet og oppdraget: en hold-kontrakt for kommunen i et tettsted gjør stedet fredelig for egne lag
      const by = byer[0];
      // tettstedet gjøres nøytralt med et bygdevern som ikke er møtt (settes tilbake etterpå)
      if (by) { delete KS.T().vern[by.e.id]; tetFør = [by.e.id, TETTSTEDER.get(by.e.id)]; TETTSTEDER.delete(by.e.id); }
      if (by) { const S = SS.tilstand(), før3 = KS.fiendtligeByer([]).some(b => b.by === by);
        const hk = { id: 'vakt-h', type: 'hold', giver: { slag: 'by', navn: 'Kommunen i ' + by.e.navn, by: by.e.id }, status: 'aktiv', timer: 10, hold: 4, betaling: 1, bot: 0, frist: tid + 600, framdrift: 0,
          sted: { navn: by.e.navn, x: (by.bb[0] + by.bb[2]) / 2, y: (by.bb[1] + by.bb[3]) / 2, slag: 'tettsted', id: by.e.id }, nivå: 1, tittel: 'Hold (vakt)' };
        S.sider.blå.aktive.push(hk); const etter3 = KS.fiendtligeByer([]).some(b => b.by === by), v = ST.vern({ id: by.e.id, folk: by.e.folk, navn: by.e.navn });
        krev(før3 && !etter3 && SS.oppdragFor(by.e.id) === hk && (!v || v.mann === 0), `bygdevernet i ${by.e.navn}: fiendtlig før (${før3}), i fred under oppdraget (${!etter3})`);
        S.sider.blå.aktive = S.sider.blå.aktive.filter(q => q !== hk);
        // 4) ruta går utenom tettstedet (KrigSpill.test slår kroken på)
        KS.test = true; const lag = nyttLag('Vaktlag R1', by.bb[0] - 600, (by.bb[1] + by.bb[3]) / 2, 'blå'); ENHETER.push(lag);
        await ordre(lag, by.bb[2] + 600, (by.bb[1] + by.bb[3]) / 2, true); const gj = lag.sti ? KS.ruteGjennom(lag.sti, [[lag.x, lag.y]]) : null;
        krev(lag.sti && gj && !gj.some(b => b.by === by), `marsjen gjennom ${by.e.navn} går utenom (${lag.sti ? lag.sti.length + ' punkter' : 'ingen rute'})`);
        // advarselen i Krig før ordren
        const fa = ST.farer({ id: 'vakt-mål', navn: 'Målet', x: by.bb[2] + 600, y: (by.bb[1] + by.bb[3]) / 2, folk: 0 }, [lag], null);
        krev(fa.some(f => f.id === 'rute' && f.gjennom && new RegExp(by.e.navn).test(f.tekst)), 'Krig advarer om ruta gjennom ' + by.e.navn);
        KS.test = ktFør; }
      else ut.ok.push('ingen tettsteder: 3–4 hoppet over');
      // 5) kontraktkortet bruker krigskartets vurdering
      const kt = SK.kanTa({ type: 'hold', nivå: 1 }, { størsteLag: 4, kjøretøy: 0, forsvar: 5 }, SS.tilstand().sider.blå); krev(kt.ok && kt.advarsel.length && /For svakt/.test(kt.advarsel[0]), 'kanTa gir «For svakt»');
      // 6) nylige tap
      const tp = Strategi.trekk('blå', [{ id: 'a', navn: 'A', x: L.x + 3000, y: L.y, folk: 900 }, { id: 'b', navn: 'B', x: L.x - 9000, y: L.y, folk: 900 }], () => null, [{ x: L.x, y: L.y, mann: 8 }], [], undefined, { liste: [{ x: L.x + 3000, y: L.y, tid: tid, navn: 'Prøve' }], nå: tid + 30 });
      krev(tp[0].by.id === 'b' && tp[1].tapt, 'tapet trekker ned forslaget');
      // 7) overskriften og ryktetekstene
      SS.vis(true); await new Promise(r => setTimeout(r, 300)); const kode = document.querySelector('#selskap .kode'), riv = [...document.querySelectorAll('#selskap .rival .rad span:first-child')].map(e => e.textContent).filter(t => /^Folk sier/.test(t));
      const own = SK.rykteTekst(SS.tilstand().sider.blå.rykte); SS.vis(false);
      // (fletting r1) overskriften skal ha flaggets farge (SelskapSpill.fargeord) – ikke sidens navn; med et blått flagg er «blå» riktig
      const fo = SS.fargeord ? SS.fargeord() : ''; krev(kode && (fo ? kode.textContent.trim().toLowerCase().endsWith('· ' + fo.toLowerCase()) : !/·/.test(kode.textContent)) && new Set([own.replace('dere er', 'de er'), ...riv]).size === 3 && !riv.some(t => /er holder ord/.test(t)), 'overskrift «' + (kode && kode.textContent) + '», rykter: ' + riv.join(' / '));
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally {
      window.logg = loggFør; SS.vis(false); SS.test = testFør; KS.test = ktFør;
      for (let i = ENHETER.length - 1; i >= 0; i--) if (!lagFør.includes(ENHETER[i])) ENHETER.splice(i, 1);
      F.personer.length = 0; for (const p of JSON.parse(folkFør)) F.personer.push(p);
      const brukt = OppstartSpill.tilstand().penger - pengerFør; if (brukt > 0) OppstartSpill.betal(brukt); else if (brukt < 0) OppstartSpill.gi(-brukt);
      tid = tidFør; if (før) SS.sett(JSON.parse(før)); else SS.sett(null);
      try { if (lagretFør === null) localStorage.removeItem(SS.NØKKEL); else localStorage.setItem(SS.NØKKEL, lagretFør); if (stFør === null) localStorage.removeItem('riksbrudd-strategi'); else localStorage.setItem('riksbrudd-strategi', stFør); } catch (e) { /* */ }
      try { const V = KS.T().vern; for (const k of Object.keys(V)) delete V[k]; Object.assign(V, JSON.parse(krigFør)); KS.lagre && KS.lagre(); } catch (e) { /* */ }
      if (tetFør) { if (tetFør[1]) TETTSTEDER.set(tetFør[0], tetFør[1]); else TETTSTEDER.delete(tetFør[0]); }
      skitten = true;
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `«${d.tittel}», ${d.ok.length} sjekker ok`, data: d };
} };
