// Vakt for pakka «kjeder» (ut6, 28. nov, fase Ø9: flere kjeder, lån og avis – spill/kjeder.js, laan.js, avis.js, kjeder-visning.js og de nye
// maskinene i spill/produksjon.js). Legger en steinknuser, en mølle og et raffineri i leiren med strøm (aggregater med diesel) og folk på
// «Maskiner», kjører simuleringen (sim) og sjekker at steinknuseren lager pukk av stein, mølla mel av korn og raffineriet diesel av olje
// (dieselen går i tanken). Tar et lån hos lånehaien (kassa øker) og lar et døgn gå (renten legges til gjelden), og lager dagens avis.
// Sjekker også plassreglene (steinbrudd ved fjell, fiskemottak med fryselager) og at byggelista har de nye maskinene.
// Setter alt tilbake: byggene, lageret, dieselen, oppgavene, tida, kassa, lånene, avisa og tellingene.
module.exports = {
  navn: 'flere kjeder, lån og avis (Ø9)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand();
      if (!L || !F || !S || !window.Kjeder || !window.KjedeSpill || !window.Laan || !window.Avis || typeof sim !== 'function') return { mangler: true };
      const bygg0 = L.bygg.slice(), lager0 = { ...L.lager }, diesel0 = L.drivstoff, opp0 = F.personer.map(p => [p.id, p.oppgave]), tid0 = tid, tempo0 = tempo, neste0 = L.neste, penger0 = S.penger;
      const lån0 = JSON.stringify(KjedeSpill.lån()), avis0 = KjedeSpill.avis(), N = ['riksbrudd-laan', 'riksbrudd-avis', 'riksbrudd-produksjon'], lagret0 = N.map(n => localStorage.getItem(n));
      try {
        tempo = 0;
        const nyB = (type, dx, dy, nivå = 1) => { const id = L.neste++; L.bygg.push({ id, type, x: S.leir.x + dx, y: S.leir.y + dy, ret: 0, igjen: 0, hp: 1, nivå, pris: Leir.BYGG[type].pris, mat: {} }); return id; };
        // byggelista og plassreglene
        const G = (window.LEIR2_GRUPPER || []).find(g => g[0] === 'Produksjon');
        ut.liste = !!G && ['steinbrudd', 'steinknuser', 'fiskemottak', 'mølle', 'raffineri', 'smie'].every(t => G[1].includes(t) && Leir.BYGG[t] && Produksjon.REGLER.maskiner[t]);
        ut.plass = /fjell/.test(Kjeder.plassFeil('steinbrudd', { x: 0, y: 0 }, { høyde: () => 500 }) || '') && /fryselager/.test(Kjeder.plassFeil('fiskemottak', { x: 0, y: 0 }, { fryselager: false }) || '')
          && typeof Leir.kanByggeEkstra === 'function';
        // strøm: tre aggregater på nivå 3 og en tank med diesel
        for (let i = 0; i < 3; i++) nyB('aggregat', -90 - i * 6, 80, 3); nyB('drivstofftank', -120, 80, 3); L.drivstoff = 15000;
        const kn = nyB('steinknuser', 80, 80), mø = nyB('mølle', 80, 110), ra = nyB('raffineri', 110, 80);
        L.lager.stein = 10; L.lager.korn = 6; L.lager.olje = 3; L.lager.pukk = 0; L.lager.mel = 0;
        F.personer.filter(p => FolkRegler.arbeidsfør(p)).slice(0, 8).forEach(p => { p.oppgave = 'maskin'; });
        ProduksjonSpill.nullstill();
        for (let i = 0; i < 10; i++) sim(6);
        const st = ProduksjonSpill.siste().status, P = ProduksjonSpill.tilstand();
        ut.tall = { pukk: +(L.lager.pukk || 0).toFixed(2), stein: +(L.lager.stein || 0).toFixed(2), mel: +(L.lager.mel || 0).toFixed(2), diesel: +(P.laget.diesel || 0).toFixed(1), iLager: +(L.lager.diesel || 0).toFixed(1),
          grunn: [kn, mø, ra].map(i => st[i] && st[i].tekst) };
        ut.pukk = L.lager.pukk > .3 && L.lager.stein < 10;
        ut.mel = L.lager.mel > .1 && L.lager.korn < 6;
        ut.diesel = P.laget.diesel > 3 && L.lager.olje < 3 && (L.lager.diesel || 0) < 1;
        // lån hos lånehaien: kassa øker, og et døgn senere er renten lagt til gjelden
        const før = S.penger, r = KOMMANDO({ type: 'laanTa', kilde: 'hai', beløp: 2e6 });
        ut.lån = !!(r.ok && S.penger - før === 2e6);
        const l = KjedeSpill.lån().lån.find(q => q.kilde === 'hai'); if (l) { l.sistDag -= 1; l.start -= 1; }
        const m = KjedeSpill.morgen(true); ut.renter = !!(l && m && m.renter && m.renter.renter === 60000 && l.gjeld === 2060000);
        // avisa
        const a = m && m.avis; ut.avis = !!(a && /^Fjellposten/.test(a.tekst) && a.tittel.length > 5 && Avis.linje(a).startsWith('Fjellposten: '));
        ut.avisTekst = a && a.tekst;
      } finally {
        L.bygg = bygg0; L.neste = neste0; Object.assign(L.lager, lager0); for (const k of Object.keys(L.lager)) if (!(k in lager0)) delete L.lager[k]; L.drivstoff = diesel0;
        for (const [id, o] of opp0) { const p = F.personer.find(q => q.id === id); if (p) p.oppgave = o; }
        tid = tid0; tempo = tempo0; S.penger = penger0; ProduksjonSpill.nullstill(); KjedeSpill.sett(JSON.parse(lån0)); KjedeSpill.nullstill(); KjedeSpill.sett(JSON.parse(lån0));
        if (avis0) { /* den gamle utgaven var ikke en del av testen */ }
        N.forEach((n, i) => { try { if (lagret0[i] === null) localStorage.removeItem(n); else localStorage.setItem(n, lagret0[i]); } catch (e) { /* */ } });
        KjedeSpill.les(); if (LeirSpill.lagre) LeirSpill.lagre(); skitten = true;
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'kjedene mangler (Kjeder, KjedeSpill, Laan, Avis, LeirSpill eller sim)', data: d };
    const del = ['liste', 'plass', 'pukk', 'mel', 'diesel', 'lån', 'renter', 'avis'], feil = del.filter(k => !d[k]);
    return { ok: !feil.length, tekst: feil.length ? 'feilet: ' + feil.join(', ') + ' ' + JSON.stringify(d.tall) : `pukk av stein, mel av korn, diesel av olje (${JSON.stringify(d.tall)}); lån og renter; avisa: «${(d.avisTekst || '').slice(0, 90)}»`, data: d };
  },
};
