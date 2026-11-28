// Vakt for pakka «sagbruk» (28. nov, fase Ø1: varer og sagbruk – spill/produksjon.js og produksjon-visning.js).
// Legger et ferdig sagbruk og en fyrkjele i leiren, setter fire på «Maskiner» og kjører simuleringen (sim): uten tømmer står saga med
// grunnen «tom for tømmer» (og timen telles til «hvorfor saga sto»), med tømmer går den og lager planker og flis, kjelen gir strøm.
// Sjekker også at «tre» heter Planker, at tømmeret har egen lagerplass, at hogst gir tømmer og at fanen Produksjon viser saga.
// Setter alt tilbake: byggene, lageret, oppgavene, tida, tellingene og om panelet var åpent.
module.exports = {
  navn: 'sagbruk og varer (Ø1)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand();
      if (!L || !F || !S || !window.Produksjon || !window.ProduksjonSpill || typeof sim !== 'function') return { mangler: true };
      const bygg0 = L.bygg.slice(), lager0 = { ...L.lager }, opp0 = F.personer.map(p => [p.id, p.oppgave]), tid0 = tid, tempo0 = tempo, neste0 = L.neste;
      const P0 = JSON.stringify(ProduksjonSpill.tilstand()), åpen0 = window.SelskapetSpill && SelskapetSpill.erÅpen(), lagret0 = localStorage.getItem('riksbrudd-produksjon');
      const vent = ms => new Promise(r => setTimeout(r, ms));
      try {
        tempo = 0;
        ut.varer = Leir.MATERIALER.tre.navn === 'Planker' && Leir.MATERIALER.tømmer && Leir.MATERIALER.flis && Leir.MATERIALER.ved && Leir.leggInn({ ...L, lager: { ...L.lager, tømmer: 0 } }, 'tømmer', 1) === 1;
        ut.hogst = Ressurser.hogstUtbytte(30, 1).mat.tømmer > 0 && !(Ressurser.hogstUtbytte(30, 1).mat.tre > 0);
        ut.oppgave = FolkRegler.OPPGAVER.includes('maskin') && Kommando.finnes('maskin');
        const nyB = (type, dx, dy) => { const id = L.neste++; L.bygg.push({ id, type, x: S.leir.x + dx, y: S.leir.y + dy, ret: 0, igjen: 0, hp: 1, nivå: 1, pris: Leir.BYGG[type].pris, mat: {} }); return id; };
        const sid = nyB('sagbruk', 70, 70), kid = nyB('fyrkjele', 95, 70);
        L.lager.tømmer = 0; L.lager.flis = 3; L.lager.tre = 0;
        F.personer.filter(p => FolkRegler.arbeidsfør(p)).slice(0, 4).forEach(p => { p.oppgave = 'maskin'; });
        ProduksjonSpill.nullstill();
        // uten tømmer: saga står, grunnen er «tom for tømmer», og tida telles; kjelen går på flisen
        for (let i = 0; i < 6; i++) sim(5);
        let st = ProduksjonSpill.siste().status;
        ut.tom = st[sid] && !st[sid].går && st[sid].grunn === 'tom' && st[sid].tekst === 'tom for tømmer' && ProduksjonSpill.tilstand().sto.tom > .2;
        ut.kjele = st[kid] && st[kid].går && ProduksjonSpill.siste().kw > 29;
        // med tømmer: saga går (folk, strøm fra kjelen) og lager planker og flis
        L.lager.tømmer = 20; const flis0 = L.lager.flis;
        for (let i = 0; i < 6; i++) sim(5);
        st = ProduksjonSpill.siste().status;
        ut.går = st[sid] && st[sid].går && L.lager.tre > .3 && L.lager.tømmer < 20 && ProduksjonSpill.tilstand().laget.flis > .2;
        ut.tall = { tre: Math.round(L.lager.tre * 100) / 100, tømmer: Math.round(L.lager.tømmer * 100) / 100, flis: Math.round((L.lager.flis - flis0) * 100) / 100, kw: ProduksjonSpill.siste().kw, grunn: st[sid] && st[sid].tekst };
        // uten folk: «ingen folk»
        for (const p of F.personer) if (p.oppgave === 'maskin') p.oppgave = 'fri';
        for (let i = 0; i < 3; i++) sim(5);
        st = ProduksjonSpill.siste().status; ut.folk = st[sid] && !st[sid].går && st[sid].grunn === 'folk';
        // fanen Produksjon i Selskapet
        if (window.SelskapetSpill) { SelskapetSpill.vis(true, 'produksjon'); await vent(100); const t = (document.querySelector('#selskapet .skropp') || {}).textContent || '';
          ut.fane = /Sagbruk/.test(t) && /Fyrkjele/.test(t) && /ingen folk/.test(t) && /Tømmer/.test(t); }
        else ut.fane = true;
      } finally {
        L.bygg = bygg0; L.neste = neste0; Object.assign(L.lager, lager0); for (const k of Object.keys(L.lager)) if (!(k in lager0)) delete L.lager[k];
        for (const [id, o] of opp0) { const p = F.personer.find(q => q.id === id); if (p) p.oppgave = o; }
        tid = tid0; tempo = tempo0; ProduksjonSpill.nullstill(); if (window.SelskapetSpill && !åpen0) SelskapetSpill.vis(false);
        try { if (lagret0 === null) localStorage.removeItem('riksbrudd-produksjon'); else localStorage.setItem('riksbrudd-produksjon', lagret0); } catch (e) { /* */ }
        if (LeirSpill.lagre) LeirSpill.lagre(); void P0; skitten = true;
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'sagbruket mangler (Produksjon, LeirSpill, FolkSpill eller sim)', data: d };
    const del = ['varer', 'hogst', 'oppgave', 'tom', 'kjele', 'går', 'folk', 'fane'], feil = del.filter(k => !d[k]);
    return { ok: !feil.length, tekst: feil.length ? 'feilet: ' + feil.join(', ') + ' ' + JSON.stringify(d.tall) : `saga står uten tømmer, går med tømmer (${JSON.stringify(d.tall)}), stopper uten folk; fanen Produksjon (${profil})`, data: d };
  },
};
